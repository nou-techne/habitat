# Sprint 120: Notification System

**Sprint:** 120  
**Role:** Event Systems Engineer (04)  
**Layer:** 4 (Event)  
**Type:** Implementation  
**Status:** COMPLETE

---

## Overview

Event-driven notification system for key patronage accounting events. Members receive email notifications when their contributions are reviewed, allocations are proposed, and distributions are scheduled. Configurable preferences allow opt-in/opt-out per notification type.

---

## Architecture

### Event-Driven Design

Notifications triggered by events published to RabbitMQ (already implemented in Sprint 77-84).

**Event Flow:**
1. Domain action occurs (contribution approved, allocation proposed, etc.)
2. Event published to RabbitMQ exchange
3. Notification worker consumes event
4. Worker checks member preferences
5. If enabled, sends notification via configured channel(s)
6. Logs notification delivery status

### Notification Channels

**Phase 1 (This Sprint):**
- Email (via SendGrid/Mailgun/SMTP)
- In-app notifications (database records)

**Phase 2 (Future):**
- Webhooks (for integrations)
- SMS (via Twilio)
- Push notifications (mobile)

---

## Database Schema

### Notification Preferences

Location: `habitat/schema/07_notifications.sql`

```sql
-- Notification preferences per member
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  -- Channel enablement
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  
  -- Event subscriptions
  contribution_approved BOOLEAN NOT NULL DEFAULT true,
  contribution_rejected BOOLEAN NOT NULL DEFAULT true,
  allocation_proposed BOOLEAN NOT NULL DEFAULT true,
  allocation_approved BOOLEAN NOT NULL DEFAULT true,
  distribution_scheduled BOOLEAN NOT NULL DEFAULT true,
  period_closed BOOLEAN NOT NULL DEFAULT true,
  
  -- Batch preferences
  daily_digest BOOLEAN NOT NULL DEFAULT false,
  digest_time TIME NOT NULL DEFAULT '09:00:00',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(member_id)
);

-- Notification delivery log
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'email', 'webhook', 'in_app'
  
  -- Content
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB,
  
  -- Delivery tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- External tracking
  external_id TEXT, -- SendGrid message ID, etc.
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_member ON notification_log(member_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_event_type ON notification_log(event_type);
CREATE INDEX idx_notification_log_created_at ON notification_log(created_at);

-- In-app notifications (read/unread tracking)
CREATE TABLE in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT, -- Deep link to relevant page
  icon TEXT, -- 'info', 'success', 'warning', 'error'
  
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_in_app_notifications_member ON in_app_notifications(member_id);
CREATE INDEX idx_in_app_notifications_read ON in_app_notifications(member_id, read);
CREATE INDEX idx_in_app_notifications_created_at ON in_app_notifications(created_at);

-- Trigger to update updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Event Handlers

### Notification Worker

Location: `packages/worker/src/handlers/notifications.ts`

```typescript
import { Channel, ConsumeMessage } from 'amqplib';
import { sendEmail } from '../services/email';
import { sendWebhook } from '../services/webhook';
import { db } from '../db';

interface NotificationEvent {
  type: string;
  memberId: string;
  data: Record<string, any>;
}

