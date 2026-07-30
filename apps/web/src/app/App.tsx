import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AddAssetPage } from '@/features/assets/AddAssetPage'
import { AssetsPage } from '@/features/assets/AssetsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { ProfileTestPage } from '@/features/profile-test/ProfileTestPage'
import { ProfileResultPage } from '@/features/profile-test/ProfileResultPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AdminUsersPage } from '@/features/admin/AdminUsersPage'
import { AdminContentPage } from '@/features/admin/AdminContentPage'
import { AppLayout } from '@/components/ui/AppLayout'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { RequireAdmin } from '@/auth/RequireAdmin'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/assets/new" element={<AddAssetPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile-test" element={<ProfileTestPage />} />
          <Route path="/profile-test/result" element={<ProfileResultPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/content" element={<AdminContentPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
