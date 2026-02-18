import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, FL } from '../components/shared';

const CORE_CONCEPTS = [
  { term: 'Patronage', def: 'The measure of a member\'s economic participation in the cooperative. Patronage is the basis for surplus allocation rather than capital investment — you earn it through contribution, not just ownership.' },
  { term: 'Capital Account', def: 'A ledger tracking each member\'s economic interest in the cooperative. Capital accounts are adjusted by contributions, allocations of income or loss, and distributions.' },
  { term: 'Patronage Formula', def: 'The mathematical formula that converts recorded contributions into patronage allocations. The formula must satisfy 704(b) substantial economic effect requirements.' },
  { term: 'Contribution Lifecycle', def: 'The full arc of a contribution from initiation through verification to allocation. Every contribution passes through stages: proposal, execution, attestation, and recording.' },
  { term: 'Economic Habitat Matrix', def: 'The two-axis framework mapping organizations by governance orientation (concentrate vs. disperse) and systemic relationship (deplete vs. enrich). The matrix visualizes organizational archetypes in their ecological context.' },
  { term: 'REA (Resource, Event, Agent)', def: 'An accounting ontology by William McCarthy. REA models economic activity as events where agents exchange resources, capturing the semantic meaning behind transactions.' },
  { term: 'Seven Progressive Design Patterns', def: 'The foundational decomposition: Identity, State, Relationship, Event, Flow, Constraint, and View. Each layer depends on those beneath it, forming the pattern stack that underlies all information systems.' },
];

const TECHNICAL_TERMS = [
  { term: 'Composable Tools', def: 'Software components designed to be assembled in different configurations for different contexts, rather than delivered as a monolithic platform. Composable tools work independently but interoperate through shared ontologies.' },
  { term: 'Event Sourcing', def: 'An architectural pattern where state changes are stored as a sequence of immutable events rather than overwriting current state. Event sourcing provides complete audit trails and enables temporal queries.' },
  { term: 'ENS (Ethereum Name Service)', def: 'A decentralized naming system on Ethereum. Habitat uses ENS subdomains under habitat.eth as the identity layer for all agents.' },
  { term: 'Superfluid', def: 'An Ethereum protocol for programmable money streams — continuous, real-time token transfers. Habitat uses Superfluid for streaming patronage distributions and membership stakes.' },
  { term: '$CLOUD Credits', def: 'A prepaid credit minted against USD held for service delivery, redeemable against four resource primitives: compute, transfer, long-term memory, and short-term memory. $CLOUD serves as the cooperative medium of exchange — 1 CLOUD = 10 USDC.' },
  { term: 'Peer Production License', def: 'A CopyFarLeft license permitting free use by cooperatives, collectives, and non-profits while requiring for-profit enterprises to obtain a commercial license. The Peer Production License ensures tools built by cooperatives benefit cooperatives first.' },
  { term: 'Solar Audit', def: 'Annual review cycle aligned with solstices and equinoxes. Each quarter of the solar audit corresponds to a phase: contribution review, allocation calculation, distribution, and planning.' },
];

const INFRASTRUCTURE = [
  { term: 'Limited Cooperative Association (LCA)', def: 'A legal entity combining cooperative governance with the ability to accept both patron and investor members. RegenHub, LCA is the Habitat operating entity, filed under Colorado law.' },
  { term: 'Watershed (watershed.habitat.eth)', def: 'The primary operational Ethereum address for Habitat. Watershed manages the core treasury and coordination flows.' },
  { term: 'Grant Pool (pool.habitat.eth)', def: 'The Ethereum address that holds funds designated for ecosystem grants, governed by patronage-weighted decisions. The pool accumulates nighttime patronage allocations.' },
];

const COMPLIANCE = [
  { term: '704(b) Compliance', def: 'The IRS regulation under Subchapter K that governs how partnership allocations must have "substantial economic effect." Patronage formulas are designed to satisfy 704(b) requirements.' },
  { term: 'Deficit Restoration Obligation (DRO)', def: 'A member obligation to restore a negative capital account balance upon liquidation. DROs ensure that allocations of loss have real economic consequences.' },
  { term: 'Qualified Income Offset (QIO)', def: 'A provision allowing members who receive unexpected allocations that create a deficit to be allocated income to offset that deficit. The QIO provides protection against inadvertent negative balances.' },
  { term: 'Subchapter K', def: 'The section of the Internal Revenue Code governing taxation of partnerships and their partners. Subchapter K establishes the framework for patronage accounting in cooperatives structured as partnerships or LCAs.' },
];

export default function Glossary() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <FL>Reference</FL>
      <h1 style={s.h1}>Glossary</h1>
      <p style={s.lead}>Key terms used throughout the Habitat system.</p>

      <h2 style={{ ...s.h2, marginTop: '2rem', fontSize: '1.1rem', color: theme.glowGreen }}>Core Concepts</h2>
      <dl>
        {CORE_CONCEPTS.map(t => (
          <div key={t.term} style={{ padding: '1.2rem 0', borderBottom: `1px solid ${theme.border}` }}>
            <dt style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.heading, marginBottom: '0.3rem' }}>{t.term}</dt>
            <dd style={{ margin: 0, color: theme.bodyMuted, lineHeight: 1.7 }}>{t.def}</dd>
          </div>
        ))}
      </dl>

      <h2 style={{ ...s.h2, marginTop: '2rem', fontSize: '1.1rem', color: theme.glowGreen }}>Technical Terms</h2>
      <dl>
        {TECHNICAL_TERMS.map(t => (
          <div key={t.term} style={{ padding: '1.2rem 0', borderBottom: `1px solid ${theme.border}` }}>
            <dt style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.heading, marginBottom: '0.3rem' }}>{t.term}</dt>
            <dd style={{ margin: 0, color: theme.bodyMuted, lineHeight: 1.7 }}>{t.def}</dd>
          </div>
        ))}
      </dl>

      <h2 style={{ ...s.h2, marginTop: '2rem', fontSize: '1.1rem', color: theme.glowGreen }}>Infrastructure</h2>
      <dl>
        {INFRASTRUCTURE.map(t => (
          <div key={t.term} style={{ padding: '1.2rem 0', borderBottom: `1px solid ${theme.border}` }}>
            <dt style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.heading, marginBottom: '0.3rem' }}>{t.term}</dt>
            <dd style={{ margin: 0, color: theme.bodyMuted, lineHeight: 1.7 }}>{t.def}</dd>
          </div>
        ))}
      </dl>

      <h2 style={{ ...s.h2, marginTop: '2rem', fontSize: '1.1rem', color: theme.glowGreen }}>Compliance & Legal</h2>
      <dl>
        {COMPLIANCE.map(t => (
          <div key={t.term} style={{ padding: '1.2rem 0', borderBottom: `1px solid ${theme.border}` }}>
            <dt style={{ fontWeight: 700, fontSize: '1.05rem', color: theme.heading, marginBottom: '0.3rem' }}>{t.term}</dt>
            <dd style={{ margin: 0, color: theme.bodyMuted, lineHeight: 1.7 }}>{t.def}</dd>
          </div>
        ))}
      </dl>
    </Prose>
  );
}
