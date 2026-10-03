import type { DocumentType, DocumentTypeMetadata, DocumentStats } from '../types';
import { calculateDocumentStats } from '../utils/formatters';

export function getDocumentTypeTemplate(type: DocumentType, title = 'Untitled'): string {
  switch (type) {
    case 'note':
      return `<h2>${title}</h2>
<p><strong>Quick Notes & Tasks:</strong></p>
<ul>
  <li>Review chapter outline and character motivations</li>
  <li>Verify historical terminology</li>
  <li>Export manuscript draft</li>
</ul>
<blockquote>Key thought: The quietest moments often carry the deepest revelations.</blockquote>
<p></p>`;

    case 'poem':
      return `<div class="poetry-verse">
<h2 style="text-align: center; font-style: italic;">${title}</h2>
<p style="text-align: center;">The ink upon the parchment dries,<br>
Beneath the calm of evening skies.<br>
A thousand voices turn to stone,<br>
Yet here the teller stands alone.</p>
<p style="text-align: center;">A solitary lantern gleams,<br>
To kindle all forgotten dreams.<br>
Write, create, remember still,<br>
Upon the crest of silent hill.</p>
</div>`;

    case 'script':
      return `<p><strong>FADE IN:</strong></p>
<p><strong>EXT. RAIN-SLICKED ALLEYWAY - NIGHT</strong></p>
<p>Streetlights shimmer in asphalt puddles. Rain descends in steady, deliberate sheets.</p>
<p>ELENA (30s), collar turned up against the cold, steps out from the shadows. She holds an old leather-bound ledger.</p>
<p style="text-align: center;"><strong>ELENA</strong></p>
<p style="text-align: center;"><em>(into a tape recorder)</em></p>
<p style="text-align: center;">Entry zero. If you're listening to this, the manuscript was found.</p>
<p>She glances over her shoulder. The rumble of an approaching train echoes in the distance.</p>
<p style="text-align: right;"><strong>CUT TO:</strong></p>`;

    case 'comic':
      return `<h2>PAGE 1</h2>
<p><strong>PANEL 1 (WIDE SHOT)</strong></p>
<p>A sprawling cyberpunk metropolis bathed in amber neon and twilight fog.</p>
<p><strong>CAPTION:</strong> Sector 9. Where forgotten memories are traded like currency.</p>
<hr/>
<p><strong>PANEL 2 (CLOSE UP)</strong></p>
<p>KAI holds a cracked memory crystal. A faint azure glow reflects in his cybernetic eye.</p>
<p><strong>KAI:</strong> Just one more shard... and the chronicle is complete.</p>
<p><strong>SFX:</strong> <em>*CHRR-KZZT*</em></p>`;

    case 'journal': {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `<h3>${dateStr} • ${timeStr}</h3>
<p><strong>Mood:</strong> Reflective & Calm</p>
<hr/>
<p>Today's Reflections:</p>
<p>What stayed with me today was the stillness of the early morning...</p>
<p><strong>Three moments of gratitude:</strong></p>
<ul>
  <li>The warm morning sunlight through the window</li>
  <li>Progress made on the manuscript</li>
  <li>A quiet cup of tea</li>
</ul>`;
    }

    case 'novel':
    case 'book':
      return `<h1>Chapter One</h1>
<blockquote style="font-style: italic;">“The past is never dead. It's not even past.” — William Faulkner</blockquote>
<p>The dawn broke over the valley with the quiet reverence of an open book. From his high window, Julian watched the river mist unfurl across the orchard rows.</p>
<p>For forty years he had guarded the archives, knowing that words alone could hold the weight of all that was lost.</p>
<p style="text-align: center;">* * *</p>
<p>Downstairs, the floorboards groaned under familiar footsteps. The messenger had arrived earlier than expected.</p>`;

    case 'story':
      return `<h1>${title}</h1>
<p style="font-style: italic; color: #78716c;">A short story</p>
<p>The bell above the bookshop door chimed twice. It was an ordinary Tuesday, or so Arthur thought until he noticed the visitor who cast no shadow.</p>
<p>“I believe you have something that belongs to my family,” the stranger said, tapping a gloved finger against the glass counter.</p>`;

    case 'draft':
      return `<h2>Draft: ${title}</h2>
<p><em>[Rough brainstorming & outline thoughts]</em></p>
<p>Write quickly without judging. Let the flow take shape.</p>`;

    case 'blank':
    default:
      return `<p></p>`;
  }
}

export function getDefaultMetadataForType(type: DocumentType): DocumentTypeMetadata {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  switch (type) {
    case 'note':
      return {
        note: {
          checklistCompleted: 0,
          checklistTotal: 3,
          pinned: false,
        },
      };
    case 'poem':
      return {
        poem: {
          form: 'free-verse',
          rhymeScheme: 'AABB',
          meter: 'Iambic Tetrameter',
          stanzasCount: 2,
        },
      };
    case 'script':
      return {
        script: {
          format: 'feature',
          sceneCount: 1,
          characters: ['ELENA'],
          estimatedRuntimeMinutes: 1,
        },
      };
    case 'comic':
      return {
        comic: {
          issueNumber: 1,
          pageCount: 1,
          panelCount: 2,
        },
      };
    case 'journal':
      return {
        journal: {
          entryDate: dateStr,
          entryTime: timeStr,
          mood: 'reflective',
          weather: 'Clear',
        },
      };
    case 'novel':
    case 'book':
      return {
        novel: {
          chapterNumber: 1,
          targetWordCount: 50000,
          status: 'first-draft',
          povCharacter: 'Julian',
        },
      };
    case 'story':
      return {
        story: {
          targetWordCount: 4000,
          genre: 'Literary Fiction',
        },
      };
    default:
      return {};
  }
}

export function calculateEnhancedStats(
  type: DocumentType,
  text: string,
  _html: string
): DocumentStats {
  const base = calculateDocumentStats(text);

  // Type specific calculation
  let linesCount = 0;
  let stanzasCount = 0;
  let scenesCount = 0;
  let panelsCount = 0;
  let pagesCount = 0;
  let estimatedRuntimeMinutes = 0;

  if (type === 'poem') {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    linesCount = lines.length;
    const stanzas = text.split(/\n\s*\n/).filter((s) => s.trim().length > 0);
    stanzasCount = stanzas.length;
  } else if (type === 'script') {
    const scenes = text.match(/(INT\.|EXT\.)/gi) || [];
    scenesCount = Math.max(1, scenes.length);
    // Standard rule: ~1 screenplay page = 1 minute runtime
    estimatedRuntimeMinutes = Math.max(1, Math.round(base.words / 220));
  } else if (type === 'comic') {
    const panels = text.match(/PANEL\s+\d+/gi) || [];
    panelsCount = panels.length;
    const pages = text.match(/PAGE\s+\d+/gi) || [];
    pagesCount = Math.max(1, pages.length);
  }

  return {
    ...base,
    linesCount,
    stanzasCount,
    scenesCount,
    panelsCount,
    pagesCount,
    estimatedRuntimeMinutes,
  };
}
