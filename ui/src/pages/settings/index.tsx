import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { Layout } from '../../components/Layout'
import { getCurrentUser } from '../../lib/auth'

export default function SettingsPage() {
  const user = getCurrentUser()
  const router = useRouter()
  const activeTab = (router.query.tab as string) || 'profile'

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'payment', label: 'Payment Methods', icon: '💳' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ]

  return (
    <ProtectedRoute requireAuth={true}>
      <Layout>
        <div className="settings-page">
          <div className="settings-header">
            <h1>Settings</h1>
            <p>Manage your account preferences and settings</p>
          </div>

          <div className="settings-container">
            <nav className="settings-nav">
              {tabs.map(tab => (
                <Link
                  key={tab.id}
                  href={`/settings?tab=${tab.id}`}
                  className={activeTab === tab.id ? 'active' : ''}
                >
                  <span className="icon">{tab.icon}</span>
                  {tab.label}
                </Link>
              ))}
            </nav>

            <div className="settings-content">
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
              {activeTab === 'payment' && <PaymentSettings />}
              {activeTab === 'security' && <SecuritySettings />}
            </div>
          </div>

          <style jsx>{`
            .settings-page {
              padding: 2rem;
              max-width: 1200px;
              margin: 0 auto;
            }
            .settings-header {
              margin-bottom: 2rem;
            }
            .settings-header h1 {
              font-size: 2rem;
              margin-bottom: 0.5rem;
              color: #1a202c;
            }
            .settings-header p {
              color: #718096;
            }
            .settings-container {
              display: grid;
              grid-template-columns: 250px 1fr;
              gap: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .settings-nav {
              background: #f7fafc;
              padding: 1.5rem 0;
              display: flex;
              flex-direction: column;
            }
            .settings-nav :global(a) {
              padding: 0.75rem 1.5rem;
              color: #4a5568;
              text-decoration: none;
              display: flex;
              align-items: center;
              gap: 0.75rem;
              transition: all 0.2s;
              border-left: 3px solid transparent;
            }
            .settings-nav :global(a:hover) {
              background: #edf2f7;
              color: #2d3748;
            }
            .settings-nav :global(a.active) {
              background: white;
              color: #667eea;
              border-left-color: #667eea;
              font-weight: 500;
            }
            .settings-nav .icon {
              font-size: 1.25rem;
            }
            .settings-content {
              padding: 2rem;
            }
            @media (max-width: 768px) {
              .settings-container {
                grid-template-columns: 1fr;
              }
              .settings-nav {
                flex-direction: row;
                overflow-x: auto;
                padding: 1rem;
              }
              .settings-nav :global(a) {
                white-space: nowrap;
                border-left: none;
                border-bottom: 3px solid transparent;
              }
              .settings-nav :global(a.active) {
                border-left: none;
                border-bottom-color: #667eea;
              }
            }
          `}</style>
        </div>
      </Layout>
    </ProtectedRoute>
  )
}

