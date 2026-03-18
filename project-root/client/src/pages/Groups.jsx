import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import CreateGroupModal from '../components/CreateGroupModal';
import { io } from 'socket.io-client';

const Groups = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [presence, setPresence] = useState({});
  const [hoveringRoom, setHoveringRoom] = useState(null);

  const socketRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchGroups = async () => {
    try {
      const res = await axios.get('http://localhost:3000/groups', { headers });
      setGroups(res.data.groups);
    } catch {
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

 useEffect(() => {
  const socket = io('http://localhost:4000', { auth: { token } });
  socketRef.current = socket;

  socket.onAny((event, ...args) => {
    console.log('Groups socket received event:', event, args);
  });

  socket.on('disconnect', () => {
    console.log('Groups socket disconnected');
  });

  socket.on('room:deleted', ({ groupId }) => {
    setGroups(prev => prev.filter(g => g._id !== groupId));
  });

  socket.on('room:updated', (group) => {
    setGroups(prev => prev.map(g => g._id === group._id ? group : g));
  });
  
  socket.on('invite:sent', ({ groupId, username: invitedUsername }) => {
    console.log('invite:sent received:', invitedUsername, 'current user:', user.username);
    if (invitedUsername === user.username) {
      fetchGroups();
    }
  });

  socket.on('room:created', (group) => {
    setGroups(prev => {
      if (prev.some(g => g._id === group._id)) return prev;
      return [group, ...prev];
    });
  });

  socket.on('presence:update', ({ groupId, presence: roomPresence }) => {
    setPresence(prev => ({ ...prev, [groupId]: roomPresence }));
  });

  socket.on('connect', () => {
    socket.emit('presence:get');
  });

  socket.on('presence:current', (currentPresence) => {
    setPresence(currentPresence);
  });

  return () => socket.disconnect();
}, [token]);

  // const isMember = (group) =>
  //   group.members.some(m => m.user_id === user._id || m.user_id?.toString() === user._id);

  const getInviteStatus = (group) => {
    const invite = group.invites?.find(
      i => i.user_id === user._id || i.user_id?.toString() === user._id
    );
    return invite ? invite.status : null;
  };

  const handleRespondToInvite = async (group, accept) => {
    try {
      await axios.post(
        `http://localhost:3000/groups/${group._id}/invite/respond`,
        { accept },
        { headers }
      );
      setGroups(prev => prev.map(g => {
        if (g._id !== group._id) return g;
        return {
          ...g,
          invites: accept
            ? g.invites.map(i =>
                i.user_id === user._id || i.user_id?.toString() === user._id
                  ? { ...i, status: 'accepted' }
                  : i
              )
            : g.invites.filter(
                i => i.user_id !== user._id && i.user_id?.toString() !== user._id
              ),
        };
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to respond to invite.');
    }
  };

  const handleJoinOrOpen = async (group) => {
    try {
      await axios.post(`http://localhost:3000/groups/${group._id}/join`, {}, { headers });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join room.');
      return;
    }
    navigate(`/groups/${group._id}/chat`);
  };

  const handleGroupCreated = (newGroup) => {
  socketRef.current?.emit('room:created', newGroup);
  setGroups(prev => [newGroup, ...prev]);
  setShowModal(false);
  navigate(`/groups/${newGroup._id}/chat`);
};
  const handleDelete = async (groupId) => {
  if (!window.confirm('Delete this room? This cannot be undone.')) return;
  try {
    await axios.delete(`http://localhost:3000/groups/${groupId}`, { headers });
    socketRef.current?.emit('room:deleted', groupId);
    setGroups(prev => prev.filter(g => g._id !== groupId));
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to delete room.');
  }
};

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title} className="mono">rooms</h1>
          <button style={styles.newBtn} onClick={() => setShowModal(true)}>
            + new_room()
          </button>
        </div>

        {error && <p className="error-msg">{error}</p>}

        {loading ? (
          <p style={styles.dim} className="mono">loading...</p>
        ) : groups.length === 0 ? (
          <p style={styles.dim} className="mono">// no rooms yet. create one.</p>
        ) : (
          <div style={styles.grid}>
            {groups.map(group => (
              <div key={group._id} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={styles.groupName}>{group.group_name}</span>
                  <div
                    style={styles.memberCountWrapper}
                    onMouseEnter={() => setHoveringRoom(group._id)}
                    onMouseLeave={() => setHoveringRoom(null)}
                  >
                    <span style={styles.memberCount} className="mono">
                      {Object.keys(presence[group._id] || {}).length} in room
                    </span>
                    {hoveringRoom === group._id && Object.keys(presence[group._id] || {}).length > 0 && (
                      <div style={styles.presenceTooltip}>
                        {Object.values(presence[group._id] || {}).map(username => (
                          <div key={username} className="mono">{username}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  {group.owner_id === user._id || group.owner_id?.toString() === user._id ? (
                    <button style={styles.deleteBtn} onClick={() => handleDelete(group._id)}>
                      delete()
                    </button>
                  ) : null}
                </div>
                {(() => {
                  const isOwner = group.owner_id === user._id || group.owner_id?.toString() === user._id;
                  
                  if (!group.is_private || isOwner) {
                    return (
                      <button style={styles.joinBtn} onClick={() => handleJoinOrOpen(group)}>
                        join()
                      </button>
                    );
                  }

                  const inviteStatus = getInviteStatus(group);
                  
                  if (inviteStatus === 'accepted') {
                    return (
                      <button style={styles.joinBtn} onClick={() => handleJoinOrOpen(group)}>
                        join()
                      </button>
                    );
                  }
                  
                  if (inviteStatus === 'pending') {
                    return (
                      <div style={styles.inviteActions}>
                        <button style={styles.acceptBtn} onClick={() => handleRespondToInvite(group, true)}>
                          accept()
                        </button>
                        <button style={styles.declineBtn} onClick={() => handleRespondToInvite(group, false)}>
                          decline()
                        </button>
                      </div>
                    );
                  }
                  
                  return (
                    <div style={styles.lockIndicator} className="mono">🔒 private</div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
       <CreateGroupModal
        token={token}
        socketRef={socketRef}
        onCreated={handleGroupCreated}
        onClose={() => setShowModal(false)}
      />

      )}
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg)',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '36px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '600',
    color: 'var(--text)',
    letterSpacing: '0.05em',
  },
  newBtn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '10px 20px',
    fontWeight: '600',
    fontSize: '13px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  groupName: {
    fontSize: '16px',
    fontWeight: '500',
    color: 'var(--text)',
  },
  memberCount: {
    fontSize: '12px',
    color: 'var(--text-dim)',
  },
  openBtn: {
    background: 'transparent',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
    padding: '8px',
    fontSize: '12px',
    width: '100%',
  },
  joinBtn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '8px',
    fontSize: '12px',
    fontWeight: '600',
    width: '100%',
  },
  dim: {
    color: 'var(--text-dim)',
    fontSize: '14px',
  },

  inviteActions: {
    display: 'flex',
    gap: '8px',
  },
  acceptBtn: {
    flex: 1,
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  declineBtn: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--error)',
    color: 'var(--error)',
    padding: '8px',
    fontSize: '12px',
  },
  lockIndicator: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    padding: '8px 0',
  },
  memberCountWrapper: {
    position: 'relative',
    cursor: 'default',
    display: 'inline-block',
  },
  presenceTooltip: {
    position: 'absolute',
    top: '100%',
    left: '0',
    marginTop: '4px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '11px',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
};

export default Groups;
