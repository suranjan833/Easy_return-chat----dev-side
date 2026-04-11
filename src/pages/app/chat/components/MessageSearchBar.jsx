import React from "react";

const MessageSearchBar = ({ messageSearchTerm, setMessageSearchTerm, onPrev, onNext }) => {
  return (
    <div
      style={{
        position: "sticky",
        top: "0",
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "4px",
        background: "rgba(255,255,255,0.95)",
      }}
    >
      <input
        type="text"
        placeholder="Search messages..."
        value={messageSearchTerm || ""}
        onChange={(e) => setMessageSearchTerm(e.target.value)}
        style={{
          padding: "6px 14px",
          borderRadius: "20px",
          border: "1px solid #ccc",
          width: "450px",
          fontSize: "13px",
        }}
      />
      <button onClick={onPrev} style={{ border: "none", background: "transparent" }}>↑</button>
      <button onClick={onNext} style={{ border: "none", background: "transparent" }}>↓</button>
    </div>
  );
};

export default MessageSearchBar;
