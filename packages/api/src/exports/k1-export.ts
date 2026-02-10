/**
 * K-1 Export
 * 
 * Exports Schedule K-1 data in multiple formats:
 * - CSV for bulk processing
 * - PDF for member distribution
 * - JSON for API consumers
 */

import type { K1Data } from '@habitat/shared/compliance'
import { generateK1Summary } from '@habitat/shared/compliance'

/**
 * Export K-1 data to CSV
 */
export function exportK1ToCSV(k1Data: K1Data[]): string {
  const headers = [
    'Tax Year',
    'Partnership EIN',
    'Partnership Name',
    'Partner SSN/EIN',
    'Partner Name',
    'Partner Type',
    'Profit Share %',
    'Loss Share %',
    'Capital Share %',
    'Ordinary Income',
    'Self-Employment Earnings',
    'Cash Distributions',
    'Beginning Capital',
    'Capital Contributed',
    'Current Year Increase',
    'Distributions',
    'Ending Capital',
  ]

  const rows = k1Data.map(k1 => [
    k1.taxYear,
    k1.partnershipEIN,
    k1.partnershipName,
    k1.partnerSSN,
    k1.partnerName,
    k1.partnerType,
    (parseFloat(k1.profitSharePercent) * 100).toFixed(2),
    (parseFloat(k1.lossSharePercent) * 100).toFixed(2),
    (parseFloat(k1.capitalSharePercent) * 100).toFixed(2),
    k1.income.ordinaryIncome,
    k1.credits.selfEmploymentEarnings,
    k1.otherInformation.cashDistributions,
    k1.capitalAccount.beginningCapital,
    k1.capitalAccount.capitalContributed,
    k1.capitalAccount.currentYearIncrease,
    k1.capitalAccount.distributions,
    k1.capitalAccount.endingCapital,
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n')
}

/**
 * Export K-1 data to JSON
 */
export function exportK1ToJSON(k1Data: K1Data[]): string {
  return JSON.stringify(k1Data, null, 2)
}

/**
 * Generate K-1 PDF content (HTML template)
 */
export function generateK1HTML(k1: K1Data): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Schedule K-1 (Form 1065) - ${k1.taxYear}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      margin: 40px;
    }
    h1 {
      font-size: 14pt;
      text-align: center;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 12pt;
      margin-top: 20px;
      margin-bottom: 10px;
      border-bottom: 1px solid #000;
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
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .header-info {
      margin-bottom: 30px;
    }
    .header-info div {
      margin-bottom: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .amount {
      text-align: right;
    }
  </style>
</head>
<body>
  <h1>Schedule K-1 (Form 1065)</h1>
  <h1>Partner's Share of Income, Deductions, Credits, etc.</h1>
  <h1>Tax Year ${k1.taxYear}</h1>

  <div class="section header-info">
    <h2>Part I - Information About the Partnership</h2>
    <div><strong>Partnership Name:</strong> ${k1.partnershipName}</div>
    <div><strong>Partnership EIN:</strong> ${k1.partnershipEIN}</div>
    <div><strong>Address:</strong> ${k1.partnershipAddress}</div>
    <div><strong>IRS Center:</strong> ${k1.partnershipIRSCenter}</div>
  </div>

  <div class="section header-info">
    <h2>Part II - Information About the Partner</h2>
    <div><strong>Partner Name:</strong> ${k1.partnerName}</div>
    <div><strong>Partner SSN/EIN:</strong> ${k1.partnerSSN}</div>
    <div><strong>Address:</strong> ${k1.partnerAddress}</div>
    <div><strong>Partner Type:</strong> ${k1.partnerType === 'individual' ? 'Individual' : 'Entity'}</div>
    <div><strong>Partner Classification:</strong> ${k1.isGeneralPartner ? 'General Partner' : 'Limited Partner'}</div>
    <div><strong>Domestic/Foreign:</strong> ${k1.isDomesticPartner ? 'Domestic' : 'Foreign'}</div>
  </div>

  <div class="section">
    <h2>Share Percentages</h2>
    <table>
      <tr>
        <th>Type</th>
        <th class="amount">Percentage</th>
      </tr>
      <tr>
        <td>Profit Share</td>
        <td class="amount">${(parseFloat(k1.profitSharePercent) * 100).toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Loss Share</td>
        <td class="amount">${(parseFloat(k1.lossSharePercent) * 100).toFixed(2)}%</td>
      </tr>
      <tr>
        <td>Capital Share</td>
        <td class="amount">${(parseFloat(k1.capitalSharePercent) * 100).toFixed(2)}%</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Part III - Partner's Share of Current Year Income, Deductions, Credits, and Other Items</h2>
    
    <h3>Income</h3>
    <table>
      <tr>
        <th>Line</th>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
      <tr>
        <td>1</td>
        <td>Ordinary business income (loss)</td>
        <td class="amount">$${k1.income.ordinaryIncome}</td>
      </tr>
      <tr>
        <td>2</td>
        <td>Net rental real estate income (loss)</td>
        <td class="amount">$${k1.income.rentalRealEstateIncome}</td>
      </tr>
      <tr>
        <td>3</td>
        <td>Other net rental income (loss)</td>
        <td class="amount">$${k1.income.otherRentalIncome}</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Guaranteed payments - Services</td>
        <td class="amount">$${k1.income.guaranteedPayments.forServices}</td>
      </tr>
      <tr>
        <td>4</td>
        <td>Guaranteed payments - Capital</td>
        <td class="amount">$${k1.income.guaranteedPayments.forCapital}</td>
      </tr>
      <tr>
        <td>5</td>
        <td>Interest income - Ordinary</td>
        <td class="amount">$${k1.income.interestIncome.ordinary}</td>
      </tr>
      <tr>
        <td>6</td>
        <td>Dividends - Ordinary</td>
        <td class="amount">$${k1.income.dividends.ordinary}</td>
      </tr>
      <tr>
        <td>7</td>
        <td>Royalties</td>
        <td class="amount">$${k1.income.royalties}</td>
      </tr>
      <tr>
        <td>8</td>
        <td>Net short-term capital gain (loss)</td>
        <td class="amount">$${k1.income.shortTermCapitalGain}</td>
      </tr>
      <tr>
        <td>9</td>
        <td>Net long-term capital gain (loss)</td>
        <td class="amount">$${k1.income.longTermCapitalGain}</td>
      </tr>
    </table>

    <h3>Self-Employment</h3>
    <table>
      <tr>
        <th>Line</th>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
      <tr>
        <td>14</td>
        <td>Self-employment earnings (loss)</td>
        <td class="amount">$${k1.credits.selfEmploymentEarnings}</td>
      </tr>
    </table>

    <h3>Distributions</h3>
    <table>
      <tr>
        <th>Line</th>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
      <tr>
        <td>19</td>
        <td>Cash distributions</td>
        <td class="amount">$${k1.otherInformation.cashDistributions}</td>
      </tr>
      <tr>
        <td>19</td>
        <td>Property distributions</td>
        <td class="amount">$${k1.otherInformation.propertyDistributions}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Part IV - Partner's Capital Account Analysis</h2>
    <table>
      <tr>
        <th>Description</th>
        <th class="amount">Amount</th>
      </tr>
      <tr>
        <td>Beginning capital account</td>
        <td class="amount">$${k1.capitalAccount.beginningCapital}</td>
      </tr>
      <tr>
        <td>Capital contributed during year</td>
        <td class="amount">$${k1.capitalAccount.capitalContributed}</td>
      </tr>
      <tr>
        <td>Current year increase (decrease)</td>
        <td class="amount">$${k1.capitalAccount.currentYearIncrease}</td>
      </tr>
      <tr>
        <td>Withdrawals and distributions</td>
        <td class="amount">($${k1.capitalAccount.distributions})</td>
      </tr>
      <tr>
        <td><strong>Ending capital account</strong></td>
        <td class="amount"><strong>$${k1.capitalAccount.endingCapital}</strong></td>
      </tr>
      <tr>
        <td colspan="2"><em>Capital account basis: ${k1.capitalAccount.basisMethod}</em></td>
      </tr>
    </table>
  </div>

  <div class="section">
    <p><em>This Schedule K-1 is for informational purposes. Consult with a tax professional regarding your specific tax situation.</em></p>
  </div>
</body>
</html>
`
}

/**
 * Escape CSV field
 */
function escapeCSV(value: any): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
