import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Message from '../components/Message';

const SOCKET_URL = 'http://localhost:4000';
const API_URL    = 'http://localhost:3000';

const Chat = () => {
  const { id: groupId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages]   = useState([]);
  const [content, setContent]     = useState('');
  const [groupName, setGroupName] = useState('');
  const [typing, setTyping]       = useState([]);
  const [error, setError]         = useState('');

  const socketRef    = useRef(null);
  const bottomRef    = useRef(null);
  const typingTimer  = useRef(null);
  const isTyping     = useRef(false);

  const headers = { Authorization: `Bearer ${token}` };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch group name and message history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupRes, messagesRes] = await Promise.all([
          axios.get(`${API_URL}/groups/${groupId}`, { headers }),
          axios.get(`${API_URL}/messages/${groupId}`, { headers }),
        ]);
        setGroupName(groupRes.data.group.group_name);
        setMessages(messagesRes.data.messages.map(m => ({
  ...m,
  username:  m.sender_id?.username || m.sender_id,
  firstname: m.sender_id?.firstname,
  lastname:  m.sender_id?.lastname,
  sender_id: m.sender_id?._id || m.sender_id,
})));
      } catch {
        setError('Failed to load chat.');
      }
    };
    fetchData();
  }, [groupId]);

  // Socket.io connection
  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;
    
    socket.on('connect_error', (err) => {
      setError('Could not connect to chat server. Please refresh.');
    });
    
    socket.on('connect', () => {
      socket.emit('join_room', groupId);
    });

    socket.on('message:new', (msg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('typing:start', (data) => {
      if (data.userId !== user._id) {
        setTyping(prev => {
          if (prev.includes(data.username)) return prev;
          return [...prev, data.username];
        });
      }
    });

    socket.on('typing:stop', (data) => {
      setTyping(prev => prev.filter(u => u !== data.username));
    });

    socket.on('room:deleted', ({ groupId: deletedId }) => {
      if (deletedId === groupId) {
        navigate('/groups');
      }
    });

    return () => {
      socket.emit('leave_room', groupId);
      socket.disconnect();
    };
  }, [groupId, token]);

  const handleTyping = (e) => {
    setContent(e.target.value);

    if (!isTyping.current) {
      isTyping.current = true;
      socketRef.current?.emit('typing:start', groupId);
    }

    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTyping.current = false;
      socketRef.current?.emit('typing:stop', groupId);
    }, 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    socketRef.current?.emit('message:send', {
      group_id: groupId,
      content:  content.trim(),
    });

    // Stop typing indicator
    clearTimeout(typingTimer.current);
    isTyping.current = false;
    socketRef.current?.emit('typing:stop', groupId);

    setContent('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e);
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.chatWrapper}>

        {/* Header */}
        <div style={styles.chatHeader}>
          <button style={styles.backBtn} onClick={() => navigate('/groups')}>
            ← rooms
          </button>
          <span style={styles.roomName} className="mono"># {groupName}</span>
        </div>

        {error && <p className="error-msg" style={{ padding: '12px 24px' }}>{error}</p>}

        {/* Messages */}
        <div style={styles.messages}>
          {messages.length === 0 ? (
            <p style={styles.empty} className="mono">// no messages yet. say something.</p>
          ) : (
            messages.map(msg => (
              <Message
                key={msg._id}
                message={msg}
                isOwn={msg.sender_id === user._id || msg.sender_id?.toString() === user._id}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div style={styles.typingIndicator} className="mono">
            {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSend} style={styles.inputArea}>
          <input
            style={styles.input}
            type="text"
            placeholder="type a message..."
            value={content}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
          />
          <button type="submit" style={styles.sendBtn} disabled={!content.trim()}>
            send()
          </button>
        </form>

      </div>
    </div>
  );
};

const styles = {
  page: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
    overflow: 'hidden',
  },
  chatWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    maxWidth: '860px',
    width: '100%',
    margin: '0 auto',
    padding: '0 24px',
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 0',
    borderBottom: '1px solid var(--border)',
  },
  backBtn: {
    background: 'transparent',
    color: 'var(--text-dim)',
    fontSize: '13px',
    fontFamily: 'IBM Plex Mono, monospace',
    padding: '4px 8px',
    border: '1px solid var(--border)',
    borderRadius: '4px',
  },
  roomName: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text)',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  empty: {
    color: 'var(--text-dim)',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '48px',
  },
  typingIndicator: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    padding: '6px 0',
    minHeight: '24px',
  },
  inputArea: {
    display: 'flex',
    gap: '12px',
    padding: '16px 0',
    borderTop: '1px solid var(--border)',
  },
  input: {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: '4px',
    padding: '10px 14px',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    padding: '10px 20px',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: '13px',
    fontWeight: '600',
    borderRadius: '4px',
    border: 'none',
  },
};

export default Chat;
