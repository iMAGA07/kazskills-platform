export interface User {
  id: string;
  name: string;
  email: string;
  position: string;
  company: string;
  avatar?: string;
  role: 'user' | 'admin';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed';
  expiryDays: number | null;
  expiryDate: string | null;
  minScore: number;
  attempts: number;
  maxAttempts: number;
  materials: Material[];
}

export interface Material {
  id: string;
  title: string;
  type: 'presentation' | 'pdf' | 'video';
  url: string;
  slides?: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  options: Option[];
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Test {
  id: string;
  courseId: string;
  title: string;
  duration: number; // в минутах
  questions: Question[];
  minScore: number;
}

export interface TestResult {
  id: string;
  userId: string;
  testId: string;
  courseId: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  date: string;
  answers: UserAnswer[];
}

export interface UserAnswer {
  questionId: string;
  selectedOptions: string[];
  isCorrect: boolean;
}

export interface Document {
  id: string;
  title: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  fileUrl: string;
}
