# WebSocket Token Expiration Analysis

## Summary
**WebSocket tokens DO NOT have explicit expiration handling in the current implementation.**

## Current Token Handling

### 1. Token Storage
- Tokens are stored in `localStorage` as `accessToken`
- Retrieved on every HTTP request via axios interceptor
- Retrieved once during WebSocket initialization

### 2. WebSocket Connection Initialization

#### ChatService (Direct Messages)
```javascript
// Location: src/Services/ChatService.js
this.ws = new WebSocket(
  `${WS_BASE_URL}/messaging/ws/${this.userId}/${this.token}`
);
```

#### GroupChatService (Group Messages)
```javascript
// Location: src/Services/GroupChatService.js
this.ws = new WebSocket(
  `${WS_BASE_URL}/groups/ws/${this.userId}/${this.token}`
);
```

**Key Issue**: Token is passed in the WebSocket URL during connection establishment. Once connected, the token is NOT refreshed or re-validated.

### 3. Token Refresh Mechanism

#### HTTP Requests
- `api.js` references a `refreshToken()` function in error handlers (lines 246, 293, 338)
- **CRITICAL**: `refreshToken()` function is **NOT DEFINED** anywhere in the codebase
- This means token refresh attempts will fail with `ReferenceError: refreshToken is not defined`

#### WebSocket Connections
- **NO token refresh mechanism exists**
- WebSocket connections do NOT check for token expiration
- WebSocket connections do NOT attempt to reconnect with a new token

## Token Expiration Scenarios

### Scenario 1: Token Expires During Active WebSocket Connection

**What Happens:**
1. User logs in, WebSocket connects with valid token
2. Token expires after X hours (server-side expiration)
3. WebSocket connection remains open (no validation)
4. User can continue sending/receiving messages through existing connection
5. **Problem**: If connection drops, reconnection will fail with expired token

**Current Behavior:**
- Connection stays alive until manually closed or network interruption
- No proactive token validation
- No automatic token refresh

### Scenario 2: Token Expires, Then Connection Drops

**What Happens:**
1. Token expires while WebSocket is connected
2. Network interruption or server restart closes WebSocket
3. Auto-reconnect attempts with expired token
4. **Server likely rejects connection** (depends on backend implementation)
5. Client keeps retrying with same expired token (infinite loop)

**Current Behavior:**
```javascript
// ChatService.js - onclose handler
this.ws.onclose = () => {
  // ... reconnect logic
  if (this.retryCount < this.maxRetries) {
    const delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount++));
    setTimeout(() => this.connectWebSocket(), delay);
  }
};
```

**Problem**: `connectWebSocket()` uses the same `this.token` that was set during initialization. No token refresh occurs.

### Scenario 3: Token Expires Before HTTP Request

**What Happens:**
1. User makes HTTP request (upload file, fetch messages, etc.)
2. Server returns 401 Unauthorized
3. Code attempts to call `refreshToken()` 
4. **FAILS**: `refreshToken is not defined`
5. Error is thrown to user

**Example from api.js:**
```javascript
if (error.response?.status === 401) {
  try {
    await refreshToken(); // ❌ This function doesn't exist!
    // retry logic...
  } catch (retryError) {
    throw handleApiError(retryError);
  }
}
```

## Missing Components

### 1. Token Refresh Function
- **Status**: NOT IMPLEMENTED
- **Impact**: HTTP requests fail permanently on 401 errors
- **Expected Behavior**: Should call backend `/refresh` endpoint with refresh token

### 2. WebSocket Token Refresh
- **Status**: NOT IMPLEMENTED
- **Impact**: WebSocket reconnection fails with expired tokens
- **Expected Behavior**: Should:
  1. Detect 401/4001 close codes from server
  2. Refresh token via HTTP
  3. Reconnect with new token

### 3. Proactive Token Validation
- **Status**: NOT IMPLEMENTED
- **Impact**: No warning before token expires
- **Expected Behavior**: Should:
  1. Decode JWT to check expiration
  2. Refresh token before expiration
  3. Update WebSocket connection if needed

## Backend Dependency

The analysis assumes the backend:
- Issues JWT tokens with expiration
- Validates tokens on WebSocket connection
- Closes WebSocket with specific code (e.g., 4001) on token expiration
- Provides a token refresh endpoint

**Note**: Backend behavior is not visible in this frontend codebase.

## Recommendations

### Immediate Fixes

1. **Implement `refreshToken()` function**
   ```javascript
   // In api.js
   export const refreshToken = async () => {
     const refreshToken = localStorage.getItem('refreshToken');
     if (!refreshToken) {
       throw new Error('No refresh token available');
     }
     
     const response = await axios.post(`${BASE_URL}/auth/refresh`, {
       refresh_token: refreshToken
     });
     
     const { access_token, refresh_token: newRefreshToken } = response.data;
     localStorage.setItem('accessToken', access_token);
     if (newRefreshToken) {
       localStorage.setItem('refreshToken', newRefreshToken);
     }
     
     return access_token;
   };
   ```

2. **Add WebSocket token refresh on reconnection**
   ```javascript
   // In ChatService.js and GroupChatService.js
   this.ws.onclose = async (event) => {
     // Check if close was due to auth failure
     if (event.code === 4001 || event.code === 1008) {
       try {
         // Refresh token before reconnecting
         const newToken = await refreshToken();
         this.token = newToken;
       } catch (error) {
         console.error('Token refresh failed, redirecting to login');
         window.location.href = '/auth-login';
         return;
       }
     }
     
     // Continue with reconnection logic...
   };
   ```

3. **Add proactive token refresh**
   ```javascript
   // In ChatService.js
   import jwtDecode from 'jwt-decode';
   
   startTokenRefreshTimer() {
     const decoded = jwtDecode(this.token);
     const expiresAt = decoded.exp * 1000; // Convert to milliseconds
     const now = Date.now();
     const timeUntilExpiry = expiresAt - now;
     
     // Refresh 5 minutes before expiration
     const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
     
     if (refreshTime > 0) {
       setTimeout(async () => {
         try {
           const newToken = await refreshToken();
           this.token = newToken;
           
           // Reconnect WebSocket with new token
           if (this.ws) {
             this.ws.close();
             this.connectWebSocket();
           }
           
           // Restart timer
           this.startTokenRefreshTimer();
         } catch (error) {
           console.error('Token refresh failed:', error);
         }
       }, refreshTime);
     }
   }
   ```

### Long-term Improvements

1. **Centralized token management service**
   - Single source of truth for token state
   - Automatic refresh before expiration
   - Notify all services of token updates

2. **WebSocket authentication upgrade**
   - Send token in WebSocket message after connection (not in URL)
   - Support token refresh over existing connection
   - Handle server-initiated re-authentication requests

3. **Better error handling**
   - Distinguish between network errors and auth errors
   - Show user-friendly messages for token expiration
   - Automatic redirect to login when refresh fails

## Conclusion

**Current State**: WebSocket tokens have NO expiration handling. The system relies on:
1. Tokens never expiring during active sessions
2. Backend not enforcing token expiration on WebSocket connections
3. Users manually logging out and back in when tokens expire

**Risk Level**: HIGH
- Users will experience connection failures when tokens expire
- No graceful degradation or recovery mechanism
- Undefined `refreshToken()` function will cause crashes

**Action Required**: Implement token refresh mechanism immediately to prevent production issues.
