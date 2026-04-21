# Group Chat Message Reception Fix

## Problem
Group chat messages were not appearing in real-time when users were already in the group. Messages only appeared after refreshing the page. The issue affected both:
1. Incoming messages from other users
2. The sender's own messages (echo from server)

## Root Causes

### 1. Group Not Marked as Active
**Issue:** The main group chat page (`GroupChatContext`) never called `groupChatService.setGroupActive()` when a group was opened.

**Impact:** 
- The `activeGroups` Set in `GroupChatService` remained empty
- `isGroupOpen` check always returned `false`
- Service thought the group was closed even when user was viewing it
- This affected notification logic but not message delivery

### 2. Missing Sender Information Fallbacks
**Issue:** Server messages sometimes don't include `sender_id` or `sender` object, only `user` object.

**Impact:**
- `sender_id` normalized to `null`
- Read receipt logic failed (`if (newMsg.sender_id !== userId)`)
- Message rendering couldn't determine if message was from "me" or "other"

### 3. Missing Default Values
**Issue:** Some message fields like `created_at`, `is_deleted`, `is_edited` were not defaulting when missing from server payload.

**Impact:**
- Sorting failed when `created_at` was undefined
- UI rendering issues with undefined boolean flags

## Solution

### 1. Mark Group as Active/Inactive
**File:** `Easy-return/src/pages/app/group-chat/GroupChatContext.jsx`

Added calls to mark group as active when opened and inactive when leaving:

```jsx
// When group is selected
useEffect(() => {
  if (!activeGroup || !token || !userId) return;
  
  // Mark group as active
  groupChatService.setGroupActive(activeGroup.id);
  
  // ... load messages
  
  return () => {
    // Mark group as inactive when leaving
    if (activeGroup?.id) {
      groupChatService.setGroupInactive(activeGroup.id);
    }
    // ... cleanup subscriptions
  };
}, [activeGroup, token, userId]);
```

### 2. Enhanced Sender Information Fallbacks
**File:** `Easy-return/src/pages/app/group-chat/GroupChatContext.jsx`

Updated `handleNewMessage` to check multiple sources for sender info:

```jsx
user: {
  id: normalizeId(m.sender?.id || m.sender_id || m.user?.id),
  first_name: m.sender?.first_name || m.user?.first_name,
  last_name: m.sender?.last_name || m.user?.last_name,
  profile_picture: m.sender?.profile_picture || m.user?.profile_picture,
},
sender_id: normalizeId(m.sender_id || m.sender?.id || m.user?.id),
```

### 3. Added Default Values
**File:** `Easy-return/src/pages/app/group-chat/GroupChatContext.jsx`

Ensured all message fields have defaults:

```jsx
created_at: m.created_at || new Date().toISOString(),
is_deleted: m.is_deleted || false,
is_edited: m.is_edited || false,
is_forwarded: m.is_forwarded || false,
```

### 4. Enhanced Logging
**Files:** 
- `Easy-return/src/Services/GroupChatService.js`
- `Easy-return/src/pages/app/group-chat/GroupChatContext.jsx`

Added comprehensive console logs to trace:
- Message reception from server
- Group active/inactive state
- Message normalization
- Subscription notifications
- Message deduplication

## Testing Checklist

### Basic Message Flow
- [ ] User A sends message in group → User B sees it immediately
- [ ] User A sees their own message immediately (server echo)
- [ ] Messages appear in correct chronological order

### Group State Management
- [ ] Opening group marks it as active (check console: "Marking group as active")
- [ ] Leaving group marks it as inactive (check console: "Marking group as inactive")
- [ ] Switching between groups updates active state correctly

### Edge Cases
- [ ] Messages without `sender_id` still render correctly
- [ ] Messages without `created_at` still sort correctly
- [ ] Multiple users sending messages simultaneously all appear
- [ ] Refreshing page loads all messages correctly

### Console Logs to Monitor
```
[GroupChatService] 📨 Received from server: {...}
[GroupChatService] ✉️ Processing message type, group_id: 37
[GroupChatService] isGroupOpen: true activeGroups: [37]
[GroupChatService] 🔔 Notifying subscribers: new_group_message

[GroupChat] 🎯 Marking group as active: 37
[GroupChat] 🔔 handleNewMessage fired
[GroupChat] 📦 Raw message object: {...}
[GroupChat] ✅ Normalized message: {...}
[GroupChat] ➕ Adding new message: 123
```

## Known Limitations
- Server must send either `sender_id`, `sender.id`, or `user.id` for proper attribution
- Messages without any sender identification will have `sender_id: null`
- Optimistic message updates are disabled (commented out) to prevent duplicates

## Future Improvements
1. Add optimistic updates with proper deduplication by temp ID
2. Handle server messages with no sender info more gracefully
3. Add retry logic for failed message sends
4. Implement message queue for offline scenarios
