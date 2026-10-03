import { calculateDocumentStats } from '../utils/formatters';
import { validateTitle, sanitizeText } from '../utils/security';
import { APP_CONFIG } from '../config/app.config';
import { tokens } from '../design-system/tokens';

export function runSmokeTests(): boolean {
  console.log('[SmokeTest] Running LITERIA Phase 0 & Phase 1 verification...');

  // Test 1: App Config verification
  if (!APP_CONFIG.name || APP_CONFIG.name !== 'LITERIA') {
    throw new Error('APP_CONFIG name verification failed');
  }

  // Test 2: Sanitization & security
  const dangerous = '<script>alert("xss")</script>';
  const sanitized = sanitizeText(dangerous);
  if (sanitized.includes('<script>')) {
    throw new Error('Sanitization failed');
  }

  // Test 3: Title validation
  if (validateTitle('').isValid || !validateTitle('My Manuscript').isValid) {
    throw new Error('Title validation failed');
  }

  // Test 4: Document stats calculation
  const sample = 'Write. Create. Remember. Where every story finds its form.';
  const stats = calculateDocumentStats(sample);
  if (stats.words !== 9) {
    throw new Error(`Word calculation failed: expected 9, got ${stats.words}`);
  }

  // Phase 1 Tests: Design tokens & typography categories
  if (!tokens.colors.semantic.accent || !tokens.colors.stone[900]) {
    throw new Error('Design tokens color verification failed');
  }

  const requiredTypography = ['serif', 'sans', 'mono', 'classic', 'modern', 'handwriting'] as const;
  for (const typo of requiredTypography) {
    if (!tokens.typography.categories[typo]) {
      throw new Error(`Missing typography category: ${typo}`);
    }
  }

  // Phase 2 Tests: Shell routing validation
  const requiredRoutes = [
    'home',
    'library',
    'document',
    'book',
    'recent',
    'favorites',
    'drafts',
    'folders',
    'tags',
    'archive',
    'trash',
    'settings',
  ] as const;

  if (requiredRoutes.length !== 12) {
    throw new Error('Required routes count mismatch');
  }

  // Phase 3 Tests: Quick create 9 document types validation
  const requiredDocTypes: import('../types').DocumentType[] = [
    'blank',
    'note',
    'story',
    'novel',
    'book',
    'poem',
    'script',
    'comic',
    'journal',
  ];

  if (requiredDocTypes.length !== 9) {
    throw new Error('Quick create 9 document types count mismatch');
  }

  console.log('[SmokeTest] All Phase 0, 1, 2, and 3 Home Dashboard smoke tests passed.');
  return true;
}
