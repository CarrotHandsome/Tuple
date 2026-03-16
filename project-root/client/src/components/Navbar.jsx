import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3000/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Proceed with logout even if request fails
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <nav style={styles.nav}>
      <span style={styles.logo} className="mono">TUPLE</span>
      <div style={styles.right}>
        <span style={styles.username} className="mono">{user?.username}</span>
        <button style={styles.btn} onClick={handleLogout}>logout()</button>
      </div>
    </nav>
  );
};

const styles = {
  nav: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    padding: '0 24px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'var(--accent)',
    letterSpacing: '0.1em',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  username: {
    fontSize: '13px',
    color: 'var(--text-dim)',
  },
  btn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
    padding: '6px 14px',
    fontSize: '12px',
  },
};

export default Navbar;
