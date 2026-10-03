import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { cleanMarkdownForSpeech } from '../voice/webSpeech';
import { parseVoiceCommand } from '../voice/commands';
import { VoiceControls } from '../components/VoiceControls';
import { VoiceProvider } from '../context/VoiceContext';
import { VoiceInput, VoiceOutput } from '../voice/types';

describe('Voice Utilities & Command Parser', () => {
  it('cleans markdown into speech-friendly natural text', () => {
    const rawMarkdown = `
# System Report
Here is the code:
\`\`\`python
def execute():
    return 42
\`\`\`
Check out [this link](https://example.com) for \`system_information\` and **bold text**.
    `.trim();

    const cleaned = cleanMarkdownForSpeech(rawMarkdown);

    expect(cleaned).not.toContain('```');
    expect(cleaned).not.toContain('def execute()');
    expect(cleaned).toContain('[code block omitted]');
    expect(cleaned).toContain('this link');
    expect(cleaned).toContain('system_information');
    expect(cleaned).toContain('bold text');
  });

  describe('Voice Command Parsing & Safety Boundaries', () => {
    it('HARD SAFETY RULE: blocks voice-initiated approvals and instructs user to click', () => {
      const approveResult = parseVoiceCommand('approve');
      expect(approveResult.type).toBe('approval_blocked');
      if (approveResult.type === 'approval_blocked') {
        expect(approveResult.feedback).toMatch(/Security Rule: Sensitive approvals require a deliberate physical click/i);
      }

      const denyResult = parseVoiceCommand('deny action 123');
      expect(denyResult.type).toBe('approval_blocked');

      const confirmResult = parseVoiceCommand('confirm');
      expect(confirmResult.type).toBe('approval_blocked');
    });

    it('parses safe navigation voice commands accurately', () => {
      expect(parseVoiceCommand('open security center')).toEqual({
        type: 'navigate',
        target: 'security',
        feedback: 'Navigating to Defensive Security Center.',
      });

      expect(parseVoiceCommand('open daily assistant')).toEqual({
        type: 'navigate',
        target: 'daily',
        feedback: 'Navigating to Daily Assistant.',
      });

      expect(parseVoiceCommand('open audit logs')).toEqual({
        type: 'navigate',
        target: 'audit',
        feedback: 'Navigating to Activity and Audit Telemetry.',
      });

      expect(parseVoiceCommand('open memory')).toEqual({
        type: 'navigate',
        target: 'memory',
        feedback: 'Navigating to Assistant Memory and Preferences.',
      });

      expect(parseVoiceCommand('open settings')).toEqual({
        type: 'navigate',
        target: 'settings',
        feedback: 'Navigating to Command Center Settings.',
      });
    });

    it('treats regular speech as a chat query for the assistant', () => {
      const res = parseVoiceCommand('What system am I running?');
      expect(res).toEqual({
        type: 'chat_query',
        query: 'What system am I running?',
      });
    });
  });
});

describe('VoiceControls Component', () => {
  let mockVoiceInput: VoiceInput;
  let mockVoiceOutput: VoiceOutput;

  beforeEach(() => {
    mockVoiceInput = {
      isSupported: vi.fn().mockReturnValue(true),
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      getState: vi.fn().mockReturnValue('idle'),
    };

    mockVoiceOutput = {
      isSupported: vi.fn().mockReturnValue(true),
      speak: vi.fn(),
      stop: vi.fn(),
      getVoices: vi.fn().mockReturnValue([]),
      isSpeaking: vi.fn().mockReturnValue(false),
    };
  });

  it('renders Push-to-Talk button, language selector, and standby telemetry', () => {
    render(
      <VoiceProvider voiceInput={mockVoiceInput} voiceOutput={mockVoiceOutput}>
        <VoiceControls onTranscriptReady={vi.fn()} />
      </VoiceProvider>
    );

    expect(screen.getByText(/MIC STANDBY/i)).toBeInTheDocument();
    expect(screen.getByText(/HOLD TO TALK \(PUSH-TO-TALK\)/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('en-IN');
  });

  it('calls start on mouse down and stop on mouse up in Push-to-Talk mode', () => {
    render(
      <VoiceProvider voiceInput={mockVoiceInput} voiceOutput={mockVoiceOutput}>
        <VoiceControls onTranscriptReady={vi.fn()} />
      </VoiceProvider>
    );

    const pttButton = screen.getByRole('button', { name: /Push to talk/i });

    fireEvent.mouseDown(pttButton);
    expect(mockVoiceInput.start).toHaveBeenCalled();

    fireEvent.mouseUp(pttButton);
    expect(mockVoiceInput.stop).toHaveBeenCalled();
  });

  it('displays fallback notice when voice recognition is unsupported', () => {
    mockVoiceInput.isSupported = vi.fn().mockReturnValue(false);

    render(
      <VoiceProvider voiceInput={mockVoiceInput} voiceOutput={mockVoiceOutput}>
        <VoiceControls onTranscriptReady={vi.fn()} />
      </VoiceProvider>
    );

    expect(screen.getByText(/VOICE UNSUPPORTED/i)).toBeInTheDocument();
    expect(screen.getByText(/Web Speech recognition is unavailable in this browser/i)).toBeInTheDocument();
  });
});
