import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryView } from '../views/MemoryView';
import { api } from '../api/client';
import { AssistantMemoryItem } from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    getMemories: vi.fn(),
    createMemory: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
    clearMemories: vi.fn(),
  },
}));

const mockMemories: AssistantMemoryItem[] = [
  {
    id: 1,
    key: 'Preferred Language',
    content: 'Always write concise Python 3.14 code with docstrings',
    category: 'preference',
    source: 'explicit',
    created_at: '2026-10-03T10:00:00Z',
    updated_at: '2026-10-03T10:00:00Z',
  },
  {
    id: 2,
    key: 'Homelab Subnet',
    content: 'Subnet 192.168.1.0/24 is confirmed owned by operator',
    category: 'security_policy',
    source: 'chat',
    created_at: '2026-10-03T11:00:00Z',
    updated_at: '2026-10-03T11:00:00Z',
  },
  {
    id: 3,
    key: 'Build Tooling',
    content: 'Uses Vite and Vitest with React 19',
    category: 'workflow',
    source: 'explicit',
    created_at: '2026-10-03T12:00:00Z',
    updated_at: '2026-10-03T12:00:00Z',
  },
];

describe('Assistant Memory View', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryView />
      </QueryClientProvider>
    );

  it('renders memory cockpit header, metrics, and memory cards', async () => {
    vi.mocked(api.getMemories).mockResolvedValue(mockMemories);

    renderComponent();

    expect(screen.getByText(/ASSISTANT MEMORY & DEVELOPER CONTEXT/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Preferred Language')).toBeInTheDocument();
      expect(screen.getByText('Homelab Subnet')).toBeInTheDocument();
      expect(screen.getByText('Build Tooling')).toBeInTheDocument();
    });

    // Check category badges
    expect(screen.getAllByText('PREFERENCE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SECURITY POLICY').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('WORKFLOW').length).toBeGreaterThanOrEqual(1);

    // Check metrics row
    expect(screen.getByText('TOTAL MEMORIES')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('filters memories by category when category pill is selected', async () => {
    vi.mocked(api.getMemories).mockResolvedValue(mockMemories);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Preferred Language')).toBeInTheDocument();
    });

    const prefButton = screen.getByRole('button', { name: /PREFERENCES/i });
    fireEvent.click(prefButton);

    await waitFor(() => {
      expect(api.getMemories).toHaveBeenCalledWith('preference', undefined);
    });
  });

  it('opens Add Memory modal and creates a new memory item', async () => {
    vi.mocked(api.getMemories).mockResolvedValue(mockMemories);
    vi.mocked(api.createMemory).mockResolvedValue({
      id: 4,
      key: 'Neovim Config',
      content: 'Uses lua config with LSP',
      category: 'workflow',
      source: 'explicit',
      created_at: '2026-10-03T13:00:00Z',
      updated_at: '2026-10-03T13:00:00Z',
    });

    renderComponent();

    const addBtn = screen.getByRole('button', { name: /ADD MEMORY/i });
    fireEvent.click(addBtn);

    expect(screen.getByText(/ADD NEW MEMORY \/ CONTEXT/i)).toBeInTheDocument();

    const keyInput = screen.getByPlaceholderText(/e\.g\. Preferred Language/i);
    const contentInput = screen.getByPlaceholderText(/e\.g\. Always generate TypeScript/i);

    fireEvent.change(keyInput, { target: { value: 'Neovim Config' } });
    fireEvent.change(contentInput, { target: { value: 'Uses lua config with LSP' } });

    const saveBtn = screen.getByRole('button', { name: /SAVE MEMORY/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.createMemory).toHaveBeenCalledWith({
        key: 'Neovim Config',
        content: 'Uses lua config with LSP',
        category: 'preference',
      });
    });
  });

  it('deletes an existing memory after user confirmation', async () => {
    vi.mocked(api.getMemories).mockResolvedValue(mockMemories);
    vi.mocked(api.deleteMemory).mockResolvedValue({ status: 'deleted', id: 1 });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Preferred Language')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle('Delete memory');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText(/CONFIRM MEMORY DELETION/i)).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByTestId('confirm-delete-memory');
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(api.deleteMemory).toHaveBeenCalledWith(1);
    });
  });

  it('renders transparent data sovereignty and local privacy disclosure', async () => {
    vi.mocked(api.getMemories).mockResolvedValue([]);

    renderComponent();

    expect(screen.getByText(/LOCAL DATA SOVEREIGNTY & TRANSPARENCY/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Every memory is stored strictly within your local database/i)
    ).toBeInTheDocument();
  });
});
