import React, { useContext } from "react";
import SimpleBar from "simplebar-react";
import { Input } from "reactstrap";
import { Icon, UserAvatar } from "@/components/Component";
import { DirectChatContext } from "./DirectChatContext";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getInitials = (firstName = "", lastName = "") =>
  `${(firstName[0] || "").toUpperCase()}${(lastName[0] || "").toUpperCase()}`;

export default function DirectChatAside() {
  const {
    filteredUsers,
    setSearchTerm,
    recentChats,
    totalUnreadCount,
    activeUser,
    activeConversationId,
    selectUser,
  } = useContext(DirectChatContext);

  const getLastMessageMeta = (userId) => {
    const chat = recentChats.find((c) => c.recipient_id === userId);
    if (!chat) return { text: "", time: "" };
    return { text: chat.last_message || "", time: chat.last_message_timestamp };
  };

  return (
    <SimpleBar className="nk-chat-aside-body">
      <div className="nk-chat-aside-search">
        <div className="form-group">
          <div className="form-control-wrap">
            <div className="form-icon form-icon-left">
              <Icon name="search"></Icon>
            </div>
            <Input
              type="text"
              className="form-round"
              placeholder="Search by name"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="nk-chat-list">
        <h6 className="title overline-title-alt">
          Messages{" "}
          {totalUnreadCount > 0 && (
            <span className="badge bg-primary rounded-pill ms-2">
              {totalUnreadCount}
            </span> // KEEP: Correctly displays total unread count
          )}
        </h6>
        <ul className="chat-list">
          {recentChats.length ? (
            recentChats
              .sort(
                (a, b) =>
                  new Date(b.last_message_timestamp) -
                  new Date(a.last_message_timestamp),
              )
              .filter((chat, index, self) =>
                index === self.findIndex((c) => c.recipient_id === chat.recipient_id)
              )
              .map((chat) => {
                const conv = filteredUsers.find((u) => u.other_user?.id === chat.recipient_id);
                const isAdminView = conv?.is_admin_view;
                const user = conv?.other_user || {};
                const senderUser = conv?.conv_sender;
                const recipientUser = conv?.conv_recipient;

                // For admin: display "Sender - Receiver", key by conversation_id
                const displayName = isAdminView && senderUser && recipientUser
                  ? `${senderUser.first_name} ${senderUser.last_name || ""} - ${recipientUser.first_name} ${recipientUser.last_name || ""}`
                  : `${user.first_name || ""} ${user.last_name || ""}`.trim();

                const avatarText = isAdminView && senderUser
                  ? getInitials(senderUser.first_name, senderUser.last_name)
                  : getInitials(user.first_name, user.last_name);

                const itemKey = isAdminView && conv?.conversation_id
                  ? conv.conversation_id
                  : chat.recipient_id;

                // Use conversation_id for active check to prevent multi-selection
                const isActive = isAdminView && conv?.conversation_id
                  ? activeConversationId === conv.conversation_id
                  : activeUser?.id === chat.recipient_id;

                return (
                  <li
                    key={itemKey}
                    className={isActive ? "active" : ""}
                    onClick={() => selectUser(chat.recipient_id, conv?.conversation_id || null)}
                  >
                    <div className="chat-item">
                      <div className="chat-media user-avatar">
                        {user.profile_picture ? (
                          <UserAvatar image={user.profile_picture}></UserAvatar>
                        ) : (
                          <UserAvatar theme="secondary" text={avatarText} />
                        )}
                      </div>
                      <div className="chat-info">
                        <div className="chat-from">
                          <div className="name" style={{ fontSize: isAdminView ? "12px" : undefined }}>
                            {displayName}
                          </div>
                          <span className="time">
                            {formatTime(chat.last_message_timestamp)}
                          </span>
                        </div>
                        <div className="chat-context">
                          <div className="text">
                            {chat.last_message || "No messages yet"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })
          ) : (
            <p className="m-3">No chats found</p>
          )}
        </ul>
      </div>
    </SimpleBar>
  );
}