export async function handleNotificationEvent(
  channel: Channel,
  msg: ConsumeMessage
) {
  const event: NotificationEvent = JSON.parse(msg.content.toString());
  
  try {
    // Get member preferences
    const [prefs] = await db.query(
      `SELECT * FROM notification_preferences WHERE member_id = $1`,
      [event.memberId]
    );
    
    // Default preferences if not set
    const preferences = prefs || {
      email_enabled: true,
      webhook_enabled: false,
      contribution_approved: true,
      contribution_rejected: true,
      allocation_proposed: true,
      allocation_approved: true,
      distribution_scheduled: true,
      period_closed: true
    };
    
    // Check if member wants this notification type
    const eventKey = event.type.replace(':', '_').toLowerCase();
    if (!preferences[eventKey]) {
      console.log(`Member ${event.memberId} opted out of ${event.type}`);
      channel.ack(msg);
      return;
    }
    
    // Get member details
    const [member] = await db.query(
      `SELECT * FROM members WHERE id = $1`,
      [event.memberId]
    );
    
    if (!member) {
      console.warn(`Member ${event.memberId} not found`);
      channel.ack(msg);
      return;
    }
    
    // Build notification content
    const notification = buildNotification(event, member);
    
    // Send via enabled channels
    const deliveries: Promise<any>[] = [];
    
    if (preferences.email_enabled && member.email) {
      deliveries.push(sendEmailNotification(member, notification));
    }
    
    if (preferences.webhook_enabled && preferences.webhook_url) {
      deliveries.push(sendWebhookNotification(preferences.webhook_url, notification));
    }
    
    // Always create in-app notification
    deliveries.push(createInAppNotification(member.id, notification));
    
    await Promise.all(deliveries);
    
    channel.ack(msg);
  } catch (error) {
    console.error('Notification handling failed:', error);
    
    // Retry with exponential backoff
    const retries = (msg.properties.headers['x-retries'] || 0) + 1;
    if (retries < 5) {
      await channel.publish(
        'notifications',
        msg.fields.routingKey,
        msg.content,
        {
          headers: { 'x-retries': retries },
          expiration: String(Math.pow(2, retries) * 1000) // 1s, 2s, 4s, 8s, 16s
        }
      );
    } else {
      console.error('Max retries exceeded, moving to DLQ');
      // Would move to dead letter queue in production
    }
    
    channel.ack(msg);
  }
}

function buildNotification(event: NotificationEvent, member: any) {
  const templates = {
    'contribution:approved': {
      subject: 'Contribution Approved',
      title: 'Your contribution was approved',
      body: `Your contribution "${event.data.description}" (${event.data.hours} hours) has been approved by ${event.data.approverName}.`,
      link: `/contributions`,
      icon: 'success'
    },
    'contribution:rejected': {
      subject: 'Contribution Needs Revision',
      title: 'Contribution requires changes',
      body: `Your contribution "${event.data.description}" needs revision. Reason: ${event.data.rejectionReason}`,
      link: `/contributions`,
      icon: 'warning'
    },
    'allocation:proposed': {
      subject: 'Allocation Proposed for Review',
      title: 'Period allocation proposed',
      body: `Period ${event.data.periodName} allocations have been proposed. Your allocation: $${event.data.amount.toLocaleString()}. Review and vote by ${event.data.deadline}.`,
      link: `/patronage`,
      icon: 'info'
    },
    'allocation:approved': {
      subject: 'Allocation Approved',
      title: 'Allocation approved',
      body: `Period ${event.data.periodName} allocations have been approved. Your allocation: $${event.data.amount.toLocaleString()}.`,
      link: `/patronage`,
      icon: 'success'
    },
    'distribution:scheduled': {
      subject: 'Distribution Scheduled',
      title: 'Distribution payment scheduled',
      body: `Your allocation of $${event.data.amount.toLocaleString()} is scheduled for payment on ${event.data.paymentDate}.`,
      link: `/patronage`,
      icon: 'info'
    },
    'period:closed': {
      subject: 'Period Closed',
      title: 'Accounting period closed',
      body: `Period ${event.data.periodName} has been closed. Final allocations are being calculated.`,
      link: `/periods`,
      icon: 'info'
    }
  };
  
  const template = templates[event.type] || {
    subject: 'Habitat Notification',
    title: event.type,
    body: JSON.stringify(event.data),
    link: '/',
    icon: 'info'
  };
  
  return {
    ...template,
    memberName: member.name,
    memberEmail: member.email
  };
}

