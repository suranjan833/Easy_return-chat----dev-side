import { Icon } from "@/components/Component";
import React from "react";

const ChatHeader = ({ activeUser, activeUserIDs, isSelectionMode, selectedMessages, onDeleteSelected, onToggleSelection, onMinimize }) => {
  return (
    <div className="modern-chat-header">
      <div className="modern-chat-header-user">
        <img
          src={
            activeUser.profile_picture ||
            "https://t4.ftcdn.net/jpg/05/89/93/27/360_F_589932782_vQAEAZhHnq1QCGu5ikwrYaQD0Mmurm0N.jpg"
          }
          alt={`${activeUser.first_name || "User"} ${activeUser.last_name || ""}`}
          className="modern-chat-header-avatar"
        />
        <div className="modern-chat-header-info">
          <h5>{activeUser.first_name || "User"}</h5>
          <p>{activeUserIDs.includes(activeUser?.id) ? "Online" : "Offline"}</p>
        </div>
      </div>
      <div className="modern-chat-header-actions">
        <span></span>
        {isSelectionMode ? (
          <div className="modern-selection-mode">
            <div className="modern-selection-mode-content">
              {selectedMessages?.length || 0} messages selected
            </div>
            <div className="modern-selection-mode-actions">
              <button
                className="modern-selection-mode-btn primary"
                onClick={onDeleteSelected}
                disabled={!selectedMessages.length}
              >
                Delete
              </button>
              <button
                className="modern-selection-mode-btn secondary"
                onClick={() => onToggleSelection(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {onMinimize && (
              <button className="modern-chat-header-btn" onClick={onMinimize} title="Minimize">
                <i className="bi bi-dash-lg" />
              </button>
            )}
            <button className="modern-chat-header-btn" onClick={() => onToggleSelection(true)}>
              <Icon name="check" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
