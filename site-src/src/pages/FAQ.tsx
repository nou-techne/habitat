import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose } from '../components/shared';
import { HelpCircle } from 'lucide-react';

interface FAQItemProps {
  question: string;
  children: React.ReactNode;
}

function FAQItem({ question, children }: FAQItemProps) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        marginBottom: '1rem',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          cursor: 'pointer',
          background: theme.cardBg,
          transition: 'background 0.2s',
          gap: '1rem',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = theme.cardBg)}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={16} strokeWidth={1.5} color={theme.bodyMuted} style={{ verticalAlign: 'middle', flexShrink: 0 }} />
          {question}
        </h3>
        <span
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s ease',
            flexShrink: 0,
            fontSize: '0.8rem',
          }}
        >
          ▼
        </span>
      </div>
      <div
        style={{
          maxHeight: open ? '1000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div style={{ padding: '0 1.5rem 1.25rem' }}>{children}</div>
      </div>
    </div>
  );
}

export default function FAQ() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <h1 style={s.h1}>Frequently Asked Questions</h1>
      <p style={s.lead}>Common questions about Habitat, cooperative coordination, and how the system works.</p>

      <FAQItem question="What is Habitat?">
        <p>
          Habitat is <strong>coordination infrastructure for cooperatives</strong>. It provides the accounting, identity, and governance primitives 
          that cooperative organizations need to operate transparently and distribute value according to contribution. Built as <strong>composable 
          tools</strong> rather than a monolithic platform, Habitat lets organizations assemble the pieces they need for their specific context.
        </p>
      </FAQItem>

      <FAQItem question="What is a Limited Cooperative Association (LCA)?">
        <p>
          A Limited Cooperative Association is a legal entity defined under the <strong>Uniform Limited Cooperative Association Act (ULCAA)</strong>. 
          It combines:
        </p>
        <ul>
          <li>The democratic governance of a cooperative</li>
          <li>The ability to accept both <strong>patron members</strong> (contributors) and <strong>investor members</strong> (capital providers)</li>
          <li>Flexible surplus distribution based on patronage formulas</li>
        </ul>
        <p>
          Colorado is one of several states that have adopted LCA statutes. Habitat's operating entity, <strong>RegenHub, LCA</strong>, is filed under 
          Colorado law.
        </p>
      </FAQItem>

      <FAQItem question="Is this a DAO?">
        <p>
          No. Habitat is a <strong>legally registered cooperative</strong> that uses Ethereum-native tools for coordination. The distinction matters:
        </p>
        <ul>
          <li><strong>DAOs</strong> typically rely on token-weighted governance and smart contract execution as the primary coordination mechanism</li>
          <li><strong>Habitat</strong> uses a legal cooperative structure with <strong>patronage-based governance</strong>, and employs on-chain tools (ENS identity, Superfluid streaming, event sourcing) as infrastructure rather than as governance itself</li>
        </ul>
        <p>
          The legal structure provides enforceability and compliance. The on-chain tools provide transparency and composability.
        </p>
      </FAQItem>

      <FAQItem question="Do I need cryptocurrency to participate?">
        <p>
          Not necessarily. While Habitat uses Ethereum-based tools for identity and value flows, participation in the cooperative and 
          its governance does not require holding cryptocurrency. Some functions (like claiming an ENS subdomain or receiving streaming 
          payments) interact with on-chain systems, but the cooperative is designed to be accessible regardless of crypto experience.
        </p>
      </FAQItem>

      <FAQItem question="What is patronage accounting?">
        <p>
          <strong>Patronage accounting</strong> tracks how much each member contributes to and benefits from the cooperative. Key principles:
        </p>
        <ul>
          <li>Surplus is allocated in <strong>proportion to patronage</strong> rather than capital investment</li>
          <li>Contributions are tracked across multiple categories (labor, revenue, cash, community)</li>
          <li>Each category is weighted according to the cooperative's values</li>
          <li>Allocations must satisfy <strong>IRC Section 704(b)</strong> requirements for substantial economic effect</li>
        </ul>
        <p>
          This is a foundational principle of cooperative economics and is governed by <strong>Subchapter K</strong> of the Internal Revenue Code. See the{' '}
          <Link to="/patronage" style={{ color: theme.glowGreen }}>Patronage</Link> page for details on how Habitat implements this.
        </p>
      </FAQItem>

      <FAQItem question="What is REA ontology?">
        <p>
          REA stands for <strong>Resource, Event, Agent</strong>. It is an accounting ontology developed by William McCarthy that models economic activity 
          as <strong>events where agents exchange resources</strong>. Unlike traditional double-entry bookkeeping, REA captures the full semantic context 
          of economic exchanges.
        </p>
        <p>
          Habitat uses REA as its foundational data model, making every economic event fully traceable. This enables:
        </p>
        <ul>
          <li>Patronage allocation based on contribution type and value</li>
          <li>Audit trails that humans can understand</li>
          <li>Cross-organizational data exchange</li>
          <li>Intelligent querying without custom code</li>
        </ul>
        <p>
          See the <Link to="/rea" style={{ color: theme.glowGreen }}>REA</Link> page for an interactive explanation.
        </p>
      </FAQItem>

      <FAQItem question="How does the solar audit cycle work?">
        <p>
          The <strong>solar audit</strong> is Habitat's annual review cycle aligned with the solstices and equinoxes. Each quarter maps to a phase:
        </p>
        <ol>
          <li><strong>Contribution review</strong> — validate recorded contributions</li>
          <li><strong>Allocation calculation</strong> — run patronage formulas</li>
          <li><strong>Distribution</strong> — pay out allocations or credit capital accounts</li>
          <li><strong>Planning</strong> — adjust weights and governance for the next cycle</li>
        </ol>
        <p>
          This natural rhythm replaces the arbitrary fiscal calendar with cycles tied to seasonal patterns, reinforcing the <em>ecological frame</em> that 
          guides the project. See <Link to="/compliance" style={{ color: theme.glowGreen }}>Compliance</Link> for details.
        </p>
      </FAQItem>

      <FAQItem question="What are $CLOUD credits?">
        <p>
          <strong>$CLOUD credits</strong> are a prepaid medium for cooperative infrastructure, minted against USD held for service delivery. Like a postage 
          stamp backed by the postal service, each $CLOUD is backed by Techne's commitment to deliver infrastructure services.
        </p>
        <p>
          Credits are redeemable against four resource primitives:
        </p>
        <ul>
          <li><strong>Compute</strong> — CPU cycles, inference calls, function execution</li>
          <li><strong>Transfer</strong> — Bandwidth, API calls, network egress</li>
          <li><strong>Long-term memory</strong> — Object storage, document archives, vector embeddings</li>
          <li><strong>Short-term memory</strong> — Cache, session state, hot storage</li>
        </ul>
        <p>
          Initial conversion: <strong>1 CLOUD = 10 USDC</strong>. $CLOUD serves as the primary medium of exchange for Techne project invoices and can be 
          used to engage Techne for building new tools.
        </p>
      </FAQItem>

      <FAQItem question="What is the Peer Production License?">
        <p>
          The <strong>Peer Production License</strong> (also called CopyFarLeft) allows free use by:
        </p>
        <ul>
          <li>Worker-owned cooperatives and cooperative associations</li>
          <li>Collectives and worker-managed organizations</li>
          <li>Commons-based organizations</li>
          <li>Non-profit organizations</li>
        </ul>
        <p>
          For-profit enterprises operating under traditional corporate governance must obtain a commercial license. The principle: <strong>tools built by 
          cooperatives should benefit cooperatives first</strong>. See the <Link to="/license" style={{ color: theme.glowGreen }}>License</Link> page for 
          full details.
        </p>
      </FAQItem>

      <FAQItem question="How do agents participate?">
        <p>
          Agents in the Habitat system include both <strong>human members</strong> and <strong>software agents</strong>. All agents are identified through 
          ENS subdomains under the <code>habitat.eth</code> namespace.
        </p>
        <p>
          Software agents can:
        </p>
        <ul>
          <li>Hold $CLOUD credit balances</li>
          <li>Participate in event streams</li>
          <li>Execute coordination tasks</li>
          <li>Earn patronage allocations for infrastructure contributions</li>
        </ul>
        <p>
          The <Link to="/agents" style={{ color: theme.glowGreen }}>Agents</Link> page describes the agent model in detail.
        </p>
      </FAQItem>

      <FAQItem question="Who built this?">
        <p>
          Habitat is built by <strong>Techne</strong>, operating as <strong>RegenHub, LCA</strong> — a Colorado Limited Cooperative Association. 
          It is open source, built in public, and developed collaboratively. The source code is available on{' '}
          <a href="https://github.com/nou-techne/habitat" style={{ color: theme.glowGreen }}>GitHub</a>. 
          See the <Link to="/about" style={{ color: theme.glowGreen }}>About</Link> page for more.
        </p>
      </FAQItem>
    </Prose>
  );
}
