// import React, { useEffect, useRef, useState } from "react";
// import axios from "axios";
// import logo from "../../images/Easy return logo png.png";
// import "bootstrap/dist/css/bootstrap.min.css";
// import "bootstrap-icons/font/bootstrap-icons.css";
// import { useNavigate } from "react-router-dom";
// import { getDirectMessages, getRecentChats, getUnreadCount, markAllRead } from "../../Services/DirectsmsApi";
// import { emitter } from "../../EventEmitter";
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import './DirectMessagesPage.css'
// export default function ChatApp() {
//   const [users, setUsers] = useState([]);
//   const [filteredUsers, setFilteredUsers] = useState([]);
//   const [activeUser, setActiveUser] = useState(null);
//   const [ws, setWs] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [connectionStatus, setConnectionStatus] = useState("disconnected");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [activeTab, setActiveTab] = useState("messages");
//   const [recentChats, setRecentChats] = useState([]);
//   const [unreadCounts, setUnreadCounts] = useState({});
//   const [selectedMessages, setSelectedMessages] = useState([]);
//   const [replyToMessage, setReplyToMessage] = useState(null);
//   const [pendingReplies, setPendingReplies] = useState({});
//   const [isSelectionMode, setIsSelectionMode] = useState(false);
//   const [editingMessage, setEditingMessage] = useState(null);
//   const [editContent, setEditContent] = useState("");
//   const [attachment, setAttachment] = useState(null);
//   const [isTyping, setIsTyping] = useState(false);
//   const [typingUsers, setTypingUsers] = useState({});
//   const [isFileUploading, setIsFileUploading] = useState(false);
//   const [editingMessageId, setEditingMessageId] = useState(null);
//   const [showInfoMessageId, setShowInfoMessageId] = useState(null);

//   const messagesEndRef = useRef(null);
//   const checkboxColumnRef = useRef(null);
//   const messageRefs = useRef([]);
//   const fileInputRef = useRef(null);
//   const typingTimeoutRef = useRef(null);
//   const typingDebounceRef = useRef(null);

//   const navigate = useNavigate();

//   const BASE_URL = "https://chatsupport.fskindia.com";
//   const WS_BASE_URL = "wss://chatsupport.fskindia.com";
//   const TOEKN = localStorage.getItem("accessToken");
//   const ME_ID = parseInt(localStorage.getItem("userId")) || null;

//   useEffect(() => {
//     const dropdowns = document.querySelectorAll('[data-bs-toggle="dropdown"]');
//     dropdowns.forEach((dropdown) => {
//       if (!dropdown.dataset.cloned) {
//         const clone = dropdown.cloneNode(true);
//         clone.dataset.cloned = true;
//         dropdown.parentNode.replaceChild(clone, dropdown);
//       }
//     });
//   }, [messages]);
//   useEffect(() => {
//     if (editingMessageId) {
//       document.querySelector('input[name="message"]').focus();
//     }
//   }, [editingMessageId]);
//   useEffect(() => {
//     const { state } = navigate.location || {};
//     if (state?.activeUser) {
//       setActiveUser(state.activeUser);
//     }

//     if (!ME_ID || !TOEKN || isNaN(ME_ID)) {
//       console.warn("Invalid user ID or token", {
//         userId: localStorage.getItem("userId"),
//         token: localStorage.getItem("accessToken"),
//       });
//       // toast.error("Please log in to access messages.");
//       return;
//     }

//     axios
//       .get(`${BASE_URL}/users/?skip=0&limit=100`, {
//         headers: { Authorization: `Bearer ${TOEKN}` },
//       })
//       .then((res) => {
//         const filtered = res.data.records.filter((u) => u.id !== ME_ID);
//         setUsers(filtered);
//         setFilteredUsers(filtered);
//       })
//       .catch((err) => {
//         console.error("Error fetching users:", {
//           status: err.response?.status,
//           message: err.message,
//           details: err.response?.data?.detail,
//         });
//         // toast.error("Failed to load users. Please try again.");
//       });

//     getRecentChats()
//       .then((chats) => {
//         setRecentChats(chats);
//         const counts = {};
//         chats.forEach((chat) => {
//           counts[chat.recipient_id] = chat.unread_count || 0;
//         });
//         setUnreadCounts(counts);
//       })
//       .catch((err) => {
//         console.error("Error fetching recent chats:", err.message);
//         // toast.error("Failed to load recent chats.");
//       });

//     getUnreadCount(ME_ID)
//       .then((data) => {
//         const counts = {};
//         Object.keys(data).forEach((userId) => {
//           counts[parseInt(userId)] = data[userId] || 0;
//         });
//         setUnreadCounts((prev) => ({ ...prev, ...counts }));
//       })
//       .catch((err) => {
//         console.error("Error fetching unread count:", err.message);
//         // toast.error("Failed to load unread counts.");
//       });
//   }, []);

