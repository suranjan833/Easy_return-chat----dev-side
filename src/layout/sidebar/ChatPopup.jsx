import "bootstrap-icons/font/bootstrap-icons.css";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AttachmentDisplay from "../../components/custom/Attachment/AttachmentDisplay";
import AttachmentInputPreview from "../../components/custom/Attachment/AttachmentInputPreview";
import { AttechmentSizeLimit, isOnlyEmojis } from "../../pages/comman/helper";
import chatService from "../../Services/ChatService";
import { getDirectMessages, markAllRead } from "../../Services/DirectsmsApi";
import "./ChatPopup.css";
import { color } from "framer-motion";

const ChatPopup = ({
  user,
  onClose,
  onMaximize,
  meId,
  token,
  baseUrl,
  initialPosition,
  index,
  isFixed = false,
}) => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const [messages, setMessages] = useState([]);
  const [messageInfo, setMessageInfo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [messageInput, setMessageInput] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [optimisticMessages, setOptimisticMessages] = useState({}); // To track tempId -> realId mapping
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null); // State to hold message for deletion confirmation
  const [replyTarget, setReplyTarget] = useState(null);
// replyTarget = { type: "message" | "reply", id, content }

  const messagesEndRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const chatWindowRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [position, setPosition] = useState(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const firstUnreadMessageRef = useRef(null);
  const [hasScrolledToUnread, setHasScrolledToUnread] = useState(false);
  const messageRefs = useRef({}); // Ref to store message elements for navigation

  //image ref
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Handle drag start
  const handleMouseDown = (e) => {
    if (isFixed) return;
    setIsDragging(true);
    const rect = chatWindowRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };
  //drag &drop hobe
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validFile = AttechmentSizeLimit(file, e);
    if (!validFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile(file);
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const dropArea = chatWindowRef.current;

    if (!dropArea) return;

    dropArea.addEventListener("dragover", handleDragOver);
    dropArea.addEventListener("drop", handleDrop);

    return () => {
      dropArea.removeEventListener("dragover", handleDragOver);
      dropArea.removeEventListener("drop", handleDrop);
    };
  }, []);

  //copy & paste hobe
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (!file) return;

        const validFile = AttechmentSizeLimit(file, e);
        if (!validFile) return;

        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedFile(file);
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  // Handle drag movement
  const handleMouseMove = (e) => {
    if (!isDragging || isFixed) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  // Handle drag end
  const handleMouseUp = () => {
    if (isFixed) return;
    setIsDragging(false);
  };

  useEffect(() => {
    // Add global mouse event listeners for dragging
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, isFixed]);

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
//info handler situation
const showMessageInfo = (message) => {
  setMessageInfo({
    id: message.id,
    read: message.read,
    read_at: message.read_at,
    delivered: message.delivered,
    timestamp: message.timestamp,
  });
};




  // 🟢 Load messages + socket setup
  //bhaii message asche
  useEffect(() => {
    if (!user || !meId || !token) {
      toast.error("Invalid user or session. Please log in again.");
      return;
    }

    let pollingInterval = null;

    const fetchMessages = async () => {
      try {
        // Resolve userId1/userId2 from conversation_id (same logic as DirectChatContext)
        // conversation_id is "senderId_recipientId" (e.g. "30_55")
        let userId1 = meId;
        let userId2 = user.id;
        if (user.conversation_id) {
          const parts = String(user.conversation_id).split("_").map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            [userId1, userId2] = parts;
          }
        }

        const serverMessages = await getDirectMessages(userId1, userId2);

        if (!Array.isArray(serverMessages)) return;

        // ---- Step 1: Process server messages ----
        const processedServerMessages = serverMessages.map((msg) => ({
          ...msg,
          delivered: msg.delivered ?? false,
          read: msg.read ?? false,
          read_at: msg.read_at ?? null,
          edited: msg.updated_at && msg.updated_at !== msg.timestamp,
          message_type:
            msg.type === "message_with_attachment" || msg.attachment
              ? "attachment"
              : "text",
        }));

        // ---- Step 2: ONE SINGLE setMessages (safe merge) ----
        setMessages((prev) => {
          const map = new Map();

          // Keep previous messages (including temp)
          prev.forEach((m) => {
            map.set(String(m.id || m.tempId), m);
          });

          // Merge server messages + replace temp ones
          processedServerMessages.forEach((msg) => {
            const tempMatch = prev.find(
              (m) =>
                m.tempId && m.sender_id === meId && m.content === msg.content
            );

            if (tempMatch) {
              // Remove temp message
              map.delete(String(tempMatch.tempId));
            }

            // Add real server message
            map.set(String(msg.id), msg);
          });

          return Array.from(map.values()).sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
        });

        // ---- Step 3: Scroll to first unread ----
        setTimeout(() => {
          if (firstUnreadMessageRef.current && !hasScrolledToUnread) {
            firstUnreadMessageRef.current.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            setHasScrolledToUnread(true);
          }
        }, 200);

        // ---- Step 4: Mark all read on server ----
        await markAllRead(meId, user.id);

        // ---- Step 5: Send read receipt via socket ----
        serverMessages.forEach((msg) => {
          if (!msg.read && msg.sender_id !== meId) {
            chatService.sendMessage({
              type: "update_status",
              message_id: msg.id,
              status: "read",
              read_at: new Date().toISOString(),
            });
          }
        });
      } catch (err) {
        console.error("Error fetching messages:", err.message);
        toast.error("Failed to load messages.");
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 5 seconds
    // pollingInterval = setInterval(fetchMessages, 5000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [user, meId, token]);
  //   useEffect(() => {
  //     if (!user || !meId || !token) {
  //       toast.error("Invalid user or session. Please log in again.");
  //       return;
  //     }

  //     // Fetch messages immediately when popup opens
  //     getDirectMessages(meId, user.id)
  //       .then((serverMessages) => {
  //         console.log("Backend → ", serverMessages);
  //         const uniqueMessagesMap = new Map();
  //         serverMessages.forEach((msg) => {
  //           const processedMsg = {
  //             ...msg,
  //             delivered: msg.delivered || false,
  //             read: msg.read || false,
  //             edited: msg.updated_at && msg.updated_at !== msg.timestamp,
  //             message_type: (msg.type === "message_with_attachment" || msg.attachment) ? "attachment" : "text", // Ensure message_type is correctly set based on message type or attachment presence
  //           };
  //           uniqueMessagesMap.set(msg.id, processedMsg);
  //         });
  //         const sortedUniqueMessages = Array.from(uniqueMessagesMap.values()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  //         setMessages(sortedUniqueMessages); // Set initial messages

  //         // Scroll to first unread message after a short delay
  //         setTimeout(() => {
  //           if (firstUnreadMessageRef.current && !hasScrolledToUnread) {
  //             firstUnreadMessageRef.current.scrollIntoView({
  //               behavior: "smooth",
  //               block: "center",
  //             });
  //             setHasScrolledToUnread(true);
  //           }
  //         }, 300);

  //         markAllRead(meId, user.id)
  //           .then(() => {
  //             // Proactively update client-side messages to 'read: true' for messages sent by the other user
  //             setMessages((prev) =>
  //               prev.map((msg) =>
  //                 msg.sender_id === user.id && !msg.read ? { ...msg, read: true } : msg
  //               )
  //             );

  //             // After marking all as read on the server, send socket updates for messages that were just read
  //             serverMessages.forEach((msg) => {
  //               const isMyMessage = msg.sender_id == meId;

  //               if (!msg.read && !isMyMessage) { // If it's NOT my message (so I am recipient) and not read
  //                 console.log(`[DEBUG] Sending read receipt for old message ${msg.id}`);
  //                 chatService.sendMessage({
  //                   type: "update_status",
  //                   message_id: msg.id,
  //                   status: "read"
  //                 });
  //               }
  //             });
  //           })
  //           .catch((err) =>
  //             console.error("Error marking messages as read:", err.message)
  //           );
  //       })
  //       .catch((err) => {
  //         console.error("Error fetching messages:", err.message);
  //         toast.error("Failed to load messages.");
  //       });

  //     // Subscribe to ChatService events
  //     const handleConnection = ({ status }) => {
  //       setConnectionStatus(status);
  //       console.log(`ChatService connection status: ${status}`);
  //     };

  //     const handleNewMessage = (data) => {
  //       console.log("Socket: handleNewMessage received data:", data); // Log raw incoming data
  //       let { message } = data;

  //       // Ensure message exists before processing
  //       if (!message) return;

  //       // FIX: Handle message_reply schema mismatch - Backend sends nested reply object
  //       if (message.type === "message_reply") {
  //         console.log("Socket: Processing message_reply:", message);
  //         const replyObj = message.reply;

  //         message = {
  //           id: replyObj.id,
  //           content: replyObj.reply_content,
  //           reply_to_id: replyObj.message_id,
  //           original_message: message.original_message,
  //           sender_id: message.replied_by_id,
  //           recipient_id: message.recipient_id,
  //           timestamp: replyObj.created_at,
  //           message_type: "reply"
  //         };
  //       }

  //       // Check if the message belongs to this chat
  //       // Simplified check: Message is relevant if sender or recipient matches current chat user
  //       const isRelevantMessage =
  //         message.sender_id == user.id ||
  //         message.recipient_id == user.id;

  //       if (isRelevantMessage) {
  //         console.log("Socket: New or updated message for current chat:", message);
  //         setMessages((prev) => {
  //           const newMessages = [...prev];
  //           let messageUpdated = false;

  //           // 1. Try to find and update by real message ID (for server-confirmed messages or messages from others)
  //           const existingByIdIndex = newMessages.findIndex((msg) => msg.id == message.id);
  //           if (existingByIdIndex > -1) {
  //             newMessages[existingByIdIndex] = {
  //               ...newMessages[existingByIdIndex],
  //               ...message,
  //               delivered: message.delivered || false,
  //               read: message.read || false,
  //               edited: message.updated_at && message.updated_at !== message.timestamp,
  //             };
  //             messageUpdated = true;
  //           } else if (message.sender_id == meId && message.id && !message.tempId) {
  //             // This is a server confirmation for *my* message, and it doesn't have a tempId from the server.
  //             // We need to find the corresponding optimistic message and update it.
  //             let optimisticMatchIndex = -1;

  //             // Find the optimistic message using the heuristic (sender, content, close timestamp)
  //             optimisticMatchIndex = newMessages.findIndex(
  //               (msg) =>
  //                 msg.tempId && // Must be an optimistic message
  //                 msg.sender_id == message.sender_id &&
  //                 msg.content === message.content &&
  //                 Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime()) < 300000 // within 5 minutes
  //             );

  //             if (optimisticMatchIndex > -1) {
  //               // Capture tempId BEFORE modifying the message
  //               const oldTempId = newMessages[optimisticMatchIndex].tempId;

  //               newMessages[optimisticMatchIndex] = {
  //                 ...newMessages[optimisticMatchIndex],
  //                 ...message,
  //                 id: message.id, // Update with the real server ID
  //                 tempId: undefined, // Remove tempId as it's now confirmed
  //                 delivered: message.delivered || false,
  //                 read: message.read || false,
  //                 edited: message.updated_at && message.updated_at !== message.timestamp,
  //               };
  //               messageUpdated = true;

  //               // Also remove from optimisticMessages map
  //               setOptimisticMessages((prev) => {
  //                 const newOptimistic = { ...prev };
  //                 if (oldTempId) {
  //                   delete newOptimistic[oldTempId];
  //                 }
  //                 return newOptimistic;
  //               });
  //             }
  //           }

  //           if (!messageUpdated) {
  //             // 4. If no existing message was updated, add it as a new message
  //             const processedMessage = {
  //               ...message,
  //               delivered: message.delivered || false,
  //               read: message.read || false,
  //               edited: message.updated_at && message.updated_at !== message.timestamp,
  //               message_type: message.message_type || ((message.type === "message_with_attachment" || message.attachment) ? "attachment" : "text"),
  //             };
  //             newMessages.push(processedMessage);
  //           }

  //           // AUTO MARK AS READ WHEN MESSAGE ARRIVES & CHAT IS OPEN
  //           if (message && message.sender_id != meId && !message.read) { // If I am NOT the sender (I am recipient)
  //             // Emit read receipt
  //             console.log(`[DEBUG] Sending read receipt for new message ${message.id}`);
  //             chatService.sendMessage({
  //               type: "update_status",
  //               message_id: message.id,
  //               status: "read"
  //             });

  //             // Update frontend UI for the newly arrived message
  //             // We need to find the specific message that was just added/updated and mark it as read in newMessages
  //             const messageToMarkReadIndex = newMessages.findIndex(m => m.id === message.id);
  //             if (messageToMarkReadIndex > -1) {
  //               newMessages[messageToMarkReadIndex] = { ...newMessages[messageToMarkReadIndex], read: true };
  //             }
  //           }

  //           return newMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  //         });
  //       }
  //     };

  //     const handleTyping = (data) => {
  //       console.log("Socket: handleTyping received data:", data); // Log typing events
  //       const { sender_id, recipient_id, status } = data;
  //       if (recipient_id === meId && sender_id === user.id) {
  //         if (status === "started") {
  //           setTypingUsers((prev) => ({
  //             ...prev,
  //             [user.id]: `${user.first_name} is typing...`,
  //           }));
  //           // Clear typing indicator after 3 seconds if no new typing event
  //           if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
  //           typingDebounceRef.current = setTimeout(() => {
  //             setTypingUsers((prev) => {
  //               const newTyping = { ...prev };
  //               delete newTyping[user.id];
  //               return newTyping;
  //             });
  //           }, 3000);
  //         } else if (status === "stopped") {
  //           setTypingUsers((prev) => {
  //             const newTyping = { ...prev };
  //             delete newTyping[user.id];
  //             return newTyping;
  //           });
  //         }
  //       }
  //     };

  //     const handleError = ({ message }) => {
  //       console.error("Socket: Error received:", message); // Log socket errors
  //       toast.error(message);
  //     };
  // //bhaii change korechi

  // const handleStatusUpdate = (data) => {
  //   const { message_id, status, read_at } = data;

  //   if (!message_id || !status) return;

  //   setMessages((prev) =>
  //     prev.map((msg) => {
  //       if (String(msg.id) === String(message_id)) {
  //         return {
  //           ...msg,
  //           delivered: status === "delivered" ? true : msg.delivered,
  //           read: status === "read" ? true : msg.read,
  //           read_at: status === "read"
  //             ? read_at || new Date().toISOString()  // socket থেকে না আসলে local time
  //             : msg.read_at,
  //         };
  //       }
  //       return msg;
  //     })
  //   );
  // };
  //     // const handleStatusUpdate = (data) => {
  //     //   const { message_id, status } = data;
  //     //   setMessages((prev) => {
  //     //     const updated = prev.map((msg) => {
  //     //       // Loose equality check for ID (string vs number)
  //     //       if (msg.id == message_id) {
  //     //         return { ...msg, [status]: true };
  //     //       }
  //     //       return msg;
  //     //     });
  //     //     return updated;
  //     //   });
  //     // };

  //     chatService.subscribe("connection", handleConnection);
  //     chatService.subscribe("new_message", handleNewMessage);
  //     chatService.subscribe("status_update", handleStatusUpdate);
  //     chatService.subscribe("typing", handleTyping);
  //     chatService.subscribe("error", handleError);

  //     // Set initial connection status
  //     setConnectionStatus(chatService.getConnectionStatus());

  //     return () => {
  //       chatService.unsubscribe("connection", handleConnection);
  //       chatService.unsubscribe("new_message", handleNewMessage);
  //       chatService.unsubscribe("status_update", handleStatusUpdate);
  //       chatService.unsubscribe("typing", handleTyping);
  //       chatService.unsubscribe("error", handleError);
  //       if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
  //     };
  //   }, [user, meId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setMessageInput(message.content || ""); // Use messageInput for content
    setReplyToMessage(null);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setMessageInput(""); // Clear messageInput
    setReplyToMessage(null);
  };
//bhaii reply on reply hobe 
const startReplying = (target) => {
  // target = message OR reply
  setReplyToMessage({
    id: target.id,
    type: target.reply_content ? "reply" : "message",
    content: target.reply_content || target.content,
    message_id: target.message_id || target.id, // parent message
  });

  setEditingMessageId(null);
  setMessageInput("");
};
  // const startReplying = (message) => {
  //   setReplyToMessage(message);
  //   setEditingMessageId(null);
  //   setMessageInput(""); // Clear input when starting a reply
  // };

  // Function to scroll to original message when clicking on reply context
  const scrollToMessage = (messageId) => {
    const messageElement = messageRefs.current[`message-${messageId}`];
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add highlight effect
      messageElement.style.backgroundColor = "rgba(255, 193, 7, 0.3)";
      setTimeout(() => {
        messageElement.style.backgroundColor = "";
      }, 2000);
    }
  };

  const cancelReplying = () => {
    setReplyToMessage(null);
  };
  //bhaii delete hocche ekhane
  const confirmDeleteMessage = (messageId) => {
    const deleteData = {
      type: "delete_message",
      message_id: messageId,
      deleted_by: meId, // খুব important
    };

    if (chatService.sendMessage(deleteData)) {
      // ❗ REMOVE করা যাবে না — শুধু mark করবো deleted
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted: true, deleted_by: meId } : m
        )
      );

      toast.success("Message deleted!");
    } else {
      toast.error("Failed to delete message.");
    }

    setMessageToDelete(null);
  };
  // const confirmDeleteMessage = (messageId) => {
  //   const deleteData = { type: "delete_message", message_id: messageId };
  //   if (chatService.sendMessage(deleteData)) {
  //     setMessages((prev) => prev.filter((m) => m.id !== messageId));
  //     toast.success("Message deleted successfully!");
  //   } else {
  //     toast.error("Failed to delete message.");
  //   }
  //   setMessageToDelete(null); // Clear confirmation after action
  // };

  const cancelDelete = () => {
    setMessageToDelete(null);
  };

  const handleTyping = () => {
    if (!chatService.isInitialized() || !user) return;
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    chatService.sendMessage({
      type: "typing",
      sender_id: meId,
      recipient_id: user.id,
      status: "started",
    });
    typingDebounceRef.current = setTimeout(() => {
      chatService.sendMessage({
        type: "typing",
        sender_id: meId,
        recipient_id: user.id,
        status: "stopped",
      });
    }, 2000);
  };

  // 🟢 Emoji handling
  const handleEmojiClick = (emojiObject) => {
    setMessageInput((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // 🟢 File handling
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validFile = AttechmentSizeLimit(file, e);
    if (!validFile) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile(file);
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 🟢 Send message (no duplicates)
  const sendMessage = (e) => {
    e.preventDefault();
    const text = messageInput.trim();

    // Editing message
    if (editingMessageId) {
      const updated = {
        type: "edit_message",
        message_id: editingMessageId,
        content: text,
        updated_at: new Date().toISOString(),
      };
      chatService.sendMessage(updated);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessageId ? { ...m, content: text, edited: true } : m
        )
      );
      setEditingMessageId(null);
      setMessageInput("");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    // Replying to a message
    if (replyToMessage) {
      // Optimistic UI for Reply
      const replyMessage = {
        id: tempId,
        tempId,
        reply_to_id: replyToMessage.id,
        content: text,
        original_message: replyToMessage,
        message_type: "reply",
        sender_id: meId,
        timestamp: new Date().toISOString(),
        delivered: false,
        read: false,
      };

      setMessages((prev) => [...prev, replyMessage]);

      // Send to Backend with Correct Schema
      const payload = {
        type: "message_reply",
        message_id: replyToMessage.id,
        reply_content: text,
      };
      chatService.sendMessage(payload);
      setMessageInput("");
      setReplyToMessage(null);
      return;
    }

    // Attachment
    if (selectedFile) {
      const base64Data = filePreview.split(",")[1];
      const message = {
        id: tempId,
        tempId,
        type: "message_with_attachment",
        sender_id: meId,
        recipient_id: user.id,
        content: text || selectedFile.name,
        attachment: {
          filename: selectedFile.name,
          content: base64Data,
        },
        timestamp: new Date().toISOString(),
        message_type: "attachment",
        delivered: false, // ✅ Delivered status
        read: false, // ✅ Read status
        read_at: null,
      };

      setMessages((prev) => [...prev, message]); // Local preview
      chatService.sendMessage(message);
      setSelectedFile(null);
      setFilePreview(null);
      setMessageInput("");
      return;
    }

    // Text message
    if (!text) {
      toast.error("Message cannot be empty.");
      return;
    }

    const message = {
      id: tempId,
      tempId,
      type: "message",
      sender_id: meId,
      recipient_id: user.id,
      content: text,
      timestamp: new Date().toISOString(),
      message_type: "text",
      delivered: false,
      read: false,
    };

    setMessages((prev) => [...prev, message]);
    chatService.sendMessage(message);
    setMessageInput("");
    setReplyToMessage(null);
  };

  const formatTime = (t) =>
    t
      ? new Date(t).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const formatDateSeparator = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .join("/");
  };

  return (
    <div
      ref={chatWindowRef}
      className="chat-popup"
      style={{
        position: isFixed ? "relative" : "fixed",
        left: isFixed ? undefined : position.x,
        top: isFixed ? undefined : position.y,
        zIndex: isFixed ? undefined : 1000 + index,
        width: isFixed ? "100%" : "500px",
        height: "400px",
        backgroundColor: "#fff",
        border: "2px solid #e0e0e0",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      {messageInfo && (
  <div
    className="border-top px-3 py-2"
    style={{ background: "#f8f9fa", fontSize: "13px" }}
  >
    <div className="d-flex justify-content-between align-items-center mb-1">
      <strong>Info</strong>
      <button
        className="btn btn-sm btn-light"
        onClick={() => setMessageInfo(null)}
      >
        ✕
      </button>
    </div>

    <div className="d-flex justify-content-between">
      <span>Sent</span>
      <span>{formatTime(messageInfo.timestamp)}</span>
    </div>

    {messageInfo.delivered && (
      <div className="d-flex justify-content-between">
        <span>Delivered</span>
        <span>{formatTime(messageInfo.timestamp)}</span>
      </div>
    )}

    {messageInfo.read_at ? (
      <div className="d-flex justify-content-between text-primary">
        <span>Seen</span>
        <span>{formatTime(messageInfo.read_at)}</span>
      </div>
    ) : (
      <div className="d-flex justify-content-between text-muted">
        <span>Not seen yet</span>
        <span>—</span>
      </div>
    )}
  </div>
)}
      <div className="chat-header" onMouseDown={handleMouseDown}>
        <h5 className="chat-title">
          {user.first_name} {user.last_name || ""}
        </h5>
        {onMaximize && (
          <button type="button" className="chat-close" onClick={onMaximize} title="Maximize">
            <i className="bi bi-arrows-fullscreen" />
          </button>
        )}
        <button type="button" className="chat-close" onClick={onClose}>
          <i className="bi bi-x"></i>
        </button>
      </div>


      <div className="chat-body">
        {messages.length === 0 ? (
          <div className="text-center text-muted">No messages yet.</div>
        ) : (
          messages.map((message, i) => {
            const isMe = message.sender_id === meId;
            // Check if this is the first unread message from the other user
            const isFirstUnread =
              !isMe &&
              !message.read &&
              messages.slice(0, i).every((m) => m.sender_id === meId || m.read);

            return (
              <div
                key={message.id || i}
                ref={(el) => {
                  if (el) {
                    messageRefs.current[`message-${message.id}`] = el;
                  }
                  if (isFirstUnread) {
                    firstUnreadMessageRef.current = el;
                  }
                }}
                className={`d-flex mb-2 ${
                  isMe ? "justify-content-end" : "justify-content-start"
                }`}
              >
                <div
                  className={`p-2 shadow-sm ${
                    isMe ? "bg-primary text-white" : "bg-white"
                  }`}
                  style={{ borderRadius: 12, maxWidth: "70%" }}
                >
                  {message.message_type === "attachment" ? (
                    message.is_deleted ? (
                      <span className="text-muted fst-italic">
                        This message has been deleted
                      </span>
                    ) : (
                      <AttachmentDisplay
                        attachment={message.attachment}
                        isMe={isMe}
                        message={message}
                      />
                    )
                  ) : (
                    <>
                      {message.reply_to_id && message.original_message && (
                        <div
                          className="reply-preview p-2 mb-2 rounded"
                          onClick={() => scrollToMessage(message.reply_to_id)}
                          style={{
                            backgroundColor: isMe
                              ? "rgba(255,255,255,0.2)"
                              : "#f0f0f0",
                            borderLeft: `3px solid ${isMe ? "#fff" : "#ccc"}`,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = isMe
                              ? "rgba(255,255,255,0.3)"
                              : "#e0e0e0";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = isMe
                              ? "rgba(255,255,255,0.2)"
                              : "#f0f0f0";
                          }}
                        >
                          <small className="text-muted">
                            Replying to{" "}
                            {message.original_message.sender_id === meId
                              ? "You"
                              : user.first_name}
                            :
                          </small>
                          <p
                            className="mb-0"
                            style={{
                              fontSize: "0.85em",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {message.original_message.content}
                          </p>
                        </div>
                      )}

                      {/* bhaii delete korar Ui update */}
                      {(() => {
                        const isEmojiOnly =
                          message.message_type !== "attachment" &&
                          !message.reply_to_id &&
                          isOnlyEmojis(message.content);

                        return (
                          <span
                            style={{
                              fontSize: isEmojiOnly ? "40px" : "inherit",
                              lineHeight: isEmojiOnly ? "1.2" : "inherit",
                              display: "inline-block",
                            }}
                          >
                            {message.is_deleted ? (
                              <span className="text-muted fst-italic">
                                This message has been deleted
                              </span>
                            ) : (
                              message.content
                            )}

                            {message.edited && !message.deleted && (
                              <span
                                className="ms-1 text-muted"
                                style={{ fontSize: "0.75em" }}
                              >
                                (edited)
                              </span>
                            )}
                          </span>
                        );
                      })()}
                    </>
                  )}

                {

                  !message.is_deleted &&
                     <small
                    className={`ms-2 ${
                      isMe ? "text-white-50" : "text-muted"
                    } message-status`}
                    style={{
                      fontSize: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: "4px",
                    }}
                  >
                    {formatTime(message.timestamp)}
                    {isMe && (
                      <>
                        {message.read ? (
                          <i
                            className="bi bi-check2-all"
                            style={{ color: "#34B7F1", fontSize: "14px" }}
                            title="Read"
                          ></i>
                        ) : message.delivered ? (
                          <i
                            className="bi bi-check2-all"
                            style={{ color: "#999", fontSize: "14px" }}
                            title="Delivered"
                          ></i>
                        ) : (
                          <i
                            className="bi bi-check2"
                            style={{ color: "#999", fontSize: "14px" }}
                            title="Sent"
                          ></i>
                        )}
                      </>
                    )}
                    <div className="relative ">
                      <button
                        className={`p-1 ${
                          isMe ? "text-white/60" : "text-black/50"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(
                            openDropdown === message.id ? null : message.id
                          );
                        }}
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>

                      {openDropdown === message.id && (
                        <ul className=" absolute right-0 mt-1 w-32 bg-white text-black rounded-md shadow-lg border z-50 overflow-hidden ">
                          {isMe && (
                            <>
                              <li>
                                <button
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    startEditing(message);
                                  }}
                                >
                                  Edit
                                </button>
                              </li>

                              <li>
                                <button
                                  className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-100"
                                  onClick={() => {
                                    setOpenDropdown(null);
                                    setMessageToDelete(message); // Set message for confirmation
                                  }}
                                >
                                  Delete
                                </button>
                              </li>
                            </>
                          )}

                          <li>
                            <button
                              className="w-full text-left px-3 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setOpenDropdown(null);
                                startReplying(message);
                              }}
                            >
                              Reply
                            </button>
                          </li>

                          <li>
                            
  <button
    className="w-full text-left px-3 py-2 hover:bg-gray-100"
    onClick={() => {
      setOpenDropdown(null);
      showMessageInfo(message);
    }}
  >
  Info
  </button>
</li>
                        </ul>
                      )}
                    </div>
                  </small>
                }
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Delete Confirmation Preview */}
      {messageToDelete && (
        <div
          style={{
            padding: "10px 14px",
            background: "#FFF3CD", // Light orange background for warning
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            borderTop: "1px solid #FFECB3",
            borderBottom: "1px solid #FFECB3",
            gap: "8px",
            boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
            color: "#664D03", // Dark yellow text
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "15px" }}>
            Confirm Deletion
          </div>
          <div style={{ fontSize: "14px" }}>
            Are you sure you want to delete this message?
          </div>
          <p
            style={{
              fontSize: "13px",
              fontStyle: "italic",
              marginBottom: "0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            "{messageToDelete.content}"
          </p>
          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            <button
              onClick={() => confirmDeleteMessage(messageToDelete.id)}
              style={{
                background: "#DC3545", // Red for delete
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 15px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Delete
            </button>
            <button
              onClick={cancelDelete}
              style={{
                background: "#6C757D", // Grey for cancel
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 15px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <AttachmentInputPreview
        selectedFile={selectedFile}
        filePreview={filePreview}
        onRemove={() => {
          setSelectedFile(null);
          setFilePreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
      />

      {/* Footer */}
      
      <div className="chat-footer">
        {replyToMessage && (
          <div className="reply-input-preview p-2 border-top bg-light d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="bi bi-reply-fill me-2"></i>
              <span>
                Replying to{" "}
                {replyToMessage.sender_id === meId ? "You" : user.first_name}: "
                {replyToMessage.content}"
              </span>
            </div>
            <button
              className="btn btn-link text-danger p-0"
              onClick={cancelReplying}
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="w-100">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              position: "relative",
            }}
          >
            {/* Emoji Button - Outside on Left */}
            <button
              type="button"
              className="btn btn-light border rounded-pill"
              title="Add Emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{ cursor: "pointer", flexShrink: 0 }}
            >
              <i className="bi bi-emoji-smile"></i>
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

            {/* Input Group with Attachment, Input, and Send */}
            <div className="input-group" style={{ flex: 1 }}>
              <label
                htmlFor="fileInput"
                className="btn btn-light border rounded-pill"
                title="Attach File"
                style={{ cursor: "pointer" }}
              >
                <i className="bi bi-paperclip"></i>
              </label>
              <input
                id="fileInput"
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
{replyToMessage && (
  <div
    style={{
      background: "#f1f3f5",
      borderLeft: "4px solid #0d6efd",
      padding: "6px 10px",
      marginBottom: "6px",
      borderRadius: "6px",
      fontSize: "13px",
    }}
  >
    <div style={{ fontWeight: 600 }}>
      Replying to
    </div>

    <div
      style={{
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {replyToMessage.content}
    </div>

    <button
      onClick={() => setReplyToMessage(null)}
      style={{
        border: "none",
        background: "transparent",
        fontSize: "12px",
        color: "#dc3545",
        marginTop: "4px",
        cursor: "pointer",
      }}
    >
      Cancel
    </button>
  </div>
)} 
{/*bhai reply on reply */}
              <input
                type="text"
                className="form-control"
                placeholder={
                  editingMessageId
                    ? "Edit your message..."
                    : replyToMessage
                    ? "Reply to message..."
                    : "Type a message..."
                }
                value={messageInput}
                onPaste={handlePaste}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  handleTyping();
                }}
              />
              {editingMessageId && (
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
              )}
              <button className="btn btn-primary" type="submit">
                <i className="bi bi-send"></i>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPopup;
