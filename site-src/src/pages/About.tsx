import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, FL } from '../components/shared';

export default function About() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <FL>About</FL>
      <h1 style={s.h1}>About Habitat</h1>
      <p style={s.lead}>Coordination infrastructure for cooperatives.</p>

      <blockquote style={{
        borderLeft: `3px solid ${theme.glowGreen}`,
        padding: '1rem 1.5rem', margin: '1.5rem 0',
        fontStyle: 'italic', color: theme.heading,
      }}>
        The tools an organization uses to track value shape what it can see. What it can see determines whether it extracts or enriches. Habitat inverts this: it makes contribution visible, countable, and allocable.
      </blockquote>

      <h2 style={s.h2}>What We Build</h2>
      <p>Habitat is the <strong>accounting, identity, and governance infrastructure</strong> that cooperative organizations need to operate transparently and distribute value according to contribution. It is not a platform — it is a set of composable tools that organizations assemble for their specific context.</p>
      <p>The system integrates <strong>patronage accounting</strong> under Subchapter K, <strong>Ethereum-native identity</strong> through ENS, <strong>real-time value flows</strong> via Superfluid, and <strong>event-sourced ledgers</strong> built on REA ontology. Each piece works independently. Together, they form coordination infrastructure that makes cooperative economics practical at scale.</p>

      <h2 style={s.h2}>Three Layers</h2>
      <p>Habitat's infrastructure operates at three concentric layers, each building on the one inside it:</p>

      <Card>
        <FL>Layer 1</FL>
        <h3 style={s.h3}>Patronage Accounting</h3>
        <ul>
          <li><strong>Capital accounts</strong> — tracking each member's economic interest</li>
          <li><strong>Contribution tracking</strong> — labor, revenue, cash, community</li>
          <li><strong>Allocation calculations</strong> — distributing surplus according to patronage formulas</li>
          <li><strong>IRC Section 704(b) compliance</strong> — dual-basis accounting that satisfies IRS requirements</li>
        </ul>
        <p style={{ color: theme.bodyMuted, fontStyle: 'italic', marginBottom: 0 }}>Built to the most rigorous standard first, so simpler organizations use simpler configurations of the same tools.</p>
      </Card>

      <Card>
        <FL>Layer 2</FL>
        <h3 style={s.h3}>Composable Tools</h3>
        <p>Independent, event-sourced tools — <strong>Treasury</strong>, <strong>People</strong>, <strong>Agreements</strong> — unified by <Link to="/rea" style={s.a}>REA ontology</Link>. Each tool solves one problem well. Together they compose into organizational infrastructure that makes economic relationships legible.</p>
      </Card>

      <Card>
        <FL>Layer 3</FL>
        <h3 style={s.h3}>$CLOUD Credits</h3>
        <p>A prepaid medium for cooperative infrastructure, minted against USD held for service delivery. Four resource primitives:</p>
        <ul style={{ marginBottom: 0 }}>
          <li><strong>Compute</strong> — CPU cycles, inference calls, function execution</li>
          <li><strong>Transfer</strong> — Bandwidth, API calls, network egress</li>
          <li><strong>Long-term memory</strong> — Object storage, document archives, vector embeddings</li>
          <li><strong>Short-term memory</strong> — Cache, session state, hot storage</li>
        </ul>
      </Card>

      <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>Like a postage stamp: backed by the commitment to perform, not by speculation. 1 CLOUD = 10 USDC.</p>

      <h2 style={s.h2}>Principles</h2>
      <p>These principles guide design decisions throughout the system:</p>

      <p><strong>Tools shape perception.</strong> What an organization can measure determines what it can manage. Build tools that make contribution visible, and organizations optimize for contribution.</p>

      <p><strong>Composition over platform.</strong> Independent tools that compose are more resilient than monolithic platforms. Each tool solves one problem well; the whole is greater than the sum.</p>

      <p><strong>Legal-technical integration.</strong> Smart contracts alone are not sufficient. Digital agreements alone are not sufficient. The combination produces organizations that are simultaneously fluid in their operations and durable in their commitments.</p>

      <p><strong>Ecosystem alignment.</strong> Organizations designed to enrich their operating environment create positive-sum dynamics that feed back into their own resilience. An extractive platform can copy features. It cannot copy the structural incentive alignment that comes from shared ownership.</p>

      <h2 style={s.h2}>Who We Are</h2>
      <p>Habitat is built by <strong>Techne</strong>, operating as <strong>RegenHub, LCA</strong> — a Colorado Limited Cooperative Association filed February 2026. The LCA structure means the organization itself is governed cooperatively: patron members direct the work, surplus flows according to contribution, and the tools we build are subject to the same cooperative principles they encode.</p>
      <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>We are located where the Great Plains meet the Rocky Mountains, 5,430 feet.</p>

      <h2 style={s.h2}>Built in Public</h2>
      <p>Habitat is open source under the <Link to="/license" style={s.a}>Peer Production License</Link>. The full source code, documentation, and development history are available on <a href="https://github.com/nou-techne/habitat" style={s.a}>GitHub</a>.</p>
      <p><em>Building in public is not a marketing strategy</em> — it is a structural requirement. Infrastructure that coordinates cooperatives must itself be transparent and auditable. If the tools cannot be inspected, the economics cannot be trusted.</p>

      <h2 style={s.h2}>The Thesis</h2>
      <p>The tools an organization uses to track value shape what it can see. What it can see determines whether it extracts or enriches. Most organizational infrastructure is built for extraction — it tracks capital well and contribution poorly. Habitat inverts this: it makes contribution visible, countable, and allocable.</p>
      <p>Read the full argument on the <Link to="/thesis" style={s.a}>Thesis</Link> and <Link to="/patterns" style={s.a}>Patterns</Link> pages.</p>

      <h2 style={s.h2}>Get Involved</h2>
      <p>Coordination happens in the <strong>#habitat</strong> channel on the <a href="https://discord.gg/theClawsmos" style={s.a}>Clawsmos Discord</a>. If you are interested in contributing, using the tools, or just understanding the system, that is where to start.</p>
      <p>You can also explore the <Link to="/connect" style={s.a}>Connect</Link> page for details, the <Link to="/glossary" style={s.a}>Glossary</Link> for terminology, or the <Link to="/case-study" style={s.a}>Case Study</Link> to see the system in action.</p>
    </Prose>
  );
}
