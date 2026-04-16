import "bootstrap-icons/font/bootstrap-icons.css";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import SimpleBar from "simplebar-react";
import { toast } from "react-toastify";
import AttachmentDisplay from "../../components/custom/Attachment/AttachmentDisplay";
import AttachmentInputPreview from "../../components/custom/Attachment/AttachmentInputPreview";
import DeleteConfirmationModal from "../../components/custom/DeleteConfirmationModal";
import MessageInfoModal from "../../components/custom/MessageInfoModal";
import ReplyPreview from "../../components/custom/ReplyPreview";
import { AttechmentSizeLimit, isOnlyEmojis } from "../../pages/comman/helper";
import chatService from "../../Services/ChatService";
import { getDirectMessages, markAllRead } from "../../Services/DirectsmsApi";
import "./ChatPopup.css";

// ── helpers ──────────────────────────────────────────────────────────────────
const formatTime = (t) =>
  t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const groupByDate = (list) => {
  const out = [];
  let last = null;
  list.forEach((m) => {
    const ts = m.timestamp || m.created_at;
    const d = ts ? new Date(ts) : new Date();
    const key = d.toDateString();
    if (key !== last) {
      last = key;
      const today = new Date();
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
      const label =
        d.toDateString() === today.toDateString() ? "Today" :
        d.toDateString() === yesterday.toDateString() ? "Yesterday" :
        d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
      out.push({ _divider: true, label });
    }
    out.push(m);
  });
  return out;
};

