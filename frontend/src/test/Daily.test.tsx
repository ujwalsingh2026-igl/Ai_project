import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FocusTimer } from '../components/FocusTimer';
import { DailyView } from '../views/DailyView';
import { api } from '../api/client';
import { DailyBriefData, TaskItem, ReminderItem, NoteItem } from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    getDailyBrief: vi.fn(),
    getTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getReminders: vi.fn(),
    createReminder: vi.fn(),
    updateReminder: vi.fn(),
    deleteReminder: vi.fn(),
    getNotes: vi.fn(),
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    exportPlannerData: vi.fn(),
    clearPlannerData: vi.fn(),
  },
}));

const mockBrief: DailyBriefData = {
  date: '2026-10-02',
  tasks_summary: { total: 3, pending: 2, completed: 1, overdue: 0 },
  today_tasks: [
    {
      id: 1,
      title: 'Audit Open Ports',
      priority: 'high',
      status: 'pending',
      tags: ['security'],
      created_at: '2026-10-02T10:00:00Z',
      updated_at: '2026-10-02T10:00:00Z',
    },
  ],
  upcoming_reminders: [
    {
      id: 1,
      time: '2026-10-02T14:00:00Z',
      message: 'Review DHCP leases',
      delivered: false,
      created_at: '2026-10-02T10:00:00Z',
    },
  ],
  security_alerts: {
    open_count: 0,
    status: 'nominal',
    message: 'Defensive posture normal.',
  },
  system_status: {
    os: 'Windows 11',
    cpu_usage: 12.5,
    ram_usage: 45.0,
    status: 'healthy',
  },
  learning_tips: {
    terminal_shortcut: { command: 'Ctrl + R', description: 'Reverse incremental search.' },
    security_tip: { title: 'Least Privilege', tip: 'Never run web browser as admin.' },
    python_tip: { title: 'dict.get', tip: 'Safely fetch keys with fallback.' },
  },
};

const mockTasks: TaskItem[] = [
  {
    id: 1,
    title: 'Audit Open Ports',
    priority: 'high',
    status: 'pending',
    tags: ['security'],
    created_at: '2026-10-02T10:00:00Z',
    updated_at: '2026-10-02T10:00:00Z',
  },
  {
    id: 2,
    title: 'Write Unit Tests',
    priority: 'medium',
    status: 'completed',
    tags: ['dev'],
    created_at: '2026-10-02T10:00:00Z',
    updated_at: '2026-10-02T10:00:00Z',
  },
];

const mockReminders: ReminderItem[] = [
  {
    id: 1,
    time: '2026-10-02T14:00:00Z',
    message: 'Review DHCP leases',
    delivered: false,
    created_at: '2026-10-02T10:00:00Z',
  },
];

const mockNotes: NoteItem[] = [
  {
    id: 1,
    title: 'Firewall Notes',
    content: '# Defensive Rules\nDeny all incoming on WAN.',
    created_at: '2026-10-02T10:00:00Z',
    updated_at: '2026-10-02T10:00:00Z',
  },
];

describe('FocusTimer Component', () => {
  it('renders default 25:00 work interval and switches modes', () => {
    render(<FocusTimer />);
    const display = screen.getByTestId('timer-display');
    expect(display).toHaveTextContent('25:00');

    // Switch to Short Break (5m)
    fireEvent.click(screen.getByText('SHORT (5m)'));
    expect(display).toHaveTextContent('05:00');

    // Switch to Long Break (15m)
    fireEvent.click(screen.getByText('LONG (15m)'));
    expect(display).toHaveTextContent('15:00');
  });

  it('toggles start and pause controls', () => {
    render(<FocusTimer />);
    const startButton = screen.getByRole('button', { name: /start timer/i });
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);
    expect(screen.getByRole('button', { name: /pause timer/i })).toBeInTheDocument();

    const resetButton = screen.getByRole('button', { name: /reset timer/i });
    fireEvent.click(resetButton);
    expect(screen.getByRole('button', { name: /start timer/i })).toBeInTheDocument();
  });

  it('triggers test chime without error', () => {
    render(<FocusTimer />);
    const testChimeBtn = screen.getByRole('button', { name: /test chime/i });
    expect(testChimeBtn).toBeInTheDocument();
    expect(() => fireEvent.click(testChimeBtn)).not.toThrow();
  });
});

describe('DailyView Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.getDailyBrief).mockResolvedValue(mockBrief);
    vi.mocked(api.getTasks).mockResolvedValue(mockTasks);
    vi.mocked(api.getReminders).mockResolvedValue(mockReminders);
    vi.mocked(api.getNotes).mockResolvedValue(mockNotes);
  });

  it('renders daily brief with learning tips and telemetry', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DailyView />
      </QueryClientProvider>
    );

    // Header check
    expect(screen.getByText(/DAILY ASSISTANT \/\/ COCKPIT/i)).toBeInTheDocument();

    // Telemetry and tips
    await waitFor(() => {
      expect(screen.getByText('Ctrl + R')).toBeInTheDocument();
      expect(screen.getByText('Least Privilege')).toBeInTheDocument();
      expect(screen.getByText('dict.get')).toBeInTheDocument();
    });
  });

  it('navigates across tabs (Tasks, Reminders, Notes, Focus Timer)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DailyView />
      </QueryClientProvider>
    );

    // Switch to Tasks tab
    const tasksTab = screen.getByRole('button', { name: /^tasks/i });
    fireEvent.click(tasksTab);

    await waitFor(() => {
      expect(screen.getByText('Audit Open Ports')).toBeInTheDocument();
      expect(screen.getByText('Write Unit Tests')).toBeInTheDocument();
    });

    // Switch to Reminders tab
    const remindersTab = screen.getByRole('button', { name: /^reminders/i });
    fireEvent.click(remindersTab);

    await waitFor(() => {
      expect(screen.getByText('Review DHCP leases')).toBeInTheDocument();
    });

    // Switch to Notes tab
    const notesTab = screen.getByRole('button', { name: /^notes/i });
    fireEvent.click(notesTab);

    await waitFor(() => {
      expect(screen.getByText('Firewall Notes')).toBeInTheDocument();
    });

    // Switch to Focus tab
    const focusTab = screen.getByRole('button', { name: /focus timer/i });
    fireEvent.click(focusTab);

    expect(screen.getByTestId('timer-display')).toHaveTextContent('25:00');
  });

  it('triggers JSON export on Export button click', async () => {
    vi.mocked(api.exportPlannerData).mockResolvedValue({
      exported_at: '2026-10-02T10:00:00Z',
      user_id: '1',
      tasks: mockTasks,
      reminders: mockReminders,
      notes: mockNotes,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <DailyView />
      </QueryClientProvider>
    );

    const exportBtn = screen.getByRole('button', { name: /export json/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(api.exportPlannerData).toHaveBeenCalledTimes(1);
    });
  });
});
