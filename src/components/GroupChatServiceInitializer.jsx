import React, { useEffect } from 'react';
import groupChatService from '../Services/GroupChatService';
import { toast } from 'react-toastify';

const GroupChatServiceInitializer = () => {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');

    if (!token || !userId || userId === 'unknown' || isNaN(parseInt(userId, 10))) {
      return;
    }

    const userIdInt = parseInt(userId, 10);
    
    // Make toast available globally for GroupChatService
    if (typeof window !== 'undefined') {
      window.toast = toast;
    }

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          
        }
      });
    }
    
    // Subscribe to GroupChatService events to keep the service active
    const handleConnection = (data) => {
      //console.log('[GroupChatServiceInitializer] Connection status:', data.status);
    };

    const handleError = (data) => {
      console.error('[GroupChatServiceInitializer] GroupChatService error:', data.message);
    };

    const handleNewMessage = (data) => {
     // console.log('[GroupChatServiceInitializer] New group message received:', data);
      // You can add global notification logic here if needed
    };

    const handleInitialGroups = (data) => {
    };

    // Subscribe to events to keep the service active
    groupChatService.subscribe("connection", handleConnection);
    groupChatService.subscribe("error", handleError);
    groupChatService.subscribe("new_group_message", handleNewMessage);
    groupChatService.subscribe("initial_groups", handleInitialGroups);

    if (!groupChatService.isInitialized()) {

      groupChatService.initialize(userIdInt, token).catch(error => {
        //console.error('[GroupChatServiceInitializer] Failed to initialize GroupChatService:', error);
      });
    } else {
      //
    }

    return () => {
      groupChatService.unsubscribe("connection", handleConnection);
      groupChatService.unsubscribe("error", handleError);
      groupChatService.unsubscribe("new_group_message", handleNewMessage);
      groupChatService.unsubscribe("initial_groups", handleInitialGroups);
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default GroupChatServiceInitializer;
