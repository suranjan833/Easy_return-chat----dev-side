# Debug Message Flow - Diagnostic Steps

## Issue
- Own messages not appearing in real-time
- Incoming messages not appearing in real-time
- Messages are successfully sent but never show on screen

## Diagnostic Steps

### Step 1: Check ChatService Initialization

Open browser console and check for these logs:

```
[ChatService] Initializing for user {userId}
[ChatService] Initial data loaded: X users, Y chats
Socket connected
```

**If missing:** ChatService is not initializing properly.

### Step 2: Check DirectChatContext Subscriptions

Look for these logs:

```
[DirectChat] Effect for chat service subscriptions running
[DirectChat] Subscribed to ChatService events
```

**If missing:** DirectChatContext is not subscribing to ChatService.

### Step 3: Check Message Sending

When you send a message, look for:

```
[DirectChat] 📤 Broadcasting optimistic message to all contexts: temp-{timestamp}
[ChatService] 📢 Broadcasting local message to all subscribers: {message}
[ChatService] ➡️ SENT payload: {payload}
```

**If missing:** Message is not being sent or broadcast.

### Step 4: Check Message Reception

When a message arrives (yours or others'), look for:

```
[ChatService] ⬅️ RECEIVED from server: {data}
[DirectChat] 📨 Received message: {id} for conversation: {pairKey}
[DirectChat] ➕ Adding new message to thread: {id}
```

**If missing:** Messages are not being received or processed.

### Step 5: Check Active User

Verify the active user is set:

```
[DirectChat] 🔄 activeUserRef updated → id={userId}
[DirectChat] 👉 selectUser(userId={id}, convId={convId})
```

**If missing:** No active conversation is selected.

## Common Issues & Fixes

### Issue 1: ChatService Not Initialized

**Symptoms:**
- No "Socket connected" log
- No initial data loaded

**Fix:**
Check `localStorage`:
```javascript
localStorage.getItem('accessToken')
localStorage.getItem('userId')
```

Both must be present and valid.

### Issue 2: DirectChatContext Not Subscribing

**Symptoms:**
- ChatService logs show messages
- DirectChatContext doesn't log anything

**Fix:**
The subscription effect might not be running. Check if:
- `ME_ID` is valid
- `TOKEN` is valid
- Effect dependencies are correct

### Issue 3: No Active User Selected

**Symptoms:**
- Messages are received
- But `isActiveMainWindow` is false
- Messages don't appear in UI

**Fix:**
Ensure you've clicked on a user in the sidebar to select them.

### Issue 4: Messages Filtered Out

**Symptoms:**
- Messages are received
- But filtered out by third-party check

**Fix:**
Check if the message involves the current user:
```javascript
const sId = Number(message.sender_id);
const rId = Number(message.recipient_id);
const isParticipant = sId === ME_ID || rId === ME_ID;
```

If `isParticipant` is false, message is filtered.

## Add Debug Logging

### In ChatService.js - connectWebSocket()

```javascript
this.ws.onopen = () => {
  console.log("✅ Socket connected");
  // ... rest of code
};

this.ws.onmessage = async (event) => {
  console.log("[ChatService] ⬅️ RAW WebSocket message:", event.data);
  const data = JSON.parse(event.data);
  console.log("[ChatService] ⬅️ PARSED message:", data);
  // ... rest of code
};
```

### In DirectChatContext.jsx - handleNewMessage()

```javascript
const handleNewMessage = useCallback((data) => {
  console.log('[DirectChat] 🎯 handleNewMessage called with:', data);
  const { message } = data;
  const sId = Number(message.sender_id);
  const rId = Number(message.recipient_id);
  console.log('[DirectChat] 📊 Message details:', { sId, rId, ME_ID, pairKey });
  
  // ... rest of code
  
  console.log('[DirectChat] 🔍 isActiveMainWindow:', isActiveMainWindow);
  console.log('[DirectChat] 🔍 activeConversationIdRef.current:', activeConversationIdRef.current);
  
  if (isActiveMainWindow) {
    console.log('[DirectChat] ✅ Adding message to active window');
    setMessages((prev) => {
      console.log('[DirectChat] 📝 Current messages count:', prev.length);
      // ... rest of code
    });
  } else {
    console.log('[DirectChat] ❌ NOT adding to active window - conversation not active');
  }
}, [ME_ID, allUsers, dispatch]);
```

### In DirectChatContext.jsx - sendMessage()

```javascript
const sendMessage = useCallback((text) => {
  console.log('[DirectChat] 📤 sendMessage called with:', text);
  console.log('[DirectChat] 📤 activeUser:', activeUser);
  console.log('[DirectChat] 📤 ME_ID:', ME_ID);
  
  // ... prepare payload ...
  
  console.log('[DirectChat] 📤 Sending payload:', payload);
  
  if (chatService.sendMessage(payload)) {
    console.log('[DirectChat] ✅ Message sent successfully');
    // ... broadcast code ...
  } else {
    console.log('[DirectChat] ❌ Message send failed');
  }
}, [/* deps */]);
```

## Quick Test Script

Run this in browser console to test message flow:

```javascript
// Check ChatService status
console.log('ChatService initialized:', window.chatService?.isInitialized());
console.log('ChatService connection:', window.chatService?.getConnectionStatus());
console.log('ChatService users:', window.chatService?.getUsers()?.length);
console.log('ChatService recent chats:', window.chatService?.getRecentChats()?.length);

// Check localStorage
console.log('Token:', localStorage.getItem('accessToken') ? 'Present' : 'Missing');
console.log('User ID:', localStorage.getItem('userId'));

// Check active user
console.log('Active user ID:', localStorage.getItem('active_user_id'));
```

## Expected Flow for Sending Message

1. User types message and clicks send
2. `sendMessage()` is called
3. Payload is created
4. `chatService.sendMessage(payload)` sends via WebSocket
5. `chatService.broadcastLocalMessage()` broadcasts to all contexts
6. `handleNewMessage()` is called in all DirectChatContext instances
7. Message is added to `messages` state
8. UI re-renders with new message
9. Server echoes message back
10. Temp ID is replaced with real ID

## Expected Flow for Receiving Message

1. Server sends message via WebSocket
2. `ChatService.ws.onmessage` receives it
3. `chatService.notifySubscribers("new_message", ...)` broadcasts
4. `handleNewMessage()` is called in all DirectChatContext instances
5. Message is added to `messages` state
6. UI re-renders with new message

## Critical Checkpoints

✅ **Checkpoint 1:** ChatService initialized and connected  
✅ **Checkpoint 2:** DirectChatContext subscribed to events  
✅ **Checkpoint 3:** Active user selected  
✅ **Checkpoint 4:** Message sent via WebSocket  
✅ **Checkpoint 5:** Message broadcast to contexts  
✅ **Checkpoint 6:** handleNewMessage called  
✅ **Checkpoint 7:** isActiveMainWindow is true  
✅ **Checkpoint 8:** Message added to state  
✅ **Checkpoint 9:** UI re-renders  

If any checkpoint fails, that's where the issue is.
