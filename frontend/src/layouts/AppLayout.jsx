import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  return <><header className="site-header"><Link className="brand" to="/">Careway</Link><nav><Link to="/doctors">Find doctors</Link>{user ? <><Link to={`/${user.role}/dashboard`}>Dashboard</Link><button className="button button-quiet" onClick={logout}>Sign out</button></> : <><Link to="/login">Sign in</Link><Link className="button button-primary" to="/register/patient">Get started</Link></>}</nav></header><Outlet /><footer className="site-footer">Careway · Thoughtful care, made easier</footer></>;
}
