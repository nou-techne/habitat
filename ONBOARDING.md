# Member Onboarding Guide

**Version:** 1.0.0  
**Organization:** Techne / RegenHub LCA  
**System:** Habitat Patronage Accounting  
**Target:** Q1 2026 Allocation (by March 31)

---

## Welcome to Habitat

Welcome to the Habitat patronage accounting system! This guide will help you get started with tracking your contributions and understanding how allocations work in the RegenHub cooperative.

**What is Habitat?**
Habitat is our collective intelligence infrastructure for tracking member contributions, calculating patronage-based allocations, and maintaining transparent capital accounts. It's how we make the cooperative's economic relationships visible and fair.

**What you'll learn:**
- How to log in and access your dashboard
- How to submit contributions
- How to view your capital account
- How allocations work
- Where to get help

---

## Getting Started

### Step 1: Receive Your Credentials

You'll receive an email from `admin@habitat.eth` with:
- **Login URL:** https://habitat.eth/login
- **Your Email:** (your cooperative email)
- **Temporary Password:** (secure, randomly generated)

**Important:** Change your password on first login.

### Step 2: First Login

1. Navigate to https://habitat.eth/login
2. Enter your email and temporary password
3. Click "Log In"
4. You'll be prompted to change your password
5. Choose a strong password (12+ characters, mix of letters/numbers/symbols)
6. Confirm your new password
7. You'll be redirected to your dashboard

**Troubleshooting:**
- "Invalid credentials" → Check email spelling, password copied correctly
- "Account not found" → Contact admin (your account may not be created yet)
- Can't access site → Check you're using https:// (not http://)

### Step 3: Explore Your Dashboard

Your dashboard shows:

**Capital Account:**
- Current balance (your equity in the cooperative)
- Tax basis (for tax reporting)
- Last updated timestamp

**Recent Contributions:**
- Your submitted contributions
- Status (pending, approved, rejected)
- Amounts and dates

**Recent Allocations:**
- Patronage dividends you've received
- Period names (e.g., "Q1 2026")
- Patronage scores and amounts

**Quick Actions:**
- Submit New Contribution
- View All Contributions
- View Allocation History
- Account Settings

---

## Submitting Your First Contribution

### What is a Contribution?

A **contribution** is any value you bring to the cooperative:
- **Labor:** Hours worked, services provided, expertise shared
- **Capital:** Money invested, equipment provided, space donated
- **Property:** Assets contributed (equipment, IP, resources)

Contributions are the basis for patronage allocations. The more you contribute (proportionally), the more you receive in allocations.

### How to Submit a Contribution

1. **Navigate to Contributions**
   - From dashboard, click "Submit New Contribution"
   - Or go to: https://habitat.eth/contributions/new

2. **Fill Out the Form**
   
   **Contribution Type:** (select one)
   - Labor (most common for early-stage work)
   - Capital (cash contributions)
   - Property (equipment, assets)
   
   **Amount:** (in USD equivalent)
   - Labor: hours × hourly rate (use $100/hr default if unsure)
   - Capital: actual USD amount
   - Property: fair market value
   
   **Description:** (be specific!)
   - What did you do?
   - When did you do it?
   - What was the impact/outcome?
   
   **Example (Labor):**
   ```
   Type: Labor
   Amount: $400.00
   Description: 4 hours working on Habitat deployment. 
   Configured production environment, ran migrations, 
   verified health checks. Completed Sprints 109-112.
   ```
   
   **Example (Capital):**
   ```
   Type: Capital
   Amount: $5000.00
   Description: Initial capital contribution to RegenHub LCA 
   for operating expenses and infrastructure setup.
   ```

3. **Submit**
   - Click "Submit Contribution"
   - You'll see a success message
   - Your contribution appears in the list with "Pending" status

4. **Wait for Approval**
   - A steward will review your contribution
   - You'll see status change to "Approved" or "Rejected"
   - Approved contributions count toward your patronage score

### Contribution Guidelines

**Be Honest:**
- Only claim work you actually did
- Use reasonable hourly rates (ask if unsure)
- Don't inflate amounts

