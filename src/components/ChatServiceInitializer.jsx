import React, { useEffect } from "react";
import chatService from "../Services/ChatService";
import { DirectChatContext } from "../pages/app/chat/DirectChatContext";
import { useContext } from "react";

const ChatServiceInitializer = () => {
  const direct = useContext(DirectChatContext);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");

    if (
      !token ||
      !userId ||
      userId === "unknown" ||
      isNaN(parseInt(userId, 10))
    ) {
      return;
    }

    const userIdInt = parseInt(userId, 10);

    chatService.subscribe("online_update", direct.handleOnlineUpdates);

    if (!chatService.isInitialized()) {
      chatService.initialize(userIdInt, token).catch((error) => {
        console.error(
          "[ChatServiceInitializer] Failed to initialize ChatService:",
          error,
        );
      });
    } else {
      //
    }

    return () => {
      chatService.unsubscribe("online_update", direct.handleOnlineUpdates);
    };
  }, []);

  return null;
};

export default ChatServiceInitializer;
