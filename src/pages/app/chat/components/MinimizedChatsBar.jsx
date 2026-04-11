import React from "react";

const MinimizedChatsBar = ({ minimizedChats, activeUser, onMaximize }) => {
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
      {minimizedChats.map((chatId) => (
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
          }}
        >
          <span style={{ fontSize: "13px" }}>
            {activeUser?.first_name || "Chat"}
          </span>
          <button
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
            onClick={() => onMaximize(chatId)}
          >
            <i className="bi bi-arrows-fullscreen"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

export default MinimizedChatsBar;
