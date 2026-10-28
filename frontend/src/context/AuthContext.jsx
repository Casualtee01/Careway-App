import { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';

const AuthContext = createContext(null);
let restoreSessionPromise;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setUnauthorizedHandler(() => { setUser(null); setDoctorProfile(null); });
    restoreSessionPromise ||= authService.refresh()
      .then(() => authService.me())
      .finally(() => { restoreSessionPromise = null; });
    restoreSessionPromise
      .then((result) => { if (active) { setUser(result.user); setDoctorProfile(result.doctorProfile || null); } })
      .catch(() => { if (active) { setUser(null); setDoctorProfile(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function login(credentials) {
    const nextUser = await authService.login(credentials);
    setUser(nextUser);
    if (nextUser.role === 'doctor') {
      const result = await authService.me();
      setDoctorProfile(result.doctorProfile || null);
    }
    return nextUser;
  }

  async function logout() {
    try { await authService.logout(); }
    finally { setUser(null); setDoctorProfile(null); }
  }

  return <AuthContext.Provider value={{ user, doctorProfile, setUser, setDoctorProfile, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