//   useEffect(() => {
//     if (searchTerm.trim() === "") {
//       // Sort users based on the most recent chat timestamp
//       const sortedUsers = [...users].sort((a, b) => {
//         const chatA = recentChats.find((chat) => chat.recipient_id === a.id);
//         const chatB = recentChats.find((chat) => chat.recipient_id === b.id);
//         const timeA = chatA?.last_message_timestamp ? new Date(chatA.last_message_timestamp).getTime() : 0;
//         const timeB = chatB?.last_message_timestamp ? new Date(chatB.last_message_timestamp).getTime() : 0;
//         // Sort in descending order (most recent first); users without chats go to the bottom
//         return timeB - timeA;
//       });
//       setFilteredUsers(sortedUsers);
//     } else {
//       // Apply search filter and then sort based on recent chat timestamp
//       const filtered = users.filter((user) =>
//         `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//       const sortedFilteredUsers = filtered.sort((a, b) => {
//         const chatA = recentChats.find((chat) => chat.recipient_id === a.id);
//         const chatB = recentChats.find((chat) => chat.recipient_id === b.id);
//         const timeA = chatA?.last_message_timestamp ? new Date(chatA.last_message_timestamp).getTime() : 0;
//         const timeB = chatB?.last_message_timestamp ? new Date(chatB.last_message_timestamp).getTime() : 0;
//         return timeB - timeA;
//       });
//       setFilteredUsers(sortedFilteredUsers);
//     }
//   }, [searchTerm, users, recentChats]);

//   useEffect(() => {
//     if (!activeUser || !ME_ID || !TOEKN || isNaN(ME_ID)) return;

//     if (ws) ws.close();

//     const socket = new WebSocket(`${WS_BASE_URL}/messaging/ws/${ME_ID}/${TOEKN}`);
//     setWs(socket);

//     socket.onopen = () => {
//       setConnectionStatus("connected");
      
//       setTypingUsers({});
//     };

//     socket.onerror = (error) => {
//       setConnectionStatus("error");
//       console.error("WebSocket error:", error);
//       // toast.error("WebSocket connection failed.");
//     };

//     socket.onclose = () => {
//       setConnectionStatus("disconnected");
      
//       setTypingUsers({});
//       setTimeout(() => {
//         if (localStorage.getItem("accessToken")) {
//           setWs(new WebSocket(`${WS_BASE_URL}/messaging/ws/${ME_ID}/${TOEKN}`));
//         }
//       }, 3000);
//     };

//     // ... (socket.onmessage handler moved above for clarity)

//     getDirectMessages(ME_ID, activeUser.id)
//       .then((serverMessages) => {

//         setMessages((prev) =>
//           serverMessages.map((msg) => {
//             const localMatch = prev.find(
//               (localMsg) =>
//                 localMsg.id &&
//                 String(localMsg.id).startsWith("temp-") &&
//                 localMsg.sender_id === msg.sender_id &&
//                 localMsg.recipient_id === msg.recipient_id &&
//                 Math.abs(new Date(localMsg.timestamp) - new Date(msg.timestamp)) < 2000 &&
//                 localMsg.content === msg.content
//             );
//             return {
//               ...msg,
//               reply_to_id: msg.reply_to_id || localMatch?.reply_to_id || pendingReplies[msg.id] || null,
//               edited: msg.updated_at && msg.updated_at !== msg.timestamp,
//               attachment: msg.attachment
//                 ? {
//                   id: msg.attachment,
//                   content_type: msg.attachment_content_type || localMatch?.attachment?.content_type || "application/octet-stream",
//                   filename: localMatch?.attachment?.filename,
//                 }
//                 : localMatch?.attachment || null,
//               delivered: msg.delivered || false, // Updated to only handle delivered
//               read: msg.read || false,
//             };
//           })
//         );
//         if (activeUser?.id && unreadCounts[activeUser.id] > 0) {
//           serverMessages.forEach((msg) => {
//             if (msg.sender_id === activeUser.id && !msg.read) {
//               socket.send(
//                 JSON.stringify({
//                   type: "update_status",
//                   message_id: msg.id,
//                   status: "read",
//                 })
//               );
//             }
//           });
//           markAllRead(ME_ID, activeUser.id)
//             .then(() => {
//               setUnreadCounts((prev) => ({ ...prev, [activeUser.id]: 0 }));
//             })
//             .catch((err) => console.error("Error marking messages as read:", err.message));
//         }
//       })
//       .catch((err) => {
//         console.error("Error fetching messages:", err.message);
//         // toast.error("Failed to load messages.");
//       });

//     return () => socket.close();
//   }, [activeUser, unreadCounts, users]);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   useEffect(() => {
//     const messageArea = messagesEndRef.current?.parentElement;
//     const checkboxArea = checkboxColumnRef.current;
//     if (messageArea && checkboxArea) {
//       const syncScroll = () => {
//         checkboxArea.scrollTop = messageArea.scrollTop;
//       };
//       messageArea.addEventListener("scroll", syncScroll);
//       return () => messageArea.removeEventListener("scroll", syncScroll);
//     }
//   }, [isSelectionMode, messages]);

//   const handleTyping = (e) => {
//     if (!ws || ws.readyState !== WebSocket.OPEN || !activeUser) {
//       return;
//     }

//     // Clear any existing debounce timeout
//     if (typingDebounceRef.current) {
//       clearTimeout(typingDebounceRef.current);
//     }

//     // Send typing indicator immediately
//     ws.send(
//       JSON.stringify({
//         type: "typing",
//         sender_id: ME_ID,
//         recipient_id: activeUser.id,
//       })
//     );

//     // Set a timeout to stop the typing indicator after 3 seconds of inactivity
//     typingDebounceRef.current = setTimeout(() => {
//       setIsTyping(false);
//     }, 3000);
//   };

//   const handleFileChange = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     if (file.size > 5 * 1024 * 1024) {
//       toast.error("File size exceeds 5MB limit.");
//       return;
//     }

