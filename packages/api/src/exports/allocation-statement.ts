/**
 * Member Allocation Statement Export
 * 
 * Generates year-end allocation statements for members
 * Shows contributions, patronage calculation, and allocations
 */

export interface AllocationStatement {
  memberId: string
  memberName: string
  taxYear: number
  periodId: string
  periodName: string
  
  contributions: ContributionSummary[]
  patronageCalculation: PatronageCalculation
  allocation: AllocationSummary
  capitalAccount: CapitalAccountSummary
}

export interface ContributionSummary {
  contributionId: string
  date: string
  type: string
  description: string
  monetaryValue: string
  weight: number
  weightedValue: string
}

export interface PatronageCalculation {
  totalRawPatronage: string
  totalWeightedPatronage: string
  memberShare: string // percentage
  cooperativeSurplus: string
}

export interface AllocationSummary {
  totalAllocation: string
  cashDistribution: string
  retainedAllocation: string
  cashRate: string // percentage
}

export interface CapitalAccountSummary {
  beginningBalance: string
  contributions: string
  allocations: string
  distributions: string
  endingBalance: string
}

/**
 * Generate allocation statement HTML
 */
export function generateAllocationStatementHTML(statement: AllocationStatement): string {
  const contributionsTable = statement.contributions.map(c => `
    <tr>
      <td>${c.date}</td>
      <td>${c.type}</td>
      <td>${c.description}</td>
      <td class="amount">$${c.monetaryValue}</td>
      <td class="amount">${c.weight}x</td>
      <td class="amount">$${c.weightedValue}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Member Allocation Statement - ${statement.taxYear}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      margin: 40px;
    }
    h1 {
      font-size: 16pt;
      text-align: center;
      margin-bottom: 10px;
    }
    h2 {
      font-size: 13pt;
      margin-top: 25px;
      margin-bottom: 10px;
      border-bottom: 2px solid #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border: 1px solid #ddd;
    }
    th {
      background-color: #f8f8f8;
      font-weight: bold;
    }
    .amount {
      text-align: right;
    }
    .header-info {
      margin-bottom: 30px;
      text-align: center;
    }
    .summary-box {
      background-color: #f0f0f0;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
    }
    .footer {
      margin-top: 40px;
      font-size: 9pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header-info">
    <h1>Member Allocation Statement</h1>
    <p><strong>${statement.memberName}</strong></p>
    <p>${statement.periodName} | Tax Year ${statement.taxYear}</p>
  </div>

  <h2>Your Contributions</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Description</th>
        <th class="amount">Value</th>
        <th class="amount">Weight</th>
        <th class="amount">Weighted Value</th>
      </tr>
    </thead>
    <tbody>
      ${contributionsTable}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3"><strong>Total Raw Patronage</strong></td>
        <td class="amount"><strong>$${statement.patronageCalculation.totalRawPatronage}</strong></td>
        <td></td>
        <td class="amount"><strong>$${statement.patronageCalculation.totalWeightedPatronage}</strong></td>
      </tr>
    </tfoot>
  </table>

  <h2>Patronage Calculation</h2>
  <div class="summary-box">
    <table style="border: none;">
      <tr>
        <td style="border: none;"><strong>Your Weighted Patronage:</strong></td>
        <td style="border: none;" class="amount">$${statement.patronageCalculation.totalWeightedPatronage}</td>
      </tr>
      <tr>
        <td style="border: none;"><strong>Cooperative Distributable Surplus:</strong></td>
        <td style="border: none;" class="amount">$${statement.patronageCalculation.cooperativeSurplus}</td>
      </tr>
      <tr>
        <td style="border: none;"><strong>Your Share:</strong></td>
        <td style="border: none;" class="amount">${(parseFloat(statement.patronageCalculation.memberShare) * 100).toFixed(2)}%</td>
      </tr>
    </table>
  </div>

  <h2>Your Allocation</h2>
  <table>
    <tr>
      <td><strong>Total Allocation</strong></td>
      <td class="amount"><strong>$${statement.allocation.totalAllocation}</strong></td>
    </tr>
    <tr>
      <td>Cash Distribution (${(parseFloat(statement.allocation.cashRate) * 100).toFixed(0)}%)</td>
      <td class="amount">$${statement.allocation.cashDistribution}</td>
    </tr>
    <tr>
      <td>Retained Allocation (${(100 - parseFloat(statement.allocation.cashRate) * 100).toFixed(0)}%)</td>
      <td class="amount">$${statement.allocation.retainedAllocation}</td>
    </tr>
  </table>

  <h2>Capital Account Summary</h2>
  <table>
    <tr>
      <td>Beginning Balance</td>
      <td class="amount">$${statement.capitalAccount.beginningBalance}</td>
    </tr>
    <tr>
      <td>Capital Contributions</td>
      <td class="amount">$${statement.capitalAccount.contributions}</td>
    </tr>
    <tr>
      <td>Current Year Allocation</td>
      <td class="amount">$${statement.capitalAccount.allocations}</td>
    </tr>
    <tr>
      <td>Distributions</td>
      <td class="amount">($${statement.capitalAccount.distributions})</td>
    </tr>
    <tr>
      <td><strong>Ending Balance</strong></td>
      <td class="amount"><strong>$${statement.capitalAccount.endingBalance}</strong></td>
    </tr>
  </table>

  <div class="footer">
    <p>This statement summarizes your patronage allocation for the period. The cash distribution shown has been paid or will be paid per the cooperative's distribution schedule. The retained allocation remains in your capital account as equity in the cooperative.</p>
    <p>For tax reporting purposes, refer to your Schedule K-1 (Form 1065) for this tax year.</p>
  </div>
</body>
</html>
`
}

/**
 * Export allocation statements to CSV
 */
export function exportAllocationStatementsToCSV(statements: AllocationStatement[]): string {
  const headers = [
    'Member ID',
    'Member Name',
    'Tax Year',
    'Period',
    'Total Raw Patronage',
    'Total Weighted Patronage',
    'Member Share %',
    'Total Allocation',
    'Cash Distribution',
    'Retained Allocation',
    'Beginning Capital',
    'Ending Capital',
  ]

  const rows = statements.map(s => [
    s.memberId,
    s.memberName,
    s.taxYear,
    s.periodName,
    s.patronageCalculation.totalRawPatronage,
    s.patronageCalculation.totalWeightedPatronage,
    (parseFloat(s.patronageCalculation.memberShare) * 100).toFixed(2),
    s.allocation.totalAllocation,
    s.allocation.cashDistribution,
    s.allocation.retainedAllocation,
    s.capitalAccount.beginningBalance,
    s.capitalAccount.endingBalance,
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n')
}

function escapeCSV(value: any): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
