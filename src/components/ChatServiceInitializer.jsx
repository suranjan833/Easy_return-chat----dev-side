import { useEffect } from "react";
import chatService from "../Services/ChatService";
import { DirectChatContext } from "../pages/app/chat/DirectChatContext";
import { useContext } from "react";

const ChatServiceInitializer = () => {
  const direct = useContext(DirectChatContext);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const parsedUserId = parseInt(userId, 10);
    const tokenText = String(token || "").trim();

    if (
      !tokenText ||
      tokenText === "null" ||
      tokenText === "undefined" ||
      userId === "unknown" ||
      isNaN(parsedUserId)
    ) {
      return;
    }

    chatService.subscribe("online_update", direct.handleOnlineUpdates);

    if (!chatService.isInitialized()) {
      chatService.initialize(parsedUserId, tokenText).catch((error) => {
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
  }, [direct.handleOnlineUpdates]);

  return null;
};

export default ChatServiceInitializer;
