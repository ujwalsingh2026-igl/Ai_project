import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, Bell, Clock, Sparkles } from 'lucide-react';
import { playChimeSound } from '../utils/audio';

interface FocusTimerProps {
  onSessionComplete?: (type: string) => void;
}

type TimerMode = 'pomodoro' | 'short_break' | 'long_break' | 'custom';

export const FocusTimer: React.FC<FocusTimerProps> = ({ onSessionComplete }) => {
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [customMinutes, setCustomMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [completedBanner, setCompletedBanner] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  const getDurationForMode = (m: TimerMode, custom: number): number => {
    switch (m) {
      case 'pomodoro':
        return 25 * 60;
      case 'short_break':
        return 5 * 60;
      case 'long_break':
        return 15 * 60;
      case 'custom':
        return Math.max(1, custom) * 60;
    }
  };

  const switchMode = (newMode: TimerMode, custom: number = customMinutes) => {
    setIsRunning(false);
    setMode(newMode);
    const secs = getDurationForMode(newMode, custom);
    setTotalSeconds(secs);
    setTimeLeft(secs);
    setCompletedBanner(null);
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, soundEnabled]);

  const handleTimerComplete = () => {
    if (soundEnabled) {
      playChimeSound();
    }

    const title = mode === 'pomodoro' ? 'Focus Interval Complete!' : 'Break Time Finished!';
    const body =
      mode === 'pomodoro'
        ? 'Great work. Take a 5-minute tactical break.'
        : 'Break concluded. Ready for your next focus cycle?';

    setCompletedBanner(`${title} ${body}`);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        // Notification failed or blocked
      }
    }

    if (onSessionComplete) {
      onSessionComplete(mode);
    }
  };

  const toggleStart = () => {
    if (timeLeft === 0) {
      setTimeLeft(totalSeconds);
    }
    setIsRunning((prev) => !prev);
    setCompletedBanner(null);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalSeconds);
    setCompletedBanner(null);
  };

  const requestNotifications = async () => {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="bg-cockpit-surface border border-cockpit-border rounded-lg p-5 flex flex-col items-center justify-between relative overflow-hidden font-mono shadow-sm">
      {/* Background progress track */}
      <div
        className="absolute top-0 left-0 bottom-0 bg-cockpit-accent/5 transition-all duration-500 pointer-events-none"
        style={{ width: `${progressPercent}%` }}
      />

      {/* Header & Mode Selectors */}
      <div className="w-full flex items-center justify-between mb-4 z-10">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cockpit-text">
          <Clock className="w-4 h-4 text-cockpit-accent" />
          <span>TACTICAL FOCUS TIMER</span>
        </div>

        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' && typeof Notification !== 'undefined' && (
            <button
              type="button"
              onClick={requestNotifications}
              title="Enable desktop notifications"
              className="text-[11px] px-2 py-1 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-accent text-cockpit-muted hover:text-cockpit-accent flex items-center gap-1 transition-colors"
            >
              <Bell className="w-3 h-3" />
              <span>ENABLE ALERTS</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            title={soundEnabled ? 'Mute sound chime' : 'Enable sound chime'}
            className={`p-1.5 rounded border text-xs transition-colors ${
              soundEnabled
                ? 'bg-cockpit-accent/15 border-cockpit-accent/40 text-cockpit-accent'
                : 'bg-cockpit-elevated border-cockpit-border text-cockpit-muted'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={playChimeSound}
            title="Preview soft synth chime"
            className="text-[11px] px-2 py-1 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-text text-cockpit-muted hover:text-cockpit-text transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>TEST CHIME</span>
          </button>
        </div>
      </div>

      {/* Mode Buttons */}
      <div className="grid grid-cols-4 gap-2 w-full mb-6 z-10 text-xs">
        <button
          type="button"
          onClick={() => switchMode('pomodoro')}
          className={`py-1.5 px-2 rounded border transition-colors ${
            mode === 'pomodoro'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-cockpit-border text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          WORK (25m)
        </button>
        <button
          type="button"
          onClick={() => switchMode('short_break')}
          className={`py-1.5 px-2 rounded border transition-colors ${
            mode === 'short_break'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-cockpit-border text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          SHORT (5m)
        </button>
        <button
          type="button"
          onClick={() => switchMode('long_break')}
          className={`py-1.5 px-2 rounded border transition-colors ${
            mode === 'long_break'
              ? 'bg-cockpit-elevated border-cockpit-accent text-cockpit-accent font-bold'
              : 'border-cockpit-border text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated/40'
          }`}
        >
          LONG (15m)
        </button>
        <div className="flex items-center gap-1 bg-cockpit-elevated/40 border border-cockpit-border rounded px-2">
          <input
            type="number"
            min="1"
            max="120"
            value={customMinutes}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10) || 1;
              setCustomMinutes(val);
              if (mode === 'custom') switchMode('custom', val);
            }}
            onFocus={() => {
              if (mode !== 'custom') switchMode('custom');
            }}
            className="w-10 bg-transparent text-xs text-center text-cockpit-text outline-none"
          />
          <span className="text-[10px] text-cockpit-muted">MIN</span>
        </div>
      </div>

      {/* Large Digital Cockpit Display */}
      <div className="my-4 text-center z-10">
        <div
          data-testid="timer-display"
          className="text-6xl font-black tracking-widest text-cockpit-text drop-shadow-[0_0_15px_rgba(20,184,166,0.15)] select-none"
        >
          {formattedTime}
        </div>
        <div className="text-xs text-cockpit-muted mt-2 uppercase tracking-wider">
          {isRunning ? (
            <span className="text-cockpit-accent flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cockpit-accent animate-pulse" />
              INTERVAL RUNNING // {mode.replace('_', ' ').toUpperCase()}
            </span>
          ) : (
            <span>PAUSED // READY</span>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {completedBanner && (
        <div
          role="status"
          className="w-full my-3 p-2.5 rounded bg-cockpit-accent/20 border border-cockpit-accent text-cockpit-accent text-xs flex items-center justify-between z-10"
        >
          <span>{completedBanner}</span>
          <button
            type="button"
            onClick={() => setCompletedBanner(null)}
            className="text-cockpit-text hover:underline text-[11px] ml-2 font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-3 mt-4 z-10">
        <button
          type="button"
          onClick={toggleStart}
          aria-label={isRunning ? 'Pause Timer' : 'Start Timer'}
          className={`flex items-center gap-2 px-6 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all shadow ${
            isRunning
              ? 'bg-severity-med/20 border border-severity-med text-severity-med hover:bg-severity-med/30'
              : 'bg-cockpit-accent text-cockpit-base hover:bg-cockpit-accent/90'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>START</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={resetTimer}
          aria-label="Reset Timer"
          className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-cockpit-elevated border border-cockpit-border hover:border-cockpit-text text-cockpit-muted hover:text-cockpit-text text-xs uppercase tracking-wider transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>
      </div>
    </div>
  );
};
