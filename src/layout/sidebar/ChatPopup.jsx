import "bootstrap-icons/font/bootstrap-icons.css";
import EmojiPicker from "emoji-picker-react";
import { useContext, useEffect, useRef, useState } from "react";
import SimpleBar from "simplebar-react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { clearUnreadCount } from "../../redux/slices/recentChatsSlice";
import AttachmentDisplay from "../../components/custom/Attachment/AttachmentDisplay";
import AttachmentInputPreview from "../../components/custom/Attachment/AttachmentInputPreview";
import DeleteConfirmationModal from "../../components/custom/DeleteConfirmationModal";
import MessageInfoModal from "../../components/custom/MessageInfoModal";
import ReplyPreview from "../../components/custom/ReplyPreview";
import { AttechmentSizeLimit, isOnlyEmojis } from "../../pages/comman/helper";
import { DirectChatContext } from "../../pages/app/chat/DirectChatContext";
import ForwardMessageModal from "../../pages/app/chat/modals/ForwardMessageModal";
import chatService from "../../Services/ChatService";
import "./ChatPopup.css";

const formatTime = (t) =>
  t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const ChatPopup = ({ user, onClose, initialPosition, index }) => {
  // ── consume shared context ──
  const direct = useContext(DirectChatContext);
  const dispatch = useDispatch();

  // ── drag state only ──
  const [position, setPosition]           = useState(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging]       = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteModal, setDeleteModal]     = useState({ isOpen: false, messageId: null, content: null });
  const [infoModal, setInfoModal]         = useState({ isOpen: false, message: null });
  const [forwardModal, setForwardModal]   = useState({ show: false, message: null });
  const [forwardSearch, setForwardSearch] = useState("");

  const scrollRef      = useRef(null);
  const fileRef        = useRef(null);
  const emojiPickerRef = useRef(null);
  const chatWindowRef  = useRef(null);
  const dragOffset     = useRef({ x: 0, y: 0 });

  const meId = direct?.ME_ID;

  // ── select this user in the per-popup context on mount ──
  useEffect(() => {
    console.log('[ChatPopup] 🔍 Mount effect triggered');
    console.log('[ChatPopup] 📦 user object:', user);
    console.log('[ChatPopup] 🆔 user.id:', user?.id);
    console.log('[ChatPopup] 🎯 direct context exists:', !!direct);
    console.log('[ChatPopup] 🎯 direct.selectUser exists:', !!direct?.selectUser);
    console.log('[ChatPopup] 🎯 direct.ME_ID:', direct?.ME_ID);
    console.log('[ChatPopup] 📊 direct.users count:', direct?.users?.length || 0);
    
    if (direct?.selectUser && user?.id) {
      console.log(`[ChatPopup] ✅ Calling selectUser(${user.id}, ${user.conversation_id || user.pairKey || 'null'})`);
      direct.selectUser(user.id, user.conversation_id || user.pairKey);
      // Clear unread count in Redux when popup opens
      dispatch(clearUnreadCount(user.id));
      chatService.markAsRead(user.id);
    } else {
      console.error('[ChatPopup] ❌ Cannot select user:', { 
        hasSelectUser: !!direct?.selectUser, 
        hasUserId: !!user?.id,
        user: user
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Re-select user when users array is populated (fixes race condition)
  useEffect(() => {
    if (direct?.users?.length > 0 && user?.id && direct?.activeConversationId === null) {
      console.log('[ChatPopup] 🔄 Users loaded, re-selecting user:', user.id);
      direct.selectUser(user.id, user.conversation_id || user.pairKey);
    }
  }, [direct?.users?.length, user?.id, direct?.activeConversationId, direct, user?.conversation_id, user?.pairKey]);

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

  // ── drag-and-drop file ──
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
      direct?.handleFileChange(valid);
    };
    el.addEventListener("dragover", over);
    el.addEventListener("drop",     drop);
    return () => { el.removeEventListener("dragover", over); el.removeEventListener("drop", drop); };
  }, [direct]);

  // ── auto-scroll ──
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [direct?.messages]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setShowScrollDown(scrollHeight - scrollTop > clientHeight + 80);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setShowScrollDown(false);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`popup-msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "rgba(255,193,7,0.3)";
      setTimeout(() => { el.style.background = ""; }, 2000);
    }
  };

  const confirmDelete = () => {
    if (!deleteModal.messageId) return;
    direct?.deleteMessage(deleteModal.messageId);
    setDeleteModal({ isOpen: false, messageId: null, content: null });
  };

  const sendMessage = () => {
    if (direct?.editContent?.trim() || direct?.attachment) {
      direct.sendMessage(direct.editContent);
      direct.setEditContent("");
      direct.setReplyToMessage(null);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  // ── render message ──
  const renderMessage = (msg) => {
    if (msg._divider || msg.type === "unread_divider") return null;

    const isMe = Number(msg.sender_id) === Number(meId);
    const isReply = msg.type === "message_reply" || msg.type === "reply";
    const displayContent = msg.reply_content || msg.content;
    const isEmojiOnly = !msg.is_deleted && !msg.attachment && isOnlyEmojis(displayContent);

    // Resolve original message for reply context
    let originalContent = null;
    let originalSenderName = null;
    if (isReply && msg.message_id) {
      const orig = direct?.messages?.find((m) => m.id === msg.message_id);
      originalContent = msg.parent_content || orig?.content || orig?.reply_content || "Original message";
      originalSenderName = Number(orig?.sender_id) === Number(meId) ? "You" : user.first_name;
    }

    return (
      <div
        key={msg.id}
        id={`popup-msg-${msg.id}`}
        style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: "10px" }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", flexDirection: isMe ? "row-reverse" : "row" }}>
          {/* Bubble */}
          <div style={{
            maxWidth: "78%", padding: isEmojiOnly ? "4px" : "8px 12px",
            borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            background: isMe ? "#6576ff" : "#fff",
            color: isMe ? "#fff" : "#333",
            border: isMe ? "none" : "1px solid #e9ecef",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
            wordBreak: "break-word",
          }}>
            {/* Forwarded label */}
            {(msg.type === "forward_message" || msg.type === "forward_to_dm" || msg.forwarded || msg.is_forwarded || msg.forwarded_from_message_id) && !msg.is_deleted && (
              <div style={{ fontSize: "10px", opacity: 0.65, marginBottom: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
                <i className="bi bi-reply-fill" style={{ fontSize: "10px", transform: "scaleX(-1)" }} />
                <span>Forwarded{msg.source_system ? ` from ${msg.source_system === 'dm' ? 'DM' : msg.source_system === 'group_message' ? 'Group' : msg.source_system === 'group_reply' ? 'Group Reply' : msg.source_system}` : ''}</span>
              </div>
            )}

            {/* Reply context */}
            {isReply && originalContent && (
              <div onClick={() => scrollToMessage(msg.message_id)} style={{
                cursor: "pointer", marginBottom: "6px",
                background: isMe ? "rgba(255,255,255,0.2)" : "#f0f0f0",
                borderLeft: `3px solid ${isMe ? "rgba(255,255,255,0.6)" : "#6576ff"}`,
                borderRadius: "4px", padding: "4px 8px", fontSize: "11px",
                color: isMe ? "rgba(255,255,255,0.85)" : "#555",
              }}>
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
                  msg.read
                    ? <i className="bi bi-check2-all" style={{ fontSize: "12px", color: "#a8d8ff" }} />
                    : msg.delivered
                      ? <i className="bi bi-check2-all" style={{ fontSize: "12px", opacity: 0.5 }} />
                      : <i className="bi bi-check2" style={{ fontSize: "12px", opacity: 0.5 }} />
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!msg.is_deleted && (
            <div className="popup-msg-actions">
              <button className="popup-msg-action-btn" onClick={() => direct?.handleReply(msg)} title="Reply">
                <i className="bi bi-reply" />
              </button>
              <button className="popup-msg-action-btn" onClick={() => setForwardModal({ show: true, message: msg })} title="Forward">
                <i className="bi bi-forward" />
              </button>
              {isMe && (
                <>
                  <button className="popup-msg-action-btn" onClick={() => direct?.startEditing(msg)} title="Edit">
                    <i className="bi bi-pencil" />
                  </button>
                  <button className="popup-msg-action-btn popup-msg-action-delete"
                    onClick={() => { direct?.setDeleteType(""); setDeleteModal({ isOpen: true, messageId: msg.id, content: displayContent }); }}
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

  const messages = direct?.messages || [];

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
        {messages.filter(m => !m._divider && m.type !== "unread_divider").map((m) => renderMessage(m))}

        {/* Typing indicator */}
        {direct?.typingUsers && Object.keys(direct.typingUsers).length > 0 && (
          <div style={{ padding: "4px 8px", fontSize: "11px", color: "#888", fontStyle: "italic" }}>
            {user.first_name} is typing…
          </div>
        )}
      </SimpleBar>

      {/* Scroll to bottom */}
      {showScrollDown && (
        <button onClick={scrollToBottom} style={{
          position: "absolute", bottom: "80px", right: "12px",
          width: "32px", height: "32px", borderRadius: "50%",
          border: "none", background: "#6576ff", color: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)", cursor: "pointer",
          zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
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

      {/* Message info */}
      <MessageInfoModal
        isOpen={infoModal.isOpen}
        message={infoModal.message}
        onClose={() => setInfoModal({ isOpen: false, message: null })}
      />

      {/* Forward modal */}
      <ForwardMessageModal
        show={forwardModal.show}
        onClose={() => { setForwardModal({ show: false, message: null }); setForwardSearch(""); }}
        forwardMessage={forwardModal.message}
        forwardSearch={forwardSearch}
        setForwardSearch={setForwardSearch}
        recentForwardUsers={(direct?.recentChats || []).map(c => {
          const u = direct?.allUsers?.find(u => u.id === c.recipient_id);
          return u || null;
        }).filter(Boolean)}
        allForwardUsers={(direct?.allUsers || []).filter(u =>
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(forwardSearch.toLowerCase())
        )}
        onForward={(messageId, recipientId) => direct?.forwardMessage?.(messageId, recipientId)}
        groups={[]}
        onForwardToGroup={(msg, groupId) => direct?.forwardMessageToGroup?.(msg, groupId)}
        currentGroupId={null}
      />

      {/* Reply preview */}
      <ReplyPreview replyToMessage={direct?.replyToMessage} setReplyToMessage={direct?.setReplyToMessage} />

      {/* Edit indicator */}
      {direct?.editingMessageId && (
        <div className="modern-edit-preview">
          <div className="modern-edit-preview-content">Editing message</div>
          <button className="modern-edit-preview-close" onClick={direct?.cancelEditing}>✕</button>
        </div>
      )}

      {/* Attachment preview */}
      {direct?.attachment && (
        <AttachmentInputPreview
          selectedFile={direct.attachment}
          filePreview={direct.attachment.data}
          onRemove={() => { direct.setAttachment(null); if (fileRef.current) fileRef.current.value = null; }}
          isFileUploading={direct.isFileUploading}
        />
      )}

      {/* Input */}
      <div className="nk-chat-editor" style={{ borderTop: "1px solid #e0e0e0", background: "#fff", flexShrink: 0 }}>
        <div className="nk-chat-input-group d-flex align-items-center flex-grow-1 py-2 px-3" style={{ gap: "8px" }}>
          <button type="button" onClick={() => setShowEmojiPicker((p) => !p)}
            style={{ borderRadius: "50%", width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#f0f2f5", border: "none", cursor: "pointer" }}>
            <i className="bi bi-emoji-smile" style={{ fontSize: "18px" }} />
          </button>

          {showEmojiPicker && (
            <div ref={emojiPickerRef} style={{ position: "fixed", bottom: "80px", left: position.x + 8, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "8px", background: "#fff" }}>
              <EmojiPicker onEmojiClick={(e) => { direct?.setEditContent((p) => p + e.emoji); setShowEmojiPicker(false); }} width={280} height={350} previewConfig={{ showPreview: false }} />
            </div>
          )}

          <div style={{ flex: 1, position: "relative" }}>
            <textarea
              className="modern-chat-input-field"
              rows="1"
              value={direct?.editContent || ""}
              onChange={(e) => { direct?.setEditContent(e.target.value); direct?.handleTyping(); }}
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
                    direct?.handleFileChange(valid);
                    e.preventDefault();
                    break;
                  }
                }
              }}
              placeholder={direct?.editingMessageId ? "Edit message…" : direct?.replyToMessage ? "Type reply…" : "Type a message…"}
              style={{ width: "100%", borderRadius: "20px", border: "1px solid #e0e0e0", padding: "8px 12px", resize: "none", minHeight: "36px", fontSize: "13px", outline: "none" }}
            />
          </div>

          <button type="button" onClick={() => fileRef.current?.click()}
            style={{ borderRadius: "50%", width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#f0f2f5", border: "none", cursor: "pointer" }}>
            <i className="bi bi-paperclip" style={{ fontSize: "16px" }} />
          </button>
          <input ref={fileRef} type="file" style={{ display: "none" }}
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { const v = AttechmentSizeLimit(f, e); if (v) direct?.handleFileChange(v); } e.target.value = ""; }}
          />

          <button type="button" onClick={sendMessage}
            disabled={!direct?.editContent?.trim() && !direct?.attachment}
            style={{ borderRadius: "50%", width: 36, height: 36, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#6576ff", border: "none", cursor: "pointer", color: "#fff", opacity: (!direct?.editContent?.trim() && !direct?.attachment) ? 0.5 : 1 }}>
            {direct?.editingMessageId ? <i className="bi bi-check2" style={{ fontSize: "16px" }} /> : <i className="bi bi-send" style={{ fontSize: "14px" }} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPopup;
