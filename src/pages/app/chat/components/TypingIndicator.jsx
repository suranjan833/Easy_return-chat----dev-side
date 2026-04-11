import React from "react";

const TypingIndicator = ({ typingUsers }) => {
  if (!typingUsers || Object.keys(typingUsers).length === 0) return null;

  return (
    <div className="modern-typing-indicator mx-5">
      <div className="modern-typing-dots">
        <div className="modern-typing-dot"></div>
        <div className="modern-typing-dot"></div>
        <div className="modern-typing-dot"></div>
      </div>
      <span style={{ fontSize: "10px", color: "#666" }}></span>
    </div>
  );
};

export default TypingIndicator;
