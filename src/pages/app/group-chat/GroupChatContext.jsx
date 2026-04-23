import { getGroupMessages, getGroups } from "@/Services/api";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";
import groupChatService from "../../../Services/GroupChatService";

export const GroupChatContext = createContext(null);

export function GroupChatProvider({ children }) {
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeGroupId, setActiveGroupId] = useState(null);
  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) || null,
    [groups, activeGroupId],
  );
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [typingUsers, setTypingUsers] = useState([]);
  const [groupUnreadCounts, setGroupUnreadCounts] = useState({}); // { [groupId]: number }
  const [editMessageId, setEditMessageId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  // Added: Reply and edit states
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    messageId: null,
    messageType: null,
  });
  const token = useMemo(() => localStorage.getItem("accessToken"), []);
  const userId = useMemo(
    () => Number(localStorage.getItem("userId")) || null,
    [],
  );

  const normalizeId = (value) =>
    value == null || value === "" ? null : Number(value);

  // Load groups
  useEffect(() => {
    getGroups()
      .then((data) => {
        setGroups(data);
        setFilteredGroups(data);
      })
      .catch(() => {});
  }, []);

  // Filter groups
  useEffect(() => {
    if (!searchTerm) {
      setFilteredGroups(groups);
    } else {
      const st = searchTerm.toLowerCase();
      setFilteredGroups(
        groups.filter((g) => (g.name || "").toLowerCase().includes(st)),
      );
    }
  }, [groups, searchTerm]);

  // Load messages when switching groups
  useEffect(() => {
    if (!activeGroup || !token || !userId) return;

    // Mark group as active in GroupChatService
    console.log("[GroupChat] 🎯 Marking group as active:", activeGroup.id);
    groupChatService.setGroupActive(activeGroup.id);

    // Clear messages when switching groups to prevent stale data
    setMessages([]);
    setReplyingTo(null);
    setEditingReply(null);
    setEditMessageId(null);

    // Load messages for the active group
    getGroupMessages(activeGroup.id).then((serverMessages) => {
      console.log("[GroupChat] 📥 Loaded", serverMessages.length, "messages from API");
      
      const normalized = serverMessages.map((msg) => {
        // Normalize type: API returns "message" or "reply", UI expects "message" or "group_message_reply"
        const normalizedType = msg.type === "reply" ? "group_message_reply" : msg.type;
        
        // Deduplicate read_receipts - keep only the latest read_at for each user
        const receiptsMap = new Map();
        (msg.read_receipts || []).forEach((receipt) => {
          const userId = receipt.reader_id || receipt.user_id;
          if (!userId) return;
          
          const existing = receiptsMap.get(userId);
          const currentReadAt = new Date(receipt.read_at || 0);
          
          if (!existing || new Date(existing.read_at || 0) < currentReadAt) {
            receiptsMap.set(userId, {
              reader_id: userId,
              user_id: userId, // Keep both for compatibility
              reader: receipt.reader,
              read_at: receipt.read_at,
              is_read: true,
            });
          }
        });
        const deduplicatedReceipts = Array.from(receiptsMap.values());
        
        return {
          id: msg.id,
          type: normalizedType, // Normalize "reply" -> "group_message_reply"
          group_id: msg.group_id,

          // Server uses "content" field
          message: msg.content || msg.message || "",
          attachment: msg.attachment || null,

          created_at: msg.created_at,
          updated_at: msg.updated_at,

          // Server uses "sender" object
          user: {
            id: normalizeId(msg.sender?.id || msg.sender_id),
            first_name: msg.sender?.first_name,
            last_name: msg.sender?.last_name,
            profile_picture: msg.sender?.profile_picture,
            email: msg.sender?.email,
          },

          sender_id: normalizeId(msg.sender_id || msg.sender?.id),

          // Reply fields
          original_message_id: msg.original_message_id || null,
          parent_reply_id: msg.parent_reply_id || null,
          parentMsg: msg.parentMsg || null,

          is_deleted: msg.is_deleted,
          is_edited: msg.is_edited || false,
          is_read: msg.is_read || false,
          read_at: msg.read_at || null,
          is_forwarded: msg.is_forwarded || false,
          forwarded_from_message_id: msg.forwarded_from_message_id || null,
          forwarded_from_group_id: msg.forwarded_from_group_id || null,
          forwarded_from_reply_id: msg.forwarded_from_reply_id || null,
          read_receipts: deduplicatedReceipts, // Use deduplicated receipts
        };
      });

      setMessages(
        normalized.sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        ),
      );

      // Mark the latest message as read
      const lastMsg = normalized[normalized.length - 1];
      if (lastMsg) {
        let attempts = 0;
        const intervalId = setInterval(() => {
          console.log(`[ReadReceipt] tryMarkRead attempt ${attempts} — wsState:${groupChatService.ws?.readyState} msgId:${lastMsg.id}`);
          if (groupChatService.ws?.readyState === WebSocket.OPEN) {
            clearInterval(intervalId);
            if (lastMsg.type === "reply" || lastMsg.type === "group_message_reply") {
              groupChatService.markReplyRead(activeGroup.id, lastMsg.id);
            } else {
              groupChatService.markMessageRead(activeGroup.id, lastMsg.id);
            }
          } else if (++attempts >= 10) {
            clearInterval(intervalId);
            console.warn("[ReadReceipt] WS never opened after 10 attempts, giving up");
          }
        }, 300);
      }
    });
  }, [activeGroupId, token, userId]);

  // Subscribe to GroupChatService events
  useEffect(() => {
    if (!activeGroup) return;

    const handleNewMessage = (data) => {
      console.log("[GroupChat] 🔔 handleNewMessage fired, data:", data);
      console.log("[GroupChat] activeGroup.id:", activeGroup?.id, "data.groupId:", data.groupId);
      
      if (data.groupId !== activeGroup.id) {
        console.log("[GroupChat] ⚠️ Ignoring message — groupId mismatch");
        return;
      }

      const m = data.message || data;
      console.log("[GroupChat] 📦 Raw message object:", m);

      // ✅ Server sends "group_message" type, normalize to "message"
      const newMsg = {
        id: m.id,
        type: "message", // Normalize server's "group_message" to "message"
        group_id: m.group_id,
        message: m.content || m.message || "", // Server uses "content"
        attachment: m.attachment || null,
        created_at: m.created_at || new Date().toISOString(),
        updated_at: m.updated_at,
        user: {
          id: normalizeId(m.sender?.id || m.sender_id),
          first_name: m.sender?.first_name,
          last_name: m.sender?.last_name,
          profile_picture: m.sender?.profile_picture,
          email: m.sender?.email,
        },
        sender_id: normalizeId(m.sender_id || m.sender?.id),
        parentMsg: null, // Root messages don't have parents
        original_message_id: null,
        is_deleted: m.is_deleted || false,
        is_edited: m.is_edited || false,
        is_forwarded: m.is_forwarded || false,
        forwarded_from_message_id: m.forwarded_from_message_id || null,
        forwarded_from_group_id: m.forwarded_from_group_id || null,
        read_receipts: m.read_receipts || [],
      };

      console.log("[GroupChat] ✅ Normalized message:", newMsg);

      setMessages((prev) => {
        const exists = prev.find((msg) => msg.id === newMsg.id);

        if (exists) {
          console.log("[GroupChat] 🔄 Message already exists, updating:", newMsg.id);
          return prev.map((msg) =>
            msg.id === newMsg.id ? { ...msg, ...newMsg } : msg,
          );
        }

        console.log("[GroupChat] ➕ Adding new message:", newMsg.id);

        // Mark as read if it's from another user
        if (newMsg.sender_id && newMsg.sender_id !== userId) {
          console.log(`[ReadReceipt] New message from other user, marking read — msgId:${newMsg.id}`);
          groupChatService.markMessageRead(activeGroup.id, newMsg.id);
        }

        return [...prev, newMsg].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
      });
    };
    const handleGroupReply = (data) => {
      console.log("[GroupChat] 🔔 handleGroupReply fired, data:", data);
      console.log("[GroupChat] activeGroup.id:", activeGroup?.id, "data.group_id:", data.group_id);
      
      if (data.group_id !== activeGroup.id) {
        console.log("[GroupChat] ⚠️ Ignoring reply — groupId mismatch");
        return;
      }

      const m = data;

      // Skip invalid events
      if (!m.id || !m.sender_id) {
        console.warn("[GroupChat] Skipping invalid reply event:", m);
        return;
      }

      console.log("[GroupChat] 💬 Processing reply, id:", m.id);

      setMessages((prev) => {
        console.log("[GroupChat] 📋 Current messages count:", prev.length);
        
        const replyMsg = {
          id: m.id,
          type: "group_message_reply", // Keep as "group_message_reply" for UI
          group_id: m.group_id,
          message: m.content || m.message || "", // Server uses "content"
          attachment: m.attachment || null,
          created_at: m.created_at || new Date().toISOString(),
          updated_at: m.updated_at,
          user: {
            id: normalizeId(m.sender?.id || m.sender_id),
            first_name: m.sender?.first_name,
            last_name: m.sender?.last_name,
            profile_picture: m.sender?.profile_picture,
            email: m.sender?.email,
          },
          sender_id: normalizeId(m.sender_id || m.sender?.id),
          original_message_id: m.original_message_id || m.parent_reply_id,
          parent_reply_id: m.parent_reply_id || null,
          // Server sends parentMsg in the response
          parentMsg: m.parentMsg || prev.find(
            (msg) => msg.id === (m.original_message_id || m.parent_reply_id),
          ),
          is_deleted: m.is_deleted || false,
          is_edited: m.is_edited || false,
          is_read: m.is_read || false,
          read_at: m.read_at || null,
          is_forwarded: m.is_forwarded || false,
          forwarded_from_reply_id: m.forwarded_from_reply_id || null,
          forwarded_from_message_id: m.forwarded_from_message_id || null,
          read_receipts: m.read_receipts || [], // Include read receipts for replies
        };

        console.log("[GroupChat] ✅ Normalized reply:", replyMsg);

        // Remove optimistic reply if exists
        const optimisticIndex = prev.findIndex(
          (msg) =>
            msg.isOptimistic &&
            msg.original_message_id === replyMsg.original_message_id &&
            msg.sender_id === replyMsg.sender_id,
        );
        let updated = prev;
        if (optimisticIndex !== -1) {
          console.log(
            "[GroupChat] Removing optimistic reply at index:",
            optimisticIndex,
          );
          updated = [...prev];
          updated.splice(optimisticIndex, 1);
        }

        const exists = updated.find((msg) => msg.id === replyMsg.id);
        if (exists) {
          console.log("[GroupChat] 🔄 Reply already exists, updating:", replyMsg.id);
          return updated.map((msg) =>
            msg.id === replyMsg.id ? { ...msg, ...replyMsg } : msg,
          );
        }

        console.log("[GroupChat] ➕ Adding new reply:", replyMsg.id);

        // Mark as read if it's from another user
        if (replyMsg.sender_id && replyMsg.sender_id !== userId) {
          console.log(`[ReadReceipt] New reply from other user, marking read — replyId:${replyMsg.id}`);
          groupChatService.markReplyRead(activeGroup.id, replyMsg.id);
        }

        const newMessages = [...updated, replyMsg].sort(
          (a, b) =>
            new Date(a.created_at || Date.now()) -
            new Date(b.created_at || Date.now()),
        );
        
        console.log("[GroupChat] 📋 New messages count:", newMessages.length);
        return newMessages;
      });
    };
    const handleMessageEdit = (data) => {
      if (data.groupId !== activeGroup.id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, data, message: data.newContent }
            : m,
        ),
      );
    };

    const handleMessageDelete = (data) => {
      if (data.groupId !== activeGroup.id) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.message_id) return m;

          const isMe = m.sender_id === userId;

          return {
            ...m,
            message: isMe
              ? "You deleted this message"
              : "This message was deleted",
            is_deleted: true,
            attachment: null,
          };
        }),
      );
    };

    const handleReplyEdit = (data) => {
      if (data.groupId !== activeGroup.id) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data?.reply?.id
            ? {
                ...msg,
                data,
                message: data?.reply?.reply_message,
                updated_at: new Date().toISOString(),
              }
            : msg,
        ),
      );
    };

    const handleReplyDelete = (data) => {
      if (data.group_id !== activeGroup.id) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.replyId
            ? {
                ...msg,
                message: "Reply deleted",
                is_deleted: true,
                attachment: null,
              }
            : msg,
        ),
      );
    };

    const handleTyping = (data) => {
      if (data.groupId !== activeGroup.id) return;

      // Server sends "start" or "stop" per docs
      if (data.senderId !== userId && data.status === "start") {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === data.senderId)) return prev;

          // Try to resolve name from already-loaded messages
          const knownMsg = messages.find(
            (m) => (m.sender_id || m.user?.id || m.sender?.id) === data.senderId
          );
          const resolvedName =
            data.user?.first_name
              ? `${data.user.first_name} ${data.user.last_name || ""}`.trim()
              : knownMsg?.user?.first_name
              ? `${knownMsg.user.first_name} ${knownMsg.user.last_name || ""}`.trim()
              : knownMsg?.sender?.first_name
              ? `${knownMsg.sender.first_name} ${knownMsg.sender.last_name || ""}`.trim()
              : null;

          if (resolvedName) {
            return [...prev, { id: data.senderId, name: resolvedName }];
          }

          // Fetch name from API as last resort, add placeholder first
          const token = localStorage.getItem("accessToken");
          fetch(`https://chatsupport.fskindia.com/users/${data.senderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.json())
            .then((u) => {
              const name = u?.first_name
                ? `${u.first_name} ${u.last_name || ""}`.trim()
                : `User ${data.senderId}`;
              setTypingUsers((p) =>
                p.map((t) => (t.id === data.senderId ? { ...t, name } : t))
              );
            })
            .catch(() => {});

          return [...prev, { id: data.senderId, name: `User ${data.senderId}` }];
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== data.senderId));
        }, 2000);
      } else if (data.status === "stop") {
        setTypingUsers((prev) => prev.filter((u) => u.id !== data.senderId));
      }
    };

    const handleConnection = (data) => {
      setConnectionStatus(data.status);
    };

    const handleGroupMessageRead = (data) => {
      console.log("[ReadReceipt] handleGroupMessageRead fired →", data);
      if (data.group_id !== activeGroup.id) {
        console.log(`[ReadReceipt] Ignoring — data.group_id:${data.group_id} !== activeGroup.id:${activeGroup.id}`);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.message_id) return m;
          
          const receipts = m.read_receipts || [];
          
          // Check if this user already has a read receipt
          const existingIndex = receipts.findIndex((r) => r.reader_id === data.reader_id || r.user_id === data.reader_id);
          
          if (existingIndex !== -1) {
            // Update existing receipt with latest read_at
            console.log(`[ReadReceipt] Updating existing receipt for msgId:${m.id}, reader:${data.reader_id}`);
            const updatedReceipts = [...receipts];
            updatedReceipts[existingIndex] = {
              reader_id: data.reader_id,
              user_id: data.reader_id, // Keep both for compatibility
              reader: data.reader,
              read_at: data.read_at,
              is_read: true,
            };
            return { ...m, read_receipts: updatedReceipts };
          }
          
          // Add new receipt
          console.log(`[ReadReceipt] Adding new receipt for msgId:${m.id}, reader:${data.reader_id}`);
          return {
            ...m,
            read_receipts: [
              ...receipts,
              {
                reader_id: data.reader_id,
                user_id: data.reader_id, // Keep both for compatibility
                reader: data.reader,
                read_at: data.read_at,
                is_read: true,
              },
            ],
          };
        })
      );
    };

    const handleGroupReplyRead = (data) => {
      console.log("[ReadReceipt] handleGroupReplyRead fired →", data);
      if (data.group_id !== activeGroup.id) {
        console.log(`[ReadReceipt] Ignoring — data.group_id:${data.group_id} !== activeGroup.id:${activeGroup.id}`);
        return;
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.reply_id) return m;
          
          const receipts = m.read_receipts || [];
          
          // Check if this user already has a read receipt
          const existingIndex = receipts.findIndex((r) => r.reader_id === data.reader_id || r.user_id === data.reader_id);
          
          if (existingIndex !== -1) {
            // Update existing receipt with latest read_at
            console.log(`[ReadReceipt] Updating existing receipt for replyId:${m.id}, reader:${data.reader_id}`);
            const updatedReceipts = [...receipts];
            updatedReceipts[existingIndex] = {
              reader_id: data.reader_id,
              user_id: data.reader_id, // Keep both for compatibility
              reader: data.reader,
              read_at: data.read_at,
              is_read: true,
            };
            return { ...m, read_receipts: updatedReceipts };
          }
          
          // Add new receipt
          console.log(`[ReadReceipt] Adding new receipt for replyId:${m.id}, reader:${data.reader_id}`);
          return {
            ...m,
            read_receipts: [
              ...receipts,
              {
                reader_id: data.reader_id,
                user_id: data.reader_id, // Keep both for compatibility
                reader: data.reader,
                read_at: data.read_at,
                is_read: true,
              },
            ],
          };
        })
      );
    };

    const handleSystemMessage = (data) => {
      if (data.group_id !== activeGroup.id) return;
      
      console.log("[GroupChat] 🔔 System message:", data);
      
      // Add system message to the chat
      const systemMsg = {
        id: data.id,
        type: "system_message",
        group_id: data.group_id,
        message: data.content,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_system: true,
        new_members: data.new_members || [],
      };

      setMessages((prev) => {
        const exists = prev.find((msg) => msg.id === systemMsg.id);
        if (exists) return prev;
        
        return [...prev, systemMsg].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
      });
    };

    // Subscribe to GroupChatService events
    groupChatService.subscribe("new_group_message", handleNewMessage);
    groupChatService.subscribe("group_message_edit", handleMessageEdit);
    groupChatService.subscribe("delete_group_message", handleMessageDelete);
    groupChatService.subscribe("group_message_reply", handleGroupReply);
    groupChatService.subscribe("group_reply_edit", handleReplyEdit);
    groupChatService.subscribe("group_reply_delete", handleReplyDelete);
    groupChatService.subscribe("group_typing", handleTyping);
    groupChatService.subscribe("connection", handleConnection);
    groupChatService.subscribe("group_message_read", handleGroupMessageRead);
    groupChatService.subscribe("group_reply_read", handleGroupReplyRead);
    groupChatService.subscribe("system_message", handleSystemMessage);

    // Set initial connection status
    setConnectionStatus(groupChatService.getConnectionStatus());

    return () => {
      // Mark group as inactive when leaving
      if (activeGroup?.id) {
        console.log("[GroupChat] 🚪 Marking group as inactive:", activeGroup.id);
        groupChatService.setGroupInactive(activeGroup.id);
      }
      
      groupChatService.unsubscribe("new_group_message", handleNewMessage);
      groupChatService.unsubscribe("group_message_edit", handleMessageEdit);
      groupChatService.unsubscribe("delete_group_message", handleMessageDelete);
      groupChatService.unsubscribe("group_message_reply", handleGroupReply);
      groupChatService.unsubscribe("group_reply_edit", handleReplyEdit);
      groupChatService.unsubscribe("group_reply_delete", handleReplyDelete);
      groupChatService.unsubscribe("group_typing", handleTyping);
      groupChatService.unsubscribe("connection", handleConnection);
      groupChatService.unsubscribe("group_message_read", handleGroupMessageRead);
      groupChatService.unsubscribe("group_reply_read", handleGroupReplyRead);
      groupChatService.unsubscribe("system_message", handleSystemMessage);
    };
  }, [activeGroup, userId]);

  const selectGroup = useCallback((groupId) => setActiveGroupId(groupId), []);

  // Global subscription for unread counts — not tied to activeGroup
  useEffect(() => {
    const handleMetadataUpdate = (data) => {
      const gid = Number(data.groupId);
      if (isNaN(gid)) return;
      setGroupUnreadCounts((prev) => ({
        ...prev,
        [gid]: data.metadata?.unreadCount || 0,
      }));
    };

    groupChatService.subscribe("group_metadata_updated", handleMetadataUpdate);

    // Seed from existing metadata on mount
    const existing = groupChatService.getGroupMetadata();
    if (existing && typeof existing === "object") {
      const counts = {};
      Object.entries(existing).forEach(([gid, meta]) => {
        counts[Number(gid)] = meta.unreadCount || 0;
      });
      setGroupUnreadCounts(counts);
    }

    return () => {
      groupChatService.unsubscribe("group_metadata_updated", handleMetadataUpdate);
    };
  }, []);

  const handleTyping = useCallback(() => {
    if (!groupChatService.isInitialized() || !activeGroup) return;

    groupChatService.sendTyping(activeGroup.id, "started");
    setTimeout(() => {
      groupChatService.sendTyping(activeGroup.id, "stopped");
    }, 2000);
  }, [activeGroup]);

  const handleFileChange = useCallback((file) => {
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    // Check file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Allowed: PNG, JPEG, JPG, PDF, DOC, DOCX");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        base64: reader.result.split(",")[1],
        type: file.type,
        name: file.name,
      });

      // Set preview
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
  }, []);

  const sendMessage = useCallback(() => {
    const content = inputText.trim();
    if (!content && !attachment) return;
    if (!groupChatService.isInitialized() || !activeGroup) return;

    if (editMessageId) {
      const payload = {
        type: "edit_group_message",
        message_id: parseInt(editMessageId),
        new_content: content,
      };
      console.log("[GroupChat] Sending edit message:", payload);
      if (groupChatService.sendMessage(payload)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editMessageId
              ? { ...m, message: content, updated_at: new Date().toISOString() }
              : m,
          ),
        );
        setEditMessageId(null);
        setInputText("");
        setAttachment(null);
        setAttachmentPreview(null);
      }
      return;
    }

    if (editingReply) {
      const payload = {
        type: "edit_group_reply",
        reply_id: parseInt(editingReply.id),
        reply_message: content,
      };

      if (groupChatService.sendMessage(payload)) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editingReply.id
              ? {
                  ...msg,
                  message: content,
                  updated_at: new Date().toISOString(),
                }
              : msg,
          ),
        );
        setEditingReply(null);
        setInputText("");
        setAttachment(null);
        setAttachmentPreview(null);
      }
      return;
    }

    if (replyingTo) {
      const isReplyingToReply = replyingTo.type === "group_message_reply";
      const parentId = replyingTo.isOptimistic
        ? Number(replyingTo.original_message_id)
        : Number(replyingTo.id);
      if (isNaN(parentId)) {
        console.error(
          "[GroupChat] Invalid parent ID:",
          replyingTo.id,
          "Cannot send reply",
        );
        return;
      }

      const payload = isReplyingToReply
        ? {
            type: "reply_on_reply",
            group_id: activeGroup.id,
            parent_reply_id: parentId,
            reply_content: content,
            sender_id: userId,
          }
        : {
            type: "group_message_reply",
            group_id: activeGroup.id,
            original_message_id: parentId,
            reply_message: content,
            sender_id: userId,
          };
      console.log("[GroupChat] Sending reply:", payload);
      if (groupChatService.sendMessage(payload)) {
        // Commented out optimistic reply addition
        /*
        // Add optimistic reply
        const optimisticReply = {
          id: `optimistic-${Date.now()}`,
          isOptimistic: true,
          type: "group_message_reply",
          group_id: activeGroup.id,
          message: content,
          attachment: attachment,
          created_at: new Date().toISOString(),
          user: {
            id: userId,
            first_name: localStorage.getItem("firstName") || "You",
            last_name: localStorage.getItem("lastName") || "",
            profile_picture: localStorage.getItem("profilePicture") || null,
          },
          sender_id: userId,
          original_message_id: parentId,
          parentMsg: replyingTo,
          is_edited: false,
          is_deleted: false,
        };
        console.log("[GroupChat] Adding optimistic reply:", optimisticReply);
        setMessages((prev) => {
          const updated = [...prev, optimisticReply];
          return updated.sort(
            (a, b) => new Date(a.created_at) - new Date(b.created_at),
          );
        });
        */
        setReplyingTo(null);
        setInputText("");
        setAttachment(null);
        setAttachmentPreview(null);
      }
      return;
    }

    const payload = {
      type: "message",
      group_id: activeGroup.id,
      content,
    };

    if (attachment) {
      if (!content) {
        toast.error("Please add a message to go with your attachment.");
        return;
      }
      payload.attachment = {
        base64: attachment.base64,
        name: attachment.name,
      };
    }

    if (groupChatService.sendMessage(payload)) {
      setInputText("");
      setAttachment(null);
      setAttachmentPreview(null);
    }
  }, [
    activeGroup,
    inputText,
    attachment,
    editMessageId,
    editingReply,
    replyingTo,
    userId,
  ]);

  // Forward a root message to a group
  const forwardMessageToGroup = useCallback((message, targetGroupId) => {
    if (!groupChatService.isInitialized()) return;
    const isReply = message.type === "group_message_reply" || message.type === "reply";
    if (isReply) {
      const payload = {
        type: "forward_reply",
        source_reply_id: message.id,
        target_group_id: targetGroupId,
        is_reply: false,
        original_message_id: null,
        parent_reply_id: null,
      };
      console.log("[Forward] forward_reply payload →", JSON.stringify(payload, null, 2));
      groupChatService.sendMessage(payload);
    } else {
      const payload = {
        type: "forward_message",
        source_message_id: message.id,
        target_group_id: targetGroupId,
      };
      console.log("[Forward] forward_message payload →", JSON.stringify(payload, null, 2));
      console.log("[Forward] message object →", JSON.stringify(message, null, 2));
      groupChatService.sendMessage(payload);
    }
  }, []);

  // Forward a group message to a DM user (via direct chat service)
  const forwardMessageToUser = useCallback((message, recipientId) => {
    if (!groupChatService.isInitialized()) return;
    import("../../../Services/ChatService").then(({ default: chatService }) => {
      const payload = {
        type: "forward_message",
        message_id: message.id,
        recipient_id: recipientId,
        is_reply: false,
      };
      console.log("[Forward] group → DM payload →", JSON.stringify(payload, null, 2));
      chatService.sendMessage(payload);
    });
  }, []);

  const deleteMessage = useCallback((messageId) => {
    if (!groupChatService.isInitialized()) return;

    const payload = {
      type: "delete_group_message",
      message_id: parseInt(messageId),
    };

    if (groupChatService.sendMessage(payload)) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, message: "Message deleted", is_deleted: true, attachment: null }
            : m,
        ),
      );
    }
  }, []);

  const deleteReply = useCallback((replyId) => {
    if (!groupChatService.isInitialized()) return;

    const payload = {
      type: "delete_group_reply",
      reply_id: parseInt(replyId),
    };

    if (groupChatService.sendMessage(payload)) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === parseInt(replyId)
            ? {
                ...msg,
                message: "Reply deleted",
                is_deleted: true,
                attachment: null,
              }
            : msg,
        ),
      );
    }
  }, []);

  const startEditing = useCallback((message) => {
    setEditMessageId(message.id);
    setInputText(message.message || "");
    setReplyingTo(null);
    setEditingReply(null);
  }, []);

  const startEditingReply = useCallback((reply, originalMessageId) => {
    setEditingReply({ id: reply.id, original_message_id: originalMessageId });
    setInputText(reply.message || reply.reply_message || "");
    setReplyingTo(null);
    setEditMessageId(null);
  }, []);

  const handleReply = useCallback((message) => {
    setReplyingTo(message);
    setEditingReply(null);
    setEditMessageId(null);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setEditingReply(null);
    setEditMessageId(null);
    setInputText("");
    setAttachment(null);
    setAttachmentPreview(null);
  }, []);

  const value = useMemo(() => {
    return {
      groups,
      filteredGroups,
      searchTerm,
      setSearchTerm,
      activeGroup,
      activeGroupId,
      selectGroup,
      connectionStatus,
      typingUsers,
      groupUnreadCounts,
      messages,
      inputText,
      setInputText,
      handleTyping,
      handleFileChange,
      sendMessage,
      deleteMessage,
      deleteReply,
      startEditing,
      startEditingReply,
      handleReply,
      cancelReply,
      replyingTo,
      editingReply,
      editMessageId,
      deleteModal,
      setDeleteModal,
      attachment,
      attachmentPreview,
      setAttachment,
      setAttachmentPreview,
      forwardMessageToGroup,
      forwardMessageToUser,
      clearAttachment: () => {
        setAttachment(null);
        setAttachmentPreview(null);
      },
    };
  }, [
    groups,
    filteredGroups,
    searchTerm,
    activeGroup,
    activeGroupId,
    selectGroup,
    connectionStatus,
    typingUsers,
    groupUnreadCounts,
    messages,
    inputText,
    handleTyping,
    handleFileChange,
    sendMessage,
    deleteMessage,
    deleteReply,
    startEditing,
    startEditingReply,
    handleReply,
    cancelReply,
    replyingTo,
    editingReply,
    editMessageId,
    deleteModal,
    attachment,
    attachmentPreview,
    forwardMessageToGroup,
    forwardMessageToUser,
  ]);

  return (
    <GroupChatContext.Provider value={value}>
      {children}
    </GroupChatContext.Provider>
  );
}

export default GroupChatProvider;
