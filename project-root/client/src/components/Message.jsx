const Message = ({ message, isOwn }) => {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div style={{ ...styles.wrapper, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
      <div style={{ ...styles.bubble, ...(isOwn ? styles.own : styles.other) }}>
        {!isOwn && (
          <span style={styles.username} className="mono">{message.username || message.sender_id}</span>
        )}
        <p style={styles.content}>{message.content}</p>
        <span style={styles.time} className="mono">{time}</span>
      </div>
    </div>
  );
};

const styles = {
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
