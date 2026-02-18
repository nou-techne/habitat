import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, Card, TextureBand } from '../components/shared';
import { Wallet, PieChart, Landmark, Users, ClipboardList } from 'lucide-react';

export default function Patronage() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <>
      <TextureBand>
        <div style={{ maxWidth: '860px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={s.h1}>Patronage Accounting</h1>
          <p style={s.lead}>
            How cooperatives answer the question: who contributed what, and how does value flow back?
          </p>
        </div>
      </TextureBand>

      <Prose>
        <h2 style={s.h2}>Why Patronage?</h2>
        <p>
          In a corporation, your share of profits is determined by how many shares you own — fixed percentages set at investment time. 
          In a cooperative, it's determined by <strong>patronage</strong>: your actual contribution during the period. Work more, contribute more, 
          bring in more revenue? Your share reflects that.
        </p>
        <p>
          This is a fundamentally different relationship between an organization and its members. <em>Ownership isn't static. 
          It's earned, period by period, through participation.</em>
        </p>

        <h2 style={s.h2}>
          <Wallet size={20} strokeWidth={1.5} color={theme.glowGreen} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Capital Accounts
        </h2>
        <p>
          Every member has a <strong>capital account</strong> — a running balance that tracks their economic stake in the cooperative. 
          It goes up when you contribute or receive an allocation. It goes down when you receive a distribution or absorb a loss.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: `2px solid ${theme.border}` }}>Event</th>
              <th style={{ textAlign: 'left', padding: '0.8rem', borderBottom: `2px solid ${theme.border}` }}>Effect</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Cash contribution</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Account increases</td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Property contribution</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Account increases (at fair market value)</td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Income allocation</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Account increases by your share</td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Cash distribution</td>
              <td style={{ padding: '0.6rem 0.8rem', borderBottom: `1px solid ${theme.border}` }}>Account decreases</td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem 0.8rem' }}>Loss allocation</td>
              <td style={{ padding: '0.6rem 0.8rem' }}>Account decreases by your share</td>
            </tr>
          </tbody>
        </table>

        <p>
          The system maintains <strong>dual-basis tracking</strong>: a book capital account (fair market value, for economic rights) 
          and a tax capital account (cost basis, for IRS reporting). Both are updated from the same events, sometimes at different amounts. 
          This dual-basis system is what makes the accounting compliant with IRC Section 704(b).
        </p>

        <h2 style={s.h2}>
          <PieChart size={20} strokeWidth={1.5} color={theme.glowGreen} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          The Patronage Formula
        </h2>
        <p>
          At the end of each period, the cooperative's net income is divided among members based on a weighted formula. 
          Each category of contribution — labor, revenue, cash, community involvement — carries a weight reflecting its importance 
          to the organization.
        </p>

        <pre style={{
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: '6px',
          padding: '1rem',
          overflowX: 'auto',
          fontSize: '0.9rem'
        }}>
          <code>member_allocation = net_income × (member_weighted_contribution / total_weighted_contributions)</code>
        </pre>

        <h3 style={s.h3}>Example</h3>
        <p>Three members, one quarter. Weights: Labor 40%, Revenue 30%, Cash 20%, Community 10%.</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '1.5rem 0', fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: `2px solid ${theme.border}` }}>Member</th>
              <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: `2px solid ${theme.border}` }}>Labor</th>
              <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: `2px solid ${theme.border}` }}>Revenue</th>
              <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: `2px solid ${theme.border}` }}>Cash</th>
              <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: `2px solid ${theme.border}` }}>Community</th>
              <th style={{ textAlign: 'right', padding: '0.6rem', borderBottom: `2px solid ${theme.border}` }}>Weighted Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>Alice</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$6,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$4,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$2,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$500</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>$4,050</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>Bob</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$4,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$1,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$5,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}` }}>$1,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', borderBottom: `1px solid ${theme.border}`, fontWeight: 600 }}>$3,000</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600 }}>Carol</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>$3,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>$2,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>$1,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem' }}>$2,000</td>
              <td style={{ textAlign: 'right', padding: '0.5rem 0.6rem', fontWeight: 600 }}>$2,200</td>
            </tr>
          </tbody>
        </table>

        <p>
          With $12,000 in net income: Alice receives 43.8% ($5,254), Bob receives 32.4% ($3,892), Carol receives 23.8% ($2,854). 
          The weights are the cooperative's value statement expressed as arithmetic.
        </p>

        <h3 style={s.h3}>Configurable Weights</h3>
        <p>
          The weights are not fixed. Each cooperative sets them based on its values. A development shop might weight labor at 60%. 
          A sales cooperative might weight revenue at 50%. The only requirement: the weights must have documented business purpose 
          (not tax avoidance), satisfying the IRS substantiality test.
        </p>

        <h2 style={s.h2}>Period Close</h2>
        <p>Period close is when everything comes together. The cycle:</p>
        <ol>
          <li><strong>Pre-close review</strong> — Surface pending contributions, generate draft allocations</li>
          <li><strong>Finalize contributions</strong> — Lock the period's contribution data</li>
          <li><strong>Run the formula</strong> — Calculate each member's allocation</li>
          <li><strong>Generate transactions</strong> — Credit member capital accounts in Treasury</li>
          <li><strong>Lock the period</strong> — No further changes without audit trail</li>
          <li><strong>Produce reports</strong> — Member statements, K-1 data, balance verification</li>
        </ol>
        <p>
          Every calculation produces a permanent record — the primary audit artifact for 704(b) compliance. It proves allocations 
          were based on genuine economic factors, inputs trace to verified contributions, and the math is complete.
        </p>

        <h2 style={s.h2}>Three Tools, One System</h2>
        <p>The patronage system is built from three composable tools:</p>

        <Card style={{ marginBottom: '1rem', borderLeft: '4px solid #4A6F7C' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4A6F7C 0%, rgba(74,111,124,0.6) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: 'white', fontSize: '1.2rem'
            }}><Landmark size={20} strokeWidth={1.5} /></div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Treasury</h3>
              <p style={{ margin: 0, color: theme.bodyMuted }}>
                Double-entry accounting, capital accounts, balance computation, reporting.
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
            }}><Users size={20} strokeWidth={1.5} /></div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>People</h3>
              <p style={{ margin: 0, color: theme.bodyMuted }}>
                Contribution lifecycle, valuation, approval workflows, member identity.
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
            }}><ClipboardList size={20} strokeWidth={1.5} /></div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem' }}>Agreements</h3>
              <p style={{ margin: 0, color: theme.bodyMuted }}>
                Patronage formulas, period close, allocation, distribution, K-1 assembly.
              </p>
            </div>
          </div>
        </Card>

        <p>
          Each tool is independent and event-sourced. They communicate through events, not shared databases. A contribution approved 
          in People automatically creates transactions in Treasury. An allocation calculated in Agreements automatically updates capital 
          accounts. The tools compose.
        </p>

        <h2 style={s.h2}>Beyond Cooperatives</h2>
        <p>
          The system is designed for cooperatives but works for any organization that distributes value based on contribution. 
          A freelancer collective splitting project revenue. A DAO distributing treasury funds. An employee-owned company calculating 
          profit sharing. Same primitives, different configurations.
        </p>
        <p>
          The formula is stored as configuration, not code. Changing it — from weighted patronage to equal allocation, from hours-only 
          to revenue-weighted — requires a governance decision, not a developer.
        </p>

        <blockquote style={{
          borderLeft: `4px solid ${theme.glowGreen}`,
          paddingLeft: '1.5rem',
          margin: '2rem 0',
          fontStyle: 'italic',
          color: theme.bodyMuted
        }}>
          The accounting system is, in a sense, a way of reading the economic watershed — tracking what's stored, what flows, 
          and whether the system can sustain what's growing in it.
        </blockquote>
      </Prose>
    </>
  );
}