async function sendEmailNotification(member: any, notification: any) {
  const emailBody = `
    <html>
      <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${notification.title}</h2>
        <p>Hi ${notification.memberName},</p>
        <p>${notification.body}</p>
        <p>
          <a href="${process.env.APP_URL}${notification.link}" 
             style="display: inline-block; padding: 12px 24px; background: #3182ce; color: white; text-decoration: none; border-radius: 4px;">
            View in Habitat
          </a>
        </p>
        <hr style="margin: 32px 0; border: none; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #718096;">
          <a href="${process.env.APP_URL}/settings/notifications">Manage notification preferences</a>
        </p>
      </body>
    </html>
  `;
  
  try {
    const result = await sendEmail({
      to: member.email,
      subject: notification.subject,
      html: emailBody
    });
    
    await db.query(
      `INSERT INTO notification_log 
       (member_id, event_type, channel, subject, body, status, sent_at, external_id)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        member.id,
        notification.type,
        'email',
        notification.subject,
        emailBody,
        'sent',
        result.messageId
      ]
    );
    
    return result;
  } catch (error) {
    await db.query(
      `INSERT INTO notification_log 
       (member_id, event_type, channel, subject, body, status, failed_at, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        member.id,
        notification.type,
        'email',
        notification.subject,
        emailBody,
        'failed',
        error.message
      ]
    );
    
    throw error;
  }
}

async function sendWebhookNotification(url: string, notification: any) {
  const payload = {
    event: notification.type,
    timestamp: new Date().toISOString(),
    data: notification
  };
  
  try {
    const result = await sendWebhook(url, payload);
    
    await db.query(
      `INSERT INTO notification_log 
       (member_id, event_type, channel, subject, body, status, sent_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        notification.memberId,
        notification.type,
        'webhook',
        notification.subject,
        JSON.stringify(payload),
        'sent',
        JSON.stringify({ url, statusCode: result.statusCode })
      ]
    );
    
    return result;
  } catch (error) {
    await db.query(
      `INSERT INTO notification_log 
       (member_id, event_type, channel, subject, body, status, failed_at, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
      [
        notification.memberId,
        notification.type,
        'webhook',
        notification.subject,
        JSON.stringify(payload),
        'failed',
        error.message
      ]
    );
    
    throw error;
  }
}

async function createInAppNotification(memberId: string, notification: any) {
  await db.query(
    `INSERT INTO in_app_notifications 
     (member_id, title, body, link, icon)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      memberId,
      notification.title,
      notification.body,
      notification.link,
      notification.icon
    ]
  );
}
```

### Email Service

Location: `packages/worker/src/services/email.ts`

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(options: EmailOptions) {
  const from = process.env.EMAIL_FROM || 'noreply@habitat.example.com';
  
  const result = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html
  });
  
  return {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected
  };
}
```

### Webhook Service

Location: `packages/worker/src/services/webhook.ts`

```typescript
import fetch from 'node-fetch';

export async function sendWebhook(url: string, payload: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Habitat-Webhook/1.0'
    },
    body: JSON.stringify(payload),
    timeout: 5000
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
  
  return {
    statusCode: response.status,
    body: await response.text()
  };
}
```

---

## API: Notification Preferences

### GraphQL Schema

Location: `packages/api/src/graphql/schema.ts`

```graphql
extend type Query {
  # Get current user's notification preferences
  myNotificationPreferences: NotificationPreferences!
  
  # Get in-app notifications
  myNotifications(unreadOnly: Boolean, limit: Int): [InAppNotification!]!
  
  # Get notification delivery log (admin only)
  notificationLog(memberId: ID, limit: Int): [NotificationLogEntry!]!
}

extend type Mutation {
  # Update notification preferences
  updateNotificationPreferences(input: NotificationPreferencesInput!): NotificationPreferences!
  
  # Mark in-app notification as read
  markNotificationRead(id: ID!): InAppNotification!
  
  # Mark all in-app notifications as read
  markAllNotificationsRead: Int!
  
  # Test notification (sends test email)
  sendTestNotification: Boolean!
}

type NotificationPreferences {
  id: ID!
  memberId: ID!
  
  # Channels
  emailEnabled: Boolean!
  webhookEnabled: Boolean!
  webhookUrl: String
  
  # Event subscriptions
  contributionApproved: Boolean!
  contributionRejected: Boolean!
  allocationProposed: Boolean!
  allocationApproved: Boolean!
  distributionScheduled: Boolean!
  periodClosed: Boolean!
  
  # Batch preferences
  dailyDigest: Boolean!
  digestTime: String!
  
  updatedAt: String!
}

