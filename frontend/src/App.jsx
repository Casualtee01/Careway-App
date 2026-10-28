import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import AppLayout from './layouts/AppLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { HomePage, DoctorsPage, DoctorPage, LoginPage, RegisterPage, NotFoundPage } from './pages/public/PublicPages';
import { DashboardPage, AppointmentsPage, AppointmentDetailPage, ProfilePage, AdminListPage, NotificationsPage } from './pages/dashboard/DashboardPages';
import AvailabilityPage from './pages/dashboard/AvailabilityPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3800 }} />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="doctors/:id" element={<DoctorPage />} />
            <Route element={<PublicRoute />}>
              <Route path="login" element={<LoginPage />} />
              <Route path="register/:role" element={<RegisterPage />} />
            </Route>
            <Route path="unauthorized" element={<main className="content narrow"><p className="eyebrow">ACCESS RESTRICTED</p><h1>This account cannot open that page.</h1><Link className="button button-primary" to="/">Return home</Link></main>} />
            <Route element={<ProtectedRoute roles={['patient']} />}>
              <Route path="patient" element={<DashboardLayout role="patient" />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="appointments/:id" element={<AppointmentDetailPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute roles={['doctor']} />}>
              <Route path="doctor" element={<DashboardLayout role="doctor" />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="appointments" element={<AppointmentsPage />} />
                <Route path="appointments/:id" element={<AppointmentDetailPage />} />
                <Route path="availability" element={<AvailabilityPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
              </Route>
            </Route>
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="admin" element={<DashboardLayout role="admin" />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="doctor-approvals" element={<AdminListPage type="doctors" initialFilter="pending" />} />
                <Route path="doctors" element={<AdminListPage type="doctors" />} />
                <Route path="patients" element={<AdminListPage type="patients" />} />
                <Route path="appointments" element={<AdminListPage type="appointments" />} />
                <Route path="appointments/:id" element={<AppointmentDetailPage />} />
                <Route path="specialties" element={<AdminListPage type="specialties" />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
