import { useState, useRef, useCallback } from 'react';

export default function VoiceButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript && onResult) {
        onResult(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: 'none',
        background: listening
          ? 'linear-gradient(135deg, #EF4444, #F87171)'
          : 'linear-gradient(135deg, #818CF8, #6366F1)',
        color: '#fff',
        fontSize: 22,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: listening
          ? '0 0 24px rgba(239, 68, 68, 0.5)'
          : '0 0 24px rgba(129, 140, 248, 0.3)',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
      title={listening ? 'Stop listening' : 'Start voice input'}
    >
      {listening ? '\u23F9' : '\uD83C\uDFA4'}
    </button>
  );
}