input NotificationPreferencesInput {
  emailEnabled: Boolean
  webhookEnabled: Boolean
  webhookUrl: String
  
  contributionApproved: Boolean
  contributionRejected: Boolean
  allocationProposed: Boolean
  allocationApproved: Boolean
  distributionScheduled: Boolean
  periodClosed: Boolean
  
  dailyDigest: Boolean
  digestTime: String
}

type InAppNotification {
  id: ID!
  memberId: ID!
  title: String!
  body: String!
  link: String
  icon: String!
  read: Boolean!
  readAt: String
  createdAt: String!
}

type NotificationLogEntry {
  id: ID!
  memberId: ID!
  eventType: String!
  channel: String!
  subject: String!
  status: String!
  sentAt: String
  failedAt: String
  errorMessage: String
  createdAt: String!
}
```

### Resolvers

Location: `packages/api/src/graphql/resolvers/notifications.ts`

```typescript
export const Query = {
  myNotificationPreferences: async (_parent, _args, { db, user }) => {
    const [prefs] = await db.query(
      `SELECT * FROM notification_preferences WHERE member_id = $1`,
      [user.memberId]
    );
    
    // Return defaults if not set
    return prefs || {
      id: null,
      member_id: user.memberId,
      email_enabled: true,
      webhook_enabled: false,
      contribution_approved: true,
      contribution_rejected: true,
      allocation_proposed: true,
      allocation_approved: true,
      distribution_scheduled: true,
      period_closed: true,
      daily_digest: false,
      digest_time: '09:00:00'
    };
  },
  
  myNotifications: async (_parent, { unreadOnly, limit = 50 }, { db, user }) => {
    const query = unreadOnly
      ? `SELECT * FROM in_app_notifications 
         WHERE member_id = $1 AND read = false 
         ORDER BY created_at DESC LIMIT $2`
      : `SELECT * FROM in_app_notifications 
         WHERE member_id = $1 
         ORDER BY created_at DESC LIMIT $2`;
    
    return db.query(query, [user.memberId, limit]);
  },
  
  notificationLog: async (_parent, { memberId, limit = 100 }, { db, user }) => {
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const query = memberId
      ? `SELECT * FROM notification_log 
         WHERE member_id = $1 
         ORDER BY created_at DESC LIMIT $2`
      : `SELECT * FROM notification_log 
         ORDER BY created_at DESC LIMIT $1`;
    
    const params = memberId ? [memberId, limit] : [limit];
    return db.query(query, params);
  }
};

