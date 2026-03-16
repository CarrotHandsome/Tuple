import { useState } from 'react';


const Message = ({ message, isOwn }) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [hovering, setHovering] = useState(false);

  return (
    <div style={{ ...styles.wrapper, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div style={{ ...styles.bubble, ...(isOwn ? styles.own : styles.other) }}>
        {!isOwn && (
          <div
            style={styles.usernameWrapper}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            <span style={styles.username} className="mono">{message.username || message.sender_id}</span>
            {hovering && message.firstname && (
              <div style={styles.tooltip}>
                {[message.firstname, message.lastname].filter(Boolean).join(' ')}
              </div>
            )}
          </div>
        )}
        <p style={styles.content}>{message.content}</p>
        <span style={styles.time} className="mono">{time}</span>
      </div>
    </div>
  );
};

const styles = {
  usernameWrapper: {
    position: 'relative',
    cursor: 'default',
    display: 'inline-block',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '0',
    marginBottom: '4px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '11px',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    zIndex: 10,
  },
  wrapper: {
    display: 'flex',
    marginBottom: '12px',
  },
  bubble: {
    maxWidth: '65%',
    padding: '10px 14px',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  own: {
    background: 'var(--accent)',
    color: '#0f0f0f',
    borderBottomRightRadius: '2px',
  },
  other: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderBottomLeftRadius: '2px',
  },
  username: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--accent-dim)',
    marginBottom: '2px',
  },
  content: {
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  time: {
    fontSize: '10px',
    opacity: 0.6,
    alignSelf: 'flex-end',
  },
};

export default Message;
