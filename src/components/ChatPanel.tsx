'use client';

import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/client';
import type { ChatMessage, RoomView } from '@/lib/types';

function formatTime(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function sweaterHex(num: number) {
  return '#' + (num || 0xc2283a).toString(16).padStart(6, '0');
}

export default function ChatPanel({
  code,
  token,
  me,
  messages,
  onView,
}: {
  code: string;
  token: string | null;
  me: { id: string; name: string } | null;
  messages: ChatMessage[];
  onView: (v: RoomView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const lastSeenCount = useRef(messages.length);
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track unread messages when the panel is closed
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      lastSeenCount.current = messages.length;
    } else {
      const diff = messages.length - lastSeenCount.current;
      if (diff > 0) {
        setUnreadCount((prev) => prev + diff);
        lastSeenCount.current = messages.length;
      }
    }
  }, [messages.length, open]);

  // Scroll to bottom when new messages arrive or when opened
  useEffect(() => {
    if (open) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length]);

  // Focus input when opened
  useEffect(() => {
    if (open && me) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, me]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || sending || !token) return;

    setSending(true);
    setError('');
    try {
      const res = await api.act(code, token, { type: 'chat', text: clean });
      setText('');
      onView(res.view);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* ── Floating Lower-Left Trigger Button ── */}
      {!open && (
        <button
          type="button"
          className="chat-toggle-btn"
          onClick={() => {
            setOpen(true);
            setUnreadCount(0);
          }}
          aria-label={unreadCount > 0 ? `Open chat (${unreadCount} unread)` : 'Open chat'}
          title="Open room chat"
        >
          {/* Chat bubble SVG icon */}
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="chat-btn-label">Chat</span>

          {/* Unread badge indicator */}
          {unreadCount > 0 && (
            <span className="chat-unread-badge" aria-label={`${unreadCount} unread messages`}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Expandable Lower-Left Chat Window ── */}
      {open && (
        <aside
          className="chat-window"
          role="complementary"
          aria-label="Room chat"
        >
          {/* Header */}
          <header className="chat-header">
            <div className="chat-header-title">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Room Chat</span>
              <span className="chat-msg-count">({messages.length})</span>
            </div>
            <button
              type="button"
              className="chat-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              title="Close chat"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          {/* Messages list */}
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p>No messages yet.</p>
                <small>Say hello to the family! 🎁</small>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = me && m.senderId === me.id;
                return (
                  <div key={m.id} className={'chat-row' + (isMe ? ' me' : '')}>
                    {!isMe && (
                      <div className="chat-meta">
                        <span
                          className="chat-avatar-dot"
                          style={{ backgroundColor: sweaterHex(m.senderSweater) }}
                          aria-hidden="true"
                        />
                        <strong className="chat-author">{m.senderName}</strong>
                        <span className="chat-time">{formatTime(m.createdAt)}</span>
                      </div>
                    )}
                    <div className={'chat-bubble' + (isMe ? ' me' : '')}>
                      <p className="chat-text">{m.text}</p>
                      {isMe && <span className="chat-time me">{formatTime(m.createdAt)}</span>}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {/* Error prompt */}
          {error && <div className="chat-error" role="alert">{error}</div>}

          {/* Footer Input */}
          <footer className="chat-footer">
            {me ? (
              <form onSubmit={handleSend} className="chat-form">
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={140}
                  className="chat-input"
                  placeholder="Say something nice…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={sending}
                  aria-label="Chat message"
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!text.trim() || sending}
                  aria-label="Send message"
                  title="Send message"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            ) : (
              <div className="chat-signin-hint">
                <span>Sign in with your name to join the chat</span>
              </div>
            )}
          </footer>
        </aside>
      )}
    </>
  );
}
