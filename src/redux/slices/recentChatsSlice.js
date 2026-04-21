import { createSlice } from '@reduxjs/toolkit';

const recentChatsSlice = createSlice({
  name: 'recentChats',
  initialState: {
    chats: [], // Array of { recipient_id, last_message, last_message_timestamp, unread_count }
  },
  reducers: {
    // Initialize or replace entire recent chats list
    setRecentChats: (state, action) => {
      state.chats = action.payload;
    },

    // Update a specific chat (or add if not exists)
    updateRecentChat: (state, action) => {
      const { recipient_id, last_message, last_message_timestamp, sender_id } = action.payload;
      const index = state.chats.findIndex((c) => c.recipient_id === recipient_id);
      
      if (index >= 0) {
        // Update existing chat
        state.chats[index] = {
          ...state.chats[index],
          last_message,
          last_message_timestamp,
          sender_id,
        };
      } else {
        // Add new chat
        state.chats.push({
          recipient_id,
          last_message,
          last_message_timestamp,
          sender_id,
          unread_count: 0,
        });
      }

      // Sort by timestamp (newest first)
      state.chats.sort((a, b) => 
        new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp)
      );
    },

    // Increment unread count for a specific chat
    incrementUnreadCount: (state, action) => {
      const recipient_id = action.payload;
      const chat = state.chats.find((c) => Number(c.recipient_id) === Number(recipient_id));
      if (chat) {
        chat.unread_count = (chat.unread_count || 0) + 1;
      }
    },

    // Clear unread count for a specific chat
    clearUnreadCount: (state, action) => {
      const recipient_id = action.payload;
      const chat = state.chats.find((c) => Number(c.recipient_id) === Number(recipient_id));
      if (chat) {
        chat.unread_count = 0;
      }
    },

    // Add or update a chat with unread count
    upsertRecentChat: (state, action) => {
      const { recipient_id, last_message, last_message_timestamp, sender_id, unread_count } = action.payload;
      const index = state.chats.findIndex((c) => Number(c.recipient_id) === Number(recipient_id));
      
      if (index >= 0) {
        // Update existing
        state.chats[index] = {
          ...state.chats[index],
          last_message,
          last_message_timestamp,
          sender_id,
          unread_count: unread_count !== undefined ? unread_count : state.chats[index].unread_count,
        };
      } else {
        // Add new
        state.chats.push({
          recipient_id,
          last_message,
          last_message_timestamp,
          sender_id,
          unread_count: unread_count || 0,
        });
      }

      // Sort by timestamp (newest first)
      state.chats.sort((a, b) => 
        new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp)
      );
    },
  },
});

export const {
  setRecentChats,
  updateRecentChat,
  incrementUnreadCount,
  clearUnreadCount,
  upsertRecentChat,
} = recentChatsSlice.actions;

export default recentChatsSlice.reducer;
