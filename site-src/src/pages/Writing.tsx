import { useState, useEffect } from 'react';
import { marked } from 'marked';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, FL } from '../components/shared';

interface JournalEntry {
  date: string;
  file: string;
}

export default function Writing() {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState<{ date: string; html: string }[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const PER_PAGE = 10;

  useEffect(() => {
    fetch('/journal/manifest.json')
      .then(r => r.json())
      .then(data => {
        const sorted = (data.entries || []).sort((a: JournalEntry, b: JournalEntry) => b.date.localeCompare(a.date));
        setEntries(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (entries.length > 0 && loadedCount === 0) loadMore();
  }, [entries]);

  const loadMore = async () => {
    const start = loadedCount;
    const end = Math.min(start + PER_PAGE, entries.length);
    const newEntries: { date: string; html: string }[] = [];
    for (const entry of entries.slice(start, end)) {
      try {
        const res = await fetch(`/journal/${entry.file}`);
        if (!res.ok) continue;
        const md = await res.text();
        newEntries.push({ date: entry.date, html: marked.parse(md) as string });
      } catch { /* skip */ }
    }
    setLoaded(prev => [...prev, ...newEntries]);
    setLoadedCount(end);
  };

  function timeAgo(dateStr: string) {
    const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) return '';
    const d = new Date(m[1] + 'T12:00:00Z');
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  return (
    <Prose>
      <FL>Writing</FL>
      <h1 style={s.h1}>Build Journal</h1>
      <p style={s.lead}>Daily reflections from building Habitat in public. Sunrise, sunset, and everything between.</p>

      {loading && <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>Loading journal entries...</p>}

      {loaded.map((entry, i) => (
        <div key={i} style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: `1px solid ${theme.border}` }}>
          <span style={{
            display: 'inline-block', padding: '0.2rem 0.8rem',
            background: theme.bgMid, border: `1px solid ${theme.border}`,
            borderRadius: '999px', fontSize: '0.75rem', color: theme.bodyMuted,
            fontFamily: "'JetBrains Mono', monospace", marginBottom: '1rem',
          }}>
            {timeAgo(entry.date)}
          </span>
          <div
            dangerouslySetInnerHTML={{ __html: entry.html }}
            style={{ lineHeight: 1.7 }}
            className="journal-content"
          />
        </div>
      ))}

      {loadedCount < entries.length && (
        <button
          onClick={loadMore}
          style={{
            display: 'block', margin: '2rem auto', padding: '0.8rem 2rem',
            background: theme.glowGreen, color: '#fff', border: 'none',
            borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Load More ({entries.length - loadedCount} remaining)
        </button>
      )}

      {!loading && entries.length === 0 && (
        <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>No journal entries found. Check back soon.</p>
      )}

      <style>{`
        .journal-content h1 { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: ${theme.heading}; margin: 1.5rem 0 1rem; }
        .journal-content h2 { font-family: 'Playfair Display', serif; font-size: 1.3rem; color: ${theme.heading}; margin: 2rem 0 0.8rem; }
        .journal-content h3 { font-size: 1.05rem; font-weight: 600; color: ${theme.heading}; margin: 1.5rem 0 0.5rem; }
        .journal-content blockquote { border-left: 3px solid ${theme.glowGreen}; padding: 0.8rem 1.2rem; margin: 1.5rem 0; background: ${theme.cardBg}; border-radius: 0 6px 6px 0; color: ${theme.bodyMuted}; font-style: italic; }
        .journal-content a { color: ${theme.glowGreen}; }
        .journal-content code { font-family: 'JetBrains Mono', monospace; font-size: 0.85em; background: ${theme.bgMid}; padding: 0.15em 0.4em; border-radius: 3px; }
        .journal-content hr { border: none; border-top: 1px solid ${theme.border}; margin: 2rem 0; }
      `}</style>
    </Prose>
  );
}
