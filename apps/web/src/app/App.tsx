import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AddAssetPage } from '@/features/assets/AddAssetPage'
import { ProfileTestPage } from '@/features/profile-test/ProfileTestPage'
import { ProfileResultPage } from '@/features/profile-test/ProfileResultPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AppLayout } from '@/components/ui/AppLayout'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assets/new" element={<AddAssetPage />} />
        <Route path="/profile-test" element={<ProfileTestPage />} />
        <Route path="/profile-test/result" element={<ProfileResultPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
