import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../components/CommandPalette';
import { ThemeProvider } from '../context/ThemeContext';

describe('CommandPalette Component', () => {
  it('renders command search and items when open', () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();

    render(
      <ThemeProvider>
        <CommandPalette
          isOpen={true}
          onClose={onClose}
          onNavigate={onNavigate}
          onOpenShortcuts={vi.fn()}
          onSendSystemQuery={vi.fn()}
        />
      </ThemeProvider>
    );

    expect(screen.getByPlaceholderText(/Type a command/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigate: Assistant Chat/i)).toBeInTheDocument();
    expect(screen.getByText(/Navigate: Defensive Security Center/i)).toBeInTheDocument();
  });

  it('filters commands based on search input', () => {
    render(
      <ThemeProvider>
        <CommandPalette
          isOpen={true}
          onClose={vi.fn()}
          onNavigate={vi.fn()}
          onOpenShortcuts={vi.fn()}
          onSendSystemQuery={vi.fn()}
        />
      </ThemeProvider>
    );

    const input = screen.getByPlaceholderText(/Type a command/i);
    fireEvent.change(input, { target: { value: 'Security' } });

    expect(screen.getByText(/Navigate: Defensive Security Center/i)).toBeInTheDocument();
    expect(screen.queryByText(/Navigate: Assistant Chat/i)).not.toBeInTheDocument();
  });

  it('calls navigation handler when command clicked', () => {
    const onNavigate = vi.fn();
    const onClose = vi.fn();

    render(
      <ThemeProvider>
        <CommandPalette
          isOpen={true}
          onClose={onClose}
          onNavigate={onNavigate}
          onOpenShortcuts={vi.fn()}
          onSendSystemQuery={vi.fn()}
        />
      </ThemeProvider>
    );

    const assistantCmd = screen.getByText(/Navigate: Assistant Chat/i);
    fireEvent.click(assistantCmd);

    expect(onNavigate).toHaveBeenCalledWith('assistant');
    expect(onClose).toHaveBeenCalled();
  });
});
