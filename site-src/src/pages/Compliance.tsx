import { useTheme } from '../ThemeContext';
import { globalStyles } from '../styles';
import { Prose, TextureBand } from '../components/shared';
import { ShieldCheck, CircleCheck } from 'lucide-react';

export default function Compliance() {
  const { theme } = useTheme();
  const s = globalStyles(theme);

  return (
    <>
      <TextureBand>
        <div style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={s.h1}>704(b) Compliance</h1>
          <p style={s.lead}>
            How patronage allocations satisfy IRC Section 704(b) economic effect requirements.
          </p>
        </div>
      </TextureBand>

      <Prose>
        <h2 style={s.h2}>The Three-Part Test</h2>
        <p>
          For a partnership (or LCA) allocation to have "substantial economic effect" under IRC Section 704(b), it must satisfy 
          three requirements:
        </p>

        <ol>
          <li><strong>Capital account maintenance</strong> — properly track each partner's economic interest</li>
          <li><strong>Liquidation proceeds follow capital accounts</strong> — distributions match economic rights</li>
          <li>
            <strong>Deficit restoration obligation (DRO) or qualified income offset (QIO)</strong> — protection against negative balances
          </li>
        </ol>

        <h2 style={s.h2}>Understanding 704(b)</h2>
        <p>
          IRC Section 704(b) governs how partnerships (and LCAs) allocate income, gain, loss, and deduction among partners. 
          The law requires that allocations have "substantial economic effect" — meaning they reflect real economic arrangements, 
          not just tax optimization.
        </p>

        <p>The three-part test ensures that:</p>
        <ul>
          <li>Members' economic interests are properly tracked (capital accounts)</li>
          <li>Distributions match those economic interests (liquidation test)</li>
          <li>Members bear the risk of their allocations (DRO/QIO)</li>
        </ul>

        <p>
          The substantiality test prevents purely tax-motivated allocations. If Member A contributes 67% of the capital but receives 
          95% of the income allocation with no economic justification, the IRS will disregard the allocation and reallocate according 
          to economic reality.
        </p>

        <p>
          For cooperatives using patronage-based allocation, compliance is straightforward: contributions and patronage create real 
          economic interests, allocations follow the patronage formula, and liquidation proceeds distribute according to capital accounts. 
          The system is designed for compliance.
        </p>

        <h2 style={s.h2}>
          <ShieldCheck size={20} strokeWidth={1.5} color={theme.glowGreen} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          How Habitat Satisfies 704(b)
        </h2>

        <h3 style={s.h3}>1. Capital Account Maintenance <CircleCheck size={16} strokeWidth={1.5} style={{ verticalAlign: "middle", marginLeft: "0.4rem", color: theme.glowGreen }} /></h3>
        <p>
          Treasury maintains dual-basis capital accounts for every member — book capital (FMV) and tax capital (cost basis). 
          Every contribution, allocation, and distribution updates both accounts according to IRC regulations. The accounting is 
          automatic and auditable.
        </p>

        <h3 style={s.h3}>2. Liquidation Follows Capital <CircleCheck size={16} strokeWidth={1.5} style={{ verticalAlign: "middle", marginLeft: "0.4rem", color: theme.glowGreen }} /></h3>
        <p>
          The operating agreement explicitly ties liquidation distributions to capital account balances. When the cooperative dissolves, 
          members receive proceeds in proportion to their positive capital accounts. No exceptions, no carve-outs.
        </p>

        <h3 style={s.h3}>3. Deficit Protection <CircleCheck size={16} strokeWidth={1.5} style={{ verticalAlign: "middle", marginLeft: "0.4rem", color: theme.glowGreen }} /></h3>
        <p>
          Members sign deficit restoration obligations (DROs) as part of the operating agreement. If a member's capital account goes 
          negative at liquidation, they must restore the deficit. This ensures allocations have real economic consequences.
        </p>

        <h3 style={s.h3}>4. Substantiality <CircleCheck size={16} strokeWidth={1.5} style={{ verticalAlign: "middle", marginLeft: "0.4rem", color: theme.glowGreen }} /></h3>
        <p>
          Patronage allocations are based on documented contributions (labor hours, revenue generated, community participation, 
          infrastructure maintained). The allocation formula has clear business purpose: rewarding actual participation. 
          It's not a tax strategy — it's the cooperative model.
        </p>

        <h2 style={s.h2}>Audit Trail</h2>
        <p>
          Every period close generates a complete calculation record:
        </p>
        <ul>
          <li>Contribution inputs (timestamped, approved, valued)</li>
          <li>Allocation formula applied (weights, calculations, results)</li>
          <li>Capital account updates (dual-basis, both book and tax)</li>
          <li>Member statements (individual allocations, running balances)</li>
        </ul>
        <p>
          These records are the primary artifact for IRS compliance. They demonstrate that allocations follow genuine economic factors, 
          not tax avoidance strategies.
        </p>

        <h2 style={s.h2}>Further Reading</h2>
        <ul>
          <li>
            <a href="/patronage/" style={{ color: theme.glowGreen }}>
              Patronage Accounting
            </a>{' '}
            — How the contribution lifecycle works
          </li>
          <li>
            <a href="https://www.irs.gov/pub/irs-pdf/p541.pdf" style={{ color: theme.glowGreen }}>
              IRS Publication 541
            </a>{' '}
            — Partnerships (PDF)
          </li>
        </ul>
      </Prose>
    </>
  );
}
