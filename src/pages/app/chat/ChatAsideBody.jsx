import { Icon, UserAvatar } from "@/components/Component";
import { findUpper } from "@/utils/Utils";
import { useContext, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Input } from "reactstrap";
import SimpleBar from "simplebar-react";
import { addUserChatPopup } from "@/redux/slices/chatPopupsSlice";
import { ChatContext } from "./ChatContext";
import { ChatItem } from "./ChatPartials2";
import { DirectChatContext } from "./DirectChatContext";
import "./ModernChat.css";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const ChatAsideBody = ({}) => {
  const direct = useContext(DirectChatContext);
  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } = useSelector((s) => s.chatPopups);

  const [isNewChatListVisible, setIsNewChatListVisible] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");

  const {
    filteredUsers,
    setSearchTerm,
    allUsers,
    activeUserIDs,
    totalUnreadCount,
    activeUser,
    selectUser,
    users,
  } = direct;

  const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;

  const handleUserClick = (userId, userObj) => {
    // If any popup is already open, always open as popup
    if (total > 0) {
      if (openChatPopups.some((p) => p.user.id === userId)) {
        toast.warning("Chat already open for this user.");
        return;
      }
      if (total >= 4) {
        toast.error("Maximum of 4 chat windows can be open at a time.");
        return;
      }
      // Find conversation to get conversation_id and pairKey
      const conv = users?.find((u) => u.other_user?.id === userId);
      const payload = {
        ...userObj,
        conversation_id: conv?.conversation_id || conv?.pairKey,
        pairKey: conv?.pairKey,
      };
      console.log('[ChatAsideBody] 📤 Opening popup with payload:', payload);
      dispatch(addUserChatPopup(payload));
      // Clear inline chat so it doesn't stay open alongside popups
      selectUser(null, null);
    } else {
      selectUser(userId, userObj?.conversation_id || userObj?.pairKey);
    }
  };

  const getInitials = (first = "", last = "") =>
    `${(first[0] || "").toUpperCase()}${(last[0] || "").toUpperCase()}`;

  const filteredNewChatUsers = allUsers.filter((user) => {
    const name = `${user.first_name} ${user.last_name}`.toLowerCase();
    return name.includes(newChatSearch.toLowerCase());
  });

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
          Messages
          {totalUnreadCount > 0 && (
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
              {totalUnreadCount}
            </span>
          )}
          {/* bhai button add */}
          <div
            onClick={() => {
              setIsNewChatListVisible(true);
            }}
            style={{
              position: "absolute",
              right: "1px",
              top: "25px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "22px",
              fontWeight: "bold",
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              transition: "0.2s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.1)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            +
          </div>
        </h6>

        {isNewChatListVisible && (
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "320px",
              height: "100vh",
              background: "#fff",
              boxShadow: "-4px 0 15px rgba(0,0,0,0.1)",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              animation: "slideIn 0.25s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h6 style={{ margin: 0 }}>New Chat</h6>
              <span
                style={{ cursor: "pointer", fontSize: "20px" }}
                onClick={() => setIsNewChatListVisible(false)}
              >
                ✕
              </span>
            </div>

            {/* Search */}
            <div style={{ padding: "12px" }}>
              <input
                placeholder="Search users ..."
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  fontSize: "13px",
                }}
              />
            </div>

            {/* User List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredNewChatUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => {
                    handleUserClick(user.id, user);
                    setIsNewChatListVisible(false);
                  }}
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid #f1f1f1",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8f9ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <strong style={{ fontSize: "14px" }}>
                    {user.first_name} {user.last_name}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modern-chat-list">
          {users.map((conversation) => {
            var otherUser = conversation.other_user;
            var latestMsg = conversation.latest_message;
            var unreadCount = conversation.unread_count;
            const isActive = direct.activeConversationId === conversation.conversation_id || direct.activeConversationId === conversation.pairKey;
            const isOnline = activeUserIDs.includes(otherUser.id);

            return (
              <div
                key={conversation.conversation_id || conversation.pairKey}
                className={`modern-chat-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  handleUserClick(otherUser.id, conversation);
                }}
              >
                <div style={{ position: "relative" }}>
                  {otherUser.profile_picture ? (
                    <img
                      src={otherUser.profile_picture}
                      alt={`${otherUser.first_name} ${otherUser.last_name}`}
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
                      {getInitials(otherUser.first_name, otherUser.last_name)}
                    </div>
                  )}
                  <span
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: isOnline ? "#28a745" : "#6c757d",
                      border: "2px solid #fff",
                    }}
                  />
                </div>
                <div className="modern-chat-item-content">
                  <div className="modern-chat-item-name">
                    {conversation.displayName || `${otherUser.first_name} ${otherUser.last_name || ""}`}
                  </div>
                  <div className="modern-chat-item-message">
                    {latestMsg.content}
                  </div>
                </div>
                <div className="modern-chat-item-time">
                  {formatTime(latestMsg.timestamp)}
                </div>
                {!isActive && unreadCount > 0 && (
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
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SimpleBar>
  );
};
