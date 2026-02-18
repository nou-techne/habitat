import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose } from '../components/shared';
import { Shield, CircleCheck, AlertTriangle, BookOpen, Users } from 'lucide-react';

export default function License() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <div style={{ width: 3, height: 40, background: theme.glowGreen, borderRadius: 2, marginBottom: '0.8rem' }} />
      <h1 style={s.h1}>License</h1>
      <p style={s.lead}>Tools built by cooperatives should benefit cooperatives.</p>

      <h2 style={s.h2}><Shield size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Peer Production License</h2>
      <p>
        Habitat is released under the <strong>Peer Production License</strong>, also known as CopyFarLeft. This is not a traditional 
        open source license. It is a deliberate choice about who benefits from cooperative labor.
      </p>
      <p style={{ fontStyle: 'italic', color: theme.bodyMuted }}>
        Why this matters: Open source licenses allow anyone to use the code, including corporations that extract value from commons without 
        contributing back. CopyFarLeft ensures that tools built through cooperative labor enrich the cooperative economy first.
      </p>

      <h2 style={s.h2}><CircleCheck size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Free to Use</h2>
      <p>The following may use, modify, and distribute Habitat freely:</p>
      <ul>
        <li><strong>Worker-owned cooperatives</strong> and cooperative associations</li>
        <li><strong>Collectives</strong> and worker-managed organizations</li>
        <li><strong>Commons-based organizations</strong> and peer production communities</li>
        <li><strong>Non-profit organizations</strong></li>
      </ul>
      <p>
        If your organization distributes governance and surplus to those who do the work, you are welcome to use these tools 
        without restriction.
      </p>
      <p style={{ fontStyle: 'italic', color: theme.bodyMuted }}>
        This creates a commons within the cooperative economy — shared infrastructure that strengthens mutual organizations while 
        maintaining boundaries against extractive use.
      </p>

      <h2 style={s.h2}><AlertTriangle size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Commercial License Required</h2>
      <p>
        For-profit enterprises operating under traditional corporate governance — where ownership and control are separated from labor, 
        and surplus flows primarily to capital holders — must obtain a commercial license to use Habitat.
      </p>
      <p>
        This is not anti-business. It is pro-cooperative. The license ensures that the value created by cooperative labor circulates 
        within the cooperative economy rather than being extracted by organizations structured for extraction.
      </p>
      <p style={{ fontStyle: 'italic', color: theme.bodyMuted }}>
        Commercial licensing provides a revenue stream for continued development while ensuring that cooperative infrastructure 
        remains primarily a cooperative resource.
      </p>

      <h2 style={s.h2}>Why CopyFarLeft?</h2>
      <p>
        Traditional open source licenses (MIT, Apache, BSD) allow unrestricted use. This is fine for general-purpose tools, but for 
        <strong> coordination infrastructure</strong> — tools that encode economic relationships and governance patterns — unrestricted use 
        creates a structural problem.
      </p>
      <p>
        When extractive organizations can freely adopt cooperative tooling without adopting cooperative governance, they gain competitive 
        advantage through <em>efficiency without accountability</em>. They can use patronage accounting to optimize operations while continuing 
        to concentrate surplus with capital holders. The tools become a source of competitive edge rather than structural transformation.
      </p>
      <p>
        <strong>CopyFarLeft</strong> flips this dynamic. Organizations structured for mutual benefit can use the tools freely. Organizations 
        structured for extraction must pay. This creates an economic incentive gradient that favors cooperative structures.
      </p>
      <p style={{ fontStyle: 'italic', color: theme.bodyMuted }}>
        The principle: if you want to benefit from tools built through cooperative labor, you should organize cooperatively. Otherwise, 
        you're welcome to use the tools — at commercial rates that fund their continued development by and for cooperatives.
      </p>

      <h2 style={s.h2}><BookOpen size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Full License Text</h2>
      <p>The complete Peer Production License is maintained by the P2P Foundation:</p>
      <p>
        <a href="https://wiki.p2pfoundation.net/Peer_Production_License" style={{ color: theme.glowGreen }}>
          wiki.p2pfoundation.net/Peer_Production_License
        </a>
      </p>

      <h2 style={s.h2}><Users size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Code of Conduct</h2>
      <p>
        All participants in the Habitat project are expected to follow the <strong>Contributor Covenant v2.1</strong> Code of Conduct. 
        This applies to all project spaces — repository, discussions, channels, and events.
      </p>
      <p>
        The Contributor Covenant establishes baseline expectations for respectful, inclusive participation. It is not a substitute for 
        good judgment, but it provides a shared standard when judgment differs.
      </p>
      <p style={{ fontStyle: 'italic', color: theme.bodyMuted }}>
        Cooperative infrastructure requires cooperative culture. Shared tools work best when participants bring shared values of mutual 
        respect and collective care.
      </p>
    </Prose>
  );
}
