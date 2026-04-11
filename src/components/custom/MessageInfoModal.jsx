import { formatDistanceToNow, format } from "date-fns";

const MessageInfoModal = ({ isOpen, message, onClose }) => {
  if (!isOpen || !message) return null;

  const sender = message.user || {};
  const fullName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "Unknown";
  const initials = (sender.first_name || "?").slice(0, 1).toUpperCase();

  const sentAt = message.created_at ? new Date(message.created_at) : null;

  // Support both 1-to-1 (read_at / is_read) and group (read_receipts array)
  const receipts = message.read_receipts || [];
  const firstReceipt = receipts.find((r) => r.is_read && r.read_at);
  const readAt = message.read_at
    || (message.is_read ? message.updated_at : null)
    || firstReceipt?.read_at
    || null;

  const editedAt = message.is_edited && message.updated_at ? new Date(message.updated_at) : null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "24px",
          minWidth: "300px",
          maxWidth: "380px",
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#1a1a2e" }}>Message Info</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#888", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Sender info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px" }}>
          {sender.profile_picture ? (
            <img
              src={sender.profile_picture}
              alt={fullName}
              style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: "#6576ff", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: "18px", flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a2e" }}>{fullName}</div>
            {sender.email && <div style={{ fontSize: "12px", color: "#888" }}>{sender.email}</div>}
            {sender.phone_number && <div style={{ fontSize: "12px", color: "#888" }}>{sender.phone_number}</div>}
            {sender.availability !== undefined && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: sender.availability ? "#1ee0ac" : "#8094ae",
                  display: "inline-block",
                }} />
                <span style={{ fontSize: "11px", color: "#888" }}>
                  {sender.availability ? "Online" : "Offline"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Message preview */}
        {message.message && (
          <div style={{ marginBottom: "16px", padding: "10px 12px", background: "#e8f4fd", borderRadius: "8px", borderLeft: "3px solid #6576ff" }}>
            <div style={{ fontSize: "13px", color: "#444", wordBreak: "break-word" }}>
              {message.message.length > 120 ? message.message.slice(0, 120) + "…" : message.message}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {sentAt && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="bi bi-send" style={{ color: "#6576ff", fontSize: "14px", width: "16px" }} />
              <div>
                <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Sent</div>
                <div style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}>
                  {format(sentAt, "dd MMM yyyy, hh:mm a")}
                  <span style={{ color: "#aaa", marginLeft: "6px", fontWeight: 400 }}>
                    ({formatDistanceToNow(sentAt, { addSuffix: true })})
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className={`bi ${readAt ? "bi-check2-all" : "bi-check2"}`}
              style={{ color: readAt ? "#1ee0ac" : "#aaa", fontSize: "16px", width: "16px" }} />
            <div>
              <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {readAt ? "Read" : "Delivered"}
              </div>
              <div style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}>
                {readAt
                  ? `${format(new Date(readAt), "dd MMM yyyy, hh:mm a")} (${formatDistanceToNow(new Date(readAt), { addSuffix: true })})`
                  : "Not yet read"}
              </div>
              {/* Group read receipts — show each reader */}
              {receipts.length > 0 && (
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "3px" }}>
                  {receipts.map((r, i) => (
                    <div key={i} style={{ fontSize: "12px", color: "#555" }}>
                      <span style={{ fontWeight: 500 }}>
                        {r.reader?.first_name} {r.reader?.last_name}
                      </span>
                      {r.read_at && (
                        <span style={{ color: "#aaa", marginLeft: "6px" }}>
                          {format(new Date(r.read_at), "dd MMM yyyy, hh:mm a")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {editedAt && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="bi bi-pencil" style={{ color: "#f4bd0e", fontSize: "13px", width: "16px" }} />
              <div>
                <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Edited</div>
                <div style={{ fontSize: "13px", color: "#333", fontWeight: 500 }}>
                  {format(editedAt, "dd MMM yyyy, hh:mm a")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;
