import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import type { CSSProperties } from 'react';

export function FL({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  return <div style={s.fl}>{children}</div>;
}

export function BioDot({ color }: { color?: string }) {
  const { theme } = useTheme();
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: color || theme.glowGreen,
      marginRight: '0.5rem', verticalAlign: 'middle',
      boxShadow: `0 0 6px ${color || theme.glowGreen}40`,
    }} />
  );
}

export function SectionHeading({ label, children }: { label?: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  return (
    <div>
      {label && <FL>{label}</FL>}
      <h2 style={s.h2}>{children}</h2>
    </div>
  );
}

export function TextureBand({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  const { theme, isDark } = useTheme();
  return (
    <div style={{
      background: isDark
        ? 'linear-gradient(135deg, #1a2018 0%, #121410 100%)'
        : 'linear-gradient(135deg, #e8e2d6 0%, #f0ebe2 100%)',
      padding: '4rem 2rem',
      borderTop: `1px solid ${theme.border}`,
      borderBottom: `1px solid ${theme.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  return <div style={{ ...s.card, ...style }}>{children}</div>;
}

export function Prose({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  return <div style={s.prose}>{children}</div>;
}
