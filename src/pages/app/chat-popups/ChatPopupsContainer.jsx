import ChatPopup from "@/layout/sidebar/ChatPopup";
import GroupChatPopup from "@/layout/sidebar/GroupChatPopup";
import {
  removeGroupChatPopup,
  removeUserChatPopup,
  clearAllPopups,
} from "@/redux/slices/chatPopupsSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DirectChatProvider from "../chat/DirectChatContext";

const GAP = 12;

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

  const allPopups = [
    ...openChatPopups.map((popup, i) => ({ type: "direct", popup, index: i })),
    ...openGroupChatPopups.map((popup, i) => ({
      type: "group",
      popup,
      index: openChatPopups.length + i,
    })),
  ];

  return (
    // Rendered inside the message body area (flex: 1 column).
    // display:flex row lays popups side by side with equal spacing.
    // position:absolute bottom:0 anchors to the bottom of the message area.
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: GAP,
        padding: `0 ${GAP}px ${GAP}px`,
        pointerEvents: "none", // let clicks pass through the gap areas
        zIndex: 100,
      }}
    >
      {allPopups.map(({ type, popup, index }) => {
        const commonStyle = {
          flex: 1,
          minWidth: 0,
          pointerEvents: "all",
        };

        if (type === "direct") {
          return (
            <div key={popup.key} style={commonStyle}>
              <DirectChatProvider>
                <ChatPopup
                  user={popup.user}
                  onClose={() => dispatch(removeUserChatPopup(popup.user.id))}
                  onMaximize={() => {
                    dispatch(clearAllPopups());
                    navigate("/messages", { state: { openUserId: popup.user.id } });
                  }}
                  meId={ME_ID}
                  token={TOKEN}
                  baseUrl={BASE_URL}
                  initialPosition={{ x: 0, y: 0 }}
                  index={index}
                  isFixed={true}
                />
              </DirectChatProvider>
            </div>
          );
        }

        return (
          <div key={popup.key} style={commonStyle}>
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
              initialPosition={{ x: 0, y: 0 }}
              index={index}
              isFixed={true}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ChatPopupsContainer;
