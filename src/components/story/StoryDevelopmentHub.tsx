import React, { useState, useEffect } from 'react';
import type { Character, Location, TimelineEvent, Scene } from '../../types';
import { storyService } from '../../services/storyService';
import { CharacterModal } from './CharacterModal';
import { LocationModal } from './LocationModal';
import { TimelineEventModal } from './TimelineEventModal';
import { SceneModal } from './SceneModal';
import { Button } from '../ui';
import {
  Users,
  Compass,
  Clock,
  Film,
  Plus,
  Search,
  MapPin,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface StoryDevelopmentHubProps {
  bookId?: string | null;
  initialTab?: 'characters' | 'locations' | 'timeline' | 'scenes';
}

export const StoryDevelopmentHub: React.FC<StoryDevelopmentHubProps> = ({
  bookId,
  initialTab = 'characters',
}) => {
  const [activeTab, setActiveTab] = useState<'characters' | 'locations' | 'timeline' | 'scenes'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const [sceneModalOpen, setSceneModalOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [chars, locs, events, scns] = await Promise.all([
        storyService.getAllCharacters(bookId),
        storyService.getAllLocations(bookId),
        storyService.getAllTimelineEvents(bookId),
        storyService.getAllScenes(bookId),
      ]);
      setCharacters(chars);
      setLocations(locs);
      setTimelineEvents(events);
      setScenes(scns);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [bookId]);

  // Filtering helpers
  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.archetype?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTimeline = timelineEvents.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.dateOrEra.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScenes = scenes.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Header / Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/60 dark:border-stone-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 dark:bg-stone-800/60 rounded-xl">
          {[
            { id: 'characters', label: 'Characters', count: characters.length, icon: Users },
            { id: 'locations', label: 'World & Locations', count: locations.length, icon: Compass },
            { id: 'timeline', label: 'Timeline', count: timelineEvents.length, icon: Clock },
            { id: 'scenes', label: 'Scenes', count: scenes.length, icon: Film },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full',
                    isActive
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold'
                      : 'bg-stone-200/60 dark:bg-stone-700 text-stone-500'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Button & Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-stone-100/80 dark:bg-stone-800/80 border border-transparent focus:border-stone-300 dark:focus:border-stone-700 outline-none w-36 sm:w-48"
            />
          </div>

          {activeTab === 'characters' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedCharacter(null);
                setCharacterModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>New Character</span>
            </Button>
          )}

          {activeTab === 'locations' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedLocation(null);
                setLocationModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>New Location</span>
            </Button>
          )}

          {activeTab === 'timeline' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedEvent(null);
                setTimelineModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>New Event</span>
            </Button>
          )}

          {activeTab === 'scenes' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedScene(null);
                setSceneModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>New Scene</span>
            </Button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 text-center text-xs text-stone-400 animate-pulse">
          Loading story assets...
        </div>
      ) : (
        <>
          {/* TAB 1: CHARACTERS */}
          {activeTab === 'characters' && (
            <div>
              {filteredCharacters.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl p-8 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-stone-800 dark:text-stone-200">
                    No characters created yet
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Breathe life into your cast. Define protagonists, rivals, allies, and backstories to track across your manuscript.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCharacter(null);
                      setCharacterModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Create First Character</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredCharacters.map((char) => (
                    <div
                      key={char.id}
                      onClick={() => {
                        setSelectedCharacter(char);
                        setCharacterModalOpen(true);
                      }}
                      className="group p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 hover:border-amber-500/40 hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0"
                              style={{ backgroundColor: char.avatarColor || '#f59e0b' }}
                            >
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-sm">
                                {char.name}
                              </div>
                              {char.archetype && (
                                <div className="text-[11px] text-stone-500">
                                  {char.archetype}
                                </div>
                              )}
                            </div>
                          </div>

                          <span
                            className={cn(
                              'text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md border',
                              char.role === 'protagonist'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : char.role === 'antagonist'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : char.role === 'supporting'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30'
                            )}
                          >
                            {char.role}
                          </span>
                        </div>

                        {char.description && (
                          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                            {char.description}
                          </p>
                        )}
                      </div>

                      {char.goals && (
                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 flex items-center gap-1.5 truncate">
                          <span className="font-medium text-stone-700 dark:text-stone-300">Goal:</span>
                          <span className="truncate italic">"{char.goals}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCATIONS */}
          {activeTab === 'locations' && (
            <div>
              {filteredLocations.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl p-8 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-stone-800 dark:text-stone-200">
                    No world locations mapped yet
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Build your universe. Define kingdoms, cities, sanctuaries, and sensory details that make your universe tangible.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedLocation(null);
                      setLocationModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Create First Location</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setLocationModalOpen(true);
                      }}
                      className="group p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 hover:border-sky-500/40 hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors text-sm">
                              {loc.name}
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                            {loc.type}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                          {loc.description}
                        </p>
                      </div>

                      {(loc.sensorySight || loc.sensorySound || loc.sensorySmell) && (
                        <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center gap-3 text-[10px] text-stone-400">
                          {loc.sensorySight && <span>👁 Sight</span>}
                          {loc.sensorySound && <span>🔊 Sound</span>}
                          {loc.sensorySmell && <span>🍂 Scent</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TIMELINE */}
          {activeTab === 'timeline' && (
            <div>
              {filteredTimeline.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl p-8 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-stone-800 dark:text-stone-200">
                    Chronology is empty
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Keep your narrative consistent. Map historical milestones, turning points, and battle chronologies.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEvent(null);
                      setTimelineModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Add First Event</span>
                  </Button>
                </div>
              ) : (
                <div className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-4 pl-6 space-y-6 my-2">
                  {filteredTimeline.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedEvent(ev);
                        setTimelineModalOpen(true);
                      }}
                      className="group relative cursor-pointer"
                    >
                      {/* Timeline node dot */}
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-stone-900 group-hover:scale-125 transition-transform" />

                      <div className="p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 hover:border-amber-500/40 hover:shadow-soft transition-all space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-sm">
                            {ev.title}
                          </span>
                          <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                            {ev.dateOrEra}
                          </span>
                        </div>

                        <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                          {ev.description}
                        </p>

                        {(ev.characterIds.length > 0 || ev.locationIds.length > 0) && (
                          <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-400">
                            {ev.characterIds.length > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {ev.characterIds.length} present
                              </span>
                            )}
                            {ev.locationIds.length > 0 && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {ev.locationIds.length} locations
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SCENES */}
          {activeTab === 'scenes' && (
            <div>
              {filteredScenes.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl p-8 space-y-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                    <Film className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-stone-800 dark:text-stone-200">
                    No scene index cards
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Organize your dramatic units. Define scene goals, conflicts, disasters, and POV characters.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedScene(null);
                      setSceneModalOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Create First Scene</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredScenes.map((sc) => {
                    const pov = characters.find((c) => c.id === sc.povCharacterId);
                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          setSelectedScene(sc);
                          setSceneModalOpen(true);
                        }}
                        className="group p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 hover:border-purple-500/40 hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between space-y-2.5"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="font-serif font-bold text-stone-900 dark:text-stone-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-sm truncate">
                              {sc.title}
                            </div>
                            <span
                              className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider',
                                sc.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : sc.status === 'drafted'
                                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                  : sc.status === 'outlined'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                              )}
                            >
                              {sc.status}
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                            {sc.summary}
                          </p>
                        </div>

                        {pov && (
                          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 flex items-center gap-1.5">
                            <span className="font-medium text-stone-700 dark:text-stone-300">POV:</span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">{pov.name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CharacterModal
        isOpen={characterModalOpen}
        onClose={() => setCharacterModalOpen(false)}
        character={selectedCharacter}
        bookId={bookId}
        onSave={async (data) => {
          if (selectedCharacter) {
            await storyService.updateCharacter(selectedCharacter.id, data);
          } else {
            await storyService.createCharacter(data);
          }
          await loadAll();
        }}
        onDelete={async (id) => {
          await storyService.deleteCharacter(id);
          await loadAll();
        }}
      />

      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        location={selectedLocation}
        bookId={bookId}
        onSave={async (data) => {
          if (selectedLocation) {
            await storyService.updateLocation(selectedLocation.id, data);
          } else {
            await storyService.createLocation(data);
          }
          await loadAll();
        }}
        onDelete={async (id) => {
          await storyService.deleteLocation(id);
          await loadAll();
        }}
      />

      <TimelineEventModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
        event={selectedEvent}
        characters={characters}
        locations={locations}
        bookId={bookId}
        onSave={async (data) => {
          if (selectedEvent) {
            await storyService.updateTimelineEvent(selectedEvent.id, data);
          } else {
            await storyService.createTimelineEvent(data);
          }
          await loadAll();
        }}
        onDelete={async (id) => {
          await storyService.deleteTimelineEvent(id);
          await loadAll();
        }}
      />

      <SceneModal
        isOpen={sceneModalOpen}
        onClose={() => setSceneModalOpen(false)}
        scene={selectedScene}
        characters={characters}
        locations={locations}
        bookId={bookId}
        onSave={async (data) => {
          if (selectedScene) {
            await storyService.updateScene(selectedScene.id, data);
          } else {
            await storyService.createScene(data);
          }
          await loadAll();
        }}
        onDelete={async (id) => {
          await storyService.deleteScene(id);
          await loadAll();
        }}
      />
    </div>
  );
};