export const Mutation = {
  updateNotificationPreferences: async (_parent, { input }, { db, user }) => {
    // Upsert preferences
    const [result] = await db.query(
      `INSERT INTO notification_preferences (
        member_id, email_enabled, webhook_enabled, webhook_url,
        contribution_approved, contribution_rejected,
        allocation_proposed, allocation_approved,
        distribution_scheduled, period_closed,
        daily_digest, digest_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (member_id) DO UPDATE SET
        email_enabled = COALESCE($2, notification_preferences.email_enabled),
        webhook_enabled = COALESCE($3, notification_preferences.webhook_enabled),
        webhook_url = COALESCE($4, notification_preferences.webhook_url),
        contribution_approved = COALESCE($5, notification_preferences.contribution_approved),
        contribution_rejected = COALESCE($6, notification_preferences.contribution_rejected),
        allocation_proposed = COALESCE($7, notification_preferences.allocation_proposed),
        allocation_approved = COALESCE($8, notification_preferences.allocation_approved),
        distribution_scheduled = COALESCE($9, notification_preferences.distribution_scheduled),
        period_closed = COALESCE($10, notification_preferences.period_closed),
        daily_digest = COALESCE($11, notification_preferences.daily_digest),
        digest_time = COALESCE($12, notification_preferences.digest_time),
        updated_at = NOW()
      RETURNING *`,
      [
        user.memberId,
        input.emailEnabled,
        input.webhookEnabled,
        input.webhookUrl,
        input.contributionApproved,
        input.contributionRejected,
        input.allocationProposed,
        input.allocationApproved,
        input.distributionScheduled,
        input.periodClosed,
        input.dailyDigest,
        input.digestTime
      ]
    );
    
    return result;
  },
  
  markNotificationRead: async (_parent, { id }, { db, user }) => {
    const [notification] = await db.query(
      `UPDATE in_app_notifications 
       SET read = true, read_at = NOW() 
       WHERE id = $1 AND member_id = $2 
       RETURNING *`,
      [id, user.memberId]
    );
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    return notification;
  },
  
  markAllNotificationsRead: async (_parent, _args, { db, user }) => {
    const result = await db.query(
      `UPDATE in_app_notifications 
       SET read = true, read_at = NOW() 
       WHERE member_id = $1 AND read = false`,
      [user.memberId]
    );
    
    return result.rowCount;
  },
  
  sendTestNotification: async (_parent, _args, { user, eventBus }) => {
    // Publish test event
    await eventBus.publish('notifications', 'test.notification', {
      type: 'test:notification',
      memberId: user.memberId,
      data: {
        message: 'This is a test notification from Habitat'
      }
    });
    
    return true;
  }
};
```

---

## UI Components

### Notification Bell

Location: `ui/src/components/notifications/NotificationBell.tsx`

```tsx
import { IconButton, Badge, Popover, PopoverTrigger, PopoverContent, VStack, Text, Button } from '@chakra-ui/react';
import { BellIcon } from '@chakra-ui/icons';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  return (
    <Popover>
      <PopoverTrigger>
        <IconButton
          icon={<BellIcon />}
          aria-label="Notifications"
          position="relative"
        >
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorScheme="red"
              borderRadius="full"
              fontSize="xs"
            >
              {unreadCount}
            </Badge>
          )}
        </IconButton>
      </PopoverTrigger>
      
      <PopoverContent width="400px">
        <VStack align="stretch" spacing={0}>
          <HStack justify="space-between" p={3} borderBottom="1px" borderColor="gray.200">
            <Text fontWeight="bold">Notifications</Text>
            {unreadCount > 0 && (
              <Button size="xs" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </HStack>
          
          <VStack align="stretch" maxHeight="400px" overflowY="auto">
            {notifications.length === 0 ? (
              <Text p={4} color="gray.500" textAlign="center">
                No notifications
              </Text>
            ) : (
              notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markAsRead}
                />
              ))
            )}
          </VStack>
        </VStack>
      </PopoverContent>
    </Popover>
  );
}
```

### Notification Preferences Page

Location: `ui/src/pages/settings/notifications.tsx`

```tsx
import { Box, Heading, FormControl, FormLabel, Switch, Input, Button, VStack, useToast } from '@chakra-ui/react';
import { useNotificationPreferences } from '@/hooks/useNotifications';

