# Admin Third-Party Conversation Filter Fix

## Problem
Admin users (user_id = 1) were seeing conversations between other users that they were not part of. For example, if User 3 and User 5 were chatting, the admin would see this conversation in their recent chats list even though they weren't a participant.

## Root Cause
The code was designed to handle "admin view" where admins could monitor all conversations. The API returns conversations with an array structure for `other_user` when the current user is not a participant:

```javascript
{
  other_user: [
    { sender: { id: 3, first_name: "Alice", ... } },
    { recipient: { id: 5, first_name: "Bob", ... } }
  ],
  latest_message: { ... }
}
```

The code was processing these conversations and displaying them, even though the admin wasn't involved.

## Solution
Added filtering at multiple points to exclude conversations where the current user is NOT a participant:

### 1. ChatService.js - Initial Data Load

**Location:** `src/Services/ChatService.js` → `fetchInitialData()`

```javascript
// Process API response and filter out third-party conversations
apiProcessedChats = rawConversations.map((chat) => {
  // ... extract sender_id and recipient_id ...
  
  return {
    id: lastMsg.id,
    recipient_id: recipientId || otherParticipantId,
    sender_id: senderId,
    last_message: lastMsg.content || (lastMsg.attachment ? `📎 Attachment` : ""),
    last_message_timestamp: lastMsg.timestamp,
    unread_count: chat.unread_count || 0,
  };
})
// ✅ Filter out conversations where current user is NOT a participant
.filter(c => {
  if (!c.recipient_id || !c.sender_id) return false;
  const sId = Number(c.sender_id);
  const rId = Number(c.recipient_id);
  // Only include if current user is either sender or recipient
  return sId === currentUserId || rId === currentUserId;
});
```

### 2. DirectChatContext.jsx - normalizeConversations()

**Location:** `src/pages/app/chat/DirectChatContext.jsx` → `normalizeConversations()`

```javascript
// ✅ Skip conversations where current user is NOT a participant
if (id1 !== ME_ID_local && id2 !== ME_ID_local) {
  console.log(`[DirectChat] 🚫 Skipping third-party conversation: ${id1} ↔ ${id2} (ME=${ME_ID_local})`);
  continue;
}
```

### 3. DirectChatContext.jsx - handleInitialData()

**Location:** `src/pages/app/chat/DirectChatContext.jsx` → `handleInitialData()`

```javascript
const deduped = data.recentChats
  .sort((a, b) => new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp))
  .filter((c) => {
    if (!c.recipient_id || !c.sender_id) return false;
    
    // ✅ Filter out conversations where current user is NOT a participant
    const sId = Number(c.sender_id);
    const rId = Number(c.recipient_id);
    if (sId !== ME_ID && rId !== ME_ID) {
      console.log(`[DirectChat] 🚫 Filtering out third-party recent chat: ${sId} ↔ ${rId}`);
      return false;
    }
    
    const pairKey = [sId, rId].sort((a, b) => a - b).join("_");
    if (seenPairs.has(pairKey)) return false;
    seenPairs.add(pairKey);
    return true;
  });
```

### 4. DirectChatContext.jsx - Initial Fetch Effect

**Location:** `src/pages/app/chat/DirectChatContext.jsx` → `useEffect` for fetching recent chats

```javascript
const deduped = chats
  .sort((a, b) => new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp))
  .filter((c) => {
    if (!c.recipient_id || !c.sender_id) return false;
    
    // ✅ Filter out conversations where current user is NOT a participant
    const sId = Number(c.sender_id);
    const rId = Number(c.recipient_id);
    if (sId !== ME_ID && rId !== ME_ID) {
      console.log(`[DirectChat] 🚫 Filtering out third-party chat in initial fetch: ${sId} ↔ ${rId}`);
      return false;
    }
    
    const pairKey = [sId, rId].sort((a, b) => a - b).join("_");
    if (seenPairs.has(pairKey)) return false;
    seenPairs.add(pairKey);
    return true;
  });
```

### 5. DirectChatContext.jsx - handleNewMessage()

**Location:** `src/pages/app/chat/DirectChatContext.jsx` → `handleNewMessage()`

