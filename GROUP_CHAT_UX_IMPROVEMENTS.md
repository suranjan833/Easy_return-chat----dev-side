# Group Chat UX Improvements

## Changes Made

### 1. Scroll-to-Bottom Button
**File:** `Easy-return/src/pages/app/group-chat/GroupChatBody.jsx`

Added a floating scroll-to-bottom button that appears when the user scrolls up, matching the behavior in direct chat.

**Implementation:**
- Added `showScrollDown` state to track scroll position
- Added `scrollToBottom()` helper function for smooth scrolling
- Added `handleScroll()` event handler to show/hide button based on scroll position
- Button appears when user scrolls more than 150px from bottom
- Button styled with primary color (#6576ff) to match app theme

**Features:**
- Smooth scroll animation
- Auto-hides when at bottom
- Positioned at bottom-right (80px from bottom, 20px from right)
- Circular button with down arrow icon
- Z-index 100 to stay above messages

### 2. Group Unread Count Badges
**Files:** 
- `Easy-return/src/pages/app/group-chat/GroupChatContext.jsx`
- `Easy-return/src/pages/app/group-chat/GroupChatAside.jsx`

Added unread message count badges to the group list sidebar, showing how many unread messages each group has.

**Implementation:**

#### GroupChatContext.jsx
- Added `groupUnreadCounts` state: `{ [groupId]: number }`
- Added global `useEffect` to subscribe to `group_metadata_updated` event
- Seeds initial counts from `groupChatService.getGroupMetadata()` on mount
- Updates counts in real-time as messages arrive
- Exposed `groupUnreadCounts` in context value

#### GroupChatAside.jsx
- Consumed `groupUnreadCounts` from context
- Rendered badge next to group name when `unread > 0`
- Badge shows "99+" for counts over 99
- Styled with Bootstrap primary badge (blue)
- Positioned in the chat-context area

**Features:**
- Real-time updates as messages arrive
- Automatically clears when group is opened (via `setGroupActive`)
- Shows "99+" for large counts
- Only visible when count > 0
- Matches direct chat badge styling

## How It Works

### Scroll Button Flow
1. User scrolls up in group chat
2. `handleScroll` detects scroll position
3. If more than 150px from bottom → show button
4. User clicks button → smooth scroll to bottom
5. Button auto-hides when reaching bottom

### Unread Count Flow
1. New message arrives → `GroupChatService` increments `groupMetadata[groupId].unreadCount`
2. Service fires `group_metadata_updated` event
3. `GroupChatContext` updates `groupUnreadCounts` state
4. `GroupChatAside` re-renders with new badge count
5. User opens group → `setGroupActive` called → count resets to 0
6. Badge disappears

## Testing Checklist

### Scroll Button
- [ ] Button appears when scrolling up more than 150px
- [ ] Button disappears when at bottom
- [ ] Clicking button smoothly scrolls to bottom
- [ ] Button stays visible while scrolling
- [ ] Button positioned correctly (not overlapping input)

### Unread Badges
- [ ] Badge shows correct count for each group
- [ ] Badge updates in real-time when new message arrives
- [ ] Badge clears when opening the group
- [ ] Badge shows "99+" for counts over 99
- [ ] Badge only visible when count > 0
- [ ] Badge positioned correctly in group list item

### Edge Cases
- [ ] Multiple groups with unread messages show correct counts
- [ ] Switching between groups updates counts correctly
- [ ] Refreshing page preserves unread counts (via GroupChatService metadata)
- [ ] Scroll button works with typing indicator visible
- [ ] Unread count doesn't increment for own messages

## Visual Design

### Scroll Button
```
Position: Fixed at bottom-right
Size: 36px × 36px circle
Color: #6576ff (primary blue)
Icon: bi-arrow-down (16px)
Shadow: 0 2px 8px rgba(0,0,0,0.25)
```

### Unread Badge
```
Style: Bootstrap badge rounded-pill bg-primary
Font size: 0.7rem
Min width: 20px
Text align: center
Max display: 99+
```

## Future Enhancements
1. Add animation when badge count changes
2. Add sound notification for new group messages
3. Show preview of last message in group list
4. Add "mark all as read" button
5. Persist scroll position when switching groups
