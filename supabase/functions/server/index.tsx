import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─── Supabase Storage ─────────────────────────────────────────────────────────
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BUCKET_NAME = "make-3ed1835c-materials";

// Idempotently create public storage bucket for course materials
(async () => {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const existingBucket = buckets?.find((b: any) => b.name === BUCKET_NAME);
    if (!existingBucket) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
      if (error) console.log("Error creating bucket:", error);
      else console.log(`Bucket ${BUCKET_NAME} created successfully as public`);
    } else if (!existingBucket.public) {
      // Update bucket to be public if it was created as private
      const { error } = await supabase.storage.updateBucket(BUCKET_NAME, { public: true });
      if (error) console.log("Error updating bucket to public:", error);
      else console.log(`Bucket ${BUCKET_NAME} updated to public`);
    }
  } catch (err) {
    console.log("Error initializing storage bucket:", err);
  }
})();

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/make-server-3ed1835c/health", (c) => c.json({ status: "ok" }));

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────

// POST /upload-material — upload PDF or PPTX file to Supabase Storage
app.post("/make-server-3ed1835c/upload-material", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided in form data" }, 400);
    }

    const originalName = file.name || "file";
    const ext = originalName.split(".").pop()?.toLowerCase() || "bin";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, uint8Array, {
        contentType: file.type || (ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
        upsert: false,
      });

    if (error) {
      console.log("Storage upload error:", error);
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log(`File uploaded successfully: ${data.path}, public URL: ${publicUrl}`);
    return c.json({ url: publicUrl, path: data.path, name: originalName });
  } catch (err) {
    console.log("Error in upload-material:", err);
    return c.json({ error: `Failed to upload material: ${err}` }, 500);
  }
});

// ─── COURSES ──────────────────────────────────────────────────────────────────

// GET /courses — list all courses
app.get("/make-server-3ed1835c/courses", async (c) => {
  try {
    const idList: string[] = (await kv.get("course_index")) ?? [];
    if (idList.length === 0) return c.json([]);

    const courseKeys = idList.map((id) => `course:${id}`);
    const courses = await kv.mget(courseKeys);
    const valid = courses.filter(Boolean);
    return c.json(valid);
  } catch (err) {
    console.log("Error listing courses:", err);
    return c.json({ error: `Failed to list courses: ${err}` }, 500);
  }
});

// POST /courses — create new course
app.post("/make-server-3ed1835c/courses", async (c) => {
  try {
    const body = await c.req.json();
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const course = {
      ...body,
      id,
      createdAt: now,
      updatedAt: now,
      enrolledCount: 0,
    };

    // Save course object
    await kv.set(`course:${id}`, course);

    // Update index
    const idList: string[] = (await kv.get("course_index")) ?? [];
    idList.push(id);
    await kv.set("course_index", idList);

    return c.json(course, 201);
  } catch (err) {
    console.log("Error creating course:", err);
    return c.json({ error: `Failed to create course: ${err}` }, 500);
  }
});

// GET /courses/:id — get single course
app.get("/make-server-3ed1835c/courses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const course = await kv.get(`course:${id}`);
    if (!course) return c.json({ error: "Course not found" }, 404);
    return c.json(course);
  } catch (err) {
    console.log("Error fetching course:", err);
    return c.json({ error: `Failed to fetch course: ${err}` }, 500);
  }
});

// PUT /courses/:id — update course
app.put("/make-server-3ed1835c/courses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`course:${id}`);
    if (!existing) return c.json({ error: "Course not found" }, 404);

    const body = await c.req.json();
    const updated = {
      ...existing,
      ...body,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`course:${id}`, updated);
    return c.json(updated);
  } catch (err) {
    console.log("Error updating course:", err);
    return c.json({ error: `Failed to update course: ${err}` }, 500);
  }
});

// DELETE /courses/:id — delete course
app.delete("/make-server-3ed1835c/courses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`course:${id}`);

    const idList: string[] = (await kv.get("course_index")) ?? [];
    const updated = idList.filter((cid) => cid !== id);
    await kv.set("course_index", updated);

    return c.json({ success: true });
  } catch (err) {
    console.log("Error deleting course:", err);
    return c.json({ error: `Failed to delete course: ${err}` }, 500);
  }
});

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

// GET /progress/:userId/:courseId
app.get("/make-server-3ed1835c/progress/:userId/:courseId", async (c) => {
  try {
    const { userId, courseId } = c.req.param();
    const progress = await kv.get(`progress:${userId}:${courseId}`);
    if (!progress) {
      return c.json({
        userId,
        courseId,
        completedLessons: [],
        status: "not_started",
        attempts: [],
      });
    }
    return c.json(progress);
  } catch (err) {
    console.log("Error fetching progress:", err);
    return c.json({ error: `Failed to fetch progress: ${err}` }, 500);
  }
});

