import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const ChatPopupsContext = createContext();

export const useChatPopups = () => {
  return useContext(ChatPopupsContext);
};

export const ChatPopupsProvider = ({ children }) => {
  const [openChatPopups, setOpenChatPopups] = useState(() => {
    try {
      const storedPopups = localStorage.getItem('openChatPopups');
      return storedPopups ? JSON.parse(storedPopups) : [];
    } catch (error) {
      console.error("Failed to parse openChatPopups from localStorage", error);
      return [];
    }
  });
  const [openGroupChatPopups, setOpenGroupChatPopups] = useState(() => {
    try {
      const storedPopups = localStorage.getItem('openGroupChatPopups');
      return storedPopups ? JSON.parse(storedPopups) : [];
    } catch (error) {
      console.error("Failed to parse openGroupChatPopups from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('openChatPopups', JSON.stringify(openChatPopups));
  }, [openChatPopups]);

  useEffect(() => {
    localStorage.setItem('openGroupChatPopups', JSON.stringify(openGroupChatPopups));
  }, [openGroupChatPopups]);

  const addChatPopup = (user) => {
    if (openChatPopups.some((popup) => popup.user.id === user.id)) {
      toast.warning('Chat already open for this user.');
      return;
    }
    if (openChatPopups.length + openGroupChatPopups.length >= 3) {
      toast.error('Maximum of 3 chat windows can be open at a time.');
      return;
    }
    setOpenChatPopups((prev) => [
      ...prev,
      { user, key: `chat-${user.id}-${Date.now()}` }
    ]);
  };

  const removeChatPopup = (userId) => {
    setOpenChatPopups((prev) => prev.filter((popup) => popup.user.id !== userId));
  };

  const addGroupChatPopup = (group) => {
    if (openGroupChatPopups.some((popup) => popup.group.id === group.id)) {
      toast.warning('Group chat already open for this group.');
      return;
    }
    if (openChatPopups.length + openGroupChatPopups.length >= 3) {
      toast.error('Maximum of 3 chat windows can be open at a time.');
      return;
    }
    setOpenGroupChatPopups((prev) => [
      ...prev,
      { group, key: `group-chat-${group.id}-${Date.now()}` }
    ]);
  };

  const removeGroupChatPopup = (groupId) => {
    setOpenGroupChatPopups((prev) => prev.filter((popup) => popup.group.id !== groupId));
  };

  const value = {
    openChatPopups,
    openGroupChatPopups,
    addChatPopup,
    removeChatPopup,
    addGroupChatPopup,
    removeGroupChatPopup,
  };

  return (
    <ChatPopupsContext.Provider value={value}>
      {children}
    </ChatPopupsContext.Provider>
  );
};
