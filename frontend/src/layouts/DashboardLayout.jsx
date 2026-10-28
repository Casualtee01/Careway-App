import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

export default function DashboardLayout({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const paths = role === 'admin'
    ? [['dashboard', 'Overview'], ['doctor-approvals', 'Doctor approvals'], ['doctors', 'Doctors'], ['patients', 'Patients'], ['appointments', 'Appointments'], ['specialties', 'Specialties']]
    : role === 'doctor'
      ? [['dashboard', 'Overview'], ['appointments', 'Appointments'], ['availability', 'Availability'], ['profile', 'My profile'], ['notifications', 'Notifications']]
      : [['dashboard', 'Overview'], ['appointments', 'Appointments'], ['profile', 'My profile'], ['notifications', 'Notifications']];

  useEffect(() => {
    let active = true;
    async function loadUnread() {
      try {
        const result = await notificationService.list({ limit: 100 });
        if (active) setUnreadCount((result.data || []).filter((item) => !item.isRead).length);
      } catch {
        if (active) setUnreadCount(0);
      }
    }
    loadUnread();
    window.addEventListener('careway:notifications-updated', loadUnread);
    return () => { active = false; window.removeEventListener('careway:notifications-updated', loadUnread); };
  }, [user?._id, location.pathname]);

  async function signOut() {
    try { await logout(); } finally { navigate('/'); }
  }

  return <div className="dashboard-shell"><aside className="sidebar"><div className="sidebar-user"><span className="avatar">{user?.name?.slice(0, 1)}</span><div><strong>{user?.name}</strong><small>{role}</small></div></div><nav>{paths.map(([path, label]) => <NavLink key={path} to={`/${role}/${path}`} className={({ isActive }) => isActive ? 'active' : ''}>{label}{path === 'notifications' && unreadCount > 0 && <span className="nav-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}</NavLink>)}</nav><button className="sidebar-logout" onClick={signOut}>Sign out</button></aside><main className="dashboard-main"><Outlet /></main></div>;
}
