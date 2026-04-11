import EmojiPicker from "emoji-picker-react";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { BiPaperclip, BiPlus, BiSend, BiSmile } from "react-icons/bi";
import { toast } from "react-toastify";
import { Popover, PopoverBody, PopoverHeader } from "reactstrap";
import {
  getMessages,
  getShortcuts,
  searchShortcuts,
} from "../../Services/widget";
import { AttechmentSizeLimit } from "../comman/helper";

const MessageInput = ({
  ticketNumber,
  selectedTicket,
  isAgentWithFallback,
  hasJoined,
  socket,
  setMessages,
  agentEmail,
  localAgentEmail,
  isHumanHandoff,
  messages,
  setLastUserMessageTime,
  replyToMessageId,
  setReplyToMessageId,
  editingMessageId,
  handleEditMessage,
  fileInputRef,
  setSubmitting,
  submitting,
  messageInputRef,
  setEditingMessageId,
  theme, // Added theme prop
}) => {
  const isDarkMode = theme === "dark";
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState(null);
  const [shortcuts, setShortcuts] = useState([]);
  const [filteredShortcuts, setFilteredShortcuts] = useState([]);
  const [showShortcutSuggestions, setShowShortcutSuggestions] = useState(false);
  const [shortcutsLoading, setShortcutsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const lastTypingSentRef = useRef(0);
  const emojiPickerRef = useRef(null);

  const prevEditingMessageId = useRef(editingMessageId);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Only run if editingMessageId has actually changed
    if (prevEditingMessageId.current !== editingMessageId) {
      if (editingMessageId) {
        const message = messages.find((msg) => msg.id === editingMessageId);
        if (message) {
          setMessageText(message.content);
          if (messageInputRef.current) {
            messageInputRef.current.value = message.content;
            messageInputRef.current.focus();
          }
        }
      } else {
        setMessageText("");
        if (messageInputRef.current) {
          messageInputRef.current.value = "";
        }
      }
      prevEditingMessageId.current = editingMessageId;
    }
  }, [editingMessageId, messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const sendTypingStatus = (status) => {
    if (!socket || !ticketNumber || selectedTicket?.status === "closed") {
      console.warn("[MessageInput] Cannot send typing status:", {
        hasSocket: !!socket,
        ticketNumber,
        isTicketClosed: selectedTicket?.status === "closed",
      });
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      console.warn("[MessageInput] WebSocket not open:", {
        readyState: socket.readyState,
      });
      return;
    }

    const now = Date.now();
    if (now - lastTypingSentRef.current < 500) {
      return;
    }

    const senderEmail =
      isAgentWithFallback || isHumanHandoff
        ? agentEmail || localAgentEmail || "humanstar@gmail.com"
        : "humanstar@gmail.com";
    const typingMessage = {
      type: "typing",
      status: status,
      sender_email: senderEmail,
    };

    try {
      socket.send(JSON.stringify(typingMessage));
      lastTypingSentRef.current = now;
    } catch (error) {
      console.error("[MessageInput] Error sending typing status:", error);
    }
  };

  const retryTypingStatus = (status, maxRetries = 3, retryInterval = 1000) => {
    let attempts = 0;
    const trySend = () => {
      if (
        socket &&
        socket.readyState === WebSocket.OPEN &&
        ticketNumber &&
        selectedTicket?.status !== "closed"
      ) {
        sendTypingStatus(status);
      } else if (attempts < maxRetries) {
        attempts++;
        setTimeout(trySend, retryInterval);
      } else {
        console.warn(
          "[MessageInput] Failed to send typing status after retries:",
          {
            hasSocket: !!socket,
            socketReady: socket?.readyState === WebSocket.OPEN,
            ticketNumber,
            isTicketClosed: selectedTicket?.status === "closed",
          },
        );
      }
    };
    trySend();
  };
  //remove file
  const removeSelectedFile = () => {
    setFile(null);

    if (fileInputRef?.current) {
      fileInputRef.current.value = "";
    }
  };
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  const debouncedSendTypingStatus = useRef(
    debounce((status) => sendTypingStatus(status), 500),
  ).current;

  const handleMessageInputChange = (e) => {
    const value = e.target.value;
    setMessageText(value);

    if (
      ticketNumber &&
      selectedTicket?.status !== "closed" &&
      (isAgentWithFallback ? hasJoined : true)
    ) {
      if (value.trim()) {
        retryTypingStatus("started");
      } else {
        retryTypingStatus("stopped");
      }
    } else {
      debouncedSendTypingStatus("stopped");
    }

    if (
      !selectedTicket ||
      selectedTicket.status === "closed" ||
      !selectedTicket.site_id
    ) {
      setShowShortcutSuggestions(false);
      setFilteredShortcuts([]);
      return;
    }

    setTimeout(async () => {
      const slashIndex = value.indexOf("/");
      if (slashIndex !== -1) {
        setShowShortcutSuggestions(true);
        const query = value.slice(slashIndex + 1).trim();
        setShortcutsLoading(true);
        try {
          const filtered = query
            ? await searchShortcuts(selectedTicket.site_id, query)
            : await getShortcuts(selectedTicket.site_id);
          if (!Array.isArray(filtered)) {
            console.warn(
              "[MessageInput] Invalid shortcuts data:",
              JSON.stringify(filtered, null, 2),
            );
            toast.error("Invalid shortcuts data received.");
            setFilteredShortcuts([]);
          } else {
            const validShortcuts = filtered.filter(
              (s) => s.message_content && s.message_content.trim(),
            );
            setFilteredShortcuts(validShortcuts);
          }
        } catch (err) {
          console.error("[MessageInput] Search shortcuts error:", {
            message: err.message,
            status: err.response?.status,
            response: err.response?.data,
          });
          toast.error(
            "Failed to search shortcuts: " + (err.message || "Unknown error"),
          );
          setFilteredShortcuts([]);
        } finally {
          setShortcutsLoading(false);
        }
      } else {
        setShowShortcutSuggestions(false);
        setFilteredShortcuts(shortcuts);
        retryTypingStatus("stopped");
      }
    }, 1000);
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const validFile = AttechmentSizeLimit(droppedFile, e);
    if (!validFile) return;

    setFile(validFile);

    if (fileInputRef?.current) {
      fileInputRef.current.files = e.dataTransfer.files;
    }

    toast.success("File ready to send");
  };
  // Emoji handling
  const handleEmojiClick = (emojiObject) => {
    const newText = messageText + emojiObject.emoji;
    setMessageText(newText);
    setShowEmojiPicker(false);
  };

  const handleShortcutSelect = (shortcut) => {
    if (!shortcut) {
      console.error("[MessageInput] Shortcut is undefined or null");
      toast.error("Invalid shortcut selected.");
      setShowShortcutSuggestions(false);
      setMessageText("");
      messageInputRef.current?.focus();
      return;
    }

    if (
      !shortcut.message_content ||
      selectedTicket?.status === "closed" ||
      (isAgentWithFallback && !isHumanHandoff && !hasJoined)
    ) {
      console.error("[MessageInput] Cannot select shortcut:", {
        hasContent: !!shortcut.message_content,
        isTicketClosed: selectedTicket?.status === "closed",
        isAgentAndNotHandoff:
          isAgentWithFallback && !isHumanHandoff && !hasJoined,
        shortcut: JSON.stringify(shortcut, null, 2),
      });
      toast.error(
        !shortcut.message_content
          ? "Shortcut has no content. Contact support."
          : selectedTicket?.status === "closed"
            ? "Ticket closed. Cannot use shortcut."
            : "Please join the ticket or request human handoff to use shortcuts.",
      );
      setShowShortcutSuggestions(false);
      setMessageText("");
      messageInputRef.current?.focus();
      return;
    }

    setMessageText(shortcut.message_content);
    setShowShortcutSuggestions(false);
    messageInputRef.current?.focus();
  };

  //copy and paste handlers for file attachments
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      e.preventDefault();
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();

      const droppedFile = e.dataTransfer?.files?.[0];
      if (!droppedFile) return;

      const validFile = AttechmentSizeLimit(droppedFile, e);
      if (!validFile) return;

      setFile(validFile);

      if (fileInputRef?.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }

      toast.success("File attached");
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);
  //copy and paste
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let item of items) {
        if (item.kind === "file") {
          const pastedFile = item.getAsFile();
          if (!pastedFile) continue;

          const validFile = AttechmentSizeLimit(pastedFile, e);
          if (!validFile) return;

          setFile(validFile);

          if (fileInputRef?.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(validFile);
            fileInputRef.current.files = dataTransfer.files;
          }

          toast.success("File pasted successfully");
          e.preventDefault();
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);
  const handleSendMessage = async () => {
    if (!messageText.trim() && !file) return;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast.error("Connection not established. Please refresh the page.");
      return;
    }
    if (selectedTicket?.status === "closed") {
      toast.error("Cannot send message: Ticket is closed.");
      return;
    }
    if (isAgentWithFallback && !hasJoined) {
      toast.error("Please join the ticket before sending messages.");
      return;
    }

    setSubmitting(true);
    try {
      let messageData;

      if (editingMessageId) {
        // Handle message editing
        const message = messages.find((msg) => msg.id === editingMessageId);
        if (!message) {
          console.error(
            "[MessageInput] Edit message failed: Message not found",
            { editingMessageId },
          );
          toast.error("Message not found.");
          setSubmitting(false);
          return;
        }
        if (!message.id || !Number.isInteger(Number(message.id))) {
          console.error(
            "[MessageInput] Edit message failed: Message lacks valid server ID",
            { editingMessageId },
          );
          toast.error("Cannot edit unsaved message.");
          setSubmitting(false);
          return;
        }

        // Get agent name from auth data
        const authData = JSON.parse(localStorage.getItem("auth") || "{}");
        const agentName =
          authData.user?.first_name && authData.user?.last_name
            ? `${authData.user.first_name} ${authData.user.last_name}`
            : authData.user?.name;

        messageData = {
          type: "edit",
          message_id: editingMessageId,
          content: messageText.trim(),
          ticket_number: ticketNumber,
          sender_type: isAgentWithFallback || isHumanHandoff ? "agent" : "user",
          sender_email:
            isAgentWithFallback || isHumanHandoff
              ? agentEmail || localAgentEmail || "agent@gmail.com"
              : "agent@gmail.com",
          sender_name:
            isAgentWithFallback || isHumanHandoff ? agentName : undefined,
          edited_by:
            isAgentWithFallback || isHumanHandoff
              ? agentEmail || localAgentEmail || "agent@gmail.com"
              : "agent@gmail.com",
          edited_at: new Date().toISOString(),
        };
        socket.send(JSON.stringify(messageData));

        // Update local state immediately for edit
        setMessages((prev) =>
          prev
            .map((msg) =>
              msg.id === editingMessageId
                ? {
                    ...msg,
                    content: messageText.trim(),
                    is_edited: true,
                    timestamp: messageData.edited_at,
                  }
                : msg,
            )
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        );

        setEditingMessageId(null);
        setMessageText("");
        messageInputRef.current.value = "";
        setSubmitting(false);
        toast.success("Message edited successfully.");
      } else if (file) {
        // File upload logic
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.replace(/^data:.+;base64,/, "");
          const authData = JSON.parse(localStorage.getItem("auth") || "{}");
          const agentName =
            authData.user?.first_name && authData.user?.last_name
              ? `${authData.user.first_name} ${authData.user.last_name}`
              : authData.user?.name;

          const message = {
            message_type: "file_upload",
            filename: file.name,
            content: base64,
            sender_type:
              isAgentWithFallback || isHumanHandoff ? "agent" : "user",
            sender_email:
              isAgentWithFallback || isHumanHandoff
                ? agentEmail || localAgentEmail || "humanstar@gmail.com"
                : "humanstar@gmail.com",
            sender_name:
              isAgentWithFallback || isHumanHandoff ? agentName : undefined,
            ticket_number: ticketNumber,
            timestamp: new Date().toISOString(),
          };
          socket.send(JSON.stringify(message));

          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (!isAgentWithFallback && !isHumanHandoff) {
            setLastUserMessageTime(Date.now());
          }
          setSubmitting(false);
        };
        reader.readAsDataURL(file);
      } else if (messageText.trim()) {
        // Get agent name from auth data
        const authData = JSON.parse(localStorage.getItem("auth") || "{}");
        const agentName =
          authData.user?.first_name && authData.user?.last_name
            ? `${authData.user.first_name} ${authData.user.last_name}`
            : authData.user?.name;

        messageData = {
          message_type: "text",
          sender_type: isAgentWithFallback || isHumanHandoff ? "agent" : "user",
          sender_email:
            isAgentWithFallback || isHumanHandoff
              ? agentEmail || localAgentEmail || "humanstar@gmail.com"
              : "humanstar@gmail.com",
          sender_name:
            isAgentWithFallback || isHumanHandoff ? agentName : undefined,
          content: messageText.trim(),
          ticket_number: ticketNumber,
          timestamp: new Date().toISOString(),
          parent_message_id: replyToMessageId || undefined,
        };

        socket.send(JSON.stringify(messageData));

        if (
          !selectedTicket?.ticket_number ||
          typeof selectedTicket.ticket_number !== "string" ||
          selectedTicket.ticket_number.trim() === ""
        ) {
        } else {
          // Fetch updated messages from server to get server-assigned ID
          try {
            const updatedMessages = await getMessages({
              ticket_number: selectedTicket.ticket_number,
            });
            if (!Array.isArray(updatedMessages)) {
              console.error(
                "[MessageInput] Invalid messages data:",
                updatedMessages,
              );
              toast.error("Failed to fetch updated messages.");
            } else {
              setMessages(
                updatedMessages.sort(
                  (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
                ),
              );
            }
          } catch (err) {
            console.error("[MessageInput] Fetch messages error:", {
              message: err.message,
              status: err.response?.status,
              response: err.response?.data,
              ticket_number: selectedTicket.ticket_number,
            });
            toast.error(
              "Failed to fetch messages: " + (err.message || "Unknown error"),
            );
          }
        }

        setMessageText("");
        messageInputRef.current.value = "";
        setReplyToMessageId(null);
        setSubmitting(false);
      }
      if (!isAgentWithFallback && !isHumanHandoff) {
        setLastUserMessageTime(Date.now());
      }
    } catch (err) {
      console.error("[MessageInput] Send message error:", err);
      toast.error("Failed to send message: " + err.message);
      setSubmitting(false);
    }
  };

  // Removed the separate handleFileUpload function as its logic is now integrated into handleSendMessage
  const handleFileUpload = () => {
    // This function is no longer needed as its logic is integrated into handleSendMessage
    // and the file input is triggered by a label.
  };

  useEffect(() => {
    // console.log("[MessageInput] Ticket context:", {
    //   ticketNumber,
    //   site_id: selectedTicket?.site_id,
    //   status: selectedTicket?.status,
    // });
    if (!selectedTicket?.site_id || !ticketNumber) {
      setShortcuts([]);
      setFilteredShortcuts([]);
      setShortcutsLoading(false);
      setShowShortcutSuggestions(false);
      return;
    }

    const fetchShortcuts = async () => {
      setShortcutsLoading(true);
      try {
        // console.log("[MessageInput] Fetching shortcuts for site_id:", selectedTicket.site_id);
        const data = await getShortcuts(selectedTicket.site_id);
        if (!Array.isArray(data)) {
          console.warn(
            "[MessageInput] Invalid shortcuts data format:",
            JSON.stringify(data, null, 2),
          );
          toast.error("Invalid shortcuts data received from server.");
          setShortcuts([]);
          setFilteredShortcuts([]);
        } else if (data.length === 0) {
          // toast.info("No shortcuts available for this site.");
          setShortcuts([]);
          setFilteredShortcuts([]);
        } else {
          const validShortcuts = data.filter(
            (s) => s.message_content && s.message_content.trim(),
          );
          setShortcuts(validShortcuts);
          setFilteredShortcuts(validShortcuts);
          if (validShortcuts.length < data.length) {
            console.warn("[MessageInput] Filtered out invalid shortcuts:", {
              total: data.length,
              valid: validShortcuts.length,
            });
          }
        }
      } catch (err) {
        console.error("[MessageInput] Fetch shortcuts error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        if (err.response?.status === 401) {
          toast.error("Unauthorized: Please log in again.");
        } else if (err.response?.status === 404) {
          // toast.info("No shortcuts found for this site.");
        } else {
          toast.error(
            "Failed to load shortcuts: " + (err.message || "Unknown error"),
          );
        }
        setShortcuts([]);
        setFilteredShortcuts([]);
      } finally {
        setShortcutsLoading(false);
      }
    };
    fetchShortcuts();
  }, [selectedTicket, ticketNumber]);

  return (
    <>
      {file && (
        <div
          style={{
            position: "relative",
            padding: "10px",
            marginBottom: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#f8f9fa",
            maxWidth: "300px",
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={removeSelectedFile}
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              border: "none",
              background: "red",
              color: "white",
              borderRadius: "50%",
              width: "22px",
              height: "22px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>

          {/* Image Preview */}
          {file.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "6px",
              }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <BiPaperclip style={{ marginRight: "6px" }} />
              <span>{file.name}</span>
            </div>
          )}
        </div>
      )}
      {(!isAgentWithFallback || hasJoined) &&
        (isDarkMode ? (
          // Dark Mode UI
          <div
            className="input-group mb-3"
            style={{
              backgroundColor: "#2c2c2c",
              borderRadius: "25px",
              padding: "8px 15px",
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {replyToMessageId && (
              <div className="reply-context w-100 mb-2">
                <small className="text-muted">
                  Replying to:{" "}
                  {messages
                    .find((m) => m.id === replyToMessageId)
                    ?.content?.slice(0, 50) || "Message not found"}
                  <button
                    className="btn btn-link text-danger p-0 ms-2"
                    onClick={() => setReplyToMessageId(null)}
                    aria-label="Cancel reply"
                  >
                    Cancel
                  </button>
                </small>
              </div>
            )}
            {/* Plus icon for attachments */}
            <button
              className="btn btn-link text-white p-0 me-2"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              disabled={submitting || (isAgentWithFallback && !hasJoined)}
              style={{ fontSize: "1.5rem" }}
            >
              <BiPlus />
            </button>

            {/* Hidden file input */}
            <input
              id="file-upload-input"
              type="file"
              className="d-none"
              ref={fileInputRef}
              onChange={(e) => {
                const selectedFile = e.target.files[0];
                setFile(selectedFile);
              }}
              disabled={submitting || (isAgentWithFallback && !hasJoined)}
              accept="image/jpeg,image/png,application/pdf"
              aria-label="File upload"
            />

            {/* Smiley face icon for emojis */}
            <button
              className="btn btn-link text-white p-0 me-2"
              aria-label="Open emoji picker"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={submitting || (isAgentWithFallback && !hasJoined)}
              style={{ fontSize: "1.5rem", cursor: "pointer" }}
            >
              <BiSmile />
            </button>

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: "absolute",
                  bottom: "60px",
                  left: "10px",
                  zIndex: 9999,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={350}
                  height={400}
                  searchPlaceholder="Search emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}

            {/* Message input */}
            <input
              type="text"
              className="form-control chat-input"
              value={messageText}
              onChange={handleMessageInputChange}
              placeholder="Type a message"
              disabled={
                !socket ||
                socket.readyState !== WebSocket.OPEN ||
                !ticketNumber ||
                selectedTicket?.status === "closed" ||
                (isAgentWithFallback && !hasJoined)
              }
              aria-label={
                editingMessageId
                  ? "Edit message input"
                  : replyToMessageId
                    ? "Reply message input"
                    : "Message input"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showShortcutSuggestions) {
                  if (editingMessageId) {
                    handleEditMessage(editingMessageId, messageText);
                  } else {
                    handleSendMessage();
                  }
                }
              }}
              ref={messageInputRef}
              id="message-input"
              style={{
                backgroundColor: "#555555",
                color: "white",
                border: "none",
              }}
            />

            {showShortcutSuggestions && (
              <Popover
                isOpen={showShortcutSuggestions}
                target="message-input"
                placement="top"
                toggle={() => setShowShortcutSuggestions((prev) => !prev)}
              >
                <PopoverHeader>Shortcuts</PopoverHeader>
                <PopoverBody>
                  {shortcutsLoading ? (
                    <div className="text-center">
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">
                          Loading shortcuts...
                        </span>
                      </div>
                    </div>
                  ) : filteredShortcuts.length === 0 ? (
                    <p className="mb-0">No shortcuts found.</p>
                  ) : (
                    filteredShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="shortcut-item"
                        style={{
                          cursor: "pointer",
                          padding: "5px",
                          borderBottom: "1px solid #eee",
                        }}
                        onClick={() => handleShortcutSelect(shortcut)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleShortcutSelect(shortcut);
                          }
                        }}
                        aria-label={`Select shortcut: ${shortcut.message_content}`}
                      >
                        {shortcut.message_content}
                      </div>
                    ))
                  )}
                </PopoverBody>
              </Popover>
            )}
          </div>
        ) : (
          // Light Mode UI
          <div className="input-group mb-3" style={{ position: "relative" }}>
            {replyToMessageId && (
              <div className="reply-context w-100 mb-2">
                <small className="text-muted">
                  Replying to:{" "}
                  {messages
                    .find((m) => m.id === replyToMessageId)
                    ?.content?.slice(0, 50) || "Message not found"}
                  <button
                    className="btn btn-link text-danger p-0 ms-2"
                    onClick={() => setReplyToMessageId(null)}
                    aria-label="Cancel reply"
                  >
                    Cancel
                  </button>
                </small>
              </div>
            )}

            {/* Emoji Button */}
            <button
              type="button"
              className="btn btn-outline-secondary"
              title="Add Emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              disabled={submitting || (isAgentWithFallback && !hasJoined)}
              style={{ cursor: "pointer" }}
            >
              <BiSmile />
            </button>

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: "absolute",
                  bottom: "60px",
                  left: "10px",
                  zIndex: 9999,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width={350}
                  height={400}
                  searchPlaceholder="Search emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}

            <input
              type="text"
              className="form-control chat-input"
              value={messageText}
              onChange={handleMessageInputChange}
              placeholder="Type your message"
              disabled={
                !ticketNumber ||
                selectedTicket?.status === "closed" ||
                (isAgentWithFallback && !hasJoined)
              }
              aria-label={
                editingMessageId
                  ? "Edit message input"
                  : replyToMessageId
                    ? "Reply message input"
                    : "Message input"
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showShortcutSuggestions) {
                  if (editingMessageId) {
                    handleEditMessage(editingMessageId, messageText);
                  } else {
                    handleSendMessage();
                  }
                }
              }}
              ref={messageInputRef}
              id="message-input"
            />
            {showShortcutSuggestions && (
              <Popover
                isOpen={showShortcutSuggestions}
                target="message-input"
                placement="top"
                toggle={() => setShowShortcutSuggestions((prev) => !prev)}
              >
                <PopoverHeader>Shortcuts</PopoverHeader>
                <PopoverBody>
                  {shortcutsLoading ? (
                    <div className="text-center">
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">
                          Loading shortcuts...
                        </span>
                      </div>
                    </div>
                  ) : filteredShortcuts.length === 0 ? (
                    <p className="mb-0">No shortcuts found.</p>
                  ) : (
                    filteredShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="shortcut-item"
                        style={{
                          cursor: "pointer",
                          padding: "5px",
                          borderBottom: "1px solid #eee",
                        }}
                        onClick={() => handleShortcutSelect(shortcut)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleShortcutSelect(shortcut);
                          }
                        }}
                        aria-label={`Select shortcut: ${shortcut.message_content}`}
                      >
                        {shortcut.message_content}
                      </div>
                    ))
                  )}
                </PopoverBody>
              </Popover>
            )}
            <label
              htmlFor="file-upload-input"
              className="btn btn-outline-secondary d-flex align-items-center"
            >
              <BiPaperclip className="me-2" />
              {file ? file.name : "No file chosen"}
            </label>
            <input
              id="file-upload-input"
              type="file"
              className="d-none"
              ref={fileInputRef}
              onChange={(e) => {
                const selectedFile = e.target.files[0];
                const validFile = AttechmentSizeLimit(selectedFile, e);
                if (!validFile) return;

                setFile(selectedFile);
              }}
              disabled={submitting || (isAgentWithFallback && !hasJoined)}
              accept="image/jpeg,image/png,application/pdf"
              aria-label="File upload"
            />
            <button
              className="btn btn-primary"
              onClick={handleSendMessage}
              disabled={
                submitting ||
                (!messageText.trim() && !file) ||
                showShortcutSuggestions ||
                (isAgentWithFallback && !hasJoined) ||
                !socket ||
                socket.readyState !== WebSocket.OPEN
              }
              aria-label={
                editingMessageId ? "Save edited message" : "Send message"
              }
            >
              <BiSend />
            </button>
          </div>
        ))}
    </>
  );
};

MessageInput.propTypes = {
  ticketNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedTicket: PropTypes.object,
  isAgentWithFallback: PropTypes.bool,
  hasJoined: PropTypes.bool,
  socket: PropTypes.object,
  setMessages: PropTypes.func,
  agentEmail: PropTypes.string,
  localAgentEmail: PropTypes.string,
  isHumanHandoff: PropTypes.bool,
  messages: PropTypes.array,
  setLastUserMessageTime: PropTypes.func,
  replyToMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  setReplyToMessageId: PropTypes.func,
  setEditingMessageId: PropTypes.func,
  editingMessageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleEditMessage: PropTypes.func,
  setSubmitting: PropTypes.func,
  submitting: PropTypes.bool,
  fileInputRef: PropTypes.object,
  theme: PropTypes.string, // Added theme prop type
};
export default MessageInput;