//     const allowedTypes = [
//       "image/jpeg",
//       "image/png",
//       "image/gif",
//       "application/pdf",
//       "application/msword",
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//     ];
//     if (!allowedTypes.includes(file.type)) {
//       toast.error("Only JPEG, PNG, GIF, PDF, DOC, and DOCX files are supported.");
//       return;
//     }

//     if (!ws || ws.readyState !== 1) {
//       // toast.error("WebSocket not connected. Please try again.");
//       return;
//     }

//     setIsFileUploading(true);
//     try {
//       const reader = new FileReader();
//       reader.onload = () => {
//         const base64Data = reader.result.split(',')[1];
//         const attachmentData = {
//           data: base64Data,
//           content_type: file.type,
//           filename: file.name
//         };
//         setAttachment({ id: `temp-${Date.now()}`, content_type: file.type, filename: file.name, data: base64Data });

//         setIsFileUploading(false);
//       };
//       reader.onerror = () => {
//         console.error("Error reading file");
//         toast.error("Failed to read file.");
//         setIsFileUploading(false);
//       };
//       reader.readAsDataURL(file);
//     } catch (error) {
//       console.error("File processing error:", error);
//       toast.error("Error processing file.");
//       setIsFileUploading(false);
//     }
//   };
//   // Inside sendMessage function
//   const sendMessage = (e) => {
//     e.preventDefault();
//     const input = e.target.elements.message;
//     const text = input.value.trim();

//     if (!text && !attachment && !editingMessageId) {
//       toast.error("Message or file required.");
//       return;
//     }

//     if (!ws || ws.readyState !== WebSocket.OPEN) {
//       toast.error("WebSocket not connected. Please try again.");
//       return;
//     }

//     if (editingMessageId) {
//       // Handle message edit
//       const updatedMessage = {
//         type: "edit_message",
//         message_id: editingMessageId,
//         content: text,
//         updated_at: new Date().toISOString(),
//       };
//       ws.send(JSON.stringify(updatedMessage));


//       setMessages((prev) =>
//         prev.map((msg) =>
//           msg.id === editingMessageId
//             ? {
//               ...msg,
//               content: text,
//               edited: true,
//               updated_at: new Date().toISOString(),
//               delivered: msg.delivered || false,
//               read: msg.read || false,
//             }
//             : msg
//         )
//       );
//       setEditingMessageId(null);
//       setEditContent("");
//     } else {
//       setIsFileUploading(!!attachment);
//       const tempId = `temp-${Date.now()}`;
//       let message;

//       if (attachment) {
//         message = {
//           type: "direct_message",
//           data: {
//             sender_id: ME_ID,
//             recipient_id: activeUser.id,
//             content: text,
//             attachment: {
//               data: attachment.data,
//               content_type: attachment.content_type,
//               filename: attachment.filename,
//             },
//             timestamp: new Date().toISOString(),
//             message_type: "file",
//             reply_to_id: replyToMessage?.id || null,
//             id: tempId,
//             edited: false,
//             delivered: false, // Removed sent status
//             read: false,
//           },
//         };
//       } else {
//         message = {
//           type: "message",
//           sender_id: ME_ID,
//           recipient_id: activeUser.id,
//           content: text,
//           attachment: null,
//           timestamp: new Date().toISOString(),
//           message_type: "text",
//           reply_to_id: replyToMessage?.id || null,
//           id: tempId,
//           edited: false,
//           delivered: false, // Removed sent status
//           read: false,
//         };
//       }
//       ws.send(JSON.stringify(message));

//       if (message.data?.reply_to_id || message.reply_to_id) {
//         setPendingReplies((prev) => ({ ...prev, [tempId]: message.data?.reply_to_id || message.reply_to_id }));
//       }

//       setMessages((prev) => {
//         const updatedMessages = [
//           ...prev,
//           {
//             ...message.data || message,
//             attachment: message.data?.attachment
//               ? { id: tempId, content_type: message.data.attachment.content_type, filename: message.data.attachment.filename }
//               : null,
//           },
//         ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
//         return updatedMessages;
//       });

//       if (activeUser) {
//         emitter.emit("newMessage", {
//           senderId: ME_ID,
//           senderName: "You",
//           content: text,
//           timestamp: message.data?.timestamp || message.timestamp,
//           messageId: tempId,
//           type: "sent",
//           recipientId: activeUser.id,
//           attachment: attachment
//             ? { id: tempId, content_type: attachment.content_type, filename: attachment.filename }
//             : null,
//         });
//       }
//     }

//     input.value = "";
//     setReplyToMessage(null);
//     setAttachment(null);
//     fileInputRef.current.value = null;
//   };

//   const copyMessage = (content) => {
//     navigator.clipboard.writeText(content).then(() => {
//       toast.success("Message copied to clipboard!");
//     });
//   };

//   const copyImage = (attachment) => {
//     if (attachment && attachment.content_type?.startsWith("image/")) {
//       fetch(`${BASE_URL}/messaging/upload-file/?id=${attachment.id}`)
//         .then((res) => res.blob())
//         .then((blob) => {
//           navigator.clipboard.writeBlob(blob).then(() => {
//             toast.success("Image copied to clipboard!");
//           });
//         })
//         .catch((err) => {
//           console.error("Error copying image:", err);
//           // toast.error("Failed to copy image.");
//         });
//     }
//   };

