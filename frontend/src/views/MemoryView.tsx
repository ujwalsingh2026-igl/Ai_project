import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Search,
  AlertTriangle,
  Lock,
  Sparkles,
  RefreshCw,
  FolderGit2,
  Sliders,
  ShieldAlert,
  Info,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { AssistantMemoryItem, MemoryCategory } from '../api/types';

const CATEGORIES: { id: MemoryCategory | 'all'; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'ALL MEMORIES', icon: Brain },
  { id: 'preference', label: 'PREFERENCES', icon: Sliders },
  { id: 'workflow', label: 'WORKFLOW', icon: FolderGit2 },
  { id: 'project', label: 'PROJECTS', icon: Sparkles },
  { id: 'security_policy', label: 'SECURITY POLICY', icon: ShieldAlert },
  { id: 'fact', label: 'FACTS', icon: Info },
];

export const MemoryView: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<AssistantMemoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Form states
  const [formKey, setFormKey] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('preference');

  // Fetch memories query
  const { data: memories = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['assistant-memories', selectedCategory, searchQuery],
    queryFn: () => api.getMemories(selectedCategory === 'all' ? undefined : selectedCategory, searchQuery || undefined),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { key: string; content: string; category: MemoryCategory }) =>
      api.createMemory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-memories'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; key: string; content: string; category: MemoryCategory }) =>
      api.updateMemory(data.id, { key: data.key, content: data.content, category: data.category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-memories'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteMemory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-memories'] });
      setDeletingId(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => api.clearMemories(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistant-memories'] });
      setIsClearModalOpen(false);
    },
  });

  const openAddModal = () => {
    setEditingMemory(null);
    setFormKey('');
    setFormContent('');
    setFormCategory('preference');
    setIsAddModalOpen(true);
  };

  const openEditModal = (mem: AssistantMemoryItem) => {
    setEditingMemory(mem);
    setFormKey(mem.key);
    setFormContent(mem.content);
    setFormCategory(mem.category);
    setIsAddModalOpen(true);
  };

  const closeModal = () => {
    setIsAddModalOpen(false);
    setEditingMemory(null);
    setFormKey('');
    setFormContent('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formContent.trim()) return;

    if (editingMemory) {
      updateMutation.mutate({
        id: editingMemory.id,
        key: formKey,
        content: formContent,
        category: formCategory,
      });
    } else {
      createMutation.mutate({
        key: formKey,
        content: formContent,
        category: formCategory,
      });
    }
  };

  // Metrics
  const totalCount = memories.length;
  const prefCount = memories.filter((m) => m.category === 'preference').length;
  const workflowCount = memories.filter((m) => m.category === 'workflow').length;
  const secPolicyCount = memories.filter((m) => m.category === 'security_policy').length;

  const getCategoryBadge = (cat: MemoryCategory) => {
    switch (cat) {
      case 'preference':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20';
      case 'workflow':
        return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
      case 'security_policy':
        return 'text-severity-med border-severity-med/30 bg-amber-950/20';
      case 'project':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
      case 'fact':
        return 'text-blue-400 border-blue-500/30 bg-blue-950/20';
      default:
        return 'text-cockpit-muted border-cockpit-border bg-cockpit-base';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-cockpit-base font-sans p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cockpit-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cockpit-accent" />
            <h1 className="font-mono text-base font-bold uppercase tracking-wider text-cockpit-text">
              ASSISTANT MEMORY & DEVELOPER CONTEXT
            </h1>
          </div>
          <p className="text-xs font-mono text-cockpit-muted mt-0.5">
            Transparent, user-controlled long-term memory injected into AI assistant prompts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-muted hover:text-cockpit-text hover:border-cockpit-accent transition-colors disabled:opacity-50"
            title="Refresh memory store"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            disabled={totalCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-severity-high hover:border-severity-high transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR ALL</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cockpit-accent text-cockpit-base font-mono text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-glow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>ADD MEMORY</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-3 font-mono">
          <div className="text-[11px] uppercase text-cockpit-muted">TOTAL MEMORIES</div>
          <div className="text-xl font-bold text-cockpit-text mt-1">{totalCount}</div>
          <div className="text-[10px] text-cockpit-muted mt-0.5">Active context items</div>
        </div>
        <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-3 font-mono">
          <div className="text-[11px] uppercase text-cyan-400">PREFERENCES</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{prefCount}</div>
          <div className="text-[10px] text-cockpit-muted mt-0.5">Themes, styling, tone</div>
        </div>
        <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-3 font-mono">
          <div className="text-[11px] uppercase text-purple-400">WORKFLOW RULES</div>
          <div className="text-xl font-bold text-purple-400 mt-1">{workflowCount}</div>
          <div className="text-[10px] text-cockpit-muted mt-0.5">Dev tools, commands</div>
        </div>
        <div className="rounded-lg border border-cockpit-border bg-cockpit-surface p-3 font-mono">
          <div className="text-[11px] uppercase text-severity-med">SECURITY POLICIES</div>
          <div className="text-xl font-bold text-severity-med mt-1">{secPolicyCount}</div>
          <div className="text-[10px] text-cockpit-muted mt-0.5">Subnets, boundaries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-cockpit-surface border border-cockpit-border">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  isSelected
                    ? 'bg-cockpit-accent text-cockpit-base font-bold shadow-sm'
                    : 'text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-base'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-cockpit-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search key or content..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-text placeholder:text-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
          />
        </div>
      </div>

      {/* Memory Items List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-cockpit-muted font-mono text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mb-2 text-cockpit-accent" />
          <span>LOADING MEMORY STORE...</span>
        </div>
      ) : memories.length === 0 ? (
        <div className="rounded-lg border border-cockpit-border/80 bg-cockpit-surface p-8 text-center font-mono space-y-3">
          <Brain className="w-10 h-10 text-cockpit-accent/60 mx-auto" />
          <h3 className="text-sm font-bold text-cockpit-text uppercase tracking-wider">
            NO MEMORIES STORED
          </h3>
          <p className="text-xs text-cockpit-muted max-w-md mx-auto">
            Assistant memory allows the AI to remember your setup, preferences, and developer context across sessions.
          </p>
          <div className="pt-2 flex flex-wrap gap-2 justify-center text-xs">
            <button
              type="button"
              onClick={openAddModal}
              className="px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-accent text-cockpit-text"
            >
              + Create First Memory
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className="rounded-lg border border-cockpit-border bg-cockpit-surface p-4 flex flex-col justify-between hover:border-cockpit-accent/60 transition-colors shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${getCategoryBadge(
                        mem.category
                      )}`}
                    >
                      {mem.category.toUpperCase().replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-cockpit-muted px-1.5 py-0.5 rounded bg-cockpit-base border border-cockpit-border">
                      {mem.source.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(mem)}
                      className="p-1.5 rounded hover:bg-cockpit-elevated text-cockpit-muted hover:text-cockpit-accent transition-colors"
                      title="Edit memory"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(mem.id)}
                      className="p-1.5 rounded hover:bg-cockpit-elevated text-cockpit-muted hover:text-severity-high transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-mono text-sm font-bold text-cockpit-text mb-2">
                  {mem.key}
                </h3>

                <p className="text-xs text-cockpit-muted font-mono whitespace-pre-wrap leading-relaxed bg-cockpit-base p-2.5 rounded border border-cockpit-border/60">
                  {mem.content}
                </p>
              </div>

              <div className="text-[10px] font-mono text-cockpit-muted/70 mt-3 pt-2 border-t border-cockpit-border/40 flex items-center justify-between">
                <span>ID: #{mem.id}</span>
                <span>Updated: {new Date(mem.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Privacy & Sovereignty Disclosure */}
      <div className="rounded-lg border border-cockpit-border/80 bg-cockpit-surface p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-severity-low shrink-0 mt-0.5" />
        <div className="text-xs font-mono space-y-1">
          <div className="text-cockpit-text font-bold uppercase tracking-wider">
            LOCAL DATA SOVEREIGNTY & TRANSPARENCY
          </div>
          <p className="text-cockpit-muted leading-relaxed font-sans">
            Every memory is stored strictly within your local database. Memories are injected only into your private local AI orchestrator prompts. You retain full authority to inspect, modify, or permanently purge any or all stored context at any time.
          </p>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-lg border border-cockpit-border bg-cockpit-surface p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cockpit-border pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-cockpit-accent" />
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-cockpit-text">
                  {editingMemory ? 'EDIT ASSISTANT MEMORY' : 'ADD NEW MEMORY / CONTEXT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded text-cockpit-muted hover:text-cockpit-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block uppercase text-cockpit-muted mb-1 text-[11px]">
                  Memory Key / Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="e.g. Preferred Language, Homelab Subnet, Terminal Theme"
                  className="w-full p-2 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text focus:outline-none focus:border-cockpit-accent"
                />
              </div>

              <div>
                <label className="block uppercase text-cockpit-muted mb-1 text-[11px]">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                  className="w-full p-2 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text focus:outline-none focus:border-cockpit-accent"
                >
                  <option value="preference">Preference (UI themes, language, tone)</option>
                  <option value="workflow">Workflow (developer habits, tools, git)</option>
                  <option value="project">Project (stack, architecture rules)</option>
                  <option value="security_policy">Security Policy (subnets, defensive boundaries)</option>
                  <option value="fact">Fact (general developer details)</option>
                </select>
              </div>

              <div>
                <label className="block uppercase text-cockpit-muted mb-1 text-[11px]">
                  Context / Fact Details
                </label>
                <textarea
                  required
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="e.g. Always generate TypeScript code without any types. Homelab router is 192.168.1.1."
                  className="w-full p-2 rounded bg-cockpit-base border border-cockpit-border text-cockpit-text focus:outline-none focus:border-cockpit-accent font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-cockpit-border">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-1.5 rounded bg-cockpit-accent text-cockpit-base font-bold uppercase tracking-wider hover:brightness-110 shadow-glow disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'SAVING...' : 'SAVE MEMORY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-cockpit-border bg-cockpit-surface p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-2 text-severity-high">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wider text-sm">
                CONFIRM MEMORY DELETION
              </h3>
            </div>
            <p className="text-cockpit-muted leading-relaxed font-sans">
              Are you sure you want to permanently delete this memory item? The assistant will no longer take this context into account.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cockpit-border">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
              >
                CANCEL
              </button>
              <button
                type="button"
                data-testid="confirm-delete-memory"
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 rounded bg-severity-high text-cockpit-base font-bold uppercase hover:brightness-110 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'DELETING...' : 'DELETE MEMORY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-severity-high bg-cockpit-surface p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-2 text-severity-high">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold uppercase tracking-wider text-sm">
                PURGE ALL ASSISTANT MEMORIES
              </h3>
            </div>
            <p className="text-cockpit-muted leading-relaxed font-sans">
              This action will permanently delete all {totalCount} stored memories and reset your assistant context to factory defaults. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cockpit-border">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-muted hover:text-cockpit-text"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => clearMutation.mutate()}
                disabled={clearMutation.isPending}
                className="px-4 py-1.5 rounded bg-severity-high text-cockpit-base font-bold uppercase hover:brightness-110 disabled:opacity-50"
              >
                {clearMutation.isPending ? 'CLEARING...' : 'PURGE ALL MEMORIES'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
