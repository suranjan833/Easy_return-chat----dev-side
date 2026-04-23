import ChatPopup from "@/layout/sidebar/ChatPopup";
import GroupChatPopup from "@/layout/sidebar/GroupChatPopup";
import SupportTicketPopup from "@/layout/sidebar/SupportTicketPopup";
import {
  clearAllPopups,
  removeGroupChatPopup,
  removeUserChatPopup,
  removeSupportChatPopup,
} from "@/redux/slices/chatPopupsSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DirectChatProvider from "../chat/DirectChatContext";

const GAP = 50;

const ChatPopupsContainer = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } =
    useSelector((state) => state.chatPopups);

  const ME_ID = parseInt(localStorage.getItem("userId")) || null;
  const TOKEN = localStorage.getItem("accessToken");
  const BASE_URL = "https://chatsupport.fskindia.com";

  // Sync popup state to localStorage on every change — Requirement 10.2
  useEffect(() => {
    try {
      localStorage.setItem("chatPopups_direct", JSON.stringify(openChatPopups));
    } catch (e) {
      console.warn("Failed to persist chatPopups_direct to localStorage", e);
    }
  }, [openChatPopups]);

  useEffect(() => {
    try {
      localStorage.setItem("chatPopups_group", JSON.stringify(openGroupChatPopups));
    } catch (e) {
      console.warn("Failed to persist chatPopups_group to localStorage", e);
    }
  }, [openGroupChatPopups]);

  useEffect(() => {
    try {
      localStorage.setItem("chatPopups_support", JSON.stringify(openSupportChatPopups));
    } catch (e) {
      console.warn("Failed to persist chatPopups_support to localStorage", e);
    }
  }, [openSupportChatPopups]);

  // Render nothing when all arrays are empty — Requirement 6.3
  if (
    openChatPopups.length === 0 &&
    openGroupChatPopups.length === 0 &&
    openSupportChatPopups.length === 0
  ) {
    return null;
  }

  // Calculate initial positions for popups to avoid overlap
  const getInitialPosition = (index) => {
    const baseX = window.innerWidth - 320; // 300px width + 20px margin
    const baseY = 100;
    const offsetX = (index % 3) * 30; // Stagger horizontally
    const offsetY = Math.floor(index / 3) * 30; // Stagger vertically
    
    return {
      x: Math.max(20, baseX - offsetX),
      y: baseY + offsetY
    };
  };

  return (
    // Render popups as fixed positioned elements that can appear anywhere on screen
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: "none", // Allow clicks to pass through the container
        zIndex: 1000,
      }}
    >
      {/* Direct Chat Popups */}
      {openChatPopups.map((popup, index) => {
        console.log(`[ChatPopupsContainer] 🔍 Rendering direct chat popup ${index}:`, popup.user);
        
        // After Redux normalization, popup.user should always be valid
        // But keep validation as safety check
        if (!popup.user || !popup.user.id) {
          console.error('[ChatPopupsContainer] ❌ Invalid user object after Redux normalization:', popup);
          return null;
        }
        
        return (
          <div key={popup.key} style={{ pointerEvents: "all", width: 0, height: 0 }}>
            <DirectChatProvider>
              <ChatPopup
                user={popup.user}
                onClose={() => dispatch(removeUserChatPopup(popup.user.id))}
                initialPosition={getInitialPosition(index)}
                index={index}
              />
            </DirectChatProvider>
          </div>
        );
      })}

      {/* Group Chat Popups */}
      {openGroupChatPopups.map((popup, index) => (
        <div key={popup.key} style={{ pointerEvents: "all", width: 0, height: 0 }}>
          <GroupChatPopup
            group={popup.group}
            onClose={() => dispatch(removeGroupChatPopup(popup.group.id))}
            onMaximize={() => {
              dispatch(clearAllPopups());
              navigate("/app-group-chat", { state: { openGroupId: popup.group.id } });
            }}
            userId={ME_ID}
            token={TOKEN}
            baseUrl={BASE_URL}
            initialPosition={getInitialPosition(openChatPopups.length + index)}
            index={openChatPopups.length + index}
          />
        </div>
      ))}
      {/* Support Ticket Popups */}
      {openSupportChatPopups.map((popup, index) => (
        <div key={popup.key} style={{ pointerEvents: "all", width: 0, height: 0 }}>
          <SupportTicketPopup
            ticket={popup.ticket}
            onClose={() => dispatch(removeSupportChatPopup(popup.ticket.ticket_number))}
            initialPosition={getInitialPosition(openChatPopups.length + openGroupChatPopups.length + index)}
            index={openChatPopups.length + openGroupChatPopups.length + index}
          />
        </div>
      ))}
    </div>
  );
};

export default ChatPopupsContainer;
