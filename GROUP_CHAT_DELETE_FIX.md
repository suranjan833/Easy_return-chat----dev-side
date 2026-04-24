# Group Chat Delete Message Fix

## Problem

When a message or reply was deleted in a group chat, the server sent the delete event but the UI didn't update in real-time on other members' screens. The message remained visible until the page was refreshed.

### Server Event Received
```javascript
// Delete message
{
  type: 'delete_group_message',
  message_id: 1491,
  group_id: 36,
  is_deleted: true,
  deleted_at: '2026-04-23T23:51:35.544814'
}

// Delete reply
{
  type: 'delete_group_reply',
  reply_id: 10,
  group_id: 1,
  is_deleted: true,
  deleted_at: '2026-04-01T10:10:00'
}
```

### Console Log
```
[GroupChatService] 📨 Received from server: {type: 'delete_group_message', ...}
```

But the message list didn't update for other members.

## Root Cause

**Field Name Mismatch** between GroupChatService and GroupChatContext:

### The Flow
1. **Server sends:** `message_id` (snake_case)
2. **GroupChatService receives:** `message_id` ✅
3. **GroupChatService transforms to:** `messageId` (camelCase) ✅
4. **GroupChatService notifies with:** `{messageId: ..., groupId: ...}` ✅
5. **GroupChatContext checks:** `data.message_id` ❌ Wrong! Should be `data.messageId`
6. **Result:** Handler never finds the message because field name doesn't match

### The Mismatch

**For delete_group_message:**

| Step | Field Name | Status |
|------|------------|--------|
| Server sends | `message_id` | ✅ |
| GroupChatService receives | `message_id` | ✅ |
| GroupChatService notifies | `messageId` (camelCase) | ✅ |
| GroupChatContext checks | `data.message_id` | ❌ Wrong! |
| Should check | `data.messageId` | ✅ Correct |

**For delete_group_reply:**

| Step | Field Name | Status |
|------|------------|--------|
| Server sends | `group_id` | ✅ |
| GroupChatService receives | `group_id` | ✅ |
| GroupChatService notifies | `groupId` (camelCase) | ✅ |
| GroupChatContext checks | `data.group_id` | ❌ Wrong! |
| Should check | `data.groupId` | ✅ Correct |

## Solution

**Use camelCase field names consistently in handlers** to match what GroupChatService sends.

### Changes Made

#### 1. GroupChatContext.jsx - handleMessageDelete

**Before:**
```javascript
const handleMessageDelete = (data) => {
  if (data.groupId !== activeGroup.id) return;

  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== data.message_id) return m;  // ❌ Wrong field name
      // ...
    }),
  );
};
```

**After:**
```javascript
const handleMessageDelete = (data) => {
  console.log("[GroupChat] 🗑️ handleMessageDelete fired, data:", data);
  if (data.groupId !== activeGroup.id) {
    console.log("[GroupChat] ⚠️ Ignoring delete — groupId mismatch");
    return;
  }

  setMessages((prev) =>
    prev.map((m) => {
      if (m.id !== data.messageId) return m;  // ✅ Correct field name
      
      const isMe = m.sender_id === userId;
      console.log(`[GroupChat] ✅ Deleting message ${data.messageId}`);

      return {
        ...m,
        message: isMe
          ? "You deleted this message"
          : "This message was deleted",
        is_deleted: true,
        attachment: null,
      };
    }),
  );
};
```

#### 2. GroupChatContext.jsx - handleReplyDelete

**Before:**
```javascript
const handleReplyDelete = (data) => {
  if (data.group_id !== activeGroup.id) return;  // ❌ Wrong field name

  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === data.replyId
        ? {
            ...msg,
            message: "Reply deleted",
            is_deleted: true,
            attachment: null,
          }
        : msg,
    ),
  );
};
```

**After:**
```javascript
const handleReplyDelete = (data) => {
  console.log("[GroupChat] 🗑️ handleReplyDelete fired, data:", data);
  if (data.groupId !== activeGroup.id) {  // ✅ Correct field name
    console.log("[GroupChat] ⚠️ Ignoring delete — groupId mismatch");
    return;
  }

  setMessages((prev) =>
    prev.map((msg) => {
      if (msg.id !== data.replyId) return msg;
      
      console.log(`[GroupChat] ✅ Deleting reply ${data.replyId}`);
      
      return {
        ...msg,
        message: "Reply deleted",
        is_deleted: true,
        attachment: null,
      };
    }),
  );
};
```

