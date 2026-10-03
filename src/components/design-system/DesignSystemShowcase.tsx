import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Dropdown,
  Checkbox,
  Toggle,
  Tabs,
  Tooltip,
  Badge,
  Card,
  Panel,
  Modal,
  BottomSheet,
  ContextMenu,
  useToast,
  LoadingSpinner,
  Skeleton,
  EmptyState,
  ErrorState,
  Divider,
  ScrollArea,
} from '../ui';
import { LiteriaLogo, LiteriaWordmark } from '../brand';
import {
  Sparkles,
  BookOpen,
  Feather,
  Copy,
  Trash2,
  ExternalLink,
  Search,
} from 'lucide-react';

export const DesignSystemShowcase: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('components');
  const [modalOpen, setModalOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [toggleState, setToggleState] = useState(true);
  const [checkboxState, setCheckboxState] = useState(true);
  const [selectedSelect, setSelectedSelect] = useState('novel');
  const [inputValue, setInputValue] = useState('');

  const showcaseTabs = [
    { id: 'components', label: 'Reusable Components' },
    { id: 'tokens', label: 'Semantic Tokens' },
    { id: 'typography', label: 'Typography' },
    { id: 'branding', label: 'Brand Identity' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>Design System & Visual Identity</span>
            <Badge variant="accent">Phase 1</Badge>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Living token specification, accessible components, and literary aesthetics.
          </p>
        </div>
        <Tabs
          items={showcaseTabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="pills"
        />
      </div>

      {/* 1. COMPONENTS TAB */}
      {activeTab === 'components' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Buttons & Icon Buttons */}
          <Panel title="Buttons & Controls" subtitle="Hover, focus, disabled, and loading states">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="subtle">Subtle Accent</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="primary" isLoading>
                  Loading
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <IconButton
                  aria-label="Book open"
                  variant="primary"
                  onClick={() => toast.info('Primary IconButton pressed')}
                >
                  <BookOpen className="w-4 h-4" />
                </IconButton>
                <IconButton
                  aria-label="Feather quill"
                  variant="secondary"
                  onClick={() => toast.success('Secondary IconButton pressed')}
                >
                  <Feather className="w-4 h-4" />
                </IconButton>
                <IconButton
                  aria-label="Sparkles"
                  variant="outline"
                  onClick={() => toast.warning('Outline IconButton pressed')}
                >
                  <Sparkles className="w-4 h-4" />
                </IconButton>
                <IconButton
                  aria-label="Delete"
                  variant="destructive"
                  onClick={() => toast.error('Destructive IconButton pressed')}
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </div>
          </Panel>

          {/* Form Inputs & Selects */}
          <Panel title="Form Inputs & Selection" subtitle="Accessible text inputs, textareas, and select elements">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Document Title"
                placeholder="e.g. In Search of Lost Time"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                leftIcon={<Feather className="w-4 h-4" />}
                helperText="Give your writing piece a memorable name."
              />
              <Input
                label="Search Manuscript"
                placeholder="Find passages, characters..."
                leftIcon={<Search className="w-4 h-4" />}
                error={inputValue === 'error' ? 'Invalid query format' : undefined}
                helperText="Type 'error' to see validation state."
              />
              <div className="sm:col-span-2">
                <Select
                  label="Document Genre / Type"
                  value={selectedSelect}
                  onChange={(e) => setSelectedSelect(e.target.value)}
                  options={[
                    { value: 'novel', label: 'Novel / Book' },
                    { value: 'story', label: 'Short Story' },
                    { value: 'poem', label: 'Poem / Verse' },
                    { value: 'script', label: 'Screenplay / Script' },
                    { value: 'journal', label: 'Reflective Journal' },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Prologue / Synopsis"
                  placeholder="Enter the opening lines or synopsis..."
                  rows={3}
                />
              </div>
            </div>
          </Panel>

          {/* Interactive Toggles, Checkboxes & Dropdowns */}
          <Panel title="Interactive Controls" subtitle="Checkboxes, switches, and dropdowns">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Checkbox
                  label="Autosave to local storage"
                  description="Changes are safely saved in IndexedDB after every sentence."
                  checked={checkboxState}
                  onChange={(e) => setCheckboxState(e.target.checked)}
                />
                <Checkbox
                  label="Enable typewriter scrolling"
                  description="Keeps active writing line vertically centered."
                  checked={false}
                  onChange={() => {}}
                />
              </div>

              <div className="space-y-4">
                <Toggle
                  label="Focus Mode"
                  description="Dim all chrome and sidebars while typing."
                  checked={toggleState}
                  onChange={setToggleState}
                />

                <div className="flex items-center gap-4 pt-2">
                  <Dropdown
                    trigger={
                      <Button variant="outline" size="sm">
                        <span>Document Actions</span>
                      </Button>
                    }
                    items={[
                      {
                        id: 'copy',
                        label: 'Duplicate Document',
                        icon: <Copy className="w-3.5 h-3.5" />,
                        onClick: () => toast.success('Document duplicated'),
                      },
                      {
                        id: 'export',
                        label: 'Export Markdown',
                        icon: <ExternalLink className="w-3.5 h-3.5" />,
                        onClick: () => toast.info('Export started'),
                      },
                      {
                        id: 'delete',
                        label: 'Move to Trash',
                        icon: <Trash2 className="w-3.5 h-3.5" />,
                        destructive: true,
                        onClick: () => toast.error('Moved to trash'),
                      },
                    ]}
                  />

                  <Tooltip content="Tooltip helper text on focus/hover" position="top">
                    <span className="text-xs text-stone-500 cursor-help underline decoration-dotted">
                      Hover for Tooltip
                    </span>
                  </Tooltip>
                </div>
              </div>
            </div>
          </Panel>

          {/* Overlays, Modals, Bottom Sheets & Toasts */}
          <Panel title="Overlays & Feedback" subtitle="Modals, bottom sheets, context menus, and toasts">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                Open Dialog Modal
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBottomSheetOpen(true)}>
                Open Mobile Bottom Sheet
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success('Document successfully saved locally!')}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.error('Failed to connect to cloud sync.')}
              >
                Trigger Error Toast
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.warning('Unsaved changes snapshot preserved.')}
              >
                Trigger Warning Toast
              </Button>
            </div>

            <div className="mt-4 p-4 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-900/50">
              <ContextMenu
                items={[
                  {
                    id: 'edit',
                    label: 'Edit Manuscript',
                    onClick: () => toast.info('Context: Edit'),
                  },
                  {
                    id: 'share',
                    label: 'Share Read-Only',
                    onClick: () => toast.info('Context: Share'),
                  },
                  {
                    id: 'archive',
                    label: 'Archive',
                    destructive: true,
                    onClick: () => toast.warning('Context: Archive'),
                  },
                ]}
              >
                <div className="text-xs text-stone-500 text-center py-4 select-none cursor-context-menu">
                  🖱️ Right-click anywhere in this box to test the <strong className="text-stone-800 dark:text-stone-200">ContextMenu</strong>.
                </div>
              </ContextMenu>
            </div>
          </Panel>

          {/* Badges, Loading, Empty & Error States */}
          <Panel title="Badges, Loading & Feedback States" subtitle="Status indicators and fallback UI">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="neutral">Neutral</Badge>
                <Badge variant="accent">Accent</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>

              <div className="flex items-center gap-6">
                <LoadingSpinner size="sm" label="Saving draft..." />
                <LoadingSpinner size="md" label="Analyzing pacing..." />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EmptyState
                  icon={<Feather className="w-5 h-5" />}
                  title="No Chapters Yet"
                  description="Add your first chapter to structure your novel."
                  action={
                    <Button size="xs" variant="outline">
                      Add Chapter
                    </Button>
                  }
                />
                <ErrorState
                  title="Unable to load chapter notes"
                  message="Local storage experienced a read delay. Your manuscript text is untouched."
                  onRetry={() => toast.info('Retrying connection...')}
                />
              </div>
            </div>
          </Panel>

          {/* Scroll Area & Divider */}
          <Panel title="ScrollArea & Dividers" subtitle="Restrained custom scrollbars and subtle separators">
            <div className="space-y-4">
              <Divider label="Chapter One Breakdown" />
              <ScrollArea maxHeight="120px" className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-lg text-xs leading-relaxed text-stone-600 dark:text-stone-400 font-serif">
                <p className="mb-2">
                  "For a long time I used to go to bed early. Sometimes, when I had put out my candle, my eyes would close so quickly that I had not even time to say 'I'm going to sleep.' And half an hour later the thought that it was time to go to sleep would awaken me..."
                </p>
                <p className="mb-2">
                  "I would try to put away the book which, it seemed to me, was still in my hands, and to blow out the light; I had been thinking all the time, while I was asleep, of what I had just been reading, but my thoughts had run into a channel of their own..."
                </p>
                <p>
                  "A man in his sleep holds in a circle around him the succession of hours, the order of years and worlds. He consults them instinctively by his awakening, and reads in a second the point on the earth he occupies..."
                </p>
              </ScrollArea>
              <Divider />
            </div>
          </Panel>
        </div>
      )}

      {/* 2. TOKENS TAB */}
      {activeTab === 'tokens' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card>
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100 mb-4">
              Semantic Color Palette
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-stone-50 border border-stone-200 mb-2" />
                <span className="font-semibold text-stone-900 block">Background</span>
                <span className="text-stone-500 text-[10px]">#fafaf9</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-white border border-stone-200 mb-2" />
                <span className="font-semibold text-stone-900 block">Surface</span>
                <span className="text-stone-500 text-[10px]">#ffffff</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-stone-900 mb-2" />
                <span className="font-semibold text-stone-900 block">Primary Text</span>
                <span className="text-stone-500 text-[10px]">#1c1917</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-stone-600 mb-2" />
                <span className="font-semibold text-stone-900 block">Secondary Text</span>
                <span className="text-stone-500 text-[10px]">#57534e</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-amber-600 mb-2" />
                <span className="font-semibold text-stone-900 block">Accent Amber</span>
                <span className="text-stone-500 text-[10px]">#d97706</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-emerald-600 mb-2" />
                <span className="font-semibold text-stone-900 block">Success</span>
                <span className="text-stone-500 text-[10px]">#15803d</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-red-600 mb-2" />
                <span className="font-semibold text-stone-900 block">Error</span>
                <span className="text-stone-500 text-[10px]">#b91c1c</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <div className="h-8 rounded bg-sky-600 mb-2" />
                <span className="font-semibold text-stone-900 block">Info</span>
                <span className="text-stone-500 text-[10px]">#0369a1</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. TYPOGRAPHY TAB */}
      {activeTab === 'typography' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase text-stone-400 mb-1">
                Classic / Display (Cinzel)
              </div>
              <div className="font-classic-literary text-2xl text-stone-900 dark:text-stone-100">
                LITERIA · WHERE EVERY STORY FINDS ITS FORM
              </div>
            </div>

            <Divider />

            <div>
              <div className="text-xs font-semibold uppercase text-stone-400 mb-1">
                Serif / Literary Reading (EB Garamond)
              </div>
              <div className="font-serif-literary text-xl leading-relaxed text-stone-800 dark:text-stone-200">
                “There is no greater agony than bearing an untold story inside you.”
              </div>
              <div className="text-xs text-stone-500 font-serif italic mt-1">
                — Maya Angelou, I Know Why the Caged Bird Sings
              </div>
            </div>

            <Divider />

            <div>
              <div className="text-xs font-semibold uppercase text-stone-400 mb-1">
                Sans-Serif / Clean Interface (Inter)
              </div>
              <div className="font-sans-literary text-sm text-stone-700 dark:text-stone-300">
                Streamlined typography for navigation, buttons, toolbars, and metadata.
              </div>
            </div>

            <Divider />

            <div>
              <div className="text-xs font-semibold uppercase text-stone-400 mb-1">
                Monospace / Code & Word Statistics (JetBrains Mono)
              </div>
              <div className="font-mono-literary text-xs text-stone-600 dark:text-stone-400">
                WORDS: 2,840 | CHARACTERS: 16,420 | READING TIME: 14 MIN | PAGES: 9
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 4. BRANDING TAB */}
      {activeTab === 'branding' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <Card className="space-y-8">
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">
                Brand Emblem Sizes (L + Open Book + Quill)
              </h3>
              <div className="flex flex-wrap items-center gap-6 p-6 bg-stone-50 dark:bg-stone-900/60 rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <LiteriaLogo size="xs" />
                  <span className="text-[10px] text-stone-400 font-mono">20px (xs)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LiteriaLogo size="sm" />
                  <span className="text-[10px] text-stone-400 font-mono">28px (sm)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LiteriaLogo size="md" />
                  <span className="text-[10px] text-stone-400 font-mono">36px (md)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LiteriaLogo size="lg" />
                  <span className="text-[10px] text-stone-400 font-mono">48px (lg)</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LiteriaLogo size="xl" />
                  <span className="text-[10px] text-stone-400 font-mono">64px (xl)</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-3">
                Wordmark Variations
              </h3>
              <div className="space-y-4 p-6 bg-stone-50 dark:bg-stone-900/60 rounded-xl">
                <LiteriaWordmark size="sm" showTagline={true} />
                <Divider />
                <LiteriaWordmark size="md" showTagline={true} />
                <Divider />
                <LiteriaWordmark size="lg" showTagline={true} secondaryTagline={true} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Interactive Modal Dialog */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Chapter Draft Options"
        description="Configure typography and local backup settings."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setModalOpen(false);
                toast.success('Preferences confirmed');
              }}
            >
              Apply Changes
            </Button>
          </>
        }
      >
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-serif">
          LITERIA modal dialogs feature calm frosted backdrop blurs, keyboard ESC dismissal, trap focus, and restrained literary framing.
        </p>
      </Modal>

      {/* Interactive Bottom Sheet */}
      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        title="Mobile Formatting Toolbar"
      >
        <div className="space-y-3 pb-4">
          <p className="text-xs text-stone-600 dark:text-stone-300">
            Bottom sheets provide ergonomic thumb reach on smartphones and folding devices.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setBottomSheetOpen(false);
                toast.success('Mobile action triggered');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