function ProfileSettings() {
  const user = getCurrentUser()
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    ensName: '',
    bio: '',
    location: '',
    website: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: Call update profile mutation
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      <h2>Profile Information</h2>
      <p className="subtitle">Update your personal information and how others see you.</p>

      <div className="form-group">
        <label>Display Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          placeholder="Your name"
          required
        />
      </div>

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={e => handleChange('email', e.target.value)}
          placeholder="you@example.com"
          required
        />
        <small>Primary email for notifications and account recovery</small>
      </div>

      <div className="form-group">
        <label>ENS Name</label>
        <input
          type="text"
          value={formData.ensName}
          onChange={e => handleChange('ensName', e.target.value)}
          placeholder="yourname.eth"
        />
        <small>Optional: Link your Ethereum Name Service domain</small>
      </div>

      <div className="form-group">
        <label>Bio</label>
        <textarea
          value={formData.bio}
          onChange={e => handleChange('bio', e.target.value)}
          placeholder="Tell us about yourself..."
          rows={4}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={e => handleChange('location', e.target.value)}
            placeholder="City, Country"
          />
        </div>

        <div className="form-group">
          <label>Website</label>
          <input
            type="url"
            value={formData.website}
            onChange={e => handleChange('website', e.target.value)}
            placeholder="https://yoursite.com"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving} className="primary">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .settings-form {
          max-width: 600px;
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        .subtitle {
          color: #718096;
          margin-bottom: 2rem;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #2d3748;
        }
        input, textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 1rem;
        }
        input:focus, textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        small {
          display: block;
          margin-top: 0.25rem;
          color: #a0aec0;
          font-size: 0.875rem;
        }
        .form-actions {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        button {
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        button.primary {
          background: #667eea;
          color: white;
          border: none;
        }
        button.primary:hover:not(:disabled) {
          background: #5a67d8;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  )
}

function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    contributionApproved: true,
    contributionRejected: true,
    allocationReady: true,
    periodClose: true,
    balanceChanges: false,
    weeklyDigest: true,
  })
  const [saving, setSaving] = useState(false)

  const handleToggle = (key: string) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: Call update preferences mutation
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      <h2>Notification Preferences</h2>
      <p className="subtitle">Choose what notifications you want to receive.</p>

      <div className="preference-section">
        <h3>Email Notifications</h3>
        <div className="preference-item">
          <div>
            <strong>Enable Email Notifications</strong>
            <p>Receive updates via email</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.emailNotifications}
            onChange={() => handleToggle('emailNotifications')}
          />
        </div>
      </div>

      <div className="preference-section">
        <h3>Contribution Updates</h3>
        <div className="preference-item">
          <div>
            <strong>Contribution Approved</strong>
            <p>When your contribution is approved by a steward</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.contributionApproved}
            onChange={() => handleToggle('contributionApproved')}
            disabled={!preferences.emailNotifications}
          />
        </div>

        <div className="preference-item">
          <div>
            <strong>Contribution Rejected</strong>
            <p>When your contribution is rejected</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.contributionRejected}
            onChange={() => handleToggle('contributionRejected')}
            disabled={!preferences.emailNotifications}
          />
        </div>
      </div>

      <div className="preference-section">
        <h3>Allocation & Period Updates</h3>
        <div className="preference-item">
          <div>
            <strong>Allocation Ready</strong>
            <p>When your period allocation is calculated</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.allocationReady}
            onChange={() => handleToggle('allocationReady')}
            disabled={!preferences.emailNotifications}
          />
        </div>

        <div className="preference-item">
          <div>
            <strong>Period Close</strong>
            <p>When a period is closed and allocations are finalized</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.periodClose}
            onChange={() => handleToggle('periodClose')}
            disabled={!preferences.emailNotifications}
          />
        </div>
      </div>

      <div className="preference-section">
        <h3>Account Updates</h3>
        <div className="preference-item">
          <div>
            <strong>Balance Changes</strong>
            <p>When your capital account balance changes</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.balanceChanges}
            onChange={() => handleToggle('balanceChanges')}
            disabled={!preferences.emailNotifications}
          />
        </div>

        <div className="preference-item">
          <div>
            <strong>Weekly Digest</strong>
            <p>Summary of your activity and pending items</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.weeklyDigest}
            onChange={() => handleToggle('weeklyDigest')}
            disabled={!preferences.emailNotifications}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving} className="primary">
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      <style jsx>{`
        .settings-form {
          max-width: 700px;
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        .subtitle {
          color: #718096;
          margin-bottom: 2rem;
        }
        .preference-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .preference-section:last-of-type {
          border-bottom: none;
        }
        h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: #2d3748;
        }
        .preference-item {
          display: flex;
          justify-content: space-between;
          align-items: start;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 6px;
          margin-bottom: 0.75rem;
        }
        .preference-item strong {
          display: block;
          color: #2d3748;
          margin-bottom: 0.25rem;
        }
        .preference-item p {
          color: #718096;
          font-size: 0.875rem;
          margin: 0;
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          flex-shrink: 0;
        }
        input[type="checkbox"]:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .form-actions {
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }
        button {
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        button.primary {
          background: #667eea;
          color: white;
          border: none;
        }
        button.primary:hover:not(:disabled) {
          background: #5a67d8;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  )
}

function PaymentSettings() {
  return (
    <div className="settings-form">
      <h2>Payment Methods</h2>
      <p className="subtitle">Manage how you receive patronage distributions.</p>

      <div className="payment-methods">
        <div className="empty-state">
          <div className="icon">💳</div>
          <h3>No payment methods yet</h3>
          <p>Add a payment method to receive cash distributions</p>
          <button className="primary">Add Payment Method</button>
        </div>
      </div>

      <div className="info-box">
        <strong>Supported Payment Methods:</strong>
        <ul>
          <li>Bank Account (ACH transfer)</li>
          <li>Cryptocurrency Wallet</li>
          <li>Check (by request)</li>
        </ul>
      </div>

      <style jsx>{`
        .settings-form {
          max-width: 600px;
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        .subtitle {
          color: #718096;
          margin-bottom: 2rem;
        }
        .payment-methods {
          margin-bottom: 2rem;
        }
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          background: #f7fafc;
          border-radius: 8px;
          border: 2px dashed #e2e8f0;
        }
        .empty-state .icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .empty-state h3 {
          font-size: 1.125rem;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }
        .empty-state p {
          color: #718096;
          margin-bottom: 1.5rem;
        }
        .info-box {
          background: #edf2f7;
          padding: 1.5rem;
          border-radius: 6px;
          border-left: 4px solid #667eea;
        }
        .info-box strong {
          display: block;
          margin-bottom: 0.75rem;
          color: #2d3748;
        }
        .info-box ul {
          margin: 0;
          padding-left: 1.5rem;
        }
        .info-box li {
          color: #4a5568;
          margin-bottom: 0.5rem;
        }
        button.primary {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
        }
        button.primary:hover {
          background: #5a67d8;
        }
      `}</style>
    </div>
  )
}

function SecuritySettings() {
  const [showChangePassword, setShowChangePassword] = useState(false)

  return (
    <div className="settings-form">
      <h2>Security Settings</h2>
      <p className="subtitle">Manage your account security and authentication.</p>

      <div className="security-section">
        <h3>Password</h3>
        <div className="security-item">
          <div>
            <strong>Change Password</strong>
            <p>Update your password regularly for better security</p>
          </div>
          <button onClick={() => setShowChangePassword(!showChangePassword)}>
            Change
          </button>
        </div>

        {showChangePassword && <ChangePasswordForm />}
      </div>

      <div className="security-section">
        <h3>Active Sessions</h3>
        <div className="session-item">
          <div>
            <strong>Current Session</strong>
            <p>Boulder, Colorado • Chrome on macOS</p>
            <small>Last active: Just now</small>
          </div>
          <span className="badge">Active</span>
        </div>
      </div>

      <div className="security-section">
        <h3>Danger Zone</h3>
        <div className="danger-item">
          <div>
            <strong>Delete Account</strong>
            <p>Permanently delete your account and all associated data</p>
          </div>
          <button className="danger">Delete Account</button>
        </div>
      </div>

      <style jsx>{`
        .settings-form {
          max-width: 700px;
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }
        .subtitle {
          color: #718096;
          margin-bottom: 2rem;
        }
        .security-section {
          margin-bottom: 2rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .security-section:last-of-type {
          border-bottom: none;
        }
        h3 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          color: #2d3748;
        }
        .security-item, .session-item, .danger-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f7fafc;
          border-radius: 6px;
          margin-bottom: 0.75rem;
        }
        .danger-item {
          background: #fff5f5;
          border: 1px solid #feb2b2;
        }
        .security-item strong, .session-item strong, .danger-item strong {
          display: block;
          color: #2d3748;
          margin-bottom: 0.25rem;
        }
        .security-item p, .session-item p, .danger-item p {
          color: #718096;
          font-size: 0.875rem;
          margin: 0;
        }
        .session-item small {
          display: block;
          color: #a0aec0;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
        .badge {
          background: #48bb78;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
        }
        button {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
          border: 1px solid #e2e8f0;
          color: #4a5568;
        }
        button:hover {
          border-color: #cbd5e0;
          background: #f7fafc;
        }
        button.danger {
          color: #c53030;
          border-color: #fc8181;
        }
        button.danger:hover {
          background: #fff5f5;
        }
      `}</style>
    </div>
  )
}

function ChangePasswordForm() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.newPassword !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setSaving(true)
    try {
      // TODO: Call change password mutation
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Password changed successfully')
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="change-password-form">
      <div className="form-group">
        <label>Current Password</label>
        <input
          type="password"
          value={formData.currentPassword}
          onChange={e => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
          required
        />
      </div>

      <div className="form-group">
        <label>New Password</label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={e => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
          required
          minLength={8}
        />
      </div>

      <div className="form-group">
        <label>Confirm New Password</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={e => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
          required
        />
      </div>

      <button type="submit" disabled={saving} className="primary">
        {saving ? 'Changing...' : 'Change Password'}
      </button>

      <style jsx>{`
        .change-password-form {
          background: white;
          padding: 1.5rem;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          margin-top: 1rem;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #2d3748;
          font-size: 0.875rem;
        }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button.primary {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          margin-top: 0.5rem;
        }
        button.primary:hover:not(:disabled) {
          background: #5a67d8;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  )
}
