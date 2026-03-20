import { useState, useCallback } from 'react';
import VoiceButton from './VoiceButton.jsx';

export default function ChatInput({ onSend, loading }) {
  const [text, setText] = useState('');

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText('');
  }, [text, loading, onSend]);

  const handleVoiceResult = useCallback((transcript) => {
    if (transcript && onSend) {
      onSend(transcript);
    }
  }, [onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tell Gossip what to do..."
        disabled={loading}
        style={styles.input}
        autoFocus
      />

      <button
        type="submit"
        disabled={!text.trim() || loading}
        style={{
          ...styles.sendBtn,
          opacity: !text.trim() || loading ? 0.4 : 1,
          cursor: !text.trim() || loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? '\u23F3' : '\u2192'}
      </button>

      <VoiceButton onResult={handleVoiceResult} disabled={loading} />
    </form>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
    background: 'rgba(15, 23, 42, 0.95)',
  },
  input: {
    flex: 1,
    height: 44,
    padding: '0 16px',
    borderRadius: 22,
    border: '1px solid rgba(148, 163, 184, 0.15)',
    background: 'rgba(30, 41, 59, 0.6)',
    color: '#F1F5F9',
    fontSize: 15,
    outline: 'none',
    fontFamily: 'inherit',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    background: '#818CF8',
    color: '#fff',
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
