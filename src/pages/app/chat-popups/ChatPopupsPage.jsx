import ContentAlt from "@/layout/content/ContentAlt";
import Head from "@/layout/head/Head";
import ChatPopup from "@/layout/sidebar/ChatPopup";
import GroupChatPopup from "@/layout/sidebar/GroupChatPopup";
import {
  removeGroupChatPopup,
  removeUserChatPopup
} from "@/redux/slices/chatPopupsSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import DirectChatProvider from "../chat/DirectChatContext";
import "./ChatPopupsPage.css";

const ChatPopupsPage = () => {
  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups } = useSelector(
    (state) => state.chatPopups
  );

  const ME_ID = parseInt(localStorage.getItem("userId")) || null;
  const TOKEN = localStorage.getItem("accessToken");
  const BASE_URL = "https://chatsupport.fskindia.com";
  const WS_BASE_URL = "wss://chatsupport.fskindia.com";

  // Example preload (optional) — only if you want initial popups to open automatically
  useEffect(() => {
    // Example of initial user popup (you can remove)
    // dispatch(addUserChatPopup({ id: 1, name: "Demo User" }));
  }, [dispatch]);

  // Close popup actions
  const closeChatPopup = (userId) => {
    dispatch(removeUserChatPopup(userId));
  };

  const closeGroupChatPopup = (groupId) => {
    dispatch(removeGroupChatPopup(groupId));
  };

  const getPopupLayout = (index, totalPopups) => {
    const popupWidth = 300;
    const popupHeight = 400;
    const margin = 20;
    const maxPopups = 4;

    if (index >= maxPopups) return null;
    const availableWidth = window.innerWidth - margin * 2;
    const count = Math.min(totalPopups, maxPopups);
    const totalWidth = popupWidth * count + margin * (count - 1);
    const startX = (availableWidth - totalWidth) / 2;
    return {
      x: startX + index * (popupWidth + margin),
      y: margin,
      width: popupWidth,
      height: popupHeight,
    };
  };

  const totalPopups = openChatPopups.length + openGroupChatPopups.length;

  return (
    <>
      <Head title="Chat Popups" />
      <ContentAlt>
        <div className="chat-popups-page">
          <div className="chat-popups-container">

            {/* 🟦 User Chat Popups */}
            {openChatPopups.map((popup, index) => {
              const layout = getPopupLayout(index, totalPopups);
              if (!layout) return null;
              return (
                <div
                  key={popup.key}
                  style={{
                    position: "absolute",
                    left: layout.x,
                    top: layout.y,
                    width: layout.width,
                    height: layout.height,
                    zIndex: 1000 + index,
                  }}
                >
                  <DirectChatProvider>
                    <ChatPopup
                      user={popup.user}
                      onClose={() => closeChatPopup(popup.user.id)}
                      meId={ME_ID}
                      token={TOKEN}
                      baseUrl={BASE_URL}
                      wsBaseUrl={WS_BASE_URL}
                      initialPosition={{ x: 0, y: 0 }}
                      index={index}
                    />
                  </DirectChatProvider>
                </div>
              );
            })}

            {/* 🟨 Group Chat Popups */}
            {openGroupChatPopups.map((popup, index) => {
              const adjustedIndex = openChatPopups.length + index;
              const layout = getPopupLayout(adjustedIndex, totalPopups);
              if (!layout) return null;
              return (
                <div
                  key={popup.key}
                  style={{
                    position: "absolute",
                    left: layout.x,
                    top: layout.y,
                    width: layout.width,
                    height: layout.height,
                    zIndex: 1000 + adjustedIndex,
                  }}
                >
                  <GroupChatPopup
                    key={popup.key}
                    group={popup.group}
                    onClose={() => closeGroupChatPopup(popup.group.id)}
                    userId={ME_ID}
                    token={TOKEN}
                    baseUrl={BASE_URL}
                    wsBaseUrl={WS_BASE_URL}
                    initialPosition={{ x: 0, y: 0 }}
                    index={adjustedIndex}
                  />
                </div>
              );
            })}

            {/* 🟤 Empty State */}
            {totalPopups === 0 && (
              <div className="text-center py-5">
                <div className="mb-3">
                  <i className="bi bi-chat-dots" style={{ fontSize: "4rem", color: "#6c757d" }}></i>
                </div>
                <h4 className="text-muted">No Active Chats</h4>
                <p className="text-muted">Open chats from the sidebar to see them here</p>
              </div>
            )}

            {/* ⚠️ Limit Warning */}
            {totalPopups > 3 && (
              <div className="alert alert-warning mt-3" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Maximum of 3 chat popups can be displayed at once. Close some chats to see others.
              </div>
            )}
          </div>
        </div>
      </ContentAlt>
    </>
  );
};

export default ChatPopupsPage;
