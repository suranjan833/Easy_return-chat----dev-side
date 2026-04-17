import chatService from "@/Services/ChatService";
import { getDirectMessages } from "@/Services/DirectsmsApi";
import ApiClient from "@/Services/DirectsmsApi";
import axios from "axios";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";

export const DirectChatContext = createContext(null);

export function DirectChatProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [recentChats, setRecentChats] = useState([]);
  const [activeUserIDs, setActiveUserIDs] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [activeUserId, setActiveUserId] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messageSearchTerm, setMessageSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);

  const activeUser = useMemo(() => {
    var returnUser = null;

    // 1. Try from conversations (users list)
    const fromConversations = users.find(
      (u) => u.other_user?.id === activeUserId,
    );

    if (fromConversations) {
      returnUser = fromConversations.other_user;
    } else {
      const fromAllUsers = allUsers.find((u) => u.id === activeUserId);
      returnUser = fromAllUsers || null;
    }
    localStorage.setItem("active_user_id", returnUser?.id);

    return returnUser;
  }, [users, allUsers, activeUserId]);

  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messageSkipRef = useRef(0);
  const PAGE_LIMIT = 500;
  // Split: hiddenMessages = messages before divider (loaded on scroll-up)
  const [hiddenMessages, setHiddenMessages] = useState([]);
  const [hasHidden, setHasHidden] = useState(false);

  const [selectedMessages, setSelectedMessages] = useState([]);
  const [deleteType, setDeleteType] = useState();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [replyToMessage, setReplyToMessageState] = useState(null); // Initialize as null, will load in useEffect
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingDebounceRef = useRef(null);
  const messageRefs = useRef({});
  // Added: Reply and edit states for UI
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);

  const ME_ID = useMemo(
    () => parseInt(localStorage.getItem("userId")) || -1,
    [],
  );
  const TOKEN = useMemo(() => localStorage.getItem("accessToken"), []);

  // Custom setter for replyToMessage to persist in localStorage
  const setReplyToMessage = useCallback((message) => {
    setReplyToMessageState(message);
    if (message) {
      localStorage.setItem("directChatReplyToMessage", JSON.stringify(message));
    } else {
      localStorage.removeItem("directChatReplyToMessage");
    }
  }, []);

  // Effect to load replyToMessage from localStorage and validate it
  useEffect(() => {
    try {
      const storedReply = localStorage.getItem("directChatReplyToMessage");
      if (storedReply) {
        const parsedReply = JSON.parse(storedReply);
        // Validate if the stored reply message is still relevant to the active user and messages
        if (activeUser && messages.some((m) => m.id === parsedReply.id)) {
          setReplyToMessageState(parsedReply);
        } else {
          localStorage.removeItem("directChatReplyToMessage");
        }
      }
    } catch (error) {
      console.error(
        "Failed to load or parse replyToMessage from localStorage",
        error,
      );
      localStorage.removeItem("directChatReplyToMessage");
    }
  }, [activeUser, messages]); // Re-evaluate when activeUser or messages change

  // Effect to update replyToMessage if its ID changes from temp to real
  useEffect(() => {
    if (
      replyToMessage &&
      typeof replyToMessage.id === "string" &&
      replyToMessage.id.startsWith("temp-")
    ) {
      const realMessage = messages.find(
        (msg) =>
          msg.content === replyToMessage.content &&
          msg.timestamp === replyToMessage.timestamp &&
          (typeof msg.id === "string" ? !msg.id.startsWith("temp-") : true),
      );
      if (realMessage && realMessage.id !== replyToMessage.id) {
        setReplyToMessage(realMessage);
      }
    }
  }, [messages, replyToMessage, setReplyToMessage]); // Depend on messages and replyToMessage

  useEffect(() => {
    if (!activeUser) return;

    setTotalUnreadCount((prev) => prev - activeUser.unread_count);

    // update local users state
    setUsers((prev) =>
      prev.map((conv) =>
        conv.other_user.id === activeUser.id
          ? { ...conv, unread_count: 0 }
          : conv,
      ),
    );
  }, [activeUser]);

  //search message
  const searchMessages = useCallback(
    async (query, skip = 0, limit = 50) => {
      if (!query || !activeUser) {
        setSearchResults([]);
        return;
      }

      try {
        setIsSearchingMessages(true);

        const response = await ApiClient.get(`/messaging/messages/search`, {
          params: {
            query,
            user_id_1: ME_ID,
            user_id_2: activeUser.id,
            skip,
            limit,
          },
        });

        setSearchResults(response.data || []);
      } catch (err) {
        console.error(err);
        toast.error("Search failed");
      } finally {
        setIsSearchingMessages(false);
      }
    },
    [ME_ID, activeUser],
  );
  useEffect(() => {
    const delay = setTimeout(() => {
      if (messageSearchTerm.trim()) {
        searchMessages(messageSearchTerm);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [messageSearchTerm, searchMessages]);

  // Normalize conversation objects — the API returns other_user as either:
  // - a flat object: { id, first_name, ... }  (agent view)
  // - an array: [{ sender: {...} }, { recipient: {...} }]  (admin view)
  const normalizeConversations = useCallback((convs) => {
    if (!Array.isArray(convs)) return convs;
    const ME_ID_local = parseInt(localStorage.getItem("userId")) || -1;
    return convs.map((conv) => {
      if (!Array.isArray(conv.other_user)) return conv; // already flat
      // Extract sender and recipient from the array
      let sender = null;
      let recipient = null;
      for (const entry of conv.other_user) {
        if (entry.sender) sender = entry.sender;
        if (entry.recipient) recipient = entry.recipient;
      }
      // For admin: neither participant is ME — keep both, pick one as "other_user"
      const otherUser = (sender?.id !== ME_ID_local ? sender : null)
        || (recipient?.id !== ME_ID_local ? recipient : null)
        || sender || recipient || {};
      return {
        ...conv,
        other_user: otherUser,
        // Preserve both for admin display
        conv_sender: sender,
        conv_recipient: recipient,
        is_admin_view: sender?.id !== ME_ID_local && recipient?.id !== ME_ID_local,
      };
    });
  }, []);

  const handleInitialData = useCallback((data) => {
    const normalized = normalizeConversations(data.users);
    setUsers(normalized);
    setFilteredUsers(normalized);
    if (data.recentChats) {
      // Deduplicate by recipient_id, keep most recent
      const deduped = data.recentChats
        .sort((a, b) => new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp))
        .filter((c, i, arr) => arr.findIndex((x) => x.recipient_id === c.recipient_id) === i);
      setRecentChats(deduped);
    }
    setTotalUnreadCount(data.totalUnreadCount || 0);
  }, [normalizeConversations]);

  const handleConnection = useCallback((data) => {
    setConnectionStatus(data.status);
  }, []);

  const handleOnlineUpdates = useCallback(
    (data) => {
      setActiveUserIDs(data?.online_users || []);
    },
    [ME_ID, activeUser],
  );

  const handleNewMessage = useCallback(
    (data) => {
      const { message, otherUserId, senderId } = data;
      // Update recent chats for all messages
      setRecentChats((prev) => {
        const next = [...prev];
        const idx = next.findIndex((c) => c.recipient_id === otherUserId);
        
        // Skip if already exists (prevents duplication from sendMessage optimistic update)
        if (idx >= 0) {
          const existing = next[idx];
          // Only update if this message is newer than what we have
          if (new Date(message.timestamp) > new Date(existing.last_message_timestamp)) {
            next[idx] = {
              ...existing,
              id: message.id,
              last_message:
                message.content ||
                (message.attachment ? `📎 ${message.attachment}` : ""),
              last_message_timestamp: message.timestamp,
              sender_id: senderId,
            };
          }
          return next;
        }
        
        // Only add new entry if not found
        next.push({
          id: message.id,
          recipient_id: otherUserId,
          last_message:
            message.content ||
            (message.attachment ? `📎 ${message.attachment}` : ""),
          last_message_timestamp: message.timestamp,
          sender_id: senderId,
        });
        return next;
      });

      //if msg is not sent from me and active chat is open then mark as read immediately
      if (senderId !== ME_ID && activeUser?.id === otherUserId) {
        markMessageAsRead(message.id);
      }

      setUsers((prevUsers) => {
        let found = false;

        const updated = prevUsers.map((conv) => {
          if (conv.other_user.id === otherUserId) {
            found = true;

            return {
              ...conv,
              latest_message: {
                content:
                  message.content ||
                  (message.attachment ? "📎 Attachment" : "") ||
                  message.reply_content,
                timestamp: message.timestamp || message.created_at,
                sender_id: senderId,
              },
              unread_count:
                senderId !== ME_ID && activeUser?.id !== otherUserId
                  ? (conv.unread_count || 0) + 1
                  : conv.unread_count || 0,
            };
          }

          return conv;
        });

        // 🆕 If user not found → create new conversation
        if (!found) {
          // Try to get user from allUsers
          const userFromAll = allUsers.find((u) => u.id === otherUserId);

          if (userFromAll) {
            updated.unshift({
              conversation_id: `temp_${ME_ID}_${otherUserId}`,
              other_user: userFromAll,
              latest_message: {
                content:
                  message.content ||
                  (message.attachment ? "📎 Attachment" : ""),
                timestamp: message.timestamp,
                sender_id: senderId,
              },
              unread_count: senderId !== ME_ID ? 1 : 0,
              messages: [],
            });
          }
        }

        // 🔥 Sort newest chat on top and deduplicate by other_user.id
        const sorted = updated.sort((a, b) => {
          const t1 = new Date(a.latest_message?.timestamp || 0).getTime();
          const t2 = new Date(b.latest_message?.timestamp || 0).getTime();
          return t2 - t1;
        });
        
        // Deduplicate: keep only the first occurrence of each other_user.id
        const seen = new Set();
        return sorted.filter((conv) => {
          if (seen.has(conv.other_user.id)) {
            return false;
          }
          seen.add(conv.other_user.id);
          return true;
        });
      });

      // Update total unread count when a new message arrives
      if (senderId !== ME_ID && (!activeUser || activeUser.id !== senderId)) {
        setTotalUnreadCount((prev) => prev + 1);
      }

      // Append to open thread if relevant

      if (activeUser && otherUserId === activeUser.id) {
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;

          const newMsg = {
            ...message,

            timestamp:
              message.timestamp ||
              message.created_at ||
              new Date().toISOString(),

            forwarded:
              message.forwarded === true ||
              message.forwarded_from_message_id !== undefined,
          };

          return [...prev, newMsg].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
          );
        });
      }
    },
    [ME_ID, activeUser],
  );

  const handleStatusUpdate = useCallback(
    (data) => {
      // set msg read true for that and all previous msgs, and store read_at
      const readAt = data.read_at || data.timestamp || new Date().toISOString();
      setMessages((prev) =>
        prev.map((m) => {
          // Mark the specific message and all previous messages from the same sender as read
          if (m.id === data.message_id || (m.id < data.message_id && m.sender_id === ME_ID)) {
            return { ...m, read: true, read_at: readAt, delivered: true };
          }
          return m;
        }),
      );
    },
    [ME_ID],
  );

  const handleTypingEvent = useCallback(
    (data) => {
      // Renamed to avoid conflict with handleTyping action
      const { sender_id, recipient_id, status } = data;
      if (recipient_id === ME_ID) {
        if (status === "started") {
          const user = users.find((u) => u.id === sender_id);
          const name = user
            ? `${user.first_name} ${user.last_name || ""}`
            : "User";
          setTypingUsers((prev) => ({ ...prev, [sender_id]: name }));
        } else if (status === "stopped") {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[sender_id];
            return next;
          });
        }
      }
    },
    [ME_ID, users],
  );

  const handleError = useCallback((data) => {
    toast.error(data.message);
  }, []);

  const handleMessageEdit = useCallback((data) => {
    const { reply_id, message_id, content, reply_content, updated_at } = data;
    const editedId = message_id || reply_id;
    const editContent = content || reply_content;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === editedId
          ? {
              ...m,
              content: editContent,
              reply_content: editContent,
              edited: true,
              is_edited: true,
              updated_at,
            }
          : m,
      ),
    );
  }, []);

  const handleMessageDelete = useCallback((data) => {
    const { reply_id, message_id } = data;
    const deleteId = message_id || reply_id;

    setMessages((prev) =>
      prev.map((m) => (m.id === deleteId ? { ...m, is_deleted: true, content: "", reply_content: "" } : m)),
    );
    
    // Also update hidden messages if the deleted message is there
    setHiddenMessages((prev) =>
      prev.map((m) => (m.id === deleteId ? { ...m, is_deleted: true, content: "", reply_content: "" } : m)),
    );
  }, []);

  // Effect for fetching initial recent chats and unread count
  useEffect(() => {
    if (!ME_ID || !TOKEN || isNaN(ME_ID)) return;

    const fetchRecentChats = async () => {
      try {
        const response = await axios.get(
          "https://chatsupport.fskindia.com/messaging/recent-chats",
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          },
        );
        const chats = response?.data?.map((chat) => ({
          id: chat.id,
          recipient_id:
            chat.sender_id === ME_ID ? chat.recipient_id : chat.sender_id,
          last_message:
            chat.content || (chat.attachment ? `📎 ${chat.attachment}` : ""),
          last_message_timestamp: chat.timestamp,
          sender_id: chat.sender_id,
        }));

        // Deduplicate by recipient_id, keep most recent
        const deduped = chats
          .sort((a, b) => new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp))
          .filter((c, i, arr) => arr.findIndex((x) => x.recipient_id === c.recipient_id) === i);

        setRecentChats(deduped);

        const unreadResponse = await axios.get(
          "https://chatsupport.fskindia.com/messaging/messages/user/unread/count",
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          },
        );
        setTotalUnreadCount(unreadResponse.data?.unread_count || 0);
      } catch (error) {
        console.error("Failed to fetch recent chats:", error);
        // toast.error("Failed to load recent chats");
      }
    };

    fetchRecentChats();
  }, [ME_ID, TOKEN]); // Dependencies are ME_ID and TOKEN only

  // Effect for chat service subscriptions
  useEffect(() => {
    if (!ME_ID || !TOKEN || isNaN(ME_ID)) return;

    chatService.subscribe("initial_data", handleInitialData);
    chatService.subscribe("connection", handleConnection);
    chatService.subscribe("new_message", handleNewMessage);
    chatService.subscribe("online_update", handleOnlineUpdates);
    chatService.subscribe("typing", handleTypingEvent);
    chatService.subscribe("error", handleError);
    chatService.subscribe("message_edit", handleMessageEdit);
    chatService.subscribe("message_delete", handleMessageDelete);
    chatService.subscribe("update_status", handleStatusUpdate);

    const currentUsers = chatService.getUsers();
    const currentChats = chatService.getRecentChats();
    const currentStatus = chatService.getConnectionStatus();
    const currentAllUsers = chatService.getAllUsers();

    if (currentUsers.length > 0 && users.length === 0) {
      const normalized = normalizeConversations(currentUsers);
      setUsers(normalized);
      setFilteredUsers(normalized);
    }
    if (currentChats.length > 0) {
      setRecentChats(currentChats);
    }
    if (currentStatus) {
      setConnectionStatus(currentStatus);
    }

    if (currentAllUsers.length > 0) {
      setAllUsers(currentAllUsers);
    }

    return () => {
      chatService.unsubscribe("initial_data", handleInitialData);
      chatService.unsubscribe("connection", handleConnection);
      chatService.unsubscribe("new_message", handleNewMessage);
      chatService.unsubscribe("online_update", handleOnlineUpdates);
      chatService.unsubscribe("typing", handleTypingEvent);
      chatService.unsubscribe("error", handleError);
      chatService.unsubscribe("message_edit", handleMessageEdit);
      chatService.unsubscribe("message_delete", handleMessageDelete);
      chatService.unsubscribe("update_status", handleStatusUpdate);
    };
  }, [
    ME_ID,
    TOKEN,
    activeUser,
    handleInitialData,
    handleConnection,
    handleNewMessage,
    handleTypingEvent,
    handleError,
    handleMessageEdit,
  ]);

  // Added all useCallback dependencies

  // Search filter + sort by recent chat
  // useEffect(() => {
  //   const base = users.filter((user) =>
  //     `${user.first_name || ""} ${user.last_name || user?.date_joined}`.toLowerCase().includes(searchTerm.toLowerCase()),
  //   );
  //   const sorted = [...base].sort((a, b) => {
  //     const chatA = recentChats.find((c) => c.recipient_id === a.id);
  //     const chatB = recentChats.find((c) => c.recipient_id === b.id);
  //     const timeA = chatA?.last_message_timestamp ? new Date(chatA.last_message_timestamp).getTime() : 0;
  //     const timeB = chatB?.last_message_timestamp ? new Date(chatB.last_message_timestamp).getTime() : 0;
  //     return timeB - timeA;
  //   });
  //   setFilteredUsers(sorted);
  // }, [searchTerm, users, recentChats]);

  //search by name and date
  useEffect(() => {
    const base = users.filter((conv) => {
      const user = conv.other_user;

      const firstName = user.first_name || "";
      const lastName = user.last_name || "";

      // Convert join date to multiple searchable formats
      let joinedDate = "";
      if (user.date_joined) {
        const date = new Date(user.date_joined);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");

        // Multiple formats to make search more flexible
        joinedDate = `${yyyy}-${mm}-${dd} ${dd}-${mm}-${yyyy} ${dd}/${mm}/${yyyy}`;
      }

      // Combine all searchable fields
      const fullText = `${firstName} ${lastName} ${joinedDate}`.toLowerCase();

      return fullText.includes(searchTerm.toLowerCase());
    });

    const sorted = [...base].sort((a, b) => {
      const chatA = recentChats.find((c) => c.recipient_id === a.other_user?.id);
      const chatB = recentChats.find((c) => c.recipient_id === b.other_user?.id);
      const timeA = chatA?.last_message_timestamp
        ? new Date(chatA.last_message_timestamp).getTime()
        : 0;
      const timeB = chatB?.last_message_timestamp
        ? new Date(chatB.last_message_timestamp).getTime()
        : 0;
      return timeB - timeA;
    });

    setFilteredUsers(sorted);
  }, [searchTerm, users, recentChats]);

  // Load messages when active user changes
  useEffect(() => {
    if (!activeUser || !TOKEN) return;

    // Derive the two participant IDs from the conversation object.
    // conversation_id is "senderId_recipientId" (e.g. "30_55").
    // Fall back to ME_ID + activeUser.id for the normal (non-admin) case.
    const activeConv = users.find((u) => u.other_user?.id === activeUser.id);
    let userId1 = ME_ID;
    let userId2 = activeUser.id;

    if (activeConv?.conversation_id) {
      const parts = String(activeConv.conversation_id).split("_").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        [userId1, userId2] = parts;
      }
    }

    if (isNaN(userId1) || isNaN(userId2)) return;

    let isCancelled = false;
    let intervalId = null;

    const fetchMessages = async () => {
      try {
        messageSkipRef.current = 0;
        const serverMessages = await getDirectMessages(userId1, userId2, 0, PAGE_LIMIT);
        if (isCancelled) return;

        setHasMore(serverMessages.length === PAGE_LIMIT);
        messageSkipRef.current = serverMessages.length;

        let processed = [...serverMessages];

        // ✅ 1. fix my sent messages read state
        let lastReadId = null;

        for (let i = processed.length - 1; i >= 0; i--) {
          const msg = processed[i];
          if (msg.sender_id === ME_ID && msg.read === true) {
            lastReadId = msg.id;
            break;
          }
        }

        if (lastReadId !== null) {
          processed = processed.map((msg) =>
            msg.sender_id === ME_ID && msg.id <= lastReadId
              ? { ...msg, read: true }
              : msg,
          );
        }

        // ✅ 2. find last opponent read message index
        let lastOpponentReadIndex = -1;

        for (let i = processed.length - 1; i >= 0; i--) {
          const msg = processed[i];
          if (msg.sender_id !== ME_ID && msg.read === true) {
            lastOpponentReadIndex = i;
            break;
          }
        }

        // ✅ 3. insert unread divider only if opponent has unread msgs after it
        if (lastOpponentReadIndex !== -1) {
          const hasUnreadOpponentAfter = processed
            .slice(lastOpponentReadIndex + 1)
            .some(
              (msg) =>
                msg.sender_id !== ME_ID &&
                msg.type === "message" &&
                msg.read === false,
            );

          if (hasUnreadOpponentAfter) {
            processed.splice(lastOpponentReadIndex + 1, 0, {
              type: "unread_divider",
              id: "unread-divider",
            });
          }
        }

        // ✅ 4. set final messages — split at divider for first-load UX
        const dividerIndex = processed.findIndex((m) => m.id === "unread-divider");
        if (dividerIndex > 0) {
          // Show only from divider onwards; hide older messages
          setHiddenMessages(processed.slice(0, dividerIndex));
          setHasHidden(true);
          setMessages(processed.slice(dividerIndex));
        } else {
          setHiddenMessages([]);
          setHasHidden(false);
          setMessages(processed);
        }

        // ✅ 5. mark latest opponent message as read on server
        const opponentMsgs = serverMessages.filter(
          (msg) => msg.sender_id !== ME_ID,
        );

        if (
          opponentMsgs.length > 0 &&
          opponentMsgs[opponentMsgs.length - 1].type === "message" &&
          opponentMsgs[opponentMsgs.length - 1].read === false
        ) {
          markMessageAsRead(opponentMsgs[opponentMsgs.length - 1].id);
          chatService.markAllRead(activeUser.id);
        }
      } catch (err) {
        if (!isCancelled) console.error(err);
      }
    };

    fetchMessages();

    return () => {
      isCancelled = true;
      if (intervalId) clearInterval(intervalId);
      setHiddenMessages([]);
      setHasHidden(false);
    };
  }, [activeUser, ME_ID, TOKEN]);

  const prependHidden = useCallback(() => {
    if (!hasHidden) return;
    setMessages((prev) => [...hiddenMessages, ...prev]);
    setHiddenMessages([]);
    setHasHidden(false);
  }, [hasHidden, hiddenMessages]);

  const loadMoreMessages = useCallback(async () => {
    if (!activeUser || !ME_ID || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const newer = await getDirectMessages(ME_ID, activeUser.id, messageSkipRef.current, PAGE_LIMIT);
      if (newer.length === 0) {
        setHasMore(false);
        return;
      }
      messageSkipRef.current += newer.length;
      setHasMore(newer.length === PAGE_LIMIT);
      // Append newer messages at the bottom
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = newer.filter((m) => !existingIds.has(m.id));
        return [...prev, ...fresh];
      });
    } catch (err) {
      console.error("[DirectChat] loadMoreMessages error:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeUser, ME_ID, isLoadingMore, hasMore]);

  const selectUser = useCallback((userId, conversationId = null) => {
    setActiveUserId(userId);
    setActiveConversationId(conversationId);
  }, []);
  const handleTyping = useCallback(() => {
    if (!activeUser || !ME_ID) return;

    // Send typing started
    const typingData = {
      type: "typing",
      sender_id: ME_ID,
      recipient_id: activeUser.id,
      status: "started",
    };
    chatService.sendMessage(typingData);

    // Clear existing timeout
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);

    // Send typing stopped after 2 seconds
    typingDebounceRef.current = setTimeout(() => {
      const stopTypingData = {
        type: "typing",
        sender_id: ME_ID,
        recipient_id: activeUser.id,
        status: "stopped",
      };
      chatService.sendMessage(stopTypingData);
    }, 2000);
  }, [activeUser, ME_ID]);

  const handleFileChange = useCallback((file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      toast.error(
        "Only JPEG, PNG, GIF, PDF, DOC, and DOCX files are supported.",
      );
      return;
    }
    setIsFileUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result || "").toString().split(",")[1];
      setAttachment({
        content_type: file.type,
        filename: file.name,
        data: `data:${file.type};base64,${base64}`, // ✅ FIXED
        size: file.size, // optional but useful
        name: file.name, // for consistency
      });
      setIsFileUploading(false);
    };
    reader.onerror = () => {
      setIsFileUploading(false);
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  }, []);

  const forwardMessage = useCallback((messageId, recipientId) => {
    if (!messageId || !recipientId) {
      console.error("Invalid forward params");
      return;
    }

    chatService.sendMessage({
      type: "forward_message",
      message_id: messageId,
      recipient_id: recipientId,
      is_reply: false,
    });
  }, []);

  const forwardMessageToGroup = useCallback((message, targetGroupId) => {
    if (!message || !targetGroupId) {
      console.error("Invalid forward to group params");
      return;
    }

    // Import GroupChatService dynamically to avoid circular dependencies
    import("../../../Services/GroupChatService").then(({ default: groupChatService }) => {
      const isReply = message.type === "message_reply" || message.reply_content;
      
      if (isReply) {
        const payload = {
          type: "forward_reply",
          source_reply_id: message.id,
          target_group_id: targetGroupId,
          is_reply: false,
          original_message_id: null,
          parent_reply_id: null,
        };
        console.log("[Forward] DM reply → Group payload:", JSON.stringify(payload, null, 2));
        groupChatService.sendMessage(payload);
      } else {
        const payload = {
          type: "forward_message",
          source_message_id: message.id,
          target_group_id: targetGroupId,
        };
        console.log("[Forward] DM message → Group payload:", JSON.stringify(payload, null, 2));
        groupChatService.sendMessage(payload);
      }
    });
  }, []);

  const sendMessage = useCallback(
    (text) => {
      const incomingText = (text || "").trim();
      const content =
        editingMessageId || editingReply
          ? (editContent || "").trim()
          : incomingText;
      if (
        !content &&
        !attachment &&
        !editingMessageId &&
        !editingReply &&
        !replyToMessage
      ) {
        return;
      }
      if (!activeUser) {
        toast.error("No active user selected.");
        return;
      }

      if (editingMessageId) {
        // Find the message to determine if it's a reply or regular message
        const messageToEdit = messages.find((m) => m.id === editingMessageId);
        
        if (messageToEdit) {
          if (messageToEdit.type === "message_reply" || messageToEdit.reply_content) {
            // It's a reply, send edit_reply
            chatService.sendMessage({
              type: "edit_reply",
              reply_id: editingMessageId,
              reply_content: content,
              updated_at: new Date().toISOString(),
            });
          } else {
            // It's a regular message, send edit_message
            chatService.sendMessage({
              type: "edit_message",
              message_id: editingMessageId,
              content,
              updated_at: new Date().toISOString(),
            });
          }
        }

        setEditingMessageId(null);
        setEditContent("");
        setReplyToMessage(null);
        setEditingReply(null);

        return;
      }

      let payload; // Keep only one declaration
      let actualReplyToMessage = replyToMessage;

      if (
        replyToMessage &&
        replyToMessage.id !== undefined &&
        replyToMessage.id !== null
      ) {
        // Added checks for undefined/null
        // If replying to a temporary message, try to find its real ID
        if (
          typeof replyToMessage.id === "string" &&
          replyToMessage.id.startsWith("temp-")
        ) {
          const realMessage = messages.find(
            (msg) =>
              msg.content === replyToMessage.content &&
              msg.timestamp === replyToMessage.timestamp &&
              (typeof msg.id === "string" ? !msg.id.startsWith("temp-") : true),
          );
          if (realMessage) {
            actualReplyToMessage = realMessage;
          } else {
            // If real message not found and replyToMessage still has a temporary ID, prevent sending the reply.
            toast.error(
              "Cannot reply to an unsent message. Please wait for the original message to be delivered.",
            );
            console.error(
              "[sendMessage] Attempted to reply to an unsent message with temporary ID:",
              replyToMessage.id,
            );
            return; // Abort sending the message
          }
        }

        //bhai chnage korlm
        payload = {
          type: "message_reply",
          message_id:
            actualReplyToMessage.type == "message_reply"
              ? actualReplyToMessage.message_id
              : actualReplyToMessage.id,
          parent_reply_id:
            actualReplyToMessage.type === "message_reply"
              ? actualReplyToMessage.id
              : null,
          reply_content: content,
        };
        // payload = {
        //   type: "message_reply",
        //   message_id: actualReplyToMessage.id,
        //   reply_content: content,
        // };
      } else {
        payload = attachment
          ? {
              type: "message_with_attachment",
              sender_id: ME_ID,
              recipient_id: activeUser.id,
              content: content || "",
              attachment: {
                filename: attachment.filename,
                content: attachment.data.split(",")[1], // raw base64, no data URI prefix
              },
            }
          : {
              type: "message",
              sender_id: ME_ID,
              recipient_id: activeUser.id,
              content: content || "",
            };
      }

      if (chatService.sendMessage(payload)) {
        setRecentChats((prev) => {
          const next = [...prev];
          const idx = next.findIndex((c) => c.recipient_id === activeUser.id);
          const updated = {
            recipient_id: activeUser.id,
            last_message:
              content || (attachment ? `📎 ${attachment.filename}` : ""),
            last_message_timestamp: new Date().toISOString(),
            unread_count: 0,
          };
          if (idx >= 0) next[idx] = { ...next[idx], ...updated };
          else next.push(updated);
          return next;
        });

        setAttachment(null);
        setReplyToMessage(null); // Use the custom setter
        setEditingReply(null);
        setEditingMessageId(null);
        setEditContent("");
      } else {
        toast.error("Failed to send message");
        // If sending fails, remove the optimistically added message/reply
        if (replyToMessage) {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === actualReplyToMessage.id
                ? {
                    ...msg,
                    replies_mentions: (msg.replies_mentions || []).filter(
                      (reply) => !reply.tempId,
                    ),
                  }
                : msg,
            ),
          );
        } else {
          setMessages((prev) => prev.filter((m) => !m.id.startsWith("temp-")));
        }
      }
    },
    [
      attachment,
      activeUser,
      ME_ID,
      editingMessageId,
      editingReply,
      replyToMessage,
      editContent,
      messages,
      setReplyToMessage,
    ],
  );

  const startEditing = useCallback((message) => {
    setEditingMessageId(message.id);
    // For attachment messages, only edit the text caption — not the "File: filename" content
    const isAttachment = !!message.attachment;
    const caption = isAttachment
      ? (message.content?.startsWith("File:") ? "" : message.content || "")
      : (message.content || message.reply_content || "");
    setEditContent(caption);
    setReplyingTo(null);
    setEditingReply(null);
  }, []);

  const startEditingReply = useCallback((reply, originalMessageId) => {
    setEditingReply({ id: reply.id, original_message_id: originalMessageId });
    setEditContent(reply.reply_content);
    setReplyingTo(null);
    setEditingMessageId(null);
  }, []);

  const handleReply = useCallback(
    (message) => {
      // Prevent replying to messages that have temporary IDs
      if (typeof message.id === "string" && message.id.startsWith("temp-")) {
        toast.error(
          "Cannot reply to an unsent message. Please wait for the message to be delivered.",
        );
        return;
      }
      setReplyingTo(message);
      setEditingReply(null);
      setEditingMessageId(null);
      setReplyToMessage(message); // Persist replyToMessage
    },
    [setReplyToMessage],
  );

  const cancelReply = useCallback(() => {
    setReplyingTo(null);
    setEditingReply(null);
    setEditingMessageId(null);
    setEditContent("");
    setAttachment(null);
    setReplyToMessage(null); // Clear persisted replyToMessage
  }, [setReplyToMessage]);

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setEditContent("");
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedMessages.length === 0 || !activeUser) return;

    const messagesToDelete = selectedMessages.filter((messageId) =>
      messages.find((m) => m.id === messageId && m.sender_id === ME_ID),
    );

    if (messagesToDelete.length === 0) {
      toast.error(
        "No messages selected or you can only delete your own messages.",
      );
      setIsSelectionMode(false);
      setSelectedMessages([]);
      return;
    }

    axios
      .post(
        `${API_BASE_URL}/messaging/messages/bulk-delete`,
        { message_ids: messagesToDelete },
        { headers: { Authorization: `Bearer ${TOKEN}` } },
      )
      .then(() => {
        // Remove deleted messages from state
        setMessages((prev) =>
          prev.filter((m) => !messagesToDelete.includes(m.id)),
        );
        setSelectedMessages([]);
        setIsSelectionMode(false);
        toast.success("Selected messages deleted successfully.");

        // Refresh the message list to ensure consistency
        getDirectMessages(ME_ID, activeUser.id)
          .then((updated) => {
            setMessages(
              updated
                .map((msg) => ({
                  ...msg,
                  delivered: !!msg.delivered,
                  read: !!msg.read,
                }))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
            );
          })
          .catch(() => {
            toast.error("Failed to refresh messages.");
          });
      })
      .catch((error) => {
        console.error("Failed to delete messages:", error);
        toast.error("Failed to delete messages.");
      });
  }, [selectedMessages, messages, activeUser, ME_ID, TOKEN]);

  //bhaii delete message

  const deleteMessage = useCallback(
    (messageId) => {
      if (!messageId) return;

      // Find the message to determine if it's a reply or regular message
      const messageToDelete = messages.find((m) => m.id === messageId);
      
      if (messageToDelete) {
        if (deleteType === "delete_reply" || messageToDelete.type === "message_reply" || messageToDelete.reply_content) {
          chatService.sendMessage({ type: "delete_reply", reply_id: messageId });
        } else {
          chatService.sendMessage({ type: "delete_message", message_id: messageId });
        }
      }

      setDeleteType("");
    },
    [deleteType, messages],
  );

  // const deleteMessage = useCallback(
  //   (messageId) => {
  //     const deleteData = deleteType !== "delete_reply" ? {
  //       type: "delete_message",
  //       message_id: messageId,
  //     } : {
  //       type: "delete_reply",
  //       reply_id: messageId
  //     };

  //

  //     setMessages((prevMessages) =>
  //       prevMessages.filter((msg) => msg.id !== messageId)
  //     );
  //     if (chatService.sendMessage(deleteData)) {

  //       setDeleteType("")
  //       setMessages((prev) => prev.filter((m) => m.id !== messageId));
  //     }
  //   },
  //   [deleteType],
  // );

  const deleteReply = useCallback((replyId) => {
    const deleteData = { type: "delete_reply", reply_id: replyId };
    if (chatService.sendMessage(deleteData)) {
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          if (
            msg.replies_mentions &&
            msg.replies_mentions.some((reply) => reply.id === replyId)
          ) {
            return {
              ...msg,
              replies_mentions: msg.replies_mentions.map((reply) =>
                reply.id === replyId
                  ? { ...reply, reply_content: "Reply deleted" }
                  : reply,
              ),
            };
          }
          return msg;
        });
        return updatedMessages;
      });
    }
  }, []);

  const markMessageAsRead = useCallback((messageId) => {
    if (!messageId) {
      return;
    }
    const payload = {
      type: "update_status",
      message_id: messageId,
      status: "read",
    };
    chatService.sendMessage(payload);
  }, []);

  const value = useMemo(
    () => ({
      // state
      users,
      allUsers,
      activeUserIDs,
      filteredUsers,
      forwardMessage,
      searchTerm,
      recentChats,
      totalUnreadCount,
      activeUser,
      activeUserId,
      messages,
      connectionStatus,
      selectedMessages,
      isSelectionMode,
      replyToMessage,
      editingMessageId,
      editContent,
      attachment,
      isFileUploading,
      typingUsers,
      ME_ID,

      // ✅ message search
      messageSearchTerm,
      setMessageSearchTerm,
      searchResults,
      isSearchingMessages,
      searchMessages,

      // actions
      setSearchTerm,
      selectUser,
      loadMoreMessages,
      hasMore,
      isLoadingMore,
      prependHidden,
      hasHidden,
      setSelectedMessages,
      setIsSelectionMode,
      setReplyToMessage,
      setEditContent,
      setAttachment,
      handleFileChange,
      handleTyping,
      sendMessage,
      startEditing,
      startEditingReply,
      handleReply,
      cancelReply,
      cancelEditing,
      replyingTo,
      editingReply,
      deleteSelected,
      deleteMessage,
      deleteReply,
      markMessageAsRead,
      setDeleteType,
      forwardMessageToGroup,
    }),
    [
      users,
      activeUserIDs,
      allUsers,
      forwardMessage,
      forwardMessageToGroup,
      filteredUsers,
      searchTerm,
      recentChats,
      totalUnreadCount,
      activeUser,
      activeUserId,
      messages,
      connectionStatus,
      selectedMessages,
      isSelectionMode,
      replyToMessage,
      editingMessageId,
      editContent,
      attachment,
      isFileUploading,
      typingUsers,
      ME_ID,

      // ✅ add these
      messageSearchTerm,
      searchResults,
      isSearchingMessages,
      searchMessages,

      setSearchTerm,
      selectUser,
      loadMoreMessages,
      hasMore,
      isLoadingMore,
      prependHidden,
      hasHidden,
      setSelectedMessages,
      setIsSelectionMode,
      setReplyToMessage,
      setEditContent,
      setAttachment,
      handleFileChange,
      handleTyping,
      sendMessage,
      startEditing,
      startEditingReply,
      handleReply,
      cancelReply,
      cancelEditing,
      replyingTo,
      editingReply,
      deleteSelected,
      deleteMessage,
      deleteReply,
      markMessageAsRead,
      setDeleteType,
    ],
  );

  return (
    <DirectChatContext.Provider value={value}>
      {children}
    </DirectChatContext.Provider>
  );
}

export default DirectChatProvider;