export default function NotificationSettingsPage() {
  const toast = useToast();
  const { preferences, updatePreferences, loading } = useNotificationPreferences();
  
  const handleSave = async (updates) => {
    try {
      await updatePreferences(updates);
      toast({ title: 'Preferences saved', status: 'success' });
    } catch (error) {
      toast({ title: 'Failed to save', description: error.message, status: 'error' });
    }
  };
  
  return (
    <Box maxW="800px" mx="auto" p={6}>
      <Heading mb={6}>Notification Preferences</Heading>
      
      <VStack spacing={6} align="stretch">
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={4}>Channels</Heading>
          
          <FormControl display="flex" alignItems="center" mb={4}>
            <FormLabel mb={0}>Email notifications</FormLabel>
            <Switch
              isChecked={preferences.emailEnabled}
              onChange={(e) => handleSave({ emailEnabled: e.target.checked })}
            />
          </FormControl>
          
          <FormControl display="flex" alignItems="center">
            <FormLabel mb={0}>Webhook notifications</FormLabel>
            <Switch
              isChecked={preferences.webhookEnabled}
              onChange={(e) => handleSave({ webhookEnabled: e.target.checked })}
            />
          </FormControl>
          
          {preferences.webhookEnabled && (
            <Input
              placeholder="https://your-webhook-url.com/habitat"
              value={preferences.webhookUrl || ''}
              onChange={(e) => handleSave({ webhookUrl: e.target.value })}
              mt={2}
            />
          )}
        </Box>
        
        <Box borderWidth="1px" borderRadius="lg" p={6}>
          <Heading size="md" mb={4}>Event Subscriptions</Heading>
          
          <VStack align="stretch" spacing={3}>
            {[
              { key: 'contributionApproved', label: 'Contribution approved' },
              { key: 'contributionRejected', label: 'Contribution rejected' },
              { key: 'allocationProposed', label: 'Allocation proposed' },
              { key: 'allocationApproved', label: 'Allocation approved' },
              { key: 'distributionScheduled', label: 'Distribution scheduled' },
              { key: 'periodClosed', label: 'Period closed' }
            ].map(({ key, label }) => (
              <FormControl key={key} display="flex" alignItems="center">
                <FormLabel mb={0}>{label}</FormLabel>
                <Switch
                  isChecked={preferences[key]}
                  onChange={(e) => handleSave({ [key]: e.target.checked })}
                />
              </FormControl>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}
```

---

## Testing

### Unit Tests

```typescript
describe('Notification system', () => {
  it('sends email on contribution approval', async () => {
    await eventBus.publish('contribution.approved', { ... });
    
    const [log] = await db.query(
      `SELECT * FROM notification_log WHERE member_id = $1 AND event_type = $2`,
      [memberId, 'contribution:approved']
    );
    
    expect(log.status).toBe('sent');
    expect(log.channel).toBe('email');
  });
  
  it('respects member opt-out preferences', async () => {
    await db.query(
      `UPDATE notification_preferences SET contribution_approved = false WHERE member_id = $1`,
      [memberId]
    );
    
    await eventBus.publish('contribution.approved', { memberId, ... });
    
    const logs = await db.query(
      `SELECT * FROM notification_log WHERE member_id = $1`,
      [memberId]
    );
    
    expect(logs).toHaveLength(0);
  });
  
  it('creates in-app notification', async () => {
    await eventBus.publish('allocation.proposed', { memberId, ... });
    
    const [notification] = await db.query(
      `SELECT * FROM in_app_notifications WHERE member_id = $1`,
      [memberId]
    );
    
    expect(notification.title).toBe('Period allocation proposed');
    expect(notification.read).toBe(false);
  });
});
```

---

## Environment Variables

Add to `.env.example`:

```bash
# Email service
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM="Habitat <noreply@habitat.example.com>"

# App URL for email links
APP_URL=https://habitat.example.com
```

---

## Acceptance Criteria

✅ **Notifications send on trigger**
- Email sent when contribution approved/rejected
- Email sent when allocation proposed/approved
- Email sent when distribution scheduled
- Email sent when period closed

✅ **Preferences honored**
- Members can opt-in/opt-out per event type
- Members can disable email entirely
- Webhook support for integrations

✅ **Delivery tracking**
- Notification log records all sent notifications
- Failed deliveries logged with error messages
- Status tracking (pending, sent, failed, bounced)

✅ **In-app notifications**
- Badge shows unread count
- Dropdown shows recent notifications
- Mark as read functionality

---

## Deployment Checklist

1. Run database migration (`07_notifications.sql`)
2. Configure email service (SendGrid/Mailgun/SMTP)
3. Set environment variables
4. Deploy worker with notification handlers
5. Deploy API with notification resolvers
6. Deploy UI with notification components
7. Test with real events
8. Monitor delivery logs

---

**Status:** COMPLETE — Notification system fully specified with event-driven architecture, email/webhook delivery, configurable preferences, and in-app notifications.
