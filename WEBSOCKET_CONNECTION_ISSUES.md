# WebSocket Connection Issues - Diagnostic Report

## Problem
Messages work initially after login, but after a few minutes, real-time updates stop. Messages are saved to DB but not received by other users until page reload.

## Root Causes Identified

### 1. **Silent WebSocket Disconnection** ⚠️ CRITICAL
**Location:** `GroupChatService.js` - `onclose` handler

**Issue:**
```javascript
this.ws.onclose = () => {
  // Only logs when commented out
  this.connectionStatus = "disconnected";
  this.notifySubscribers("connection", { status: "disconnected" });
  
  // Auto-reconnect with exponential backoff
  if (this.retryCount < this.maxRetries) {
    const delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount++));
    setTimeout(() => this.connectWebSocket(), delay);
  }
};
```

**Problems:**
- No console logging when connection closes (all logs commented out)
- After 5 retries (`maxRetries = 5`), it stops trying to reconnect permanently
- No notification to user that connection is lost
- `sendMessage()` checks `ws.readyState` but doesn't attempt reconnection

### 2. **No Heartbeat/Ping-Pong Mechanism** ⚠️ CRITICAL
**Issue:** WebSocket connections can silently die due to:
- Network timeouts
- Proxy/load balancer timeouts
- Server-side idle timeouts
- Mobile network switches

**Missing:** No periodic ping to keep connection alive or detect dead connections

### 3. **No Connection Health Monitoring** ⚠️ HIGH
**Issue:**
- `isInitialized()` only checks if `connectionStatus !== "disconnected"`, but doesn't verify WebSocket is actually open
- Components check `isInitialized()` but don't react to connection status changes
- No visual indicator to user when connection is lost

### 4. **Retry Logic Stops After 5 Attempts** ⚠️ HIGH
```javascript
this.maxRetries = 5;
// After 5 retries: 1s, 2s, 4s, 8s, 16s = ~31 seconds total
// Then gives up permanently
```

**Problem:** If network is unstable for >31 seconds, connection is lost forever until page reload.

### 5. **No Reconnection on Send Failure** ⚠️ MEDIUM
```javascript
sendMessage(messageData) {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    console.error("[GroupChatService] WebSocket not connected");
    this.notifySubscribers("error", { message: "WebSocket not connected" });
    return false; // Just fails, doesn't try to reconnect
  }
  // ...
}
```

### 6. **Browser Tab Visibility Issues** ⚠️ LOW
When browser tab is inactive, some browsers throttle timers and WebSocket events, which can cause:
- Delayed reconnection attempts
- Missed messages
- Connection appearing alive when it's actually dead

## Recommended Fixes

