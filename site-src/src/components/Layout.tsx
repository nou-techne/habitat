import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/agents', label: 'Agents' },
  { to: '/journal', label: 'Journal' },
];

const LEARN_ITEMS = [
  { to: '/thesis', label: 'Thesis' },
  { to: '/patterns', label: 'Patterns' },
  { to: '/matrix', label: 'Matrix' },
  { to: '/glossary', label: 'Glossary' },
  { to: '/case-study', label: 'Example Case' },
];

const SYSTEM_ITEMS = [
  { to: '/patronage', label: 'Patronage' },
  { to: '/identity', label: 'Identity' },
  { to: '/compliance', label: 'Compliance' },
  { to: '/license', label: 'License' },
];

export default function Layout() {
  const { theme, isDark, toggle } = useTheme();
  const s = globalStyles(theme);
  const loc = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const learnRef = useRef<HTMLDivElement>(null);
  const systemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setLearnOpen(false);
    setSystemOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (learnRef.current && !learnRef.current.contains(e.target as Node)) {
        setLearnOpen(false);
      }
      if (systemRef.current && !systemRef.current.contains(e.target as Node)) {
        setSystemOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const isActive = (path: string) => loc.pathname === path || (path !== '/' && loc.pathname.startsWith(path));
  const isLearnActive = () => LEARN_ITEMS.some(item => isActive(item.to));
  const isSystemActive = () => SYSTEM_ITEMS.some(item => isActive(item.to));

  return (
    <div style={s.body as any}>
      {/* Grain overlay for dark mode */}
      {isDark && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none', zIndex: 9999, opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
      )}

      {/* Nav */}
      <nav style={s.nav}>
        <Link to="/" style={s.logo}>Habitat</Link>
        
        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: 'none', background: 'none', border: 'none',
            color: theme.heading, fontSize: '1.5rem', cursor: 'pointer',
          }}
          className="hamburger"
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        <div style={{
          ...s.navLinks,
          ...(mobileOpen ? {
            display: 'flex', flexDirection: 'column' as const,
            position: 'absolute' as const, top: '100%', left: 0, right: 0,
            background: theme.bg, padding: '1rem 2rem',
            borderBottom: `1px solid ${theme.border}`,
          } : {}),
        }} className="nav-links">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                ...s.navLink,
                ...(isActive(item.to) ? s.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
          
          {/* Learn dropdown */}
          <div ref={learnRef} style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setLearnOpen(!learnOpen); setSystemOpen(false); }}
              style={{
                ...s.navLink,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: 0,
                ...(isLearnActive() ? s.navLinkActive : {}),
              }}
            >
              Learn <span style={{ fontSize: '0.6rem' }}>▼</span>
            </button>
            {learnOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: '-1rem',
                background: theme.cardBg, border: `1px solid ${theme.border}`,
                borderRadius: '6px', padding: '0.5rem 0', minWidth: '160px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 200,
              }}>
                {LEARN_ITEMS.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'block', padding: '0.5rem 1.2rem',
                      color: isActive(item.to) ? theme.glowGreen : theme.body,
                      textDecoration: 'none', fontSize: '0.85rem',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* System dropdown */}
          <div ref={systemRef} style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setSystemOpen(!systemOpen); setLearnOpen(false); }}
              style={{
                ...s.navLink,
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: 0,
                ...(isSystemActive() ? s.navLinkActive : {}),
              }}
            >
              System <span style={{ fontSize: '0.6rem' }}>▼</span>
            </button>
            {systemOpen && (
              <div style={{
                position: 'absolute', top: '100%', left: '-1rem',
                background: theme.cardBg, border: `1px solid ${theme.border}`,
                borderRadius: '6px', padding: '0.5rem 0', minWidth: '160px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 200,
              }}>
                {SYSTEM_ITEMS.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    style={{
                      display: 'block', padding: '0.5rem 1.2rem',
                      color: isActive(item.to) ? theme.glowGreen : theme.body,
                      textDecoration: 'none', fontSize: '0.85rem',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            style={{
              background: 'none', border: `1px solid ${theme.border}`,
              borderRadius: '50%', width: '32px', height: '32px',
              cursor: 'pointer', color: theme.glowGreen,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem',
            }}
            aria-label="Toggle theme"
          >
            {isDark ? '☀' : '☽'}
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <a href="https://github.com/nou-techne/habitat" style={s.a}>GitHub</a>
          <Link to="/about" style={s.a}>About</Link>
          <Link to="/faq" style={s.a}>FAQ</Link>
          <Link to="/glossary" style={s.a}>Glossary</Link>
          <Link to="/case-study" style={s.a}>Example Case</Link>
          <Link to="/license" style={s.a}>License</Link>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: theme.bodyMuted }}>
          Where the Great Plains meet the Rocky Mountains, 5,430 feet
        </div>
        <div style={{ fontSize: '0.75rem', color: theme.bodyMuted, marginTop: '0.3rem' }}>
          © 2026 Techne / RegenHub, LCA
        </div>
      </footer>

      {/* Mobile CSS */}
      <style>{`
        @media (max-width: 768px) {
          .hamburger { display: block !important; }
          .nav-links { display: ${mobileOpen ? 'flex' : 'none'} !important; }
        }
      `}</style>
    </div>
  );
}
