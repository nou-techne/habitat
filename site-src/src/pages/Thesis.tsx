import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, FL, TextureBand } from '../components/shared';

export default function Thesis() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <>
      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <FL>Thesis</FL>
          <h1 style={s.h1}>The Craft of Coordination</h1>
          <p style={s.lead}>An integrated thesis on compositional fluency, coordination infrastructure, and ecosystem compounding.</p>
        </div>
      </TextureBand>

      <Prose>
        <h2 style={s.h2}>I. The Maker's Observation</h2>
        <p>A carpenter looks at a bookshelf and a boat and sees the same materials arranged differently. Wood, joinery, an understanding of load and purpose. The craft is not in the materials. It is in knowing which joint to use where, and why.</p>
        <p>Software works the same way. Every information system is built from a finite set of design patterns, layered in a progressive order:</p>
        <ol>
          <li><strong>Identity</strong> — distinguishing one thing from another</li>
          <li><strong>State</strong> — recording attributes of a thing</li>
          <li><strong>Relationship</strong> — connecting identifiable things</li>
          <li><strong>Event</strong> — recording that something happened</li>
          <li><strong>Flow</strong> — value or information moving between agents</li>
          <li><strong>Constraint</strong> — rules governing valid states and transitions</li>
          <li><strong>View</strong> — presenting information for a purpose</li>
        </ol>
        <p>Each layer depends on the ones beneath it. If information systems are fully decomposable, and the decomposition follows this progressive ordering, then the fundamental materials of software are finite and learnable — and the real work is <strong>composition</strong>.</p>

        <h2 style={s.h2}>II. The Structural Opportunity</h2>
        <p>Craft needs a context in which it compounds. Three structural shifts create that context now.</p>

        <h3 style={s.h3}>Coordination Cost Collapse</h3>
        <p>The historical reason cooperatives, commons, and mutual organizations struggled to scale is that distributed governance is expensive. Smart contracts compress these costs by orders of magnitude. A multisig treasury, a token-weighted vote, a programmable patronage distribution: the execution cost has dropped from "requires a legal team and a board meeting" to "requires a transaction fee."</p>

        <h3 style={s.h3}>Composable Trust</h3>
        <p>A smart contract can execute a patronage distribution. A digital agreement can make that distribution legally enforceable. Neither alone is sufficient. The combination produces organizations that are simultaneously fluid in their operations and durable in their commitments.</p>

        <h3 style={s.h3}>Ecosystem Compounding</h3>
        <p>Organizations designed to enrich their operating environment create positive-sum dynamics that feed back into their own resilience. An extractive platform can copy features. It cannot copy the structural incentive alignment that comes from shared ownership.</p>

        <h2 style={s.h2}>III. Where Craft Meets Coordination</h2>
        <p>The studio operates at the intersection: applying compositional fluency to build coordination infrastructure for organizations that distribute governance and enrich their ecosystems.</p>

        <Card>
          <FL>Three Infrastructure Layers</FL>
          <p><strong>Coordination primitives.</strong> Reusable smart contract patterns for distributed governance, resource allocation, and value flows.</p>
          <p><strong>Agreement infrastructure.</strong> Tooling that connects onchain state to legally enforceable contracts.</p>
          <p><strong>Applied ventures.</strong> Specific organizations built on the first two layers — cooperative finance, commons-based platforms, bioregional coordination.</p>
        </Card>

        <h3 style={s.h3}>The Pattern Library as Commons</h3>
        <p>Because the studio is structured as a cooperative, its pattern library is not just a competitive asset. It is a commons. Compositional fluency can be transferred to members and community without diminishing value, because the frontier of novel composition always advances ahead of what has been taught.</p>

        <h2 style={s.h2}>IV. Why Now</h2>
        <p><strong>Ethereum's maturity.</strong> L2 scaling, account abstraction, and stable smart contract standards have moved Ethereum from expensive experiment to viable coordination substrate.</p>
        <p><strong>Legal infrastructure catching up.</strong> Wyoming's DUNA framework, Colorado's cooperative statutes, and emerging digital agreement standards provide legal containers for onchain organizations.</p>
        <p><strong>Institutional fatigue.</strong> The extractive venture model is producing diminishing returns. There is growing demand for organizational forms that align stakeholder interests by design.</p>

        <h2 style={s.h2}>V. The Return Model</h2>
        <p>This requires intellectual honesty. Traditional venture returns come from equity appreciation driven by market power concentration — precisely the dynamic this work is designed to avoid.</p>
        <p>Returns flow through three channels:</p>
        <ul>
          <li><strong>Service revenue</strong> — Infrastructure fees proportional to transaction volume</li>
          <li><strong>Patronage participation</strong> — Distributions from ventures where the studio holds membership</li>
          <li><strong>Ecosystem appreciation</strong> — As the network of ventures grows, coordination infrastructure becomes more valuable</li>
        </ul>
        <p style={{ color: theme.bodyMuted, fontStyle: 'italic' }}>The honest caveat: this model will not produce 100x returns. It is designed to produce consistent, compounding returns across a portfolio of interconnected ventures whose success reinforces each other.</p>

        <h2 style={s.h2}>VI. The Ecological Frame</h2>
        <p>Organizations exist within economic ecosystems. Their behavior maps along two axes: governance orientation (concentrate or disperse decision-making?) and systemic relationship (deplete or enrich the habitat?).</p>
        <p>The tools an organization uses to track value shape what it can see. What it can see determines whether it extracts or enriches. Habitat is economic sensory apparatus.</p>
      </Prose>

      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <h2 style={s.h2}>VII. Conviction</h2>
          <blockquote style={{
            borderLeft: `3px solid ${theme.glowGreen}`,
            padding: '1rem 1.5rem', margin: '1.5rem 0',
            fontStyle: 'italic', color: theme.heading,
          }}>
            The combination of compositional fluency, Ethereum-native coordination primitives, and legally enforceable digital agreements removes the historical scaling constraint on distributed, ecosystem-enriching organizations.
          </blockquote>
          <p>The craft produces the tools. The coordination thesis identifies the market. The cooperative structure ensures that value recirculates rather than concentrates.</p>
        </div>
      </TextureBand>
    </>
  );
}
