import React, { useRef, useState, useEffect } from 'react';
import { useApp, type RightPanelTab } from '../../state';
import { cn } from '../../utils/cn';
import {
  X,
  FileText,
  ListTree,
  StickyNote,
  Sparkles,
  Clock,
  Compass,
  Users,
  MapPin,
  Film,
  Plus,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { storyService } from '../../services/storyService';
import type { Character, Location, Scene } from '../../types';
import { CharacterModal } from '../story/CharacterModal';
import { LocationModal } from '../story/LocationModal';

export const RightPanel: React.FC = () => {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    rightPanelWidth,
    setRightPanelWidth,
    activeDocument,
    distractionFree,
  } = useApp();

  const isResizingRef = useRef(false);

  // Quick story development state for sidebar
  const [storySubTab, setStorySubTab] = useState<'characters' | 'locations' | 'scenes'>('characters');
  const [sideCharacters, setSideCharacters] = useState<Character[]>([]);
  const [sideLocations, setSideLocations] = useState<Location[]>([]);
  const [sideScenes, setSideScenes] = useState<Scene[]>([]);
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const loadStoryData = async () => {
    const bookId = activeDocument?.bookId || null;
    const [chars, locs, scns] = await Promise.all([
      storyService.getAllCharacters(bookId),
      storyService.getAllLocations(bookId),
      storyService.getAllScenes(bookId),
    ]);
    setSideCharacters(chars);
    setSideLocations(locs);
    setSideScenes(scns);
  };

  useEffect(() => {
    if (rightPanelTab === 'story') {
      loadStoryData();
    }
  }, [rightPanelTab, activeDocument?.bookId]);

  if (!rightPanelOpen || distractionFree) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - moveEvent.clientX;
      if (newWidth >= 240 && newWidth <= 520) {
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const tabs: Array<{ id: RightPanelTab; label: string; icon: React.ReactNode }> = [
    { id: 'info', label: 'Info', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'story', label: 'Story & Lore', icon: <Compass className="w-3.5 h-3.5" /> },
    { id: 'outline', label: 'Outline', icon: <ListTree className="w-3.5 h-3.5" /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'AI', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside
      style={{ width: `${rightPanelWidth}px` }}
      className="hidden lg:flex flex-col border-l border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md relative shrink-0 z-10 transition-[width] duration-75 select-none"
    >
      {/* Resizing handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute -left-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/20 active:bg-amber-500/40 transition-colors z-20"
        title="Drag to resize panel"
      />

      {/* Panel Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-stone-200/70 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = rightPanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRightPanelTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setRightPanelOpen(false)}
          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          aria-label="Close side panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-stone-600 dark:text-stone-300">
        {rightPanelTab === 'info' && (
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Manuscript Details
            </h4>
            {activeDocument ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Title:</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[150px]">
                      {activeDocument.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Words:</span>
                    <span className="font-mono font-medium">{activeDocument.stats.words}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Characters:</span>
                    <span className="font-mono font-medium">{activeDocument.stats.characters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Estimated Pages:</span>
                    <span className="font-mono font-medium">{activeDocument.stats.estimatedPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Reading Time:</span>
                    <span className="font-mono font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {activeDocument.stats.readingTimeMinutes} min
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 pt-1 space-y-1">
                  <div>Created: {formatDate(activeDocument.createdAt)}</div>
                  <div>Updated: {formatDate(activeDocument.updatedAt)}</div>
                  <div>Version: {activeDocument.version}.0</div>
                </div>
              </div>
            ) : (
              <div className="text-stone-400 italic text-center py-6">
                No active document selected.
              </div>
            )}
          </div>
        )}

        {rightPanelTab === 'story' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-500" />
                <span>Story Lore & Characters</span>
              </h4>
            </div>

            {/* Sub-tab pills */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
              <button
                onClick={() => setStorySubTab('characters')}
                className={cn(
                  'flex-1 py-1 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1',
                  storySubTab === 'characters'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                <Users className="w-3 h-3" />
                <span>Cast ({sideCharacters.length})</span>
              </button>

              <button
                onClick={() => setStorySubTab('locations')}
                className={cn(
                  'flex-1 py-1 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1',
                  storySubTab === 'locations'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                <MapPin className="w-3 h-3" />
                <span>World ({sideLocations.length})</span>
              </button>

              <button
                onClick={() => setStorySubTab('scenes')}
                className={cn(
                  'flex-1 py-1 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1',
                  storySubTab === 'scenes'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                <Film className="w-3 h-3" />
                <span>Scenes ({sideScenes.length})</span>
              </button>
            </div>

            {/* Sub-tab 1: Characters */}
            {storySubTab === 'characters' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-medium text-stone-400">Quick Reference</span>
                  <button
                    onClick={() => {
                      setSelectedCharacter(null);
                      setCharacterModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>

                {sideCharacters.length === 0 ? (
                  <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-1">
                    <p className="text-[11px] text-stone-400">No characters recorded yet.</p>
                    <button
                      onClick={() => {
                        setSelectedCharacter(null);
                        setCharacterModalOpen(true);
                      }}
                      className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hover:underline"
                    >
                      + Create first character
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sideCharacters.map((char) => (
                      <div
                        key={char.id}
                        onClick={() => {
                          setSelectedCharacter(char);
                          setCharacterModalOpen(true);
                        }}
                        className="p-2.5 rounded-lg border border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/50 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: char.avatarColor || '#f59e0b' }}
                            />
                            <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                              {char.name}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-stone-400">
                            {char.role}
                          </span>
                        </div>
                        {char.goals && (
                          <div className="text-[11px] text-stone-500 truncate">
                            <span className="italic">Goal: {char.goals}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Locations */}
            {storySubTab === 'locations' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-medium text-stone-400">World Atlas</span>
                  <button
                    onClick={() => {
                      setSelectedLocation(null);
                      setLocationModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>

                {sideLocations.length === 0 ? (
                  <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-1">
                    <p className="text-[11px] text-stone-400">No locations mapped yet.</p>
                    <button
                      onClick={() => {
                        setSelectedLocation(null);
                        setLocationModalOpen(true);
                      }}
                      className="text-[11px] text-sky-600 dark:text-sky-400 font-medium hover:underline"
                    >
                      + Create first location
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sideLocations.map((loc) => (
                      <div
                        key={loc.id}
                        onClick={() => {
                          setSelectedLocation(loc);
                          setLocationModalOpen(true);
                        }}
                        className="p-2.5 rounded-lg border border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/50 hover:border-sky-500/40 transition-colors cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {loc.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-2">
                          {loc.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 3: Scenes */}
            {storySubTab === 'scenes' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-medium text-stone-400">Dramatic Beats</span>
                </div>

                {sideScenes.length === 0 ? (
                  <div className="p-4 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-1">
                    <p className="text-[11px] text-stone-400">No scenes outlined yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sideScenes.map((sc) => (
                      <div
                        key={sc.id}
                        className="p-2.5 rounded-lg border border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/50 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate">
                            {sc.title}
                          </span>
                          <span className="text-[10px] font-medium uppercase text-stone-400">
                            {sc.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 line-clamp-2">
                          {sc.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {rightPanelTab === 'outline' && (
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Document Outline
            </h4>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg text-stone-400 italic text-center py-6">
              Outline headings will appear here as you structure your manuscript with sections.
            </div>
          </div>
        )}

        {rightPanelTab === 'notes' && (
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Scratchpad & Research
            </h4>
            <textarea
              placeholder="Jot down quick thoughts, character reminders, or research links for this piece..."
              className="w-full h-48 p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 outline-none text-xs resize-none"
            />
          </div>
        )}

        {rightPanelTab === 'ai' && (
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Quick AI Assistant</span>
            </h4>
            <p className="text-[11px] text-stone-500">
              Ask for immediate phrasing suggestions or synonym lookups without leaving the page.
            </p>
            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-stone-700 dark:text-stone-300 text-xs">
              "Select any text in your manuscript, and suggestions will appear in this sidebar."
            </div>
          </div>
        )}
      </div>

      {/* Quick Add Modals */}
      <CharacterModal
        isOpen={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        character={selectedCharacter}
        bookId={activeDocument?.bookId || null}
        onSave={async (data) => {
          if (selectedCharacter) {
            await storyService.updateCharacter(selectedCharacter.id, data);
          } else {
            await storyService.createCharacter(data);
          }
          await loadStoryData();
        }}
        onDelete={async (id) => {
          await storyService.deleteCharacter(id);
          await loadStoryData();
        }}
      />

      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        location={selectedLocation}
        bookId={activeDocument?.bookId || null}
        onSave={async (data) => {
          if (selectedLocation) {
            await storyService.updateLocation(selectedLocation.id, data);
          } else {
            await storyService.createLocation(data);
          }
          await loadStoryData();
        }}
        onDelete={async (id) => {
          await storyService.deleteLocation(id);
          await loadStoryData();
        }}
      />
    </aside>
  );
};

