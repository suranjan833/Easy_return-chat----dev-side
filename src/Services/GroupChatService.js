import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";
const WS_BASE_URL = (API_BASE_URL || "").replace(/^http/, "ws");

class GroupChatService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.token = null;
    this.userId = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.isConnecting = false;
    this.groups = [];
    this.connectionStatus = "disconnected";
    this.activeGroups = new Set();
    this.groupMetadata = new Map(); // Track last message timestamp and unread count per group
  }

  async initialize(userId, token) {
    if (!userId || !token) {
      console.error("[GroupChatService] Missing userId or token");
      return;
    }

    // Prevent multiple initializations for the same user if already connected
    if (
      this.userId === userId &&
      this.token === token &&
      this.connectionStatus === "connected" &&
      this.ws &&
      this.ws.readyState === WebSocket.OPEN
    ) {
      //  console.log(`[GroupChatService] Already initialized and connected for user ${userId}, reusing existing connection`);
      return;
    }

    this.userId = userId;
    this.token = token;

    //  console.log(`[GroupChatService] Initializing for user ${userId}`);

    try {
      // Fetch initial groups data
      await this.fetchInitialGroups();

      // Establish or reuse WebSocket connection
      this.connectWebSocket();
    } catch (error) {
      //  console.error("[GroupChatService] Failed to initialize:", error);
      this.notifySubscribers("error", {
        message: "Failed to initialize group chat service",
      });
    }
  }

  async fetchInitialGroups() {
    try {
      const response = await axios.get(`${API_BASE_URL}/groups/`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      this.groups = response.data || [];

      // Populate groupMetadata with initial unread counts from server
      this.groups.forEach((g) => {
        const gid = Number(g.id);
        this.groupMetadata.set(gid, {
          lastMessageTimestamp: g.updated_at || g.created_at || null,
          unreadCount: g.unread_count || 0,
        });
      });

      // Notify subscribers of initial groups data
      this.notifySubscribers("initial_groups", {
        groups: this.groups,
      });

      // Also notify about the seeded metadata
      this.groupMetadata.forEach((meta, gid) => {
        this.notifySubscribers("group_metadata_updated", {
          groupId: gid,
          metadata: meta,
        });
      });
    } catch (error) {
      console.error(
        "[GroupChatService] Failed to fetch initial groups:",
        error,
      );
      this.notifySubscribers("error", {
        message: "Failed to load groups data",
      });
    }
  }

  // Centralized helper to update unread counts and timestamps
  updateMetadata(groupId, timestamp) {
    const gid = Number(groupId);
    if (isNaN(gid)) return;

    const currentMetadata = this.groupMetadata.get(gid) || {
      lastMessageTimestamp: null,
      unreadCount: 0,
    };

    const isGroupOpen = this.activeGroups.has(gid);
    const newMetadata = {
      lastMessageTimestamp: timestamp || new Date().toISOString(),
      unreadCount: isGroupOpen ? 0 : (currentMetadata.unreadCount || 0) + 1,
    };

    this.groupMetadata.set(gid, newMetadata);

    // Notify subscribers of metadata update
    this.notifySubscribers("group_metadata_updated", {
      groupId: gid,
      metadata: newMetadata,
    });
  }

  connectWebSocket() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      //
      this.connectionStatus = "connected";
      this.notifySubscribers("connection", { status: "connected" });
      this.retryCount = 0;
      this.isConnecting = false;
      return;
    }

    // Prevent multiple connection attempts
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.CONNECTING)
    ) {
      //
      return;
    }

    // Close existing WebSocket if not already closed
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      //
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = true;
    //  console.log(`[GroupChatService] Connecting WebSocket for user ${this.userId}`);

    this.ws = new WebSocket(
      `${WS_BASE_URL}/groups/ws/${this.userId}/${this.token}`,
    );

    this.ws.onopen = () => {
      //  console.log(`[GroupChatService] WebSocket opened for user ${this.userId}`);
      this.connectionStatus = "connected";
      this.notifySubscribers("connection", { status: "connected" });
      this.retryCount = 0;
      this.isConnecting = false;
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[GroupChatService] 📨 Received from server:", data);
        
        if (!data) return;

        // Handle different message types
        if (data.type === "message") {
          console.log("[GroupChatService] ✉️ Processing message type, group_id:", data.group_id);
          
          // Update group metadata for sorting and unread count
          this.updateMetadata(data.group_id, data.created_at);

          // Smart Notification Logic
          // Only show notifications if:
          // 1. Group is NOT currently open
          // 2. Message is NOT sent by current user (self)
          const isSelfMessage = data.sender_id === this.userId;

          if (!isGroupOpen && !isSelfMessage) {
            const groupName =
              this.groups.find((g) => g.id === groupId)?.name || "Group";
            const senderName = data.user?.first_name
              ? `${data.user.first_name} ${data.user.last_name || ""}`.trim()
              : "Someone";
            const messagePreview =
              data.content?.substring(0, 50) || "📎 Attachment";

            // Check if tab/window is active using Page Visibility API
            const isTabActive = !document.hidden;

            if (isTabActive) {
              // Tab is active → Show toast notification
              if (typeof window !== "undefined" && window.toast) {
                // window.toast.info(
                //   `💬 ${senderName} in ${groupName}: ${messagePreview}`,
                //   {
                //     position: "top-right",
                //     autoClose: 4000,
                //     hideProgressBar: false,
                //     closeOnClick: true,
                //     pauseOnHover: true,
                //     draggable: true,
                //     onClick: () => {
                //       // Open group chat when toast is clicked
                //       this.openGroupChat(groupId);
                //     },
                //   },
                // );
              }
            } else {
              // Tab is inactive → Show system notification
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                const notification = new Notification(
                  `${senderName} in ${groupName}`,
                  {
                    body: messagePreview,
                    icon: "/logo.png", // Update with your app logo path
                    badge: "/logo.png",
                    tag: `group-${groupId}`, // Prevents duplicate notifications
                    requireInteraction: false,
                  },
                );

                // Click notification to focus window and open group chat
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                  // Open group chat when notification is clicked
                  this.openGroupChat(groupId);
                };
              }
            }
          }

          console.log("[GroupChatService] 🔔 Notifying subscribers: new_group_message, groupId:", data.group_id);
          this.notifySubscribers("new_group_message", {
            message: data,
            groupId: data.group_id,
          });
        } else if (data.type === "edit_group_message") {
          this.notifySubscribers("group_message_edit", {
            messageId: data.message_id,
            newContent: data.new_content,
            updatedAt: data.updated_at,
            groupId: data.group_id,
          });
        } else if (data.type === "delete_group_message") {
          this.notifySubscribers("group_message_delete", {
            messageId: data.message_id,
            groupId: data.group_id,
          });
        } else if (data.type === "group_message_reply") {
          console.log(data, "reply service");
          this.updateMetadata(data.group_id || data.groupId, data.created_at);
          this.notifySubscribers("group_message_reply", data);
        } else if (data.type === "reply_on_reply") {
          console.log(data, "reply on reply service");
          this.updateMetadata(data.group_id || data.groupId, data.created_at);
          this.notifySubscribers("reply_on_reply", data);
        } else if (data.type === "mention") {
          this.updateMetadata(data.group_id, data.original_message?.created_at);
          this.notifySubscribers("group_mention", {
            mention: data.mention,
            original_message: data.original_message,
            mentioned_user: data.mentioned_user,
            mentioned_by_user: data.mentioned_by_user,
            groupId: data.group_id,
            notification_message: data.notification_message,
          });

          // Global Mention Notification Logic
          const isGroupOpen = this.activeGroups.has(data.group_id);
          const isMentionedUser =
            data.mentioned_user_id === this.userId ||
            (data.mentioned_user && data.mentioned_user.id === this.userId);

          if (!isGroupOpen && isMentionedUser) {
            const groupName =
              this.groups.find((g) => g.id === data.group_id)?.name || "Group";
            const mentionedBy = data.mentioned_by_user?.first_name || "Someone";
            const notificationText =
              data.notification_message ||
              `${mentionedBy} mentioned you in ${groupName}`;

            // Check if tab/window is active
            const isTabActive = !document.hidden;

            if (isTabActive) {
              if (typeof window !== "undefined" && window.toast) {
                window.toast.info(`@ ${notificationText}`, {
                  position: "top-right",
                  autoClose: 5000,
                  hideProgressBar: false,
                  closeOnClick: true,
                  pauseOnHover: true,
                  draggable: true,
                  onClick: () => {
                    this.openGroupChat(data.group_id);
                  },
                });
              }
            } else {
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                const notification = new Notification(`You were mentioned`, {
                  body: notificationText,
                  icon: "/logo.png",
                  tag: `mention-${data.group_id}-${Date.now()}`,
                  requireInteraction: false,
                });
                notification.onclick = () => {
                  window.focus();
                  notification.close();
                  this.openGroupChat(data.group_id);
                };
              }
            }
          }
        } else if (data.type === "edit_group_reply") {
          this.notifySubscribers("group_reply_edit", {
            reply: data.reply,
            groupId: data.group_id,
          });
        } else if (data.type === "delete_group_reply") {
          this.notifySubscribers("group_reply_delete", {
            replyId: data.reply_id,
            groupId: data.group_id,
          });
        } else if (data.type === "typing") {
          this.notifySubscribers("group_typing", {
            senderId: data.sender_id,
            groupId: data.group_id,
            status: data.status,
            user: data.user,
          });
        } else if (data.type === "read_group_message") {
          console.log("[ReadReceipt] Received read_group_message from server →", data);
          this.notifySubscribers("group_message_read", data);
        } else {
          //  console.log("[GroupChatService] Unhandled message type:", data.type, data);
        }
      } catch (error) {
        console.error(
          "[GroupChatService] Error parsing WebSocket message:",
          error,
        );
      }
    };

    this.ws.onerror = (error) => {
      console.error("[GroupChatService] WebSocket error:", error);
      this.connectionStatus = "error";
      this.notifySubscribers("error", {
        message: "WebSocket connection error",
      });
      this.isConnecting = false;
    };

    this.ws.onclose = () => {
      //
      this.connectionStatus = "disconnected";
      this.notifySubscribers("connection", { status: "disconnected" });
      this.isConnecting = false;

      // Auto-reconnect with exponential backoff
      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(30000, 1000 * Math.pow(2, this.retryCount++));
        // console.log(`[GroupChatService] Reconnecting in ${delay}ms (attempt ${this.retryCount})`);
        setTimeout(() => this.connectWebSocket(), delay);
      }
    };
  }

  sendMessage(messageData) {
    console.log(messageData, "messageData");
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("[GroupChatService] WebSocket not connected");
      this.notifySubscribers("error", { message: "WebSocket not connected" });
      return false;
    }
    console.log(messageData, "messageData 1");
    try {
      console.log(messageData, "messageData 1");
      console.log(JSON.stringify(messageData), "messageData 1");
      this.ws.send(JSON.stringify(messageData));
      console.error("[GroupChatService] message sent:", );

      return true;
    } catch (error) {
      console.error("[GroupChatService] Error sending message:", error);
      this.notifySubscribers("error", { message: "Failed to send message" });
      return false;
    }
  }

  markMessageRead(groupId, messageId) {
    console.log(`[ReadReceipt] markMessageRead called — groupId:${groupId} messageId:${messageId} wsState:${this.ws?.readyState}`);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[ReadReceipt] WS not open, skipping markMessageRead`);
      return;
    }
    try {
      const payload = { type: "read_group_message", group_id: groupId, message_id: messageId };
      console.log("[ReadReceipt] Sending →", JSON.stringify(payload));
      this.ws.send(JSON.stringify(payload));
    } catch (e) {
      console.error("[ReadReceipt] markMessageRead error:", e);
    }
  }

  markReplyRead(groupId, replyId) {
    console.log(`[ReadReceipt] markReplyRead called — groupId:${groupId} replyId:${replyId} wsState:${this.ws?.readyState}`);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[ReadReceipt] WS not open, skipping markReplyRead`);
      return;
    }
    try {
      const payload = { type: "read_group_reply", group_id: groupId, reply_id: replyId };
      console.log("[ReadReceipt] Sending →", JSON.stringify(payload));
      this.ws.send(JSON.stringify(payload));
    } catch (e) {
      console.error("[ReadReceipt] markReplyRead error:", e);
    }
  }

  sendTyping(groupId, status) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(
        JSON.stringify({
          type: "typing",
          group_id: groupId,
          sender_id: this.userId,
          status: status,
        }),
      );
      return true;
    } catch (error) {
      console.error("[GroupChatService] Error sending typing status:", error);
      return false;
    }
  }

  subscribe(event, callback) {
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
          console.error(
            `[GroupChatService] Error in ${event} callback:`,
            error,
          );
        }
      });
    }
  }

  getConnectionStatus() {
    return this.connectionStatus;
  }

  getGroups() {
    return this.groups;
  }

  isInitialized() {
    return (
      this.userId && this.token && this.connectionStatus !== "disconnected"
    );
  }

  getGroupMetadata(groupId) {
    if (groupId) {
      const gid = Number(groupId);
      return (
        this.groupMetadata.get(gid) || {
          lastMessageTimestamp: null,
          unreadCount: 0,
        }
      );
    }
    // Return all metadata as an object
    return Object.fromEntries(this.groupMetadata);
  }

  markGroupAsRead(groupId) {
    const gid = Number(groupId);
    const metadata = this.groupMetadata.get(gid);
    if (metadata) {
      this.groupMetadata.set(gid, {
        ...metadata,
        unreadCount: 0,
      });

      // Notify subscribers of metadata update
      this.notifySubscribers("group_metadata_updated", {
        groupId: gid,
        metadata: this.groupMetadata.get(gid),
      });
    }
  }

  setGroupActive(groupId) {
    const gid = Number(groupId);
    this.activeGroups.add(gid);
    // Also mark as read when setting active
    this.markGroupAsRead(gid);
  }

  async openGroupChat(groupId) {
    try {
      // Find the group from the groups list
      let group = this.groups.find((g) => g.id === groupId);

      // If group not found in the list, fetch from API
      if (!group) {
        const response = await axios.get(`${API_BASE_URL}/groups/${groupId}`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        group = response.data;
      }

      if (!group) {
        console.error(`[GroupChatService] Group with ID ${groupId} not found`);
        return;
      }

      // Notify subscribers to open chat with this group
      this.notifySubscribers("open_group_chat", { group });
    } catch (error) {
      console.error(
        `[GroupChatService] Error opening group chat ${groupId}:`,
        error,
      );
    }
  }

  setGroupInactive(groupId) {
    this.activeGroups.delete(Number(groupId));
  }

  close() {
    //
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.connectionStatus = "disconnected";
  }
}

const groupChatService = new GroupChatService();

export default groupChatService;
