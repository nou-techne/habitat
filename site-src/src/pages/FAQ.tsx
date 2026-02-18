import { useState } from 'react';
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
          Habitat is coordination infrastructure for cooperatives. It provides the accounting, identity, and governance primitives 
          that cooperative organizations need to operate transparently and distribute value according to contribution. Built as composable 
          tools rather than a monolithic platform, Habitat lets organizations assemble the pieces they need for their specific context.
        </p>
      </FAQItem>

      <FAQItem question="What is a Limited Cooperative Association (LCA)?">
        <p>
          A Limited Cooperative Association is a legal entity defined under the Uniform Limited Cooperative Association Act (ULCAA). 
          It combines the democratic governance of a cooperative with the ability to accept investor members alongside patron members. 
          Colorado is one of several states that have adopted LCA statutes. Habitat's operating entity, RegenHub LCA, is filed under 
          Colorado law.
        </p>
      </FAQItem>

      <FAQItem question="Is this a DAO?">
        <p>
          No. Habitat is a legally registered cooperative that uses Ethereum-native tools for coordination. The distinction matters: 
          a DAO typically relies on token-weighted governance and smart contract execution. Habitat uses a legal cooperative structure 
          with patronage-based governance, and employs on-chain tools (ENS identity, Superfluid streaming, event sourcing) as infrastructure 
          rather than as the governance mechanism itself.
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
          Patronage accounting tracks how much each member contributes to and benefits from the cooperative. Surplus is allocated in 
          proportion to patronage rather than capital investment. This is a foundational principle of cooperative economics and is 
          governed by Subchapter K of the Internal Revenue Code. See the{' '}
          <a href="/patronage/" style={{ color: theme.glowGreen }}>
            Patronage
          </a>{' '}
          page for details on how Habitat implements this.
        </p>
      </FAQItem>

      <FAQItem question="What is REA ontology?">
        <p>
          REA stands for Resource, Event, Agent. It is an accounting ontology developed by William McCarthy that models economic activity 
          as events where agents exchange resources. Unlike traditional double-entry bookkeeping, REA captures the full semantic context 
          of economic exchanges. Habitat uses REA as its foundational data model, making every economic event fully traceable. See the{' '}
          <a href="/matrix/" style={{ color: theme.glowGreen }}>
            Economic Habitat Matrix
          </a>{' '}
          for how REA structures the system.
        </p>
      </FAQItem>

      <FAQItem question="How does the solar audit cycle work?">
        <p>
          The solar audit is Habitat's annual review cycle aligned with the solstices and equinoxes. Each quarter maps to a phase: 
          contribution review, allocation calculation, distribution, and planning. This natural rhythm replaces the arbitrary fiscal 
          calendar with cycles tied to seasonal patterns, reinforcing the ecological frame that guides the project. See{' '}
          <a href="/compliance/" style={{ color: theme.glowGreen }}>
            Compliance
          </a>{' '}
          for the audit schedule.
        </p>
      </FAQItem>

      <FAQItem question="What are $CLOUD credits?">
        <p>
          $CLOUD credits are a prepaid medium for cooperative infrastructure, minted against USD held for service delivery. Like a postage 
          stamp backed by the postal service, each $CLOUD is backed by Techne's commitment to deliver infrastructure services. Credits are 
          redeemable against four resource primitives: compute, transfer, long-term memory, and short-term memory. Initial conversion: 
          1 CLOUD = 10 USDC.
        </p>
        <p>
          $CLOUD serves as the primary medium of exchange for Techne project invoices and can be used to engage Techne for building new tools. 
          The name holds an ecological connection: clouds are the atmosphere's commons (shared, cyclical, life-sustaining), just as cloud 
          computing pools shared infrastructure.
        </p>
        <p>
          Member-investors can stake $CLOUD along a compounding curve — longer lock periods earn a higher percentage of revenue share — 
          providing capital access to Techne through liquidity commitments. Infrastructure integration spans Stripe (payments), Mercury (banking), 
          and Ethereum (identity and digital ledger).
        </p>
      </FAQItem>

      <FAQItem question="What is the Peer Production License?">
        <p>
          The Peer Production License (also called CopyFarLeft) allows free use by cooperatives, collectives, commons-based organizations, 
          and non-profits. For-profit enterprises operating under traditional corporate governance must obtain a commercial license. 
          The principle: tools built by cooperatives should benefit cooperatives first. See the{' '}
          <a href="/license/" style={{ color: theme.glowGreen }}>
            License
          </a>{' '}
          page for full details.
        </p>
      </FAQItem>

      <FAQItem question="How do agents participate?">
        <p>
          Agents in the Habitat system include both human members and software agents. All agents are identified through ENS subdomains 
          under the habitat.eth namespace. Software agents can hold $CLOUD credit balances, participate in event streams, and execute 
          coordination tasks. The{' '}
          <a href="/agents/" style={{ color: theme.glowGreen }}>
            Agents
          </a>{' '}
          page describes the agent model in detail.
        </p>
      </FAQItem>

      <FAQItem question="Who built this?">
        <p>
          Habitat is built by Techne, operating as RegenHub, LCA — a Colorado Limited Cooperative Association. It is open source, built 
          in public, and developed collaboratively. The source code is available on{' '}
          <a href="https://github.com/nou-techne/habitat" style={{ color: theme.glowGreen }}>
            GitHub
          </a>
          . See the{' '}
          <a href="/about/" style={{ color: theme.glowGreen }}>
            About
          </a>{' '}
          page for more.
        </p>
      </FAQItem>
    </Prose>
  );
}