//   const deleteSelectedMessages = () => {
//     if (window.confirm(`Are you sure you want to delete ${selectedMessages.length} message(s)?`)) {
//       if (ws && ws.readyState === WebSocket.OPEN && selectedMessages.length > 0) {
//         selectedMessages.forEach((messageId) => {
//           const message = {
//             type: "delete_message",
//             message_id: messageId,
//           };
//           ws.send(JSON.stringify(message));

//         });

//         setMessages((prev) => prev.filter((msg) => !selectedMessages.includes(msg.id)));
//         setSelectedMessages([]);
//         setIsSelectionMode(false);

//         // Sync with server to ensure deleted messages are removed
//         setTimeout(() => {
//           getDirectMessages(ME_ID, activeUser.id)
//             .then((updatedMessages) => {
//               setMessages(
//                 updatedMessages.map((msg) => ({
//                   ...msg,
//                   reply_to_id: msg.reply_to_id || pendingReplies?.[msg.id] || null,
//                   edited: msg.updated_at && msg.updated_at !== msg.timestamp,
//                   attachment: msg.attachment ? { id: msg.attachment, content_type: msg.attachment_content_type || 'application/octet-stream', filename: msg.attachment?.filename } : null,
//                   delivered: msg.delivered || false, // Updated to only handle delivered
//                   read: msg.read || false,
//                 }))
//               );
//             })
//             .catch((err) => console.error("Error syncing messages after deletion:", err.message));
//         }, 500);
//       }
//     }
//   };

//   const startEditing = (message) => {
//     setEditingMessageId(message.id);
//     setEditContent(message.content);
//   };

//   const cancelEditing = () => {
//     setEditingMessageId(null);
//     setEditContent("");
//   };

//   const saveEdit = (messageId) => {
//     if (ws && ws.readyState === WebSocket.OPEN && editContent.trim()) {
//       const updatedMessage = {
//         type: "edit_message",
//         message_id: messageId,
//         content: editContent.trim(),
//         updated_at: new Date().toISOString(),
//       };
//       ws.send(JSON.stringify(updatedMessage));


//       setMessages((prev) =>
//         prev.map((msg) =>
//           msg.id === messageId
//             ? {
//               ...msg,
//               content: editContent.trim(),
//               edited: true,
//               updated_at: new Date().toISOString(),
//               delivered: msg.delivered || false,
//               read: msg.read || false,
//             }
//             : msg
//         )
//       );
//       setEditingMessage(null);
//       setEditContent("");
//     } else {
//       toast.error("Cannot edit: WebSocket not connected or empty message.");
//     }
//   };

//   const handleMessageSelect = (messageId) => {
//     setSelectedMessages((prev) =>
//       prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
//     );
//   };

//   const handleSelectAll = () => {
//     setSelectedMessages((prev) =>
//       prev.length === messages.length ? [] : messages.map((msg) => msg.id)
//     );
//   };

//   const handleReply = (message) => {
//     setReplyToMessage(message);
//     document.querySelector('input[name="message"]').focus();
//   };

//   const handleDoubleTap = (message) => {
//     setReplyToMessage(message);
//     document.querySelector('input[name="message"]').focus();
//   };

//   const cancelReply = () => {
//     setReplyToMessage(null);
//   };

//   const toggleSelectionMode = () => {
//     setIsSelectionMode((prev) => !prev);
//     setSelectedMessages([]);
//   };

//   const formatDateSeparator = (timestamp) => {
//     if (!timestamp) return "";
//     const date = new Date(timestamp);
//     const today = new Date();
//     const yesterday = new Date();
//     yesterday.setDate(today.getDate() - 1);

//     const isToday = date.toDateString() === today.toDateString();
//     const isYesterday = date.toDateString() === yesterday.toDateString();

//     if (isToday) return "Today";
//     if (isYesterday) return "Yesterday";
//     return date.toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//     }).split("/").join("/");
//   };

//   const formatTime = (timestamp) => {
//     if (!timestamp) return "";
//     const date = new Date(timestamp);
//     return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase();
//   };

//   const getLastMessage = (userId) => {
//     const chat = recentChats.find((c) => c.recipient_id === userId);
//     if (chat) {
//       return { content: chat.last_message, timestamp: chat.last_message_timestamp };
//     }
//     getDirectMessages(ME_ID, userId, 0, 1)
//       .then((messages) => {
//         if (messages.length > 0) {
//           const lastMessage = messages[messages.length - 1];
//           setRecentChats((prev) => [
//             ...prev,
//             {
//               recipient_id: userId,
//               last_message: lastMessage.content,
//               last_message_timestamp: lastMessage.timestamp,
//               unread_count: lastMessage.read ? 0 : 1,
//             },
//           ]);
//           return { content: lastMessage.content, timestamp: lastMessage.timestamp };
//         }
//         return {};
//       })
//       .catch((err) => console.error("Error fetching last message:", err.message));
//     return {};
//   };

//   const getInitials = (firstName, lastName) => {
//     return `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
//   };

//   const renderAttachment = (attachment) => {
//     if (!attachment) return null;
//     const contentType = attachment.content_type || "";
//     if (contentType.startsWith("image/")) {
//       return (
//         <img
//           src={`${BASE_URL}/messaging/upload-file/?id=${attachment.id}`}
//           alt={`Attachment ${attachment.filename || attachment.id}`}
//           className="img-thumbnail"
//           style={{ maxWidth: "150px", maxHeight: "150px", cursor: "pointer" }}
//           onClick={() => copyImage(attachment)}
//           title="Preview"
//         />
//       );
//     }
//     return (
//       <div className="d-flex align-items-center">
//         <i className="bi bi-file-earmark me-2"></i>
//         <a
//           href={`${BASE_URL}/messaging/upload-file/?id=${attachment.id}`}
//           download={attachment.filename || `attachment_${attachment.id}`}
//           className="text-decoration-none"
//         >
//           Download {attachment.filename || "File"}
//         </a>
//       </div>
//     );
//   };