// ── component ─────────────────────────────────────────────────────────────────
const ChatPopup = ({ user, onClose, meId, token, initialPosition, index }) => {
  // ── state ──
  const [messages, setMessages]           = useState([]);
  const [messageInput, setMessageInput]   = useState("");
  const [typingUsers, setTypingUsers]     = useState({});
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyToMessage, setReplyToMessage]     = useState(null);
  const [attachment, setAttachment]       = useState(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteModal, setDeleteModal]     = useState({ isOpen: false, messageId: null, content: null });
  const [infoModal, setInfoModal]         = useState({ isOpen: false, message: null });
  const [position, setPosition]           = useState(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging]       = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // ── refs ──
  const scrollRef       = useRef(null);
  const fileRef         = useRef(null);
  const emojiPickerRef  = useRef(null);
  const chatWindowRef   = useRef(null);
  const dragOffset      = useRef({ x: 0, y: 0 });
  const typingDebounce  = useRef(null);

  // ── drag ──
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = chatWindowRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth  - 300, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 480, e.clientY - dragOffset.current.y)),
    });
  };
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup",   handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup",   handleMouseUp);
    };
  }, [isDragging]);

  // ── close emoji on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target))
        setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── drag-and-drop file onto popup ──
  useEffect(() => {
    const el = chatWindowRef.current;
    if (!el) return;
    const over = (e) => { e.preventDefault(); e.stopPropagation(); };
    const drop = (e) => {
      e.preventDefault(); e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const valid = AttechmentSizeLimit(file, e);
      if (!valid) return;
      handleFileChange(file);
    };
    el.addEventListener("dragover", over);
    el.addEventListener("drop",     drop);
    return () => { el.removeEventListener("dragover", over); el.removeEventListener("drop", drop); };
  }, []);

  // ── fetch messages on open ──
  useEffect(() => {
    if (!user || !meId || !token) return;

    const fetch = async () => {
      try {
        let u1 = meId, u2 = user.id;
        if (user.conversation_id) {
          const parts = String(user.conversation_id).split("_").map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) [u1, u2] = parts;
        }
        const msgs = await getDirectMessages(u1, u2);
        if (!Array.isArray(msgs)) return;
        setMessages(msgs.map((m) => ({
          ...m,
          delivered: m.delivered ?? false,
          read:      m.read      ?? false,
          read_at:   m.read_at   ?? null,
          edited:    !!(m.updated_at && m.updated_at !== m.timestamp),
          message_type: (m.type === "message_with_attachment" || m.attachment) ? "attachment" : "text",
        })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));

        await markAllRead(meId, user.id);
        msgs.forEach((m) => {
          if (!m.read && m.sender_id !== meId) {
            chatService.sendMessage({ type: "update_status", message_id: m.id, status: "read", read_at: new Date().toISOString() });
          }
        });
      } catch (err) {
        console.error("[ChatPopup] fetch:", err.message);
      }
    };
    fetch();
  }, [user, meId, token]);

  // ── socket subscriptions ──
  useEffect(() => {
    if (!meId || !user) return;

    const onNewMessage = (data) => {
      const { message, otherUserId, senderId } = data;
      // Only handle messages that belong to this specific conversation
      const isMyMessage = senderId === meId && otherUserId === user.id;
      const isTheirMessage = senderId === user.id && otherUserId === meId;
      if (!isMyMessage && !isTheirMessage) return;

      setMessages((prev) => {
        // Dedup by real id
        if (prev.some((m) => m.id === message.id)) return prev;
        // Replace optimistic temp message if it matches (same sender + content)
        const tempIdx = prev.findIndex(
          (m) => m.tempId && m.sender_id === senderId && m.content === message.content
        );
        const nm = { ...message, timestamp: message.timestamp || message.created_at || new Date().toISOString() };
        if (tempIdx !== -1) {
          const next = [...prev];
          next[tempIdx] = nm;
          return next.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        return [...prev, nm].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });
      if (senderId !== meId) {
        chatService.sendMessage({ type: "update_status", message_id: message.id, status: "read", read_at: new Date().toISOString() });
      }
    };

    const onStatusUpdate = (data) => {
      const readAt = data.read_at || new Date().toISOString();
      setMessages((prev) => prev.map((m) =>
        m.id === data.message_id || (m.id < data.message_id && m.sender_id === meId)
          ? { ...m, read: true, read_at: readAt, delivered: true }
          : m
      ));
    };

    const onMessageEdit = (data) => {
      const editedId = data.message_id || data.reply_id;
      const content  = data.content    || data.reply_content;
      setMessages((prev) => prev.map((m) =>
        m.id === editedId ? { ...m, content, reply_content: content, edited: true, is_edited: true, updated_at: data.updated_at } : m
      ));
    };

    const onMessageDelete = (data) => {
      const delId = data.message_id || data.reply_id;
      setMessages((prev) => prev.map((m) =>
        m.id === delId ? { ...m, is_deleted: true, content: "", reply_content: "" } : m
      ));
    };

    const onTyping = (data) => {
      const { sender_id, recipient_id, status } = data;
      if (recipient_id !== meId || sender_id !== user.id) return;
      if (status === "started") {
        setTypingUsers((prev) => ({ ...prev, [sender_id]: user.first_name }));
      } else {
        setTypingUsers((prev) => { const n = { ...prev }; delete n[sender_id]; return n; });
      }
    };

    chatService.subscribe("new_message",    onNewMessage);
    chatService.subscribe("update_status",  onStatusUpdate);
    chatService.subscribe("message_edit",   onMessageEdit);
    chatService.subscribe("message_delete", onMessageDelete);
    chatService.subscribe("typing",         onTyping);

    return () => {
      chatService.unsubscribe("new_message",    onNewMessage);
      chatService.unsubscribe("update_status",  onStatusUpdate);
      chatService.unsubscribe("message_edit",   onMessageEdit);
      chatService.unsubscribe("message_delete", onMessageDelete);
      chatService.unsubscribe("typing",         onTyping);
    };
  }, [meId, user]);

  // ── auto-scroll & scroll-down button ──
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typingUsers]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollDown(scrollHeight - scrollTop > clientHeight + 80);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setShowScrollDown(false);
  };

  // ── actions ──
  const handleTyping = () => {
    if (!chatService.isInitialized() || !user) return;
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    chatService.sendMessage({ type: "typing", sender_id: meId, recipient_id: user.id, status: "started" });
    typingDebounce.current = setTimeout(() => {
      chatService.sendMessage({ type: "typing", sender_id: meId, recipient_id: user.id, status: "stopped" });
    }, 2000);
  };

  const handleFileChange = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File size exceeds 10MB limit."); return; }
    const allowed = ["image/jpeg","image/png","image/gif","application/pdf",
      "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { toast.error("Unsupported file type."); return; }
    setIsFileUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({ content_type: file.type, filename: file.name, data: reader.result, name: file.name, size: file.size });
      setIsFileUploading(false);
    };
    reader.onerror = () => { setIsFileUploading(false); toast.error("Failed to read file."); };
    reader.readAsDataURL(file);
  };

  const sendMessage = () => {
    const text = messageInput.trim();
    if (!text && !attachment) return;
    if (!user) return;

    if (editingMessageId) {
      chatService.sendMessage({ type: "edit_message", message_id: editingMessageId, content: text, updated_at: new Date().toISOString() });
      setMessages((prev) => prev.map((m) => m.id === editingMessageId ? { ...m, content: text, edited: true } : m));
      setEditingMessageId(null);
      setMessageInput("");
      return;
    }

    if (replyToMessage) {
      const payload = {
        type: "message_reply",
        message_id: replyToMessage.type === "message_reply" ? replyToMessage.message_id : replyToMessage.id,
        parent_reply_id: replyToMessage.type === "message_reply" ? replyToMessage.id : null,
        reply_content: text,
      };
      chatService.sendMessage(payload);
      setMessageInput("");
      setReplyToMessage(null);
      return;
    }

    if (attachment) {
      const base64 = attachment.data.split(",")[1]; // strip data URI prefix — API expects raw base64
      chatService.sendMessage({
        type: "message_with_attachment",
        sender_id: meId, recipient_id: user.id,
        content: text || "",
        attachment: { filename: attachment.filename, content: base64 },
      });
      setAttachment(null);
      setMessageInput("");
      if (fileRef.current) fileRef.current.value = null;
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId, tempId, type: "message",
      sender_id: meId, recipient_id: user.id,
      content: text, timestamp: new Date().toISOString(),
      message_type: "text", delivered: false, read: false,
    }]);
    chatService.sendMessage({ type: "message", sender_id: meId, recipient_id: user.id, content: text });
    setMessageInput("");
  };

  const startEditing = (msg) => {
    setEditingMessageId(msg.id);
    setMessageInput(msg.content || "");
    setReplyToMessage(null);
  };

  const cancelEditing = () => { setEditingMessageId(null); setMessageInput(""); };

  const confirmDelete = () => {
    if (!deleteModal.messageId) return;
    chatService.sendMessage({ type: "delete_message", message_id: deleteModal.messageId });
    setMessages((prev) => prev.map((m) => m.id === deleteModal.messageId ? { ...m, is_deleted: true, content: "" } : m));
    setDeleteModal({ isOpen: false, messageId: null, content: null });
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`popup-msg-${msgId}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.style.background = "rgba(255,193,7,0.3)"; setTimeout(() => { el.style.background = ""; }, 2000); }
  };

  // ── render message ──
  const renderMessage = (msg) => {
    if (msg._divider) return (
      <div key={msg.label} style={{ textAlign: "center", margin: "12px 0" }}>
        <span style={{ background: "#e9ecef", borderRadius: "12px", padding: "2px 12px", fontSize: "11px", color: "#666" }}>{msg.label}</span>
      </div>
    );

    const isMe = msg.sender_id === meId;
    const isReply = msg.type === "message_reply" || msg.type === "reply";
    const displayContent = msg.reply_content || msg.content;
    const isEmojiOnly = !msg.is_deleted && msg.message_type !== "attachment" && isOnlyEmojis(displayContent);

    // Resolve original message for reply context using message_id field
    let originalContent = null;
    let originalSenderName = null;
    if (isReply && msg.message_id) {
      const orig = messages.find((m) => m.id === msg.message_id);
      originalContent = msg.parent_content || orig?.content || orig?.reply_content || "Original message";
      const origSenderId = orig?.sender_id;
      originalSenderName = origSenderId === meId ? "You" : user.first_name;
    }

    return (
      <div
        key={msg.id}
        id={`popup-msg-${msg.id}`}
        style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: "10px" }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", flexDirection: isMe ? "row-reverse" : "row" }}>
          {/* Bubble */}
          <div
            style={{
              maxWidth: "78%", padding: isEmojiOnly ? "4px" : "8px 12px",
              borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: isMe ? "#6576ff" : "#fff",
              color: isMe ? "#fff" : "#333",
              border: isMe ? "none" : "1px solid #e9ecef",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              wordBreak: "break-word",
            }}
          >
            {/* Reply context — original message quoted inside bubble */}
            {isReply && originalContent && (
              <div
                onClick={() => scrollToMessage(msg.message_id)}
                style={{
                  cursor: "pointer", marginBottom: "6px",
                  background: isMe ? "rgba(255,255,255,0.2)" : "#f0f0f0",
                  borderLeft: `3px solid ${isMe ? "rgba(255,255,255,0.6)" : "#6576ff"}`,
                  borderRadius: "4px", padding: "4px 8px", fontSize: "11px",
                  color: isMe ? "rgba(255,255,255,0.85)" : "#555",
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: "2px" }}>{originalSenderName}</div>
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {originalContent.slice(0, 80)}{originalContent.length > 80 ? "…" : ""}
                </div>
              </div>
            )}

            {msg.attachment && !msg.is_deleted ? (
              <AttachmentDisplay attachment={msg.attachment} isMe={isMe} message={msg} />
            ) : (
              <span style={{ fontSize: isEmojiOnly ? "36px" : "13px", lineHeight: isEmojiOnly ? "1.2" : "1.4", display: "inline-block" }}>
                {msg.is_deleted
                  ? <em style={{ color: isMe ? "rgba(255,255,255,0.6)" : "#aaa", fontSize: "12px" }}>Message deleted</em>
                  : displayContent}
                {(msg.edited || msg.is_edited) && !msg.is_deleted && (
                  <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "4px" }}>(edited)</span>
                )}
              </span>
            )}

            {/* Time + status */}
            {!msg.is_deleted && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "3px", marginTop: "3px" }}>
                <span style={{ fontSize: "10px", opacity: 0.65 }}>{formatTime(msg.timestamp)}</span>
                {isMe && (
                  msg.read ? <i className="bi bi-check2-all" style={{ fontSize: "12px", color: "#a8d8ff" }} />
                  : msg.delivered ? <i className="bi bi-check2-all" style={{ fontSize: "12px", opacity: 0.5 }} />
                  : <i className="bi bi-check2" style={{ fontSize: "12px", opacity: 0.5 }} />
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!msg.is_deleted && (
            <div className="popup-msg-actions">
              <button className="popup-msg-action-btn" onClick={() => setReplyToMessage(msg)} title="Reply">
                <i className="bi bi-reply" />
              </button>
              {isMe && (
                <>
                  <button className="popup-msg-action-btn" onClick={() => startEditing(msg)} title="Edit">
                    <i className="bi bi-pencil" />
                  </button>
                  <button className="popup-msg-action-btn popup-msg-action-delete"
                    onClick={() => setDeleteModal({ isOpen: true, messageId: msg.id, content: displayContent })}
                    title="Delete">
                    <i className="bi bi-trash" />
                  </button>
                </>
              )}
              <button className="popup-msg-action-btn"
                onClick={() => setInfoModal({ isOpen: true, message: { ...msg, user: isMe ? { id: meId } : { id: user.id, first_name: user.first_name, last_name: user.last_name } } })}
                title="Info">
                <i className="bi bi-info-circle" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── JSX ──
  return (
    <div
      ref={chatWindowRef}
      className="chat-popup"
      style={{ position: "fixed", left: position.x, top: position.y, zIndex: 1000 + index, width: "300px", height: "480px" }}
    >
      {/* Header */}
      <div className="chat-header" onMouseDown={handleMouseDown}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#25d366", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
            {(user.first_name || "?").slice(0, 1).toUpperCase()}
          </div>
          <span className="chat-title" style={{ fontSize: "14px" }}>{user.first_name} {user.last_name || ""}</span>
        </div>
        <button type="button" className="chat-close" onClick={onClose} title="Close">
          <i className="bi bi-x" />
        </button>
      </div>

      {/* Messages */}
      <SimpleBar
        className="chat-body"
        style={{ flex: 1, height: 0, minHeight: 0, overflowY: "auto" }}
        scrollableNodeProps={{ ref: (n) => { scrollRef.current = n; }, onScroll: handleScroll }}
      >
        {groupByDate(messages).map((m, i) => renderMessage(m))}

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div style={{ padding: "4px 8px", fontSize: "11px", color: "#888", fontStyle: "italic" }}>
            {user.first_name} is typing…
          </div>
        )}
      </SimpleBar>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          style={{
            position: "absolute", bottom: "80px", right: "12px",
            width: "32px", height: "32px", borderRadius: "50%",
            border: "none", background: "#6576ff", color: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)", cursor: "pointer",
            zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <i className="bi bi-arrow-down" style={{ fontSize: "14px" }} />
        </button>
      )}

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        message={{ content: deleteModal.content, type: "message" }}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, messageId: null, content: null })}
      />

      {/* Message info modal */}
      <MessageInfoModal
        isOpen={infoModal.isOpen}
        message={infoModal.message}
        onClose={() => setInfoModal({ isOpen: false, message: null })}
      />

      {/* Reply preview */}
      <ReplyPreview replyToMessage={replyToMessage} setReplyToMessage={setReplyToMessage} />

      {/* Edit indicator */}
      {editingMessageId && (
        <div className="modern-edit-preview">
          <div className="modern-edit-preview-content">Editing message</div>
          <button className="modern-edit-preview-close" onClick={cancelEditing}>✕</button>
        </div>
      )}

      {/* Attachment preview */}
      {attachment && (
        <AttachmentInputPreview
          selectedFile={attachment}
          filePreview={attachment.data}
          onRemove={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = null; }}
          isFileUploading={isFileUploading}
        />
      )}

      {/* Input footer */}
      <div className="nk-chat-editor" style={{ borderTop: "1px solid #e0e0e0", background: "#fff", flexShrink: 0 }}>
        <div className="nk-chat-input-group d-flex align-items-center flex-grow-1 py-2 px-3" style={{ gap: "8px" }}>
          {/* Emoji */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((p) => !p)}
            style={{ borderRadius: "50%", width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#f0f2f5", border: "none", cursor: "pointer", position: "relative" }}
          >
            <i className="bi bi-emoji-smile" style={{ fontSize: "18px" }} />
          </button>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} style={{ position: "fixed", bottom: "80px", left: position.x + 8, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "8px", background: "#fff" }}>
              <EmojiPicker onEmojiClick={(e) => { setMessageInput((p) => p + e.emoji); setShowEmojiPicker(false); }} width={280} height={350} previewConfig={{ showPreview: false }} />
            </div>
          )}

          {/* Text input */}
          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              className="modern-chat-input-field"
              rows="1"
              value={messageInput}
              onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (let item of items) {
                  if (item.kind === "file") {
                    const file = item.getAsFile();
                    if (!file) continue;
                    const valid = AttechmentSizeLimit(file, e);
                    if (!valid) return;
                    handleFileChange(file);
                    e.preventDefault();
                    break;
                  }
                }
              }}
              placeholder={editingMessageId ? "Edit message…" : replyToMessage ? "Type reply…" : "Type a message…"}
              style={{ width: "100%", borderRadius: "20px", border: "1px solid #e0e0e0", padding: "8px 12px", resize: "none", minHeight: "36px", fontSize: "13px", outline: "none" }}
            />
          </div>

          {/* Attach */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ borderRadius: "50%", width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#f0f2f5", border: "none", cursor: "pointer" }}
          >
            <i className="bi bi-paperclip" style={{ fontSize: "16px" }} />
          </button>
          <input ref={fileRef} type="file" style={{ display: "none" }}
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { const v = AttechmentSizeLimit(f, e); if (v) handleFileChange(f); } e.target.value = ""; }}
          />

          {/* Send */}
          <button
            type="button"
            onClick={sendMessage}
            disabled={!messageInput.trim() && !attachment}
            style={{ borderRadius: "50%", width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#6576ff", border: "none", cursor: "pointer", color: "#fff", opacity: (!messageInput.trim() && !attachment) ? 0.5 : 1 }}
          >
            {editingMessageId ? <i className="bi bi-check2" style={{ fontSize: "16px" }} /> : <i className="bi bi-send" style={{ fontSize: "14px" }} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
