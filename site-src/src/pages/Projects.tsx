import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, FL, BioDot, TextureBand } from '../components/shared';

export default function Projects() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <>
      <Prose>
        <FL>Projects</FL>
        <h1 style={s.h1}>System & Projects</h1>
        <p style={s.lead}>The infrastructure layers and applied ventures that compose Habitat's coordination stack.</p>
      </Prose>

      {/* Patronage */}
      <Prose>
        <h2 style={s.h2}><BioDot /> Patronage Accounting</h2>
        <p>In a corporation, your share of profits is determined by how many shares you own. In a cooperative, it's determined by <em>patronage</em>: your actual contribution during the period. Work more, contribute more, bring in more revenue? Your share reflects that.</p>
        <p>Every member has a <strong>capital account</strong> — a running balance that tracks their economic stake. It goes up when you contribute or receive an allocation. It goes down when you receive a distribution or absorb a loss.</p>
        
        <Card>
          <FL>Contribution Categories</FL>
          <ul style={{ marginLeft: '1rem' }}>
            <li><strong>Labor</strong> — Tasks completed, sprints run, problems solved</li>
            <li><strong>Revenue</strong> — Value generated that flows back to the cooperative</li>
            <li><strong>Community</strong> — Governance engagement, mutual aid, shared spaces</li>
            <li><strong>Infrastructure</strong> — Uptime, availability, tools maintained</li>
          </ul>
          <p style={{ fontSize: '0.9rem', color: theme.bodyMuted, marginTop: '1rem' }}>Default weights: Labor 40%, Revenue 30%, Community 20%, Infrastructure 10%. Adjustable by governance.</p>
        </Card>

        <p>The system maintains <strong>dual-basis tracking</strong>: a book capital account (fair market value, for economic rights) and a tax capital account (cost basis, for IRS reporting). Both are updated from the same events, sometimes at different amounts. This dual-basis system is what makes the accounting compliant with IRC Section 704(b).</p>
      </Prose>

      {/* Identity */}
      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <h2 style={s.h2}><BioDot color={theme.glowCyan} /> Identity</h2>
          <p>Self-sovereign identity for cooperative networks. Habitat uses ENS as its identity layer. Every member gets a human-readable name under the cooperative's namespace.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', margin: '1.5rem 0' }}>
            {[
              { name: 'alice.habitat.eth', role: 'Member', desc: 'A member\'s identity within the cooperative' },
              { name: 'treasury.habitat.eth', role: 'Venture', desc: 'Tools and ventures get their own names' },
              { name: 'nou.habitat.eth', role: 'Agent', desc: 'Collective intelligence agents operate as named participants' },
            ].map(p => (
              <Card key={p.name} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem', color: theme.glowGreen }}>{p.name}</div>
                <div style={{ fontSize: '0.8rem', color: theme.bodyMuted, marginTop: '0.3rem' }}>{p.role}</div>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>{p.desc}</p>
              </Card>
            ))}
          </div>

          <p>The namespace is cooperatively governed — the cooperative controls issuance and revocation of subnames, but each member controls their own records. Self-sovereign identity within a collectively governed namespace.</p>
        </div>
      </TextureBand>

      {/* Compliance */}
      <Prose>
        <h2 style={s.h2}><BioDot color={theme.accentOrange} /> 704(b) Compliance</h2>
        <p>For a partnership (or LCA) allocation to have "substantial economic effect" under IRC Section 704(b), it must satisfy three requirements:</p>
        <ol>
          <li><strong>Capital account maintenance</strong> — properly track each partner's economic interest</li>
          <li><strong>Liquidation proceeds follow capital accounts</strong> — distributions match economic rights</li>
          <li><strong>Deficit restoration obligation (DRO) or qualified income offset (QIO)</strong> — protection against negative balances</li>
        </ol>
        <p>Habitat's patronage formulas are designed to satisfy these requirements, ensuring allocations reflect genuine economic activity.</p>
      </Prose>

      {/* Matrix */}
      <Prose>
        <h2 style={s.h2}>Economic Habitat Matrix</h2>
        <p>The two-axis framework mapping organizations by governance orientation (concentrate vs. disperse) and systemic relationship (deplete vs. enrich). Organizations exist within economic ecosystems. Their behavior maps along these two axes.</p>
        <p>Most organizational infrastructure is designed for the competitive zone. It tracks extraction well and contribution poorly. Habitat is designed for the mutualistic quadrant — dispersed governance, ecosystem enrichment.</p>
        <p><Link to="/learn/matrix" style={s.a}>Explore the interactive matrix →</Link></p>
      </Prose>

      {/* Root System */}
      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <h2 style={s.h2}>The Root System</h2>
          <p>The economy works precisely as designed. The design serves the wrong objectives. Here is what we are building instead.</p>
          <p>RegenHub, LCA was filed as a Colorado Limited Cooperative Association in February 2026. Techne Institute is its operational identity: a venture studio where the Great Plains meet the Rocky Mountains at 5,430 feet.</p>
          <p>The model is a venture studio, distributed not concentrated. Techne provides infrastructure — space, legal, planning, capital access — for autonomous ventures. The cooperative structure is the mechanism by which design principles are enacted.</p>
          
          <Card>
            <FL>Seven-Layer Pattern Stack</FL>
            {['Identity', 'State', 'Relationship', 'Event', 'Flow', 'Constraint', 'View'].map((layer, i) => (
              <div key={layer} style={{ display: 'flex', gap: '0.8rem', padding: '0.4rem 0', borderBottom: i < 6 ? `1px solid ${theme.border}` : 'none' }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem', color: theme.glowCyan, width: '20px' }}>{i + 1}</span>
                <span style={{ fontWeight: 600, color: theme.heading }}>{layer}</span>
              </div>
            ))}
          </Card>
        </div>
      </TextureBand>
    </>
  );
}
