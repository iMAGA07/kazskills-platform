import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout, StudentGuard, AdminGuard } from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/student/DashboardPage';
import CoursesPage from './pages/student/CoursesPage';
import CourseDetailPage from './pages/student/CourseDetailPage';
import LearnPage from './pages/student/LearnPage';
import TestPage from './pages/student/TestPage';
import ResultsPage from './pages/student/ResultsPage';
import ProfilePage from './pages/student/ProfilePage';
import DocumentsPage from './pages/student/DocumentsPage';
import CertificatesPage from './pages/student/CertificatesPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminCoursesPage from './pages/admin/AdminCoursesPage';
import CreateCoursePage from './pages/admin/CreateCoursePage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/student/courses" replace /> },

      // Student routes
      {
        element: <StudentGuard />,
        children: [
          { path: 'student/dashboard', element: <DashboardPage /> },
          { path: 'student/courses', element: <CoursesPage /> },
          { path: 'student/courses/:id', element: <CourseDetailPage /> },
          { path: 'student/learn/:courseId/:lessonId', element: <LearnPage /> },
          { path: 'student/test/:courseId', element: <TestPage /> },
          { path: 'student/results/:courseId', element: <ResultsPage /> },
          { path: 'student/documents', element: <DocumentsPage /> },
          { path: 'student/certificates', element: <CertificatesPage /> },
          { path: 'student/profile', element: <ProfilePage /> },
        ],
      },

      // Admin routes
      {
        element: <AdminGuard />,
        children: [
          { path: 'admin/dashboard', element: <AdminDashboardPage /> },
          { path: 'admin/courses', element: <AdminCoursesPage /> },
          { path: 'admin/courses/new', element: <CreateCoursePage /> },
          { path: 'admin/courses/:id/edit', element: <CreateCoursePage /> },
          { path: 'admin/users', element: <AdminUsersPage /> },
          { path: 'admin/analytics', element: <AdminAnalyticsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);