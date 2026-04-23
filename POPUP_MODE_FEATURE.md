# Popup Mode Feature - Auto-Open as Popup

## Overview

Implemented a "popup mode" feature where if at least one popup (direct chat, group chat, or support ticket) is already open, clicking any conversation will automatically open as a popup instead of navigating to the full-page view.

## Behavior

### Before
- Clicking a conversation always opened in full-page view
- User had to manually minimize to popup
- Inconsistent experience when switching between conversations

### After
- **No popups open (total = 0)**: Opens in full-page view (inline)
- **At least 1 popup open (total > 0)**: Opens as popup
- **Maximum 4 popups**: Shows error if trying to open more
- **Duplicate prevention**: Shows warning if conversation already open

## Implementation

### Logic Flow

```javascript
const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;

if (total > 0) {
  // Popup mode: Open as popup
  if (alreadyOpen) {
    toast.warning("Already open");
    return;
  }
  if (total >= 4) {
    toast.error("Maximum of 4 chat windows");
    return;
  }
  dispatch(addPopup(item));
} else {
  // Inline mode: Open in full page
  selectItem(item.id);
}
```

### Files Modified

#### 1. Group Chat Aside (`GroupChatAside.jsx`)
**Location:** `Easy-return/src/pages/app/group-chat/GroupChatAside.jsx`

**Changes:**
- Added Redux imports: `useDispatch`, `useSelector`, `addGroupChatPopup`
- Added toast import
- Added popup state tracking: `openChatPopups`, `openGroupChatPopups`, `openSupportChatPopups`
- Created `handleGroupClick` function with popup logic
- Updated click handler to use new function

**Before:**
```javascript
onClick={(ev) => {
  ev.preventDefault();
  selectGroup(g.id);
}}
```

**After:**
```javascript
const handleGroupClick = (ev, group) => {
  ev.preventDefault();
  
  if (total > 0) {
    // Open as popup
    if (openGroupChatPopups.some((p) => p.group.id === group.id)) {
      toast.warning("Group chat already open.");
      return;
    }
    if (total >= 4) {
      toast.error("Maximum of 4 chat windows can be open at a time.");
      return;
    }
    dispatch(addGroupChatPopup(group));
  } else {
    // Open inline
    selectGroup(group.id);
  }
};

onClick={(ev) => handleGroupClick(ev, g)}
```

#### 2. Agent Dashboard (`AgentDashboard.jsx`)
**Location:** `Easy-return/src/pages/Support/AgentDashboard.jsx`

**Changes:**
- Added Redux imports: `useDispatch`, `useSelector`, `addSupportChatPopup`
- Added popup state tracking
- Updated `handleSelectTicket` function with popup logic

**Before:**
```javascript
const handleSelectTicket = (ticket) => {
  // ... validation ...
  setSelectedTicket(ticket);
  setTicketNumber(ticket.ticket_number);
  // ... rest ...
};
```

**After:**
```javascript
const handleSelectTicket = (ticket) => {
  // ... validation ...
  
  if (total > 0) {
    // Open as popup
    if (openSupportChatPopups.some((p) => p.ticket.ticket_number === ticket.ticket_number)) {
      toast.warning("Support ticket already open.");
      return;
    }
    if (total >= 4) {
      toast.error("Maximum of 4 chat windows can be open at a time.");
      return;
    }
    dispatch(addSupportChatPopup({
      ticket,
      _messages: messages,
      _websocketUrl: websocketUrl,
      _token: token,
    }));
    setSelectedTicket(null);
    setTicketNumber(null);
    return;
  }
  
  // Open inline
  setSelectedTicket(ticket);
  setTicketNumber(ticket.ticket_number);
  // ... rest ...
};
```

### Files Already Had Popup Logic

These files already had the popup mode logic implemented:

1. **`ChatAsideBody.jsx`** - Direct chat conversations
2. **`GroupAsideBody.jsx`** - Group chat conversations (in Chat page)
3. **`Sidebar.jsx`** - Sidebar navigation for both direct and group chats

## User Experience

### Scenario 1: Starting Fresh
1. User opens app
2. No popups open (total = 0)
3. Click any conversation → Opens in full page
4. Click another conversation → Opens in full page (replaces previous)

### Scenario 2: Popup Mode Activated
1. User has 1 popup open (total = 1)
2. Click any conversation → Opens as popup
3. Click another conversation → Opens as popup
4. Now has 3 popups open
5. Click another conversation → Opens as popup
6. Now has 4 popups (maximum)
7. Click another conversation → Shows error "Maximum of 4 chat windows"

### Scenario 3: Switching Between Modes
1. User has 2 popups open
2. Close both popups (total = 0)
3. Click conversation → Opens in full page (back to inline mode)
4. Minimize to popup (total = 1)
5. Click another conversation → Opens as popup (popup mode activated)

### Scenario 4: Duplicate Prevention
1. User has popup for "User A" open
2. Click "User A" again → Shows warning "Chat already open for this user"
3. Same for groups and support tickets

## Benefits

1. **Consistent Experience**: Once in popup mode, stays in popup mode
2. **Multi-tasking**: Easy to work with multiple conversations simultaneously
3. **No Manual Minimizing**: Automatically opens as popup when appropriate
4. **Smart Limits**: Prevents opening too many popups (max 4)
5. **Duplicate Prevention**: Prevents confusion from multiple instances

## Testing Checklist

### Direct Chat
- [ ] No popups → Click user → Opens inline
- [ ] 1 popup open → Click user → Opens as popup
- [ ] 4 popups open → Click user → Shows error
- [ ] User already open → Click user → Shows warning

### Group Chat
- [ ] No popups → Click group → Opens inline
- [ ] 1 popup open → Click group → Opens as popup
- [ ] 4 popups open → Click group → Shows error
- [ ] Group already open → Click group → Shows warning
- [ ] Works from Chat page (GroupAsideBody)
- [ ] Works from Group Chat page (GroupChatAside)
- [ ] Works from Sidebar

### Support Tickets
- [ ] No popups → Click ticket → Opens inline
- [ ] 1 popup open → Click ticket → Opens as popup
- [ ] 4 popups open → Click ticket → Shows error
- [ ] Ticket already open → Click ticket → Shows warning

### Mixed Scenarios
- [ ] 2 direct + 1 group → Click ticket → Opens as popup (total = 4)
- [ ] 1 direct + 1 group + 1 support → Click any → Opens as popup
- [ ] Close all popups → Click any → Opens inline
- [ ] Open popup → Close → Open another → Opens inline (total = 0)

## Edge Cases Handled

1. **Maximum limit**: Combined total across all popup types (4 max)
2. **Duplicate prevention**: Checks specific popup type for duplicates
3. **State cleanup**: Clears inline view when opening as popup
4. **Validation**: Checks for valid user/group/ticket data before opening

## Future Enhancements

1. **Remember preference**: Save user's preference for popup vs inline mode
2. **Custom limit**: Allow users to set their own maximum popup limit
3. **Popup persistence**: Remember open popups across page refreshes
4. **Popup positioning**: Smart positioning to avoid overlap
5. **Keyboard shortcuts**: Quick switching between popups

