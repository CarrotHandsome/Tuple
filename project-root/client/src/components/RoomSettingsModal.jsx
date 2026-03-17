import { useState } from 'react';
import axios from 'axios';

const RoomSettingsModal = ({ group, token, socketRef, onClose, onUpdated }) => {
  const [isPrivate, setIsPrivate] = useState(group.is_private);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSave = async () => {
    if (isPrivate === group.is_private) {
      onClose();
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.patch(
        `http://localhost:3000/groups/${group._id}`,
        { is_private: isPrivate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socketRef.current?.emit('room:updated', res.data.group);
      setSuccess('Room settings updated.');
      onUpdated(res.data.group);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update room settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.title} className="mono">room_settings()</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
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

          {error   && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}
        </div>

        <div style={styles.actions}>
          <button style={styles.cancelBtn} onClick={onClose}>cancel</button>
          <button style={styles.saveBtn} onClick={handleSave} disabled={loading}>
            {loading ? 'saving...' : 'save()'}
          </button>
        </div>
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
    maxWidth: '380px',
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
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
  },
  label: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.05em',
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
  error: {
    color: 'var(--error)',
    fontSize: '12px',
  },
  success: {
    color: 'var(--accent)',
    fontSize: '12px',
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

export default RoomSettingsModal;
