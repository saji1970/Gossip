import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '../services/conversation.api.js';

export function useConversation(userId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const speechRef = useRef(null);

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    setError(null);

    // Add user message immediately
    const userMsg = { id: Date.now(), role: 'user', content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);

    try {
      const res = await sendMessage(userId, text);

      // Add assistant reply
      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.reply,
        intent: res.intent,
        action: res.action,
        success: res.success,
        nextActions: res.nextActions || [],
        needsConfirmation: res.needsConfirmation || false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Speak response using Web Speech API
      speak(res.reply);

      return res;
    } catch (err) {
      setError(err.message);
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Something went wrong. Please try again.',
        isError: true,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, loading]);

  const speak = useCallback((text) => {
    try {
      // Cancel any ongoing speech
      if (speechRef.current) {
        speechSynthesis.cancel();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      // Try to use a natural voice
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural'),
      );
      if (preferred) {
        utterance.voice = preferred;
      }

      speechRef.current = utterance;
      speechSynthesis.speak(utterance);

      utterance.onend = () => { speechRef.current = null; };
    } catch {
      // Speech synthesis not available — silent fallback
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    speechRef.current = null;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    send,
    speak,
    stopSpeaking,
    clearMessages,
  };
}
