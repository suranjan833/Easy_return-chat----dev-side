import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BiPaperclip } from "react-icons/bi";
import { getAgentInfoByEmail } from "../../Services/api";
import { isOnlyEmojis } from "../comman/helper";

const ChatMessages = ({
  messages,
  selectedTicket,
  isAgentWithFallback,
  isHumanHandoff,
  typingStatus,
  handleReplyToMessage,
  onEditMessage,
  handleDeleteMessage,
  hasJoined,
  setMessageToDelete,
  chatBodyRef,
}) => {
  const [agentNames, setAgentNames] = useState({});
  const [loadingAgents, setLoadingAgents] = useState(new Set());
  const [readPopupId, setReadPopupId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRefs = useRef({});

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const openRef = menuRefs.current[openMenuId];
      if (openRef && !openRef.contains(e.target)) setOpenMenuId(null);
    };
    if (openMenuId !== null) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const canEdit = (timestamp) =>
    (new Date().getTime() - new Date(timestamp).getTime()) <= 1 * 60 * 1000;

  const scrollToMessage = (messageId) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "#fff3cd";
      setTimeout(() => { el.style.background = ""; }, 2000);
    }
  };

  const renderMessageWithLinks = (text) => {
    if (!text) return text;
    const urlRegex = /\b((https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    const elements = [];
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const start = match.index;
      if (start > lastIndex) {
        elements.push(text.substring(lastIndex, start));
      }
      const href = url.startsWith("http") ? url : `https://${url}`;
      elements.push(
        <a
          key={start}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0056b3", textDecoration: "underline" }}
        >
          {url}
        </a>
      );
      lastIndex = start + url.length;
    }

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }
    return elements;
  };

  const fetchAgentName = useCallback(async (email) => {
    if (!email || agentNames[email] || loadingAgents.has(email)) return;
    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    if (authData.user) {
      const fullName = authData.user?.first_name && authData.user?.last_name
        ? `${authData.user.first_name} ${authData.user.last_name}`
        : authData.user?.name;
      if (fullName && fullName !== email) {
        setAgentNames((prev) => ({ ...prev, [email]: fullName }));
        return;
      }
    }
    setLoadingAgents((prev) => new Set(prev).add(email));
    try {
      const agentInfo = await getAgentInfoByEmail(email);
      const fullName = agentInfo?.first_name && agentInfo?.last_name
        ? `${agentInfo.first_name} ${agentInfo.last_name}`.trim()
        : email;
      setAgentNames((prev) => ({ ...prev, [email]: fullName }));
    } catch {
      setAgentNames((prev) => ({ ...prev, [email]: email }));
    } finally {
      setLoadingAgents((prev) => { const s = new Set(prev); s.delete(email); return s; });
    }
  }, [agentNames, loadingAgents]);

  const agentEmails = useMemo(() => {
    const emails = new Set();
    messages.forEach((msg) => {
      if (msg.sender_type === "agent" && msg.sender_email &&
        !agentNames[msg.sender_email] && !loadingAgents.has(msg.sender_email))
        emails.add(msg.sender_email);
    });
    return Array.from(emails);
  }, [messages, agentNames, loadingAgents]);

  useEffect(() => {
    agentEmails.forEach((email) => fetchAgentName(email));
  }, [agentEmails, fetchAgentName]);

  const getSenderLabel = useCallback((msg) => {
    const senderType = typeof msg.sender_type === "string" && msg.sender_type
      ? msg.sender_type.charAt(0).toUpperCase() + msg.sender_type.slice(1)
      : "Unknown";
    let senderDisplay;
    if (msg.sender_type === "user" && selectedTicket?.name) {
      senderDisplay = selectedTicket.name;
    } else if (msg.sender_type === "agent") {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      if (authData.user) {
        senderDisplay = authData.user?.first_name && authData.user?.last_name
          ? `${authData.user.first_name} ${authData.user.last_name}`
          : authData.user?.name || "Agent";
      } else if (msg.sender_email && agentNames[msg.sender_email] && agentNames[msg.sender_email] !== msg.sender_email) {
        senderDisplay = agentNames[msg.sender_email];
      } else if (msg.sender_name && msg.sender_name !== msg.sender_email) {
        senderDisplay = msg.sender_name;
      } else if (selectedTicket?.agent_name && selectedTicket.agent_name !== msg.sender_email) {
        senderDisplay = selectedTicket.agent_name;
      } else {
        senderDisplay = msg.sender_email || "Agent";
      }
    } else {
      senderDisplay = msg.sender_email || "N/A";
    }
    return `${senderType} (${senderDisplay})`;
  }, [agentNames, selectedTicket]);

  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isToday = messageDate.toDateString() === today.toDateString();
    const isYesterday = messageDate.toDateString() === yesterday.toDateString();
    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const isAgentMsg = (msg) => msg.sender_type === "agent" || msg.sender_type === "bot";
  const isClosed = selectedTicket?.status === "closed";

  const renderMenu = (msg) => {
    const isAgent = isAgentMsg(msg);
    const showEdit = isAgent && canEdit(msg.timestamp) && !isClosed;
    const showDelete = isAgent && !isClosed;
    if (!hasJoined || (!showEdit && !showDelete && !handleReplyToMessage)) return null;

    return (
      <span
        ref={(el) => { if (el) menuRefs.current[msg.id] = el; }}
        style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      >
        <button
          className="btn btn-sm bg-transparent border-0 p-0"
          style={{ opacity: 0.6, lineHeight: 1, color: isAgent ? "#fff" : "#333" }}
          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg.id ? null : msg.id); }}
          aria-label="Message options"
        >
          <i className="bi bi-three-dots-vertical" style={{ fontSize: "14px" }} />
        </button>
        {openMenuId === msg.id && (
          <ul style={{
            position: "absolute", bottom: "22px", right: 0,
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            listStyle: "none", margin: 0, padding: "4px 0",
            minWidth: "120px", zIndex: 9999,
          }}>
            <li>
              <button className="w-100 text-start px-3 py-2 border-0 bg-transparent"
                style={{ fontSize: "13px", cursor: "pointer", color: "#111" }}
                onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                onClick={() => { setOpenMenuId(null); handleReplyToMessage(msg.id); }}>
                <i className="bi bi-reply me-2" />Reply
              </button>
            </li>
            {showEdit && (
              <li>
                <button className="w-100 text-start px-3 py-2 border-0 bg-transparent"
                  style={{ fontSize: "13px", cursor: "pointer", color: "#111" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#f3f4f6"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  onClick={() => { setOpenMenuId(null); onEditMessage(msg.id, msg.content); }}>
                  <i className="bi bi-pencil me-2" />Edit
                </button>
              </li>
            )}
            {showDelete && (
              <li>
                <button className="w-100 text-start px-3 py-2 border-0 bg-transparent"
                  style={{ fontSize: "13px", cursor: "pointer", color: "#dc3545" }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#fff5f5"}
                  onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                  onClick={() => { setOpenMenuId(null); setMessageToDelete(msg); }}>
                  <i className="bi bi-trash me-2" />Delete
                </button>
              </li>
            )}
          </ul>
        )}
      </span>
    );
  };

  const renderTimestamp = (msg) => (
    <small style={{ fontSize: "10px", color: isAgentMsg(msg) ? "rgba(255,255,255,0.7)" : "#888" }}>
      {new Date(msg.timestamp).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "numeric", hour12: true,
      })}
    </small>
  );

  const renderReadStatus = (msg) => {
    if (!isAgentMsg(msg)) return null;
    return msg.is_read ? (
      <span onMouseEnter={() => setReadPopupId(msg.id)} onMouseLeave={() => setReadPopupId(null)}
        style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
        <i className="bi bi-check2-all" style={{ fontSize: "14px", color: "#34B7F1", cursor: "pointer" }} />
        {readPopupId === msg.id && (
          <div style={{
            position: "absolute", bottom: "22px", right: 0,
            background: "#222", color: "#fff", padding: "6px 8px",
            fontSize: "11px", borderRadius: "6px", whiteSpace: "nowrap",
            zIndex: 1000, boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}>
            <div><strong>Sent:</strong> {new Date(msg.timestamp).toLocaleString()}</div>
            <div><strong>Read:</strong> {msg.read_at ? new Date(msg.read_at).toLocaleString() : "Not read yet"}</div>
          </div>
        )}
      </span>
    ) : (
      <i className="bi bi-check2" style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }} />
    );
  };

  const renderMessageFooter = (msg) => (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px", marginTop: "4px" }}>
      {msg.is_edited && <small style={{ fontSize: "10px", opacity: 0.7, fontStyle: "italic" }}>(edited)</small>}
      {renderTimestamp(msg)}
      {renderReadStatus(msg)}
      {!msg.is_deleted && renderMenu(msg)}
    </div>
  );

  const renderContent = (msg) => {
    // Deleted message — same style as one-to-one chat
    if (msg.is_deleted) {
      return (
        <span style={{ fontStyle: "italic", opacity: 0.6 }}>
          {isAgentMsg(msg) ? "You deleted this message" : "This message was deleted"}
        </span>
      );
    }

    if (msg.message_type === "system" && msg.sender_type === "system") {
      return (
        <div className="system-message text-dark text-center my-2"
          style={{ backgroundColor: "#e9ecef", padding: "8px", borderRadius: "8px", display: "inline-block", maxWidth: "80%", lineHeight: "1.5" }}>
          {msg.content.includes("Ticket") && msg.content.includes("closed by agent")
            ? "Ticket closed by agent"
            : msg.content.includes("Chat transferred to agent")
              ? msg.content.split(/Reason:|Notes:/i)[0].trim()
              : msg.content}
        </div>
      );
    }

    if (msg.message_type === "notification") {
      return (
        <p className="text-info text-center mb-0"
          style={{ backgroundColor: "#e9ecef", padding: "8px", borderRadius: "8px" }}>
          {msg.content}
        </p>
      );
    }

    if (msg.message_type === "file" || msg.message_type === "file_upload") {
      const url = msg.attachment_url || msg.content;
      let filename = msg.filename;
      if (!filename && url) {
        try { filename = new URL(url).pathname.split("/").pop(); } catch { filename = "file"; }
      }
      filename = filename || "file";
      const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filename);
      return (
        <>
          {isImage ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={filename} style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px" }} />
            </a>
          ) : (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="file-link d-flex align-items-center p-2 rounded bg-light text-dark border border-secondary text-decoration-none"
              style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              title={filename}>
              <BiPaperclip className="me-2" style={{ fontSize: "1.3em", color: "#6c757d" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {filename.length > 50 ? `${filename.slice(0, 40)}...` : filename}
              </span>
            </a>
          )}
          {renderMessageFooter(msg)}
        </>
      );
    }

    // Default text message
    return (
      <>
        <p style={{
          margin: 0,
          fontSize: isOnlyEmojis(msg.content) ? "40px" : "inherit",
          lineHeight: isOnlyEmojis(msg.content) ? "1.2" : "inherit",
          wordBreak: "break-word",
        }}>
          {renderMessageWithLinks(msg.content)}
        </p>
        {renderMessageFooter(msg)}
      </>
    );
  };

  return (
    <div className="card-body chat-body" ref={chatBodyRef}>
      {messages.length === 0 ? (
        <p className="text-muted text-center py-4">No messages yet. Start the conversation!</p>
      ) : (
        <div className="chat-messages">
          {messages.reduce((acc, msg, index) => {
            const currentDate = formatMessageDate(msg.timestamp);
            const prevDate = messages[index - 1] ? formatMessageDate(messages[index - 1].timestamp) : null;

            if (index === 0 || currentDate !== prevDate) {
              acc.push(
                <div key={`date-${msg.timestamp}`} className="date-separator text-center my-2">
                  <span className="badge bg-light text-dark">{currentDate}</span>
                </div>
              );
            }

            const isAgent = isAgentMsg(msg);
            const isSystem = msg.sender_type === "system" && msg.message_type === "system";

            acc.push(
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={`message ${isAgent ? "message-right" : isSystem ? "message-system text-center" : "message-left"} ${msg.parent_message_id ? "message-reply" : ""}`}
                style={{ display: "flex", alignItems: "flex-end" }}
              >
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Reply reference */}
                  {msg.parent_message_id && (
                    <div className="reply-reference" style={{ cursor: "pointer" }}
                      onClick={() => scrollToMessage(msg.parent_message_id)}>
                      <small className="text-muted">
                        Replying to:{" "}
                        {messages.find((m) => String(m.id) === String(msg.parent_message_id))?.content?.slice(0, 50) || "Message not found"}
                      </small>
                    </div>
                  )}

                  {/* Sender label */}
                  {!isSystem && (
                    <div className="message-sender">{getSenderLabel(msg)}</div>
                  )}

                  {/* Bubble */}
                  <div className="message-content">
                    {renderContent(msg)}
                  </div>
                </div>
              </div>
            );
            return acc;
          }, [])}

          {typingStatus && (
            <div className="message message-left">
              <div className="message-sender">
                {typingStatus.sender_type === "agent"
                  ? "Support Agent"
                  : typingStatus.sender_type === "user"
                    ? "Customer"
                    : "Someone"}{" "}
                ({typingStatus.sender_email}) is typing...
              </div>
              <div className="message-contentt">
                <div className="typing-bubble">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
