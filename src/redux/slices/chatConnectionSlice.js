import { createSlice } from "@reduxjs/toolkit";

const savedJoinedTickets = JSON.parse(localStorage.getItem("joinedTickets")) || [];
const savedActiveJoinedTicket = localStorage.getItem("activeJoinedTicket") || null;

const chatConnectionSlice = createSlice({
  name: "chatConnection",
  initialState: {
    joinedTickets: savedJoinedTickets, // array of { ticketNumber, joined: true }
    activeJoinedTicket: savedActiveJoinedTicket, // The single active joined ticket
  },
  reducers: {
    joinChat: (state, action) => {
      const { ticketNumber } = action.payload;
      const exists = state.joinedTickets.find(
        (t) => t.ticketNumber === ticketNumber
      );
      if (!exists) {
        state.joinedTickets.push({ ticketNumber, joined: true });
        localStorage.setItem("joinedTickets", JSON.stringify(state.joinedTickets));
      }
      state.activeJoinedTicket = ticketNumber;
      localStorage.setItem("activeJoinedTicket", ticketNumber);
    },
    leaveChat: (state, action) => {
      const ticketNumber = action.payload;
      state.joinedTickets = state.joinedTickets.filter(
        (t) => t.ticketNumber !== ticketNumber
      );
      localStorage.setItem("joinedTickets", JSON.stringify(state.joinedTickets));
      if (state.activeJoinedTicket === ticketNumber) {
        state.activeJoinedTicket = null;
        localStorage.removeItem("activeJoinedTicket");
      }
    },
    leaveAllChats: (state) => {
      state.joinedTickets = [];
      localStorage.removeItem("joinedTickets");
      state.activeJoinedTicket = null;
      localStorage.removeItem("activeJoinedTicket");
    },
    setActiveJoinedTicket: (state, action) => {
      state.activeJoinedTicket = action.payload;
      if (action.payload) {
        localStorage.setItem("activeJoinedTicket", action.payload);
      } else {
        localStorage.removeItem("activeJoinedTicket");
      }
    },
  },
});

export const { joinChat, leaveChat, leaveAllChats, setActiveJoinedTicket } = chatConnectionSlice.actions;
export default chatConnectionSlice.reducer;
