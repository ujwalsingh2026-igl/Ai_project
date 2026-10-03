import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const AIPlaceholder: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Greetings. I am your LITERIA AI Writing Companion. When configured, I will help refine prose, develop characters, explore dialogue, and overcome writer’s block—without ever altering your manuscript without your consent.',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt.trim();
    setMessages((prev) => [
      ...prev,
      { sender: 'user', text: userText },
      {
        sender: 'assistant',
        text: `AI Module foundation active. In Phase 17 & 18, I will provide deep contextual assistance for: "${userText}".`,
      },
    ]);
    setPrompt('');
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto space-y-4">
      <Card className="flex items-center gap-3 bg-stone-900 text-stone-100 border-none">
        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-base font-serif font-semibold text-white">AI Writing Companion</h2>
          <p className="text-xs text-stone-400">
            Assists with grammar, pacing, vocabulary, and world-building while preserving your authentic voice.
          </p>
        </div>
      </Card>

      {/* Message stream */}
      <div className="flex-1 bg-white rounded-xl border border-stone-200/80 p-5 overflow-y-auto space-y-4 shadow-xs">
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-4 text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-stone-900 text-white rounded-br-xs'
                  : 'bg-stone-100/80 text-stone-800 rounded-bl-xs font-serif'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask for feedback, character ideas, or phrasing suggestions..."
          className="flex-1 px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:border-stone-400 transition"
        />
        <Button type="submit" size="md">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
