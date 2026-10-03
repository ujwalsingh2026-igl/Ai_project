import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../state';
import { documentService } from '../services/documentService';
import { folderService } from '../services/folderService';
import type { Document, Folder, DocumentType } from '../types';
import {
  Button,
  Input,
  Badge,
  Card,
  Modal,
  BottomSheet,
  ContextMenu,
  useToast,
  EmptyState,
} from '../components/ui';
import { formatDate } from '../utils/formatters';
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Folder as FolderIcon,
  Star,
  Trash2,
  Copy,
  Edit2,
  FolderInput,
  Archive,
  ArrowUpDown,
  CheckSquare,
  Square,
  MoreVertical,
  ChevronRight,
  FolderPlus,
  FileText,
  Calendar,
} from 'lucide-react';

type SortOption = 'updated_desc' | 'updated_asc' | 'created_desc' | 'title_asc' | 'words_desc';

export const LibraryView: React.FC = () => {
  const { openDocument, createDocumentAndOpen } = useApp();
  const toast = useToast();

  // Data states
  const [docs, setDocs] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  // View & Filter states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc');

  // Multi-select state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Dialog & Sheet Modals
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameDoc, setRenameDoc] = useState<Document | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [targetMoveFolder, setTargetMoveFolder] = useState<string>('root');

  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [actionSheetDoc, setActionSheetDoc] = useState<Document | null>(null);

  const loadData = async () => {
    try {
      const allDocs = await documentService.getAll();
      const allFolders = await folderService.getAll();
      setDocs(allDocs);
      setFolders(allFolders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const allTags = useMemo(() => Array.from(new Set(docs.flatMap((d) => d.tags || []))), [docs]);

  // Filter and Sort logic
  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      // 1. Category Filter
      if (activeCategory === 'favorites' && !doc.isFavorite) return false;
      if (activeCategory === 'drafts' && !doc.isDraft) return false;
      if (activeCategory === 'archive' && !doc.isArchived) return false;
      if (activeCategory !== 'archive' && doc.isArchived) return false;

      // Filter by specific types if selected
      if (
        ['notes', 'stories', 'poems', 'scripts', 'comics', 'journals'].includes(activeCategory)
      ) {
        const typeMap: Record<string, DocumentType> = {
          notes: 'note',
          stories: 'story',
          poems: 'poem',
          scripts: 'script',
          comics: 'comic',
          journals: 'journal',
        };
        if (doc.type !== typeMap[activeCategory]) return false;
      }

      // 2. Folder Navigation Filter
      if (activeCategory === 'all' || activeCategory === 'folders') {
        if (currentFolderId === null) {
          // If viewing folders root and we are on folders tab, hide docs with folders?
        } else if (doc.folderId !== currentFolderId) {
          return false;
        }
      }

      // 3. Document Type Filter
      if (selectedType !== 'all' && doc.type !== selectedType) {
        return false;
      }

      // 4. Tag Filter
      if (selectedTag && !doc.tags.includes(selectedTag)) {
        return false;
      }

      // 5. Search Text Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesContent = doc.plainTextPreview?.toLowerCase().includes(query);
        const matchesTags = doc.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortBy) {
        case 'updated_desc':
          return b.updatedAt - a.updatedAt;
        case 'updated_asc':
          return a.updatedAt - b.updatedAt;
        case 'created_desc':
          return b.createdAt - a.createdAt;
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'words_desc':
          return b.stats.words - a.stats.words;
        default:
          return 0;
      }
    });
  }, [docs, activeCategory, currentFolderId, selectedType, selectedTag, searchQuery, sortBy]);

  // Current folder breadcrumbs
  const folderPath = useMemo(() => {
    if (!currentFolderId) return [];
    const path: Folder[] = [];
    let cur = folders.find((f) => f.id === currentFolderId);
    while (cur) {
      path.unshift(cur);
      cur = cur.parentId ? folders.find((f) => f.id === cur?.parentId) : undefined;
    }
    return path;
  }, [currentFolderId, folders]);

  // Current subfolders
  const currentSubfolders = useMemo(() => {
    return folders.filter((f) =>
      currentFolderId === null ? !f.parentId : f.parentId === currentFolderId
    );
  }, [folders, currentFolderId]);

  // Bulk Selection Helpers
  const toggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  // Actions
  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await documentService.toggleFavorite(id);
    await loadData();
  };

  const handleDuplicate = async (id: string) => {
    const copy = await documentService.duplicate(id);
    if (copy) {
      toast.success(`Duplicated "${copy.title}"`);
      await loadData();
    }
  };

  const openRename = (doc: Document) => {
    setRenameDoc(doc);
    setNewTitle(doc.title);
    setRenameModalOpen(true);
  };

  const submitRename = async () => {
    if (renameDoc && newTitle.trim()) {
      await documentService.rename(renameDoc.id, newTitle);
      toast.success('Manuscript renamed');
      setRenameModalOpen(false);
      await loadData();
    }
  };

  const openMove = (doc?: Document) => {
    if (doc) setSelectedDocIds(new Set([doc.id]));
    setTargetMoveFolder(currentFolderId || 'root');
    setMoveModalOpen(true);
  };

  const submitMove = async () => {
    const folderId = targetMoveFolder === 'root' ? null : targetMoveFolder;
    const ids = Array.from(selectedDocIds);
    await documentService.bulkMove(ids, folderId);
    toast.success(`Moved ${ids.length} manuscript(s)`);
    setMoveModalOpen(false);
    setSelectedDocIds(new Set());
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await documentService.softDelete(id);
    toast.info('Manuscript moved to Recycle Bin');
    await loadData();
  };

  const handleArchive = async (id: string) => {
    const isArchived = await documentService.toggleArchive(id);
    toast.info(isArchived ? 'Manuscript moved to Archive' : 'Restored from Archive');
    await loadData();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await folderService.create(newFolderName.trim(), currentFolderId);
    toast.success(`Created folder "${newFolderName.trim()}"`);
    setNewFolderName('');
    setCreateFolderModalOpen(false);
    await loadData();
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedDocIds);
    await documentService.bulkDelete(ids);
    toast.info(`Moved ${ids.length} item(s) to Recycle Bin`);
    setSelectedDocIds(new Set());
    await loadData();
  };

  const handleBulkArchive = async () => {
    const ids = Array.from(selectedDocIds);
    await documentService.bulkArchive(ids, true);
    toast.info(`Archived ${ids.length} item(s)`);
    setSelectedDocIds(new Set());
    await loadData();
  };

  const handleBulkFavorite = async () => {
    const ids = Array.from(selectedDocIds);
    await documentService.bulkFavorite(ids, true);
    toast.success(`Starred ${ids.length} item(s)`);
    setSelectedDocIds(new Set());
    await loadData();
  };

  const categories = [
    { id: 'all', label: 'All Documents' },
    { id: 'recent', label: 'Recent' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'folders', label: 'Folders' },
    { id: 'notes', label: 'Notes' },
    { id: 'stories', label: 'Stories' },
    { id: 'poems', label: 'Poems' },
    { id: 'scripts', label: 'Scripts' },
    { id: 'comics', label: 'Comics' },
    { id: 'journals', label: 'Journals' },
    { id: 'archive', label: 'Archive' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* 1. TOP HEADER & NEW TRIGGER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>Library & Manuscript Studio</span>
            <span className="text-xs font-mono font-normal text-stone-400">
              ({filteredDocs.length} items)
            </span>
          </h1>
          <p className="text-xs text-stone-500">
            Central repository for manuscripts, multi-chapter books, notes, and collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateFolderModalOpen(true)}
            className="gap-1.5"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Folder</span>
          </Button>

          <Button
            onClick={() => createDocumentAndOpen('Untitled Manuscript', 'blank')}
            size="sm"
            className="gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Document</span>
          </Button>
        </div>
      </div>

      {/* 2. CATEGORY PILL TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setCurrentFolderId(null);
                setSelectedDocIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-900 shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* 3. TOOLBAR: SEARCH, SORT, TYPE FILTER, VIEW TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl shadow-subtle">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, tag, or content..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700 rounded-lg outline-none focus:border-amber-500"
          />
        </div>

        {/* Filters and View modes */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Format Type Selector */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none cursor-pointer text-stone-700 dark:text-stone-300"
          >
            <option value="all">All Formats</option>
            <option value="blank">Blank</option>
            <option value="note">Notes</option>
            <option value="story">Stories</option>
            <option value="novel">Novels</option>
            <option value="book">Books</option>
            <option value="poem">Poems</option>
            <option value="script">Scripts</option>
            <option value="comic">Comics</option>
            <option value="journal">Journals</option>
          </select>

          {/* Tag Selector */}
          {allTags.length > 0 && (
            <select
              value={selectedTag || 'all'}
              onChange={(e) => setSelectedTag(e.target.value === 'all' ? null : e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none cursor-pointer text-stone-700 dark:text-stone-300"
            >
              <option value="all">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none cursor-pointer text-stone-700 dark:text-stone-300"
            >
              <option value="updated_desc">Recently Modified</option>
              <option value="updated_asc">Oldest Modified</option>
              <option value="created_desc">Recently Created</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="words_desc">Highest Word Count</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200/70 dark:border-stone-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. FOLDER NAVIGATION BREADCRUMBS */}
      {(activeCategory === 'folders' || currentFolderId !== null) && (
        <div className="flex items-center gap-2 p-3 bg-stone-100/70 dark:bg-stone-900/60 rounded-xl text-xs text-stone-600 dark:text-stone-400">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="hover:underline font-medium text-stone-900 dark:text-stone-100 flex items-center gap-1"
          >
            <FolderIcon className="w-3.5 h-3.5" />
            <span>Root Library</span>
          </button>
          {folderPath.map((f, i) => (
            <React.Fragment key={f.id}>
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <button
                onClick={() => setCurrentFolderId(f.id)}
                className={`hover:underline ${
                  i === folderPath.length - 1 ? 'font-bold text-stone-900 dark:text-stone-100' : ''
                }`}
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 5. SUBFOLDERS DISPLAY */}
      {currentSubfolders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {currentSubfolders.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setCurrentFolderId(sub.id)}
              className="flex items-center gap-2.5 p-3 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl hover:border-amber-500/50 hover:shadow-xs transition text-left"
            >
              <FolderIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                {sub.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 6. BULK ACTIONS FLOATING TOOLBAR */}
      {selectedDocIds.size > 0 && (
        <div className="sticky top-2 z-sticky flex items-center justify-between gap-4 p-3 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 rounded-xl shadow-elevated animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3 text-xs font-medium">
            <button onClick={selectAll} className="flex items-center gap-1.5 hover:underline">
              {selectedDocIds.size === filteredDocs.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{selectedDocIds.size} selected</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => openMove()}
              className="border-stone-700 dark:border-stone-300 text-inherit hover:bg-stone-800 dark:hover:bg-stone-200"
            >
              <FolderInput className="w-3.5 h-3.5 mr-1" />
              <span>Move</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={handleBulkFavorite}
              className="border-stone-700 dark:border-stone-300 text-inherit hover:bg-stone-800 dark:hover:bg-stone-200"
            >
              <Star className="w-3.5 h-3.5 mr-1" />
              <span>Star</span>
            </Button>
            <Button
              variant="outline"
              size="xs"
              onClick={handleBulkArchive}
              className="border-stone-700 dark:border-stone-300 text-inherit hover:bg-stone-800 dark:hover:bg-stone-200"
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              <span>Archive</span>
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleBulkDelete}
              className="gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
            </Button>
            <button
              onClick={() => setSelectedDocIds(new Set())}
              className="text-xs hover:underline text-stone-400 ml-2"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 7. MAIN DOCUMENTS AREA (GRID OR LIST) */}
      {loading ? (
        <div className="text-center py-16 text-xs text-stone-400">Loading library contents...</div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-6 h-6" />}
          title="No Manuscripts Found"
          description={
            searchQuery
              ? `No items match the filter "${searchQuery}".`
              : 'This category or folder contains no manuscripts yet.'
          }
          action={
            <Button
              size="sm"
              onClick={() => createDocumentAndOpen('New Manuscript', 'blank')}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Manuscript
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDocIds.has(doc.id);
            return (
              <ContextMenu
                key={doc.id}
                items={[
                  { id: 'open', label: 'Open Manuscript', onClick: () => openDocument(doc.id) },
                  { id: 'rename', label: 'Rename', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => openRename(doc) },
                  { id: 'duplicate', label: 'Duplicate', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => handleDuplicate(doc.id) },
                  { id: 'move', label: 'Move to Folder', icon: <FolderInput className="w-3.5 h-3.5" />, onClick: () => openMove(doc) },
                  { id: 'archive', label: doc.isArchived ? 'Unarchive' : 'Archive', icon: <Archive className="w-3.5 h-3.5" />, onClick: () => handleArchive(doc.id) },
                  { id: 'delete', label: 'Move to Trash', destructive: true, icon: <Trash2 className="w-3.5 h-3.5" />, onClick: () => handleDelete(doc.id) },
                ]}
              >
                <Card
                  interactive
                  onClick={() => openDocument(doc.id)}
                  className={`group relative flex flex-col justify-between p-5 transition-all ${
                    isSelected ? 'ring-2 ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20' : ''
                  }`}
                >
                  {/* Select Checkbox & Type Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleSelectDoc(doc.id, e)}
                        className="p-1 rounded text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {doc.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleFav(doc.id, e)}
                        className="p-1 text-stone-300 hover:text-amber-500 transition"
                      >
                        <Star
                          className={`w-4 h-4 ${doc.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionSheetDoc(doc);
                          setActionSheetOpen(true);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-700 md:hidden"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Preview */}
                  <div className="flex-1 mb-4">
                    <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base mb-1.5 line-clamp-1 group-hover:text-amber-900 dark:group-hover:text-amber-200 transition-colors">
                      {doc.title || 'Untitled Manuscript'}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-serif line-clamp-3 leading-relaxed">
                      {doc.plainTextPreview || 'Empty manuscript surface...'}
                    </p>
                  </div>

                  {/* Metadata Footer */}
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-3 border-t border-stone-100 dark:border-stone-800/80">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.updatedAt)}
                    </span>
                    <span className="font-mono">{doc.stats.words} words</span>
                  </div>
                </Card>
              </ContextMenu>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-xl overflow-hidden shadow-subtle">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-900/60 text-stone-400 font-medium select-none">
                <th className="p-3 w-8">
                  <button onClick={selectAll}>
                    {selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Title</th>
                <th className="p-3 hidden sm:table-cell">Format</th>
                <th className="p-3 hidden md:table-cell">Words</th>
                <th className="p-3 hidden lg:table-cell">Modified</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {filteredDocs.map((doc) => {
                const isSelected = selectedDocIds.has(doc.id);
                return (
                  <tr
                    key={doc.id}
                    onClick={() => openDocument(doc.id)}
                    className={`cursor-pointer hover:bg-stone-50/70 dark:hover:bg-stone-800/50 transition-colors ${
                      isSelected ? 'bg-amber-50/30 dark:bg-amber-950/30' : ''
                    }`}
                  >
                    <td className="p-3" onClick={(e) => toggleSelectDoc(doc.id, e)}>
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-300" />
                      )}
                    </td>
                    <td className="p-3 font-serif font-semibold text-stone-900 dark:text-stone-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{doc.title}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {doc.type}
                      </Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell font-mono text-stone-500">
                      {doc.stats.words}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-stone-400">
                      {formatDate(doc.updatedAt)}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => handleToggleFav(doc.id, e)}
                          className="p-1 text-stone-300 hover:text-amber-500 transition"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              doc.isFavorite ? 'fill-amber-400 text-amber-500' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => openRename(doc)}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                          title="Rename"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(doc.id)}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1 text-stone-400 hover:text-red-600 transition"
                          title="Trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* RENAME MODAL */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="Rename Manuscript"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitRename}>
              Save Name
            </Button>
          </>
        }
      >
        <Input
          label="New Title"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* MOVE TO FOLDER MODAL */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="Move Manuscript to Folder"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setMoveModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitMove}>
              Move Here
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Select Destination Folder
          </label>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            <button
              onClick={() => setTargetMoveFolder('root')}
              className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium text-left transition ${
                targetMoveFolder === 'root'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
              }`}
            >
              <FolderIcon className="w-4 h-4" />
              <span>Root Library (No Folder)</span>
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setTargetMoveFolder(f.id)}
                className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium text-left transition ${
                  targetMoveFolder === f.id
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100'
                }`}
              >
                <FolderIcon className="w-4 h-4" />
                <span>{f.name}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* CREATE FOLDER MODAL */}
      <Modal
        isOpen={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        title="Create New Folder"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setCreateFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateFolder}>
              Create Folder
            </Button>
          </>
        }
      >
        <Input
          label="Folder Name"
          placeholder="e.g. Character Outlines, Essays..."
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          autoFocus
        />
      </Modal>

      {/* MOBILE ACTION BOTTOM SHEET */}
      <BottomSheet
        isOpen={actionSheetOpen}
        onClose={() => setActionSheetOpen(false)}
        title={actionSheetDoc?.title || 'Manuscript Actions'}
      >
        {actionSheetDoc && (
          <div className="space-y-2 pb-4">
            <button
              onClick={() => {
                openDocument(actionSheetDoc.id);
                setActionSheetOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800"
            >
              <FileText className="w-4 h-4" />
              <span>Open in Studio</span>
            </button>
            <button
              onClick={() => {
                setActionSheetOpen(false);
                openRename(actionSheetDoc);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-xs font-medium bg-stone-50 dark:bg-stone-800/60"
            >
              <Edit2 className="w-4 h-4" />
              <span>Rename</span>
            </button>
            <button
              onClick={() => {
                setActionSheetOpen(false);
                handleDuplicate(actionSheetDoc.id);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-xs font-medium bg-stone-50 dark:bg-stone-800/60"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => {
                setActionSheetOpen(false);
                openMove(actionSheetDoc);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-xs font-medium bg-stone-50 dark:bg-stone-800/60"
            >
              <FolderInput className="w-4 h-4" />
              <span>Move to Folder</span>
            </button>
            <button
              onClick={() => {
                setActionSheetOpen(false);
                handleArchive(actionSheetDoc.id);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-xs font-medium bg-stone-50 dark:bg-stone-800/60"
            >
              <Archive className="w-4 h-4" />
              <span>{actionSheetDoc.isArchived ? 'Unarchive' : 'Archive'}</span>
            </button>
            <button
              onClick={() => {
                setActionSheetOpen(false);
                handleDelete(actionSheetDoc.id);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
              <span>Move to Recycle Bin</span>
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
