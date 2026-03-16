import { useState } from 'react';
import axios from 'axios';

const CreateGroupModal = ({ token, socketRef, onCreated, onClose }) => {
  const [name, setName]       = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!name.trim()) return;
  setLoading(true);
  try {
    const res = await axios.post(
      'http://localhost:3000/groups',
      { group_name: name.trim(), is_private: isPrivate },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const newGroup = res.data.group;
    socketRef.current?.emit('room:created', newGroup);
      onCreated(newGroup);

  } catch (err) {
    setError(err.response?.data?.error || 'Failed to create room.');
    setLoading(false);
  }
};

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title} className="mono">new_room()</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>room name</label>
            <input
              type="text"
              placeholder="e.g. general"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              autoFocus
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>room type</label>
            <div style={styles.toggle}>
              <button
                type="button"
                style={{ ...styles.toggleBtn, ...(isPrivate ? {} : styles.toggleActive) }}
                onClick={() => setIsPrivate(false)}
              >
                public
              </button>
              <button
                type="button"
                style={{ ...styles.toggleBtn, ...(isPrivate ? styles.toggleActive : {}) }}
                onClick={() => setIsPrivate(true)}
              >
                private
              </button>
            </div>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>cancel</button>
            <button type="submit" style={styles.createBtn} disabled={loading}>
              {loading ? 'creating...' : 'create()'}
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
  createBtn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  toggle: {
  display: 'flex',
  gap: '8px',
  },
  toggleBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
    padding: '6px 16px',
    fontSize: '12px',
    borderRadius: '4px',
  },
  toggleActive: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    border: '1px solid var(--accent)',
  },
};

export default CreateGroupModal;