//   const toggleMessageInfo = (messageId) => {
//     setShowInfoMessageId(showInfoMessageId === messageId ? null : messageId);
//   };

//   return (
//     <div
//       className="d-flex"
//       style={{ height: "100vh", padding: "10px", marginTop: "60px", fontFamily: "'Inter', sans-serif" }}
//     >
//       <div className="d-flex flex-column bg-white shadow-sm" style={{ width: "350px", border: "12px solid #e9ecef0" }}>
//         <div className="p-3 border-bottom d-flex align-items-center">
//           <img src={logo} alt="Logo" style={{ width: "60px" }} />
//           <h2 className="ms-2 mb-0" style={{ fontSize: "1.5rem", color: "#1a1a1a" }}>
//             Chats
//           </h2>
//         </div>

//         <div className="d-flex border-bottom">
//           <button
//             className={`flex-grow-1 btn btn-${activeTab === "messages" ? "primary" : "outline-primary"} rounded-0`}
//             onClick={() => setActiveTab("messages")}
//           >
//             Messages
//           </button>
//           <button
//             className={`flex-grow-1 btn btn-${activeTab === "groups" ? "primary" : "outline-primary"} rounded-0`}
//             onClick={() => navigate("/groups")}
//           >
//             Groups
//           </button>
//         </div>

//         <div className="p-3 border-bottom">
//           <div className="input-group rounded-3 overflow-hidden">
//             <span className="input-group-text border-0 mx-1 my-1">
//               <i className="bi bi-search" style={{ color: "#6c757d", fontSize: "17px" }}></i>
//             </span>
//             <input
//               type="text"
//               className="form-control"
//               placeholder="Search users..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               style={{ fontSize: "14px", border: "none" }}
//             />
//           </div>
//         </div>

//         <div className="flex-grow-1 overflow-auto">
//           {filteredUsers.map((user) => {
//             const { content: lastMessage, timestamp: lastMessageTime } = getLastMessage(user.id) || {};
//             return (
//               <div
//                 key={user.id}
//                 className={`d-flex align-items-center p-3 border-bottom d-pointer ${activeUser?.id === user.id ? "bg-primary bg-opacity-10" : ""}`}
//                 onClick={() => setActiveUser(user)}
//                 style={{ transition: "background-color 0.2s" }}
//                 onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f3f5")}
//                 onMouseLeave={(e) =>
//                 (e.currentTarget.style.backgroundColor =
//                   activeUser?.id === user.id ? "rgba(13, 110, 253, 0.1)" : "transparent")
//                 }
//               >
//                 <div className="position-relative me-3">
//                   {user.profile_picture ? (
//                     <img
//                       src={user.profile_picture}
//                       alt="Profile"
//                       className="rounded-circle"
//                       style={{ width: "40px", height: "40px", objectFit: "cover" }}
//                     />
//                   ) : (
//                     <div
//                       className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
//                       style={{ width: "40px", height: "40px", fontSize: "16px" }}
//                     >
//                       {getInitials(user.first_name, user.last_name || "")}
//                     </div>
//                   )}
//                   <div
//                     className="position-absolute bottom-0 end-0 rounded-circle border border-white"
//                     style={{
//                       width: "10px",
//                       height: "10px",
//                       backgroundColor: user.availability ? "#28a745" : "#6c757d",
//                     }}
//                   ></div>
//                 </div>
//                 <div className="flex-grow-1">
//                   <div className="d-flex justify-content-between align-items-center">
//                     <strong className="text-dark" style={{ fontSize: "14px" }}>
//                       {user.first_name} {user.last_name}
//                     </strong>
//                     <small className="text-primary" style={{ fontSize: "12px" }}>
//                       {formatTime(lastMessageTime)}
//                     </small>
//                   </div>
//                   <div className="d-flex justify-content-between align-items-center">
//                     <small
//                       className="text-muted text-truncate"
//                       style={{ maxWidth: "150px", fontSize: "12px" }}
//                     >
//                       {lastMessage
//                         ? lastMessage.length > 20
//                           ? lastMessage.substring(0, 20) + "..."
//                           : lastMessage
//                         : "No messages yet"}
//                     </small>
//                     {unreadCounts[user.id] > 0 && (
//                       <span
//                         className="badge bg-primary rounded-circle ms-2 d-flex align-items-center justify-content-center"
//                         style={{ width: "20px", height: "20px", fontSize: "10px" }}
//                       >
//                         {unreadCounts[user.id]}
//                       </span>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       <div className="flex-grow-1 d-flex flex-column ms-3 bg-white rounded-3 shadow-sm">
//         {/* <div
//           className="p-2 text-center"
//           style={{ backgroundColor: connectionStatus === "connected" ? "#d4edda" : "#f8d7da" }}
//         >
//           <small>{connectionStatus === "connected" ? "connected" : ""}</small>
//         </div> */}
//         {activeUser ? (
//           <>
//             <div className="d-flex align-items-center p-3 border-bottom">
//               <div className="position-relative me-3">
//                 {activeUser.profile_picture ? (
//                   <img
//                     src={activeUser.profile_picture}
//                     alt="Profile"
//                     className="rounded-circle"
//                     style={{ width: "40px", height: "40px", objectFit: "cover" }}
//                   />
//                 ) : (
//                   <div
//                     className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
//                     style={{ width: "40px", height: "40px", fontSize: "16px" }}
//                   >
//                     {getInitials(activeUser.first_name, activeUser.last_name || "")}
//                   </div>
//                 )}
//                 <div
//                   className="position-absolute bottom-0 end-0 rounded-circle border border-white"
//                   style={{
//                     width: "10px",
//                     height: "10px",
//                     backgroundColor: activeUser.availability ? "#28a745" : "#6c757d",
//                   }}
//                 ></div>
//               </div>
//               <div>
//                 <h5 className="m-0" style={{ fontSize: "16px" }}>
//                   {activeUser.first_name} {activeUser.last_name}
//                   {activeUser.availability && <small className="ms-2 text-success">Active</small>}
//                 </h5>
//                 <small className="text-muted" style={{ fontSize: "12px" }}>
//                   Active {formatTime(activeUser.last_login)}
//                 </small>
//               </div>
//               <div style={{ zIndex: "100000" }} className="ms-auto d-flex align-items-center">
//                 {isSelectionMode ? (
//                   <>
//                     <input
//                       type="checkbox"
//                       className="me-2"
//                       checked={selectedMessages.length === messages.length && messages.length > 0}
//                       onChange={handleSelectAll}
//                       title="Select All"
//                     />
//                     <span className="me-2" style={{ fontSize: "14px" }}>
//                       {selectedMessages.length} selected
//                     </span>
//                     {selectedMessages.length > 0 && (
//                       <button className="btn btn-danger btn-sm me-2" onClick={deleteSelectedMessages}>
//                         Delete
//                       </button>
//                     )}
//                     <button className="btn btn-secondary btn-sm" onClick={toggleSelectionMode}>
//                       Cancel
//                     </button>
//                   </>
//                 ) : (
//                   <span className="me-2" style={{ fontSize: "14px", display: "none" }}>
//                     Select Messages
//                   </span>
//                 )}
//               </div>
//             </div>

