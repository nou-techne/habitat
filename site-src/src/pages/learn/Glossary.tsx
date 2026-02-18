import { useTheme } from '../../ThemeContext';
import { globalStyles } from '../../styles';
import { Prose, FL } from '../../components/shared';

const TERMS = [
  { term: '704(b) Compliance', def: 'The IRS regulation under Subchapter K that governs how partnership allocations must have "substantial economic effect." Habitat\'s patronage formulas are designed to satisfy 704(b) requirements.' },
  { term: 'Capital Account', def: 'A ledger tracking each member\'s economic interest in the cooperative. Capital accounts are adjusted by contributions, allocations of income or loss, and distributions.' },
  { term: 'Composable Tools', def: 'Software components designed to be assembled in different configurations for different contexts, rather than delivered as a monolithic platform.' },
  { term: 'Contribution Lifecycle', def: 'The full arc of a contribution from initiation through verification to allocation. Every contribution passes through stages: proposal, execution, attestation, and recording.' },
  { term: 'Deficit Restoration Obligation (DRO)', def: 'A member\'s obligation to restore a negative capital account balance upon liquidation. DROs ensure that allocations of loss have real economic consequences.' },
  { term: 'Economic Habitat Matrix', def: 'The two-axis framework mapping organizations by governance orientation (concentrate vs. disperse) and systemic relationship (deplete vs. enrich).' },
  { term: 'ENS (Ethereum Name Service)', def: 'A decentralized naming system on Ethereum. Habitat uses ENS subdomains under habitat.eth as the identity layer for all agents.' },
  { term: 'Event Sourcing', def: 'An architectural pattern where state changes are stored as a sequence of immutable events rather than overwriting current state.' },
  { term: 'Grant Pool (pool.habitat.eth)', def: 'The Ethereum address that holds funds designated for ecosystem grants, governed by patronage-weighted decisions.' },
  { term: 'Limited Cooperative Association (LCA)', def: 'A legal entity combining cooperative governance with the ability to accept both patron and investor members. RegenHub, LCA is filed under Colorado law.' },
  { term: 'Patronage', def: 'The measure of a member\'s economic participation in the cooperative. Surplus is allocated in proportion to patronage rather than capital investment.' },
  { term: 'Patronage Formula', def: 'The mathematical formula that converts recorded contributions into patronage allocations. Must satisfy 704(b) substantial economic effect requirements.' },
  { term: 'Peer Production License', def: 'A CopyFarLeft license permitting free use by cooperatives, collectives, and non-profits while requiring for-profit enterprises to obtain a commercial license.' },
  { term: 'Qualified Income Offset (QIO)', def: 'A provision allowing members who receive unexpected allocations that create a deficit to be allocated income to offset that deficit.' },
  { term: 'REA (Resource, Event, Agent)', def: 'An accounting ontology by William McCarthy. Models economic activity as events where agents exchange resources. Habitat uses REA as its foundational data model.' },
  { term: '$CLOUD Credits', def: 'A prepaid credit minted against USD held for service delivery, redeemable against four resource primitives. 1 CLOUD = 10 USDC.' },
  { term: 'Seven Progressive Design Patterns', def: 'The foundational decomposition: Identity, State, Relationship, Event, Flow, Constraint, and View. Each layer depends on those beneath it.' },
  { term: 'Solar Audit', def: 'Habitat\'s annual review cycle aligned with solstices and equinoxes. Each quarter corresponds to a phase of the audit.' },
  { term: 'Subchapter K', def: 'The section of the Internal Revenue Code governing taxation of partnerships and their partners.' },
  { term: 'Superfluid', def: 'An Ethereum protocol for programmable money streams — continuous, real-time token transfers. Habitat uses Superfluid for streaming patronage distributions.' },
  { term: 'Watershed (watershed.habitat.eth)', def: 'The primary operational Ethereum address for Habitat. Manages the core treasury and coordination flows.' },
];

export default function Glossary() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <FL>Reference</FL>
      <h1 style={s.h1}>Glossary</h1>
      <p style={s.lead}>Key terms used throughout the Habitat system.</p>

      <dl>
        {TERMS.map(t => (
          <div key={t.term} style={{ padding: '1.2rem 0', borderBottom: `1px solid ${theme.border}` }}>
            <dt style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.heading, marginBottom: '0.3rem' }}>{t.term}</dt>
            <dd style={{ margin: 0, color: theme.bodyMuted, lineHeight: 1.7 }}>{t.def}</dd>
          </div>
        ))}
      </dl>
    </Prose>
  );
}
