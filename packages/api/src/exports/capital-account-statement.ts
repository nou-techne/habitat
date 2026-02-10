/**
 * Capital Account Statement Export
 * 
 * Year-end capital account statements showing all activity
 */

export interface CapitalAccountStatement {
  memberId: string
  memberName: string
  taxYear: number
  statementDate: string
  
  beginningBalance: BalanceComponents
  activity: AccountActivity[]
  endingBalance: BalanceComponents
}

export interface BalanceComponents {
  bookBalance: string
  taxBalance: string
  contributedCapital: string
  retainedPatronage: string
  distributedPatronage: string
}

export interface AccountActivity {
  date: string
  type: 'contribution' | 'allocation' | 'distribution' | 'withdrawal'
  description: string
  debit: string
  credit: string
  balance: string
}

/**
 * Generate capital account statement HTML
 */
export function generateCapitalAccountStatementHTML(statement: CapitalAccountStatement): string {
  const activityRows = statement.activity.map(a => `
    <tr>
      <td>${a.date}</td>
      <td>${a.type}</td>
      <td>${a.description}</td>
      <td class="amount">${a.debit !== '0.00' ? '$' + a.debit : '-'}</td>
      <td class="amount">${a.credit !== '0.00' ? '$' + a.credit : '-'}</td>
      <td class="amount">$${a.balance}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Capital Account Statement - ${statement.taxYear}</title>
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
      font-family: 'Courier New', monospace;
    }
    .header-info {
      margin-bottom: 30px;
      text-align: center;
    }
    .summary-table {
      width: 60%;
      margin: 20px auto;
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
    <h1>Capital Account Statement</h1>
    <p><strong>${statement.memberName}</strong></p>
    <p>Tax Year ${statement.taxYear}</p>
    <p>Statement Date: ${statement.statementDate}</p>
  </div>

  <h2>Beginning Balance (January 1, ${statement.taxYear})</h2>
  <table class="summary-table">
    <tr>
      <td>Book Balance</td>
      <td class="amount">$${statement.beginningBalance.bookBalance}</td>
    </tr>
    <tr>
      <td>Tax Balance</td>
      <td class="amount">$${statement.beginningBalance.taxBalance}</td>
    </tr>
  </table>

  <h2>Account Activity</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Type</th>
        <th>Description</th>
        <th class="amount">Debit</th>
        <th class="amount">Credit</th>
        <th class="amount">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${activityRows}
    </tbody>
  </table>

  <h2>Ending Balance (December 31, ${statement.taxYear})</h2>
  <table class="summary-table">
    <tr>
      <td><strong>Book Balance</strong></td>
      <td class="amount"><strong>$${statement.endingBalance.bookBalance}</strong></td>
    </tr>
    <tr>
      <td><strong>Tax Balance</strong></td>
      <td class="amount"><strong>$${statement.endingBalance.taxBalance}</strong></td>
    </tr>
  </table>

  <h2>Balance Components</h2>
  <table class="summary-table">
    <tr>
      <td>Contributed Capital</td>
      <td class="amount">$${statement.endingBalance.contributedCapital}</td>
    </tr>
    <tr>
      <td>Retained Patronage</td>
      <td class="amount">$${statement.endingBalance.retainedPatronage}</td>
    </tr>
    <tr>
      <td>Distributed Patronage (cumulative)</td>
      <td class="amount">$${statement.endingBalance.distributedPatronage}</td>
    </tr>
  </table>

  <div class="footer">
    <p>This statement shows all activity in your capital account for the tax year. Your capital account represents your equity stake in the cooperative.</p>
    <p><strong>Book Balance:</strong> Value per cooperative accounting records<br>
    <strong>Tax Balance:</strong> Value for tax reporting purposes (typically matches book balance unless 704(c) adjustments apply)</p>
  </div>
</body>
</html>
`
}

/**
 * Export capital account statements to CSV
 */
export function exportCapitalAccountStatementsToCSV(statements: CapitalAccountStatement[]): string {
  const headers = [
    'Member ID',
    'Member Name',
    'Tax Year',
    'Beginning Book Balance',
    'Beginning Tax Balance',
    'Ending Book Balance',
    'Ending Tax Balance',
    'Contributed Capital',
    'Retained Patronage',
    'Distributed Patronage',
  ]

  const rows = statements.map(s => [
    s.memberId,
    s.memberName,
    s.taxYear,
    s.beginningBalance.bookBalance,
    s.beginningBalance.taxBalance,
    s.endingBalance.bookBalance,
    s.endingBalance.taxBalance,
    s.endingBalance.contributedCapital,
    s.endingBalance.retainedPatronage,
    s.endingBalance.distributedPatronage,
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
