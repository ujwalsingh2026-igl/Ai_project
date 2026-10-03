import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface MarkdownProps {
  content: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content }) => {
  // Split into code blocks vs text blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed break-words font-sans">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const language = lines[0].trim();
          const code = lines.slice(1).join('\n');

          return <CodeBlock key={index} language={language} code={code} />;
        }

        return <TextMarkdown key={index} text={part} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
    }
  };

  return (
    <div className="my-3 rounded border border-cockpit-border bg-cockpit-base overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-cockpit-surface border-b border-cockpit-border font-mono text-xs text-cockpit-muted">
        <span className="font-semibold uppercase text-cockpit-text">{language || 'text'}</span>
        <button
          onClick={handleCopy}
          type="button"
          aria-label="Copy code block"
          className="flex items-center gap-1 hover:text-cockpit-text transition-colors p-1 rounded hover:bg-cockpit-elevated focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cockpit-accent"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-severity-low" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="text-[11px]">{copied ? 'COPIED' : 'COPY'}</span>
        </button>
      </div>
      <pre className="p-3 font-mono text-xs text-cockpit-text overflow-x-auto leading-5 selection:bg-cockpit-accent selection:text-black">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TextMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={idx} className="text-base font-semibold text-cockpit-text mt-3 mb-1">{renderInline(line.slice(4))}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={idx} className="text-lg font-bold text-cockpit-text mt-4 mb-1 border-b border-cockpit-border pb-1">{renderInline(line.slice(3))}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={idx} className="text-xl font-bold text-cockpit-accent mt-4 mb-2 tracking-wide uppercase">{renderInline(line.slice(2))}</h1>;
        }

        // Blockquotes
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-2 border-cockpit-accent pl-3 py-0.5 text-cockpit-muted italic bg-cockpit-surface/40 my-1 rounded-r">
              {renderInline(line.slice(2))}
            </blockquote>
          );
        }

        // Unordered lists
        if (line.match(/^[\*\-]\s/)) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-3 my-0.5">
              <span className="text-cockpit-accent font-mono">•</span>
              <span>{renderInline(line.replace(/^[\*\-]\s/, ''))}</span>
            </div>
          );
        }

        // Ordered lists
        const matchNum = line.match(/^(\d+)\.\s/);
        if (matchNum) {
          return (
            <div key={idx} className="flex items-start gap-2 ml-3 my-0.5">
              <span className="text-cockpit-muted font-mono font-bold text-xs">{matchNum[1]}.</span>
              <span>{renderInline(line.replace(/^\d+\.\s/, ''))}</span>
            </div>
          );
        }

        // Paragraph
        return <p key={idx} className="my-1 text-cockpit-text">{renderInline(line)}</p>;
      })}
    </>
  );
};

// Inline token renderer: handles bold, italic, inline code, and links
function renderInline(str: string): React.ReactNode {
  // Regex tokenization for `code`, **bold**, *italic*, [link](href)
  const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded font-mono text-xs bg-cockpit-surface border border-cockpit-border text-cockpit-accent"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i} className="font-semibold text-cockpit-text">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={i} className="italic text-cockpit-text">{token.slice(1, -1)}</em>;
    }
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cockpit-accent underline hover:text-cockpit-text transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return token;
  });
}