#### 5a. Recent Chats Update
```javascript
// Update recent chats for all messages
setRecentChats((prev) => {
  const next = [...prev];
  
  // ✅ Skip if current user is not a participant
  if (sId !== ME_ID && rId !== ME_ID) {
    console.log(`[DirectChat] 🚫 Skipping recent chat update for third-party message: ${sId} → ${rId}`);
    return prev;
  }
  
  // ... rest of update logic ...
});
```

#### 5b. Redux Dispatch
```javascript
// Dispatch to Redux store for sidebar
// ✅ Only dispatch if current user is a participant
if (sId === ME_ID || rId === ME_ID) {
  dispatch(upsertRecentChat({
    recipient_id: rId,
    sender_id: sId,
    last_message: message.content || (message.attachment ? `📎 ${message.attachment}` : ""),
    last_message_timestamp: message.timestamp,
    unread_count: undefined,
  }));
}
```

#### 5c. New Conversation Creation
```javascript
if (!found) {
  // ✅ Only create new conversation if current user is a participant
  const isParticipant = sId === ME_ID || rId === ME_ID;
  
  if (!isParticipant) {
    console.log(`[DirectChat] 🚫 Ignoring third-party message: ${sId} → ${rId} (ME=${ME_ID})`);
    return updated; // Don't add this conversation
  }

  // ... create new conversation entry ...
}
```

## Changes Summary

### Files Modified:
1. `src/Services/ChatService.js`
2. `src/pages/app/chat/DirectChatContext.jsx`

### Key Changes:
1. ✅ Added participant check in `ChatService.fetchInitialData()` to filter API response
2. ✅ Added participant check in `normalizeConversations()` to skip third-party conversations
3. ✅ Added participant check in `handleInitialData()` to filter recent chats
4. ✅ Added participant check in initial fetch effect to filter fetched chats
5. ✅ Added participant check in `handleNewMessage()` for:
   - Recent chats update
   - Redux dispatch
   - New conversation creation
6. ✅ Removed `isAdminView` flag (no longer needed)
7. ✅ Added console logging for debugging third-party conversation filtering

## Testing Checklist

### For Admin User (user_id = 1):
- [ ] Login as admin
- [ ] Verify only conversations where admin is a participant are shown
- [ ] Send a message to another user → should appear in recent chats
- [ ] Receive a message from another user → should appear in recent chats
- [ ] Verify third-party conversations (e.g., User 3 ↔ User 5) do NOT appear
- [ ] Check browser console for "🚫 Skipping third-party conversation" logs

### For Regular Users:
- [ ] Login as regular user
- [ ] Verify all conversations work normally
- [ ] Send and receive messages
- [ ] Verify recent chats update correctly
- [ ] No third-party conversations should appear (same as before)

## Debug Logging

The fix includes console logging to help track filtering:

```javascript
console.log(`[DirectChat] 🚫 Skipping third-party conversation: ${id1} ↔ ${id2} (ME=${ME_ID})`);
console.log(`[DirectChat] 🚫 Filtering out third-party recent chat: ${sId} ↔ ${rId}`);
console.log(`[DirectChat] 🚫 Filtering out third-party chat in initial fetch: ${sId} ↔ ${rId}`);
console.log(`[DirectChat] 🚫 Skipping recent chat update for third-party message: ${sId} → ${rId}`);
console.log(`[DirectChat] 🚫 Ignoring third-party message: ${sId} → ${rId} (ME=${ME_ID})`);
```

These logs will appear in the browser console when third-party conversations are filtered out.

## Expected Behavior After Fix

### Before:
- Admin sees all conversations in the system, including those they're not part of
- Recent chats list shows User 3 ↔ User 5 even though admin is not involved
- Confusing UX for admin users

### After:
- Admin only sees conversations where they are a participant (sender or recipient)
- Recent chats list only shows conversations involving the admin
- Clean, focused chat list
- Third-party conversations are silently filtered out with debug logging

## Notes

1. **Backend API**: The API still returns all conversations (including third-party ones for admins). This fix filters them on the frontend. Consider updating the backend API to only return relevant conversations.

2. **Performance**: Filtering happens at multiple points to ensure consistency. This is efficient since filtering is done on already-loaded data.

3. **Backward Compatibility**: Regular users are unaffected by this change since they never received third-party conversations from the API.

4. **Future Enhancement**: If admin monitoring is needed in the future, add a separate "Monitor All Chats" view instead of mixing it with personal chats.
