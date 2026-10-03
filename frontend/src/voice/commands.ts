import { ActiveView } from '../components/Sidebar';

export type VoiceCommandResult =
  | { type: 'navigate'; target: ActiveView; feedback: string }
  | { type: 'approval_blocked'; feedback: string }
  | { type: 'chat_query'; query: string };

export function parseVoiceCommand(transcript: string): VoiceCommandResult {
  const normalized = transcript.trim().toLowerCase();

  // 1. HARD SAFETY BOUNDARY: Approvals are NEVER completed by voice alone!
  // If the user tries to speak approve/deny, explicitly refuse and instruct them to click the card.
  if (
    normalized === 'approve' ||
    normalized === 'confirm' ||
    normalized === 'deny' ||
    normalized === 'reject' ||
    normalized.startsWith('approve ') ||
    normalized.startsWith('confirm ') ||
    normalized.startsWith('deny ') ||
    normalized.startsWith('reject ')
  ) {
    return {
      type: 'approval_blocked',
      feedback: 'Security Rule: Sensitive approvals require a deliberate physical click or keyboard confirmation on the approval card. Approvals by voice alone are prohibited.',
    };
  }

  // 2. Safe Navigation Voice Commands
  if (normalized.includes('open security') || normalized.includes('go to security') || normalized.includes('security center')) {
    return { type: 'navigate', target: 'security', feedback: 'Navigating to Defensive Security Center.' };
  }
  if (normalized.includes('open daily') || normalized.includes('daily assistant') || normalized.includes('open tasks') || normalized.includes('my planner')) {
    return { type: 'navigate', target: 'daily', feedback: 'Navigating to Daily Assistant.' };
  }
  if (normalized.includes('open network') || normalized.includes('network inventory') || normalized.includes('devices')) {
    return { type: 'navigate', target: 'network', feedback: 'Navigating to Network & DNS Inventory.' };
  }
  if (normalized.includes('open audit') || normalized.includes('audit logs') || normalized.includes('activity log')) {
    return { type: 'navigate', target: 'audit', feedback: 'Navigating to Activity and Audit Telemetry.' };
  }
  if (
    normalized.includes('open memory') ||
    normalized.includes('go to memory') ||
    normalized.includes('assistant memory') ||
    normalized.includes('developer context') ||
    normalized.includes('show memories')
  ) {
    return { type: 'navigate', target: 'memory', feedback: 'Navigating to Assistant Memory and Preferences.' };
  }
  if (normalized.includes('open settings') || normalized.includes('go to settings')) {
    return { type: 'navigate', target: 'settings', feedback: 'Navigating to Command Center Settings.' };
  }
  if (normalized.includes('open chat') || normalized.includes('open assistant') || normalized.includes('back to chat')) {
    return { type: 'navigate', target: 'assistant', feedback: 'Opening Assistant Chat.' };
  }

  // 3. Normal query / action to pass to Assistant API
  return {
    type: 'chat_query',
    query: transcript.trim(),
  };
}
