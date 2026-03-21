# Worker Chat And Presence Design

## Background

Worker users currently have a bottom 消息 tab, but the worker-side product is still centered on system interactions such as application progress, work status, settlement, wage payout, withdrawal updates, and certification review results. At the same time, the app already has an existing conversation and chat module that can support direct messaging.

The product direction is:

- Keep the existing two-tab message structure.
- Open worker-side online chat for job recruitment cards.
- Keep system notifications as the second tab.
- Default worker users into the chat tab.
- Show counterpart presence using a stable ecent active model instead of fragile hard real-time online/offline only.

## Goals

- Replace the worker home job-card 分享 action with 在线聊.
- Keep job-detail sharing intact.
- Let worker users open or create a conversation directly from job cards.
- Keep the existing post/business chat structure for enterprise-side and post-detail flows.
- Show counterpart status as 在线 / 刚刚活跃 / 今天活跃 / 最近活跃于 MM-DD HH:mm.
- Avoid breaking the existing unlock-before-chat rule for non-job post conversations.

## Non-Goals

- No full generic conversation-context redesign in this phase.
- No typing indicator.
- No read-receipt redesign.
- No worker-side chat moderation changes.
- No replacement of the existing messages tab structure.

## Product Decision

### Messages Page

- Keep the current two-tab structure:
  - 在线聊
  - 系统通知
- For worker users, default currentTab to the chat tab.
- For enterprise users, keep the current behavior.
- System notifications remain the place for:
  - application status updates
  - acceptance/rejection updates
  - work-start reminders
  - settlement completion
  - wage payout notifications
  - withdrawal request/result notifications
  - certification review notifications

### Worker Recruitment Entry

- Worker home recruitment cards change the card-level CTA from 分享 to 在线聊.
- Job detail keeps the share button.
- Tapping 在线聊 goes straight into the conversation flow.

### Presence Model

Use a two-layer model:

- 在线
  - the counterpart currently has an active websocket connection
- 最近活跃
  - derived from persisted lastActiveAt
  - shown as:
    - 刚刚活跃 for short recent windows
    - 今天活跃
    - 最近活跃于 MM-DD HH:mm

This avoids unstable UX caused by mini program foreground/background switching.

## Technical Design

### Conversation Context

Current conversation data only supports postId. Worker recruitment chat should not overload that path because the business rule differs.

Recommended minimal extension:

- add jobId to conversations
- keep postId for existing post conversations
- update uniqueness to include both context dimensions

Resulting direction:

- postId conversation: existing post/business content flow
- jobId conversation: worker recruitment chat flow

This keeps current behavior stable while allowing job chat to evolve independently.

### Chat Permission Rules

Split permissions by context:

- postId conversations:
  - keep the existing unlock-contact-before-chat rule
- jobId conversations:
  - allow worker users to directly initiate chat with the recruiting enterprise
  - do not require the current contact-unlock gate

Without this split, a worker-side 在线聊 button on recruitment cards would still fail at conversation creation.

### Presence Data

Current websocket infrastructure already tracks connected clients in memory. That is enough for 在线.

To support stable 最近活跃, add a persisted lastActiveAt field on users.

Recommended update points:

- websocket connection established
- conversation list load
- conversation message load
- successful message send

This creates a practical activity signal without introducing a separate presence table in this phase.

## Backend Changes

### Data Model

- users
  - add lastActiveAt DATETIME NULL
- conversations
  - add jobId BIGINT DEFAULT 0
  - update the uniqueness rule so job-context conversations do not collide with post-context conversations

### API Contracts

#### POST /conversations/with-user/:userId

Current body only supports postId.

Extend request body to support:

- postId?: number | string
- jobId?: number | string

Rules:

- if jobId is present, use the recruitment-chat permission path
- if postId is present, keep existing unlock-based permission path

#### GET /conversations

Extend each conversation item with counterpart presence info:

- isOnline
- lastActiveAt
- ctiveText

#### GET /conversations/:id/messages

Extend otherUser with:

- isOnline
- lastActiveAt
- ctiveText

### Realtime Service

Reuse the current websocket client registry for isOnline.

Expose a lightweight helper in chat realtime service to answer whether a given user currently has connected clients.

## Frontend Changes

### Worker Home

- recruitment card CTA:
  - replace 分享 with 在线聊
- on tap:
  - create or open conversation using jobId
  - navigate to chat page

### Messages Page

- keep two tabs
- worker users default to chat tab on entry
- chat list items show counterpart presence

### Chat Page

- header keeps counterpart name
- add a second line or small status text under the name:
  - 在线
  - 刚刚活跃
  - 今天活跃
  - 最近活跃于 MM-DD HH:mm

### Enterprise Side

- no structural change to messages page
- enterprise users should also see worker counterpart presence in chat list and chat page

## Error Handling

- if worker-side job conversation creation fails, show a direct business toast instead of a silent fail
- if presence data is unavailable, degrade gracefully:
  - hide online marker
  - show no activity text instead of blocking chat
- websocket disconnect must degrade from 在线 to 最近活跃, not to a blank state

## Migration Notes

Production DB should not rely on auto-sync.

Expected migration work:

- ALTER TABLE users ADD COLUMN lastActiveAt DATETIME NULL;
- ALTER TABLE conversations ADD COLUMN jobId BIGINT NOT NULL DEFAULT 0;
- adjust the conversations unique index to include jobId

Exact index migration should be written carefully to avoid duplicate-key issues during rollout.

## Verification Checklist

- Worker home recruitment cards show 在线聊 instead of card-level share.
- Job detail still supports share.
- Worker tapping 在线聊 creates or opens a job conversation successfully.
- Repeated entry for the same worker/job/company does not create duplicate conversations.
- Worker 消息 page defaults to the chat tab.
- Enterprise and worker chat lists both show counterpart presence text.
- Chat page header shows the same presence text.
- When websocket is connected, counterpart can display 在线.
- When websocket disconnects, presence degrades to recent-active text.
- Post/business conversations still keep the existing unlock gate.

## Risks

- Current conversation uniqueness change must be migrated carefully in production.
- Presence based purely on websocket connection is too volatile, so lastActiveAt is required for stable UX.
- If worker home directly opens chat without context-specific permission logic, existing post unlock rules will cause broken entry points.

## Recommendation

Implement in this order:

1. backend context and presence support (jobId, lastActiveAt, API response fields)
2. worker home CTA switch to 在线聊
3. messages page worker default-tab behavior
4. chat list and chat page presence UI
5. production migration and rollout verification