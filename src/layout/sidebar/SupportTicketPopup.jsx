import "bootstrap-icons/font/bootstrap-icons.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { BiUserPlus, BiXCircle, BiSend } from "react-icons/bi";
import { useDispatch, useSelector } from "react-redux";
import SimpleBar from "simplebar-react";
import { toast } from "react-toastify";
import {
  connectWebSocket,
  getMessages,
  getSocketUrl,
  closeConversation,
  blockUser,
} from "../../Services/widget";
import { joinChat, leaveChat } from "../../redux/slices/chatConnectionSlice";
import AttachmentDisplay from "../../components/custom/Attachment/AttachmentDisplay";
import AttachmentInputPreview from "../../components/custom/Attachment/AttachmentInputPreview";
import DeleteConfirmationModal from "../../components/custom/DeleteConfirmationModal";
import BlockUserModal from "../../components/custom/BlockUserModal";
import { AttechmentSizeLimit } from "../../pages/comman/helper";

const formatTime = (t) =>
  t ? new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const SupportTicketPopup = ({ ticket, onClose, initialPosition, index }) => {
  const dispatch = useDispatch();
  const { joinedTickets } = useSelector((s) => s.chatConnection);

  // Full ticket data passed from SupportChatWidget on minimize
  const {
    ticket_number,
    name,
    email,
    mobile,
    status: initialStatus,
    agent_email,
    site_name,
    _messages: initialMessages,
    _websocketUrl: initialWsUrl,
    _token: initialToken,
    _hasJoined: wasJoined,
  } = ticket;

  const hasJoined = useMemo(
    () => wasJoined || joinedTickets.some((t) => t.ticketNumber === ticket_number),
    [joinedTickets, ticket_number, wasJoined],
  );

  const [messages, setMessages]         = useState(initialMessages || []);
  const [inputText, setInputText]       = useState("");
  const [editingId, setEditingId]       = useState(null);
  const [ticketStatus, setTicketStatus] = useState(initialStatus || "initiated");
  const [submitting, setSubmitting]     = useState(false);
  const [connected, setConnected]       = useState(false);
  const [deleteModal, setDeleteModal]   = useState({ isOpen: false, messageId: null, content: null });
  const [blockModal, setBlockModal]     = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [typingStatus, setTypingStatus] = useState(null);
  const [position, setPosition]         = useState(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging]     = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [attachment, setAttachment]     = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const socketRef     = useRef(null);
  const scrollRef     = useRef(null);
  const chatWindowRef = useRef(null);
  const dragOffset    = useRef({ x: 0, y: 0 });
  const fileInputRef  = useRef(null);
  const typingTimeoutRef = useRef(null);

  const isClosed = ticketStatus === "closed" || ticketStatus === "resolved";
  const canSend  = hasJoined && !isClosed && connected;

  // ── connect WebSocket ──
  const connectSocket = (wsUrl, token) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.close();
    socketRef.current = connectWebSocket(
      ticket_number, token,
      (msg) => {
        // ── error ──
        if (msg.type === "error") {
          toast.error(msg.content || "Server error.");
          return;
        }

        // ── ticket closed ──
        if (msg.message_type === "ticket_closed") {
          setTicketStatus("closed");
          setConnected(false);
          dispatch(leaveChat({ ticketNumber: ticket_number }));
          toast.info(`Ticket #${ticket_number} closed.`);
          // Tell the widget (maximized view) to update this ticket's status
          window.dispatchEvent(new CustomEvent('support-ticket-status-changed', { detail: { ticket_number, status: 'closed' } }));
          return;
        }

        // ── closed by user (content-based detection) ──
        const contentLower = (msg.content || "").toLowerCase();
        if (contentLower.includes("closed by user")) {
          setTicketStatus("closed");
          setConnected(false);
          dispatch(leaveChat({ ticketNumber: ticket_number }));
          toast.info("Ticket closed by user.");
          // Tell the widget (maximized view) to update this ticket's status
          window.dispatchEvent(new CustomEvent('support-ticket-status-changed', { detail: { ticket_number, status: 'closed' } }));
          return;
        }

        // ── typing ──
        if (msg.type === "typing") {
          if (msg.status === "started") {
            setTypingStatus({ sender_type: msg.sender_type, sender_email: msg.sender_email });
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => setTypingStatus(null), 3000);
          } else {
            setTypingStatus(null);
          }
          return;
        }

        // ── message edited ──
        if (["message_edited", "edit"].includes(msg.message_type)) {
          setMessages((prev) => prev.map((m) =>
            m.id === msg.message_id
              ? { ...m, content: msg.content, is_edited: true, timestamp: msg.edited_at || msg.timestamp || m.timestamp }
              : m
          ));
          return;
        }

        // ── read status ──
        if (msg.message_type === "update_status" || msg.type === "status_updated" || msg.message_type === "status_updated") {
          console.log("Message status updated", msg);
          const isRead = msg.is_read || msg.status === "read";
          const readAt = msg.read_at || msg.updated_at || new Date().toISOString();
          setMessages((prev) => prev.map((m) =>
            m.id === msg.message_id ? { ...m, is_read: isRead, read_at: isRead ? readAt : m.read_at } : m
          ));
          return;
        }

        // ── file upload feedback ──
        if (msg.message_type === "file_upload_success") { toast.success(msg.message || "File uploaded."); return; }
        if (msg.message_type === "file_upload_error")   { toast.error(msg.message   || "File upload failed."); return; }

        // ── incoming messages: text, file, notification, agent_message, message ──
        if (["text", "file_upload", "file", "notification", "message", "agent_message"].includes(msg.message_type)) {
          setMessages((prev) => {
            let content = msg.content;
            if (msg.message_type === "file") {
              content = `https://supportdesk.fskindia.com/support/serve-file/${msg.filename}`;
            }
            const nm = {
              ...msg,
              content,
              id: msg.message_id || msg.id,
              is_read: msg.is_read || false,
              sender_type: msg.sender_type || (msg.message_type === "agent_message" ? "agent" : "user"),
              timestamp: msg.timestamp || new Date().toISOString(),
            };

            const existingIndex = prev.findIndex(
              (m) =>
                m.id === nm.id ||
                (String(m.id).startsWith("temp-") && m.content === nm.content)
            );

            let newMessages;
            if (existingIndex !== -1) {
              newMessages = [...prev];
              newMessages[existingIndex] = nm;
            } else {
              newMessages = [...prev, nm];
            }

            return newMessages.slice(-100).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
          // Send update_status for incoming user messages so they're marked read
          const msgId = msg.message_id || msg.id;
          if (msg.sender_type === "user" && msgId && Number.isInteger(Number(msgId))) {
            socketRef.current?.send(JSON.stringify({ type: "update_status", message_id: msgId }));
          }
          return;
        }
      },
      () => {
        setConnected(true);
        // Mark all existing unread user messages as read on connect
        setMessages((prev) => {
          prev.forEach((m) => {
            if (m.sender_type === "user" && !m.is_read && m.id && Number.isInteger(Number(m.id))) {
              socketRef.current?.send(JSON.stringify({ type: "update_status", message_id: m.id }));
            }
          });
          return prev.map((m) =>
            m.sender_type === "user" && !m.is_read ? { ...m, is_read: true } : m
          );
        });
      },
      () => { setConnected(false); dispatch(leaveChat({ ticketNumber: ticket_number })); },
      (err) => console.error("[SupportTicketPopup] WS error:", err),
      wsUrl,
    );
  };

  // ── on mount: reconnect if already joined, else load history ──
  useEffect(() => {
    if (initialWsUrl && initialToken) {
      // Was already connected — reconnect with same credentials
      connectSocket(initialWsUrl, initialToken);
    } else if (!initialMessages?.length) {
      // No history passed — fetch it
      getMessages({ ticket_number })
        .then((data) => setMessages(data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))))
        .catch((err) => console.error("[SupportTicketPopup] load messages:", err));
    }
    return () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auto-scroll ──
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  // ── block user ──
  const handleBlockUser = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      const blocked_by = authData.sub || agent_email || "agent@example.com";
      await blockUser({ email, mobile, ticket_number, blocked_by, reason: "Blocked by agent" });
      toast.success(`User ${name || email} has been blocked.`);
    } catch (err) {
      toast.error(err?.message || "Failed to block user.");
    } finally {
      setBlockModal(false);
    }
  };

  // ── join ──
  const handleJoin = async () => {
    setSubmitting(true);
    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      const agentEmailToUse = agent_email || authData.sub || "agent@example.com";
      const agentName = authData.user?.first_name
        ? `${authData.user.first_name} ${authData.user.last_name || ""}`.trim()
        : "Agent";
      const response = await getSocketUrl(ticket_number, agentEmailToUse, agentName);
      if (!response?.websocket_url || !response?.token) {
        toast.error("Failed to retrieve WebSocket details.");
        return;
      }
      const wsUrl = response.websocket_url.replace(/^ws:\/\//, "wss://");
      connectSocket(wsUrl, response.token);
      dispatch(joinChat({ ticketNumber: ticket_number }));
      setTicketStatus("agent_engaged");
    } catch (err) {
      toast.error("Failed to join ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── close ──
  const handleClose = async () => {
    setSubmitting(true);
    try {
      await closeConversation({ ticket_number, close_by_agent: true });
      toast.success("Ticket closed.");
      // Broadcast ticket_closed via WebSocket so the user is notified — same as main widget
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          message_type: "ticket_closed",
          content: `Ticket ${ticket_number} closed by agent`,
          sender_type: "agent",
          sender_email: agent_email,
          timestamp: new Date().toISOString(),
        }));
        socketRef.current.close();
      }
      dispatch(leaveChat({ ticketNumber: ticket_number }));
      setTicketStatus("closed");
      setConnected(false);
      // Tell the widget (maximized view) to update this ticket's status
      window.dispatchEvent(new CustomEvent('support-ticket-status-changed', { detail: { ticket_number, status: 'closed' } }));
    } catch (err) {
      toast.error(err?.message || "Failed to close ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── send / edit ──
  const sendMessage = () => {
    const text = inputText.trim();
    if (!text || !canSend) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected.");
      return;
    }

    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    const agentName = authData.user?.first_name
      ? `${authData.user.first_name} ${authData.user.last_name || ""}`.trim()
      : "Agent";

    if (editingId) {
      // Edit existing message
      const payload = {
        type: "edit",
        message_id: editingId,
        content: text,
        ticket_number,
        sender_type: "agent",
        sender_email: agent_email,
        edited_by: agent_email,
        edited_at: new Date().toISOString(),
      };
      socketRef.current.send(JSON.stringify(payload));
      setMessages((prev) => prev.map((m) =>
        m.id === editingId ? { ...m, content: text, is_edited: true } : m
      ));
      setEditingId(null);
      setInputText("");
      return;
    }

    // New message — use same payload shape as main widget
    const payload = {
      message_type: "text",
      sender_type: "agent",
      sender_email: agent_email,
      sender_name: agentName,
      content: text,
      ticket_number,
      timestamp: new Date().toISOString(),
    };
    socketRef.current.send(JSON.stringify(payload));
    // Optimistic
    setMessages((prev) => [...prev, { ...payload, id: `temp-${Date.now()}`, is_read: false }]);
    setInputText("");
  };

  // ── delete ──
  const deleteMessage = (messageId) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected.");
      return;
    }
    socketRef.current.send(JSON.stringify({ type: "delete", message_id: messageId, ticket_number }));
    setMessages((prev) => prev.map((m) =>
      m.id === messageId ? { ...m, content: "", is_deleted: true } : m
    ));
  };

  const startEditing = (msg) => {
    setEditingId(msg.id);
    setInputText(msg.content || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setInputText("");
  };

  // ── drag-and-drop file handlers ──
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    const files = Array.from(e.dataTransfer.files || []);
    files.forEach((f) => handleFileSelect(f));
  };

  // ── file select (from input click or paste) ──
  const handleFileSelect = (file) => {
    if (!file) return;
    const valid = AttechmentSizeLimit(file, { target: { value: null } });
    if (!valid) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (file.type.startsWith("image/")) {
        setAttachmentPreview({ url: reader.result, type: "image", name: file.name });
      } else if (file.type === "application/pdf") {
        setAttachmentPreview({ type: "pdf", name: file.name, url: reader.result });
      } else {
        setAttachmentPreview({ type: "doc", name: file.name, url: reader.result });
      }
      setAttachment({
        base64: reader.result.split(",")[1],
        type: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // ── send file message via WebSocket ──
  const sendFileMessage = () => {
    if (!attachment || !canSend) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Not connected.");
      return;
    }

    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    const agentName = authData.user?.first_name
      ? `${authData.user.first_name} ${authData.user.last_name || ""}`.trim()
      : "Agent";

    const payload = {
      message_type: "file_upload",
      sender_type: "agent",
      sender_email: agent_email,
      sender_name: agentName,
      content: attachment.base64,
      filename: attachment.name,
      file_type: attachment.type,
      ticket_number,
      timestamp: new Date().toISOString(),
    };
    socketRef.current.send(JSON.stringify(payload));
    // No optimistic message — the server will respond with the real file message
    // including the server-generated filename, so we avoid showing a broken URL.
    setAttachment(null);
    setAttachmentPreview(null);
  };

  // ── copy text to clipboard ──
  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy");
    });
  };

  const statusColor = {
    initiated:     "#0ea5e9",
    agent_engaged: "#22c55e",
    resolved:      "#6366f1",
    closed:        "#ef4444",
    transferred:   "#f59e0b",
  }[ticketStatus] || "#6b7280";

  return (
    <div
      ref={chatWindowRef}
      style={{
        position: "fixed", left: position.x, top: position.y,
        zIndex: 1000 + index, width: "300px", height: "480px",
        background: "#fff", borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        border: "1px solid #e0e0e0",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{ background: "#6366f1", color: "#fff", padding: "10px 14px", cursor: "move", flexShrink: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {name || "Support"}
            </div>
            <div style={{ fontSize: "10px", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block", flexShrink: 0 }} />
              <span style={{ opacity: 0.85 }}>{ticketStatus}</span>
              {connected && <span style={{ opacity: 0.7 }}>· live</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0, marginLeft: "8px" }}>
            {/* User info toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowUserInfo((p) => !p); }}
              title="User info"
              style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}
            >
              <i className="bi bi-person" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setBlockModal(true); }}
              title="Block user"
              style={{ background: "rgba(239,68,68,0.3)", border: "none", color: "#fff", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}
            >
              <i className="bi bi-slash-circle" />
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* User info panel */}
        {showUserInfo && (
          <div style={{ marginTop: "8px", background: "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 10px", fontSize: "11px" }}>
            {name   && <div><span style={{ opacity: 0.75 }}>Name: </span>{name}</div>}
            {email  && <div><span style={{ opacity: 0.75 }}>Email: </span>{email}</div>}
            {mobile && <div><span style={{ opacity: 0.75 }}>Phone: </span>{mobile}</div>}
            {site_name && <div><span style={{ opacity: 0.75 }}>Site: </span>{site_name}</div>}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        style={{ position: "relative", flex: 1, height: 0, minHeight: 0 }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDraggingFiles && (
          <div
            style={{
              position: "absolute", inset: 0, zIndex: 100,
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              border: "2px dashed #6366f1",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ textAlign: "center", color: "#6366f1", fontWeight: 600, fontSize: "14px" }}>
              <div style={{ marginBottom: "8px", fontSize: "24px" }}>📁</div>
              <div>Drop file to upload</div>
            </div>
          </div>
        )}
        <SimpleBar
          style={{ height: "100%", overflowY: "auto", padding: "12px", background: "#f8f9fa" }}
          scrollableNodeProps={{ ref: (n) => { scrollRef.current = n; } }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "#aaa", fontSize: "12px", marginTop: "20px" }}>No messages yet</div>
          )}
          {messages.map((msg, i) => {
            // Correct: use sender_type, not message_type (both agent and user send message_type:"text")
            const isAgent = msg.sender_type === "agent" || msg.message_type === "agent_message";
            const text = msg.message || msg.content || "";
            const isDeleted = msg.is_deleted;
            const myEmail = JSON.parse(localStorage.getItem("auth") || "{}").user?.email || agent_email;
            const isOwn = isAgent && (msg.sender_email === myEmail || msg.sender_email === agent_email);
            // Check if this is a file message (has a filename or URL that looks like a file)
            const isFileMsg = msg.message_type === "file" || msg.message_type === "file_upload" || msg.filename;
            return (
              <div key={msg.id || i} style={{ display: "flex", flexDirection: "column", alignItems: isAgent ? "flex-end" : "flex-start", marginBottom: "8px" }}>
                <div style={{
                  maxWidth: "80%", padding: isFileMsg && !isDeleted ? (isAgent ? "0" : "8px 12px") : "8px 12px",
                  borderRadius: isAgent ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isAgent ? (isFileMsg && !isDeleted ? "transparent" : "#6366f1") : "#fff",
                  color: isAgent ? "#fff" : "#333",
                  border: isAgent ? (isFileMsg && !isDeleted ? "none" : "none") : "1px solid #e9ecef",
                  fontSize: "13px", wordBreak: "break-word",
                  boxShadow: isFileMsg && !isDeleted ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
                  opacity: isDeleted ? 0.5 : 1,
                }}>
                  {isDeleted ? (
                    <em style={{ fontSize: "11px" }}>Message deleted</em>
                  ) : isFileMsg ? (
                    <AttachmentDisplay
                      attachment={{
                        url: text,
                        filename: msg.filename || msg.content?.split("/").pop(),
                      }}
                      isMe={isAgent}
                      message={msg}
                    />
                  ) : (
                    text
                  )}
                  {msg.is_edited && !isDeleted && !isFileMsg && <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "4px" }}>(edited)</span>}
                  <div style={{ fontSize: "10px", opacity: 0.65, textAlign: "right", marginTop: isDeleted || isFileMsg ? "3px" : "3px", display: "flex", justifyContent: "flex-end", gap: "6px", alignItems: "center" }}>
                    <span>{formatTime(msg.timestamp)}</span>
                    {/* Seen tick — only on agent messages */}
                    {isAgent && !isDeleted && (
                      msg.is_read
                        ? <i className="bi bi-check2-all" style={{ fontSize: "13px", color: "#34B7F1" }} title="Seen" />
                        : <i className="bi bi-check2" style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }} title="Sent" />
                    )}
                    {/* Copy — own agent messages */}
                    {isOwn && !isDeleted && !isFileMsg && (
                      <button onClick={() => copyToClipboard(text)} style={{ background: "none", border: "none", color: isAgent ? "rgba(255,255,255,0.7)" : "#999", cursor: "pointer", padding: 0, fontSize: "11px" }} title="Copy">
                        <i className="bi bi-files" />
                      </button>
                    )}
                    {/* Edit / Delete — only own agent messages, not deleted */}
                    {isOwn && !isDeleted && !isFileMsg && canSend && (
                      <>
                        <button onClick={() => startEditing(msg)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: 0, fontSize: "11px" }} title="Edit">
                          <i className="bi bi-pencil" />
                        </button>
                        <button onClick={() => setDeleteModal({ isOpen: true, messageId: msg.id, content: text })} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: 0, fontSize: "11px" }} title="Delete">
                          <i className="bi bi-trash" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingStatus && (
            <div style={{ fontSize: "11px", color: "#888", fontStyle: "italic", padding: "4px 0" }}>
              {typingStatus.sender_type === "user" ? (name || "User") : "Agent"} is typing…
            </div>
          )}
        </SimpleBar>
      </div>

      {/* Delete confirmation */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        message={{ content: deleteModal.content, type: "message" }}
        onConfirm={() => { deleteMessage(deleteModal.messageId); setDeleteModal({ isOpen: false, messageId: null, content: null }); }}
        onCancel={() => setDeleteModal({ isOpen: false, messageId: null, content: null })}
      />

      {/* Block user confirmation */}
      <BlockUserModal
        isOpen={blockModal}
        userName={name || email}
        onConfirm={handleBlockUser}
        onCancel={() => setBlockModal(false)}
      />

      {/* Attachment preview */}
      <AttachmentInputPreview
        selectedFile={attachment}
        filePreview={attachmentPreview?.url}
        onRemove={() => { setAttachment(null); setAttachmentPreview(null); }}
      />

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e0e0e0", background: "#fff", flexShrink: 0 }}>
        {isClosed ? (
          <div style={{ padding: "10px 14px", fontSize: "12px", color: "#888", textAlign: "center" }}>
            This ticket is {ticketStatus}. View only.
          </div>
        ) : (
          <>
            <div style={{ padding: "8px 12px", display: "flex", gap: "8px", alignItems: "center" }}>
              {editingId && (
                <div style={{ padding: "4px 10px", background: "rgba(255,193,7,0.1)", borderLeft: "3px solid #ffc107", fontSize: "11px", color: "#856404", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", borderRadius: "4px", width: "100%" }}>
                  <span>Editing message</span>
                  <button onClick={cancelEditing} style={{ background: "none", border: "none", cursor: "pointer", color: "#856404", fontSize: "13px" }}>✕</button>
                </div>
              )}
            </div>
            <div style={{ padding: "0 12px 8px", display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (attachment) {
                      sendFileMessage();
                    } else {
                      sendMessage();
                    }
                  }
                }}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let item of items) {
                    if (item.kind === "file") {
                      const file = item.getAsFile();
                      if (!file) continue;
                      handleFileSelect(file);
                      e.preventDefault();
                      break;
                    }
                  }
                }}
                placeholder={canSend ? (editingId ? "Edit message…" : "Type a message…") : "Join to send messages"}
                disabled={!canSend}
                style={{ flex: 1, borderRadius: "20px", border: "1px solid #e0e0e0", padding: "8px 12px", fontSize: "13px", outline: "none", background: canSend ? "#fff" : "#f5f5f5", color: canSend ? "#333" : "#aaa" }}
              />
              {/* Attachment button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canSend}
                title="Attach file"
                style={{ borderRadius: "50%", width: 34, height: 34, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid #e0e0e0", cursor: canSend ? "pointer" : "not-allowed", color: "#888", opacity: canSend ? 1 : 0.4, flexShrink: 0 }}
              >
                <i className="bi bi-paperclip" style={{ fontSize: "14px" }} />
              </button>
              <button
                onClick={() => {
                  if (attachment) {
                    sendFileMessage();
                  } else {
                    sendMessage();
                  }
                }}
                disabled={!canSend || (!inputText.trim() && !attachment)}
                style={{ borderRadius: "50%", width: 34, height: 34, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", background: editingId ? "#ffc107" : "#6366f1", border: "none", cursor: canSend && (inputText.trim() || attachment) ? "pointer" : "not-allowed", color: editingId ? "#333" : "#fff", opacity: (!canSend || (!inputText.trim() && !attachment)) ? 0.4 : 1, flexShrink: 0 }}
              >
                {editingId ? <i className="bi bi-check2" style={{ fontSize: "14px" }} /> : <BiSend size={14} />}
              </button>
            </div>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
            />
            <div style={{ padding: "0 12px 10px", display: "flex", gap: "8px" }}>
              {!hasJoined && (
                <button className="btn btn-success btn-sm" onClick={handleJoin} disabled={submitting} style={{ flex: 1, fontSize: "12px" }}>
                  <BiUserPlus style={{ marginRight: 4 }} />
                  {submitting ? "Joining…" : "Join Chat"}
                </button>
              )}
              {hasJoined && (
                <button className="btn btn-danger btn-sm" onClick={handleClose} disabled={submitting} style={{ flex: 1, fontSize: "12px" }}>
                  <BiXCircle style={{ marginRight: 4 }} />
                  {submitting ? "Closing…" : "Close"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SupportTicketPopup;
