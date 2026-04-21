import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './counterSlice';
import chatPopupsReducer from './slices/chatPopupsSlice';
import chatConnectionReducer from "./slices/chatConnectionSlice";
import ticketsReducer from "./slices/ticketsSlice";
import recentChatsReducer from "./slices/recentChatsSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    chatPopups: chatPopupsReducer,
    chatConnection: chatConnectionReducer,
    tickets: ticketsReducer,
    recentChats: recentChatsReducer,
  },
});
