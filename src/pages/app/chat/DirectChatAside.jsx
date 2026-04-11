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
    totalUnreadCount, // KEEP: Using totalUnreadCount for the Messages badge
    activeUser,
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
              ) // Sort by timestamp, most recent first
              .map((chat) => {
                // FIX: Changed user.find to filteredUsers.find to avoid error
                const user =
                  filteredUsers.find((u) => u.other_user?.id === chat.recipient_id)?.other_user || {};
                const isActive = activeUser?.id === chat.recipient_id;
                // REMOVE: Old per-user unread count logic causing errors
                // const unread = unreadCounts[chat.recipient_id] || chat.unread_count || 0;
                return (
                  <li
                    key={chat.id}
                    className={isActive ? "active" : ""}
                    onClick={() => selectUser(chat.recipient_id)}
                  >
                    <div className="chat-item">
                      <div className="chat-media user-avatar">
                        {user.profile_picture ? (
                          <UserAvatar image={user.profile_picture}></UserAvatar>
                        ) : (
                          <UserAvatar
                            theme="secondary"
                            text={getInitials(user.first_name, user.last_name)}
                          ></UserAvatar>
                        )}
                      </div>
                      <div className="chat-info">
                        <div className="chat-from">
                          <div className="name">
                            {user.first_name || ""} {user.last_name || ""}
                          </div>
                          <span className="time">
                            {formatTime(chat.last_message_timestamp)}
                          </span>
                        </div>
                        <div className="chat-context">
                          <div className="text">
                            {chat.last_message || "No messages yet"}
                          </div>
                          {/* REMOVE: Old unread count badge causing errors */}
                          {/* {unread > 0 && (
                            <div className="status delivered">
                              <span className="badge bg-primary rounded-pill">{unread}</span>
                            </div>
                          )} */}
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
