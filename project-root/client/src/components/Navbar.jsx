import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useState } from 'react';
import ProfileModal from './ProfileModal';

const Navbar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [hoveringUsername, setHoveringUsername] = useState(false);
  console.log('user object:', user);

  const handleLogout = async () => {
  try {
    const match = window.location.pathname.match(/\/groups\/([^/]+)\/chat/);
    if (match) {
      const groupId = match[1];
      await axios.delete(`http://localhost:3000/groups/${groupId}/leave`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await axios.post('http://localhost:3000/auth/logout', {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Proceed with logout even if requests fail
  } finally {
    logout();
    navigate('/login');
  }
};

  return (
    <>
      <nav style={styles.nav}>
        <span style={styles.logo} className="mono">TUPLE</span>
        <div style={styles.right}>
          <div
            style={styles.usernameWrapper}
            onMouseEnter={() => { setHoveringUsername(true); console.log('hovering'); }}
            onMouseLeave={() => setHoveringUsername(false)}
          >
            <span style={styles.username} className="mono">{user?.username}</span>
            {hoveringUsername && (user?.firstname || user?.lastname) && (
              <div style={styles.tooltip}>
                {[user.firstname, user.lastname].filter(Boolean).join(' ')}
              </div>
            )}
          </div>
          <button style={styles.btn} onClick={() => setShowProfile(true)}>profile()</button>
          <button style={styles.btn} onClick={handleLogout}>logout()</button>
        </div>
      </nav>
      {showProfile && (
        <ProfileModal
          token={token}
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
};

const styles = {
  usernameWrapper: {
    position: 'relative',
    cursor: 'default',
  },
  tooltip: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginTop: '8px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
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