import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterOrgPage from '../pages/RegisterOrgPage';
import RegisterCandidatePage from '../pages/RegisterCandidatePage';
import DashboardPage from '../pages/DashboardPage';
import PlatformDashboardPage from '../pages/PlatformDashboardPage';
import ExamRunnerPage from '../pages/ExamRunnerPage';
import PublicQuizRunnerPage from '../pages/PublicQuizRunnerPage';
import PublicLeaderboardPage from '../pages/PublicLeaderboardPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/common/ProtectedRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Student Quiz Route (No login required) */}
      <Route path="quiz/:publicQuizId" element={<PublicQuizRunnerPage />} />
      <Route path="quiz/:publicQuizId/leaderboard" element={<PublicLeaderboardPage />} />

      {/* Dedicated Distraction-Free Examination Runner */}
      <Route
        path="app/exam/:attemptId"
        element={
          <ProtectedRoute allowedRoles={['CANDIDATE']}>
            <ExamRunnerPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register-org" element={<RegisterOrgPage />} />
        <Route path="register" element={<RegisterCandidatePage />} />

        {/* Protected Multi-Tenant Workspace Routes */}
        <Route
          path="app/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="app/platform"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <PlatformDashboardPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
