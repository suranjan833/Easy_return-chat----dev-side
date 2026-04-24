import { toast } from "react-toastify";
import ApiClient from "./DirectsmsApi"; // Import the configured ApiClient
import { store } from "../redux/store";
import { setRecentChats, clearUnreadCount, upsertRecentChat } from "../redux/slices/recentChatsSlice";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";
const WS_BASE_URL = (API_BASE_URL || "").replace(/^http/, "ws");

class ChatService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.token = null;
    this.userId = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.isConnecting = false;
    this.recentChats = [];
    this.users = [];
    this.allUsers = [];
    this.connectionStatus = "disconnected";
    this.notificationPermissionGranted = false;
    this.userNameCache = new Map();
    this.shouldReconnect = true;
    this.reconnectTimeout = null;

    this.heartbeat = null;
    this.socketHealthCheck = null;
    this.lastPong = Date.now();

    this.messageQueue = [];
  }
  async fetchUserName(userId) {
    if (this.userNameCache.has(userId)) {
      return this.userNameCache.get(userId);
    }

    try {
      const response = await ApiClient.get(`/users/${userId}`); // Use ApiClient
      const user = response.data;
      const fullName = `${user.first_name} ${user.last_name}`.trim();
      this.userNameCache.set(userId, fullName);
      return fullName;
    } catch (error) {
      console.error(
        `[ChatService] Failed to fetch user name for ID ${userId}:`,
        error,
      );
      return `User ${userId}`; // Fallback to user ID if API fails
    }
  }
  async initialize(userId, token) {
    if (!userId || !token) {
      console.error("[ChatService] Missing userId or token");
      return;
    }

    // Prevent multiple initializations for the same user
    if (
      this.userId === userId &&
      this.token === token &&
      this.connectionStatus !== "disconnected"
    ) {
      // console.log(`[ChatService] Already initialized for user ${userId}, skipping`);
      return;
    }

    this.userId = userId;
    this.token = token;

    //  console.log(`[ChatService] Initializing for user ${userId}`);

    try {
      // Fetch initial data
      await this.fetchInitialData();

      // Establish WebSocket connection
      this.connectWebSocket();
    } catch (error) {
      console.error("[ChatService] Failed to initialize:", error);
      this.notifySubscribers("error", {
        message: "Failed to initialize chat service",
      });
    }

    //  Auto Permission Request
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((p) => {
        this.notificationPermissionGranted = p === "granted";
      });
    } else if (Notification.permission === "granted") {
      this.notificationPermissionGranted = true;
    }
  }

  async fetchInitialData() {
    try {
      // Fetch users
      const usersResponse = await ApiClient.get(`/users/?skip=0&limit=100`); // Use ApiClient
      this.allUsers = usersResponse.data?.records;

      // 1. Load existing recent chats from localStorage
      let currentRecentChats = JSON.parse(
        localStorage.getItem(`recentChats_${this.userId}`) || "[]",
      ).map((chat) => ({ ...chat, unread_count: 0 })); // Reset unread counts from localStorage on load

      // 2. Fetch recent chats from API (returns an array of messages)
      const chatsResponse = await ApiClient.get(`/messaging/recent-chats`); // Use ApiClient
      this.users = chatsResponse.data?.conversations || [];
      const rawChatsData = chatsResponse.data;

      // 3. Process the API response - it returns an object with a 'conversations' array
      let apiProcessedChats = [];
      const rawConversations = rawChatsData?.conversations || [];
      const currentUserId = Number(this.userId);
      
      if (Array.isArray(rawConversations)) {
        apiProcessedChats = rawConversations.map((chat) => {
          const lastMsg = chat.latest_message || {};
          let otherParticipantId = chat.other_user?.id;
          let senderId = lastMsg.sender_id;
          let recipientId = null;

          // Handle array of participants (admin view)
          if (!otherParticipantId && Array.isArray(chat.other_user)) {
            const participants = chat.other_user
              .map((entry) => entry.sender || entry.recipient)
              .filter(Boolean);
            
            // Extract sender and recipient IDs
            const sender = participants.find((p) => Number(p.id) === Number(senderId));
            const recipient = participants.find((p) => Number(p.id) !== Number(senderId));
            
            if (sender) senderId = sender.id;
            if (recipient) recipientId = recipient.id;
            
            // Find the participant who isn't "me"
            const other = participants.find((p) => Number(p.id) !== currentUserId);
            otherParticipantId = other?.id;
          } else {
            // For flat structure, derive recipientId
            recipientId = otherParticipantId;
          }

          return {
            id: lastMsg.id,
            recipient_id: recipientId || otherParticipantId,
            sender_id: senderId,
            last_message:
              lastMsg.content || (lastMsg.attachment ? `📎 Attachment` : ""),
            last_message_timestamp: lastMsg.timestamp,
            unread_count: chat.unread_count || 0,
          };
        })
        // ✅ Filter out conversations where current user is NOT a participant
        .filter(c => {
          if (!c.recipient_id || !c.sender_id) return false;
          const sId = Number(c.sender_id);
          const rId = Number(c.recipient_id);
          // Only include if current user is either sender or recipient
          return sId === currentUserId || rId === currentUserId;
        });
      }

      // 4. Merge API chats into currentRecentChats
      apiProcessedChats.forEach((apiChat) => {
        const existingChatIndex = currentRecentChats.findIndex(
          (chat) => chat.recipient_id === apiChat.recipient_id,
        );
        if (existingChatIndex > -1) {
          // Update existing chat with the latest from API
          currentRecentChats[existingChatIndex] = {
            ...currentRecentChats[existingChatIndex],
            ...apiChat,
          };
        } else {
          // Add new chat from API
          currentRecentChats.push(apiChat);
        }
      });

      // Identify new messages (for notifications) - based on merged list and last known state
      const lastChatsFromLocalStorage = JSON.parse(
        localStorage.getItem(`recentChats_${this.userId}`) || "[]",
      );
      const newMessages = currentRecentChats.filter((currentChat) => {
        const lastKnownChat = lastChatsFromLocalStorage.find(
          (lc) => lc.recipient_id === currentChat.recipient_id,
        );
        return (
          !lastKnownChat ||
          new Date(currentChat.last_message_timestamp) >
            new Date(lastKnownChat.last_message_timestamp)
        );
      });

      // 5. Sort the combined list by timestamp (newest first)
      currentRecentChats.sort(
        (a, b) =>
          new Date(b.last_message_timestamp) -
          new Date(a.last_message_timestamp),
      );

      // 6. Update service state and localStorage
      this.recentChats = currentRecentChats;
      localStorage.setItem(
        `recentChats_${this.userId}`,
        JSON.stringify(this.recentChats),
      );

      // 7. Dispatch to Redux store
      store.dispatch(setRecentChats(this.recentChats));

      // Fetch total unread count
      const unreadResponse = await ApiClient.get(
        `/messaging/messages/user/unread/count`,
      ); // Use ApiClient
      const totalUnreadCount = unreadResponse.data?.unread_count || 0;

      // Notify subscribers of initial data
      this.notifySubscribers("initial_data", {
        users: this.users,
        recentChats: this.recentChats,
        totalUnreadCount,
      });

      // Show notifications for new messages if not on /messages
      if (
        this.notificationPermissionGranted &&
        window.location.pathname !== "/messages"
      ) {
        for (const newChat of newMessages) {
          const senderId =
            newChat.recipient_id === this.userId
              ? newChat.id
              : newChat.recipient_id;
          const senderName = await this.fetchUserName(senderId);
          const notification = new Notification(
            `New Message from ${senderName}`,
            {
              body: newChat.last_message || "New message",
              tag: `chat-${newChat.id}`, // Unique tag to prevent duplicates
              icon: "/image1.png", // Icon for the notification
            },
          );
          notification.onclick = () => {
            window.focus();
            notification.close();
            // Open chat with the sender
            this.openChatWithUser(senderId);
          };
        }
      }

      // console.log(`[ChatService] Initial data loaded: ${this.users.length} users, ${this.recentChats.length} chats`);
    } catch (error) {
      console.error("[ChatService] Failed to fetch initial data:", error);
      this.notifySubscribers("error", { message: "Failed to load chat data" });
    }
  }

  //bhaii change korechi

  close() {
    this.shouldReconnect = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    clearInterval(this.heartbeat);
    clearInterval(this.socketHealthCheck);
    clearTimeout(this.reconnectTimeout);

    this.connectionStatus = "disconnected";
    this.subscribers.clear();

    try {
      localStorage.setItem(
        `recentChats_${this.userId}`,
        JSON.stringify(this.recentChats),
      );
    } catch {}
  }

  // close() {
  //   //
  //   if (this.ws) {
  //     this.ws.close();
  //     this.ws = null;
  //     this.subscribers.clear();
  //   this.connectionStatus = "disconnected";
  //   }
  //   // Store recentChats in localStorage before closing
  //   localStorage.setItem(
  //     `recentChats_${this.userId}`,
  //     JSON.stringify(this.recentChats),
  //   );

  // }

  //bhaii change korlm

  connectWebSocket() {
    if (!this.shouldReconnect) return;

    if (this.ws) {
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.CLOSING
      ) {
        return;
      }
    }

    this.isConnecting = true;

    this.ws = new WebSocket(
      `${WS_BASE_URL}/messaging/ws/${this.userId}/${this.token}`,
    );

    this.ws.onopen = () => {
      console.log("Socket connected");

      this.connectionStatus = "connected";
      this.notifySubscribers("connection", { status: "connected" });

      this.retryCount = 0;
      this.isConnecting = false;

      // Flush queued messages
      if (this.messageQueue.length) {
        this.messageQueue.forEach((msg) => {
          try {
            this.ws.send(JSON.stringify(msg));
          } catch {}
        });
        this.messageQueue = [];
      }

      // Heartbeat ping every 15s
      clearInterval(this.heartbeat);

      // Health check
      clearInterval(this.socketHealthCheck);
      this.socketHealthCheck = setInterval(() => {
        if (Date.now() - this.lastPong > 120000) {
          console.warn("Socket dead, forcing reconnect");
          this.ws?.close();
        }
      }, 20000);
    };

    this.ws.onmessage = async (event) => {
      this.lastPong = Date.now();
      try {
        const data = JSON.parse(event.data);

        console.log("[ChatService] ⬅️ RECEIVED from server:", data);
        console.log("[ChatService] 📊 Current subscribers for 'new_message':", this.subscribers.get('new_message')?.size || 0);

        // Log server response specifically for sent messages (confirmation)
        if (
          (data.type === "message" || data.type === "message_with_attachment") &&
          (data.sender_id === this.userId || data?.data?.sender_id === this.userId)
        ) {
          console.log("[ChatService] ✅ Server confirmed sent message:", data);
        }

        var activeChatID = localStorage.getItem("active_user_id");

        if (data.id == activeChatID) {
          // this.markAllRead(data.id);
        }

        // -------- your existing logic ----------
        if (
          data.type === "message" ||
          data.type === "direct_message" ||
          data.type === "message_with_attachment" ||
          data.type === "message_reply" ||
          data.type === "forward_message" ||
          data.type === "forward_to_dm"  // New: Handle group-to-DM forwards
        ) {
          var payload = data.data || data;

          const sId = Number(payload.sender_id);
          const rId = Number(payload.recipient_id);
          const mId = Number(this.userId);

          // For legacy subscribers, calculate otherUserId relative to ME
          // but for admins watching 3rd party chats, we provide both
          const otherUserId = (sId === mId) ? rId : sId;

          this.notifySubscribers("new_message", {
            message: payload,
            otherUserId,
            senderId: sId,
            recipientId: rId,
          });
          if (payload.sender_id !== this.userId) {
            const senderName = await this.fetchUserName(payload.sender_id);

            if (document.visibilityState === "visible") {
              //  USER IS ACTIVE → SHOW TOAST
              toast.info(
                `💬 ${senderName}: ${payload.content || payload.reply_content || "📎 Attachment"}`,
                {
                  position: "top-right",
                  autoClose: 3000,
                  pauseOnHover: true,
                  draggable: true,
                  onClick: () => {
                    // Open chat with the sender when toast is clicked
                    this.openChatWithUser(payload.sender_id);
                  },
                },
              );
            } else {
              //  USER IS AWAY → SHOW SYSTEM NOTIFICATION
              if (this.notificationPermissionGranted) {
                const notification = new Notification(
                  `New Message from ${senderName}`,
                  {
                    body: payload.content || payload.reply_content || "📎 Attachment",
                    icon: "/image1.png",
                    tag: `chat-${payload.id}`,
                  },
                );

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                  // Open chat with the sender
                  this.openChatWithUser(payload.sender_id);
                };
              }
            }
          }
        } else if (data.type === "typing") {
          this.notifySubscribers("typing", data);
        } else if (data.type === "status_update") {
          this.notifySubscribers("update_status", data);
        } else if (data.type === "edit_message" || data.type === "edit_reply") {
          this.notifySubscribers("message_edit", data);
        } else if (
          data.type === "delete_message" ||
          data.type === "delete_reply"
        ) {
          this.notifySubscribers("message_delete", data);
        } else if (
          data.type === "user_disconnected" ||
          data.type === "user_connected"
        ) {
          this.notifySubscribers("online_update", data);
        }
      } catch (err) {
        console.error("Socket message parse error:", err);
      }
    };

    this.ws.onerror = (err) => {
      console.error("Socket error:", err);
      this.connectionStatus = "error";
      this.isConnecting = false;
    };

    this.ws.onclose = () => {
      console.warn("Socket closed");

      this.connectionStatus = "disconnected";
      this.notifySubscribers("connection", { status: "disconnected" });

      clearInterval(this.heartbeat);
      clearInterval(this.socketHealthCheck);

      this.isConnecting = false;

      if (!this.shouldReconnect) return;

      if (this.retryCount >= this.maxRetries) {
        console.error("Max reconnect attempts reached");
        return;
      }

      const delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount));
      this.retryCount++;

      if (this.reconnectTimeout) return;

      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connectWebSocket();
      }, delay);
    };
  }

  // connectWebSocket() {
  //   // Prevent multiple connection attempts
  //   if (
  //     this.isConnecting ||
  //     (this.ws && this.ws.readyState === WebSocket.CONNECTING)
  //   ) {
  //     //
  //     return;
  //   }

  //   // Close existing WebSocket if not already closed
  //   if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
  //     //
  //     this.ws.close();
  //     this.ws = null;
  //   }

  //   this.isConnecting = true;
  //   //  console.log(`[ChatService] Connecting WebSocket for user ${this.userId}`);

  //   this.ws = new WebSocket(
  //     `${WS_BASE_URL}/messaging/ws/${this.userId}/${this.token}`,
  //   );
  //   this.ws.onopen = () => {
  //     this.connectionStatus = "connected";
  //     this.notifySubscribers("connection", { status: "connected" });
  //     this.heartbeat = setInterval(() => {
  //       if (this.ws?.readyState === WebSocket.OPEN) {
  //         try {
  //           this.ws.send(JSON.stringify({ type: "ping" }));
  //         } catch {
  //           this.ws.close();
  //         }
  //       }
  //     }, 15000); // প্রতি 15 সেকেন্ডে

  //     // Flush queued messages
  //     if (this.messageQueue?.length) {
  //       this.messageQueue.forEach((msg) => {
  //         try {
  //           this.ws.send(JSON.stringify(msg));
  //         } catch (e) {
  //           console.error("Failed to send queued message:", e);
  //         }
  //       });
  //       this.messageQueue = [];
  //     }

  //     this.retryCount = 0;
  //     this.isConnecting = false;
  //   };
  //   //bhai comment korlm
  //   this.ws.onmessage = async (event) => {
  //     try {
  //       const data = JSON.parse(event.data);

  //       this.users = [];

  //       if (!data) {
  //         return;
  //       }

  //       var activeChatID = localStorage.getItem("active_user_id");

  //       if (data.id == activeChatID) {
  //         // this.markAllRead(data.id);
  //       }

  //       if (
  //         data.type === "message" ||
  //         data.type === "direct_message" ||
  //         data.type === "message_with_attachment" ||
  //         data.type === "message_reply"
  //       ) {
  //         const payload = data.data || data;
  //         const otherUserId =
  //           payload.sender_id === this.userId
  //             ? payload.recipient_id
  //             : payload.sender_id;

  //         this.notifySubscribers("new_message", {
  //           message: payload,
  //           otherUserId,
  //           senderId: payload.sender_id,
  //         });

  //         if (payload.sender_id !== this.userId) {
  //           const senderName = await this.fetchUserName(payload.sender_id);

  //           if (document.visibilityState === "visible") {
  //             //  USER IS ACTIVE → SHOW TOAST
  //             toast.info(
  //               `💬 ${senderName}: ${payload.content || "📎 Attachment"}`,
  //               {
  //                 position: "top-right",
  //                 autoClose: 3000,
  //                 pauseOnHover: true,
  //                 draggable: true,
  //                 onClick: () => {
  //                   // Open chat with the sender when toast is clicked
  //                   this.openChatWithUser(payload.sender_id);
  //                 },
  //               },
  //             );
  //           } else {
  //             //  USER IS AWAY → SHOW SYSTEM NOTIFICATION
  //             if (this.notificationPermissionGranted) {
  //               const notification = new Notification(
  //                 `New Message from ${senderName}`,
  //                 {
  //                   body: payload.content || "📎 Attachment",
  //                   icon: "/image1.png",
  //                   tag: `chat-${payload.id}`,
  //                 },
  //               );

  //               notification.onclick = () => {
  //                 window.focus();
  //                 notification.close();
  //                 // Open chat with the sender
  //                 this.openChatWithUser(payload.sender_id);
  //               };
  //             } else {
  //             }
  //           }
  //         }
  //       } else if (data.type === "typing") {
  //         this.notifySubscribers("typing", data);
  //       } else if (data.type === "update_status") {
  //         this.notifySubscribers("status_update", data);
  //       } else if (
  //         data.type === "message_reply" ||
  //         data.type === "edit_reply" ||
  //         data.type === "delete_reply"
  //       ) {
  //         this.notifySubscribers("reply_update", data);
  //       } else if (data.type === "edit_message") {
  //         this.notifySubscribers("message_edit", data);
  //       } else if (data.type === "delete_message") {
  //         this.notifySubscribers("message_delete", data);
  //       }
  //     } catch (error) {
  //       console.error("[ChatService] Error parsing WebSocket message:", error);
  //     }
  //   };

  //   this.ws.onerror = (error) => {
  //     console.error("[ChatService] WebSocket error:", error);
  //     this.connectionStatus = "error";
  //     this.notifySubscribers("error", {
  //       message: "WebSocket connection error",
  //     });
  //     this.isConnecting = false;
  //   };

  //   this.ws.onclose = () => {
  //     //
  //     this.connectionStatus = "disconnected";
  //     this.notifySubscribers("connection", { status: "disconnected" });
  //     this.isConnecting = false;

  //     // Auto-reconnect with exponential backoff
  //     if (this.retryCount < this.maxRetries) {
  //       const delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount++));
  //       // console.log(`[ChatService] Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
  //       setTimeout(() => this.connectWebSocket(), delay);
  //       // clearInterval(this.heartbeat);
  //     }
  //   };
  // }

  markAsRead(userId) {
    const uid = Number(userId);
    const idx = this.recentChats.findIndex((c) => Number(c.recipient_id) === uid);
    console.log(`[ChatService] 🔍 markAsRead(${userId}) → uid=${uid}, found at idx=${idx}, recentChats count=${this.recentChats.length}`);
    
    // Always dispatch to Redux to ensure UI consistency
    store.dispatch(clearUnreadCount(uid));

    if (idx >= 0) {
      const before = this.recentChats[idx].unread_count;
      
      // Update immutably to avoid "read only property" errors
      this.recentChats = this.recentChats.map((chat, i) => 
        i === idx ? { ...chat, unread_count: 0 } : chat
      );
      
      console.log(`[ChatService] ✅ markAsRead: cleared unread_count (was ${before}) for recipient_id=${uid}, firing recent_chats_updated`);
      
      this.notifySubscribers("recent_chats_updated", {
        recentChats: this.recentChats,
      });
      localStorage.setItem(
        `recentChats_${this.userId}`,
        JSON.stringify(this.recentChats),
      );
    } else {
      console.warn(`[ChatService] ⚠️ markAsRead: no entry found for userId=${userId} (uid=${uid}) in recentChats. IDs present:`, this.recentChats.map(c => c.recipient_id));
    }
  }

  //bhaii socket er new function

  sendMessage(messageData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[ChatService] Socket not ready, queueing message");
      this.messageQueue.push(messageData);
      this.connectWebSocket();
      return true;
    }

    try {
      // Log outgoing payload
      if (messageData.type === "message_with_attachment") {
        console.log("[ChatService] ➡️ SENT payload:", {
          ...messageData,
          attachment: {
            ...messageData.attachment,
            content: messageData.attachment?.content
              ? `[base64 ${messageData.attachment.content.length} chars — starts: ${messageData.attachment.content.slice(0, 40)}]`
              : undefined,
          },
        });
      } else {
        console.log("[ChatService] ➡️ SENT payload:", messageData);
      }
      this.ws.send(JSON.stringify(messageData));
      return true;
    } catch (error) {
      console.error("[ChatService] Error sending message:", error);
      this.messageQueue.push(messageData);
      this.ws.close();
      return true;
    }
  }

  // sendMessage(messageData) {
  //   if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
  //     console.error("[ChatService] WebSocket not connected");
  //     this.notifySubscribers("error", { message: "WebSocket not connected" });
  //     return false;
  //   }

  //   try {
  //     //  console.log('messageData', messageData); // Debug log
  //     this.ws.send(JSON.stringify(messageData));
  //     return true;
  //   } catch (error) {
  //     console.error("[ChatService] Error sending message:", error);
  //     this.notifySubscribers("error", { message: "Failed to send message" });
  //     return false;
  //   }
  // }

  subscribe(event, callback) {
    if (typeof callback !== "function") {
      console.error(
        "[ChatService] Attempted to subscribe with non-function callback for event:",
        event,
        callback,
      );
      return;
    }
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event).add(callback);
  }

  unsubscribe(event, callback) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).delete(callback);
    }
  }

  notifySubscribers(event, data) {
    if (this.subscribers.has(event)) {
      this.subscribers.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[ChatService] Error in ${event} callback:`, error);
        }
      });
    }
  }

  markAllRead = async (userId) => {
    try {
      const response = await ApiClient.put(
        `/messaging/messages/read-all?sender_id=${userId}`,
        {
          sender_id: userId,
        },
      );
      return response.data;
    } catch (error) {
      console.error(
        "markAllRead error:",
        error.response?.data || error.message,
      );
      throw new Error(error.response?.data?.detail || "Field required");
    }
  };

  getConnectionStatus() {
    return this.connectionStatus;
  }

  getRecentChats() {
    return this.recentChats;
  }

  getUsers() {
    return this.users;
  }

  getAllUsers() {
    return this.allUsers;
  }

  isInitialized() {
    return (
      // this.userId && this.token && this.connectionStatus !== "disconnected"
      this.userId && this.token && this.connectionStatus === "connected"
    );
  }

  async openChatWithUser(userId) {
    try {
      // Find the user from the users list
      let user = this.users.find((u) => u.id === userId);
      // If user not found in the list, fetch from API
      if (!user) {
        const response = await ApiClient.get(`/users/${userId}`);
        user = response.data;
      }

      if (!user) {
        console.error(`[ChatService] User with ID ${userId} not found`);
        return;
      }

      // Notify subscribers to open chat with this user
      this.notifySubscribers("open_chat_with_user", { user });
    } catch (error) {
      console.error(
        `[ChatService] Error opening chat with user ${userId}:`,
        error,
      );
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;