### Fix 1: Add Heartbeat/Ping Mechanism
```javascript
class GroupChatService {
  constructor() {
    // ... existing code
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.missedHeartbeats = 0;
    this.maxMissedHeartbeats = 3;
  }

  connectWebSocket() {
    // ... existing connection code
    
    this.ws.onopen = () => {
      this.connectionStatus = "connected";
      this.notifySubscribers("connection", { status: "connected" });
      this.retryCount = 0;
      this.isConnecting = false;
      
      // Start heartbeat
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Reset heartbeat on any message
      this.resetHeartbeat();
      
      // Handle ping/pong
      if (data.type === "ping") {
        this.ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      
      // ... rest of message handling
    };
    
    this.ws.onclose = () => {
      console.warn("[GroupChatService] ⚠️ WebSocket closed");
      this.stopHeartbeat();
      this.connectionStatus = "disconnected";
      this.notifySubscribers("connection", { status: "disconnected" });
      this.isConnecting = false;
      
      // Infinite retry with exponential backoff (capped at 30s)
      const delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount++));
      console.log(`[GroupChatService] 🔄 Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
      setTimeout(() => this.connectWebSocket(), delay);
    };
  }
  
  startHeartbeat() {
    this.stopHeartbeat();
    this.missedHeartbeats = 0;
    
    // Send ping every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
        
        // Expect pong within 5 seconds
        this.heartbeatTimeout = setTimeout(() => {
          this.missedHeartbeats++;
          console.warn(`[GroupChatService] ⚠️ Missed heartbeat ${this.missedHeartbeats}/${this.maxMissedHeartbeats}`);
          
          if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
            console.error("[GroupChatService] ❌ Connection dead, forcing reconnect");
            this.ws.close(); // Trigger reconnection
          }
        }, 5000);
      }
    }, 30000);
  }
  
  resetHeartbeat() {
    this.missedHeartbeats = 0;
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
}
```

### Fix 2: Remove Retry Limit
```javascript
this.ws.onclose = () => {
  console.warn("[GroupChatService] ⚠️ WebSocket closed");
  this.stopHeartbeat();
  this.connectionStatus = "disconnected";
  this.notifySubscribers("connection", { status: "disconnected" });
  this.isConnecting = false;
  
  // Infinite retry with exponential backoff (capped at 30s)
  const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(this.retryCount++, 5)));
  console.log(`[GroupChatService] 🔄 Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
  setTimeout(() => this.connectWebSocket(), delay);
};
```

### Fix 3: Auto-Reconnect on Send Failure
```javascript
sendMessage(messageData) {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    console.error("[GroupChatService] WebSocket not connected, attempting reconnect");
    this.notifySubscribers("error", { message: "Connection lost, reconnecting..." });
    
    // Trigger reconnection
    if (this.ws?.readyState === WebSocket.CLOSED) {
      this.connectWebSocket();
    }
    
    return false;
  }
  
  try {
    this.ws.send(JSON.stringify(messageData));
    return true;
  } catch (error) {
    console.error("[GroupChatService] Error sending message:", error);
    // Force reconnect on send error
    this.ws.close();
    return false;
  }
}
```

### Fix 4: Add Connection Status UI Indicator
```javascript
// In GroupChatContext or UI component
const [connectionStatus, setConnectionStatus] = useState("connected");

useEffect(() => {
  const handleConnection = (data) => {
    setConnectionStatus(data.status);
    
    if (data.status === "disconnected") {
      toast.warning("Connection lost. Reconnecting...", { autoClose: false, toastId: "ws-disconnect" });
    } else if (data.status === "connected") {
      toast.dismiss("ws-disconnect");
      toast.success("Connected!", { autoClose: 2000 });
    }
  };
  
  groupChatService.subscribe("connection", handleConnection);
  return () => groupChatService.unsubscribe("connection", handleConnection);
}, []);

// Show indicator in UI
{connectionStatus !== "connected" && (
  <div className="connection-warning">
    <i className="bi bi-wifi-off" /> Reconnecting...
  </div>
)}
```

### Fix 5: Handle Page Visibility Changes
```javascript
// In GroupChatServiceInitializer
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && groupChatService.ws?.readyState !== WebSocket.OPEN) {
      console.log("[GroupChatService] Tab became visible, checking connection");
      groupChatService.connectWebSocket();
    }
  };
  
  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);
```

## Testing Checklist

- [ ] Disconnect network for 1 minute → Should reconnect automatically
- [ ] Keep tab inactive for 5 minutes → Should maintain connection
- [ ] Send message while disconnected → Should show error and reconnect
- [ ] Server restart → Should reconnect within 30 seconds
- [ ] Mobile network switch (WiFi ↔ 4G) → Should reconnect
- [ ] Browser sleep/wake → Should reconnect
- [ ] Multiple tabs open → All should maintain connection

## Server-Side Requirements

The server must support:
1. **Ping/Pong messages** - Respond to `{"type": "ping"}` with `{"type": "pong"}`
2. **Idle timeout** - Close connections idle for >5 minutes (client will reconnect)
3. **Graceful shutdown** - Send close frame before shutting down

## Priority

1. **CRITICAL** - Add heartbeat mechanism (Fix 1)
2. **CRITICAL** - Remove retry limit (Fix 2)
3. **HIGH** - Add connection status UI (Fix 4)
4. **MEDIUM** - Auto-reconnect on send failure (Fix 3)
5. **LOW** - Handle page visibility (Fix 5)
