import { formatDistanceToNow, format } from "date-fns";

const Avatar = ({ user, size = 28 }) => {
  const initials = (user?.first_name || "?").slice(0, 1).toUpperCase();
  return user?.profile_picture ? (
    <img
      src={user.profile_picture}
      alt={`${user.first_name} ${user.last_name || ""}`}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#6576ff", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.4, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

const MessageInfoModal = ({ isOpen, message, onClose, groupMembers }) => {
  if (!isOpen || !message) return null;

  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const sender = message.user || {};
  const fullName = [sender.first_name, sender.last_name].filter(Boolean).join(" ") || "Unknown";

  const sentAt = message.created_at ? new Date(message.created_at) : null;
  const editedAt = message.is_edited && message.updated_at ? new Date(message.updated_at) : null;

  // ── Read receipt logic ──────────────────────────────────────────────────────
  const receipts = message.read_receipts || [];
  const isGroupMessage = Array.isArray(groupMembers) && groupMembers.length > 0;

  // For group messages: split members into read / not-read
  let readMembers = [];
  let unreadMembers = [];

  if (isGroupMessage) {
    const readerIds = new Set(receipts.map((r) => r.reader_id));
    groupMembers.forEach((member) => {
      // Exclude the sender from both lists
      if (member.id === currentUserId) return;
      const receipt = receipts.find((r) => r.reader_id === member.id);
      if (readerIds.has(member.id)) {
        readMembers.push({ member, read_at: receipt?.read_at || null });
      } else {
        unreadMembers.push({ member });
      }
    });
  }

  // For 1-to-1 fallback
  const firstReceipt = receipts.find((r) => r.is_read && r.read_at);
  const updatedAtFallback = (() => {
    if (!message.is_read || !message.updated_at) return null;
    const d = new Date(message.updated_at);
    return d.getFullYear() > 2000 ? message.updated_at : null;
  })();
  const readAt = message.read_at || updatedAtFallback || firstReceipt?.read_at || null;

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
          minWidth: "320px",
          maxWidth: "420px",
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#1a1a2e" }}>Message Info</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Sender info */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", padding: "12px", background: "#f8f9fa", borderRadius: "8px" }}>
          <Avatar user={sender} size={44} />
          <div>
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a2e" }}>{fullName}</div>
            {sender.email && <div style={{ fontSize: "12px", color: "#888" }}>{sender.email}</div>}
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
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: isGroupMessage ? "20px" : "0" }}>
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

          {/* 1-to-1 read status */}
          {!isGroupMessage && (
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
              </div>
            </div>
          )}

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

        {/* ── Group read receipts ─────────────────────────────────────────────── */}
        {isGroupMessage && (
          <>
            <hr style={{ margin: "0 0 16px", borderColor: "#f0f0f0" }} />

            {/* Read by */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <i className="bi bi-check2-all" style={{ color: "#1ee0ac", fontSize: "15px" }} />
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>
                  Read by
                </span>
                <span style={{
                  background: "#1ee0ac", color: "#fff",
                  borderRadius: "10px", padding: "1px 8px",
                  fontSize: "11px", fontWeight: 700,
                }}>
                  {readMembers.length}
                </span>
              </div>

              {readMembers.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#aaa", paddingLeft: "24px" }}>No one has read this yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {readMembers.map(({ member, read_at }) => (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "4px" }}>
                      <Avatar user={member} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {member.first_name} {member.last_name || ""}
                        </div>
                        {read_at && (
                          <div style={{ fontSize: "11px", color: "#aaa" }}>
                            {format(new Date(read_at), "dd MMM, hh:mm a")}
                          </div>
                        )}
                      </div>
                      <i className="bi bi-check2-all" style={{ color: "#1ee0ac", fontSize: "13px", flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Not read by */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <i className="bi bi-check2" style={{ color: "#aaa", fontSize: "15px" }} />
                <span style={{ fontWeight: 600, fontSize: "13px", color: "#333" }}>
                  Not read by
                </span>
                <span style={{
                  background: "#8094ae", color: "#fff",
                  borderRadius: "10px", padding: "1px 8px",
                  fontSize: "11px", fontWeight: 700,
                }}>
                  {unreadMembers.length}
                </span>
              </div>

              {unreadMembers.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#aaa", paddingLeft: "24px" }}>Everyone has read this</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {unreadMembers.map(({ member }) => (
                    <div key={member.id} style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "4px" }}>
                      <Avatar user={member} size={30} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {member.first_name} {member.last_name || ""}
                        </div>
                        <div style={{ fontSize: "11px", color: "#aaa" }}>Not read yet</div>
                      </div>
                      <i className="bi bi-check2" style={{ color: "#aaa", fontSize: "13px", flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageInfoModal;
