import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose } from '../components/shared';
import { Shield, CircleCheck, AlertTriangle, BookOpen, Users } from 'lucide-react';

export default function License() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <Prose>
      <h1 style={s.h1}>License</h1>
      <p style={s.lead}>Tools built by cooperatives should benefit cooperatives.</p>

      <h2 style={s.h2}><Shield size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Peer Production License</h2>
      <p>
        Habitat is released under the <strong>Peer Production License</strong>, also known as CopyFarLeft. This is not a traditional 
        open source license. It is a deliberate choice about who benefits from cooperative labor.
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

      <h2 style={s.h2}><AlertTriangle size={20} strokeWidth={1.5} style={{ verticalAlign: 'middle' }} /> Commercial License Required</h2>
      <p>
        For-profit enterprises operating under traditional corporate governance — where ownership and control are separated from labor, 
        and surplus flows primarily to capital holders — must obtain a commercial license to use Habitat.
      </p>
      <p>
        This is not anti-business. It is pro-cooperative. The license ensures that the value created by cooperative labor circulates 
        within the cooperative economy rather than being extracted by organizations structured for extraction.
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
    </Prose>
  );
}
