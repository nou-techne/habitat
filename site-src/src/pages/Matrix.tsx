import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, FL } from '../components/shared';
import { Grid3x3 } from 'lucide-react';

export default function Matrix() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  // Simplified matrix representation
  const archetypes = [
    { x: -3, y: -3, label: 'Deep Commons', desc: 'Fully dispersed governance with maximum ecosystem enrichment.' },
    { x: 0, y: 0, label: 'Self-Governed Neutral', desc: 'Balanced governance with neutral systemic impact.' },
    { x: 3, y: 3, label: 'Monopoly Extractor', desc: 'Maximum governance concentration with maximum extraction.' },
    { x: -2, y: -2, label: 'Cooperative', desc: 'Dispersed governance, net contributor to ecosystem.' },
    { x: 2, y: 2, label: 'Platform Capture', desc: 'Concentrated governance, extractive relationship.' },
    { x: -1, y: 1, label: 'Commons Tragedy', desc: 'Dispersed governance but extractive relationship.' },
    { x: 1, y: -1, label: 'Benevolent Monopoly', desc: 'Concentrated governance but enriching relationship.' },
  ];

  return (
    <Prose>
      <FL>Framework</FL>
      <h1 style={s.h1}>
        <Grid3x3 size={24} strokeWidth={1.5} color={theme.glowGreen} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
        Economic Habitat Matrix
      </h1>
      <p style={s.lead}>49 organizational archetypes mapped across governance orientation and systemic relationship.</p>

      <h2 style={s.h2}>Reading the Axes</h2>
      <p><strong>X: Governance Orientation.</strong> Does this entity concentrate decision-making capacity (right) or disperse it into the ecosystem (left)?</p>
      <p><strong>Y: Systemic Relationship.</strong> Does this entity strengthen habitat carrying capacity (bottom) or deplete it (top)?</p>

      {/* Simple grid visualization */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px',
        margin: '2rem 0', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto',
      }}>
        {Array.from({ length: 49 }, (_, i) => {
          const x = (i % 7) - 3;
          const y = 3 - Math.floor(i / 7);
          const health = -(x + y) / 6;
          const archetype = archetypes.find(a => a.x === x && a.y === y);
          const hue = health > 0 ? 120 : health < 0 ? 0 : 60;
          const sat = Math.abs(health) * 50;
          return (
            <div
              key={i}
              title={archetype ? `${archetype.label}: ${archetype.desc}` : `(${x}, ${y})`}
              style={{
                aspectRatio: '1', borderRadius: '4px',
                background: `hsla(${hue}, ${sat}%, ${theme.bg === '#121410' ? 30 : 70}%, ${0.3 + Math.abs(health) * 0.5})`,
                border: `1px solid ${archetype ? theme.glowGreen : theme.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.55rem', color: theme.bodyMuted, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {archetype ? '●' : ''}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '500px', margin: '0 auto', fontSize: '0.75rem', color: theme.bodyMuted, fontFamily: "'JetBrains Mono', monospace" }}>
        <span>← dispersive</span>
        <span>Governance Orientation</span>
        <span>concentrative →</span>
      </div>

      <h2 style={s.h2}>Key Archetypes</h2>
      {archetypes.map(a => (
        <div key={a.label} style={{ padding: '0.8rem 0', borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ color: theme.heading }}>{a.label}</strong>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: theme.bodyMuted }}>
              ({a.x > 0 ? '+' : ''}{a.x}, {a.y > 0 ? '+' : ''}{a.y})
            </span>
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: theme.bodyMuted }}>{a.desc}</p>
        </div>
      ))}

      <h2 style={s.h2}>The Ecological Frame</h2>
      <p>Most organizational infrastructure is designed for the competitive zone. It tracks extraction well and contribution poorly. An organization that wants to operate in the contributive or mutualistic zones finds that the tools available were built for a different ecological niche.</p>
      <p>Habitat is economic sensory apparatus: it helps organizations perceive their relationship to the ecosystems they inhabit, and act accordingly.</p>
    </Prose>
  );
}