//             <div className="flex-grow-1 overflow-auto" style={{ backgroundColor: "#f0f9fa" }}>
//               <div className="d-flex">
//                 {isSelectionMode && (
//                   <div
//                     ref={checkboxColumnRef}
//                     className="flex-shrink-0"
//                     style={{ width: "30px", overflowY: "hidden", height: "100%", paddingLeft: "8px" }}
//                   >
//                     {messages.reduce((acc, message, index) => {
//                       const messageDate = new Date(message.timestamp).toDateString();
//                       const prevMessageDate = index > 0 ? new Date(messages[index - 1].timestamp).toDateString() : null;

//                       if (index === 0 || messageDate !== prevMessageDate) {
//                         acc.push(
//                           <div
//                             key={`date-spacer-${messageDate}-${index}`}
//                             className="mb-3"
//                             style={{ height: "40px" }}
//                           />
//                         );
//                       }

//                       acc.push(
//                         <div
//                           key={message.id || `temp-${index}`}
//                           className="mb-2 d-flex align-items-center"
//                           style={{
//                             height: messageRefs.current[index]?.offsetHeight
//                               ? `${messageRefs.current[index].offsetHeight}px`
//                               : "40px",
//                             minHeight: "40px",
//                           }}
//                         >
//                           <input
//                             type="checkbox"
//                             checked={selectedMessages.includes(message.id)}
//                             onChange={() => handleMessageSelect(message.id)}
//                           />
//                         </div>
//                       );
//                       return acc;
//                     }, [])}
//                   </div>
//                 )}
//                 <div className="flex-grow-1 p-3">
//                   {messages.length === 0 ? (
//                     <div className="text-center text-muted">No messages yet.</div>
//                   ) : (
//                     messages.reduce((acc, message, index) => {
//                       const messageDate = new Date(message.timestamp).toDateString();
//                       const prevMessageDate = index > 0 ? new Date(messages[index - 1].timestamp).toDateString() : null;

//                       if (index === 0 || messageDate !== prevMessageDate) {
//                         acc.push(
//                           <div
//                             key={`date-${messageDate}-${index}`}
//                             className="text-center my-3"
//                           >
//                             <span
//                               className="text-muted px-3 py-1 rounded"
//                               style={{ fontSize: "12px", backgroundColor: "white" }}
//                             >
//                               {formatDateSeparator(message.timestamp)}
//                             </span>
//                           </div>
//                         );
//                       }

