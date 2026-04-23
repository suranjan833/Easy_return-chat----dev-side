import { createSlice } from '@reduxjs/toolkit';

const chatPopupsSlice = createSlice({
  name: 'chatPopups',
  initialState: {
    openChatPopups: [],
    openGroupChatPopups: [],
    openSupportChatPopups: [],
  },
  reducers: {
    addUserChatPopup: (state, action) => {
      const payload = action.payload;
      
      // Normalize: extract user object from conversation or use directly
      let user;
      if (payload.other_user) {
        // It's a conversation object, extract other_user
        user = payload.other_user;
      } else if (payload.id && payload.first_name) {
        // It's already a user object
        user = payload;
      } else {
        // Invalid payload
        console.error('[chatPopupsSlice] Invalid payload for addUserChatPopup:', payload);
        return;
      }
      
      // Prevent duplicate
      if (state.openChatPopups.some((popup) => popup.user.id === user.id)) return;
      
      // Combined limit across all three popup types
      const total = state.openChatPopups.length + state.openGroupChatPopups.length + state.openSupportChatPopups.length;
      if (total >= 4) return;
      
      state.openChatPopups.push({
        user,
        key: `chat-${user.id}-${Date.now()}`,
        position: { x: 0, y: 0 },
      });
    },

    removeUserChatPopup: (state, action) => {
      state.openChatPopups = state.openChatPopups.filter(
        (popup) => popup.user.id !== action.payload
      );
    },

    addGroupChatPopup: (state, action) => {
      const group = action.payload;
      if (state.openGroupChatPopups.some((popup) => popup.group.id === group.id)) return;
      // Combined limit across all three popup types
      const total = state.openChatPopups.length + state.openGroupChatPopups.length + state.openSupportChatPopups.length;
      if (total >= 4) return;
      state.openGroupChatPopups.push({
        group,
        key: `group-chat-${group.id}-${Date.now()}`,
        position: { x: 0, y: 0 },
      });
    },

    removeGroupChatPopup: (state, action) => {
      state.openGroupChatPopups = state.openGroupChatPopups.filter(
        (popup) => popup.group.id !== action.payload
      );
    },

    addSupportChatPopup: (state, action) => {
      const ticket = action.payload;
      // Prevent duplicate by ticket_number
      if (state.openSupportChatPopups.some((popup) => popup.ticket.ticket_number === ticket.ticket_number)) return;
      // Combined limit across all three popup types
      const total = state.openChatPopups.length + state.openGroupChatPopups.length + state.openSupportChatPopups.length;
      if (total >= 4) return;
      state.openSupportChatPopups.push({
        ticket,
        key: `support-${ticket.ticket_number}-${Date.now()}`,
      });
    },

    removeSupportChatPopup: (state, action) => {
      state.openSupportChatPopups = state.openSupportChatPopups.filter(
        (popup) => popup.ticket.ticket_number !== action.payload
      );
    },

    clearAllPopups: (state) => {
      state.openChatPopups = [];
      state.openGroupChatPopups = [];
      state.openSupportChatPopups = [];
    },
  },
});

export const {
  addUserChatPopup,
  removeUserChatPopup,
  addGroupChatPopup,
  removeGroupChatPopup,
  addSupportChatPopup,
  removeSupportChatPopup,
  clearAllPopups,
} = chatPopupsSlice.actions;

export default chatPopupsSlice.reducer;
