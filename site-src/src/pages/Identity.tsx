import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, TextureBand } from '../components/shared';

export default function Identity() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <>
      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={s.h1}>Identity</h1>
          <p style={s.lead}>
            Self-sovereign identity for cooperative networks. The foundation for peer-to-peer coordination.
          </p>
        </div>
      </TextureBand>

      <Prose>
        <h2 style={s.h2}>The Problem with Organizational Identity</h2>
        <p>
          Most organizations manage identity through centralized systems — employee IDs, database records, platform accounts. 
          The organization controls who you are within its boundaries. Leave the organization, and your identity disappears. 
          Your contributions, reputation, and relationships evaporate with your account.
        </p>
        <p>
          For a cooperative — where members <em>are</em> the organization — this model is backwards. Members shouldn't borrow 
          identity from the cooperative. They should bring their identity <em>to</em> it.
        </p>

        <h2 style={s.h2}>ENS as Identity Infrastructure</h2>
        <p>
          Habitat uses the{' '}
          <a href="https://ens.domains" style={{ color: theme.glowGreen }}>
            Ethereum Name Service (ENS)
          </a>{' '}
          as its identity layer. Every member gets a human-readable name under the cooperative's namespace:
        </p>

        <Card style={{ marginBottom: '1rem', borderLeft: '4px solid #4A6F7C' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4A6F7C 0%, rgba(74,111,124,0.6) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'white', fontSize: '1.2rem'
            }}>@</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Member Names</h3>
              <p style={{ margin: 0, color: theme.bodyMuted }}>
                <code>alice.habitat.eth</code> — A member's identity within the cooperative. Resolves to their Ethereum address, 
                links to their public profile, and carries text records describing their skills, roles, and contributions.
              </p>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: '1rem', borderLeft: `4px solid ${theme.glowGreen}` }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.glowGreen} 0%, rgba(74,124,89,0.6) 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'white', fontSize: '1.2rem'
            }}>🏢</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Ventures</h3>
              <p style={{ margin: 0, color: theme.bodyMuted }}>
                <code>treasury.habitat.eth</code> — Tools and ventures within the cooperative get their own names. Smart contracts, 
                service endpoints, and shared resources are addressable by name rather than opaque hex strings.
              </p>
            </div>
          </div>
        </Card>

        <Card style={{ marginBottom: '1.5rem', borderLeft: '4px solid #B5622A' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #B5622A 0%, rgba(181,98,42,0.6) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'white', fontSize: '1.2rem'
            }}>🤖</div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Agents</h3>
              <p style={{ margin: 0, color: theme.bodyMuted }}>
                <code>nou.habitat.eth</code> — Collective intelligence agents operate as named participants in the network. 
                They hold keys, sign attestations, and interact with the same infrastructure as human members.
              </p>
            </div>
          </div>
        </Card>

        <p>
          The namespace is cooperatively governed — the cooperative controls issuance and revocation of subnames, but each member 
          controls their own records. Self-sovereign identity within a collectively governed namespace.
        </p>

        <h2 style={s.h2}>Enabling the Peer-to-Peer Network</h2>
        <p>
          Identity is not just about naming. It is the foundation that makes peer-to-peer coordination possible. Without reliable identity, 
          every interaction requires a trusted intermediary. With it, peers can coordinate directly.
        </p>

        <h3 style={s.h3}>📤 Direct Value Transfer</h3>
        <p>
          When every member has a resolvable address, value can flow directly between peers. Service credits, patronage distributions, 
          and collaborative payments resolve to <code>alice.habitat.eth</code> rather than routing through a central treasury. 
          The cooperative's accounting system tracks these flows — it doesn't intermediate them.
        </p>

        <h3 style={s.h3}>✅ Portable Reputation</h3>
        <p>
          Contribution history, allocation records, and skill attestations are linked to a member's ENS name through text records. 
          When Alice collaborates with another cooperative that uses Habitat, her record travels with her. Reputation is earned, 
          portable, and verifiable — not locked inside a single organization's database.
        </p>

        <h3 style={s.h3}>🤝 Cross-Cooperative Agreements</h3>
        <p>
          Two cooperatives can form agreements referencing each other's members by name. <code>alice.habitat.eth</code> agrees to provide 
          design services to <code>bob.partner.eth</code> for a defined amount of $CLOUD credits. The agreement is legible to both 
          cooperatives' accounting systems without requiring a shared database or a platform in the middle.
        </p>

        <h3 style={s.h3}>🌐 Composable Networks</h3>
        <p>
          Each cooperative operates its own <code>.eth</code> namespace. Habitat provides the tools — patronage accounting, 
          contribution tracking, allocation formulas — and the identity grammar that makes them interoperable. A network of cooperatives 
          emerges not from a shared platform, but from a shared language.
        </p>

        <h2 style={s.h2}>📊 The Identity Stack</h2>
        <p>Identity in Habitat operates at three layers, each building on the one below:</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: `2px solid ${theme.border}` }}>Layer</th>
              <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: `2px solid ${theme.border}` }}>What It Does</th>
              <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: `2px solid ${theme.border}` }}>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>Name Resolution</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Maps human-readable names to addresses</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>
                <code>alice.habitat.eth</code> → <code>0x1234...abcd</code>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>Social Graph</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Text records describe relationships, roles, skills</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>
                <code>role=bookkeeper</code>, <code>skills=design,accounting</code>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>Attestations</td>
              <td style={{ padding: '0.6rem 0.8rem' }}>Verifiable claims about contributions and history</td>
              <td style={{ padding: '0.6rem 0.8rem' }}>
                "Alice contributed 240 hours in Q1" (signed by cooperative)
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          The first layer is live today on ENS. The second uses ENS text records — a key-value store anyone can read and only the owner 
          can write. The third layer uses onchain attestations (EAS or similar) to create verifiable claims that survive beyond any single 
          cooperative's existence.
        </p>

        <h2 style={s.h2}>Governance & Privacy</h2>
        <p>Identity in a cooperative raises governance questions that don't exist in traditional organizations:</p>

        <ul>
          <li>
            <strong>Issuance:</strong> Who can create a <code>.habitat.eth</code> subname? Governance-role members, through a defined 
            process with member consent.
          </li>
          <li>
            <strong>Revocation:</strong> What happens when a member leaves? The subname can be reclaimed by the cooperative, but the member's 
            contribution history (linked to their personal address) remains theirs.
          </li>
          <li>
            <strong>Privacy:</strong> Members control what text records are public. Financial details (capital account balances, specific 
            allocations) are never published onchain — only summary attestations that the member explicitly consents to share.
          </li>
          <li>
            <strong>Portability:</strong> Members can link their cooperative subname to a personal ENS name they own independently 
            (<code>alice.eth</code> ↔ <code>alice.habitat.eth</code>), creating identity that spans organizational boundaries.
          </li>
        </ul>

        <h2 style={s.h2}>The Peer-to-Peer Vision</h2>
        <p>
          The end state is not a platform. It is a network of cooperatives, each running their own Habitat instance, each governing 
          their own namespace, connected through a shared identity grammar and interoperable accounting tools.
        </p>

        <blockquote style={{
          borderLeft: `4px solid ${theme.glowGreen}`,
          paddingLeft: '1.5rem',
          margin: '2rem 0',
          fontStyle: 'italic',
          color: theme.bodyMuted
        }}>
          A member of one cooperative can verify the reputation of a member from another. Service credits issued by one cooperative 
          can be recognized by another. Contribution histories compose across organizational boundaries. The network grows not through 
          acquisition or market capture, but through shared language and mutual recognition.
        </blockquote>

        <p>
          This is what cooperative infrastructure looks like when identity is self-sovereign, accounting is transparent, and coordination 
          doesn't require a middleman. The tools shape what you can see. Identity shapes who you can trust. Together, they make 
          peer-to-peer economic coordination possible at scale.
        </p>
      </Prose>
    </>
  );
}
