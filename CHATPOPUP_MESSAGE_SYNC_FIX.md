# Chat Popup Message Sync Issue

## Problem
When sending a message while a chat popup is open, the popup doesn't update with the new message. The main ChatBody shows the message, but the popup remains stale.

## Root Cause

### Architecture Overview
```
ChatBody (main window)
  └─ DirectChatProvider (instance A)
      └─ DirectChatContext
          └─ messages state

ChatPopup (floating window)
  └─ DirectChatProvider (instance B)  ← NEW ISOLATED INSTANCE
      └─ DirectChatContext
          └─ messages state  ← SEPARATE STATE
```

### The Issue
1. **Each popup gets its own `DirectChatProvider`** (see `ChatPopupsContainer.jsx` line 88-92)
2. Each provider maintains **separate local state** for messages
3. **ChatService is a singleton** that broadcasts WebSocket events to all subscribers
4. When a message is **received** via WebSocket → ChatService broadcasts → all contexts update ✅
5. When a message is **sent** from ChatBody → only that context's local state updates ❌
6. The popup's context doesn't receive the update because it's not broadcast through ChatService

### Code Evidence

**ChatPopupsContainer.jsx:**
```jsx
<DirectChatProvider>  {/* ← NEW ISOLATED CONTEXT */}
  <ChatPopup
    user={popup.user}
    onClose={() => dispatch(removeUserChatPopup(popup.user.id))}
    initialPosition={getInitialPosition(index)}
    index={index}
  />
</DirectChatProvider>
```

**DirectChatContext.jsx - sendMessage():**
```javascript
const sendMessage = useCallback((text) => {
  // ... prepare payload ...
  
  if (chatService.sendMessage(payload)) {
    // ❌ Only updates LOCAL state
    setRecentChats((prev) => {
      // ... update recent chats ...
    });
    
    // ❌ No broadcast to other contexts
    setAttachment(null);
    setReplyToMessage(null);
  }
}, [/* deps */]);
```

**ChatService.js - WebSocket onmessage:**
```javascript
this.ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === "message" || ...) {
    var payload = data.data || data;
    
    // ✅ Broadcasts to ALL subscribers
    this.notifySubscribers("new_message", {
      message: payload,
      otherUserId,
      senderId: sId,
      recipientId: rId,
    });
  }
};
```

## Solution Options

### Option 1: Share Context (Not Recommended)
Make all popups share the same DirectChatContext instance. This would require significant refactoring and could cause state conflicts.

### Option 2: Optimistic UI + WebSocket Echo (Current Behavior)
The current implementation relies on the server echoing back sent messages via WebSocket. This should work, but there might be a delay or the echo isn't being processed correctly.

### Option 3: Manual Broadcast (Recommended)
When sending a message, manually trigger the ChatService to broadcast it to all subscribers, simulating a WebSocket message.

## Recommended Fix

### Step 1: Add a method to ChatService to manually broadcast messages

**File:** `src/Services/ChatService.js`

```javascript
// Add this method to the ChatService class
broadcastLocalMessage(message) {
  console.log('[ChatService] 📢 Broadcasting local message to all subscribers:', message);
  
  const sId = Number(message.sender_id);
  const rId = Number(message.recipient_id);
  const mId = Number(this.userId);
  
  const otherUserId = (sId === mId) ? rId : sId;
  
  this.notifySubscribers("new_message", {
    message: message,
    otherUserId,
    senderId: sId,
    recipientId: rId,
  });
}
```

### Step 2: Call broadcast after sending message

**File:** `src/pages/app/chat/DirectChatContext.jsx`

In the `sendMessage` function, after successfully sending:

