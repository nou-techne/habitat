import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, TextureBand, Card, FL, BioDot } from '../components/shared';

export default function Home() {
  const { theme, isDark } = useTheme();
  const s = globalStyles(theme);

  return (
    <>
      {/* Hero */}
      <div style={{
        textAlign: 'center', padding: '6rem 2rem',
        background: isDark
          ? 'radial-gradient(ellipse at 30% 40%, rgba(124,200,104,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(88,200,168,0.04) 0%, transparent 50%)'
          : 'radial-gradient(ellipse at 30% 40%, rgba(93,164,72,0.06) 0%, transparent 60%)',
      }}>
        <h1 style={{ ...s.h1, fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', marginBottom: '1.5rem' }}>
          Habitat
        </h1>
        <p style={{ ...s.lead, maxWidth: '600px', margin: '0 auto', fontSize: '1.2rem' }}>
          Composable coordination infrastructure for organizations that enrich their ecosystems.
        </p>
      </div>

      <Prose>
        <h2 style={s.h2}>The Problem</h2>
        <p>Organizations can't see their own economic relationships. The accounting tools they rely on were built to track extraction — revenue captured, costs minimized, value concentrated. For any organization trying to do something different — a cooperative, a land trust, a mutual aid network — the tools available were designed for a different game entirely.</p>
        <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>When your tools can only measure extraction, extraction is all you can manage.</p>
      </Prose>

      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <h2 style={s.h2}>The Insight</h2>
          <p>Tools shape what you can see. What you can see determines whether you extract or enrich.</p>
          <p>An organization that wants to distribute governance, track contributions fairly, and strengthen the ecosystem it operates within needs tools built for that purpose. Not a spreadsheet adapted from corporate finance. Not a DAO dashboard with no legal standing. Infrastructure designed from the ground up for organizations that care about <em>how</em> value flows, not just <em>how much</em>.</p>
        </div>
      </TextureBand>

      <Prose>
        <h2 style={s.h2}>What is Habitat</h2>
        <p>Three concentric layers of coordination infrastructure, each building on the one inside it:</p>

        <Card>
          <FL>Layer 1</FL>
          <h3 style={s.h3}><BioDot /> Patronage Accounting</h3>
          <p>Capital accounts, contribution tracking, and allocation calculations that satisfy IRC Section 704(b) compliance. The legal heartbeat of a cooperative — who contributed what, and how does value flow back? Built to the most rigorous standard first, so simpler organizations use simpler configurations of the same tools.</p>
        </Card>

        <Card>
          <FL>Layer 2</FL>
          <h3 style={s.h3}><BioDot color={theme.glowCyan} /> Composable Tools</h3>
          <p>Independent, event-sourced tools — Treasury, People, Agreements — unified by <Link to="/learn/rea" style={s.a}>REA ontology</Link>. Each tool solves one problem well. Together they compose into organizational infrastructure that makes economic relationships legible.</p>
        </Card>

        <Card>
          <FL>Layer 3</FL>
          <h3 style={s.h3}><BioDot color={theme.accentOrange} /> $CLOUD Credits</h3>
          <p>A prepaid medium for cooperative infrastructure, minted against USD held for service delivery. Four resource primitives — compute, transfer, long-term memory, short-term memory. Like a postage stamp: backed by the commitment to perform, not by speculation. 1 CLOUD = 10 USDC.</p>
        </Card>

        <h2 style={s.h2}>$CLOUD Credits</h2>
        <p style={{ color: theme.bodyMuted }}>A prepaid credit minted against USD held for service delivery. Backed by Techne's commitment to perform — like a postage stamp backed by the postal service's commitment to deliver mail.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
          {[
            { name: 'Compute', desc: 'CPU cycles, inference calls, function execution.' },
            { name: 'Transfer', desc: 'Bandwidth, API calls, network egress.' },
            { name: 'Long-Term Memory', desc: 'Object storage, document archives, vector embeddings.' },
            { name: 'Short-Term Memory', desc: 'Cache, session state, hot storage.' },
          ].map(c => (
            <Card key={c.name}>
              <h3 style={{ ...s.h3, marginTop: 0, fontSize: '1rem' }}>{c.name}</h3>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>{c.desc}</p>
            </Card>
          ))}
        </div>

        <h2 style={s.h2}>The Ecological Frame</h2>
        <p>Organizations exist within economic ecosystems. Their behavior maps along two axes: governance orientation (concentrate or disperse decision-making?) and systemic relationship (deplete or enrich the habitat?).</p>
        <p>Habitat is economic sensory apparatus: it helps organizations perceive their relationship to the ecosystems they inhabit, and act accordingly.</p>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/learn/thesis" style={{
            ...s.a,
            display: 'inline-block',
            padding: '0.8rem 2rem',
            border: `1px solid ${theme.glowGreen}`,
            borderRadius: '6px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.85rem',
          }}>
            Read the Thesis →
          </Link>
        </div>
      </Prose>
    </>
  );
}
