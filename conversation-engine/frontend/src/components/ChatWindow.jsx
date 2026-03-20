import { useEffect, useRef } from 'react';
import { useConversation } from '../hooks/useConversation.js';
import ChatInput from './ChatInput.jsx';

export default function ChatWindow({ userId }) {
  const { messages, loading, error, send } = useConversation(userId);
  const bottomRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Gossip</h1>
        <span style={styles.aiBadge}>AI</span>
      </div>

      {/* Messages */}
      <div style={styles.messageList}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>&#x1F4AC;</div>
            <p style={styles.emptyText}>
              Say something like <em>"Create a private group PillaiFamily"</em>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onAction={send} />
        ))}

        {loading && (
          <div style={styles.typingRow}>
            <div style={styles.typingBubble}>
              <span style={styles.typingDot}>.</span>
              <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}>.</span>
              <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}>.</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={send} loading={loading} />
    </div>
  );
}

function MessageBubble({ message, onAction }) {
  const isUser = message.role === 'user';

  return (
    <div style={isUser ? styles.userRow : styles.assistantRow}>
      <div style={isUser ? styles.userBubble : styles.assistantBubble}>
        {!isUser && <div style={styles.label}>Gossip</div>}
        <div style={styles.messageText}>{message.content}</div>

        {/* Next action pills */}
        {message.nextActions?.length > 0 && (
          <div style={styles.actionPills}>
            {message.nextActions.map((action, i) => (
              <button
                key={i}
                style={styles.actionPill}
                onClick={() => onAction(action)}
              >
                {action}
              </button>
            ))}
          </div>
        )}

        {/* Confirmation buttons */}
        {message.needsConfirmation && (
          <div style={styles.actionPills}>
            <button style={styles.confirmPill} onClick={() => onAction('Yes, do it')}>
              Yes
            </button>
            <button style={styles.cancelPill} onClick={() => onAction('No, cancel')}>
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    maxWidth: 520,
    margin: '0 auto',
    background: '#0F172A',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 20px',
    borderBottom: '1px solid rgba(129, 140, 248, 0.1)',
    background: 'rgba(2, 6, 23, 0.8)',
  },
  title: {
    color: '#818CF8',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 1,
    margin: 0,
    textShadow: '0 0 12px rgba(129, 140, 248, 0.5)',
  },
  aiBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: '#34D399',
    background: 'rgba(52, 211, 153, 0.2)',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    borderRadius: 8,
    padding: '2px 6px',
    letterSpacing: 0.5,
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    opacity: 0.5,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 1.6 },
  userRow: { display: 'flex', justifyContent: 'flex-end' },
  assistantRow: { display: 'flex', justifyContent: 'flex-start' },
  userBubble: {
    background: '#312E81',
    borderRadius: '18px 18px 4px 18px',
    padding: '10px 14px',
    maxWidth: '78%',
  },
  assistantBubble: {
    background: '#1E293B',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 14px',
    maxWidth: '85%',
    borderLeft: '3px solid #818CF8',
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: '#818CF8',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 15,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actionPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  actionPill: {
    background: 'rgba(129, 140, 248, 0.15)',
    border: '1px solid rgba(129, 140, 248, 0.3)',
    borderRadius: 14,
    padding: '6px 12px',
    color: '#818CF8',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  confirmPill: {
    background: 'rgba(52, 211, 153, 0.15)',
    border: '1px solid rgba(52, 211, 153, 0.3)',
    borderRadius: 14,
    padding: '6px 14px',
    color: '#34D399',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  cancelPill: {
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: 14,
    padding: '6px 14px',
    color: '#F87171',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  typingRow: { display: 'flex', justifyContent: 'flex-start' },
  typingBubble: {
    background: '#1E293B',
    borderRadius: 18,
    padding: '10px 18px',
    display: 'flex',
    gap: 4,
    borderLeft: '3px solid #818CF8',
  },
  typingDot: {
    color: '#818CF8',
    fontSize: 24,
    lineHeight: '14px',
    animation: 'blink 1s infinite',
  },
  errorBanner: {
    background: 'rgba(248, 113, 113, 0.1)',
    borderTop: '1px solid rgba(248, 113, 113, 0.3)',
    color: '#F87171',
    padding: '8px 16px',
    fontSize: 13,
    textAlign: 'center',
  },
};
