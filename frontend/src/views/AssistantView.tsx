import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Terminal,
  Cpu,
  RefreshCw,
  Plus,
  Loader2,
  Lock,
  Volume2,
} from 'lucide-react';
import { api } from '../api/client';
import { Conversation, Message, ConfirmResponse } from '../api/types';
import { Markdown } from '../components/Markdown';
import { ApprovalCard } from '../components/ApprovalCard';
import { VoiceControls } from '../components/VoiceControls';
import { useVoice } from '../context/VoiceContext';
import { parseVoiceCommand } from '../voice/commands';
import { ActiveView } from '../components/Sidebar';

interface AssistantViewProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onRefreshData?: () => void;
  onNavigate?: (view: ActiveView) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({
  initialPrompt,
  onClearInitialPrompt,
  onRefreshData,
  onNavigate,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations list
  const loadConversations = async () => {
    try {
      const list = await api.getConversations();
      setConversations(list);
      if (list.length > 0 && !activeConversationId) {
        selectConversation(list[0].id);
      }
    } catch {
      // Ignore load error on fresh install
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Handle incoming initialPrompt from Command Palette
  useEffect(() => {
    if (initialPrompt) {
      sendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const selectConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const detail = await api.getConversation(id);
      setMessages(detail.messages || []);
    } catch (err) {
      setError('Failed to load conversation messages.');
    }
  };

  const startNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputText('');
    inputRef.current?.focus();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText('');
    setError(null);
    setLoading(true);

    // Optimistically show user message
    const tempUserMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await api.chat({
        message: text,
        conversation_id: activeConversationId || undefined,
      });

      setActiveConversationId(res.conversation_id);
      setMessages((prev) => [...prev, res.reply]);
      loadConversations();
      if (onRefreshData) onRefreshData();

      if (autoSpeak && res.reply?.content) {
        speak(res.reply.content);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to get response from assistant.');
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const { autoSpeak, autoSend, speak, stopSpeaking, isSpeaking } = useVoice();

  const handleVoiceTranscript = (transcriptText: string) => {
    const result = parseVoiceCommand(transcriptText);

    if (result.type === 'approval_blocked') {
      setError(result.feedback);
      speak(result.feedback);
      return;
    }

    if (result.type === 'navigate') {
      speak(result.feedback);
      if (onNavigate) {
        onNavigate(result.target);
      }
      return;
    }

    if (autoSend) {
      sendMessage(result.query);
    } else {
      setInputText(result.query);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleApprovalResolved = (res: ConfirmResponse) => {
    if (res.reply) {
      setMessages((prev) => [...prev, res.reply!]);
    }
    if (onRefreshData) onRefreshData();
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-cockpit-base font-sans">
      {/* Conversation History Rail */}
      <div className="w-64 border-r border-cockpit-border bg-cockpit-surface hidden md:flex flex-col shrink-0 select-none">
        <div className="p-3 border-b border-cockpit-border flex items-center justify-between">
          <span className="font-mono text-xs font-bold text-cockpit-muted uppercase tracking-wider">
            SESSIONS
          </span>
          <button
            type="button"
            onClick={startNewConversation}
            className="flex items-center gap-1 px-2 py-1 rounded bg-cockpit-elevated border border-cockpit-border text-[11px] font-mono text-cockpit-text hover:bg-cockpit-border transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-cockpit-accent" />
            <span>NEW CHAT</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-cockpit-muted">
              NO PRIOR SESSIONS
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono truncate transition-colors ${
                  activeConversationId === c.id
                    ? 'bg-cockpit-elevated text-cockpit-accent border border-cockpit-accent/40 font-semibold'
                    : 'text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40 border border-transparent'
                }`}
                title={c.title}
              >
                {c.title || 'Untitled Session'}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Workspace Top Toolbar */}
        <header className="h-12 border-b border-cockpit-border bg-cockpit-surface px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cockpit-accent" />
            <h2 className="font-mono text-xs font-bold tracking-wide uppercase text-cockpit-text">
              COCKPIT ASSISTANT RUNTIME
            </h2>
            <span className="text-cockpit-border">|</span>
            <span className="font-mono text-[11px] text-cockpit-muted">
              {activeConversationId ? `SESSION: ${activeConversationId.slice(0, 8)}...` : 'NEW SESSION'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewConversation}
              className="md:hidden flex items-center gap-1 px-2 py-1 rounded bg-cockpit-elevated border border-cockpit-border text-xs font-mono"
            >
              <Plus className="w-3.5 h-3.5 text-cockpit-accent" />
              <span>NEW</span>
            </button>
            <button
              type="button"
              onClick={loadConversations}
              className="p-1.5 rounded hover:bg-cockpit-elevated text-cockpit-muted hover:text-cockpit-text transition-colors"
              title="Refresh conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
              <div className="p-4 rounded-full bg-cockpit-surface border border-cockpit-border mb-4 text-cockpit-accent shadow-glow">
                <Terminal className="w-8 h-8" />
              </div>
              <h3 className="font-mono text-sm font-bold tracking-wider uppercase text-cockpit-text mb-1">
                AEGIS COMMAND ASSISTANT READY
              </h3>
              <p className="text-xs font-mono text-cockpit-muted max-w-md mb-6">
                All tool actions are constrained by the Permission Engine. Risky operations always trigger inline cryptographic approval cards.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {[
                  'What system am I running?',
                  'Explain how the permission engine works',
                  'List all installed system tools',
                  'What is my defensive posture?',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="p-2.5 rounded bg-cockpit-surface border border-cockpit-border hover:border-cockpit-accent text-left text-xs font-mono text-cockpit-muted hover:text-cockpit-text transition-colors"
                  >
                    <span className="text-cockpit-accent mr-1.5">&gt;</span>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded shrink-0 flex items-center justify-center border text-xs font-mono ${
                    msg.role === 'user'
                      ? 'bg-cockpit-elevated border-cockpit-border text-cockpit-text'
                      : 'bg-cockpit-accent/10 border-cockpit-accent/30 text-cockpit-accent'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Bubble & Metadata */}
                <div
                  className={`rounded-lg border p-3.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-cockpit-elevated border-cockpit-border text-cockpit-text'
                      : 'bg-cockpit-surface border-cockpit-border text-cockpit-text shadow-sm'
                  }`}
                >
                  {/* Assistant Telemetry Header */}
                  {msg.role === 'assistant' && msg.metadata && (
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-cockpit-muted border-b border-cockpit-border/60 pb-2 mb-2">
                      {msg.metadata.provider && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text">
                          <Cpu className="w-3 h-3 text-cockpit-accent" />
                          {String(msg.metadata.provider)}
                        </span>
                      )}
                      {msg.metadata.tool && (
                        <span className="px-1.5 py-0.5 rounded bg-cockpit-base border border-cockpit-border text-cockpit-accent">
                          TOOL: {String(msg.metadata.tool)}
                        </span>
                      )}
                      {msg.metadata.decision && (
                        <span
                          className={`px-1.5 py-0.5 rounded border uppercase font-bold ${
                            msg.metadata.decision === 'allow'
                              ? 'text-severity-low border-severity-low/40 bg-severity-low/10'
                              : msg.metadata.decision === 'ask'
                              ? 'text-severity-med border-severity-med/40 bg-severity-med/10'
                              : 'text-severity-high border-severity-high/40 bg-severity-high/10'
                          }`}
                        >
                          {String(msg.metadata.decision)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Render Markdown Content */}
                  <Markdown content={msg.content} />

                  {/* INLINE APPROVAL CARD IF PENDING ACTION DETECTED */}
                  {msg.role === 'assistant' && msg.metadata?.pending_action_id && (
                    <ApprovalCard
                      actionId={String(msg.metadata.pending_action_id)}
                      toolName={String(msg.metadata.tool || 'system_action')}
                      expiresAt={msg.metadata.pending_expires_at ? String(msg.metadata.pending_expires_at) : undefined}
                      onResolved={handleApprovalResolved}
                    />
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-cockpit-muted/70 mt-2 pt-1 border-t border-cockpit-border/40">
                    {msg.role === 'assistant' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (isSpeaking) {
                            stopSpeaking();
                          } else {
                            speak(msg.content);
                          }
                        }}
                        aria-label="Read reply aloud"
                        className="flex items-center gap-1 text-cockpit-muted hover:text-cockpit-accent transition-colors"
                        title="Read message aloud"
                      >
                        <Volume2 className="w-3 h-3 text-cockpit-accent" />
                        <span>SPEAK</span>
                      </button>
                    ) : (
                      <span />
                    )}
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2 text-xs font-mono text-cockpit-muted p-2">
              <Loader2 className="w-4 h-4 animate-spin text-cockpit-accent" />
              <span>ORCHESTRATING RESPONSE & EXECUTING SAFETY CHECKS...</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div role="alert" className="p-3 rounded bg-severity-high/10 border border-severity-high text-severity-high text-xs font-mono">
              <strong>ERROR:</strong> {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-cockpit-border bg-cockpit-surface space-y-2">
          {/* Integrated Voice Controls (Push-to-Talk, Language Selector, Mic Status) */}
          <VoiceControls onTranscriptReady={handleVoiceTranscript} />

          <div className="relative flex items-end rounded-lg border border-cockpit-border bg-cockpit-base focus-within:border-cockpit-accent focus-within:ring-1 focus-within:ring-cockpit-accent transition-colors">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send instruction or query (Ctrl+Enter to send)..."
              disabled={loading}
              className="w-full bg-transparent p-3 text-sm font-sans text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none resize-none leading-relaxed"
            />
            <div className="p-2 flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={loading || !inputText.trim()}
                onClick={() => sendMessage()}
                aria-label="Send message"
                className="p-2 rounded bg-cockpit-accent text-black hover:bg-cockpit-accent/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cockpit-accent shadow-glow"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] font-mono text-cockpit-muted">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-cockpit-muted" />
              <span>Level 5 blocked always • Risky actions require approval click</span>
            </span>
            <span>Ctrl + Enter to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
