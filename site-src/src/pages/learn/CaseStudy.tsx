import { useTheme } from '../../ThemeContext';
import { globalStyles } from '../../styles';
import { Prose, Card, FL } from '../../components/shared';

export default function CaseStudy() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, margin: '1.5rem 0', fontSize: '0.9rem' };
  const thStyle = { textAlign: 'left' as const, padding: '0.8rem', background: theme.bgMid, borderBottom: `1px solid ${theme.border}` };
  const tdStyle = { padding: '0.8rem', borderBottom: `1px solid ${theme.border}` };
  const tdRight = { ...tdStyle, textAlign: 'right' as const };

  return (
    <Prose>
      <FL>Case Study</FL>
      <h1 style={s.h1}>Example Case: Pine Ridge Studio</h1>
      <p style={s.lead}>A software cooperative's first quarter using Habitat's patronage accounting system.</p>

      <Card style={{ borderLeft: `3px solid ${theme.glowGreen}` }}>
        <p style={{ margin: 0 }}><strong>Context:</strong> Pine Ridge is a 5-member software cooperative building open-source design tools. They formed as an LCA in January 2026 and adopted Habitat to track contributions and allocate patronage quarterly.</p>
      </Card>

      <h2 style={s.h2}>The Members</h2>
      <ul>
        <li><strong>Alice</strong> — Lead developer, 30 hrs/week @ $60/hr</li>
        <li><strong>Bob</strong> — Designer & UX, 25 hrs/week @ $55/hr</li>
        <li><strong>Chen</strong> — DevOps & infrastructure, 20 hrs/week @ $65/hr</li>
        <li><strong>Dana</strong> — Community & documentation, 15 hrs/week @ $50/hr</li>
        <li><strong>Eli</strong> — Sales & partnerships, 10 hrs/week @ $70/hr</li>
      </ul>

      <h2 style={s.h2}>Q1 2026 Activity</h2>
      <h3 style={s.h3}>Contributions Tracked</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Member</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Labor Hours</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Labor Value</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Cash</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Revenue</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Alice</td><td style={tdRight}>360</td><td style={tdRight}>$21,600</td><td style={tdRight}>$5,000</td><td style={tdRight}>—</td></tr>
            <tr><td style={tdStyle}>Bob</td><td style={tdRight}>300</td><td style={tdRight}>$16,500</td><td style={tdRight}>—</td><td style={tdRight}>—</td></tr>
            <tr><td style={tdStyle}>Chen</td><td style={tdRight}>240</td><td style={tdRight}>$15,600</td><td style={tdRight}>$10,000</td><td style={tdRight}>—</td></tr>
            <tr><td style={tdStyle}>Dana</td><td style={tdRight}>180</td><td style={tdRight}>$9,000</td><td style={tdRight}>—</td><td style={tdRight}>—</td></tr>
            <tr><td style={tdStyle}>Eli</td><td style={tdRight}>120</td><td style={tdRight}>$8,400</td><td style={tdRight}>—</td><td style={tdRight}>$45,000</td></tr>
            <tr style={{ fontWeight: 600, background: theme.bgMid }}>
              <td style={tdStyle}>Total</td><td style={tdRight}>1,200</td><td style={tdRight}>$71,100</td><td style={tdRight}>$15,000</td><td style={tdRight}>$45,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 style={s.h3}>The Patronage Formula</h3>
      <p>Pine Ridge configured their patronage weights as:</p>
      <ul>
        <li><strong>40%</strong> Labor (hours × rate)</li>
        <li><strong>30%</strong> Revenue (client contracts secured)</li>
        <li><strong>20%</strong> Cash (capital contributions)</li>
        <li><strong>10%</strong> Community (meeting participation, mutual aid)</li>
      </ul>
      <p>Total distributable surplus for Q1: <strong>$18,000</strong></p>

      <Card>
        <FL>Alice's Patronage Share</FL>
        <ul style={{ margin: 0 }}>
          <li><strong>Labor:</strong> $21,600 / $71,100 × 40% = <strong>12.15%</strong></li>
          <li><strong>Revenue:</strong> $0 / $45,000 × 30% = <strong>0%</strong></li>
          <li><strong>Cash:</strong> $5,000 / $15,000 × 20% = <strong>6.67%</strong></li>
          <li><strong>Community:</strong> 20% (equal share) × 10% = <strong>2%</strong></li>
        </ul>
        <p style={{ color: theme.glowGreen, fontWeight: 600, margin: '1rem 0 0' }}>Total Patronage: 20.82% → $3,747</p>
      </Card>

      <h2 style={s.h2}>The Decision That Mattered</h2>
      <Card style={{ borderLeft: `3px solid ${theme.glowCyan}` }}>
        <p>In March, the cooperative discussed whether to weight revenue at 30% or 40%. Eli argued for 40%. Alice and Bob preferred 30%. The vote: 3 for 30%, 1 for 40%, 1 abstention.</p>
        <p><strong>Key insight:</strong> Habitat didn't make this decision — the members did. The system just made the consequences transparent. Governance shapes allocation. The tools make the trade-offs visible.</p>
      </Card>

      <h2 style={s.h2}>Lessons</h2>
      <ol>
        <li><strong>Transparency enables debate.</strong> Members argued about weights because they could see the impact.</li>
        <li><strong>Multi-capital accounting works.</strong> Labor, revenue, cash, and community contributions all mattered.</li>
        <li><strong>Patronage ≠ payroll.</strong> Allocations are distributions of surplus after expenses, not wages.</li>
        <li><strong>The system is as fair as the governance.</strong> Habitat calculates. The cooperative decides what to calculate.</li>
      </ol>

      <p style={{ fontSize: '0.9rem', color: theme.bodyMuted, fontStyle: 'italic', marginTop: '2rem' }}>This case study is illustrative. Names, numbers, and decisions are hypothetical but grounded in real cooperative accounting principles and Habitat's design.</p>
    </Prose>
  );
}