//                       acc.push(
//                         <div
//                           key={message.id || `temp-${index}`}
//                           ref={(el) => (messageRefs.current[index] = el)}
//                           className={`d-flex mb-2 ${message.sender_id === ME_ID ? "justify-content-end" : "justify-content-start"}`}
//                           onDoubleClick={() => handleDoubleTap(message)}
//                           style={{ minHeight: "40px", alignItems: "center" }}
//                         >
//                           {message.sender_id !== ME_ID && (
//                             <div className="me-2">
//                               {activeUser.profile_picture ? (
//                                 <img
//                                   src={activeUser.profile_picture}
//                                   alt="Profile"
//                                   className="rounded-circle"
//                                   style={{ width: "30px", height: "30px", objectFit: "cover" }}
//                                 />
//                               ) : (
//                                 <div
//                                   className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
//                                   style={{ width: "30px", height: "30px", fontSize: "14px" }}
//                                 >
//                                   {getInitials(activeUser.first_name, activeUser.last_name || "")}
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                           <div
//                             className={`p-2 shadow-sm ${message.sender_id === ME_ID ? "bg-primary text-white" : "bg-white"} position-relative`}
//                             style={{
//                               maxWidth: "70%",
//                               borderRadius: message.sender_id === ME_ID ? "12px 12px 0px 12px" : "12px 12px 12px 0px",
//                               transition: "all 0.2s",
//                             }}
//                           >
//                             {message.reply_to_id &&
//                               messages.find((m) => m.id === message.reply_to_id) && (
//                                 <div
//                                   className="border-start border-3 ps-2 mb-2"
//                                   style={{
//                                     borderColor: message.sender_id === ME_ID ? "#ffffff50" : "#e0e0e0",
//                                   }}
//                                 >
//                                   <small
//                                     className={`text-${message.sender_id === ME_ID ? "white-50" : "muted"}`}
//                                     style={{ fontSize: "12px" }}
//                                   >
//                                     Replying to:{" "}
//                                     {messages
//                                       .find((m) => m.id === message.reply_to_id)
//                                       .content.substring(0, 30) +
//                                       (messages.find((m) => m.id === message.reply_to_id).content.length > 30
//                                         ? "..."
//                                         : "")}
//                                   </small>
//                                 </div>
//                               )}
//                             <div className="d-flex flex-column">
//                               {message.attachment && (
//                                 <div className="mb-2">{renderAttachment(message.attachment)}</div>
//                               )}
//                               {message.content && <span>{message.content}</span>}
//                               <div className="d-flex align-items-center">
//                                 <small
//                                   className={message.sender_id === ME_ID ? "text-white-50" : "text-muted"}
//                                   style={{ fontSize: "10px", marginLeft: "8px" }}
//                                 >
//                                   {message.edited && "edited "}
//                                   {formatTime(message.timestamp)}
//                                 </small>
//                                 {message.sender_id === ME_ID && (
//                                   <span className="ms-2">
//                                     {message.read ? (
//                                       <i className="bi bi-check2-all text-success" title="Read"></i>
//                                     ) : message.delivered ? (
//                                       <i className="bi bi-check2 text-primary" title="Delivered"></i>
//                                     ) : null}
//                                   </span>
//                                 )}
//                                 <div style={{ zIndex: "100000" }} className="dropdown ms-2">
//                                   <button
//                                     className="btn btn-sm p-0 text-muted"
//                                     type="button"
//                                     id={`dropdownMenuButton-${message.id || `temp-${index}`}`}
//                                     data-bs-toggle="dropdown"
//                                     aria-expanded="false"
//                                   >
//                                     <i className="bi bi-three-dots-vertical"></i>
//                                   </button>
//                                   <ul
//                                     style={{ zIndex: "100000" }}
//                                     className="dropdown-menu"
//                                     aria-labelledby={`dropdownMenuButton-${message.id || `temp-${index}`}`}
//                                   >
//                                     <li>
//                                       <button className="dropdown-item" onClick={() => handleReply(message)}>
//                                         Reply
//                                       </button>
//                                     </li>
//                                     {message.sender_id === ME_ID && (
//                                       <>
//                                         <li>
//                                           <button
//                                             className="dropdown-item"
//                                             onClick={() => startEditing(message)}
//                                           >
//                                             Edit
//                                           </button>
//                                         </li>
//                                         <li className="dropend">
//                                           <button
//                                             className="dropdown-item dropdown-toggle"
//                                             type="button"
//                                             id={`infoSubMenu-${message.id || `temp-${index}`}`}
//                                             data-bs-toggle="dropdown"
//                                             aria-expanded={showInfoMessageId === message.id}
//                                             onClick={() => toggleMessageInfo(message.id)}
//                                           >
//                                             Info
//                                           </button>
//                                           <ul
//                                             className="dropdown-menu"
//                                             aria-labelledby={`infoSubMenu-${message.id || `temp-${index}`}`}
//                                             style={{ zIndex: "100001" }}
//                                           >
//                                             {/* Show delivered timestamp if delivered */}
//                                             {message.delivered && (
//                                               <li className="dropdown-item disabled" style={{ fontSize: "12px" }}>
//                                                 Delivered: {new Date(message.updated_at || message.timestamp).toLocaleString()}
//                                               </li>
//                                             )}
//                                             {/* Show read timestamp if read, otherwise show 'Unread' */}
//                                             <li className="dropdown-item disabled" style={{ fontSize: "12px" }}>
//                                               {message.read
//                                                 ? `Read: ${new Date(message.updated_at || message.timestamp).toLocaleString()}`
//                                                 : "Unread"}
//                                             </li>
//                                           </ul>
//                                         </li>
//                                       </>
//                                     )}
//                                     <li>
//                                       <button className="dropdown-item" onClick={toggleSelectionMode}>
//                                         Select
//                                       </button>
//                                     </li>
//                                     <li>
//                                       <button
//                                         className="dropdown-item"
//                                         onClick={() => copyMessage(message.content || "")}
//                                       >
//                                         Copy
//                                       </button>
//                                     </li>
//                                     {message.attachment && message.attachment.content_type?.startsWith("image/") && (
//                                       <li>
//                                         <button
//                                           className="dropdown-item"
//                                           onClick={() => copyImage(message.attachment)}
//                                         >
//                                           Copy Image
//                                         </button>
//                                       </li>
//                                     )}
//                                   </ul>
//                                 </div>
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       );
//                       return acc;
//                     }, []))
//                   }
//                   {typingUsers[activeUser?.id] && (
//                     <div className="d-flex mb-2 justify-content-start">
//                       <div className="me-2">
//                         {activeUser.profile_picture ? (
//                           <img
//                             src={activeUser.profile_picture}
//                             alt="Profile"
//                             className="rounded-circle"
//                             style={{ width: "30px", height: "30px", objectFit: "cover" }}
//                           />
//                         ) : (
//                           <div
//                             className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
//                             style={{ width: "30px", height: "30px", fontSize: "14px" }}
//                           >
//                             {getInitials(activeUser.first_name, activeUser.last_name || "")}
//                           </div>
//                         )}
//                       </div>
//                       <div
//                         className="p-2 shadow-sm bg-white position-relative"
//                         style={{
//                           maxWidth: "70%",
//                           borderRadius: "12px 12px 12px 0px",
//                         }}
//                       >
//                         <small className="text-muted d-flex align-items-center">
//                           {typingUsers[activeUser.id]} is typing
//                           <span className="typing-animation ms-2">
//                             <span></span>
//                             <span></span>
//                             <span></span>
//                           </span>
//                         </small>
//                       </div>
//                     </div>
//                   )}
//                   <div ref={messagesEndRef} />
//                 </div>
//               </div>
//             </div>

