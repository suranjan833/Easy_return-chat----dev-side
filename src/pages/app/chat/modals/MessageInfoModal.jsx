import React from "react";

const MessageInfoModal = ({ message, onClose }) => {
  if (!message) return null;

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "-";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-80 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h5 className="mb-3 font-semibold">Message Info</h5>

        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Sent</span>
            <span className="font-medium">
              {formatDateTime(message.timestamp || message.created_at)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Delivered</span>
            <span className="font-medium">
              {message.delivered || message.timestamp
                ? formatDateTime(message.timestamp || message.created_at)
                : "Not delivered"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Seen</span>
            <span className="font-medium">
              {message.read && message.read_at
                ? formatDateTime(message.read_at)
                : message.read
                  ? formatDateTime(message.updated_at || message.timestamp)
                  : "Not seen"}
            </span>
          </div>

          {(message.edited || message.is_edited) && message.updated_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Edited</span>
              <span className="font-medium">
                {formatDateTime(message.updated_at)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 text-right">
          <button
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;