**Be Specific:**
- Describe what you did, not just "worked on project"
- Include outcomes, deliverables, impact
- Link to artifacts (PRs, docs, designs) when possible

**Be Timely:**
- Submit contributions close to when work was done
- Don't wait until end of quarter
- Easier for stewards to verify recent work

**Ask Questions:**
- Not sure what rate to use? Ask!
- Not sure if something counts? Ask!
- Better to ask than guess wrong

---

## Understanding Allocations

### What is an Allocation?

An **allocation** is your share of the cooperative's surplus (patronage dividend). It's calculated based on your proportional contribution to the cooperative's activities.

**Formula:**
```
Your Patronage Score = Your Contributions / Total Contributions
Your Allocation = Total Distribution × Your Patronage Score
```

**Example:**
- You contributed $400 worth of labor
- Total contributions from all members: $2,000
- Your patronage score: $400 / $2,000 = 0.2 (20%)
- Total distribution available: $10,000
- Your allocation: $10,000 × 0.2 = $2,000

### Weighted Contributions

Different types of contributions may have different weights:
- **Labor:** 1.0 (full value)
- **Capital:** 0.5 (half value)
- **Property:** 0.5 (half value)

This reflects that labor contributions are the primary basis of cooperative value.

**Example with Weights:**
- You contributed $400 labor + $1,000 capital
- Weighted: ($400 × 1.0) + ($1,000 × 0.5) = $900
- If total weighted contributions = $4,500
- Your score = $900 / $4,500 = 0.2 (20%)

### When Do Allocations Happen?

Allocations happen at the **end of each period** (typically quarterly):

1. **Period closes** (e.g., March 31 for Q1)
2. **All contributions are finalized** (no more submissions)
3. **Allocations are calculated** (patronage formula applied)
4. **Capital accounts are updated** (your balance increases)
5. **K-1 data is generated** (for tax reporting)

### Viewing Your Allocations

1. Navigate to https://habitat.eth/patronage
2. Find the closed period (e.g., "Q1 2026")
3. Click "View Allocation"
4. You'll see:
   - Your patronage score
   - Your allocation amount
   - Contributions included
   - Period total and your share

---

## Your Capital Account

### What is a Capital Account?

Your **capital account** is your equity stake in the cooperative. It tracks:
- **Beginning balance** (what you started with)
- **Contributions** (what you put in)
- **Allocations** (what you earned through patronage)
- **Distributions** (what you withdrew)
- **Ending balance** (your current equity)

**Formula:**
```
Ending Balance = Beginning Balance 
                + Contributions 
                + Allocations 
                - Distributions
```

### Tax Implications

Your capital account has **tax implications**:
- Allocations are taxable income (even if not distributed)
- You'll receive a K-1 form annually
- Track your tax basis (for when you eventually withdraw)
- Consult a tax professional for personal guidance

**Important:** Habitat tracks tax basis automatically, but you're responsible for proper tax reporting.

### Viewing Your Capital Account

From your dashboard, you'll see:
- **Current Balance:** Your equity stake
- **Tax Basis:** For tax reporting
- **Last Updated:** When balance last changed

For detailed history:
1. Navigate to https://habitat.eth/patronage
2. Click "Capital Account Statement"
3. Download PDF (shows all transactions)

---

## Common Questions

### How much should I charge for labor?

**Default rate:** $100/hour (market rate for skilled labor)

**Can vary based on:**
- Your expertise level
- Market rates for similar work
- Cooperative agreements
- Type of work (core vs. peripheral)

**Ask yourself:**
- What would I charge a client for this work?
- What would it cost to hire someone to do this?
- Is this core work or volunteer contribution?

**When in doubt:** Ask a steward or use $100/hr

### What if I disagree with an approval decision?

1. **First:** Understand why
   - Check rejection reason (if provided)
   - Was description unclear?
   - Was amount unreasonable?

2. **Then:** Discuss
   - Message the approving steward
   - Explain your perspective
   - Provide additional context

3. **If needed:** Escalate
   - Bring to governance meeting
   - Ask for collective review
   - Cooperative can override steward decisions

### Can I edit a submitted contribution?

**No** - Once submitted, contributions are immutable (for audit trail).

