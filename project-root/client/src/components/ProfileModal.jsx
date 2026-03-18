import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ProfileModal = ({ token, user, onClose }) => {
  const [form, setForm] = useState({
    firstname: user?.firstname || '',
    lastname:  user?.lastname  || '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.firstname.trim() && !form.lastname.trim()) {
      setError('Please enter at least a firstname or lastname.');
      return;
    }

    setLoading(true);
    try {
      const payload = {};
      if (form.firstname.trim()) payload.firstname = form.firstname.trim();
      if (form.lastname.trim())  payload.lastname  = form.lastname.trim();

      await axios.put('http://localhost:3000/auth/profile', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      login({ ...user, ...payload }, token);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title} className="mono">profile()</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>firstname</label>
            <input
              name="firstname"
              type="text"
              placeholder="Alice"
              value={form.firstname}
              onChange={handleChange}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>lastname</label>
            <input
              name="lastname"
              type="text"
              placeholder="Smith"
              value={form.lastname}
              onChange={handleChange}
            />
          </div>

          {error   && <p className="error-msg">{error}</p>}
          {success && <p style={styles.success}>{success}</p>}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>cancel</button>
            <button type="submit" style={styles.saveBtn} disabled={loading}>
              {loading ? 'saving...' : 'save()'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '32px',
    width: '100%',
    maxWidth: '400px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--accent)',
  },
  closeBtn: {
    background: 'transparent',
    color: 'var(--text-dim)',
    fontSize: '16px',
    padding: '4px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.05em',
  },
  success: {
    color: 'var(--accent)',
    fontSize: '13px',
    marginTop: '6px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
    padding: '8px 16px',
    fontSize: '12px',
  },
  saveBtn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
  },
};

export default ProfileModal;
