import type { AIActionType } from '../types';

export interface AIServiceResponse {
  suggestion: string;
  confidence?: number;
}

export const aiService = {
  async processWritingPrompt(
    _action: AIActionType,
    _text: string,
    _context?: string
  ): Promise<AIServiceResponse> {
    // Stub implementation for Phase 0 foundation
    return {
      suggestion: 'AI service layer initialized and ready for configuration.',
      confidence: 1.0,
    };
  },
};
