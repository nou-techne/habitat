import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, FL } from '../components/shared';

const STEPS = [
  { agent: 'Alice (Member)', event: '—', resource: '—', title: 'Step 1: Agent', text: 'Alice is a member of the cooperative. She\'s an Agent with economic interests in the system.' },
  { agent: 'Alice (Member)', event: 'Contribution Submitted', resource: '—', title: 'Step 2: Event Created', text: 'Alice submits a contribution: 12 hours of labor on member onboarding. This creates an Event — a record that something economic happened.' },
  { agent: 'Alice (Member)', event: 'Contribution Submitted', resource: 'Labor: 12 hours @ $50/hr', title: 'Step 3: Resource Identified', text: 'The event is valued: 12 hours × $50/hr = $600. The Resource is labor, quantified and ready to flow.' },
  { agent: 'Alice (Member) — Capital: +$600', event: 'Contribution Approved', resource: 'Labor: $600 credited', title: 'Step 4: Resource Flows', text: 'The contribution is approved. The resource flows back to the agent. Alice\'s capital account increases by $600. REA captures the full cycle.' },
];

export default function REA() {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <Prose>
      <FL>Interactive</FL>
      <h1 style={s.h1}>REA: Interactive Diagram</h1>
      <p style={s.lead}>Resource, Event, Agent — the three primitives that make economic relationships machine-readable.</p>

      {/* Diagram */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '2rem 0', flexWrap: 'wrap' }}>
        {[
          { label: 'Agent', value: current.agent, color: theme.glowCyan },
          { label: 'Event', value: current.event, color: theme.accentOrange },
          { label: 'Resource', value: current.resource, color: theme.glowGreen },
        ].map((node, i) => (
          <div key={node.label} style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: node.color, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.8rem', color: '#fff',
              fontSize: '1.5rem', fontWeight: 700,
              boxShadow: step >= i ? `0 0 16px ${node.color}40` : 'none',
              opacity: step >= i ? 1 : 0.3, transition: 'all 0.3s',
            }}>
              {node.label[0]}
            </div>
            <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{node.label}</div>
            <div style={{ fontSize: '0.85rem', color: theme.bodyMuted, minHeight: '2.5rem' }}>{node.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={{
          padding: '0.6rem 1.2rem', marginRight: '0.5rem',
          background: theme.bgMid, border: `1px solid ${theme.border}`,
          borderRadius: '6px', cursor: 'pointer', color: theme.body,
          opacity: step === 0 ? 0.5 : 1,
        }}>Previous</button>
        <button onClick={() => setStep(step < STEPS.length - 1 ? step + 1 : 0)} style={{
          padding: '0.6rem 1.2rem', background: theme.glowGreen,
          color: '#fff', border: 'none', borderRadius: '6px',
          cursor: 'pointer', fontWeight: 600,
        }}>{step === STEPS.length - 1 ? 'Restart' : 'Next Step'}</button>
      </div>

      <Card>
        <h3 style={{ ...s.h3, marginTop: 0, color: theme.glowGreen }}>{current.title}</h3>
        <p style={{ margin: 0 }}>{current.text}</p>
      </Card>

      <h2 style={s.h2}>Why REA Matters</h2>
      <p>Traditional accounting records transactions as journal entries (debits and credits). REA records the <em>meaning</em> behind the transaction: who did what, with what resources, and why.</p>
      <p>This makes economic relationships machine-readable. The system doesn't just know Alice's balance increased by $600 — it knows she contributed labor, at what rate, for what purpose.</p>
      <ul>
        <li>Patronage allocation based on contribution type and value</li>
        <li>Audit trails that humans can understand</li>
        <li>Cross-organizational data exchange</li>
        <li>Intelligent querying without custom code</li>
      </ul>

      <h2 style={s.h2}>Further Reading</h2>
      <ul>
        <li><Link to="/patterns" style={s.a}>Pattern Library</Link> — REA sits at Layer 3 (Relationship)</li>
        <li><Link to="/patronage" style={s.a}>Patronage Accounting</Link> — How REA enables cooperative patronage systems</li>
        <li><a href="https://en.wikipedia.org/wiki/Resources,_events,_agents_(accounting_model)" style={s.a}>REA on Wikipedia</a></li>
      </ul>
    </Prose>
  );
}
