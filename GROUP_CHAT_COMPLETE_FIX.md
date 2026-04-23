# Group Chat Complete Fix - Messages & Replies

## Summary

Fixed group chat messages and replies not appearing by aligning WebSocket event types and properly normalizing data from both API and WebSocket sources.

## Root Causes

1. **WebSocket event type mismatches** - Server sends `"group_message"` and `"group_message_reply"`, but code was listening for `"message"` and `"group_reply"`
2. **API response normalization** - Initial message load from API returns `type: "reply"` which needs to be normalized to `"group_message_reply"` for UI consistency
3. **Field name mismatches** - Server uses `content` (not `message`) and `sender` (not `user`)
4. **Missing fields** - `read_receipts`, `parent_reply_id`, `email` were not being preserved
5. **Read receipt handling** - No handler for reply read receipts

## Changes Made

### 1. GroupChatService.js - WebSocket Event Handlers

**Fixed event type handling:**
```javascript
// Now handles BOTH documented and actual server responses
if (data.type === "group_message") {
  // Root messages
}
else if (data.type === "group_reply" || data.type === "group_message_reply") {
  // Replies - server actually sends "group_message_reply"
}
else if (data.type === "read_group_message") {
  // Message read receipts
}
else if (data.type === "read_group_reply") {
  // Reply read receipts (NEW)
}
```

**Fixed field references:**
- `data.user` → `data.sender`
- `data.message` → `data.content`
- `data.notification_message` → `data.mention_message`

**Fixed typing status:**
- Normalizes `"started"/"stopped"` → `"start"/"stop"` before sending to server

### 2. GroupChatContext.jsx - Message Normalization

**Initial API Load:**
```javascript
// Normalize type: API returns "message" or "reply"
const normalizedType = msg.type === "reply" ? "group_message_reply" : msg.type;

// Include all fields
{
  type: normalizedType,
  message: msg.content || msg.message || "",
  user: {
    id: msg.sender?.id,
    first_name: msg.sender?.first_name,
    last_name: msg.sender?.last_name,
    profile_picture: msg.sender?.profile_picture,
    email: msg.sender?.email, // NEW
  },
  read_receipts: msg.read_receipts || [], // NEW
  parent_reply_id: msg.parent_reply_id || null, // NEW
  // ... other fields
}
```

**WebSocket Message Handler:**
```javascript
// Normalize incoming messages
{
  type: "message", // Normalize "group_message" to "message"
  message: m.content || m.message || "",
  read_receipts: m.read_receipts || [],
  // ... other fields
}
```

**WebSocket Reply Handler:**
```javascript
// Normalize incoming replies
{
  type: "group_message_reply", // Keep as "group_message_reply"
  message: m.content || m.message || "",
  parent_reply_id: m.parent_reply_id || null,
  read_receipts: m.read_receipts || [], // NEW
  // ... other fields
}
```

**Read Receipt Handlers:**
```javascript
// Separate handlers for messages and replies
handleGroupMessageRead(data) {
  // Updates read_receipts for messages
}

handleGroupReplyRead(data) { // NEW
  // Updates read_receipts for replies
}
```

## Server Response Formats

### API: GET /groups/{id}/messages

**Root Message:**
```json
{
  "type": "message",
  "id": 1475,
  "group_id": 36,
  "sender_id": 30,
  "sender": { "id": 30, "first_name": "Human", "email": "user@example.com" },
  "content": "Hello",
  "read_receipts": [{ "user_id": 1, "read_at": "2026-04-23T22:37:52" }]
}
```

**Reply:**
```json
{
  "type": "reply",
  "id": 582,
  "group_id": 36,
  "original_message_id": 1468,
  "parent_reply_id": null,
  "sender_id": 1,
  "sender": { "id": 1, "first_name": "Sundeep", "email": "user@example.com" },
  "content": "Nice",
  "read_receipts": [],
  "parentMsg": { /* full parent message object */ }
}
```

### WebSocket: Incoming Events

**Root Message:**
```json
{
  "type": "group_message",
  "id": 42,
  "group_id": 1,
  "sender_id": 5,
  "sender": { "id": 5, "first_name": "John", "email": "john@example.com" },
  "content": "Hello",
  "read_receipts": []
}
```

**Reply:**
```json
{
  "type": "group_message_reply",
  "id": 10,
  "group_id": 1,
  "original_message_id": 42,
  "parent_reply_id": null,
  "sender_id": 3,
  "sender": { "id": 3, "first_name": "Jane", "email": "jane@example.com" },
  "content": "Good point",
  "parentMsg": { /* full parent message object */ }
}
```

**Read Receipt (Message):**
```json
{
  "type": "read_group_message",
  "message_id": 42,
  "group_id": 1,
  "reader_id": 3,
  "reader": { "id": 3, "first_name": "Jane" },
  "read_at": "2026-04-23T10:11:00"
}
```

**Read Receipt (Reply):**
```json
{
  "type": "read_group_reply",
  "reply_id": 10,
  "group_id": 1,
  "reader_id": 3,
  "reader": { "id": 3, "first_name": "Jane" },
  "read_at": "2026-04-23T10:11:00"
}
```

## Testing Checklist

- [x] Send a new message → appears immediately
- [x] Reply to a message → appears immediately
- [x] Load group chat → all messages and replies display correctly
- [x] Read receipts → update in real-time for both messages and replies
- [ ] Nested replies (reply to reply) → should work
- [ ] Mention a user → should trigger notification
- [ ] Type in chat → typing indicator shows for others
- [ ] Delete a message/reply → shows as deleted
- [ ] System message (add member) → appears in chat

## Key Takeaways

1. **API vs WebSocket inconsistency** - API returns `"reply"`, WebSocket sends `"group_message_reply"`
2. **Documentation mismatch** - Docs say `"group_reply"`, server actually sends `"group_message_reply"`
3. **Field naming** - Server consistently uses `content` and `sender`, not `message` and `user`
4. **Always normalize** - Convert server types to internal types for UI consistency
5. **Preserve all fields** - Don't drop fields like `read_receipts`, `parent_reply_id`, `email`
