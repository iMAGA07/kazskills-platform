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
    allowHeaders: ["Content-Type", "Authorization", "x-session-token"],
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

// POST /upload-url — generate a signed upload URL so the client can PUT the file
// directly to Supabase Storage and bypass the Edge Function's 6 MB body limit.
// Admin only.
app.post("/make-server-3ed1835c/upload-url", requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const filename = typeof body.filename === "string" ? body.filename : "file";
    const ext = (filename.split(".").pop() || "bin").toLowerCase();
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.log("createSignedUploadUrl error:", error);
      return c.json({ error: error?.message ?? "Could not create signed URL" }, 500);
    }

    const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return c.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path,
      publicUrl: pub.publicUrl,
      name: filename,
      ext,
    });
  } catch (err) {
    console.log("Error in /upload-url:", err);
    return c.json({ error: `Failed to create upload URL: ${err}` }, 500);
  }
});

// POST /upload-material — upload PDF or PPTX file to Supabase Storage (admin only)
// Kept for backwards compatibility. Capped at the Edge Function's ~6 MB body
// limit; for larger files use the two-step /upload-url flow above.
app.post("/make-server-3ed1835c/upload-material", requireAuth, requireAdmin, async (c) => {
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

// POST /courses — create new course (admin only)
app.post("/make-server-3ed1835c/courses", requireAuth, requireAdmin, async (c) => {
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

// PUT /courses/:id — update course (admin only)
app.put("/make-server-3ed1835c/courses/:id", requireAuth, requireAdmin, async (c) => {
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

// DELETE /courses/:id — delete course (admin only)
app.delete("/make-server-3ed1835c/courses/:id", requireAuth, requireAdmin, async (c) => {
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

// POST /attempts/:userId/:courseId — save test attempt (self or admin)
app.post("/make-server-3ed1835c/attempts/:userId/:courseId", requireAuth, async (c) => {
  const sess = c.get("session") as Session;
  const uid = c.req.param("userId");
  if (sess.role !== "admin" && sess.userId !== uid) {
    return c.json({ error: "Forbidden" }, 403);
  }
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

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Role = 'admin' | 'student' | 'representative';

interface ServerUser {
  id: string;
  email: string;
  password: string;
  role: Role;
  organization?: string;
  [k: string]: any;
}

interface Session {
  token: string;
  userId: string;
  role: Role;
  expiresAt: number;
}

function stripPassword<T extends { password?: string }>(u: T): Omit<T, 'password'> {
  const { password: _p, ...rest } = u;
  return rest;
}

async function getAllUsers(): Promise<ServerUser[]> {
  const list = await kv.getByPrefix("user:");
  return (list as ServerUser[]).filter(u => u && u.id);
}

async function getSession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const sess = (await kv.get(`session:${token}`)) as Session | null;
  if (!sess) return null;
  if (sess.expiresAt < Date.now()) {
    await kv.del(`session:${token}`).catch(() => {});
    return null;
  }
  return sess;
}

// Middleware: require a valid session token. Sets c.set('session', session).
async function requireAuth(c: any, next: () => Promise<void>) {
  const token = c.req.header("x-session-token");
  const sess = await getSession(token);
  if (!sess) return c.json({ error: "Unauthorized" }, 401);
  c.set("session", sess);
  await next();
}

// Middleware: require admin role.
async function requireAdmin(c: any, next: () => Promise<void>) {
  const sess = c.get("session") as Session | undefined;
  if (!sess || sess.role !== "admin") return c.json({ error: "Forbidden" }, 403);
  await next();
}

// ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────────

// POST /auth/login {email, password}
//   → 200 {token, user (no password)} | 401
app.post("/make-server-3ed1835c/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "email and password required" }, 400);

    const users = await getAllUsers();
    const found = users.find(u =>
      u.email === email && u.password === password && u.status !== "blocked"
    );
    if (!found) return c.json({ error: "Invalid credentials" }, 401);

    const token = crypto.randomUUID();
    const session: Session = {
      token,
      userId: found.id,
      role: found.role,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    await kv.set(`session:${token}`, session);

    return c.json({ token, user: stripPassword(found), expiresAt: session.expiresAt });
  } catch (err) {
    console.log("Error in /auth/login:", err);
    return c.json({ error: `Login failed: ${err}` }, 500);
  }
});

// GET /auth/me — return the current user (validates token)
app.get("/make-server-3ed1835c/auth/me", requireAuth, async (c) => {
  const sess = c.get("session") as Session;
  const user = await kv.get(`user:${sess.userId}`);
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json(stripPassword(user as ServerUser));
});

// POST /auth/logout — invalidate the current token
app.post("/make-server-3ed1835c/auth/logout", async (c) => {
  const token = c.req.header("x-session-token");
  if (token) await kv.del(`session:${token}`).catch(() => {});
  return c.json({ ok: true });
});

// ─── USERS ────────────────────────────────────────────────────────────────────

/** Admin endpoints can return passwords (admins manage credentials);
 *  student endpoints must strip them. */
function respondUser<T extends { password?: string }>(c: any, user: T) {
  const sess = c.get("session") as Session | undefined;
  return sess?.role === "admin" ? user : stripPassword(user);
}

// GET /users — list users.
//  • admin          → everyone, WITH passwords (Word reports / edit form need them).
//  • representative → only their own organization's users, passwords stripped
//                     (a client rep monitors their company's staff, no secrets).
//  • student        → only their own record, password stripped.
app.get("/make-server-3ed1835c/users", requireAuth, async (c) => {
  try {
    const sess = c.get("session") as Session;
    const users = await getAllUsers();

    if (sess.role === "admin") {
      return c.json(users); // admin keeps passwords
    }

    if (sess.role === "representative") {
      const self = users.find(u => u.id === sess.userId);
      const org = (self?.organization ?? "").trim().toLowerCase();
      const mine = users.filter(u =>
        (u.organization ?? "").trim().toLowerCase() === org
      );
      return c.json(mine.map(stripPassword));
    }

    // student
    const self = users.find(u => u.id === sess.userId);
    return c.json(self ? [stripPassword(self)] : []);
  } catch (err) {
    console.log("Error listing users:", err);
    return c.json({ error: `Failed to list users: ${err}` }, 500);
  }
});

// POST /users — create a single user (admin only)
app.post("/make-server-3ed1835c/users", requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id) return c.json({ error: "id is required" }, 400);
    await kv.set(`user:${body.id}`, body);
    return c.json(body, 201); // admin context — echo the password back
  } catch (err) {
    console.log("Error creating user:", err);
    return c.json({ error: `Failed to create user: ${err}` }, 500);
  }
});

// POST /users/batch — create many users at once (admin only)
app.post("/make-server-3ed1835c/users/batch", requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json();
    const users: ServerUser[] = Array.isArray(body) ? body : body.users ?? [];
    if (users.length === 0) return c.json([]);
    const keys = users.map(u => `user:${u.id}`);
    await kv.mset(keys, users);
    return c.json(users, 201); // admin echo
  } catch (err) {
    console.log("Error creating users batch:", err);
    return c.json({ error: `Failed to create users batch: ${err}` }, 500);
  }
});

// PUT /users/:id — update a user
// Admin can update anyone; student only themselves.
app.put("/make-server-3ed1835c/users/:id", requireAuth, async (c) => {
  try {
    const sess = c.get("session") as Session;
    const id = c.req.param("id");
    if (sess.role !== "admin" && sess.userId !== id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const existing = await kv.get(`user:${id}`);
    if (!existing) return c.json({ error: "User not found" }, 404);
    const body = await c.req.json();
    // Students cannot change their role.
    if (sess.role !== "admin" && body.role && body.role !== existing.role) {
      delete body.role;
    }
    const updated = { ...existing, ...body, id };
    await kv.set(`user:${id}`, updated);
    return c.json(respondUser(c, updated as ServerUser));
  } catch (err) {
    console.log("Error updating user:", err);
    return c.json({ error: `Failed to update user: ${err}` }, 500);
  }
});

// DELETE /users/:id — admin only
app.delete("/make-server-3ed1835c/users/:id", requireAuth, requireAdmin, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`user:${id}`);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error deleting user:", err);
    return c.json({ error: `Failed to delete user: ${err}` }, 500);
  }
});

// POST /users/seed — write users only if the store is currently empty (idempotent).
// No auth required: this is bootstrap-only, refuses to overwrite if data exists.
app.post("/make-server-3ed1835c/users/seed", async (c) => {
  try {
    const existing = await getAllUsers();
    if (existing.length > 0) {
      return c.json({ seeded: false, count: existing.length, reason: "already-seeded" });
    }
    const body = await c.req.json();
    const users: ServerUser[] = Array.isArray(body) ? body : body.users ?? [];
    if (users.length === 0) return c.json({ seeded: false, count: 0, reason: "no-users" });
    const keys = users.map(u => `user:${u.id}`);
    await kv.mset(keys, users);
    return c.json({ seeded: true, count: users.length });
  } catch (err) {
    console.log("Error in /users/seed:", err);
    return c.json({ error: `Failed to seed users: ${err}` }, 500);
  }
});

// ─── ORGANIZATIONS ────────────────────────────────────────────────────────────

interface ServerOrganization {
  slug: string;
  displayName: string;
  fullName: string;
  logoUrl?: string;
  legacyAliases?: string[];
  createdAt?: string;
}

/** Count users that belong to this organization (by fullName / displayName / aliases match). */
async function countOrgMembers(org: ServerOrganization): Promise<number> {
  const users = await getAllUsers();
  const names = new Set<string>([
    org.fullName, org.displayName,
    ...(org.legacyAliases ?? []),
  ].map(s => s.toLowerCase().trim()).filter(Boolean));
  return users.filter(u => u.organization && names.has(u.organization.toLowerCase().trim())).length;
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/; // 1-30 chars, lower, may contain dashes

async function getAllOrganizations(): Promise<ServerOrganization[]> {
  const list = await kv.getByPrefix("org:");
  return (list as ServerOrganization[]).filter(o => o && o.slug);
}

// GET /organizations — open (login pages need to render the badge before auth)
app.get("/make-server-3ed1835c/organizations", async (c) => {
  try {
    const orgs = await getAllOrganizations();
    return c.json(orgs);
  } catch (err) {
    console.log("Error listing organizations:", err);
    return c.json({ error: `Failed to list organizations: ${err}` }, 500);
  }
});

// POST /organizations — admin only
app.post("/make-server-3ed1835c/organizations", requireAuth, requireAdmin, async (c) => {
  try {
    const body = await c.req.json() as ServerOrganization;
    const slug = (body.slug ?? "").trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) {
      return c.json({ error: "Invalid slug. Use 1-30 lowercase letters, digits and dashes." }, 400);
    }
    if (slug === "www" || slug === "kazskills") {
      return c.json({ error: "This slug is reserved." }, 400);
    }
    if (!body.displayName?.trim() || !body.fullName?.trim()) {
      return c.json({ error: "displayName and fullName are required" }, 400);
    }
    const existing = await kv.get(`org:${slug}`);
    if (existing) return c.json({ error: "Organization with this slug already exists" }, 409);

    const org: ServerOrganization = {
      slug,
      displayName: body.displayName.trim(),
      fullName: body.fullName.trim(),
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : undefined,
      legacyAliases: Array.isArray(body.legacyAliases) ? body.legacyAliases : [],
      createdAt: new Date().toISOString(),
    };
    await kv.set(`org:${slug}`, org);
    return c.json(org, 201);
  } catch (err) {
    console.log("Error creating organization:", err);
    return c.json({ error: `Failed to create organization: ${err}` }, 500);
  }
});

// PUT /organizations/:slug — admin only (slug itself cannot be changed)
app.put("/make-server-3ed1835c/organizations/:slug", requireAuth, requireAdmin, async (c) => {
  try {
    const slug = c.req.param("slug");
    const existing = (await kv.get(`org:${slug}`)) as ServerOrganization | null;
    if (!existing) return c.json({ error: "Organization not found" }, 404);

    const body = await c.req.json();
    const updated: ServerOrganization = {
      ...existing,
      displayName: body.displayName?.trim() || existing.displayName,
      fullName: body.fullName?.trim() || existing.fullName,
      // logoUrl supports explicit null to clear it
      logoUrl: 'logoUrl' in body
        ? (typeof body.logoUrl === 'string' ? body.logoUrl : undefined)
        : existing.logoUrl,
      legacyAliases: Array.isArray(body.legacyAliases) ? body.legacyAliases : existing.legacyAliases,
      slug, // immutable
    };
    await kv.set(`org:${slug}`, updated);
    return c.json(updated);
  } catch (err) {
    console.log("Error updating organization:", err);
    return c.json({ error: `Failed to update organization: ${err}` }, 500);
  }
});

// DELETE /organizations/:slug — admin only.
// Refuses with 409 if users still belong to the org, unless ?force=true.
app.delete("/make-server-3ed1835c/organizations/:slug", requireAuth, requireAdmin, async (c) => {
  try {
    const slug = c.req.param("slug");
    const force = c.req.query("force") === "true";

    const org = (await kv.get(`org:${slug}`)) as ServerOrganization | null;
    if (!org) return c.json({ error: "Organization not found" }, 404);

    const memberCount = await countOrgMembers(org);
    if (memberCount > 0 && !force) {
      return c.json({
        error: "Organization still has members",
        userCount: memberCount,
      }, 409);
    }

    await kv.del(`org:${slug}`);
    return c.json({ success: true, deletedWithMembers: memberCount });
  } catch (err) {
    console.log("Error deleting organization:", err);
    return c.json({ error: `Failed to delete organization: ${err}` }, 500);
  }
});

// POST /organizations/seed — idempotent bootstrap (only if empty)
app.post("/make-server-3ed1835c/organizations/seed", async (c) => {
  try {
    const existing = await getAllOrganizations();
    if (existing.length > 0) {
      return c.json({ seeded: false, count: existing.length, reason: "already-seeded" });
    }
    const body = await c.req.json();
    const orgs: ServerOrganization[] = Array.isArray(body) ? body : body.organizations ?? [];
    if (orgs.length === 0) return c.json({ seeded: false, count: 0, reason: "no-organizations" });
    const keys = orgs.map(o => `org:${o.slug}`);
    await kv.mset(keys, orgs);
    return c.json({ seeded: true, count: orgs.length });
  } catch (err) {
    console.log("Error in /organizations/seed:", err);
    return c.json({ error: `Failed to seed organizations: ${err}` }, 500);
  }
});

// ─── PROTOCOL NUMBERS ─────────────────────────────────────────────────────────
// A protocol number is shared by everyone in the same group (заявка) who took
// the same course, and increments sequentially across all (group, course) pairs.
//   • groupKey = request number (e.g. "002") when the user belongs to a заявка,
//     otherwise "u<userId>" for a single user.
// First request for a (group, course) assigns the next number; later requests
// for the same pair return the same number (idempotent).
app.post("/make-server-3ed1835c/protocol-number", requireAuth, async (c) => {
  try {
    const { groupKey, courseId } = await c.req.json();
    if (!groupKey || !courseId) return c.json({ error: "groupKey and courseId required" }, 400);
    const key = `protnum:${groupKey}:${courseId}`;
    const existing = await kv.get(key);
    if (typeof existing === "number") return c.json({ number: existing });

    const counter = (await kv.get("protocol_counter")) as number | null;
    const next = (typeof counter === "number" ? counter : 0) + 1;
    await kv.set("protocol_counter", next);
    await kv.set(key, next);
    return c.json({ number: next });
  } catch (err) {
    console.log("Error in /protocol-number:", err);
    return c.json({ error: `Failed to assign protocol number: ${err}` }, 500);
  }
});

// GET /protocol-counter — current value (admin only); for setting a starting
// offset use POST /protocol-counter { value }.
app.get("/make-server-3ed1835c/protocol-counter", requireAuth, requireAdmin, async (c) => {
  const counter = (await kv.get("protocol_counter")) as number | null;
  return c.json({ value: typeof counter === "number" ? counter : 0 });
});
app.post("/make-server-3ed1835c/protocol-counter", requireAuth, requireAdmin, async (c) => {
  try {
    const { value } = await c.req.json();
    if (typeof value !== "number" || value < 0) return c.json({ error: "value must be a non-negative number" }, 400);
    await kv.set("protocol_counter", Math.floor(value));
    return c.json({ value: Math.floor(value) });
  } catch (err) {
    return c.json({ error: `Failed to set counter: ${err}` }, 500);
  }
});

// ─── ANALYTICS ────────────────────────────────────────────────────────────────

// GET /analytics — summary stats (admin only)
app.get("/make-server-3ed1835c/analytics", requireAuth, requireAdmin, async (c) => {
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