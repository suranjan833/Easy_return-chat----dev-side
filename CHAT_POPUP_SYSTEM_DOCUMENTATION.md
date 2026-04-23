# Chat Popup System - Complete Documentation

## Overview

The chat popup system allows users to have floating, draggable chat windows for direct messages, group chats, and support tickets. Multiple popups can be open simultaneously with a maximum limit of 4 total popups across all types.

## Architecture

### State Management
**Location:** `src/redux/slices/chatPopupsSlice.js`

```javascript
{
  openChatPopups: [],        // Direct message popups
  openGroupChatPopups: [],   // Group chat popups
  openSupportChatPopups: []  // Support ticket popups
}
```

### Maximum Popup Limit
**Total limit:** 4 popups (combined across all types)

```javascript
const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
if (total >= 4) return; // Prevent opening more
```

## Popup Types

### 1. Direct Message Popup (ChatPopup)
**Component:** `src/layout/sidebar/ChatPopup.jsx`
**Redux Actions:** `addUserChatPopup`, `removeUserChatPopup`

**Features:**
- ✅ Send/receive messages in real-time
- ✅ Reply to messages
- ✅ Edit own messages
- ✅ Delete own messages
- ✅ Forward messages to other users or groups
- ✅ Emoji picker
- ✅ File attachments (images, PDFs, docs)
- ✅ Drag & drop files
- ✅ Paste images from clipboard
- ✅ Message info modal (read receipts, timestamps)
- ✅ Typing indicators
- ✅ Read/delivered status (single/double check marks)
- ✅ Scroll to bottom button
- ✅ Draggable window
- ✅ Auto-scroll on new messages
- ✅ Reply preview with jump-to-message
- ✅ Edit indicator
- ✅ Forwarded message indicator
- ✅ Emoji-only messages (larger display)
- ✅ Message timestamps

**Dimensions:**
- Width: 300px
- Height: 480px
- Position: Draggable, starts at (20, 20)

**How to Open:**
```javascript
import { addUserChatPopup } from '@/redux/slices/chatPopupsSlice';

// From sidebar or anywhere
dispatch(addUserChatPopup(user));
```

**Duplicate Prevention:**
- Checks if popup with same `user.id` already exists
- Prevents opening if already open

### 2. Group Chat Popup (GroupChatPopup)
**Component:** `src/layout/sidebar/GroupChatPopup.jsx`
**Redux Actions:** `addGroupChatPopup`, `removeGroupChatPopup`

**Features:**
- ✅ Send/receive group messages in real-time
- ✅ Reply to messages
- ✅ Reply to replies (nested replies)
- ✅ Edit own messages
- ✅ Delete own messages
- ✅ Forward messages to other groups or users
- ✅ Emoji picker
- ✅ File attachments (images, PDFs, docs)
- ✅ Drag & drop files
- ✅ Paste images from clipboard
- ✅ Message info modal (read receipts by all members)
- ✅ Typing indicators (shows who is typing)
- ✅ @Mentions with autocomplete
- ✅ Styled mentions (blue color)
- ✅ Mention notifications
- ✅ Group member list in header
- ✅ Scroll to bottom/top buttons
- ✅ Draggable window
- ✅ Auto-scroll on new messages
- ✅ Reply preview with jump-to-message
- ✅ Edit indicator
- ✅ Forwarded message indicator
- ✅ Emoji-only messages (larger display)
- ✅ Message timestamps
- ✅ Navigate to group settings (maximize to full page)

**Dimensions:**
- Width: 300px
- Height: 480px
- Position: Draggable, starts at (20, 20)

**How to Open:**
```javascript
import { addGroupChatPopup } from '@/redux/slices/chatPopupsSlice';

// From sidebar or anywhere
dispatch(addGroupChatPopup(group));
```

**Duplicate Prevention:**
- Checks if popup with same `group.id` already exists
- Prevents opening if already open