#### 3. GroupChatService.js - Added Debug Logging

**Added:**
```javascript
} else if (data.type === "delete_group_message") {
  console.log("[GroupChatService] 🗑️ Delete message event:", data);
  this.notifySubscribers("delete_group_message", {
    messageId: data.message_id,  // Transform to camelCase
    groupId: data.group_id,      // Transform to camelCase
  });
}
```

## Field Naming Convention

### Server → Client (snake_case)
- `message_id`
- `reply_id`
- `group_id`
- `is_deleted`
- `deleted_at`

### Internal JavaScript (camelCase)
- `messageId`
- `replyId`
- `groupId`
- `isDeleted`
- `deletedAt`

### Transformation Layer
GroupChatService transforms snake_case to camelCase when notifying subscribers:

```javascript
// Server sends: { message_id: 42, group_id: 1 }
// GroupChatService notifies: { messageId: 42, groupId: 1 }
```

## Testing

### Test Delete Message
1. **User A:** Open group chat
2. **User A:** Send a message
3. **User B:** Open same group chat
4. **User A:** Delete the message
5. **Expected:** User B sees "This message was deleted" immediately
6. **Before fix:** User B's message remained visible until refresh
7. **After fix:** User B sees deletion immediately ✅

### Test Delete Reply
1. **User A:** Reply to a message
2. **User B:** See the reply
3. **User A:** Delete the reply
4. **Expected:** User B sees "Reply deleted" immediately
5. **Before fix:** User B's reply remained visible until refresh
6. **After fix:** User B sees deletion immediately ✅

### Test in Popup
1. **User A:** Open group chat as popup
2. **User B:** Open same group in full page
3. **User A:** Delete a message
4. **Expected:** User B sees deletion immediately in full page
5. **After fix:** Works correctly ✅

### Test Self-Delete
1. **User A:** Delete own message
2. **Expected:** User A sees "You deleted this message"
3. **After fix:** Works correctly ✅

## Debug Logs

When a message is deleted, you'll see these logs:

```
[GroupChatService] 📨 Received from server: {type: 'delete_group_message', message_id: 1491, ...}
[GroupChatService] 🗑️ Delete message event: {message_id: 1491, group_id: 36, ...}
[GroupChat] 🗑️ handleMessageDelete fired, data: {messageId: 1491, groupId: 36}
[GroupChat] ✅ Deleting message 1491
```

If the message doesn't delete, check for:
- `⚠️ Ignoring delete — groupId mismatch` - Wrong group
- No `✅ Deleting message` log - Message ID not found

## Files Modified

1. `Easy-return/src/pages/app/group-chat/GroupChatContext.jsx` - Fixed field names in handlers
2. `Easy-return/src/Services/GroupChatService.js` - Added debug logging
3. `Easy-return/GROUP_CHAT_DELETE_FIX.md` - Updated documentation

## Related Components

**GroupChatPopup.jsx** - Already using correct field names ✅
- Uses `data.messageId` ✅
- Uses `data.groupId` ✅
- Uses `data.replyId` ✅

## Prevention

To prevent similar issues in the future:

1. **Consistent naming** - Always use camelCase in JavaScript
2. **Transform at boundary** - Convert snake_case to camelCase when receiving from server
3. **Type checking** - Use TypeScript or JSDoc to catch field name errors
4. **Debug logging** - Log data structure when handling events

### Example: Type Safety with JSDoc

```javascript
/**
 * @typedef {Object} DeleteMessageEvent
 * @property {number} messageId - ID of deleted message (camelCase)
 * @property {number} groupId - ID of group (camelCase)
 */

/**
 * @param {DeleteMessageEvent} data
 */
const handleMessageDelete = (data) => {
  // TypeScript/IDE will warn if using data.message_id
  if (m.id !== data.messageId) return m;
};
```

## Summary

✅ **Fixed:** Message and reply deletions now update in real-time for all members
✅ **Consistent:** Field names use camelCase throughout JavaScript code
✅ **Debuggable:** Added logging to track delete events
✅ **Tested:** Verified with actual delete events from server
✅ **Works:** Both popup and full-page views update correctly

