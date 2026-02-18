import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, FL } from '../components/shared';

export default function About() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <FL>About</FL>
      <h1 style={s.h1}>About Habitat</h1>
      <p style={s.lead}>Coordination infrastructure for cooperatives.</p>

      <h2 style={s.h2}>What We Build</h2>
      <p>Habitat is the accounting, identity, and governance infrastructure that cooperative organizations need to operate transparently and distribute value according to contribution. It is not a platform — it is a set of composable tools that organizations assemble for their specific context.</p>
      <p>The system integrates patronage accounting under Subchapter K, Ethereum-native identity through ENS, real-time value flows via Superfluid, and event-sourced ledgers built on REA ontology. Each piece works independently. Together, they form coordination infrastructure that makes cooperative economics practical at scale.</p>

      <h2 style={s.h2}>Who We Are</h2>
      <p>Habitat is built by Techne, operating as RegenHub, LCA — a Colorado Limited Cooperative Association filed February 2026. The LCA structure means the organization itself is governed cooperatively: patron members direct the work, surplus flows according to contribution, and the tools we build are subject to the same cooperative principles they encode.</p>
      <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>We are located where the Great Plains meet the Rocky Mountains, 5,430 feet.</p>

      <h2 style={s.h2}>The Thesis</h2>
      <p>The tools an organization uses to track value shape what it can see. What it can see determines whether it extracts or enriches. Most organizational infrastructure is built for extraction — it tracks capital well and contribution poorly. Habitat inverts this: it makes contribution visible, countable, and allocable.</p>
      <p>Read the full argument on the <Link to="/learn/thesis" style={s.a}>Thesis</Link> and <Link to="/learn/patterns" style={s.a}>Patterns</Link> pages.</p>

      <h2 style={s.h2}>Built in Public</h2>
      <p>Habitat is open source under the <Link to="/connect" style={s.a}>Peer Production License</Link>. The full source code, documentation, and development history are available on <a href="https://github.com/nou-techne/habitat" style={s.a}>GitHub</a>. Building in public is not a marketing strategy — it is a structural requirement. Infrastructure that coordinates cooperatives must itself be transparent and auditable.</p>

      <h2 style={s.h2}>Get Involved</h2>
      <p>Coordination happens in the <strong>#habitat</strong> channel. If you are interested in contributing, using the tools, or just understanding the system, that is where to start.</p>
      <p>You can also explore the <Link to="/connect" style={s.a}>Connect</Link> page for FAQ, the <Link to="/learn/glossary" style={s.a}>Glossary</Link> for terminology, or the <Link to="/learn/case-study" style={s.a}>Case Study</Link> to see the system in action.</p>
    </Prose>
  );
}
