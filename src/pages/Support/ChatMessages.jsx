import { useCallback, useEffect, useMemo, useState } from "react";
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

  hasJoined,
}) => {
  const [agentNames, setAgentNames] = useState({});
  const [loadingAgents, setLoadingAgents] = useState(new Set());

  const [readPopupId, setReadPopupId] = useState(null);

  // Message reply scroll
  const scrollToMessage = (messageId) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });

      // highlight effect
      el.style.background = "#fff3cd";
      setTimeout(() => {
        el.style.background = "";
      }, 2000);
    }
  };

  // render any link clickable

  const renderMessageWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0056b3", textDecoration: "underline" }}
          >
            {part}
          </a>
        );
      }

      return part;
    });
  };

  // Function to fetch agent name by email
  const fetchAgentName = useCallback(
    async (email) => {
      if (!email || agentNames[email] || loadingAgents.has(email)) return;

      // Check if this is the current logged-in agent first
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");

      if (authData.user) {
        const fullName =
          authData.user?.first_name && authData.user?.last_name
            ? `${authData.user.first_name} ${authData.user.last_name}`
            : authData.user?.name;

        if (fullName && fullName !== email) {
          setAgentNames((prev) => ({
            ...prev,
            [email]: fullName,
          }));
          return;
        }
      }

      setLoadingAgents((prev) => new Set(prev).add(email));

      try {
        const agentInfo = await getAgentInfoByEmail(email);
        if (agentInfo && agentInfo.first_name && agentInfo.last_name) {
          const fullName =
            `${agentInfo.first_name} ${agentInfo.last_name}`.trim();
          if (fullName && fullName !== email) {
            setAgentNames((prev) => ({
              ...prev,
              [email]: fullName,
            }));
          } else {
            // If the name is the same as email, don't store it
            setAgentNames((prev) => ({
              ...prev,
              [email]: email,
            }));
          }
        } else {
          // If agent not found or no name, use email as fallback
          setAgentNames((prev) => ({
            ...prev,
            [email]: email,
          }));
        }
      } catch (err) {
        console.error("Error fetching agent name:", err);
        // Use email as fallback
        setAgentNames((prev) => ({
          ...prev,
          [email]: email,
        }));
      } finally {
        setLoadingAgents((prev) => {
          const newSet = new Set(prev);
          newSet.delete(email);
          return newSet;
        });
      }
    },
    [agentNames, loadingAgents],
  );

  // Get unique agent emails from messages
  const agentEmails = useMemo(() => {
    const emails = new Set();
    messages.forEach((msg) => {
      if (
        msg.sender_type === "agent" &&
        msg.sender_email &&
        !agentNames[msg.sender_email] &&
        !loadingAgents.has(msg.sender_email)
      ) {
        emails.add(msg.sender_email);
      }
    });
    return Array.from(emails);
  }, [messages, agentNames, loadingAgents]);

  // Fetch agent names for all agent messages
  useEffect(() => {
    agentEmails.forEach((email) => {
      fetchAgentName(email);
    });
  }, [agentEmails, fetchAgentName]);

  // ChatMessages.jsx
  const getSenderLabel = useCallback(
    (msg) => {
      const senderType =
        typeof msg.sender_type === "string" && msg.sender_type
          ? msg.sender_type.charAt(0).toUpperCase() + msg.sender_type.slice(1)
          : "Unknown";

      let senderDisplay;
      if (msg.sender_type === "user" && selectedTicket?.name) {
        senderDisplay = selectedTicket.name;
      } else if (msg.sender_type === "agent") {
        // Priority: local auth data > fetched agent name > sender_name > selectedTicket agent_name > email
        const authData = JSON.parse(localStorage.getItem("auth") || "{}");

        // If this is the current logged-in agent, use their local auth data
        if (authData.user) {
          senderDisplay =
            authData.user?.first_name && authData.user?.last_name
              ? `${authData.user.first_name} ${authData.user.last_name}`
              : authData.user?.name || "Agent";
        } else if (
          msg.sender_email &&
          agentNames[msg.sender_email] &&
          agentNames[msg.sender_email] !== msg.sender_email
        ) {
          // Use fetched agent name only if it's different from email (meaning we got a real name)
          senderDisplay = agentNames[msg.sender_email];
        } else if (msg.sender_name && msg.sender_name !== msg.sender_email) {
          senderDisplay = msg.sender_name;
        } else if (
          selectedTicket?.agent_name &&
          selectedTicket.agent_name !== msg.sender_email
        ) {
          senderDisplay = selectedTicket.agent_name;
        } else {
          // Final fallback to email
          senderDisplay = msg.sender_email || "Agent";
        }
      } else {
        senderDisplay = msg.sender_email || "N/A";
      }
      return `${senderType} (${senderDisplay})`;
    },
    [agentNames, selectedTicket],
  );

  const formatMessageDate = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isToday =
      messageDate.getDate() === today.getDate() &&
      messageDate.getMonth() === today.getMonth() &&
      messageDate.getFullYear() === today.getFullYear();
    const isYesterday =
      messageDate.getDate() === yesterday.getDate() &&
      messageDate.getMonth() === yesterday.getMonth() &&
      messageDate.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="card-body chat-body">
      {messages.length === 0 ? (
        <p className="text-muted text-center py-4">
          No messages yet. Start the conversation!
        </p>
      ) : (
        <div className="chat-messages">
          {messages.reduce((acc, msg, index) => {
            console.log("Message Object:", msg);
            const currentDate = formatMessageDate(msg.timestamp);
            const prevMsg = messages[index - 1];
            const prevDate = prevMsg
              ? formatMessageDate(prevMsg.timestamp)
              : null;

            if (index === 0 || currentDate !== prevDate) {
              acc.push(
                <div
                  key={`date-${msg.timestamp}`}
                  className="date-separator text-center my-2"
                >
                  <span className="badge bg-light text-dark">
                    {currentDate}
                  </span>
                </div>,
              );
            }

            acc.push(
              <div
                key={msg.id}
                className={`message  overflow-y-auto scroll-smooth ${
                  msg.sender_type === "agent" || msg.sender_type === "bot"
                    ? "message-right"
                    : msg.sender_type === "system" &&
                        msg.message_type === "system"
                      ? "message-system text-center"
                      : "message-left"
                } ${msg.parent_message_id ? "message-reply" : ""}`}
                data-message-id={msg.id}
                style={{ display: "flex", alignItems: "flex-end" }}
              >
                {msg.sender_type === "agent" &&
                  msg.id &&
                  !msg.id.toString().startsWith("temp-") &&
                  hasJoined &&
                  isAgentWithFallback && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        marginRight: "5px",
                      }}
                    >
                      <button
                        className="btn border-0 btn-sm bg-transparent"
                        style={{ fontSize: "20px", padding: "0 5px" }}
                        onClick={() => handleReplyToMessage(msg.id)}
                        disabled={selectedTicket?.status === "closed"}
                        aria-label="Reply to message"
                      >
                        <i className="bi bi-reply"></i>
                      </button>
                      {new Date().getTime() -
                        new Date(msg.timestamp).getTime() <=
                        60 * 1000 && (
                        <button
                          className="btn border-0 btn-sm bg-transparent"
                          style={{ fontSize: "20px", padding: "0 5px" }}
                          onClick={() => onEditMessage(msg.id, msg.content)}
                          disabled={selectedTicket?.status === "closed"}
                          aria-label="Edit message"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                      )}
                      <button
                        className="btn border-0 btn-sm bg-transparent"
                        style={{
                          fontSize: "20px",
                          padding: "0 5px",
                          color: "#dc3545",
                        }}
                        onClick={() => handleDeleteMessage(msg.id)}
                        aria-label="Delete message"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                <div
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  {msg.parent_message_id && (
                    <div
                      className="reply-reference"
                      style={{ cursor: "pointer" }}
                      onClick={() => scrollToMessage(msg.parent_message_id)}
                    >
                      <small className="text-muted">
                        Replying to:{" "}
                        {messages
                          .find(
                            (m) =>
                              String(m.id) === String(msg.parent_message_id),
                          )
                          ?.content?.slice(0, 50) || "Message not found here"}
                      </small>
                    </div>
                  )}
                  {(msg.sender_type !== "system" ||
                    msg.message_type !== "system") && (
                    <div className="message-sender">{getSenderLabel(msg)}</div>
                  )}
                  {msg.message_type === "system" &&
                  msg.sender_type === "system" ? (
                    <div
                      className="system-message text-dark text-center my-2"
                      style={{
                        backgroundColor: "#e9ecef",
                        padding: "8px",
                        borderRadius: "8px",
                        display: "inline-block",
                        width: "auto",
                        maxWidth: "80%",
                        lineHeight: "1.5",
                      }}
                    >
                      {msg.content.includes("Ticket") &&
                      msg.content.includes("closed by agent")
                        ? "Ticket closed by agent"
                        : msg.content.includes("Chat transferred to agent")
                          ? msg.content.split(/Reason:|Notes:/i)[0].trim()
                          : msg.content}
                    </div>
                  ) : (
                    <div className="message-content">
                      {(msg.message_type === "text" &&
                        msg.sender_type !== "system") ||
                      (msg.message_type === "system" &&
                        msg.sender_type === "agent") ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            flexDirection: "column",
                          }}
                        >
                          <p
                            style={{
                              flex: 1,
                              margin: 0,
                              fontSize: isOnlyEmojis(msg.content)
                                ? "40px"
                                : "inherit",
                              lineHeight: isOnlyEmojis(msg.content)
                                ? "1.2"
                                : "inherit",
                            }}
                          >
                            {renderMessageWithLinks(msg.content)}
                          </p>
                          <div
                            className="message-footer"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "5px",
                            }}
                          >
                            <small
                              style={{
                                fontSize: "10px",
                                color:
                                  msg.sender_type === "agent"
                                    ? "white"
                                    : "black",
                              }}
                            >
                              {new Date(msg.timestamp).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "numeric",
                                hour12: true,
                              })}
                            </small>
                            <div
                              className="message-actions"
                              style={{
                                display: "flex",
                                opacity: "1",
                                gap: "6px",
                                alignItems: "center",
                                position: "relative",
                              }}
                            >
                              {msg.sender_type === "agent" && (
                                <>
                                  {msg.is_read ? (
                                    <div
                                      onMouseEnter={() =>
                                        setReadPopupId(msg.id)
                                      }
                                      onMouseLeave={() => setReadPopupId(null)}
                                      style={{
                                        position: "relative",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <i
                                        className="bi bi-check-all"
                                        style={{
                                          fontSize: "20px",
                                          color: "#34B7F1",

                                          cursor: "pointer",
                                        }}
                                      />

                                      {readPopupId === msg.id && (
                                        <div
                                          style={{
                                            position: "absolute",
                                            bottom: "28px",
                                            right: "0",
                                            background: "#222",
                                            color: "#fff",
                                            padding: "6px 8px",
                                            fontSize: "11px",
                                            borderRadius: "6px",
                                            whiteSpace: "nowrap",
                                            zIndex: 1000,
                                            boxShadow:
                                              "0 2px 8px rgba(0,0,0,0.3)",
                                          }}
                                        >
                                          <div>
                                            <strong>Sent:</strong>{" "}
                                            {new Date(
                                              msg.timestamp,
                                            ).toLocaleString()}
                                          </div>
                                          <div>
                                            <strong>Read:</strong>{" "}
                                            {msg.read_at
                                              ? new Date(
                                                  msg.read_at,
                                                ).toLocaleString()
                                              : "Not read yet"}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <i
                                      className="bi bi-check"
                                      style={{
                                        fontSize: "20px",
                                        color: "white",
                                      }}
                                    />
                                  )}
                                </>
                              )}

                              {msg.is_edited && (
                                <small className="edited-indicator text-success">
                                  edited
                                </small>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : msg.message_type === "file" ||
                        msg.message_type === "file_upload" ? (
                        (() => {
                          const url = msg.attachment_url || msg.content;
                          let filename = msg.filename;
                          if (!filename && url) {
                            try {
                              const urlObj = new URL(url);
                              const pathSegments = urlObj.pathname.split("/");
                              filename = pathSegments[pathSegments.length - 1];
                            } catch (err) {
                              console.error(
                                "Error parsing URL for filename:",
                                err,
                              );
                              filename = "file"; // Fallback if URL parsing fails
                            }
                          } else if (!filename) {
                            filename = "file"; // Fallback if no filename and no URL
                          }
                          // console.log(url, 'url', filename, 'filename');
                          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(
                            filename,
                          );

                          return (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                flexDirection: "column",
                              }}
                            >
                              {isImage ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="file-link d-flex align-items-center p-2 rounded bg-light text-dark border border-secondary text-decoration-none"
                                  style={{
                                    maxWidth: "250px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={filename}
                                >
                                  <img
                                    src={url}
                                    alt={filename}
                                    style={{
                                      maxWidth: "200px",
                                      maxHeight: "200px",
                                      borderRadius: "8px",
                                    }}
                                  />
                                </a>
                              ) : (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="file-link d-flex align-items-center p-2 rounded bg-light text-dark border border-secondary text-decoration-none"
                                  style={{
                                    maxWidth: "250px", // Max width for the link (can be increased if needed)
                                    overflow: "hidden",
                                    textOverflow: "ellipsis", // Truncate text with ellipsis if it overflows
                                    whiteSpace: "nowrap", // Prevent text from wrapping
                                  }}
                                  title={filename} // Tooltip with the full filename on hover
                                >
                                  <BiPaperclip
                                    className="me-2"
                                    style={{
                                      fontSize: "1.3em",
                                      color: "#6c757d",
                                    }}
                                  />
                                  <span
                                    style={{
                                      display: "inline-block",
                                      maxWidth: "calc(100% - 30px)", // Ensures filename text doesn't overflow the link
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap", // Keep text in a single line
                                    }}
                                  >
                                    {filename.length > 50
                                      ? `${filename.slice(0, 40)}...`
                                      : filename}
                                  </span>
                                </a>
                              )}
                              {/* {console.log("Rendering BiPaperclip for file:", filename, "URL:", url)} */}
                              <div
                                className="message-footer"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginTop: "5px",
                                }}
                              >
                                <small
                                  style={{
                                    fontSize: "10px",
                                    color:
                                      msg.sender_type === "agent"
                                        ? "white"
                                        : "black",
                                  }}
                                >
                                  {new Date(msg.timestamp).toLocaleString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "numeric",
                                      minute: "numeric",
                                      hour12: true,
                                    },
                                  )}
                                </small>
                                <div
                                  className="message-actions"
                                  style={{
                                    display: "flex",
                                    gap: "5px",
                                    alignItems: "center",
                                  }}
                                >
                                  {msg.sender_type === "agent" && (
                                    <>
                                      {msg.is_read ? (
                                        <i
                                          className="bi bi-check-all"
                                          style={{
                                            fontSize: "20px",
                                            color: "#4CAF50",
                                          }}
                                        />
                                      ) : (
                                        <small className="text-white">
                                          <i
                                            style={{ fontSize: "20px" }}
                                            className="bi bi-check"
                                          ></i>
                                        </small>
                                      )}
                                    </>
                                  )}
                                  {msg.is_edited && (
                                    <small className="edited-indicator text-success">
                                      edited
                                    </small>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : msg.message_type === "notification" ? (
                        <p
                          className="text-info text-center mb-0"
                          style={{
                            backgroundColor: "#e9ecef",
                            padding: "8px",
                            borderRadius: "8px",
                          }}
                        >
                          {msg.content}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                {msg.sender_type === "user" &&
                  msg.id &&
                  !msg.id.toString().startsWith("temp-") &&
                  hasJoined &&
                  isAgentWithFallback && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        marginLeft: "5px",
                      }}
                    >
                      <button
                        className="btn border-0 btn-sm bg-transparent"
                        style={{ fontSize: "20px", padding: "0 5px" }}
                        onClick={() => handleReplyToMessage(msg.id)}
                        disabled={selectedTicket?.status === "closed"}
                        aria-label="Reply to message"
                      >
                        <i className="bi bi-reply"></i>
                      </button>
                    </div>
                  )}
              </div>,
            );
            return acc;
          }, [])}
          {typingStatus && (
            <div className="message message-left">
              <div className="message-sender">
                {typingStatus.sender_type.charAt(0).toUpperCase() +
                  typingStatus.sender_type.slice(1)}{" "}
                ({typingStatus.sender_email})
              </div>
              <div className="message-contentt">
                <div className="typing-bubble">
                  <span></span>
                  <span></span>
                  <span></span>
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
