import { useState } from 'react';
import axios from 'axios';

const InviteBar = ({ groupId, token, socketRef }) => {
  const [username, setUsername] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      
      await axios.post(
        `http://localhost:3000/groups/${groupId}/invite`,
        { username: username.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socketRef.current?.emit('invite:sent', { groupId, username: username.trim() });
      setSuccess(`Invite sent to ${username.trim()}.`);
      setUsername('');
       //console.log('invite error:', err.response?.status, err.response?.data);
    } catch (err) {

      setError(err.response?.data?.error || 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.bar}>
      <form onSubmit={handleInvite} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="invite by username..."
          value={username}
          onChange={e => { setUsername(e.target.value); setError(''); setSuccess(''); }}
        />
        <button type="submit" style={styles.btn} disabled={loading || !username.trim()}>
          {loading ? 'inviting...' : 'invite()'}
        </button>
      </form>
      {error   && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
    </div>
  );
};

const styles = {
  bar: {
    borderBottom: '1px solid var(--border)',
    padding: '10px 0',
  },
  form: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
  },
  btn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '8px 16px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    border: 'none',
  },
  error: {
    color: 'var(--error)',
    fontSize: '12px',
    marginTop: '6px',
  },
  success: {
    color: 'var(--accent)',
    fontSize: '12px',
    marginTop: '6px',
  },
};

export default InviteBar;
