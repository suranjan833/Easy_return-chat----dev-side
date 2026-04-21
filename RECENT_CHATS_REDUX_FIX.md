# Recent Chats Redux Store Implementation

## Problem
The sidebar unread count badges were not updating when messages were read in chat popups. The issue was that the chat popup and normal chat UI were updating local state, but the sidebar was listening to ChatService events which weren't being triggered consistently.

## Solution
Created a centralized Redux store (`recentChatsSlice`) to manage recent chats and unread counts. Both the chat popup and normal chat UI now dispatch Redux actions when:
- A new message arrives
- A chat is opened (marks as read)
- Messages are read

The sidebar now reads from the Redux store instead of local state, ensuring it always reflects the current unread counts.

## Files Changed

### 1. New Redux Slice
**File:** `Easy-return/src/redux/slices/recentChatsSlice.js`
- Created new Redux slice with actions:
  - `setRecentChats`: Initialize/replace entire list
  - `updateRecentChat`: Update a specific chat
  - `incrementUnreadCount`: Increment unread for a chat
  - `clearUnreadCount`: Clear unread for a chat
  - `upsertRecentChat`: Add or update with unread count

### 2. Redux Store Configuration
**File:** `Easy-return/src/redux/store.js`
- Added `recentChatsReducer` to the store

### 3. ChatService Updates
**File:** `Easy-return/src/Services/ChatService.js`
- Imported Redux store and actions
- Dispatches `setRecentChats` when initial data is loaded
- Dispatches `clearUnreadCount` when `markAsRead()` is called
- Ensures sidebar receives updates via Redux

### 4. DirectChatContext Updates
**File:** `Easy-return/src/pages/app/chat/DirectChatContext.jsx`
- Added `useDispatch` hook
- Imported Redux actions
- In `handleNewMessage`:
  - Dispatches `upsertRecentChat` when new message arrives
  - Dispatches `incrementUnreadCount` if message is from another user and chat is not active
  - Dispatches `clearUnreadCount` when chat is opened
- Updated dependency array to include `dispatch`

### 5. ChatPopup Updates
**File:** `Easy-return/src/layout/sidebar/ChatPopup.jsx`
- Added `useDispatch` hook
- Imported Redux actions and ChatService
- On mount (when popup opens):
  - Dispatches `clearUnreadCount` for the user
  - Calls `chatService.markAsRead()` to sync with backend

### 6. Sidebar Updates
**File:** `Easy-return/src/layout/sidebar/Sidebar.jsx`
- Added Redux selector: `useSelector((state) => state.recentChats.chats)`
- Updated unread badge rendering to use `recentChatsFromRedux`
- Updated user sorting logic to use `recentChatsFromRedux`

## How It Works

### Flow for New Messages
1. New message arrives via WebSocket → `ChatService.onmessage`
2. ChatService notifies subscribers → `DirectChatContext.handleNewMessage`
3. `handleNewMessage` dispatches `upsertRecentChat` to Redux
4. If message is from another user and chat is not active, dispatches `incrementUnreadCount`
5. Sidebar reads from Redux store → unread badge updates immediately

### Flow for Opening Chat (Popup or Normal UI)
1. User opens chat popup → `ChatPopup` mounts
2. `useEffect` runs on mount:
   - Calls `direct.selectUser(user.id)` (marks as read in DirectChatContext)
   - Dispatches `clearUnreadCount(user.id)` to Redux
   - Calls `chatService.markAsRead(user.id)` to update ChatService internal state
3. Sidebar reads from Redux store → unread badge clears immediately

### Flow for Reading Messages in Active Chat
1. Message is read in active chat → `DirectChatContext.handleStatusUpdate`
2. Updates local messages state with `read: true`
3. Calls `chatService.markAsRead(activeUser.id)`
4. ChatService dispatches `clearUnreadCount` to Redux
5. Sidebar reads from Redux store → unread badge clears

## Benefits
- **Single source of truth**: Redux store is the authoritative source for recent chats and unread counts
- **Consistent updates**: All components (popup, normal chat, sidebar) update the same store
- **No race conditions**: Redux ensures state updates are atomic and predictable
- **Easier debugging**: Redux DevTools can track all state changes

## Testing Checklist
- [ ] Open chat popup → unread badge clears immediately
- [ ] Read messages in popup → unread badge stays cleared
- [ ] Close popup, receive new message → unread badge increments
- [ ] Open normal chat UI → unread badge clears immediately
- [ ] Read messages in normal UI → unread badge stays cleared
- [ ] Switch between users → unread badges update correctly
- [ ] Receive multiple messages from different users → all badges update correctly
