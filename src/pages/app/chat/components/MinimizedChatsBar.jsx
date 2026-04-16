import React from "react";

const MinimizedChatsBar = ({ minimizedChats, activeUser, allUsers, onMaximize }) => {
  if (!minimizedChats.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        display: "flex",
        gap: "10px",
        zIndex: 9999,
      }}
    >
      {minimizedChats.map((chatId) => {
        // Find the user info for this minimized chat
        const user = allUsers?.find(u => u.id === chatId) || activeUser;
        const displayName = user?.first_name || "Chat";
        
        return (
          <div
            key={chatId}
            style={{
              background: "#0d6efd",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
            onClick={() => onMaximize(chatId)}
          >
            <span style={{ fontSize: "13px" }}>
              {displayName}
            </span>
            <button
              style={{ 
                background: "transparent", 
                border: "none", 
                color: "#fff", 
                cursor: "pointer",
                padding: "2px",
                display: "flex",
                alignItems: "center"
              }}
              onClick={(e) => {
                e.stopPropagation();
                onMaximize(chatId);
              }}
            >
              <i className="bi bi-arrows-fullscreen"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default MinimizedChatsBar;
