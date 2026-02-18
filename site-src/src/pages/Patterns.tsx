import { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, FL } from '../components/shared';

const PATTERNS = [
  { num: 1, name: 'Identity', desc: 'Distinguishing one thing from another. Without identity, nothing else is possible.', habitat: 'Member UUIDs, ENS names (alice.habitat.eth), account codes, transaction IDs', general: 'Product SKUs, customer IDs, order numbers, user handles' },
  { num: 2, name: 'State', desc: 'Recording attributes of identifiable things. Once you can distinguish entities, you can describe them.', habitat: 'Member profiles, account balances, contribution amounts, operating agreement versions', general: 'Product prices, inventory levels, customer addresses, profile bios' },
  { num: 3, name: 'Relationship', desc: 'Connecting identifiable things to each other. Systems emerge from relationships.', habitat: 'REA ontology (Event connects Resource to Agent), member-to-contribution links, parent-child accounts', general: 'Product-to-category, order-to-customer, follower relationships' },
  { num: 4, name: 'Event', desc: 'Recording that something happened at a point in time. Events are immutable facts.', habitat: 'ContributionApproved, TransactionRecorded, AllocationApplied, PeriodClosed', general: 'OrderPlaced, PaymentProcessed, ItemShipped, PostPublished' },
  { num: 5, name: 'Flow', desc: 'Value or information moving between agents. Flows create the dynamics of a system.', habitat: 'Patronage allocation, $CLOUD credit distribution, event bus messages, capital account changes', general: 'Money from customer to merchant, inventory from warehouse, notifications' },
  { num: 6, name: 'Constraint', desc: 'Rules governing valid states and transitions. Constraints define what the system allows.', habitat: 'IRC 704(b) compliance, double-entry accounting, formula weight sum = 1.0, period sequential integrity', general: 'Stock cannot go negative, password requirements, age restrictions' },
  { num: 7, name: 'View', desc: 'Presenting information for a purpose. Views make the system legible to humans.', habitat: 'Member allocation statements, balance sheets, K-1 tax forms, the Habitat homepage', general: 'Shopping cart display, analytics dashboards, search results' },
];

export default function Patterns() {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  const [active, setActive] = useState<number | null>(null);

  return (
    <Prose>
      <FL>Patterns</FL>
      <h1 style={s.h1}>Pattern Library</h1>
      <p style={s.lead}>The seven progressive design patterns that compose all information systems. A practical framework for building coordination infrastructure.</p>

      <h2 style={s.h2}>The Stack</h2>
      <p>Every information system is built from a finite set of design patterns, layered in a progressive order. Each layer depends on the ones beneath it. Click a layer to explore.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '2rem 0' }}>
        {[...PATTERNS].reverse().map(p => (
          <button
            key={p.num}
            onClick={() => setActive(active === p.num ? null : p.num)}
            style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.2rem', background: active === p.num ? theme.cardBg : 'transparent',
              border: `1px solid ${active === p.num ? theme.glowGreen : theme.border}`,
              borderRadius: '6px', cursor: 'pointer', color: theme.heading,
              textAlign: 'left', width: '100%', transition: 'all 0.2s',
            }}
          >
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '1.2rem', fontWeight: 700,
              color: active === p.num ? theme.glowGreen : theme.bodyMuted, width: '28px',
            }}>
              {p.num}
            </span>
            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{p.name}</span>
          </button>
        ))}
      </div>

      {active && (() => {
        const p = PATTERNS.find(x => x.num === active)!;
        return (
          <Card>
            <h3 style={{ ...s.h3, marginTop: 0, color: theme.glowGreen }}>{p.num}. <strong>{p.name}</strong></h3>
            <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>{p.desc}</p>
            <FL>Habitat Examples</FL>
            <p>{p.habitat}</p>
            <FL>General Examples</FL>
            <p style={{ marginBottom: 0 }}>{p.general}</p>
          </Card>
        );
      })()}

      {!active && (
        <Card>
          <p style={{ color: theme.bodyMuted, fontStyle: 'italic', margin: 0 }}>
            Click a layer above to see how it appears in the Habitat system and in general software.
          </p>
        </Card>
      )}
    </Prose>
  );
}