// POST /progress/:userId/:courseId/lesson — mark lesson complete
app.post("/make-server-3ed1835c/progress/:userId/:courseId/lesson", async (c) => {
  try {
    const { userId, courseId } = c.req.param();
    const { lessonId } = await c.req.json();

    const existing = (await kv.get(`progress:${userId}:${courseId}`)) ?? {
      userId,
      courseId,
      completedLessons: [],
      status: "in_progress",
      attempts: [],
    };

    if (!existing.completedLessons.includes(lessonId)) {
      existing.completedLessons.push(lessonId);
    }
    if (existing.status === "not_started") {
      existing.status = "in_progress";
    }

    await kv.set(`progress:${userId}:${courseId}`, existing);
    return c.json(existing);
  } catch (err) {
    console.log("Error updating progress:", err);
    return c.json({ error: `Failed to update progress: ${err}` }, 500);
  }
});

// GET /progress/:userId — get all progress for a user
app.get("/make-server-3ed1835c/progress/:userId", async (c) => {
  try {
    const { userId } = c.req.param();
    const allProgress = await kv.getByPrefix(`progress:${userId}:`);
    return c.json(allProgress ?? []);
  } catch (err) {
    console.log("Error fetching all progress:", err);
    return c.json({ error: `Failed to fetch all progress: ${err}` }, 500);
  }
});

// ─── TEST ATTEMPTS ────────────────────────────────────────────────────────────

// POST /attempts/:userId/:courseId — save test attempt
app.post("/make-server-3ed1835c/attempts/:userId/:courseId", async (c) => {
  try {
    const { userId, courseId } = c.req.param();
    const body = await c.req.json();

    const attemptId = `a_${Date.now()}`;
    const attempt = {
      id: attemptId,
      userId,
      courseId,
      ...body,
      completedAt: new Date().toISOString(),
    };

    // Update progress
    const progress = (await kv.get(`progress:${userId}:${courseId}`)) ?? {
      userId,
      courseId,
      completedLessons: [],
      status: "in_progress",
      attempts: [],
    };

    progress.attempts = progress.attempts ?? [];
    progress.attempts.push(attempt);

    if (attempt.passed) {
      progress.status = "completed";
    }

    await kv.set(`progress:${userId}:${courseId}`, progress);

    // Also increment enrolled count on course
    const course = await kv.get(`course:${courseId}`);
    if (course && typeof course.enrolledCount === "number") {
      course.enrolledCount = (course.enrolledCount || 0) + 1;
      await kv.set(`course:${courseId}`, course);
    }

    return c.json({ attempt, progress });
  } catch (err) {
    console.log("Error saving attempt:", err);
    return c.json({ error: `Failed to save attempt: ${err}` }, 500);
  }
});

// GET /attempts/:userId/:courseId — get attempts for a user+course
app.get("/make-server-3ed1835c/attempts/:userId/:courseId", async (c) => {
  try {
    const { userId, courseId } = c.req.param();
    const progress = await kv.get(`progress:${userId}:${courseId}`);
    return c.json(progress?.attempts ?? []);
  } catch (err) {
    console.log("Error fetching attempts:", err);
    return c.json({ error: `Failed to fetch attempts: ${err}` }, 500);
  }
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

// GET /analytics — summary stats
app.get("/make-server-3ed1835c/analytics", async (c) => {
  try {
    const idList: string[] = (await kv.get("course_index")) ?? [];
    const totalCourses = idList.length;

    // Aggregate all progress records
    const allProgressKeys = await kv.getByPrefix("progress:");
    const allProgress = (allProgressKeys ?? []) as any[];

    const totalAttempts = allProgress.reduce(
      (s: number, p: any) => s + (p.attempts?.length ?? 0), 0
    );
    const passed = allProgress.reduce(
      (s: number, p: any) => s + (p.attempts?.filter((a: any) => a.passed).length ?? 0), 0
    );
    const completedCourses = allProgress.filter((p: any) => p.status === "completed").length;

    return c.json({
      totalCourses,
      totalAttempts,
      passed,
      completedCourses,
      passRate: totalAttempts > 0 ? Math.round((passed / totalAttempts) * 100) : 0,
    });
  } catch (err) {
    console.log("Error fetching analytics:", err);
    return c.json({ error: `Failed to fetch analytics: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);