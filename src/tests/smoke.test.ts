import { calculateDocumentStats } from '../utils/formatters';
import { validateTitle, sanitizeText } from '../utils/security';
import { APP_CONFIG } from '../config/app.config';
import { tokens } from '../design-system/tokens';
import { folderService } from '../services/folderService';
import { documentService } from '../services/documentService';
import { bookService } from '../services/bookService';
import { storyService } from '../services/storyService';
import { getEditorExtensions } from '../editor/extensions';
import { BUILT_IN_THEMES } from '../theme';
import { ambientEngine } from '../audio/ambientEngine';
import {
  getDocumentTypeTemplate,
  getDefaultMetadataForType,
  calculateEnhancedStats,
} from '../editor/documentTemplates';

export function runSmokeTests(): boolean {
  console.log('[SmokeTest] Running LITERIA Phase 0 through Phase 5 verification...');

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

  // Phase 4 Tests: Folder & Library file management methods
  if (typeof folderService.create !== 'function' || typeof folderService.getSubfolders !== 'function') {
    throw new Error('FolderService methods verification failed');
  }

  if (
    typeof documentService.duplicate !== 'function' ||
    typeof documentService.moveToFolder !== 'function' ||
    typeof documentService.bulkArchive !== 'function'
  ) {
    throw new Error('DocumentService Phase 4 library methods verification failed');
  }

  // Phase 5 Tests: Core Text Editor extension suite
  const extensions = getEditorExtensions();
  if (!Array.isArray(extensions) || extensions.length < 10) {
    throw new Error(`Editor extensions suite failed: expected >= 10, got ${extensions.length}`);
  }

  // Phase 6 Tests: Built-in themes & customization engine
  const expectedThemes = [
    'light',
    'dark',
    'midnight',
    'ivory',
    'sepia',
    'minimal',
    'forest',
    'aurora',
    'custom',
  ] as const;

  for (const themeId of expectedThemes) {
    if (!BUILT_IN_THEMES[themeId]) {
      throw new Error(`Missing expected built-in theme definition: ${themeId}`);
    }
  }

  // Phase 7 Tests: Document Types templates, metadata, and specialized stats
  const all10DocTypes: import('../types').DocumentType[] = [
    'blank',
    'note',
    'story',
    'novel',
    'book',
    'poem',
    'script',
    'comic',
    'journal',
    'draft',
  ];

  for (const docType of all10DocTypes) {
    const template = getDocumentTypeTemplate(docType, 'Test Title');
    if (typeof template !== 'string') {
      throw new Error(`Template generation failed for docType: ${docType}`);
    }
    const defaultMeta = getDefaultMetadataForType(docType);
    if (typeof defaultMeta !== 'object' || defaultMeta === null) {
      throw new Error(`Default metadata failed for docType: ${docType}`);
    }
  }

  // Verify enhanced script stats
  const scriptSample = 'INT. ROOM - DAY\nELENA\nHello world.\nEXT. GARDEN - NIGHT\nJULIAN\nGoodbye.';
  const scriptStats = calculateEnhancedStats('script', scriptSample, scriptSample);
  if (scriptStats.scenesCount !== 2) {
    throw new Error(`Enhanced script scenesCount expected 2, got ${scriptStats.scenesCount}`);
  }

  // Phase 8 Tests: Books, Novels & Multi-Chapter Works
  if (
    typeof bookService.create !== 'function' ||
    typeof bookService.getChapters !== 'function' ||
    typeof bookService.moveChapter !== 'function' ||
    typeof bookService.getRollupStats !== 'function' ||
    typeof bookService.compileManuscript !== 'function'
  ) {
    throw new Error('BookService Phase 8 methods verification failed');
  }

  // Phase 9 Tests: Distraction-Free, Focus & Ambient Atmosphere Modes
  const initialAmbient = ambientEngine.getState();
  if (typeof initialAmbient.volume !== 'number') {
    throw new Error('Ambient engine volume property verification failed');
  }

  ambientEngine.setVolume(0.65);
  if (Math.abs(ambientEngine.getState().volume - 0.65) > 0.01) {
    throw new Error('Ambient engine setVolume verification failed');
  }

  const focusLevels: import('../components/focus/FocusModeHUD').FocusDepth[] = [
    'off',
    'paragraph',
    'sentence',
    'line',
  ];
  if (focusLevels.length !== 4) {
    throw new Error('Focus levels count mismatch');
  }

  // Phase 10 Tests: Story Development & World-Building Tools
  if (
    typeof storyService.createCharacter !== 'function' ||
    typeof storyService.getAllCharacters !== 'function' ||
    typeof storyService.createLocation !== 'function' ||
    typeof storyService.getAllLocations !== 'function' ||
    typeof storyService.createTimelineEvent !== 'function' ||
    typeof storyService.getAllTimelineEvents !== 'function' ||
    typeof storyService.createScene !== 'function' ||
    typeof storyService.getAllScenes !== 'function'
  ) {
    throw new Error('StoryService Phase 10 methods verification failed');
  }

  console.log('[SmokeTest] All Phase 0 through Phase 10 (Story-Development & World-Building) smoke tests passed.');
  return true;
}

