import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { UsersProvider } from './context/UsersContext';
import { CoursesProvider } from './context/CoursesContext';
import { ToastHost } from './components/shared/Toast';

export default function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <LanguageProvider>
          <CoursesProvider>
            <RouterProvider router={router} />
            <ToastHost />
          </CoursesProvider>
        </LanguageProvider>
      </UsersProvider>
    </AuthProvider>
  );
}