**Unique Features:**
- **@Mentions:** Type `@` to see member suggestions, click to mention
- **Member List:** Click member count in header to see all members
- **Nested Replies:** Can reply to replies (reply-on-reply)
- **Group Read Receipts:** See who read the message in info modal

### 3. Support Ticket Popup
**Component:** Not shown in provided files (likely similar structure)
**Redux Actions:** `addSupportChatPopup`, `removeSupportChatPopup`

**Features:** (Assumed based on pattern)
- ✅ Send/receive support messages
- ✅ Ticket-specific chat
- ✅ Similar features to direct chat

**Duplicate Prevention:**
- Checks if popup with same `ticket.ticket_number` already exists

## Common Features Across All Popups

### 1. Draggable Windows
- Click and drag header to move popup
- Constrained to viewport boundaries
- Z-index based on order (1000 + index)

### 2. Message Actions
**Available on hover/click:**
- **Reply** - Reply to any message
- **Forward** - Forward to other users/groups
- **Edit** - Edit own messages (shows "edited" label)
- **Delete** - Delete own messages (shows "Message deleted")
- **Info** - View message details (timestamps, read receipts)

### 3. Input Features
- **Emoji Picker** - Click emoji button to open picker
- **File Attachment** - Click paperclip or drag & drop
- **Paste Images** - Paste from clipboard
- **Enter to Send** - Press Enter (Shift+Enter for new line)
- **Auto-resize** - Textarea grows with content

### 4. Message Display
- **Emoji-only messages** - Displayed larger (36px)
- **Forwarded indicator** - Shows "Forwarded" label
- **Edited indicator** - Shows "(edited)" label
- **Deleted messages** - Shows "Message deleted" in italics
- **Reply context** - Shows original message above reply
- **Timestamps** - Shows time in 12-hour format
- **Read status** - Single check (sent), double check (delivered), blue double check (read)

### 5. Scroll Behavior
- **Auto-scroll** - Scrolls to bottom on new messages
- **Scroll to bottom button** - Appears when scrolled up >80px
- **Jump to message** - Click reply context to scroll to original

## Opening Popups

### From Sidebar
**Direct Chat:**
```javascript
// In Sidebar.jsx
const handleUserClick = (user) => {
  const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
  if (total >= 4) {
    toast.error("Maximum of 4 chat windows can be open at a time.");
    return;
  }
  dispatch(addUserChatPopup(user));
};
```

**Group Chat:**
```javascript
// In Sidebar.jsx
const handleGroupClick = (group) => {
  const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
  if (total >= 4) {
    toast.error("Maximum of 4 chat windows can be open at a time.");
    return;
  }
  dispatch(addGroupChatPopup(group));
};
```

### From Full Chat Page (Minimize)
**Direct Chat:**
```javascript
// In ChatBody.jsx
const handleMinimize = () => {
  if (openChatPopups.some((p) => p.user.id === activeUser.id)) {
    toast.warning("Chat is already open as a popup.");
    return;
  }
  const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
  if (total >= 4) {
    toast.error("Maximum of 4 chat windows can be open at a time.");
    return;
  }
  dispatch(addUserChatPopup(activeUser));
  selectUser(null); // Close full page chat
};
```

**Group Chat:**
```javascript
// In GroupChatBody.jsx
const handleMinimize = () => {
  if (openGroupChatPopups.some((p) => p.group.id === activeGroup.id)) {
    toast.warning("Chat is already open as a popup.");
    return;
  }
  const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
  if (total >= 4) {
    toast.error("Maximum of 4 chat windows can be open at a time.");
    return;
  }
  dispatch(addGroupChatPopup(activeGroup));
  selectGroup(null); // Close full page chat
};
```

## Closing Popups

### Manual Close
```javascript
// Click X button in popup header
dispatch(removeUserChatPopup(userId));
dispatch(removeGroupChatPopup(groupId));
dispatch(removeSupportChatPopup(ticketNumber));
```