**If you made a mistake:**
1. Submit a new contribution with correct info
2. Submit a negative contribution to cancel the wrong one
3. Add note explaining the correction

**Better:** Double-check before submitting!

### How often should I submit contributions?

**Recommended:** Weekly or after each significant effort

**Benefits of frequent submission:**
- Easier to remember details
- Easier for stewards to verify
- Better audit trail
- More accurate patronage tracking

**Don't wait** until end of quarter!

### What counts as a contribution?

**Definitely counts:**
- Paid work for the cooperative
- Volunteer time on core projects
- Cash contributions
- Equipment/assets provided

**Probably counts (ask first):**
- Attending meetings (if substantial time)
- Learning/training (if directly applicable)
- Recruiting/outreach (if successful)

**Probably doesn't count:**
- Personal benefit activities
- General learning not applied
- Social/casual time
- Failed efforts with no output

**Golden rule:** If it created value for the cooperative, it probably counts.

### Can I see other members' contributions?

**Transparency depends on role:**

**Members:** Can see own contributions only

**Stewards:** Can see contributions they need to approve

**Admins:** Can see all contributions (for transparency and governance)

**Rationale:** Privacy balanced with transparency. Core transactions are visible to governance roles.

### What if I have technical issues?

**For technical problems:**
1. Check https://habitat.eth/health (system status)
2. Try logging out and back in
3. Clear browser cache
4. Try different browser
5. Contact admin at admin@habitat.eth

**For access issues:**
- Forgot password: Use "Reset Password" on login page
- Account locked: Contact admin
- Can't log in: Verify email, check spam folder for credentials

---

## Member Types and Permissions

### Member (You!)

**What you can do:**
- Log in and view dashboard
- Submit contributions
- View your own contributions
- View your capital account
- View your allocations
- Update your profile

**What you can't do:**
- Approve contributions (steward role)
- Close periods (admin role)
- View other members' data (privacy)
- Modify system settings

### Steward

**Additional permissions:**
- View pending contributions
- Approve or reject contributions
- Add approval notes
- View contribution patterns (for governance)

### Admin

**Additional permissions:**
- Create/edit allocation periods
- Close periods and trigger calculations
- View all member data
- Generate reports
- Manage member accounts

---

## Best Practices

### For Contributing

1. **Be consistent** - Submit regularly, don't batch
2. **Be detailed** - Future-you will thank past-you
3. **Be honest** - Trust is the foundation
4. **Be reasonable** - Use market rates, don't inflate
5. **Be timely** - Submit within a week of work

### For Tracking

1. **Keep your own records** - Don't rely solely on Habitat
2. **Track actual hours** - Use time tracking tools
3. **Save receipts** - For capital contributions
4. **Document deliverables** - Links, screenshots, artifacts
5. **Note impacts** - What value was created?

### For Collaboration

1. **Communicate** - Ask questions, don't assume
2. **Be transparent** - Share challenges, not just successes
3. **Help others** - Answer questions, share knowledge
4. **Give feedback** - System is evolving, share ideas
5. **Trust the process** - It's new, we're learning together

---

## Security and Privacy

### Your Responsibilities

**Passwords:**
- Change temporary password on first login
- Use strong, unique password
- Don't share your password
- Use password manager

**Account Security:**
- Log out when using shared computers
- Don't leave session open unattended
- Report suspicious activity
- Enable 2FA (when available)

**Data Privacy:**
- Your contribution data is visible to stewards/admins
- Your capital account is private (only you + admins)
- Financial reports may aggregate your data
- K-1 forms are confidential

### System Security

Habitat implements:
- HTTPS encryption (all data encrypted in transit)
- Password hashing (passwords never stored in plain text)
- SQL injection prevention (all queries parameterized)
- Rate limiting (prevents brute force attacks)
- Audit logging (all sensitive actions logged)
- Regular backups (daily, encrypted)

**You're safe.** But be smart with your credentials.

---

## Getting Help

### Documentation

- **This guide:** https://habitat.eth/onboarding (bookmark it!)
- **User manual:** https://habitat.eth/help
- **FAQ:** https://habitat.eth/faq
- **System status:** https://habitat.eth/health