```javascript
const sendMessage = useCallback((text) => {
  // ... existing code to prepare payload ...
  
  if (chatService.sendMessage(payload)) {
    // ✅ Broadcast to all contexts immediately (optimistic update)
    if (payload.type === "message" || payload.type === "message_with_attachment") {
      const optimisticMessage = {
        id: `temp-${Date.now()}`, // Temporary ID until server confirms
        sender_id: ME_ID,
        recipient_id: activeUser.id,
        content: content || "",
        attachment: attachment ? {
          filename: attachment.filename,
          url: attachment.data,
        } : null,
        timestamp: new Date().toISOString(),
        read: false,
        delivered: false,
        type: payload.type,
      };
      
      chatService.broadcastLocalMessage(optimisticMessage);
    }
    
    // ... existing cleanup code ...
  }
}, [/* deps */]);
```

### Step 3: Handle duplicate messages

Since the server will echo the message back, we need to handle duplicates. The `handleNewMessage` already has deduplication logic:

```javascript
setMessages((prev) => {
  const exists = prev.some((m) => m.id === message.id);
  if (exists) return prev;  // ✅ Already handles duplicates
  
  return [...prev, newMsg].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
  );
});
```

But we need to also replace temporary IDs with real IDs when the server confirms:

```javascript
const handleNewMessage = useCallback((data) => {
  const { message } = data;
  
  // ... existing code ...
  
  // Append to open thread if relevant (main window)
  if (isActiveMainWindow) {
    setMessages((prev) => {
      // Check if this is a server confirmation of a temp message
      const tempMsg = prev.find(m => 
        typeof m.id === 'string' && 
        m.id.startsWith('temp-') &&
        m.sender_id === message.sender_id &&
        m.recipient_id === message.recipient_id &&
        Math.abs(new Date(m.timestamp) - new Date(message.timestamp)) < 5000 // Within 5 seconds
      );
      
      if (tempMsg) {
        // Replace temp message with real one
        return prev.map(m => m.id === tempMsg.id ? {
          ...message,
          timestamp: message.timestamp || message.created_at || new Date().toISOString(),
          forwarded: message.forwarded === true || message.forwarded_from_message_id !== undefined,
        } : m);
      }
      
      // Check for exact duplicate
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev;

      const newMsg = {
        ...message,
        timestamp: message.timestamp || message.created_at || new Date().toISOString(),
        forwarded: message.forwarded === true || message.forwarded_from_message_id !== undefined,
      };

      return [...prev, newMsg].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      );
    });
  }
}, [ME_ID, allUsers, dispatch]);
```

## Alternative: Simpler Fix (Check Server Echo)

Before implementing the broadcast solution, verify that the server is actually echoing messages back. Check the WebSocket logs:

```javascript
// In ChatService.js onmessage
console.log("[ChatService] ⬅️ RECEIVED from server:", data);

// Look for messages where sender_id === your user ID
// These should be the echoed messages
```

If the server IS echoing but popups aren't updating, the issue might be in the `handleNewMessage` logic filtering out messages incorrectly.

## Testing Checklist

After implementing the fix:

1. [ ] Open a chat popup for User A
2. [ ] Send a message to User A from the main ChatBody
3. [ ] Verify the message appears in BOTH ChatBody and the popup
4. [ ] Send a message from the popup
5. [ ] Verify it appears in both the popup and ChatBody
6. [ ] Open multiple popups (User A, User B)
7. [ ] Send messages to each user
8. [ ] Verify each popup only shows messages for that specific user
9. [ ] Check for duplicate messages
10. [ ] Verify message status (sent/delivered/read) updates correctly

## Debug Logging

Add these logs to track message flow:

```javascript
// In ChatService.broadcastLocalMessage
console.log('[ChatService] 📢 Broadcasting to', this.subscribers.get('new_message')?.size || 0, 'subscribers');

// In DirectChatContext.handleNewMessage
console.log('[DirectChat] 📨 Received message:', message.id, 'for conversation:', pairKey, 'active:', activeConversationIdRef.current);

// In ChatPopup useEffect
console.log('[ChatPopup] 📦 Messages updated, count:', direct?.messages?.length);
```

## Summary

The issue is that each popup has an isolated DirectChatContext that doesn't receive updates when messages are sent from other contexts. The fix is to broadcast sent messages through the ChatService singleton so all contexts receive the update, just like WebSocket messages.