### Clear All
```javascript
import { clearAllPopups } from '@/redux/slices/chatPopupsSlice';

// Clear all popups at once
dispatch(clearAllPopups());
```

## Popup Positioning

### Initial Position
- All popups start at `{ x: 20, y: 20 }`
- Z-index: `1000 + index` (stacking order)

### Stacking
```javascript
// In ChatPopupsContainer.jsx
{openChatPopups.map((popup, index) => (
  <ChatPopup
    key={popup.key}
    user={popup.user}
    initialPosition={popup.position}
    index={index} // Used for z-index
    onClose={() => dispatch(removeUserChatPopup(popup.user.id))}
  />
))}
```

### Drag Constraints
- Minimum X: 0
- Maximum X: `window.innerWidth - 300`
- Minimum Y: 0
- Maximum Y: `window.innerHeight - 480`

## Synchronization

### Direct Chat Popup ↔ Full Page Chat
**Context:** `DirectChatContext.jsx`

1. **Shared State:** Both use the same `DirectChatContext`
2. **Message Sync:** Real-time via `ChatService` WebSocket
3. **Selection:** Popup calls `selectUser(userId)` on mount
4. **Unread Count:** Cleared when popup opens

**Flow:**
```
User clicks chat in sidebar
  ↓
Dispatch addUserChatPopup(user)
  ↓
ChatPopup mounts
  ↓
Calls direct.selectUser(user.id)
  ↓
DirectChatContext loads messages for that user
  ↓
ChatService subscribes to WebSocket events
  ↓
New messages appear in real-time
```

### Group Chat Popup ↔ Full Page Group Chat
**Context:** `GroupChatContext.jsx`

1. **Shared State:** Both use the same `GroupChatContext`
2. **Message Sync:** Real-time via `GroupChatService` WebSocket
3. **Selection:** Popup calls `selectGroup(groupId)` on mount
4. **Active Group:** Marked as active to prevent unread count increment

**Flow:**
```
User clicks group in sidebar
  ↓
Dispatch addGroupChatPopup(group)
  ↓
GroupChatPopup mounts
  ↓
Calls groupChatService.setGroupActive(group.id)
  ↓
Fetches messages via getGroupMessages(group.id)
  ↓
Subscribes to GroupChatService events
  ↓
New messages appear in real-time
```

### Popup ↔ Popup Synchronization
**Not synchronized** - Each popup is independent

- Opening same user/group in multiple popups is prevented
- Messages sync via shared context and WebSocket
- If user A sends message in popup, user B sees it in their popup (via WebSocket)

## Limitations & Rules

### Maximum Popups
- **Total:** 4 popups maximum (combined)
- **Per Type:** No limit per type, but total cannot exceed 4
- **Examples:**
  - ✅ 4 direct chats
  - ✅ 2 direct + 2 group chats
  - ✅ 1 direct + 2 group + 1 support
  - ❌ 5 popups of any combination

### Duplicate Prevention
- Cannot open same user twice
- Cannot open same group twice
- Cannot open same ticket twice
- Shows warning toast if attempted

### Popup vs Full Page
- Cannot have same chat open as both popup and full page
- Minimize button converts full page → popup
- No maximize button in popup (must close and open full page)

## File Attachments

### Supported Types
- **Images:** PNG, JPEG, JPG
- **Documents:** PDF, DOC, DOCX

### Size Limit
- **Maximum:** 5MB per file
- **Validation:** `AttechmentSizeLimit()` function

### Upload Methods
1. **Click paperclip button** - Opens file picker
2. **Drag & drop** - Drop file anywhere in popup
3. **Paste** - Paste image from clipboard (Ctrl+V)

### Preview
- Images: Thumbnail preview
- PDFs: PDF icon with filename
- Docs: Document icon with filename

## Message Types