//             <div className="p-3 border-top bg-white">
//               {replyToMessage && (
//                 <div
//                   className="border-start border-3 ps-2 mb-2 bg-white rounded"
//                   style={{ borderColor: "#007bff" }}
//                 >
//                   <div className="d-flex justify-content-between align-items-center">
//                     <small className="text-muted">
//                       Replying to:{" "}
//                       {replyToMessage.content.substring(0, 30) +
//                         (replyToMessage.content.length > 30 ? "..." : "")}
//                     </small>
//                     <button className="btn btn-sm btn-link p-0" onClick={cancelReply}>
//                       <i className="bi bi-x"></i>
//                     </button>
//                   </div>
//                 </div>
//               )}
//               {editingMessageId && (
//                 <div
//                   className="border-start border-3 ps-2 mb-2 bg-white rounded"
//                   style={{ borderColor: "#007bff" }}
//                 >
//                   <div className="d-flex justify-content-between align-items-center">
//                     <small className="text-muted">
//                       Editing message
//                     </small>
//                     <button className="btn btn-sm btn-link p-0" onClick={cancelEditing}>
//                       <i className="bi bi-x"></i>
//                     </button>
//                   </div>
//                 </div>
//               )}
//               {attachment && (
//                 <div className="mb-2 d-flex align-items-center bg-light p-2 rounded">
//                   <small className="text-muted me-2">{attachment.filename}</small>
//                   {isFileUploading && <span className="spinner-border spinner-border-sm me-2" role="status" />}
//                   <button
//                     className="btn btn-sm btn-link p-0"
//                     onClick={() => {
//                       setAttachment(null);
//                       fileInputRef.current.value = null;
//                       setIsFileUploading(false);
//                     }}
//                   >
//                     <i className="bi bi-x"></i>
//                   </button>
//                 </div>
//               )}
//               <form onSubmit={sendMessage}>
//                 <div className="input-group gap-1">
//                   <button
//                     className="btn btn-outline-secondary"
//                     type="button"
//                     title="Attach File"
//                     onClick={() => fileInputRef.current.click()}
//                     disabled={isFileUploading}
//                   >
//                     <i className="bi bi-paperclip"></i>
//                   </button>
//                   <input
//                     type="file"
//                     ref={fileInputRef}
//                     style={{ display: "none" }}
//                     onChange={handleFileChange}
//                     accept="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//                   />
//                   <input
//                     type="text"
//                     name="message"
//                     className="form-control border"
//                     placeholder={editingMessageId ? "Edit your message..." : "Type a message..."}
//                     autoComplete="off"
//                     style={{ fontSize: "14px" }}
//                     value={editContent}
//                     onChange={(e) => {
//                       setEditContent(e.target.value);
//                       handleTyping(e);
//                     }}
//                     onKeyDown={(e) => {
//                       if (e.key === 'Enter') {
//                         setIsTyping(false);
//                         if (typingDebounceRef.current) {
//                           clearTimeout(typingDebounceRef.current);
//                         }
//                       }
//                     }}
//                     disabled={isFileUploading}
//                   />
//                   <button className="btn btn-primary" type="submit" disabled={isFileUploading}>
//                     <i className="bi bi-send"></i>
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </>
//         ) : (
//           <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light rounded-3">
//             <i className="bi bi-chat-square" style={{ fontSize: "5rem", color: "#dee2e6" }}></i>
//             <h4 className="mt-3 text-muted">Select a chat to start messaging</h4>
//           </div>
//         )}
//       </div>
//       <ToastContainer
//         position="top-right"
//         autoClose={3000}
//         hideProgressBar={false}
//         newestOnTop
//         closeOnClick
//         rtl={false}
//         pauseOnFocusLoss
//         draggable
//         pauseOnHover
//         theme="light"
//         toastStyle={{
//           background: '#ffffff',
//           color: '#1f2937',
//           borderRadius: '12px',
//           boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
//         }}
//       />
//     </div>
//   );
// }