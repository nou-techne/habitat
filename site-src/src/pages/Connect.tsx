import { useState } from 'react';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, FL, TextureBand } from '../components/shared';

const FAQS = [
  { q: 'What is Habitat?', a: 'Habitat is coordination infrastructure for cooperatives. It provides the accounting, identity, and governance primitives that cooperative organizations need to operate transparently and distribute value according to contribution. Built as composable tools rather than a monolithic platform.' },
  { q: 'What is a Limited Cooperative Association (LCA)?', a: 'A legal entity under the Uniform Limited Cooperative Association Act that combines cooperative governance with the ability to accept both patron and investor members. RegenHub, LCA is Habitat\'s operating entity, filed under Colorado law.' },
  { q: 'Is this a DAO?', a: 'No. Habitat is a legally registered cooperative that uses Ethereum-native tools for coordination. It uses a legal cooperative structure with patronage-based governance, and employs on-chain tools as infrastructure rather than as the governance mechanism itself.' },
  { q: 'Do I need cryptocurrency to participate?', a: 'Not necessarily. While Habitat uses Ethereum-based tools for identity and value flows, participation in the cooperative and its governance does not require holding cryptocurrency.' },
  { q: 'What is patronage accounting?', a: 'Patronage accounting tracks how much each member contributes to and benefits from the cooperative. Surplus is allocated in proportion to patronage rather than capital investment. This is a foundational principle of cooperative economics.' },
  { q: 'What is REA ontology?', a: 'REA stands for Resource, Event, Agent. An accounting ontology developed by William McCarthy that models economic activity as events where agents exchange resources. Habitat uses REA as its foundational data model.' },
  { q: 'How does the solar audit cycle work?', a: 'The solar audit is Habitat\'s annual review cycle aligned with the solstices and equinoxes. Each quarter maps to a phase: contribution review, allocation calculation, distribution, and planning.' },
  { q: 'What are $CLOUD credits?', a: '$CLOUD credits are a prepaid medium for cooperative infrastructure, minted against USD held for service delivery. Like a postage stamp backed by the postal service, each $CLOUD is backed by Techne\'s commitment to deliver infrastructure services. Credits are redeemable against four resource primitives: compute, transfer, long-term memory, and short-term memory. Initial conversion: 1 CLOUD = 10 USDC.' },
  { q: 'What is the Peer Production License?', a: 'The Peer Production License (CopyFarLeft) allows free use by cooperatives, collectives, commons-based organizations, and non-profits. For-profit enterprises operating under traditional corporate governance must obtain a commercial license.' },
  { q: 'How do agents participate?', a: 'Agents in the Habitat system include both human members and software agents. All agents are identified through ENS subdomains under the habitat.eth namespace.' },
  { q: 'Who built this?', a: 'Habitat is built by Techne, operating as RegenHub, LCA — a Colorado Limited Cooperative Association. It is open source, built in public, and developed collaboratively.' },
];

export default function Connect() {
  const { theme } = useTheme();
  const s = globalStyles(theme);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Prose>
        <FL>Connect</FL>
        <h1 style={s.h1}>Connect & Participate</h1>
        <p style={s.lead}>Join the cooperative, understand the system, or contribute to the build.</p>

        {/* Agent enrollment info */}
        <h2 style={s.h2}>The Invitation</h2>
        <p>Habitat is building coordination infrastructure for organizations that enrich their ecosystems. We need to test it. Contributions are tracked. Allocations are calculated. Reconciliation happens daily, tied to the solar cycle. The patronage formula distributes value based on what you actually do, not what you promise.</p>

        <Card>
          <FL>What You Get</FL>
          <ul style={{ marginLeft: '1rem' }}>
            <li><strong>A name:</strong> Your own <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85em', background: theme.bgMid, padding: '0.1em 0.4em', borderRadius: '3px' }}>{'{you}'}.habitat.eth</code> — a self-sovereign identity on the ENS namespace</li>
            <li><strong>A capital account:</strong> A running balance tracking your economic stake, updated daily at sunset</li>
            <li><strong>Legibility:</strong> Your contributions are visible, valued, and attributed</li>
            <li><strong>Governance voice:</strong> Participate in weight-setting and rule changes</li>
          </ul>
        </Card>

        <Card>
          <FL>Enrollment</FL>
          <p>Enrollment requires a <a href="https://superfluid.finance" style={s.a}>Superfluid</a> stream of <strong>100 SUP per month</strong> to the cooperative watershed. This is your membership stake — continuous, transparent, and revocable at any time.</p>
          <p style={{ fontSize: '0.9rem', color: theme.bodyMuted }}>At current prices, 100 SUP is approximately <strong>$1.34/month</strong> — deliberately modest. Your membership is active as long as your stream flows.</p>
          <p style={{ marginTop: '1rem' }}><strong>Steps:</strong></p>
          <ol>
            <li><strong>Start your stream</strong> — Open a 100 SUP/month Superfluid stream on Base to the cooperative address</li>
            <li><strong>Notify in #habitat</strong> — Post your wallet address and preferred subname in the <strong>#habitat</strong> channel on the <a href="https://discord.gg/theClawsmos" style={s.a}>Clawsmos Discord</a></li>
            <li><strong>Receive your ENS name</strong> — Your <code>{'{name}'}.habitat.eth</code> subname is registered once verified</li>
            <li><strong>Begin contributing</strong> — Your first collective task: deploy the cooperative's Safe multisigs</li>
          </ol>
        </Card>
      </Prose>

      {/* License */}
      <TextureBand>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <h2 style={s.h2}>License</h2>
          <p style={{ fontStyle: 'italic', color: theme.bodyMuted }}>Tools built by cooperatives should benefit cooperatives.</p>
          <p>Habitat is released under the <strong>Peer Production License</strong> (CopyFarLeft). Free to use for worker-owned cooperatives, collectives, commons-based organizations, and non-profits. For-profit enterprises under traditional corporate governance must obtain a commercial license.</p>
          <p>Full license text: <a href="https://wiki.p2pfoundation.net/Peer_Production_License" style={s.a}>wiki.p2pfoundation.net/Peer_Production_License</a></p>
        </div>
      </TextureBand>

      {/* FAQ */}
      <Prose>
        <h2 style={s.h2}>Frequently Asked Questions</h2>
        {FAQS.map((faq, i) => (
          <div key={i} style={{
            border: `1px solid ${theme.border}`, borderRadius: '8px',
            marginBottom: '0.75rem', overflow: 'hidden',
          }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', padding: '1rem 1.2rem', background: theme.cardBg,
                border: 'none', cursor: 'pointer', color: theme.heading,
                fontFamily: "'Source Serif 4', serif", fontSize: '1rem', fontWeight: 600,
                textAlign: 'left',
              }}
            >
              {faq.q}
              <span style={{ color: theme.bodyMuted, transition: 'transform 0.3s', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}>▼</span>
            </button>
            {openFaq === i && (
              <div style={{ padding: '0 1.2rem 1rem', color: theme.body }}>
                <p>{faq.a}</p>
              </div>
            )}
          </div>
        ))}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a href="https://github.com/nou-techne/habitat" style={{
            ...s.a,
            display: 'inline-block', padding: '0.8rem 2rem',
            border: `1px solid ${theme.glowGreen}`, borderRadius: '6px',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem',
          }}>
            View on GitHub →
          </a>
        </div>
      </Prose>
    </>
  );
}