### Direct Chat Messages
```javascript
{
  id: number,
  sender_id: number,
  recipient_id: number,
  content: string,
  reply_content: string, // For replies
  attachment: object | null,
  type: "message" | "message_reply" | "reply" | "forward_message",
  message_id: number, // Original message ID for replies
  parent_content: string, // Original message content
  timestamp: string,
  read: boolean,
  delivered: boolean,
  edited: boolean,
  is_edited: boolean,
  is_deleted: boolean,
  forwarded: boolean,
  forwarded_from_message_id: number
}
```

### Group Chat Messages
```javascript
{
  id: number,
  group_id: number,
  sender_id: number,
  sender: object,
  content: string,
  attachment: object | null,
  type: "message" | "group_message_reply" | "reply",
  original_message_id: number, // For replies
  parent_reply_id: number, // For nested replies
  parentMsg: object, // Full parent message
  created_at: string,
  updated_at: string,
  is_deleted: boolean,
  is_edited: boolean,
  is_forwarded: boolean,
  forwarded_from_message_id: number,
  forwarded_from_group_id: number,
  read_receipts: array
}
```

## Keyboard Shortcuts

### All Popups
- **Enter** - Send message
- **Shift+Enter** - New line
- **Ctrl+V** - Paste image (if available)
- **Esc** - Cancel reply/edit (not implemented)

## Styling

### Colors
- **Primary (Me):** `#6576ff` (blue)
- **Secondary (Others):** `#fff` (white with border)
- **Read Status:** `#a8d8ff` (light blue)
- **Mentions:** `#007bff` (blue)
- **Deleted:** `#aaa` (gray)

### Bubble Styles
- **Me:** Rounded corners (16px 16px 4px 16px), blue background
- **Others:** Rounded corners (16px 16px 16px 4px), white background with border
- **Emoji-only:** Minimal padding, 36px font size

## Performance Considerations

### Message Loading
- **Initial load:** Fetches all messages for user/group
- **Real-time:** WebSocket events add new messages
- **Scroll:** Auto-scrolls to bottom on new messages

### Memory Management
- Each popup maintains its own message state
- Closing popup cleans up subscriptions
- No message limit (could be issue with large chats)

## Future Enhancements

### Potential Improvements
1. **Maximize button** - Convert popup → full page
2. **Minimize to tray** - Collapse to small icon
3. **Notification badges** - Show unread count on popup
4. **Sound notifications** - Play sound on new message
5. **Message search** - Search within popup
6. **Message pagination** - Load older messages on scroll
7. **Popup persistence** - Remember open popups on refresh
8. **Custom positioning** - Remember last position
9. **Resize popups** - Allow width/height adjustment
10. **Keyboard navigation** - Arrow keys to switch popups

## Summary

| Feature | Direct Chat Popup | Group Chat Popup | Support Popup |
|---------|------------------|------------------|---------------|
| **Max Open** | 4 total (combined) | 4 total (combined) | 4 total (combined) |
| **Draggable** | ✅ | ✅ | ✅ |
| **Send Messages** | ✅ | ✅ | ✅ |
| **Reply** | ✅ | ✅ | ✅ |
| **Edit** | ✅ | ✅ | ✅ |
| **Delete** | ✅ | ✅ | ✅ |
| **Forward** | ✅ | ✅ | ❓ |
| **Attachments** | ✅ | ✅ | ✅ |
| **Emoji Picker** | ✅ | ✅ | ✅ |
| **Typing Indicator** | ✅ | ✅ | ✅ |
| **Read Receipts** | ✅ (1-to-1) | ✅ (all members) | ❓ |
| **@Mentions** | ❌ | ✅ | ❌ |
| **Nested Replies** | ❌ | ✅ | ❌ |
| **Member List** | ❌ | ✅ | ❌ |
| **Real-time Sync** | ✅ | ✅ | ✅ |
| **Message Info** | ✅ | ✅ | ❓ |
| **Dimensions** | 300x480 | 300x480 | 300x480 |
