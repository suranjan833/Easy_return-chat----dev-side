import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Button,
  Spinner,
  Form,
  Modal,
  Container,
  Row,
  Col,
  Toast,
  Dropdown,
} from "react-bootstrap"; // Ensure Dropdown is imported
import { getGroupMessages, getGroups } from "../../Services/api.js";
import { formatDistanceToNow } from "date-fns";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./GroupMessagesPage.css";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";
const WS_URL =
  import.meta.env.VITE_WS_BASE_URL || "wss://chatsupport.fskindia.com";

const GroupMessagesPage = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Modified: Add messageType to deleteModal to handle message vs reply deletion
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    replyId: null,
    messageType: null,
  });
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  // Added: State for editing simple messages
  const [editingMessage, setEditingMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const localTypingTimeoutRef = useRef(null);
  const messageQueue = useRef([]);
  const token = localStorage.getItem("accessToken");
  const userId = localStorage.getItem("userId");
  const currentUserId =
    userId && !isNaN(parseInt(userId, 10)) ? parseInt(userId, 10) : null;

  const [group, setGroup] = useState({
    name: location.state?.groupName || "Unnamed Group",
    avatar_url: location.state?.avatar_url || null,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sortMessages = (messages) => {
    return messages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  };

  const sortReplies = (replies) => {
    return replies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  };

  const fetchMessagesWithRetry = async (groupId, retries = 5, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, delay));
        const backendMessages = await getGroupMessages(groupId);
        return Array.isArray(backendMessages) ? backendMessages : [];
      } catch (err) {
        console.error("fetchMessagesWithRetry Error:", {
          groupId,
          attempt: i + 1,
          error: err.message,
        });
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        } else {
          throw err;
        }
      }
    }
  };

  useEffect(() => {
    if (!token || !userId || !currentUserId || !groupId || isNaN(groupId)) {
      console.error("Invalid session data:", {
        token,
        userId,
        currentUserId,
        groupId,
      });
      setError("Please login again.");
      setLoading(false);
      navigate("/auth-login");
      return;
    }

    setMessages([]);
    setTypingUsers([]);
    setConnectionStatus("connecting");
    setError(null);
    setSuccess(null);
    setReplyingTo(null);
    setEditingReply(null);
    setEditingMessage(null);

    const fetchData = async () => {
      try {
        setLoading(true);

        const groups = await getGroups();
        const currentGroup = groups.find((g) => g.id === parseInt(groupId));
        if (currentGroup) {
          setGroup({
            name:
              currentGroup.name || location.state?.groupName || "Unnamed Group",
            avatar_url:
              currentGroup.avatar_url || location.state?.avatar_url || null,
          });
        } else {
          console.warn("Group not found for groupId:", groupId);
          setError("Group not found. Please check the group ID.");
          setTimeout(() => setError(null), 5000);
        }

        const backendMessages = await fetchMessagesWithRetry(groupId);

        if (backendMessages.length === 0) {
          console.warn("No messages found for groupId:", groupId);
          setError("No messages found for this group. Start the conversation!");
          setTimeout(() => setError(null), 5000);
        }

        setMessages(
          sortMessages(
            backendMessages.map((msg) => ({
              id: msg.id,
              group_id: msg.group_id,
              content: msg.message || "Empty message",
              attachment: msg.attachment || null,
              created_at: msg.created_at,
              updated_at: msg.updated_at,
              user: msg.user || {
                id: 0,
                first_name: "Unknown",
                last_name: "",
                email: "",
                profile_picture: "",
              },
              sender_id: msg.user?.id || 0,
              is_reply: false,
              original_message_id: null,
              replies_mentions: sortReplies(msg.replies_mentions || []),
            })),
          ),
        );
        scrollToBottom();
      } catch (err) {
        console.error("fetchData Error:", err);
        setError(err.message || "Failed to load messages. Please try again.");
        if (err.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userId");
          navigate("/auth-login");
        }
      } finally {
        setLoading(false);
      }
    };

    const connectWebSocket = (retryCount = 0, maxRetries = 5) => {
      // Close any existing WebSocket connection
      if (socketRef.current) {
        socketRef.current.close(1000, "Switching group");
        socketRef.current = null;
      }

      const wsUrl = `${WS_URL}/groups/ws/${groupId}/${token}`;
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setConnectionStatus("connected");
        setError(null);

        while (messageQueue.current.length > 0) {
          const queuedMessage = messageQueue.current.shift();
          socketRef.current.send(JSON.stringify(queuedMessage));
        }
      };

      socketRef.current.onmessage = async (event) => {
        try {
          let data;
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.warn("Non-JSON WebSocket message received:", event.data);
            setError("Received invalid server message. Contact support.");
            setTimeout(() => setError(null), 5000);
            return;
          }

          if (data.type === "error") {
            console.error("WebSocket Error:", data);
            setError(data.message || "Server error occurred.");
            setTimeout(() => setError(null), 5000);
            return;
          }

          if (data.type === "send_group_message") {
            setMessages((prev) => {
              const newMessage = {
                id: data.id || Date.now(),
                group_id: parseInt(groupId),
                content: data.content || "Empty message",
                attachment: data.attachment || null,
                created_at: data.created_at || new Date().toISOString(),
                updated_at: data.updated_at || new Date().toISOString(),
                user: data.user || {
                  id: data.sender_id || currentUserId,
                  first_name: "Unknown",
                  last_name: "",
                  email: "",
                  profile_picture: "",
                },
                sender_id: data.sender_id || currentUserId,
                is_reply: false,
                original_message_id: null,
                replies_mentions: [],
              };
              return sortMessages([...prev, newMessage]);
            });
            scrollToBottom();
          } else if (data.type === "group_message_reply") {
            setMessages((prev) => {
              const newMessages = prev.map((msg) => {
                if (msg.id === data.reply?.original_message_id) {
                  const newReply = {
                    id: data.reply?.id || Date.now(),
                    type: "reply",
                    created_at:
                      data.reply?.created_at || new Date().toISOString(),
                    updated_at:
                      data.reply?.updated_at || new Date().toISOString(),
                    user:
                      data.reply?.user_id === currentUserId
                        ? {
                            id: currentUserId,
                            first_name: "You",
                            last_name: "",
                            email: "",
                            profile_picture: "",
                          }
                        : data.reply?.user || {
                            id: data.reply?.user_id || 0,
                            first_name: "Unknown",
                            last_name: "",
                            email: "",
                            profile_picture: "",
                          },
                    user_id: data.reply?.user_id || currentUserId,
                    original_message_id: data.reply?.original_message_id,
                    reply_message: data.reply?.reply_message || "Empty reply",
                  };
                  return {
                    ...msg,
                    replies_mentions: sortReplies([
                      ...(msg.replies_mentions || []),
                      newReply,
                    ]),
                  };
                }
                return msg;
              });
              return sortMessages(newMessages);
            });
            scrollToBottom();
          } else if (data.type === "edit_group_reply") {
            setMessages((prev) => {
              const updatedMessages = prev.map((msg) => {
                if (
                  msg.replies_mentions.some(
                    (reply) => reply.id === data.reply_id,
                  )
                ) {
                  return {
                    ...msg,
                    replies_mentions: sortReplies(
                      msg.replies_mentions.map((reply) =>
                        reply.id === data.reply_id
                          ? {
                              ...reply,
                              reply_message: data.reply_message,
                              updated_at:
                                data.updated_at || new Date().toISOString(),
                            }
                          : reply,
                      ),
                    ),
                  };
                }
                return msg;
              });
              return sortMessages(updatedMessages);
            });
            scrollToBottom();
          } else if (data.type === "typing_started") {
            if (data.sender_id !== currentUserId) {
              setTypingUsers((prev) => {
                if (!prev.some((u) => u.id === data.sender_id)) {
                  return [
                    ...prev,
                    {
                      id: data.sender_id,
                      first_name: data.message?.split(" ")[0] || "User",
                    },
                  ];
                }
                return prev;
              });
            }
          } else if (data.type === "typing_stopped") {
            setTypingUsers((prev) =>
              prev.filter((u) => u.id !== data.sender_id),
            );
          } else if (data.type === "delete_group_reply") {
            setMessages((prev) => {
              const updatedMessages = prev.map((msg) => {
                if (
                  msg.replies_mentions.some(
                    (reply) => reply.id === (data.reply_id || data.data?.id),
                  )
                ) {
                  return {
                    ...msg,
                    replies_mentions: sortReplies(
                      msg.replies_mentions.map((reply) =>
                        reply.id === (data.reply_id || data.data?.id)
                          ? {
                              ...reply,
                              reply_message: "Reply deleted",
                              attachment: null,
                            }
                          : reply,
                      ),
                    ),
                  };
                }
                return msg;
              });
              return sortMessages(updatedMessages);
            });
            scrollToBottom();
          } else if (data.type === "edit_group_message") {
            setMessages((prev) => {
              const updatedMessages = prev.map((msg) =>
                msg.id === data.message_id
                  ? {
                      ...msg,
                      content: data.new_content,
                      updated_at: data.updated_at || new Date().toISOString(),
                    }
                  : msg,
              );
              return sortMessages(updatedMessages);
            });
            scrollToBottom();
          } else if (data.type === "delete_group_message") {
            setMessages((prev) => {
              const updatedMessages = prev.map((msg) =>
                msg.id === (data.message_id || data.data?.id)
                  ? { ...msg, content: "Message deleted", attachment: null }
                  : msg,
              );
              return sortMessages(updatedMessages);
            });
            scrollToBottom();
          } else {
          }
        } catch (err) {
          console.error("WebSocket message processing error:", err);
          setError("Error processing server message.");
          setTimeout(() => setError(null), 5000);
        }
      };

      socketRef.current.onerror = (error) => {
        setConnectionStatus("disconnected");
        console.error("WebSocket error:", {
          groupId,
          userId: currentUserId,
          error,
        });
        setError("Chat connection lost. Attempting to reconnect...");
        setTimeout(() => setError(null), 5000);
        setTypingUsers([]);
      };

      socketRef.current.onclose = (event) => {
        setConnectionStatus("reconnecting");

        setTypingUsers([]);
        if (retryCount < maxRetries) {
          const delay = Math.min(3000 * (retryCount + 1), 15000);

          setTimeout(() => connectWebSocket(retryCount + 1, maxRetries), delay);
        } else {
          setError("Max reconnection attempts reached. Please refresh.");
          setTimeout(() => setError(null), 5000);
        }
      };
    };

    connectWebSocket();

    // const pollMessages = async () => {
    //   try {
    //     const updatedMessages = await fetchMessagesWithRetry(groupId, 3, 500);
    //     setMessages((prev) => {
    //       const newMessages = sortMessages(updatedMessages.map((msg) => ({
    //         id: msg.id,
    //         group_id: msg.group_id,
    //         content: msg.message || 'Empty message',
    //         attachment: msg.attachment || null,
    //         created_at: msg.created_at,
    //         updated_at: msg.updated_at,
    //         user: msg.user || { id: 0, first_name: 'Unknown', last_name: '', email: '', profile_picture: '' },
    //         sender_id: msg.user?.id || 0,
    //         is_reply: false,
    //         original_message_id: null,
    //         replies_mentions: sortReplies(msg.replies_mentions || []),
    //       })));
    //       if (newMessages.length !== prev.length) {
    //         console.log('Polling fetched new messages:', newMessages);
    //         scrollToBottom();
    //       }
    //       return newMessages;
    //     });
    //   } catch (err) {
    //     console.error('Polling error:', err);
    //   }
    // };

    // const pollingInterval = setInterval(pollMessages, 5000);

    fetchData();

    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }
      // clearInterval(pollingInterval);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
        localTypingTimeoutRef.current = null;
      }
      messageQueue.current = [];
    };
  }, [groupId, token, currentUserId, navigate, location.state]);

  const handleSendMessage = async (e, retryCount = 0, maxRetries = 3) => {
    e.preventDefault();
    e.stopPropagation();
    if (!messageText.trim() && !attachment) {
      setError("Please enter a message or select a file.");
      setTimeout(() => setError(null), 5000);
      return;
    }
    if (messageText.length > 500) {
      setError("Message cannot exceed 500 characters.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setSubmitting(true);
    try {
      let messageData;
      if (editingMessage) {
        // Added: Handle editing simple message
        messageData = {
          type: "edit_group_message",
          message_id: parseInt(editingMessage.id),
          new_content: messageText.trim(),
        };
        setMessages((prev) => {
          const newMessages = prev.map((msg) =>
            msg.id === editingMessage.id
              ? {
                  ...msg,
                  content: messageText.trim(),
                  updated_at: new Date().toISOString(),
                }
              : msg,
          );
          return sortMessages(newMessages);
        });
        scrollToBottom();
      } else if (editingReply) {
        messageData = {
          type: "edit_group_reply",
          reply_id: parseInt(editingReply.id),
          reply_message: messageText.trim(),
        };
        setMessages((prev) => {
          const newMessages = prev.map((msg) => {
            if (msg.id === editingReply.original_message_id) {
              return {
                ...msg,
                replies_mentions: sortReplies(
                  msg.replies_mentions.map((reply) =>
                    reply.id === editingReply.id
                      ? {
                          ...reply,
                          reply_message: messageText.trim(),
                          updated_at: new Date().toISOString(),
                        }
                      : reply,
                  ),
                ),
              };
            }
            return msg;
          });
          return sortMessages(newMessages);
        });
        scrollToBottom();
      } else if (replyingTo) {
        messageData = {
          type: "group_message_reply",
          original_message_id: parseInt(replyingTo.id),
          reply_message: messageText.trim(),
          user_id: currentUserId,
        };
        setMessages((prev) => {
          const newMessages = prev.map((msg) => {
            if (msg.id === parseInt(replyingTo.id)) {
              return {
                ...msg,
                replies_mentions: sortReplies([
                  ...(msg.replies_mentions || []),
                  {
                    id: Date.now(),
                    type: "reply",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user: {
                      id: currentUserId,
                      first_name: "You",
                      last_name: "",
                      email: "",
                      profile_picture: "",
                    },
                    user_id: currentUserId,
                    original_message_id: parseInt(replyingTo.id),
                    reply_message: messageText.trim(),
                  },
                ]),
              };
            }
            return msg;
          });
          return sortMessages(newMessages);
        });
        scrollToBottom();
      } else {
        messageData = {
          content: messageText.trim(),
          sender_id: currentUserId,
          attachment: attachment
            ? {
                base64: attachment.base64,
                name: attachment.name,
                type: attachment.type,
              }
            : null,
        };
      }

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(messageData));
      } else {
        messageQueue.current.push(messageData);

        if (retryCount < maxRetries) {
          setTimeout(
            () => handleSendMessage(e, retryCount + 1, maxRetries),
            2000,
          );
          return;
        } else {
          throw new Error("WebSocket not connected after retries.");
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      const updatedMessages = await fetchMessagesWithRetry(groupId);

      if (
        !updatedMessages.some(
          (msg) =>
            msg.message === messageText.trim() ||
            msg.replies_mentions.some(
              (r) => r.reply_message === messageText.trim(),
            ),
        )
      ) {
        console.warn("Sent message not found in API response:", messageText);
        // setError('Message sent but not saved on server. Please try again.');
        // setTimeout(() => setError(null), 5000);
      }
      setMessages(
        sortMessages(
          updatedMessages.map((msg) => ({
            id: msg.id,
            group_id: msg.group_id,
            content: msg.message || "Empty message",
            attachment: msg.attachment || null,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            user: msg.user || {
              id: 0,
              first_name: "Unknown",
              last_name: "",
              email: "",
              profile_picture: "",
            },
            sender_id: msg.user?.id || 0,
            is_reply: false,
            original_message_id: null,
            replies_mentions: sortReplies(msg.replies_mentions || []),
          })),
        ),
      );
      setMessageText("");
      setAttachment(null);
      setAttachmentPreview(null);
      setReplyingTo(null);
      setEditingReply(null);
      // Added: Clear editingMessage state
      setEditingMessage(null);
      // setSuccess(
      //   editingMessage ? 'Message edited!' :
      //     editingReply ? 'Reply edited!' :
      //       replyingTo ? 'Reply sent!' : 'Message sent!'
      // );
      // setTimeout(() => setSuccess(null), 3000);
      scrollToBottom();
    } catch (err) {
      console.error("Send Message Error:", err);
      // setError(err.message || 'Failed to send message to server.');
      // setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      setTimeout(() => setError(null), 5000);
      return;
    }
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Invalid file type. Allowed: PNG, JPEG, JPG, PDF, DOC");
      setTimeout(() => setError(null), 5000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        base64: reader.result.split(",")[1],
        type: file.type,
        name: file.name,
      });
      if (file.type.startsWith("image/")) {
        setAttachmentPreview({
          url: reader.result,
          type: "image",
          name: file.name,
        });
      } else if (file.type === "application/pdf") {
        setAttachmentPreview({ type: "pdf", name: file.name });
      } else {
        setAttachmentPreview({ type: "doc", name: file.name });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleTyping = () => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, skipping typing event");
      return;
    }
    // Only send typing event if messageText has changed and is not empty
    if (messageText.trim() && !localTypingTimeoutRef.current) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing_started",
          sender_id: currentUserId,
          message: `User ${currentUserId}`,
        }),
      );
      localTypingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({
              type: "typing_stopped",
              sender_id: currentUserId,
            }),
          );
        }
        localTypingTimeoutRef.current = null;
      }, 2000);
    }
  };

  const handleDeleteReply = async () => {
    const { replyId } = deleteModal;
    if (!replyId) {
      setError("Cannot delete this reply.");
      setTimeout(() => setError(null), 5000);
      setDeleteModal({ isOpen: false, replyId: null, messageType: null });
      return;
    }
    setSubmitting(true);
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "delete_group_reply",
            reply_id: parseInt(replyId),
            user_id: currentUserId,
          }),
        );
        setMessages((prev) => {
          const newMessages = prev.map((msg) => {
            if (
              msg.replies_mentions.some(
                (reply) => reply.id === parseInt(replyId),
              )
            ) {
              return {
                ...msg,
                replies_mentions: sortReplies(
                  msg.replies_mentions.map((reply) =>
                    reply.id === parseInt(replyId)
                      ? {
                          ...reply,
                          reply_message: "Reply deleted",
                          attachment: null,
                        }
                      : reply,
                  ),
                ),
              };
            }
            return msg;
          });
          return sortMessages(newMessages);
        });
        setSuccess("Reply deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error("WebSocket not connected.");
      }
    } catch (err) {
      console.error("Delete Reply Error:", err);
      setError(err.message || "Failed to delete reply.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleteModal({ isOpen: false, replyId: null, messageType: null });
      setSubmitting(false);
    }
  };

  // Added: Handle deletion of simple messages
  const handleDeleteMessage = async () => {
    const { replyId: messageId } = deleteModal;
    if (!messageId) {
      setError("Cannot delete this message.");
      setTimeout(() => setError(null), 5000);
      setDeleteModal({ isOpen: false, replyId: null, messageType: null });
      return;
    }
    setSubmitting(true);
    try {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: "delete_group_message",
            message_id: parseInt(messageId),
          }),
        );
        setMessages((prev) => {
          const newMessages = prev.map((msg) =>
            msg.id === parseInt(messageId)
              ? { ...msg, content: "Message deleted", attachment: null }
              : msg,
          );
          return sortMessages(newMessages);
        });
        setSuccess("Message deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error("WebSocket not connected.");
      }
    } catch (err) {
      console.error("Delete Message Error:", err);
      setError(err.message || "Failed to delete message.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleteModal({ isOpen: false, replyId: null, messageType: null });
      setSubmitting(false);
    }
  };

  // Modified: Handle both message and reply deletion
  const handleDelete = async () => {
    if (deleteModal.messageType === "message") {
      await handleDeleteMessage();
    } else {
      await handleDeleteReply();
    }
  };

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    setEditingReply(null);
    // Added: Clear editingMessage when replying
    setEditingMessage(null);
  };

  const handleEditReply = (reply, originalMessageId) => {
    setEditingReply({ id: reply.id, original_message_id: originalMessageId });
    setMessageText(reply.reply_message);
    setReplyingTo(null);
    // Added: Clear editingMessage when editing reply
    setEditingMessage(null);
  };

  // Added: Handle editing simple messages
  const handleEditMessage = (message) => {
    setEditingMessage({ id: message.id });
    setMessageText(message.content);
    setReplyingTo(null);
    setEditingReply(null);
  };

  const getInitials = (firstName, lastName) => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : "";
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : "";
    return `${firstInitial}${lastInitial}` || "U";
  };

  const getGroupInitials = (name) => {
    if (!name || typeof name !== "string") return "G";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };
  return (
    <div
      className="d-flex flex-column vh-100 bg-light"
      style={{ marginTop: "60px" }}
    >
      <style>
        {`
          .group-chat-input-container {
            padding: 12px 16px;
            border-top: 1px solid #e0e0e0;
            background: #f5f7f8;
            box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
          }
          .attachment-preview-container {
            background-color: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 10px;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .group-chat-input {
            flex: 1;
            margin: 0 12px;
            padding: 10px 14px;
            border: 1px solid #d1d5db;
            border-radius: 20px;
            outline: none;
            font-size: 15px;
            background: #ffffff;
          }
          .typing-indicator {
            background-color: #f5f7f8;
            padding: 10px 16px;
            font-size: 13px;
            color: #606770;
          }
          .typing-animation span {
            height: 6px;
            width: 6px;
            margin: 0 3px;
            background-color: #606770;
            border-radius: 50%;
            display: inline-block;
            animation: typing 1.2s infinite ease-in-out;
          }
          .typing-animation span:nth-child(1) { animation-delay: 200ms; }
          .typing-animation span:nth-child(2) { animation-delay: 300ms; }
          .typing-animation span:nth-child(3) { animation-delay: 400ms; }
          @keyframes typing {
            0% { transform: translateY(0px); opacity: 0.6; }
            28% { transform: translateY(-5px); opacity: 1; }
            44% { transform: translateY(0px); opacity: 0.6; }
          }
          .reply-preview-container {
            background-color: #e8ecef;
            border-left: 4px solid #25d366;
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .message-bubble {
            border-radius: 12px;
            padding: 10px 14px;
            margin: 4px 0;
            word-break: break-word;
            max-width: 80%;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            line-height: 1.4;
            font-size: 15px;
            position: relative;
          }
          .current-user-bg {
            background-color: #816bff;
            border-bottom-right-radius: 4px;
          }
          .bg-white {
            background-color: #ffffff;
            border-bottom-left-radius: 4px;
          }
          .deleted-message {
            background-color: #f0f0f0 !important;
            color: #999999 !important;
            font-style: italic;
          }
          .attachment-container {
            background-color: #f5f5f5;
            border-radius: 8px;
            padding: 8px;
            margin-top: 8px;
            width: 100%;
            box-sizing: border-box;
            border: 1px solid #e0e0e0;
          }
          .attachment-container img {
            width: 100%;
            max-height: 250px;
            object-fit: contain;
            border-radius: 8px;
            display: block;
            margin-bottom: 8px;
          }
          .attachment-file {
            display: flex;
            align-items: center;
            background-color: #fff;
            border-radius: 6px;
            padding: 8px;
            border: 1px solid #dee2e6;
            margin-bottom: 8px;
          }
          .attachment-file i {
            font-size: 28px;
            margin-right: 10px;
          }
          .attachment-file span {
            flex: 1;
            font-size: 0.9rem;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .attachment-container .btn-download {
            background-color: #007bff;
            color: white;
            border-radius: 6px;
            padding: 4px 12px;
            font-size: 0.85rem;
            transition: background-color 0.2s;
          }
          .attachment-container .btn-download:hover {
            background-color: #0056b3;
          }
          .replies-mentions {
            margin-top: 8px;
            padding-left: 12px;
            border-left: 2px solid #25d366;
            font-size: 13px;
          }
          .reply-message {
            border-radius: 8px;
            padding: 8px 12px;
            margin: 4px 0;
            font-size: 14px;
            max-width: 90%;
            margin-left: 12px;
            position: relative;
          }
          .message-container {
            position: relative;
          }
          .message-meta {
            display: flex;
            gap: 8px;
            font-size: 12px;
            color: #606770;
            margin-top: 4px;
          }
          .reply-context {
            font-size: 12px;
            color: #606770;
            margin-bottom: 6px;
            font-style: italic;
            background-color: #f0f2f5;
            padding: 4px 8px;
            border-radius: 6px;
            border-left: 3px solid #25d366;
          }
          .dropdown-toggle::after {
            display: none;
          }
          .dropdown-menu {
            min-width: 100px;
            font-size: 14px;
          }
          .dropdown-item:hover {
            background-color: #f0f2f5;
          }
        `}
      </style>
      <header className="topbar">
        <Container fluid>
          <Row className="align-items-center">
            <Col xs="auto">
              <div
                className="topbar-logo"
                aria-label={`Logo for ${group.name}`}
              >
                {group.avatar_url ? (
                  <img
                    src={group.avatar_url}
                    alt={group.name}
                    style={{
                      borderRadius: "50%",
                      width: "40px",
                      height: "40px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "#25d366",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    {getGroupInitials(group.name)}
                  </div>
                )}
              </div>
            </Col>
            <Col>
              <div className="d-flex flex-column">
                <div className="d-flex align-items-center">
                  <strong
                    style={{
                      fontSize: "16px",
                      color: "#1c2526",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      navigate(`/groups/${groupId}/settings`, {
                        state: {
                          groupName: group.name,
                          avatar_url: group.avatar_url,
                        },
                      })
                    }
                    aria-label={`View settings for ${group.name}`}
                  >
                    {group.name}
                  </strong>
                </div>
                <div className="status-online" aria-label="Group status">
                  <span
                    className={`status-dot ${connectionStatus === "connected" ? "connected" : "disconnected"}`}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor:
                        connectionStatus === "connected"
                          ? "#25d366"
                          : "#dc3545",
                      display: "inline-block",
                      marginRight: "6px",
                    }}
                  ></span>
                  {connectionStatus === "connected" ? "Online" : "Offline"}
                </div>
              </div>
            </Col>
            <Col xs={12} className="mt-1">
              <div
                className="group-chat-text"
                style={{ fontSize: "14px", color: "#606770" }}
              >
                Group Chat
              </div>
            </Col>
          </Row>
        </Container>
      </header>

      <main
        className="flex-grow-1 overflow-auto p-3"
        style={{ background: "#efeae2" }}
      >
        <Container fluid>
          {messages.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i
                className="bi bi-chat fs-1"
                aria-hidden="true"
                style={{ color: "#606770" }}
              ></i>
              <p style={{ fontSize: "16px", color: "#606770" }}>
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUserId;
              // Added: Check if message is deleted
              const isDeleted = message.content === "Message deleted";
              return (
                <div
                  key={message.id}
                  className={`mb-3 d-flex ${isOwnMessage ? "justify-content-end" : "justify-content-start"} align-items-start`}
                >
                  {!isOwnMessage && (
                    <div
                      className="message-logo"
                      aria-label={`Avatar for ${message.user?.first_name || "User"}`}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#25d366",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        marginRight: "8px",
                      }}
                    >
                      {getInitials(
                        message.user?.first_name,
                        message.user?.last_name,
                      )}
                    </div>
                  )}
                  <div
                    className="d-flex flex-column"
                    style={{ maxWidth: "80%" }}
                  >
                    <div className="message-container">
                      <div
                        className={`message-bubble ${isOwnMessage ? "current-user-bg" : "bg-white text-dark"} ${isDeleted ? "deleted-message" : ""}`}
                      >
                        <div>{message.content || "Empty message"}</div>
                        {message.attachment && !isDeleted && (
                          <div className="attachment-container">
                            {message.attachment
                              .toLowerCase()
                              .match(/\.(jpg|jpeg|png|gif)$/) ? (
                              <img src={message.attachment} alt="Attachment" />
                            ) : message.attachment
                                .toLowerCase()
                                .match(/\.(pdf)$/) ? (
                              <div className="d-flex align-items-center">
                                <i
                                  className="fas fa-file-pdf text-danger me-2"
                                  style={{ fontSize: "20px" }}
                                ></i>
                                <span style={{ fontSize: "14px" }}>
                                  PDF Document
                                </span>
                              </div>
                            ) : message.attachment
                                .toLowerCase()
                                .match(/\.(doc|docx)$/) ? (
                              <div className="d-flex align-items-center">
                                <i
                                  className="fas fa-file-word text-primary me-2"
                                  style={{ fontSize: "20px" }}
                                ></i>
                                <span style={{ fontSize: "14px" }}>
                                  Word Document
                                </span>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center">
                                <i
                                  className="fas fa-file text-secondary me-2"
                                  style={{ fontSize: "20px" }}
                                ></i>
                                <span style={{ fontSize: "14px" }}>
                                  File Attachment
                                </span>
                              </div>
                            )}
                            <div className="mt-2">
                              <a
                                href={message.attachment}
                                download
                                className="btn btn-sm btn-outline-primary"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: "12px", padding: "4px 8px" }}
                              >
                                <i className="fas fa-download me-1"></i>Download
                              </a>
                            </div>
                          </div>
                        )}
                        {/* Added: Dropdown for own non-deleted simple messages */}
                        {isOwnMessage && !isDeleted && (
                          <div className="d-flex align-items-center">
                            <Dropdown align="end">
                              <Dropdown.Toggle
                                variant="link"
                                className="p-0 text-muted"
                                disabled={submitting}
                                aria-label="More options"
                                style={{ fontSize: "12px", lineHeight: "1" }}
                              >
                                <i
                                  style={{ color: "#C0C0C0" }}
                                  className="bi bi-three-dots fs-6"
                                  aria-hidden="true"
                                ></i>
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item
                                  onClick={() => handleEditMessage(message)}
                                  disabled={submitting}
                                >
                                  <i className="bi bi-pencil me-2"></i>Edit
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() =>
                                    setDeleteModal({
                                      isOpen: true,
                                      replyId: message.id,
                                      messageType: "message",
                                    })
                                  }
                                  disabled={submitting}
                                >
                                  <i className="bi bi-trash me-2"></i>Delete
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          </div>
                        )}
                      </div>
                      {!message.is_reply && (
                        <Button
                          variant="link"
                          className="p-0 text-primary"
                          onClick={() => handleReplyMessage(message)}
                          disabled={submitting}
                          aria-label="Reply to this message"
                          style={{ fontSize: "12px" }}
                        >
                          <i
                            className="bi bi-reply fs-6"
                            aria-hidden="true"
                          ></i>{" "}
                          Reply
                        </Button>
                      )}
                    </div>
                    {message.replies_mentions?.length > 0 && (
                      <div className="replies-mentions">
                        {sortReplies(message.replies_mentions).map((reply) => {
                          const isOwnReply =
                            parseInt(reply.user?.id) === currentUserId ||
                            parseInt(reply.user_id) === currentUserId;
                          const isDeleted =
                            reply.reply_message === "Reply deleted";
                          const originalMessage = messages.find(
                            (msg) => msg.id === reply.original_message_id,
                          );
                          return (
                            <div
                              key={reply.id}
                              className={`mb-2 d-flex ${isOwnReply ? "justify-content-end" : "justify-content-start"} align-items-start`}
                            >
                              {!isOwnReply && (
                                <div
                                  className="message-logo"
                                  aria-label={`Avatar for ${reply.user?.first_name || "User"}`}
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "50%",
                                    background: "#25d366",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "14px",
                                    marginRight: "8px",
                                  }}
                                >
                                  {getInitials(
                                    reply.user?.first_name,
                                    reply.user?.last_name,
                                  )}
                                </div>
                              )}
                              <div
                                className={`reply-message ${isOwnReply ? "current-user-bg" : "bg-white text-dark"} ${isDeleted ? "deleted-message" : ""}`}
                              >
                                {originalMessage && (
                                  <div className="reply-context">
                                    <span>
                                      Replying to{" "}
                                      {originalMessage.user?.first_name ||
                                        "User"}
                                      : {originalMessage.content.slice(0, 50)}
                                      {originalMessage.content.length > 50
                                        ? "..."
                                        : ""}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  {reply.reply_message || "Empty reply"}
                                </div>
                                {reply.attachment && !isDeleted && (
                                  <div className="attachment-container">
                                    {reply.attachment
                                      .toLowerCase()
                                      .match(/\.(jpg|jpeg|png|gif)$/) ? (
                                      <img
                                        src={reply.attachment}
                                        alt="Attachment"
                                      />
                                    ) : reply.attachment
                                        .toLowerCase()
                                        .match(/\.(pdf)$/) ? (
                                      <div className="d-flex align-items-center">
                                        <i
                                          className="fas fa-file-pdf text-danger me-2"
                                          style={{ fontSize: "20px" }}
                                        ></i>
                                        <span style={{ fontSize: "14px" }}>
                                          PDF Document
                                        </span>
                                      </div>
                                    ) : reply.attachment
                                        .toLowerCase()
                                        .match(/\.(doc|docx)$/) ? (
                                      <div className="d-flex align-items-center">
                                        <i
                                          className="fas fa-file-word text-primary me-2"
                                          style={{ fontSize: "20px" }}
                                        ></i>
                                        <span style={{ fontSize: "14px" }}>
                                          Word Document
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="d-flex align-items-center">
                                        <i
                                          className="fas fa-file text-secondary me-2"
                                          style={{ fontSize: "20px" }}
                                        ></i>
                                        <span style={{ fontSize: "14px" }}>
                                          File Attachment
                                        </span>
                                      </div>
                                    )}
                                    <div className="mt-2">
                                      <a
                                        href={reply.attachment}
                                        download
                                        className="btn btn-sm btn-outline-primary"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          fontSize: "12px",
                                          padding: "4px 8px",
                                        }}
                                      >
                                        <i className="fas fa-download me-1"></i>
                                        Download
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {/* Added: Dropdown for own non-deleted reply messages */}
                                {isOwnReply && !isDeleted && (
                                  <div className="d-flex align-items-center">
                                    <Dropdown align="end">
                                      <Dropdown.Toggle
                                        variant="link"
                                        className="p-0 text-muted"
                                        disabled={submitting}
                                        aria-label="More options"
                                        style={{
                                          fontSize: "12px",
                                          lineHeight: "1",
                                        }}
                                      >
                                        <i
                                          style={{ color: "#C0C0C0" }}
                                          className="bi bi-three-dots fs-6"
                                          aria-hidden="true"
                                        ></i>
                                      </Dropdown.Toggle>
                                      <Dropdown.Menu>
                                        <Dropdown.Item
                                          onClick={() =>
                                            handleEditReply(
                                              reply,
                                              reply.original_message_id,
                                            )
                                          }
                                          disabled={submitting}
                                        >
                                          <i className="bi bi-pencil me-2"></i>
                                          Edit
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                          onClick={() =>
                                            setDeleteModal({
                                              isOpen: true,
                                              replyId: reply.id,
                                              messageType: "reply",
                                            })
                                          }
                                          disabled={submitting}
                                        >
                                          <i className="bi bi-trash me-2"></i>
                                          Delete
                                        </Dropdown.Item>
                                      </Dropdown.Menu>
                                    </Dropdown>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div
                      className={`message-meta ${isOwnMessage ? "justify-content-end" : "justify-content-start"}`}
                    >
                      <small className="text-muted">
                        {isOwnMessage
                          ? "You"
                          : `${message.user?.first_name || "User"} ${message.user?.last_name || ""}`}
                      </small>
                      <small className="text-muted">
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                        })}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Container>
      </main>

      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          <div className="d-flex align-items-center">
            <small className="text-muted me-2">
              {typingUsers.length === 1
                ? `${typingUsers[0].first_name} is typing`
                : `${typingUsers.length} people are typing`}
            </small>
            <div className="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      <footer className="group-chat-input-container">
        {error && (
          <Toast
            onClose={() => setError(null)}
            show={!!error}
            delay={5000}
            autohide
            className="bg-danger text-white mb-2"
            style={{ borderRadius: "8px", fontSize: "14px" }}
          >
            <Toast.Body>{error}</Toast.Body>
          </Toast>
        )}
        {success && (
          <Toast
            onClose={() => setSuccess(null)}
            show={!!success}
            delay={3000}
            autohide
            className="bg-success text-white mb-2"
            style={{ borderRadius: "8px", fontSize: "14px" }}
          >
            <Toast.Body>{success}</Toast.Body>
          </Toast>
        )}
        {(replyingTo || editingReply) && (
          <div className="reply-preview-container">
            <div className="d-flex align-items-center justify-content-between">
              <span>
                {editingReply
                  ? `Editing reply to ${messages.find((msg) => msg.id === editingReply.original_message_id)?.user?.first_name || "User"}: ${
                      messages
                        .find(
                          (msg) => msg.id === editingReply.original_message_id,
                        )
                        ?.content.slice(0, 50) || ""
                    }${messages.find((msg) => msg.id === editingReply.original_message_id)?.content.length > 50 ? "..." : ""}`
                  : `Replying to ${replyingTo.user?.first_name || "User"}: ${replyingTo.content.slice(0, 50)}${replyingTo.content.length > 50 ? "..." : ""}`}
              </span>
              <Button
                variant="link"
                className="text-danger p-0"
                onClick={() => {
                  setReplyingTo(null);
                  setEditingReply(null);
                  setMessageText("");
                }}
                aria-label="Cancel action"
              >
                <i className="fas fa-times" style={{ fontSize: "14px" }}></i>
              </Button>
            </div>
          </div>
        )}
        {attachmentPreview && (
          <div className="attachment-preview-container">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                {attachmentPreview.type === "image" ? (
                  <>
                    <img
                      src={attachmentPreview.url}
                      alt="Preview"
                      className="me-2"
                      style={{
                        maxWidth: "36px",
                        maxHeight: "36px",
                        borderRadius: "4px",
                        objectFit: "contain",
                      }}
                    />
                    <span
                      className="text-truncate"
                      style={{ maxWidth: "140px", fontSize: "14px" }}
                    >
                      {attachmentPreview.name}
                    </span>
                  </>
                ) : attachmentPreview.type === "pdf" ? (
                  <>
                    <i
                      className="fas fa-file-pdf text-danger me-2"
                      style={{ fontSize: "20px" }}
                    ></i>
                    <span
                      className="text-truncate"
                      style={{ maxWidth: "140px", fontSize: "14px" }}
                    >
                      {attachmentPreview.name}
                    </span>
                  </>
                ) : (
                  <>
                    <i
                      className="fas fa-file-word text-primary me-2"
                      style={{ fontSize: "20px" }}
                    ></i>
                    <span
                      className="text-truncate"
                      style={{ maxWidth: "140px", fontSize: "14px" }}
                    >
                      {attachmentPreview.name}
                    </span>
                  </>
                )}
              </div>
              <Button
                variant="link"
                className="text-danger"
                onClick={() => {
                  setAttachment(null);
                  setAttachmentPreview(null);
                }}
              >
                <i className="fas fa-times" style={{ fontSize: "14px" }}></i>
              </Button>
            </div>
          </div>
        )}
        <Form onSubmit={handleSendMessage}>
          <Row className="g-2 align-items-center">
            <Col>
              <Form.Control
                type="text"
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  handleTyping();
                }}
                placeholder={
                  editingMessage
                    ? "Edit your message..."
                    : editingReply
                      ? "Edit your reply..."
                      : replyingTo
                        ? "Type your reply..."
                        : "Type your messagess..."
                }
                className="group-chat-input"
                disabled={submitting}
                maxLength={500}
                aria-label={
                  editingMessage
                    ? "Edit message"
                    : editingReply
                      ? "Edit reply"
                      : replyingTo
                        ? "Type a reply"
                        : "Type a message"
                }
              />
            </Col>
            <Col xs="auto">
              <Form.Control
                type="file"
                onChange={handleFileUpload}
                className="d-none"
                id="file-upload"
                disabled={submitting || editingReply || editingMessage}
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
                aria-label="Upload file"
              />
              <Button
                variant="link"
                className="p-0 me-2"
                onClick={() => document.getElementById("file-upload").click()}
                disabled={submitting || editingReply || editingMessage}
                aria-label="Upload file"
                style={{ color: "#606770" }}
              >
                <i className="bi bi-paperclip fs-5"></i>
              </Button>
              <Button
                variant="primary"
                type="submit"
                className="rounded-pill"
                disabled={submitting}
                aria-label={
                  editingMessage
                    ? "Save edited message"
                    : editingReply
                      ? "Save edited reply"
                      : replyingTo
                        ? "Send reply"
                        : "Send message"
                }
                style={{
                  backgroundColor: "#25d366",
                  borderColor: "#25d366",
                  padding: "8px 16px",
                }}
              >
                <i
                  className={
                    editingMessage || editingReply
                      ? "bi bi-check fs-5"
                      : "bi bi-send fs-5"
                  }
                ></i>
              </Button>
            </Col>
          </Row>
        </Form>
      </footer>

      <Modal
        show={deleteModal.isOpen}
        onHide={() =>
          setDeleteModal({ isOpen: false, replyId: null, messageType: null })
        }
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this{" "}
          {deleteModal.messageType === "message" ? "message" : "reply"}?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() =>
              setDeleteModal({
                isOpen: false,
                replyId: null,
                messageType: null,
              })
            }
            disabled={submitting}
            style={{ borderRadius: "8px" }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={submitting}
            style={{ borderRadius: "8px" }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GroupMessagesPage;
