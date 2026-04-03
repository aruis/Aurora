import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthBootstrap } from '@/components/auth-bootstrap'
import { ProtectedRoute } from '@/components/protected-route'
import { PublicOnlyRoute } from '@/components/public-only-route'
import { AppShell } from '@/layout/app-shell'
import { DashboardPage } from '@/pages/dashboard-page'
import { LoginPage } from '@/pages/login-page'
import { ProjectDetailPage } from '@/pages/project-detail-page'
import { ProjectListPage } from '@/pages/project-list-page'
import { UserManagementPage } from '@/pages/user-management-page'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="projects" element={<ProjectListPage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="users" element={<UserManagementPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  )
}
