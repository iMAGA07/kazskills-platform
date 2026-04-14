import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { UsersProvider } from './context/UsersContext';
import { CoursesProvider } from './context/CoursesContext';

export default function App() {
  return (
    <AuthProvider>
      <UsersProvider>
        <LanguageProvider>
          <CoursesProvider>
            <RouterProvider router={router} />
          </CoursesProvider>
        </LanguageProvider>
      </UsersProvider>
    </AuthProvider>
  );
}