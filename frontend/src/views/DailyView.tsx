import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  CheckSquare,
  Clock,
  FileText,
  Timer,
  Download,
  Trash2,
  Plus,
  Terminal,
  Shield,
  Code2,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api } from '../api/client';
import { NoteItem } from '../api/types';
import { FocusTimer } from '../components/FocusTimer';
import { Markdown } from '../components/Markdown';

type DailyTab = 'brief' | 'tasks' | 'reminders' | 'notes' | 'focus';

export const DailyView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DailyTab>('brief');
  const [copiedTip, setCopiedTip] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  // ---- Tasks State ----
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // ---- Reminders State ----
  const [newReminderMsg, setNewReminderMsg] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  // ---- Notes State ----
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteEditTitle, setNoteEditTitle] = useState('');
  const [noteEditContent, setNoteEditContent] = useState('');
  const [notePreviewMode, setNotePreviewMode] = useState<'edit' | 'preview' | 'split'>('split');

  // ===================== Queries =====================

  const { data: brief, isLoading: briefLoading, refetch: refetchBrief } = useQuery({
    queryKey: ['daily-brief'],
    queryFn: () => api.getDailyBrief(),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['planner-tasks', taskFilter],
    queryFn: () => api.getTasks(taskFilter === 'all' ? undefined : taskFilter),
  });

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['planner-reminders'],
    queryFn: () => api.getReminders(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['planner-notes', noteSearch],
    queryFn: () => api.getNotes(noteSearch || undefined),
  });

  // ===================== Task Mutations =====================

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; priority: 'low' | 'medium' | 'high'; due_date?: string | null; tags: string[] }) =>
      api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
      setNewTaskTitle('');
      setNewTaskDue('');
      setNewTaskTags('');
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'pending' | 'completed' }) =>
      api.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => api.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
    },
  });

  // ===================== Reminder Mutations =====================

  const createReminderMutation = useMutation({
    mutationFn: (data: { time: string; message: string }) => api.createReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
      setNewReminderMsg('');
      setNewReminderTime('');
    },
  });

  const toggleReminderMutation = useMutation({
    mutationFn: ({ id, delivered }: { id: number; delivered: boolean }) =>
      api.updateReminder(id, { delivered }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id: number) => api.deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
    },
  });

  // ===================== Notes Mutations =====================

  const saveNoteMutation = useMutation({
    mutationFn: async (data: { id?: number; title: string; content: string }) => {
      if (data.id) {
        return api.updateNote(data.id, { title: data.title, content: data.content });
      }
      return api.createNote({ title: data.title, content: data.content });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['planner-notes'] });
      setSelectedNote(saved);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: number) => api.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-notes'] });
      setSelectedNote(null);
      setNoteEditTitle('');
      setNoteEditContent('');
    },
  });

  // ===================== Export & Clear =====================

  const handleExport = async () => {
    try {
      const data = await api.exportPlannerData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis_planner_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export planner data.');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearPlannerData();
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-reminders'] });
      queryClient.invalidateQueries({ queryKey: ['planner-notes'] });
      queryClient.invalidateQueries({ queryKey: ['daily-brief'] });
      setSelectedNote(null);
      setClearModalOpen(false);
    } catch {
      alert('Failed to clear planner data.');
    }
  };

  const copyShortcutToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTip(true);
    setTimeout(() => setCopiedTip(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cockpit-base overflow-hidden font-sans">
      {/* Top Cockpit Header */}
      <header className="h-14 border-b border-cockpit-border px-6 flex items-center justify-between bg-cockpit-surface/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/30 text-cockpit-accent">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-xs font-bold tracking-wider text-cockpit-text">
              DAILY ASSISTANT // COCKPIT
            </h2>
            <div className="text-[10px] font-mono text-cockpit-muted uppercase">
              AGENDA, FOCUS & LOCAL KNOWLEDGE
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-accent text-cockpit-muted hover:text-cockpit-accent transition-colors"
            title="Download full JSON export of your local planner data"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setClearModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border hover:border-severity-high/60 text-cockpit-muted hover:text-severity-high transition-colors"
            title="Wipe local planner data"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR ALL</span>
          </button>
        </div>
      </header>

      {/* Cockpit Sub-Tab Navigation Bar */}
      <div className="border-b border-cockpit-border bg-cockpit-surface/40 px-6 py-2 flex items-center gap-2 font-mono text-xs shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('brief')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'brief'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>DAILY BRIEF</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'tasks'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>TASKS ({tasks.filter((t) => t.status === 'pending').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'reminders'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>REMINDERS ({reminders.filter((r) => !r.delivered).length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'notes'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>NOTES ({notes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('focus')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
            activeTab === 'focus'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-transparent text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>FOCUS TIMER</span>
        </button>
      </div>

      {/* Main Tab Stage */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ======================= TAB: DAILY BRIEF ======================= */}
        {activeTab === 'brief' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Top Telemetry Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-cockpit-surface border border-cockpit-border rounded p-4 font-mono">
                <div className="text-[11px] text-cockpit-muted uppercase mb-1">DATE // SYSTEM</div>
                <div className="text-base font-bold text-cockpit-text">{brief?.date || 'TODAY'}</div>
                <div className="text-[11px] text-cockpit-accent mt-1 flex items-center gap-1">
                  <span>{brief?.system_status.os || 'Local System'}</span>
                </div>
              </div>

              <div className="bg-cockpit-surface border border-cockpit-border rounded p-4 font-mono">
                <div className="text-[11px] text-cockpit-muted uppercase mb-1">DEFENSIVE POSTURE</div>
                <div className="text-base font-bold text-severity-low flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>{brief?.security_alerts.status.toUpperCase() || 'NOMINAL'}</span>
                </div>
                <div className="text-[11px] text-cockpit-muted mt-1">0 active security alerts</div>
              </div>

              <div className="bg-cockpit-surface border border-cockpit-border rounded p-4 font-mono">
                <div className="text-[11px] text-cockpit-muted uppercase mb-1">PENDING TASKS</div>
                <div className="text-2xl font-bold text-cockpit-accent">
                  {brief?.tasks_summary.pending ?? 0}
                </div>
                <div className="text-[11px] text-cockpit-muted mt-1">
                  {brief?.tasks_summary.overdue ?? 0} overdue
                </div>
              </div>

              <div className="bg-cockpit-surface border border-cockpit-border rounded p-4 font-mono">
                <div className="text-[11px] text-cockpit-muted uppercase mb-1">ACTIVE REMINDERS</div>
                <div className="text-2xl font-bold text-severity-med">
                  {brief?.upcoming_reminders.length ?? 0}
                </div>
                <div className="text-[11px] text-cockpit-muted mt-1">Awaiting delivery</div>
              </div>
            </div>

            {/* Learn Something Small Section (Cockpit card) */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4 border-b border-cockpit-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-cockpit-accent/10 text-cockpit-accent border border-cockpit-accent/30">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-xs font-bold text-cockpit-text uppercase tracking-wider">
                      LEARN SOMETHING SMALL // DAILY ROTATION
                    </h3>
                    <p className="text-[11px] text-cockpit-muted">
                      Local engineering tips rotated daily based on day of year.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => refetchBrief()}
                  className="p-1.5 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-accent text-cockpit-muted hover:text-cockpit-accent transition-colors"
                  title="Refresh brief data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${briefLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Terminal Shortcut */}
                <div className="bg-cockpit-base/60 border border-cockpit-border rounded p-3 font-mono">
                  <div className="flex items-center justify-between text-xs text-cockpit-accent font-bold mb-2">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>TERMINAL SHORTCUT</span>
                    </span>
                    {brief?.learning_tips?.terminal_shortcut?.command && (
                      <button
                        type="button"
                        onClick={() =>
                          copyShortcutToClipboard(brief.learning_tips.terminal_shortcut.command)
                        }
                        className="text-cockpit-muted hover:text-cockpit-text p-1"
                        title="Copy command"
                      >
                        {copiedTip ? (
                          <Check className="w-3 h-3 text-severity-low" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="text-xs font-bold text-cockpit-text bg-cockpit-elevated/60 px-2 py-1 rounded border border-cockpit-border/50 inline-block mb-1.5">
                    {brief?.learning_tips?.terminal_shortcut?.command || 'Ctrl + R'}
                  </div>
                  <p className="text-[11px] text-cockpit-muted font-sans leading-relaxed">
                    {brief?.learning_tips?.terminal_shortcut?.description ||
                      'Reverse incremental search in shell history.'}
                  </p>
                </div>

                {/* Security Tip */}
                <div className="bg-cockpit-base/60 border border-cockpit-border rounded p-3 font-mono">
                  <div className="text-xs text-severity-med font-bold mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>SECURITY HYGIENE</span>
                  </div>
                  <div className="text-xs font-bold text-cockpit-text mb-1">
                    {brief?.learning_tips?.security_tip?.title || 'Least Privilege'}
                  </div>
                  <p className="text-[11px] text-cockpit-muted font-sans leading-relaxed">
                    {brief?.learning_tips?.security_tip?.tip ||
                      'Avoid running regular web browsers or IDEs with Administrator privileges.'}
                  </p>
                </div>

                {/* Python Tip */}
                <div className="bg-cockpit-base/60 border border-cockpit-border rounded p-3 font-mono">
                  <div className="text-xs text-cockpit-accent font-bold mb-2 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>PYTHON IDIOM</span>
                  </div>
                  <div className="text-xs font-bold text-cockpit-text mb-1">
                    {brief?.learning_tips?.python_tip?.title || 'dict.get with default'}
                  </div>
                  <p className="text-[11px] text-cockpit-muted font-sans leading-relaxed">
                    {brief?.learning_tips?.python_tip?.tip ||
                      'Use dict.get(key, default) to safely look up keys without raising KeyError.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Agenda Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-cockpit-surface border border-cockpit-border rounded p-4">
                <div className="flex items-center justify-between mb-3 border-b border-cockpit-border pb-2 font-mono text-xs">
                  <span className="font-bold text-cockpit-text">TODAY'S TASKS</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tasks')}
                    className="text-cockpit-accent hover:underline text-[11px]"
                  >
                    MANAGE TASKS ({tasks.length})
                  </button>
                </div>
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded bg-cockpit-base/40 border border-cockpit-border/50 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleTaskMutation.mutate({
                              id: t.id,
                              status: t.status === 'completed' ? 'pending' : 'completed',
                            })
                          }
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            t.status === 'completed'
                              ? 'bg-cockpit-accent border-cockpit-accent text-cockpit-base'
                              : 'border-cockpit-muted'
                          }`}
                        >
                          {t.status === 'completed' && <Check className="w-2.5 h-2.5" />}
                        </button>
                        <span
                          className={
                            t.status === 'completed' ? 'line-through text-cockpit-muted' : 'text-cockpit-text'
                          }
                        >
                          {t.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          t.priority === 'high'
                            ? 'border-severity-high/40 text-severity-high bg-severity-high/10'
                            : t.priority === 'medium'
                            ? 'border-severity-med/40 text-severity-med bg-severity-med/10'
                            : 'border-cockpit-border text-cockpit-muted'
                        }`}
                      >
                        {t.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-6 text-xs text-cockpit-muted font-mono">
                      No tasks scheduled. Relax or add a task!
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-cockpit-surface border border-cockpit-border rounded p-4">
                <div className="flex items-center justify-between mb-3 border-b border-cockpit-border pb-2 font-mono text-xs">
                  <span className="font-bold text-cockpit-text">UPCOMING REMINDERS</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reminders')}
                    className="text-cockpit-accent hover:underline text-[11px]"
                  >
                    MANAGE REMINDERS ({reminders.length})
                  </button>
                </div>
                <div className="space-y-2">
                  {reminders.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-2 rounded bg-cockpit-base/40 border border-cockpit-border/50 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cockpit-accent shrink-0" />
                        <span className={r.delivered ? 'line-through text-cockpit-muted' : 'text-cockpit-text'}>
                          {r.message}
                        </span>
                      </div>
                      <span className="text-[10px] text-cockpit-muted">
                        {new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {reminders.length === 0 && (
                    <div className="text-center py-6 text-xs text-cockpit-muted font-mono">
                      No upcoming reminders scheduled.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: TASKS ======================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Quick Add Task Form */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-4 font-mono">
              <div className="text-xs font-bold text-cockpit-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cockpit-accent" />
                <span>ADD NEW TASK</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTaskTitle.trim()) return;
                  createTaskMutation.mutate({
                    title: newTaskTitle.trim(),
                    priority: newTaskPriority,
                    due_date: newTaskDue || null,
                    tags: newTaskTags
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  });
                }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Task title (e.g. Audit SSH hostkeys, Update venv dependencies...)"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 bg-cockpit-base border border-cockpit-border rounded px-3 py-2 text-xs text-cockpit-text placeholder-cockpit-muted outline-none focus:border-cockpit-accent"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                    className="px-4 py-2 bg-cockpit-accent text-cockpit-base font-bold text-xs rounded hover:bg-cockpit-accent/90 disabled:opacity-50 transition-colors uppercase tracking-wider"
                  >
                    ADD TASK
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-cockpit-muted">PRIORITY:</span>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="bg-cockpit-base border border-cockpit-border rounded px-2 py-1 text-xs text-cockpit-text outline-none"
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-cockpit-muted">DUE:</span>
                    <input
                      type="datetime-local"
                      value={newTaskDue}
                      onChange={(e) => setNewTaskDue(e.target.value)}
                      className="bg-cockpit-base border border-cockpit-border rounded px-2 py-1 text-xs text-cockpit-text outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-[11px] text-cockpit-muted">TAGS:</span>
                    <input
                      type="text"
                      placeholder="e.g. dev, security"
                      value={newTaskTags}
                      onChange={(e) => setNewTaskTags(e.target.value)}
                      className="flex-1 bg-cockpit-base border border-cockpit-border rounded px-2 py-1 text-xs text-cockpit-text outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-cockpit-muted">FILTER:</span>
                {(['all', 'pending', 'completed'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTaskFilter(filter)}
                    className={`px-2.5 py-1 rounded border uppercase text-[11px] ${
                      taskFilter === filter
                        ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
                        : 'border-cockpit-border text-cockpit-muted hover:text-cockpit-text'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-cockpit-muted">{tasks.length} total tasks</span>
            </div>

            {/* Tasks List */}
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border transition-colors flex items-center justify-between font-mono text-xs ${
                    task.status === 'completed'
                      ? 'bg-cockpit-base/30 border-cockpit-border/40 opacity-70'
                      : 'bg-cockpit-surface border-cockpit-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        toggleTaskMutation.mutate({
                          id: task.id,
                          status: task.status === 'completed' ? 'pending' : 'completed',
                        })
                      }
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        task.status === 'completed'
                          ? 'bg-cockpit-accent border-cockpit-accent text-cockpit-base'
                          : 'border-cockpit-muted hover:border-cockpit-accent'
                      }`}
                    >
                      {task.status === 'completed' && <Check className="w-3 h-3" />}
                    </button>

                    <div>
                      <div
                        className={`text-xs ${
                          task.status === 'completed'
                            ? 'line-through text-cockpit-muted'
                            : 'text-cockpit-text font-semibold'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className="text-[10px] text-cockpit-muted flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </span>
                        )}
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {task.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1 py-0.2 rounded bg-cockpit-elevated border border-cockpit-border text-[9px] text-cockpit-muted"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${
                        task.priority === 'high'
                          ? 'border-severity-high/40 text-severity-high bg-severity-high/10'
                          : task.priority === 'medium'
                          ? 'border-severity-med/40 text-severity-med bg-severity-med/10'
                          : 'border-cockpit-border text-cockpit-muted'
                      }`}
                    >
                      {task.priority}
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteTaskMutation.mutate(task.id)}
                      className="p-1.5 rounded hover:bg-cockpit-elevated text-cockpit-muted hover:text-severity-high transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && !tasksLoading && (
                <div className="text-center py-12 border border-dashed border-cockpit-border rounded font-mono text-xs text-cockpit-muted">
                  No tasks matching the selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB: REMINDERS ======================= */}
        {activeTab === 'reminders' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Add Reminder Form */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-4 font-mono">
              <div className="text-xs font-bold text-cockpit-text uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cockpit-accent" />
                <span>SCHEDULE REMINDER</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newReminderMsg.trim() || !newReminderTime) return;
                  createReminderMutation.mutate({
                    message: newReminderMsg.trim(),
                    time: new Date(newReminderTime).toISOString(),
                  });
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Reminder message (e.g. Check Wi-Fi DHCP leases...)"
                  value={newReminderMsg}
                  onChange={(e) => setNewReminderMsg(e.target.value)}
                  className="flex-1 bg-cockpit-base border border-cockpit-border rounded px-3 py-2 text-xs text-cockpit-text placeholder-cockpit-muted outline-none focus:border-cockpit-accent"
                />
                <input
                  type="datetime-local"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  className="bg-cockpit-base border border-cockpit-border rounded px-2 py-2 text-xs text-cockpit-text outline-none"
                />
                <button
                  type="submit"
                  disabled={!newReminderMsg.trim() || !newReminderTime || createReminderMutation.isPending}
                  className="px-4 py-2 bg-cockpit-accent text-cockpit-base font-bold text-xs rounded hover:bg-cockpit-accent/90 disabled:opacity-50 transition-colors uppercase tracking-wider"
                >
                  SET REMINDER
                </button>
              </form>
            </div>

            {/* Reminders List */}
            <div className="space-y-2 font-mono text-xs">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    rem.delivered
                      ? 'bg-cockpit-base/30 border-cockpit-border/40 opacity-70'
                      : 'bg-cockpit-surface border-cockpit-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        toggleReminderMutation.mutate({ id: rem.id, delivered: !rem.delivered })
                      }
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        rem.delivered
                          ? 'bg-cockpit-accent border-cockpit-accent text-cockpit-base'
                          : 'border-cockpit-muted hover:border-cockpit-accent'
                      }`}
                    >
                      {rem.delivered && <Check className="w-3 h-3" />}
                    </button>
                    <div>
                      <div className={rem.delivered ? 'line-through text-cockpit-muted' : 'text-cockpit-text'}>
                        {rem.message}
                      </div>
                      <div className="text-[10px] text-cockpit-muted mt-0.5">
                        Scheduled: {new Date(rem.time).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                        rem.delivered
                          ? 'border-cockpit-border text-cockpit-muted'
                          : 'border-severity-med/40 text-severity-med bg-severity-med/10'
                      }`}
                    >
                      {rem.delivered ? 'DELIVERED' : 'PENDING'}
                    </span>

                    <button
                      type="button"
                      onClick={() => deleteReminderMutation.mutate(rem.id)}
                      className="p-1.5 rounded hover:bg-cockpit-elevated text-cockpit-muted hover:text-severity-high transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {reminders.length === 0 && !remindersLoading && (
                <div className="text-center py-12 border border-dashed border-cockpit-border rounded font-mono text-xs text-cockpit-muted">
                  No reminders currently scheduled.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB: NOTES ======================= */}
        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-170px)]">
            {/* Left Column: Notes List */}
            <div className="bg-cockpit-surface border border-cockpit-border rounded-lg flex flex-col overflow-hidden">
              <div className="p-3 border-b border-cockpit-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cockpit-text">LOCAL NOTES</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNote(null);
                      setNoteEditTitle('New Note');
                      setNoteEditContent('');
                    }}
                    className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-cockpit-accent text-cockpit-base font-bold hover:bg-cockpit-accent/90"
                  >
                    <Plus className="w-3 h-3" />
                    <span>NEW NOTE</span>
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-cockpit-muted" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs font-mono text-cockpit-text placeholder-cockpit-muted outline-none focus:border-cockpit-accent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono">
                {notes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedNote(n);
                      setNoteEditTitle(n.title);
                      setNoteEditContent(n.content);
                    }}
                    className={`w-full text-left p-2.5 rounded text-xs transition-colors border ${
                      selectedNote?.id === n.id
                        ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
                        : 'border-transparent text-cockpit-text hover:bg-cockpit-elevated/40'
                    }`}
                  >
                    <div className="truncate">{n.title}</div>
                    <div className="text-[10px] text-cockpit-muted mt-0.5 truncate font-sans">
                      {n.content ? n.content.slice(0, 60) : 'Empty note'}
                    </div>
                  </button>
                ))}

                {notes.length === 0 && (
                  <div className="text-center py-10 text-xs text-cockpit-muted font-mono">
                    No notes found.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Note Editor & Markdown Preview */}
            <div className="md:col-span-2 bg-cockpit-surface border border-cockpit-border rounded-lg flex flex-col overflow-hidden">
              {/* Note Editor Header */}
              <div className="p-3 border-b border-cockpit-border flex items-center justify-between font-mono">
                <input
                  type="text"
                  value={noteEditTitle}
                  onChange={(e) => setNoteEditTitle(e.target.value)}
                  placeholder="Note Title"
                  className="bg-transparent font-bold text-sm text-cockpit-text outline-none flex-1"
                />

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-cockpit-border rounded text-[11px] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setNotePreviewMode('edit')}
                      className={`px-2 py-1 ${
                        notePreviewMode === 'edit'
                          ? 'bg-cockpit-accent text-cockpit-base font-bold'
                          : 'text-cockpit-muted hover:text-cockpit-text'
                      }`}
                    >
                      EDIT
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotePreviewMode('split')}
                      className={`px-2 py-1 ${
                        notePreviewMode === 'split'
                          ? 'bg-cockpit-accent text-cockpit-base font-bold'
                          : 'text-cockpit-muted hover:text-cockpit-text'
                      }`}
                    >
                      SPLIT
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotePreviewMode('preview')}
                      className={`px-2 py-1 ${
                        notePreviewMode === 'preview'
                          ? 'bg-cockpit-accent text-cockpit-base font-bold'
                          : 'text-cockpit-muted hover:text-cockpit-text'
                      }`}
                    >
                      PREVIEW
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      saveNoteMutation.mutate({
                        id: selectedNote?.id,
                        title: noteEditTitle || 'Untitled Note',
                        content: noteEditContent,
                      })
                    }
                    disabled={saveNoteMutation.isPending}
                    className="px-3 py-1 bg-cockpit-accent text-cockpit-base font-bold text-xs rounded hover:bg-cockpit-accent/90 transition-colors uppercase tracking-wider"
                  >
                    SAVE NOTE
                  </button>

                  {selectedNote && (
                    <button
                      type="button"
                      onClick={() => deleteNoteMutation.mutate(selectedNote.id)}
                      className="p-1 rounded text-cockpit-muted hover:text-severity-high"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Note Editor Body */}
              <div className="flex-1 flex overflow-hidden">
                {(notePreviewMode === 'edit' || notePreviewMode === 'split') && (
                  <textarea
                    value={noteEditContent}
                    onChange={(e) => setNoteEditContent(e.target.value)}
                    placeholder="Write markdown here... Support headers, code blocks, lists."
                    className={`p-4 bg-cockpit-base text-xs font-mono text-cockpit-text outline-none resize-none ${
                      notePreviewMode === 'split' ? 'w-1/2 border-r border-cockpit-border' : 'w-full'
                    }`}
                  />
                )}

                {(notePreviewMode === 'preview' || notePreviewMode === 'split') && (
                  <div
                    className={`p-4 overflow-y-auto bg-cockpit-surface ${
                      notePreviewMode === 'split' ? 'w-1/2' : 'w-full'
                    }`}
                  >
                    {noteEditContent ? (
                      <Markdown content={noteEditContent} />
                    ) : (
                      <div className="text-xs font-mono text-cockpit-muted italic">
                        Markdown preview will render here.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: FOCUS TIMER ======================= */}
        {activeTab === 'focus' && (
          <div className="max-w-xl mx-auto py-6">
            <FocusTimer />
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clear All */}
      {clearModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-cockpit-base/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-mono"
        >
          <div className="bg-cockpit-surface border border-severity-high/50 rounded-lg p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-severity-high">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">CONFIRM CLEAR PLANNER DATA</h3>
            </div>
            <p className="text-xs text-cockpit-text font-sans leading-relaxed">
              This action will permanently delete all your local tasks, reminders, and notes from
              SQLite. This operation cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="px-3 py-1.5 rounded bg-cockpit-elevated border border-cockpit-border text-xs text-cockpit-muted hover:text-cockpit-text"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-4 py-1.5 rounded bg-severity-high text-cockpit-base text-xs font-bold hover:bg-severity-high/90"
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