### Support Channels

**For questions about:**
- **Contributing:** Ask a steward
- **Technical issues:** Email admin@habitat.eth
- **Governance:** Bring to cooperative meeting
- **Urgent issues:** Slack #habitat channel

### Office Hours

**Steward Office Hours:**
- Weekly on Wednesdays, 2-3 PM MT
- Join to ask questions, get help with submissions
- Optional but recommended for new members

### Feedback

**We want your input!**
- What's confusing?
- What's not working well?
- What features would help?
- What could be better?

Share via:
- Slack #habitat channel
- Cooperative meetings
- Direct message to stewards/admins

**This system is ours.** Help shape it.

---

## Next Steps

### Immediate (First Week)

- [ ] Log in and change password
- [ ] Explore your dashboard
- [ ] Submit your first contribution
- [ ] Review this guide completely
- [ ] Bookmark https://habitat.eth
- [ ] Join Slack #habitat channel
- [ ] Attend office hours (optional)

### Ongoing (Throughout Quarter)

- [ ] Submit contributions weekly
- [ ] Track your hours outside Habitat too
- [ ] Ask questions when unsure
- [ ] Help other members learn
- [ ] Provide feedback on system

### End of Quarter (March 31)

- [ ] Final contribution submissions
- [ ] Review total contributions
- [ ] Wait for period close
- [ ] View your allocation
- [ ] Download capital account statement
- [ ] Celebrate! 🎉

---

## Glossary

**Allocation:** Your share of surplus (patronage dividend)  
**Capital Account:** Your equity stake in the cooperative  
**Contribution:** Value you bring to the cooperative (labor, capital, property)  
**Patronage:** Business done with/for the cooperative  
**Patronage Score:** Your proportional contribution (your contributions / total contributions)  
**Period:** Time period for allocations (typically quarterly)  
**Steward:** Member who reviews and approves contributions  
**Tax Basis:** Your basis for tax reporting (contributions + allocations - distributions)

---

## Appendix: Sample Contributions

### Good Examples

**Labor - Software Development:**
```
Type: Labor
Amount: $800.00
Description: 8 hours implementing patronage allocation formula 
in Habitat. Completed calculation engine with weighted contributions, 
wrote tests (95% coverage), documented in Sprint 87-92. 
PR: github.com/nou-techne/habitat/pull/42
```

**Labor - Operations:**
```
Type: Labor
Amount: $400.00
Description: 4 hours on production deployment. Set up VPS, 
configured DNS, deployed all services, ran migrations, 
verified health checks. System now live at habitat.eth. 
See: PRODUCTION_SETUP.md
```

**Capital - Initial Investment:**
```
Type: Capital
Amount: $5000.00
Description: Initial capital contribution to RegenHub LCA 
for operating expenses, infrastructure, and runway. 
Funds transferred 2026-01-15. Receipt: [attachment]
```

**Labor - Design:**
```
Type: Labor
Amount: $600.00
Description: 6 hours designing member onboarding flow. 
Created wireframes for dashboard, contribution form, 
and allocation view. Implemented responsive UI with 
Tailwind. Figma: [link]
```

### Bad Examples (and why)

**Too Vague:**
```
Type: Labor
Amount: $400.00
Description: Worked on the project
```
❌ What work? When? What was produced?

**Inflated Amount:**
```
Type: Labor  
Amount: $5000.00
Description: 1 hour thinking about strategy
```
❌ $5000/hr is not reasonable for thinking time

**Not Timely:**
```
Type: Labor
Amount: $2000.00  
Description: All my Q1 work (various tasks)
```
❌ Submit regularly, not in one batch. Be specific.

**Personal Benefit:**
```
Type: Labor
Amount: $300.00
Description: 3 hours learning React for fun
```
❌ Personal learning doesn't count unless directly applied to cooperative work

---

**Welcome aboard! We're building this together.** 🚀

For questions: admin@habitat.eth  
For urgent issues: Slack #habitat  
For feedback: We're listening!

---

**Onboarding Guide Version:** 1.0.0  
**Last Updated:** 2026-02-10  
**Next Review:** Monthly (incorporate member feedback)
