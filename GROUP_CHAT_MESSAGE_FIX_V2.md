# Group Chat Message Fix - WebSocket Event Alignment

## Problem
New messages were not appearing in the group chat because the client code was listening for incorrect WebSocket event types that didn't match the server documentation.

## Root Cause
The client was listening for `type: "message"` but the server sends `type: "group_message"` according to the WebSocket documentation.

## Changes Made

### 1. GroupChatService.js - WebSocket Event Handler

**Fixed event type mismatches:**

| Old (Client) | New (Server Spec) | Description |
|---|---|---|
| `"message"` | `"group_message"` | Root messages |
| `"group_message_reply"` | `"group_reply"` | Reply messages |
| `"reply_on_reply"` | `"group_reply"` | Nested replies (same as group_reply) |
| `"mention"` | `"group_mention"` | User mentions |
| `"edit_group_message"` | ❌ Removed | Not in server spec |
| `"edit_group_reply"` | ❌ Removed | Not in server spec |

**Added new event handler:**
- `"system_message"` - For system events (member added, etc.)

**Fixed field references:**
- Changed `data.user` → `data.sender` (server sends `sender` object)
- Changed `data.notification_message` → `data.mention_message` (for mentions)
- Fixed `groupId` reference in notification (was undefined)

### 2. GroupChatContext.jsx - Event Handlers

**handleNewMessage:**
- Now expects `type: "group_message"` from server
- Normalizes to `type: "message"` internally for UI consistency
- Uses `m.content` (server field) instead of `m.message`
- Properly extracts `sender` object with email field
- Initializes `read_receipts` array from server response

**handleGroupReply:**
- Now expects `type: "group_reply"` from server
- Normalizes to `type: "group_message_reply"` internally
- Uses `m.content` instead of `m.message`
- Properly handles `parentMsg` from server response
- Adds auto-read marking for replies from other users
- Includes `is_read`, `read_at`, `is_forwarded` fields

**handleTyping:**
- Changed from `"started"/"stopped"` to `"start"/"stop"` per docs

**Added handleSystemMessage:**
- New handler for system messages (member joins, etc.)
- Adds system messages to chat with special `is_system` flag

**Removed duplicate subscriptions:**
- Removed `"reply_on_reply"` subscription (server only sends `"group_reply"`)

### 3. GroupChatService.js - sendTyping Method

**Fixed typing status values:**
- Client sends `"started"/"stopped"` (kept for backward compatibility)
- Normalizes to `"start"/"stop"` before sending to server
- Server expects and sends `"start"/"stop"` per documentation

## Testing Checklist

- [x] Send a new message → should appear immediately
- [ ] Reply to a message → should appear as a reply
- [ ] Mention a user → should trigger notification
- [ ] Type in chat → typing indicator should show for others
- [ ] Delete a message → should show as deleted
- [ ] System message (add member) → should appear in chat
- [ ] Read receipts → should update when others read messages

## Server Response Format (Per Docs)

### group_message
```json
{
  "type": "group_message",
  "id": 42,
  "group_id": 1,
  "sender_id": 5,
  "sender": { "id": 5, "first_name": "John", "last_name": "Doe", "email": "john@example.com" },
  "content": "Hello everyone!",
  "attachment": null,
  "is_deleted": false,
  "is_edited": false,
  "is_forwarded": false,
  "created_at": "2026-04-01T10:00:00",
  "read_receipts": []
}
```

### group_reply
```json
{
  "type": "group_reply",
  "id": 10,
  "group_id": 1,
  "original_message_id": 42,
  "parent_reply_id": null,
  "sender_id": 3,
  "sender": { "id": 3, "first_name": "Jane", "last_name": "Doe", "email": "jane@example.com" },
  "content": "Good point!",
  "is_deleted": false,
  "is_edited": false,
  "is_read": false,
  "parentMsg": { /* root message object */ }
}
```

### typing
```json
{
  "type": "typing",
  "group_id": 1,
  "sender_id": 5,
  "status": "start"  // or "stop"
}
```

## Notes

- The server uses `"content"` field for message text, not `"message"`
- The server uses `"sender"` object, not `"user"`
- Typing status is `"start"/"stop"`, not `"started"/"stopped"`
- All replies come through `"group_reply"` type, not separate `"reply_on_reply"`
- System messages are a separate type with `"content"` and optional `"new_members"` array
