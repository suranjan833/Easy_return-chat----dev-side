import React, { createContext, useContext, useReducer, useEffect } from 'react';

const ChatContext = createContext();

const initialState = {
  panels: [],
};

const chatReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'ADD_PANEL':
      return {
        ...state,
        panels: [...state.panels, action.payload],
      };
    case 'REMOVE_PANEL':
      return {
        ...state,
        panels: state.panels.filter(panel => panel.pairId !== action.payload),
      };
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  useEffect(() => {
  }, [state]);
const addChatPanel = async (pairId, pairName, user1Id, user2Id) => {
  if (state.panels.some(panel => panel.pairId === pairId)) {

    return;
  }


  try {
    const response = await fetch(`https://chatsupport.fskindia.com/messaging/messages/${user1Id}/${user2Id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });
    const messages = await response.json();

    dispatch({
      type: 'ADD_PANEL',
      payload: { pairId, pairName, user1Id, user2Id, messages },
    });
  } catch (error) {
    console.error('[ChatContext] Error fetching messages:', error);
  }
};

  const removeChatPanel = (pairId) => {
    dispatch({ type: 'REMOVE_PANEL', payload: pairId });
  };

  return (
    <ChatContext.Provider value={{ panels: state.panels, addChatPanel, removeChatPanel }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};