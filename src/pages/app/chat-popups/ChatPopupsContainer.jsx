import ChatPopup from "@/layout/sidebar/ChatPopup";
import GroupChatPopup from "@/layout/sidebar/GroupChatPopup";
import {
  removeGroupChatPopup,
  removeUserChatPopup,
} from "@/redux/slices/chatPopupsSlice";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DirectChatProvider from "../chat/DirectChatContext";

const POPUP_WIDTH = 320;
const GAP = 12; // gap between popups and from right edge

// Each popup takes exactly 1/3 of available width minus gaps
// 3 popups + 4 gaps (left edge, between each, right edge) = calc((100% - 4*GAP) / 3)
const POPUP_WIDTH_CSS = `calc((100% - ${GAP * 4}px) / 3)`;

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

  return (
    // Sticky anchor at the bottom of the content area — zero height so it doesn't affect layout.
    // overflow:visible so popups (which extend upward) are not clipped.
    <div style={{ position: "sticky", bottom: 0, height: 0, zIndex: 1050, overflow: "visible" }}>
      {/* Direct chat popups — Requirements 6.1, 6.4, 8.1, 8.3, 3.2, 3.4 */}
      {openChatPopups.map((popup, i) => {
        const overallIndex = i;
        // right offset: each slot is 1/3 of width, stacked from right
        const rightOffset = `calc(${overallIndex} * (${POPUP_WIDTH_CSS} + ${GAP}px) + ${GAP}px)`;

        return (
          <div
            key={popup.key}
            style={{
              position: "absolute",
              bottom: GAP,
              right: rightOffset,
              zIndex: overallIndex,
              width: POPUP_WIDTH_CSS,
            }}
          >
            <DirectChatProvider>
              <ChatPopup
                user={popup.user}
                onClose={() => dispatch(removeUserChatPopup(popup.user.id))}
                onMaximize={() => {
                  dispatch(removeUserChatPopup(popup.user.id));
                  navigate("/messages", {
                    state: { openUserId: popup.user.id },
                  });
                }}
                meId={ME_ID}
                token={TOKEN}
                baseUrl={BASE_URL}
                initialPosition={{ x: 0, y: 0 }}
                index={overallIndex}
                isFixed={true}
              />
            </DirectChatProvider>
          </div>
        );
      })}

      {/* Group chat popups — Requirements 6.1, 6.4, 8.1, 8.4, 3.3, 3.4 */}
      {openGroupChatPopups.map((popup, i) => {
        const overallIndex = openChatPopups.length + i;
        const rightOffset = `calc(${overallIndex} * (${POPUP_WIDTH_CSS} + ${GAP}px) + ${GAP}px)`;

        return (
          <div
            key={popup.key}
            style={{
              position: "absolute",
              bottom: GAP,
              right: rightOffset,
              zIndex: overallIndex,
              width: POPUP_WIDTH_CSS,
            }}
          >
            <GroupChatPopup
              group={popup.group}
              onClose={() => dispatch(removeGroupChatPopup(popup.group.id))}
              onMaximize={() => {
                dispatch(removeGroupChatPopup(popup.group.id));
                navigate("/app-group-chat", {
                  state: { openGroupId: popup.group.id },
                });
              }}
              userId={ME_ID}
              token={TOKEN}
              baseUrl={BASE_URL}
              initialPosition={{ x: 0, y: 0 }}
              index={overallIndex}
              isFixed={true}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ChatPopupsContainer;
