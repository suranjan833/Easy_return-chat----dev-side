import { createSlice } from "@reduxjs/toolkit";

// Helper to remove duplicates and sort tickets by latest created_at
function dedupeAndSortTickets(tickets) {
  const map = new Map();
  (tickets || []).forEach((t) => {
    if (!t?.ticket_number) return;
    const existing = map.get(t.ticket_number) || {};
    map.set(t.ticket_number, { ...existing, ...t });
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
}

const initialState = {
  allTickets: [], // This will replace the `tickets` array from TicketsContext
  messages: {}, // { [ticket_number]: [messageList] }
  activeTicketNumber: null, // Renamed from activeTicket to be more specific
  selectedTicket: null, // The currently selected ticket object
  loadingTickets: true,
  loadingMessages: false,
  isHumanHandoff: false,
  websocketUrl: null,
  token: null,
  typingStatus: null,
  editingMessageId: null,
  replyToMessageId: null,
  botRepliesEnabled: null,
  departmentName: "N/A",
  agents: [],
  submitting: false,
};

const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    // Actions for allTickets (from TicketsContext)
    replaceTickets: (state, action) => {
      state.allTickets = dedupeAndSortTickets(action.payload || []);
      localStorage.setItem("tickets", JSON.stringify(state.allTickets));
    },
    upsertTickets: (state, action) => {
      const merged = dedupeAndSortTickets([
        ...(state.allTickets || []),
        ...(action.payload || []),
      ]);
      state.allTickets = merged;
      localStorage.setItem("tickets", JSON.stringify(state.allTickets));
    },
    updateTicketPartial: (state, action) => {
      const { ticket_number, partial } = action.payload || {};
      if (!ticket_number) return;
      state.allTickets = (state.allTickets || []).map((t) =>
        t.ticket_number === ticket_number ? { ...t, ...partial } : t
      );
      if (state.selectedTicket?.ticket_number === ticket_number) {
        state.selectedTicket = { ...state.selectedTicket, ...partial };
      }
      localStorage.setItem("tickets", JSON.stringify(state.allTickets));
    },
    deleteTicket: (state, action) => {
      state.allTickets = (state.allTickets || []).filter(
        (t) => t.ticket_number !== action.payload
      );
      localStorage.setItem("tickets", JSON.stringify(state.allTickets));
    },
    loadPersistedTickets: (state) => {
      const saved = localStorage.getItem("tickets");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          state.allTickets = dedupeAndSortTickets(parsed);
        } catch (err) {
          console.error("[ticketsSlice] Failed to load saved tickets:", err);
        }
      }
    },

    // Existing actions (modified)
    setMessages: (state, action) => {
      const { ticket_number, messages } = action.payload;
      state.messages[ticket_number] = messages;
    },
    addMessage: (state, action) => {
      const { ticket_number, message } = action.payload;
      if (!state.messages[ticket_number]) state.messages[ticket_number] = [];
      state.messages[ticket_number].push(message);
    },
    updateMessage: (state, action) => {
      const { ticket_number, messageId, partial } = action.payload;
      if (state.messages[ticket_number]) {
        state.messages[ticket_number] = state.messages[ticket_number].map(
          (msg) => (msg.id === messageId ? { ...msg, ...partial } : msg)
        );
      }
    },
    // New actions for SupportChatWidget state
    setActiveTicketNumber: (state, action) => {
      state.activeTicketNumber = action.payload;
    },
    setSelectedTicket: (state, action) => {
      state.selectedTicket = action.payload;
    },
    setLoadingTickets: (state, action) => {
      state.loadingTickets = action.payload;
    },
    setLoadingMessages: (state, action) => {
      state.loadingMessages = action.payload;
    },
    setIsHumanHandoff: (state, action) => {
      state.isHumanHandoff = action.payload;
    },
    setWebsocketUrl: (state, action) => {
      state.websocketUrl = action.payload;
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    setTypingStatus: (state, action) => {
      state.typingStatus = action.payload;
    },
    setEditingMessageId: (state, action) => {
      state.editingMessageId = action.payload;
    },
    setReplyToMessageId: (state, action) => {
      state.replyToMessageId = action.payload;
    },
    setBotRepliesEnabled: (state, action) => {
      state.botRepliesEnabled = action.payload;
    },
    setDepartmentName: (state, action) => {
      state.departmentName = action.payload;
    },
    setAgents: (state, action) => {
      state.agents = action.payload;
    },
    setSubmitting: (state, action) => {
      state.submitting = action.payload;
    },
    // `hasJoined` will be derived from chatConnectionSlice's joinedTickets
    // `activeJoinedTicket` will be managed by chatConnectionSlice
  },
});

export const {
  setMessages,
  addMessage,
  updateMessage,
  setActiveTicketNumber,
  setSelectedTicket,
  setLoadingTickets,
  setLoadingMessages,
  setIsHumanHandoff,
  setWebsocketUrl,
  setToken,
  setTypingStatus,
  setEditingMessageId,
  setReplyToMessageId,
  setBotRepliesEnabled,
  setDepartmentName,
  setAgents,
  setSubmitting,
  replaceTickets,
  upsertTickets,
  updateTicketPartial,
  deleteTicket,
  loadPersistedTickets,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;
