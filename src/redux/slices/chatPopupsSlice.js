import { createSlice } from '@reduxjs/toolkit';

const chatPopupsSlice = createSlice({
  name: 'chatPopups',
  initialState: {
    openChatPopups: [],
    openGroupChatPopups: [],
  },
  reducers: {
    addUserChatPopup: (state, action) => {
      const user = action.payload;
      // Prevent duplicate
      if (state.openChatPopups.some((popup) => popup.user.id === user.id)) return;
      // Limit to 3
      if (state.openChatPopups.length >= 3) return;
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
      if (state.openGroupChatPopups.length >= 3) return;
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

    clearAllPopups: (state) => {
      state.openChatPopups = [];
      state.openGroupChatPopups = [];
    },
  },
});

export const {
  addUserChatPopup,
  removeUserChatPopup,
  addGroupChatPopup,
  removeGroupChatPopup,
  clearAllPopups,
} = chatPopupsSlice.actions;

export default chatPopupsSlice.reducer;
