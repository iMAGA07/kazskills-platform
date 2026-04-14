import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3ed1835c`;
const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// ─── Types ────────────────────────────────────────────────────────────────────
export type ContentType = 'video' | 'pdf' | 'pptx';
export type QuestionType = 'mcq' | 'open_answer' | 'input_field' | 'scale';

export interface QOption  { id: string; text: string; }
export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: QOption[];
  correctAnswer?: string;
  points: number;
  minScale?: number;
  maxScale?: number;
  scaleLabels?: { min: string; max: string };
}

export interface Lesson {
  id: string;
  title: string;
  type: ContentType;
  url: string;
  order: number;
}

export interface TestConfig {
  questions: Question[];
  timeLimit: number;     // minutes
  passingScore: number;  // %
  maxAttempts: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  enrolledCount: number;
  lessons: Lesson[];
  test: TestConfig;
}

export interface CourseInput {
  title: string;
  description: string;
  published: boolean;
  lessons: Lesson[];
  test: TestConfig;
}

// ─── Progress Types ───────────────────────────────────────────────────────────
export interface TestAttempt {
  id: string;
  userId: string;
  courseId: string;
  score: number;
  passed: boolean;
  startedAt: string;
  completedAt: string;
  timeSpent: number;
  answers: Record<string, string | number>;
  autoSubmit?: boolean;
}

export interface UserProgress {
  userId: string;
  courseId: string;
  completedLessons: string[];
  status: 'not_started' | 'in_progress' | 'completed';
  attempts: TestAttempt[];
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface CoursesContextValue {
  courses: Course[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCourse: (input: CourseInput) => Promise<Course>;
  updateCourse: (id: string, input: Partial<CourseInput>) => Promise<Course>;
  deleteCourse: (id: string) => Promise<void>;
  getCourse: (id: string) => Course | undefined;

  // Progress
  getProgress: (userId: string, courseId: string) => Promise<UserProgress>;
  markLessonComplete: (userId: string, courseId: string, lessonId: string) => Promise<UserProgress>;
  saveAttempt: (userId: string, courseId: string, attempt: Omit<TestAttempt, 'id' | 'userId' | 'courseId' | 'completedAt'>) => Promise<{ attempt: TestAttempt; progress: UserProgress }>;
  getUserProgress: (userId: string, courseId: string) => UserProgress | undefined;

  // Local progress cache
  progressCache: Record<string, UserProgress>;
  setProgressCache: React.Dispatch<React.SetStateAction<Record<string, UserProgress>>>;
}

const CoursesContext = createContext<CoursesContextValue | null>(null);

export function CoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses]   = useState<Course[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [progressCache, setProgressCache] = useState<Record<string, UserProgress>>({});

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${BASE}/courses`, { headers: HEADERS });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch courses');
      setCourses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('CoursesContext fetchCourses:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const createCourse = useCallback(async (input: CourseInput): Promise<Course> => {
    const res  = await fetch(`${BASE}/courses`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to create course');
    setCourses(prev => [...prev, data]);
    return data;
  }, []);

  const updateCourse = useCallback(async (id: string, input: Partial<CourseInput>): Promise<Course> => {
    const res  = await fetch(`${BASE}/courses/${id}`, {
      method: 'PUT', headers: HEADERS, body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to update course');
    setCourses(prev => prev.map(c => c.id === id ? data : c));
    return data;
  }, []);

  const deleteCourse = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`${BASE}/courses/${id}`, {
      method: 'DELETE', headers: HEADERS,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to delete course');
    }
    setCourses(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCourse = useCallback((id: string) => courses.find(c => c.id === id), [courses]);

  // ── Progress API ──
  const getProgress = useCallback(async (userId: string, courseId: string): Promise<UserProgress> => {
    const key = `${userId}:${courseId}`;
    if (progressCache[key]) return progressCache[key];

    const res  = await fetch(`${BASE}/progress/${userId}/${courseId}`, { headers: HEADERS });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to fetch progress');

    setProgressCache(prev => ({ ...prev, [key]: data }));
    return data;
  }, [progressCache]);

  const markLessonComplete = useCallback(async (userId: string, courseId: string, lessonId: string): Promise<UserProgress> => {
    const res  = await fetch(`${BASE}/progress/${userId}/${courseId}/lesson`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify({ lessonId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to mark lesson complete');

    const key = `${userId}:${courseId}`;
    setProgressCache(prev => ({ ...prev, [key]: data }));
    return data;
  }, []);

  const saveAttempt = useCallback(async (
    userId: string,
    courseId: string,
    attempt: Omit<TestAttempt, 'id' | 'userId' | 'courseId' | 'completedAt'>
  ) => {
    const res  = await fetch(`${BASE}/attempts/${userId}/${courseId}`, {
      method: 'POST', headers: HEADERS, body: JSON.stringify(attempt),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to save attempt');

    const key = `${userId}:${courseId}`;
    setProgressCache(prev => ({ ...prev, [key]: data.progress }));
    return data;
  }, []);

  const getUserProgress = useCallback((userId: string, courseId: string) => {
    return progressCache[`${userId}:${courseId}`];
  }, [progressCache]);

  return (
    <CoursesContext.Provider value={{
      courses, loading, error,
      refetch: fetchCourses,
      createCourse, updateCourse, deleteCourse, getCourse,
      getProgress, markLessonComplete, saveAttempt, getUserProgress,
      progressCache, setProgressCache,
    }}>
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses must be used within CoursesProvider');
  return ctx;
}