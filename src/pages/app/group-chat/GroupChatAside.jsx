import React, { useContext } from "react";
import SimpleBar from "simplebar-react";
import { Input } from "reactstrap";
import { Icon, UserAvatar } from "@/components/Component";
import { GroupChatContext } from "./GroupChatContext";
import "../chat/ChatAside.css";

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function GroupChatAside() {
  const { filteredGroups, setSearchTerm, activeGroup, selectGroup, groupUnreadCounts } =
    useContext(GroupChatContext);

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
              placeholder="Search group"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="nk-chat-list">
        <h6 className="title overline-title-alt">Groups</h6>
        <ul className="chat-list">
          {filteredGroups.length ? (
            filteredGroups.map((g) => {
              const unread = groupUnreadCounts?.[g.id] || 0;
              return (
                <li key={g.id} className={`chat-item ${activeGroup?.id === g.id ? "active" : ""}`}>
                  <a
                    className="chat-link"
                    href="#chat-link"
                    onClick={(ev) => {
                      ev.preventDefault();
                      selectGroup(g.id);
                    }}
                  >
                    <UserAvatar
                      theme="primary"
                      text={getInitials(g.name)}
                      image={g.group_avatar || g.avatar_url}
                    />
                    <div className="chat-info px-2">
                      <div className="chat-from">
                        <div className="name">{g.name}</div>
                        <span className="time">{formatTime(g.updated_at || g.created_at)}</span>
                      </div>
                      <div className="chat-context">
                        <div className="text">
                          <p>{g.last_message || "No messages yet"}</p>
                        </div>
                        {unread > 0 && (
                          <span
                            className="badge rounded-pill bg-primary"
                            style={{ fontSize: "0.7rem", minWidth: "20px", textAlign: "center" }}
                          >
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                </li>
              );
            })
          ) : (
            <ul className="chat-list">
              {[...Array(10)].map((_, idx) => (
                <li key={idx} className="chat-item">
                  <div className="chat-link">
                    <div className="chat-media skeleton" style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#e5e7eb" }}></div>
                    <div className="chat-info">
                      <div className="chat-from">
                        <div className="name skeleton" style={{ width: "100px", height: "16px", background: "#e5e7eb" }}></div>
                        <span className="time skeleton" style={{ width: "50px", height: "12px", background: "#e5e7eb" }}></span>
                      </div>
                      <div className="chat-context">
                        <div className="text">
                          <p className="skeleton" style={{ width: "150px", height: "12px", background: "#e5e7eb" }}></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ul>
      </div>
    </SimpleBar>
  );
}
