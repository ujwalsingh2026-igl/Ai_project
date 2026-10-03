import React, { useState, useEffect } from 'react';
import { useApp } from '../../state';
import {
  ambientEngine,
  type AmbientSound,
  type AmbientState,
} from '../../audio/ambientEngine';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Sparkles,
  Sliders,
  X,
  CloudRain,
  Book,
  Coffee,
  Flame,
  Wind,
  Waves,
  Radio,
  Eye,
} from 'lucide-react';

export type FocusDepth = 'off' | 'paragraph' | 'sentence' | 'line';

interface FocusModeHUDProps {
  focusDepth: FocusDepth;
  onChangeFocusDepth: (depth: FocusDepth) => void;
  typewriterMode: boolean;
  onToggleTypewriter: () => void;
  wordCount: number;
}

const AMBIENT_OPTIONS: { id: AmbientSound; label: string; icon: React.ReactNode }[] = [
  { id: 'off', label: 'Silence', icon: <VolumeX className="w-3.5 h-3.5" /> },
  { id: 'rain', label: 'Rain', icon: <CloudRain className="w-3.5 h-3.5" /> },
  { id: 'library', label: 'Library', icon: <Book className="w-3.5 h-3.5" /> },
  { id: 'coffeeshop', label: 'Coffee Shop', icon: <Coffee className="w-3.5 h-3.5" /> },
  { id: 'fireplace', label: 'Fireplace', icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'wind', label: 'Wind', icon: <Wind className="w-3.5 h-3.5" /> },
  { id: 'waves', label: 'Waves', icon: <Waves className="w-3.5 h-3.5" /> },
  { id: 'whitenoise', label: 'White Noise', icon: <Radio className="w-3.5 h-3.5" /> },
];

export const FocusModeHUD: React.FC<FocusModeHUDProps> = ({
  focusDepth,
  onChangeFocusDepth,
  typewriterMode,
  onToggleTypewriter,
  wordCount,
}) => {
  const { distractionFree, setDistractionFree, isFullscreen, toggleFullscreen } = useApp();
  const [ambientState, setAmbientState] = useState<AmbientState>(ambientEngine.getState());
  const [expanded, setExpanded] = useState(false);
  const [showAmbientMenu, setShowAmbientMenu] = useState(false);

  useEffect(() => {
    return ambientEngine.subscribe(setAmbientState);
  }, []);

  // Keyboard shortcut listener: Esc exits distraction-free, F11 toggles fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && distractionFree) {
        e.preventDefault();
        setDistractionFree(false);
      }
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [distractionFree, setDistractionFree, toggleFullscreen]);

  if (!distractionFree) {
    return null;
  }

  return (
    <aside
      aria-label="Distraction-Free Focus Controls"
      className="fixed top-4 right-4 z-50 transition-all select-none font-sans"
    >
      {/* Compact Mini Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-stone-900/85 dark:bg-stone-800/85 text-stone-100 rounded-full shadow-lg backdrop-blur-md border border-white/10 text-xs">
        {/* Word count meter */}
        <span className="px-2.5 text-[11px] font-mono text-stone-300">
          {wordCount.toLocaleString()} w
        </span>

        {/* Ambient Atmosphere Button */}
        <button
          onClick={() => {
            setShowAmbientMenu((prev) => !prev);
            setExpanded(false);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition ${
            ambientState.isPlaying
              ? 'bg-amber-600/80 text-white font-medium'
              : 'hover:bg-white/10 text-stone-300'
          }`}
          title="Ambient Soundscape"
        >
          {ambientState.isPlaying ? (
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-300" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <span className="capitalize text-[11px] hidden sm:inline">
            {ambientState.currentSound === 'off' ? 'Sound' : ambientState.currentSound}
          </span>
        </button>

        {/* Focus Controls Expand Button */}
        <button
          onClick={() => {
            setExpanded((prev) => !prev);
            setShowAmbientMenu(false);
          }}
          className={`px-2 py-1 rounded-full hover:bg-white/10 transition ${
            expanded ? 'bg-white/15' : ''
          }`}
          title="Focus & Typewriter Modes"
        >
          <Sliders className="w-3.5 h-3.5 text-stone-300" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1 rounded-full hover:bg-white/10 text-stone-300 transition"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Exit Distraction-Free Button */}
        <button
          onClick={() => setDistractionFree(false)}
          className="flex items-center gap-1 pl-2 pr-2.5 py-1 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white font-medium text-[11px] transition"
          title="Exit Focus Mode (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit (Esc)</span>
        </button>
      </div>

      {/* Floating Ambient Soundscapes Dropdown */}
      {showAmbientMenu && (
        <div className="absolute right-0 top-11 p-3 bg-stone-900/95 text-stone-100 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 w-64 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <span className="font-semibold font-serif text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Ambient Atmosphere
            </span>
            <span className="text-[10px] text-stone-400 capitalize">
              {ambientState.currentSound}
            </span>
          </div>

          {/* Soundscapes grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {AMBIENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => ambientEngine.setSound(opt.id)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition text-left ${
                  ambientState.currentSound === opt.id
                    ? 'bg-amber-600 text-white font-medium'
                    : 'hover:bg-white/10 text-stone-300'
                }`}
              >
                {opt.icon}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Volume Slider */}
          {ambientState.currentSound !== 'off' && (
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="flex justify-between text-[11px] text-stone-400">
                <span>Volume</span>
                <span>{Math.round(ambientState.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={ambientState.volume}
                onChange={(e) => ambientEngine.setVolume(Number(e.target.value))}
                className="w-full accent-amber-500 h-1 bg-white/20 rounded cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* Floating Focus & Typewriter Modes Menu */}
      {expanded && (
        <div className="absolute right-0 top-11 p-3 bg-stone-900/95 text-stone-100 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 w-64 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
            <span className="font-semibold font-serif text-amber-400 flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Writing Ergonomics
            </span>
          </div>

          {/* Typewriter Mode Toggle */}
          <label className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer text-xs">
            <div>
              <div className="font-medium text-stone-200">Typewriter Scroll</div>
              <div className="text-[10px] text-stone-400">Keep typing line centered</div>
            </div>
            <input
              type="checkbox"
              checked={typewriterMode}
              onChange={onToggleTypewriter}
              className="rounded text-amber-600 accent-amber-600"
            />
          </label>

          {/* Focus Depth Selector */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] text-stone-400 block font-medium">Focus Depth</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'off', label: 'All Text' },
                  { id: 'paragraph', label: 'Paragraph' },
                  { id: 'sentence', label: 'Sentence' },
                  { id: 'line', label: 'Active Line' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  onClick={() => onChangeFocusDepth(d.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition text-center ${
                    focusDepth === d.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-stone-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
