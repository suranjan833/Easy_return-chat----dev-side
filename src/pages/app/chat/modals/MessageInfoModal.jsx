import React from "react";

const MessageInfoModal = ({ message, onClose }) => {
  if (!message) return null;

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
            <span>Delivered</span>
            <span>
              {message.timestamp
                ? new Date(message.timestamp).toLocaleString()
                : "-"}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Seen</span>
            <span>
              {message.read
                ? new Date(message.read_at).toLocaleString()
                : "Not seen"}
            </span>
          </div>
        </div>

        <div className="mt-4 text-right">
          <button
            className="px-3 py-1 text-sm bg-gray-200 rounded"
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
