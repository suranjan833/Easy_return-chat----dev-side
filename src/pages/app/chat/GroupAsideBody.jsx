import { Icon, UserAvatar } from "@/components/Component";
import { findUpper } from "@/utils/Utils";
import { useContext, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import { addGroupChatPopup } from "@/redux/slices/chatPopupsSlice";
import { ChatContext } from "./ChatContext";
import { ChatItem } from "./ChatPartials2";
import { DirectChatContext } from "./DirectChatContext";
import "./ModernChat.css";
import { GroupChatContext } from "../group-chat/GroupChatContext";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const GroupAsideBody = ({}) => {
  const direct = useContext(GroupChatContext);
  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } = useSelector((s) => s.chatPopups);

  const { filteredGroups, setSearchTerm, activeGroup, selectGroup } = direct;

  const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;

  const handleGroupClick = (group) => {
    if (total > 0) {
      if (openGroupChatPopups.some((p) => p.group.id === group.id)) {
        toast.warning("Group chat already open.");
        return;
      }
      if (total >= 4) {
        toast.error("Maximum of 4 chat windows can be open at a time.");
        return;
      }
      dispatch(addGroupChatPopup(group));
    } else {
      selectGroup(group.id);
    }
  };

  const getInitials = (first = "", last = "") =>
    `${(first[0] || "").toUpperCase()}${(last[0] || "").toUpperCase()}`;

  return (
    <SimpleBar className="modern-chat-list">
      <div className="modern-chat-search">
        <input
          type="text"
          className="modern-chat-search-input"
          id="direct-search"
          placeholder="Search by name"
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            height: "34px",
            width: "250px",
            fontSize: "13px",
            padding: "6px 10px",
          }}
        />
      </div>
      <div className="modern-chat-list">
        <h6
          style={{
            padding: "16px 24px 8px",
            margin: 0,
            fontSize: "14px",
            fontWeight: "600",
            color: "#666",
            textTransform: "uppercase",
          }}
        >
          Groups
        </h6>

        <div className="modern-chat-list">
          {filteredGroups.map((group) => {
            const isActive = activeGroup?.id === group.id;

            return (
              <div
                key={group.id}
                className={`modern-chat-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  handleGroupClick(group);
                }}
              >
                <div style={{ position: "relative" }}>
                  {group.group_avatar ? (
                    <img
                      src={group.group_avatar}
                      alt={`${getInitials(group.name)}`}
                      className="modern-chat-item-avatar"
                    />
                  ) : (
                    <div
                      className="modern-chat-item-avatar"
                      style={{
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: "600",
                      }}
                    >
                      {getInitials(group.name)}
                    </div>
                  )}
                </div>
                <div className="modern-chat-item-content">
                  <div className="modern-chat-item-name">
                    {group.name || ""}
                  </div>
                  <div className="modern-chat-item-message">
                    {/* {latestMsg.content} */}
                  </div>
                </div>
                <div className="modern-chat-item-time">
                  {/* {formatTime(latestMsg.timestamp)} */}
                </div>
                {/* {!isActive && unreadCount > 0 && (
                  <span
                    style={{
                      background: "#667eea",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      marginLeft: "8px",
                    }}
                  >
                    {unreadCount}
                  </span>
                )} */}
              </div>
            );
          })}
        </div>
      </div>
    </SimpleBar>
  );
};
