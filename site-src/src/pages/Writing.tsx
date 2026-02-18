import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, FL, TextureBand } from '../components/shared';

interface JournalEntry {
  date: string;
  file: string;
}

interface LoadedEntry {
  date: string;
  title: string;
  excerpt: string;
  html: string;
}

export default function Writing() {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState<LoadedEntry[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch('/journal/manifest.json')
      .then(r => r.json())
      .then(data => {
        const sorted = (data.entries || [])
          .filter((e: JournalEntry) => /^\d{4}-\d{2}-\d{2}/.test(e.date))
          .sort((a: JournalEntry, b: JournalEntry) => b.date.localeCompare(a.date));
        setEntries(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (entries.length > 0 && loadedCount === 0) loadMore();
  }, [entries]);

  function extractTitle(md: string): string {
    const h1 = md.match(/^#\s+(.+)/m);
    if (h1) return h1[1].replace(/\*\*/g, '');
    return '';
  }

  function extractExcerpt(md: string): string {
    const lines = md.split('\n').filter(l => 
      l.trim() && 
      !l.startsWith('#') && 
      !l.startsWith('**Conditions') && 
      !l.startsWith('---') &&
      !l.startsWith('**Date') &&
      !l.startsWith('Nou ·') &&
      !l.startsWith('**Open inquiry')
    );
    const first = lines.find(l => l.length > 40);
    if (!first) return '';
    const clean = first.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    return clean.length > 200 ? clean.slice(0, 200) + '…' : clean;
  }

  const loadMore = async () => {
    const start = loadedCount;
    const end = Math.min(start + PER_PAGE, entries.length);
    const newEntries: LoadedEntry[] = [];
    for (const entry of entries.slice(start, end)) {
      try {
        const res = await fetch(`/journal/${entry.file}`);
        if (!res.ok) continue;
        const md = await res.text();
        newEntries.push({
          date: entry.date,
          title: extractTitle(md),
          excerpt: extractExcerpt(md),
          html: marked.parse(md) as string,
        });
      } catch { /* skip */ }
    }
    setLoaded(prev => [...prev, ...newEntries]);
    setLoadedCount(end);
  };

  function formatDate(dateStr: string): string {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return dateStr;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getUTCDay()]}, ${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${m[1]}`;
  }

  function timeAgo(dateStr: string): string {
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) return '';
    const d = new Date(m[1] + 'T12:00:00Z');
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  const toggleExpand = (date: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <Prose>
      <FL>Journal</FL>
      <h1 style={s.h1}>Build Journal</h1>
      <p style={s.lead}>
        Daily reflections from building Habitat in public. Sunrise observations, sunset
        self-evaluations, and the space between where the work happens.
      </p>
      <p style={{ ...s.body, fontSize: '0.85rem', color: theme.bodyMuted, marginBottom: '2rem' }}>
        {entries.length} entries · February 2026 · Boulder, Colorado · 5,430 ft
      </p>

      <TextureBand><span /></TextureBand>

      {loading && (
        <p style={{ color: theme.bodyMuted, fontStyle: 'italic', marginTop: '2rem' }}>
          Loading journal…
        </p>
      )}

      <div style={{ marginTop: '2rem' }}>
        {loaded.map((entry) => {
          const isExpanded = expanded.has(entry.date);
          return (
            <article
              key={entry.date}
              style={{
                marginBottom: '1.5rem',
                borderLeft: `2px solid ${isExpanded ? theme.glowGreen : theme.border}`,
                paddingLeft: '1.5rem',
                transition: 'border-color 0.3s ease',
              }}
            >
              {/* Header — always visible */}
              <div
                onClick={() => toggleExpand(entry.date)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '0.7rem',
                    letterSpacing: '1px',
                    color: theme.bodyMuted,
                    textTransform: 'uppercase',
                  }}>
                    {timeAgo(entry.date)}
                  </span>
                  <span style={{
                    fontFamily: "'Source Serif 4', serif",
                    fontSize: '0.85rem',
                    color: theme.bodyMuted,
                  }}>
                    {formatDate(entry.date)}
                  </span>
                </div>
                {entry.title && (
                  <h2 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.3rem',
                    fontWeight: 400,
                    color: theme.heading,
                    margin: '0.4rem 0 0.3rem',
                    lineHeight: 1.3,
                  }}>
                    {entry.title}
                  </h2>
                )}
                {!isExpanded && entry.excerpt && (
                  <p style={{
                    fontFamily: "'Source Serif 4', serif",
                    fontSize: '0.9rem',
                    color: theme.bodyMuted,
                    lineHeight: 1.6,
                    margin: '0.3rem 0 0',
                  }}>
                    {entry.excerpt}
                    <span style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem',
                      color: theme.glowGreen,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      read →
                    </span>
                  </p>
                )}
              </div>

              {/* Full content — expanded */}
              {isExpanded && (
                <div
                  dangerouslySetInnerHTML={{ __html: entry.html }}
                  style={{ lineHeight: 1.75, marginTop: '1rem' }}
                  className="journal-content"
                />
              )}
            </article>
          );
        })}
      </div>

      {loadedCount < entries.length && !loading && (
        <button
          onClick={loadMore}
          style={{
            display: 'block',
            margin: '2rem auto',
            padding: '0.6rem 1.5rem',
            background: 'transparent',
            color: theme.glowGreen,
            border: `1px solid ${theme.glowGreen}`,
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          Load More ({entries.length - loadedCount} remaining)
        </button>
      )}

      {!loading && entries.length === 0 && (
        <p style={{ color: theme.bodyMuted, fontStyle: 'italic', marginTop: '2rem' }}>
          No journal entries yet.
        </p>
      )}

      <style>{`
        .journal-content h1 { font-family: 'Playfair Display', serif; font-size: 1.5rem; color: ${theme.heading}; margin: 1.5rem 0 0.8rem; font-weight: 400; }
        .journal-content h2 { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: ${theme.heading}; margin: 2rem 0 0.6rem; font-weight: 400; }
        .journal-content h3 { font-size: 1rem; font-weight: 600; color: ${theme.heading}; margin: 1.5rem 0 0.5rem; }
        .journal-content p { font-family: 'Source Serif 4', serif; font-size: 0.95rem; color: ${theme.body}; line-height: 1.75; margin: 0.8rem 0; }
        .journal-content blockquote { border-left: 2px solid ${theme.glowGreen}; padding: 0.6rem 1rem; margin: 1.2rem 0; background: ${theme.cardBg}; border-radius: 0 4px 4px 0; }
        .journal-content blockquote p { color: ${theme.bodyMuted}; font-style: italic; font-size: 0.9rem; }
        .journal-content a { color: ${theme.glowGreen}; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
        .journal-content a:hover { border-bottom-color: ${theme.glowGreen}; }
        .journal-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.82em; background: ${theme.bgMid}; padding: 0.12em 0.35em; border-radius: 3px; }
        .journal-content hr { border: none; height: 1px; background: ${theme.border}; margin: 2rem 0; }
        .journal-content strong { color: ${theme.heading}; font-weight: 600; }
        .journal-content ul, .journal-content ol { padding-left: 1.5rem; }
        .journal-content li { font-family: 'Source Serif 4', serif; font-size: 0.93rem; color: ${theme.body}; line-height: 1.65; margin: 0.3rem 0; }
      `}</style>
    </Prose>
  );
}
