import React from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { UsersProvider } from './context/UsersContext';
import { CoursesProvider } from './context/CoursesContext';
import { OrganizationsProvider } from './context/OrganizationsContext';
import { ToastHost } from './components/shared/Toast';
import { WhatsAppFab } from './components/shared/InstructionModal';

export default function App() {
  return (
    <AuthProvider>
      <OrganizationsProvider>
        <UsersProvider>
          <LanguageProvider>
            <CoursesProvider>
              <RouterProvider router={router} />
              <ToastHost />
              <WhatsAppFab />
            </CoursesProvider>
          </LanguageProvider>
        </UsersProvider>
      </OrganizationsProvider>
    </AuthProvider>
  );
}