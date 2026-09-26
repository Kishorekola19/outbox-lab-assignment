import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ScheduledPage } from './pages/ScheduledPage';
import { SentPage } from './pages/SentPage';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { SlackSettingsPage } from './pages/SlackSettingsPage';
import { QueueAdminPage } from './pages/QueueAdminPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-sm font-semibold text-gray-400">Loading ReachInbox...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard/scheduled" replace />} />
            <Route path="dashboard" element={<Navigate to="/dashboard/scheduled" replace />} />
            <Route path="dashboard/scheduled" element={<ScheduledPage />} />
            <Route path="dashboard/sent" element={<SentPage />} />
            <Route path="compose" element={<ComposePage />} />
            <Route path="email/:id" element={<EmailDetailPage />} />
            <Route path="settings/slack" element={<SlackSettingsPage />} />
            <Route path="admin/queues" element={<QueueAdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard/scheduled" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
