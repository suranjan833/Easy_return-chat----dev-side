import "bootstrap-icons/font/bootstrap-icons.css";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Form } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom"; // Import useNavigate and useLocation
import { toast } from "react-toastify";
import AttachmentDisplay from "../../components/custom/Attachment/AttachmentDisplay";
import AttachmentInputPreview from "../../components/custom/Attachment/AttachmentInputPreview";
import DeleteConfirmationModal from "../../components/custom/DeleteConfirmationModal";
import ReplyEditIndicator from "../../components/custom/ReplyEditIndicator/ReplyEditIndicator"; // Import the new component
import {
  AttechmentSizeLimit,
  isOnlyEmojis,
  renderMessageWithLinks,
} from "../../pages/comman/helper";
import { getGroupMessages, getGroups } from "../../Services/api.js";
import groupChatService from "../../Services/GroupChatService";
import chatService from "../../Services/ChatService";
import "./GroupChatPopup.css";
import MessageInfoModal from "../../components/custom/MessageInfoModal";
import ForwardMessageModal from "../../pages/app/chat/modals/ForwardMessageModal";

const GroupChatPopup = ({
  group,
  onClose,
  onMaximize,
  userId: propUserId,
  token,
  initialPosition,
  index,
}) => {
  const userId = parseInt(propUserId); // Ensure userId is always an integer

  const [messages, setMessages] = useState([]);
  const [showAllMembers, setShowAllMembers] = useState(false); // State for showing all members in the header
  const [showMembersDropdown, setShowMembersDropdown] = useState(false); // New state for dropdown visibility
  const [showScrollToBottomButton, setShowScrollToBottomButton] =
    useState(false); // State for scroll to bottom button
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false); // State for scroll to top button
  const [messageText, setMessageText] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [typingUsers, setTypingUsers] = useState([]);
  const [editMessageId, setEditMessageId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingReply, setEditingReply] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    messageId: null,
    messageType: null,
    content: null,
  });
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [showDropdownForMessageId, setShowDropdownForMessageId] =
    useState(null); // New state for message dropdown
  const [messageInfoModal, setMessageInfoModal] = useState({
    isOpen: false,
    message: null,
  }); // State for Message Info Modal
  const [forwardModal, setForwardModal] = useState({
    show: false,
    message: null,
  });
  const [forwardSearch, setForwardSearch] = useState("");
  const [allGroups, setAllGroups] = useState([]);

  const [messagesAreaPaddingBottom, setMessagesAreaPaddingBottom] =
    useState(88); // Default for input area only
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [initialUnreadId, setInitialUnreadId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchElementsRef = useRef([]);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const unreadDividerRef = useRef(null);
  const chatWindowRef = useRef(null);
  const fileInputRef = useRef(null);
  const contentEditableRef = useRef(null); // New ref for contentEditable div
  const messageDropdownRefs = useRef({}); // Ref for individual message dropdowns
  const emojiPickerRef = useRef(null);
  const [position, setPosition] = useState(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const navigate = useNavigate(); // Initialize useNavigate

  const location = useLocation(); // Initialize useLocation
  const firstUnreadMessageRef = useRef(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const pendingMentionsRef = useRef([]); // Ref to track pending mentions
  // Ref to store message elements for navigation

  // Helper function to apply styling to mentions
  const renderStyledMessage = (text, members) => {
    if (!text) return "";
    let styledText = text;
    // Sort members by length descending to match longer names first
    const sortedMembers = [...(members || [])].sort(
      (a, b) =>
        `${b.first_name} ${b.last_name}`.length -
        `${a.first_name} ${a.last_name}`.length,
    );

    sortedMembers.forEach((member) => {
      const fullName = `${member.first_name} ${member.last_name}`;
      // Use a regex to find mentions and replace them with styled spans
      // Ensure it matches whole words to avoid partial matches
      const regex = new RegExp(
        `@${fullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        "g",
      );
      styledText = styledText.replace(
        regex,
        `<span style="color: #007bff;">@${fullName}</span>`,
      );
    });
    return styledText;
  };

  // Effect to update contentEditable div and preserve cursor
  useEffect(() => {
    const inputDiv = contentEditableRef.current;
    if (!inputDiv) return;

    // Save current selection
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    let savedCaretPosition = 0;

    if (range && inputDiv.contains(range.commonAncestorContainer)) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(inputDiv);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      savedCaretPosition = preCaretRange.toString().length;
    }

    // Update innerHTML with styled text
    const newHtml = renderStyledMessage(messageText, group.group_members);
    if (inputDiv.innerHTML !== newHtml) {
      inputDiv.innerHTML = newHtml;
    }

    // Restore selection: always place cursor at the end for simplicity and reliability
    const newRange = document.createRange();
    const sel = window.getSelection();
    newRange.selectNodeContents(inputDiv);
    newRange.collapse(false); // Collapse to the end
    sel.removeAllRanges();
    sel.addRange(newRange);
  }, [messageText, group.group_members]); // Re-run when messageText or group members change

  // Effect to update messages area padding based on input/reply/edit state
  useEffect(() => {
    let newPadding = 88; // Base for input area (padding: 16px + contentEditable min-height: 40px + contentEditable padding: 8px*2)
    if (replyingTo || editMessageId || editingReply) {
      newPadding += 34; // Add height for reply/edit indicator (padding: 8px*2 + border: 1px*2 + line-height: ~16px)
    }
    setMessagesAreaPaddingBottom(newPadding);
  }, [replyingTo, editMessageId, editingReply]);

  // Handle drag start
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = chatWindowRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Handle drag movement
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const newX = Math.max(
      0,
      Math.min(window.innerWidth - 300, e.clientX - dragOffset.current.x),
    );
    const newY = Math.max(
      0,
      Math.min(window.innerHeight - 480, e.clientY - dragOffset.current.y),
    );
    setPosition({ x: newX, y: newY });
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

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

  // Emoji handling
  const handleEmojiClick = (emojiObject) => {
    setMessageText((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollToBottomButton(false); // Hide button when scrolled to bottom
  };

  const scrollToTop = () => {
    const messagesArea = chatWindowRef.current.querySelector(
      ".group-chat-messages",
    );
    if (messagesArea) {
      messagesArea.scrollTo({ top: 0, behavior: "smooth" });
      setShowScrollToTopButton(false); // Hide button when scrolled to top
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight, scrollToBottom } = e.target;
    // Show scroll to bottom button if not at the very bottom (with a small tolerance)
    if (scrollHeight - scrollTop > clientHeight + 100) {
      // 100px tolerance
      setShowScrollToBottomButton(true);
    } else {
      setShowScrollToBottomButton(false);
    }

    // Show scroll to top button if not at the very top (with a small tolerance)
    if (scrollTop == 100) {
      // 100px tolerance
      setShowScrollToTopButton(true);
    } else {
      setShowScrollToTopButton(false);
    }
  };

  // Drag and drop handlers for file upload
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      handleFileChange(file);
    });
  };

  const sortMessages = (messages) => {
    return messages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  };

  const allMessages = useMemo(() => {
    return [...messages]
      .map((item) => {
        const isReply =
          item.type === "reply" || item.type === "group_message_reply";

        return {
          ...item,
          messageType: isReply ? "reply" : "message",

          parentMessageId: item.parent_reply_id || item.original_message_id,

          parentMessageContent:
            item.parentMsg?.reply_message ||
            item.parentMsg?.content ||
            item.parentMsg?.message ||
            item.original_message_content ||
            "",

          parentMessageSender: item.parentMsg?.sender
            ? `${item.parentMsg.sender.first_name || ""} ${item.parentMsg.sender.last_name || ""}`.trim()
            : item.parentMsg?.user
              ? `${item.parentMsg.user.first_name || ""} ${item.parentMsg.user.last_name || ""}`.trim()
              : "User",
        };
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
  }, [messages]);

  // Detect first unread message on initial load, scroll to it
  useEffect(() => {
    if (!initialLoadComplete || initialUnreadId || allMessages.length === 0)
      return;

    const firstUnread = allMessages.find((item) => {
      const isMe =
        item.messageType === "reply"
          ? item?.user?.id === userId
          : item.sender_id === userId;
      return !isMe && !item.is_read;
    });

    if (firstUnread) {
      setInitialUnreadId(firstUnread.id);
      // Defer scroll to let React render the divider first
      const timer = setTimeout(() => {
        if (unreadDividerRef.current) {
          unreadDividerRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        } else {
          scrollToBottom();
        }
      }, 120);
      return () => clearTimeout(timer);
    } else {
      // Instant scroll to bottom when no unread messages
      const messagesArea = chatWindowRef.current?.querySelector(
        ".group-chat-messages",
      );
      if (messagesArea) {
        messagesArea.scrollTop = messagesArea.scrollHeight;
      }
    }
  }, [initialLoadComplete, allMessages, userId]);

  // Clear initialUnreadId when that message becomes read
  useEffect(() => {
    if (!initialUnreadId) return;

    const item = allMessages.find((m) => m.id === initialUnreadId);
    if (item) {
      const isMe =
        item.messageType === "reply"
          ? item?.user?.id === userId
          : item.sender_id === userId;
      if (isMe || item.is_read) {
        setInitialUnreadId(null);
      }
    }
  }, [allMessages, initialUnreadId, userId]);

  // Subscribe to GroupChatService events
  useEffect(() => {
    if (!group || !groupChatService.isInitialized()) return;

    // Mark this group as active (open) to prevent unread count increments
    groupChatService.setGroupActive(group.id);

    const handleNewMessage = (data) => {
      if (data.groupId !== group.id) return;

      const newMsg = {
        id: Number(data.message.id),
        group_id: Number(data.message.group_id),
        content: data.message.message || data.message.content || "",
        attachment: data.message.attachment || null,
        created_at: data.message.created_at || new Date().toISOString(),
        updated_at: data.message.updated_at || new Date().toISOString(),
        user: {
          id: parseInt(data.message.sender_id),
          first_name:
            data.message.sender?.first_name ||
            data.message.user?.first_name ||
            "User",
          last_name:
            data.message.sender?.last_name ||
            data.message.user?.last_name ||
            "",
        },
        sender_id: Number(data.message.sender_id),
        is_read: data.message.is_read || false, // Add is_read property
        read: data.message.read || false, // Add read property
        read_at: data.message.read_at || null, // Add read_at property
      };

      setMessages((prev) => {
        if (prev.some((msg) => msg.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at),
        );
      });
      scrollToBottom();

      // Check for pending mentions for this message
      if (newMsg.sender_id === userId) {
        const pendingIndex = pendingMentionsRef.current.findIndex(
          (pm) => pm.content === newMsg.content,
        );

        if (pendingIndex !== -1) {
          const pendingItem = pendingMentionsRef.current[pendingIndex];
          // Send mention events
          pendingItem.mentions.forEach((mentionedUser) => {
            const mentionPayload = {
              type: "mention",
              message_id: newMsg.id,
              mentioned_user_id: mentionedUser.id,
              mention_message: newMsg.content,
              group_id: group.id, // Include group_id as per schema in image (though not in BaseInput, it's in the example payload)
            };
            groupChatService.sendMessage(mentionPayload);
          });
          // Remove from pending
          pendingMentionsRef.current.splice(pendingIndex, 1);
        }
      }
    };

    const handleMessageEdit = (data) => {
      if (data.groupId !== group.id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? {
                ...m,
                content: data.newContent,
                updated_at: data.updatedAt || new Date().toISOString(),
              }
            : m,
        ),
      );
    };

    const handleMessageDelete = (data) => {
      if (data.groupId !== group.id) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, content: "Message deleted", attachment: null }
            : m,
        ),
      );
    };
    const handleMessageReply = (data) => {
      const replyData = data.reply || data;

      const replyGroupId = replyData.group_id || replyData.groupId;

      if (Number(replyGroupId) !== Number(group.id)) return;

      const replySender =
        group.group_members.find(
          (member) =>
            Number(member.id) ===
            Number(replyData.user_id || replyData.sender_id),
        ) || replyData.sender;

      const parentId =
        replyData.parent_reply_id || replyData.original_message_id;

      const parentMsg =
        replyData.parentMsg ||
        messages.find((m) => Number(m.id) === Number(parentId)) ||
        null;

      const newReply = {
        ...replyData,

        type: "group_message_reply",

        // IMPORTANT
        reply_message:
          replyData.reply_message ||
          replyData.content ||
          replyData.message ||
          "",

        content:
          replyData.content ||
          replyData.reply_message ||
          replyData.message ||
          "",

        parentMsg,

        user: {
          id: Number(
            replySender?.id || replyData.user_id || replyData.sender_id,
          ),
          first_name:
            replySender?.first_name ||
            replyData.user?.first_name ||
            replyData.sender?.first_name ||
            "Unknown",
          last_name:
            replySender?.last_name ||
            replyData.user?.last_name ||
            replyData.sender?.last_name ||
            "",
          profile_picture:
            replySender?.profile_picture ||
            replyData.sender?.profile_picture ||
            null,
        },

        sender_id: Number(
          replyData.sender_id || replyData.user_id || replySender?.id,
        ),

        is_read: replyData.is_read || false,
        read: replyData.read || false,
        read_at: replyData.read_at || null,
      };

      setMessages((prev) => {
        if (prev.some((m) => Number(m.id) === Number(newReply.id))) {
          return prev;
        }

        return [...prev, newReply].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      });

      scrollToBottom();
    };
    const handleReplyEdit = (data) => {
      if (!data?.reply) return;

      const editGroupId = data.groupId || data.reply?.group_id;
      if (editGroupId && Number(editGroupId) !== Number(group.id)) return;

      setMessages((prev) =>
        prev.map((msg) =>
          Number(msg.id) === Number(data.reply.id)
            ? {
                ...msg,
                reply_message: data.reply.reply_message,
                updated_at: data.reply.updated_at,
              }
            : msg,
        ),
      );
    };
    const handleReplyDelete = (data) => {
      const deleteGroupId = data.groupId || data.group_id;

      if (deleteGroupId && Number(deleteGroupId) !== Number(group.id)) {
        return;
      }

      const replyId = data.replyId || data.reply_id;

      setMessages((prev) =>
        prev.map((msg) =>
          Number(msg.id) === Number(replyId)
            ? {
                ...msg,
                reply_message: "Reply deleted",
                attachment: null,
              }
            : msg,
        ),
      );
    };

    const handleMention = (data) => {
      if (data.groupId && data.groupId !== group.id) return; // Optional check if groupId is present

      // Check if the current user is the one mentioned
      if (
        data.mentioned_user_id === userId ||
        (data.mentioned_user && data.mentioned_user.id === userId)
      ) {
        toast.info(
          data.notification_message || `You were mentioned in a group`,
        );
      }
    };

    const handleTyping = (data) => {
      if (data.groupId !== group.id) return;

      if (data.senderId !== userId && data.status === "started") {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === data.senderId)) return prev;
          return [
            ...prev,
            {
              id: data.senderId,
              name: data.user?.first_name || `User ${data.senderId}`,
            },
          ];
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.id !== data.senderId));
        }, 2000);
      } else if (data.status === "stopped") {
        setTypingUsers((prev) => prev.filter((u) => u.id !== data.senderId));
      }
    };

    const handleConnection = (data) => {
      setConnectionStatus(data.status);
      if (data.status === "connected") {
        setError(null);
        setTypingUsers([]);
        // Load initial messages when connected
        fetchInitialMessages();
      } else if (data.status === "disconnected") {
        setTypingUsers([]);
      }
    };

    // Handle server errors (e.g., "Message not found")
    const handleError = (data) => {
      if (!data) return;
      const errorMsg = data.message || data.error || "An error occurred";
      console.error("[GroupChatPopup] Server error:", errorMsg);
      toast.error(errorMsg);
    };

    // Handle read receipts for messages
    const handleGroupMessageRead = (data) => {
      if (data.group_id !== group.id) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.message_id) return m;
          return {
            ...m,
            is_read: true,
            read: true,
            read_at: data.read_at || m.read_at,
          };
        }),
      );
    };

    // Handle read receipts for replies
    const handleGroupReplyRead = (data) => {
      if (Number(data.group_id) !== Number(group.id)) return;

      const replyId = data.reply_id || data.replyId;

      setMessages((prev) =>
        prev.map((msg) =>
          Number(msg.id) === Number(replyId)
            ? {
                ...msg,
                is_read: true,
                read: true,
                read_at: data.read_at || msg.read_at,
              }
            : msg,
        ),
      );
    };

    // Subscribe to GroupChatService events
    groupChatService.subscribe("new_group_message", handleNewMessage);
    groupChatService.subscribe("group_message_edit", handleMessageEdit);
    groupChatService.subscribe("delete_group_message", handleMessageDelete);
    groupChatService.subscribe("group_message_reply", handleMessageReply);
    groupChatService.subscribe("group_reply_edit", handleReplyEdit);
    groupChatService.subscribe("delete_group_reply", handleReplyDelete);
    groupChatService.subscribe("group_mention", handleMention);
    groupChatService.subscribe("group_typing", handleTyping);
    groupChatService.subscribe("connection", handleConnection);
    groupChatService.subscribe("error", handleError);
    groupChatService.subscribe("group_message_read", handleGroupMessageRead);
    groupChatService.subscribe("group_reply_read", handleGroupReplyRead);

    // Set initial connection status
    setConnectionStatus(groupChatService.getConnectionStatus());

    return () => {
      // Mark group as inactive when component unmounts
      groupChatService.setGroupInactive(group.id);

      groupChatService.unsubscribe("new_group_message", handleNewMessage);
      groupChatService.unsubscribe("group_message_edit", handleMessageEdit);
      groupChatService.unsubscribe("delete_group_message", handleMessageDelete);
      groupChatService.unsubscribe("group_message_reply", handleMessageReply);
      groupChatService.unsubscribe("group_reply_edit", handleReplyEdit);
      groupChatService.unsubscribe("delete_group_reply", handleReplyDelete);
      groupChatService.unsubscribe("group_mention", handleMention);
      groupChatService.unsubscribe("group_typing", handleTyping);
      groupChatService.unsubscribe("connection", handleConnection);
      groupChatService.unsubscribe("error", handleError);
      groupChatService.unsubscribe(
        "group_message_read",
        handleGroupMessageRead,
      );
      groupChatService.unsubscribe("group_reply_read", handleGroupReplyRead);
    };
  }, [group, userId]);

  const fetchInitialMessages = async () => {
    setLoading(true);

    try {
      const backendMessages = await getGroupMessages(group.id);

      console.log(
        "GROUP API RESPONSE",
        JSON.parse(JSON.stringify(backendMessages)),
      );

      const sortedMessages = sortMessages(
        backendMessages.map((msg) => {
          const sender = msg.sender || msg.user || {};

          const parentId =
            msg.parent_reply_id || msg.original_message_id || null;

          const parentMessage =
            msg.parentMsg ||
            backendMessages.find((m) => Number(m.id) === Number(parentId)) ||
            null;

          return {
            ...msg,

            id: Number(msg.id),
            group_id: Number(msg.group_id),

            content: msg.message || msg.content || "",
            message: msg.message || msg.content || "",

            attachment: msg.attachment || null,

            created_at: msg.created_at,
            updated_at: msg.updated_at,

            sender_id: Number(msg.sender_id || sender.id || msg.user_id || 0),

            user: {
              id: Number(sender.id || msg.sender_id || msg.user_id || 0),
              first_name: sender.first_name || "Unknown",
              last_name: sender.last_name || "",
              email: sender.email || "",
              profile_picture: sender.profile_picture || "",
            },

            is_read: msg.is_read || false,
            read: msg.read || false,
            read_at: msg.read_at || null,

            // Reply fields
            type: msg.type || "message",

            original_message_id: msg.original_message_id || null,
            parent_reply_id: msg.parent_reply_id || null,

            // IMPORTANT
            parentMsg: parentMessage,

            reply_message:
              msg.reply_message || msg.message || msg.content || "",

            original_message_content:
              msg.original_message_content ||
              parentMessage?.reply_message ||
              parentMessage?.content ||
              parentMessage?.message ||
              null,
          };
        }),
      );

      setMessages(sortedMessages);

      setInitialLoadComplete(true);

      const unreadMessages = sortedMessages.filter(
        (msg) => msg.sender_id !== userId && !msg.is_read,
      );

      const markAll = () => {
        unreadMessages.forEach((msg) => {
          if (msg.type === "reply" || msg.type === "group_message_reply") {
            groupChatService.markReplyRead(group.id, msg.id);
          } else {
            groupChatService.markMessageRead(group.id, msg.id);
          }
        });
      };

      if (groupChatService.ws?.readyState === WebSocket.OPEN) {
        markAll();
      }
    } catch (err) {
      console.error("Error fetching group messages:", err);
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    // Allow sending if there's message text OR an attachment, and other conditions are met
    if ((!messageText.trim() && !attachment) || !token || !userId || !group.id)
      return;
    if (!groupChatService.isInitialized()) {
      setError("Not connected to chat server");
      return;
    }

    setSending(true);

    try {
      // Handle edit message
      if (editMessageId) {
        const msgId = parseInt(editMessageId);
        if (isNaN(msgId)) {
          console.error(
            "[GroupChatPopup] Invalid editMessageId:",
            editMessageId,
          );
          setSending(false);
          return;
        }
        const payload = {
          type: "edit_group_message",
          message_id: msgId,
          new_content: messageText,
        };

        if (groupChatService.sendMessage(payload)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editMessageId
                ? {
                    ...m,
                    content: messageText,
                    updated_at: new Date().toISOString(),
                  }
                : m,
            ),
          );
          setEditMessageId(null);
          setMessageText("");
          setAttachment(null);
          setAttachmentPreview(null);
        } else {
          setError("Failed to edit message");
        }
        setSending(false);
        return;
      }

      // Handle edit reply
      if (editingReply) {
        const editReplyId = parseInt(editingReply.id);
        if (isNaN(editReplyId)) {
          console.error(
            "[GroupChatPopup] Invalid editingReply.id:",
            editingReply.id,
          );
          setSending(false);
          return;
        }
        const payload = {
          type: "edit_group_reply",
          reply_id: editReplyId,
          reply_message: messageText,
        };

        if (groupChatService.sendMessage(payload)) {
          setMessages((prev) =>
            prev.map((msg) =>
              Number(msg.id) === Number(editingReply.id)
                ? {
                    ...msg,

                    reply_message: messageText,

                    updated_at: new Date().toISOString(),
                  }
                : msg,
            ),
          );

          setEditingReply(null);

          setMessageText("");

          setAttachment(null);

          setAttachmentPreview(null);
        } else {
          setError("Failed to edit reply");
        }
        setSending(false);
        return;
      }

      // Handle reply to message or reply-on-reply
      if (replyingTo) {
        const isReplyingToReply =
          replyingTo.messageType === "reply" ||
          replyingTo.type === "reply" ||
          replyingTo.type === "group_message_reply";

        const parentId = Number(replyingTo.id);
        if (isNaN(parentId)) {
          console.error(
            "[GroupChatPopup] Invalid parent ID:",
            replyingTo.id,
            "Cannot send reply",
          );
          setSending(false);
          return;
        }

        const payload = isReplyingToReply
          ? {
              type: "reply_on_reply",
              group_id: group.id,
              parent_reply_id: parentId,
              reply_content: messageText,
            }
          : {
              type: "group_message_reply",
              group_id: group.id,
              original_message_id: parentId,
              reply_message: messageText,
              parent_reply_id: null,
            };

        if (groupChatService.sendMessage(payload)) {
          setReplyingTo(null);
          setMessageText("");
          setAttachment(null);
          setAttachmentPreview(null);
          scrollToBottom();
        } else {
          setError("Failed to send reply");
        }
        setSending(false);
        return;
      }

      // Send new message
      const payload = {
        type: "message",
        group_id: group.id,
        sender_id: userId,
        content: messageText,
      };

      if (attachment) {
        payload.attachment = {
          base64: attachment.base64,
          name: attachment.name,
          type: attachment.type,
        };
      }

      if (groupChatService.sendMessage(payload)) {
        // Detect mentions and add to pending queue
        const mentionedUsers = [];
        if (group.group_members) {
          group.group_members.forEach((member) => {
            const fullName = `${member.first_name} ${member.last_name}`;
            // Check if the message contains the mention
            // We use the same logic as renderStyledMessage to be consistent
            if (messageText.includes(`@${fullName}`)) {
              mentionedUsers.push(member);
            }
          });
        }

        if (mentionedUsers.length > 0) {
          pendingMentionsRef.current.push({
            content: messageText,
            mentions: mentionedUsers,
          });
        }

        setMessageText("");
        setAttachment(null);
        setAttachmentPreview(null);
        scrollToBottom();
      } else {
        setError("Failed to send message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    } finally {
      setSending(false);
    }
  };
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        showDropdownForMessageId &&
        messageDropdownRefs.current[showDropdownForMessageId] &&
        !messageDropdownRefs.current[showDropdownForMessageId].contains(
          event.target,
        )
      ) {
        setShowDropdownForMessageId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showDropdownForMessageId]);
  // Load initial messages when component mounts
  useEffect(() => {
    if (groupChatService.isInitialized()) {
      fetchInitialMessages();
    }
  }, [group.id]);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      sendMessage(e);
    }
  };

  // Send typing indicators
  const sendTypingIndicator = (isTyping) => {
    if (groupChatService.isInitialized()) {
      groupChatService.sendTyping(group.id, isTyping ? "started" : "stopped");
    }
  };

  // Handler functions for edit, reply, and delete
  const startEditing = (message) => {
    setEditMessageId(message.id);
    setMessageText(message.content || "");
    setReplyingTo(null);
    setEditingReply(null);
  };

  const startEditingReply = (reply, originalMessageId) => {
    setEditingReply({ id: reply.id, original_message_id: originalMessageId });
    setMessageText(reply.reply_message);
    setReplyingTo(null);
    setEditMessageId(null);
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setEditingReply(null);
    setEditMessageId(null);
  };

  const handleForward = (message) => {
    setForwardModal({ show: true, message });
    // Lazy-fetch groups for the forward-to-group tab if not already fetched
    if (allGroups.length === 0) {
      getGroups()
        .then((data) => setAllGroups(data))
        .catch(() => {});
    }
  };

  const handleForwardToUser = useCallback((message, recipientId) => {
    if (!groupChatService.isInitialized()) return;

    const isReply =
      item.parent_reply_id !== undefined ||
      item.original_message_id !== undefined ||
      item.type === "group_message_reply";

    const payload = {
      type: "forward_to_dm",
      source_message_id: message.id,
      source_type: isReply ? "group_reply" : "group_message",
      recipient_id: recipientId,
    };

    chatService.sendMessage(payload);
    toast.success("Message forwarded to user");
    setForwardModal({ show: false, message: null });
    setForwardSearch("");
  }, []);

  const handleForwardToGroup = useCallback((message, targetGroupId) => {
    if (!groupChatService.isInitialized()) return;

    const isReply = message.messageType === "reply" || message.type === "reply";

    if (isReply) {
      const payload = {
        type: "forward_reply",
        source_reply_id: message.id,
        target_group_id: targetGroupId,
        is_reply: true,
        original_message_id: message.original_message_id || message.message_id,
        parent_reply_id: message.parent_reply_id || null,
      };
      groupChatService.sendMessage(payload);
    } else {
      const payload = {
        type: "forward_message",
        source_message_id: message.id,
        target_group_id: targetGroupId,
        source_type: "group_message",
      };
      groupChatService.sendMessage(payload);
    }

    toast.success("Message forwarded to group");
    setForwardModal({ show: false, message: null });
    setForwardSearch("");
  }, []);

  // Function to scroll to original message when clicking on reply context
  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);

    if (!element) {
      console.log("MESSAGE NOT FOUND", messageId);
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    element.style.backgroundColor = "rgba(255,193,7,0.3)";

    setTimeout(() => {
      element.style.backgroundColor = "";
    }, 2000);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setEditingReply(null);
    setEditMessageId(null);
    setMessageText("");
    setAttachment(null);
    setAttachmentPreview(null);
  };

  const deleteMessage = (messageId) => {
    if (isNaN(parseInt(messageId))) {
      console.error(
        "[GroupChatPopup] Invalid messageId for delete:",
        messageId,
      );
      return;
    }
    const messageToDelete = messages.find((m) => m.id === messageId);
    setDeleteModal({
      isOpen: true,
      messageId: messageId,
      messageType: "message",
      content: messageToDelete ? messageToDelete.content : "this message",
    });
  };

  const deleteReply = (replyId) => {
    const parsedReplyId = Number(replyId);

    if (isNaN(parsedReplyId)) {
      console.error("[GroupChatPopup] Invalid replyId:", replyId);
      return;
    }

    const replyToDelete = messages.find(
      (msg) =>
        Number(msg.id) === parsedReplyId &&
        (msg.type === "reply" || msg.type === "group_message_reply"),
    );

    setDeleteModal({
      isOpen: true,
      messageId: parsedReplyId,
      messageType: "reply",
      content: replyToDelete?.reply_message || "this reply",
    });
  };
  const confirmDelete = () => {
    if (!groupChatService.isInitialized()) return;

    const { messageId, messageType } = deleteModal;

    if (messageType === "message") {
      const delMsgId = parseInt(messageId);
      if (isNaN(delMsgId)) {
        console.error(
          "[GroupChatPopup] Invalid messageId for delete:",
          messageId,
        );
        return;
      }
      const payload = {
        type: "delete_group_message",
        message_id: delMsgId,
      };

      if (groupChatService.sendMessage(payload)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, content: "Message deleted", attachment: null }
              : m,
          ),
        );
        toast.success("Message deleted successfully");
      }
    } else if (messageType === "reply") {
      const delReplyId = parseInt(messageId);
      if (isNaN(delReplyId)) {
        console.error(
          "[GroupChatPopup] Invalid replyId for delete:",
          messageId,
        );
        return;
      }
      const payload = {
        type: "delete_group_reply",
        reply_id: delReplyId,
      };

      if (groupChatService.sendMessage(payload)) {
        setMessages((prev) =>
          prev.map((msg) =>
            Number(msg.id) === Number(messageId)
              ? {
                  ...msg,
                  reply_message: "Reply deleted",
                  attachment: null,
                }
              : msg,
          ),
        );

        toast.success("Reply deleted successfully");
      }
    }
    setDeleteModal({
      isOpen: false,
      messageId: null,
      messageType: null,
      content: null,
    });
  };

  const handleFileChange = (file) => {
    if (!file) return;

    // Check file size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      toast.error("File size exceeds 3MB limit.");
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
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error(
        "Invalid file type. Allowed: PNG, JPEG, JPG, PDF, DOC, DOCX, XLS, XLSX",
      );
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
        setAttachmentPreview({
          type: "pdf",
          name: file.name,
          url: reader.result,
        });
      } else if (
        file.type === "application/vnd.ms-excel" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        setAttachmentPreview({
          type: "excel",
          name: file.name,
          url: reader.result,
        });
      } else {
        setAttachmentPreview({
          type: "doc",
          name: file.name,
          url: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
  };

  // Helper function to copy attachment to clipboard
  const copyAttachmentToClipboard = (attachment) => {
    if (attachment?.base64 && attachment?.type) {
      try {
        const base64Data = `data:${attachment.type};base64,${attachment.base64}`;
        fetch(base64Data)
          .then((res) => res.blob())
          .then((blob) => {
            const filesData = [
              new ClipboardItem({
                [attachment.type]: blob,
              }),
            ];
            navigator.clipboard.write(filesData).then(() => {
              toast.success(`${attachment.name} copied to clipboard!`);
            });
          })
          .catch(() => {
            toast.error("Failed to copy file to clipboard");
          });
      } catch (err) {
        console.error("Error copying to clipboard:", err);
        toast.error("Failed to copy file");
      }
    }
  };

  // Helper function to copy link to clipboard
  const copyLinkToClipboard = (link) => {
    try {
      navigator.clipboard.writeText(link).then(() => {
        toast.success("Link copied to clipboard!");
      });
    } catch (err) {
      console.error("Error copying link:", err);
      toast.error("Failed to copy link");
    }
  };

  // Helper function to download attachment
  const downloadAttachment = (attachment) => {
    if (attachment?.base64 && attachment?.name) {
      try {
        const base64Data = `data:${attachment.type};base64,${attachment.base64}`;
        const link = document.createElement("a");
        link.href = base64Data;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${attachment.name} downloaded!`);
      } catch (err) {
        console.error("Error downloading file:", err);
        toast.error("Failed to download file");
      }
    }
  };

  // Debounced typing indicator
  useEffect(() => {
    if (!messageText.trim()) {
      sendTypingIndicator(false);
      return;
    }

    const timer = setTimeout(() => {
      sendTypingIndicator(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      sendTypingIndicator(false);
    };
  }, [messageText]);

  // ── Search functions ──
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setCurrentMatchIndex(0);

    document.querySelectorAll(".chat-search-highlight").forEach((h) => {
      h.classList.remove("chat-search-highlight");
    });

    if (!query) {
      matchElementsRef.current = [];
      return;
    }

    const container = chatWindowRef.current?.querySelector(
      ".group-chat-messages",
    );
    if (!container) return;
    const messageEls = container.querySelectorAll('[id^="msg-"]');
    const matches = Array.from(messageEls).filter((el) =>
      el.textContent.toLowerCase().includes(query),
    );
    matchElementsRef.current = matches;

    if (matches.length > 0) {
      matches[0].scrollIntoView({ behavior: "smooth", block: "center" });
      highlightMatch(matches[0]);
    }
  };

  const navigateSearch = (direction) => {
    const matches = matchElementsRef.current;
    if (matches.length === 0) return;

    let newIndex;
    if (direction === "up") {
      newIndex =
        currentMatchIndex <= 0 ? matches.length - 1 : currentMatchIndex - 1;
    } else {
      newIndex =
        currentMatchIndex >= matches.length - 1 ? 0 : currentMatchIndex + 1;
    }

    setCurrentMatchIndex(newIndex);
    matches[newIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    highlightMatch(matches[newIndex]);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateSearch(e.shiftKey ? "up" : "down");
    }
    if (e.key === "Escape") {
      setShowSearch(false);
      setSearchQuery("");
      matchElementsRef.current = [];
    }
  };

  const highlightMatch = (el) => {
    document.querySelectorAll(".chat-search-highlight").forEach((h) => {
      h.classList.remove("chat-search-highlight");
    });
    if (el) {
      el.classList.add("chat-search-highlight");
    }
  };

  // Group members as forward user candidates (exclude self)
  const groupMemberForwardUsers = useMemo(() => {
    return (group.group_members || [])
      .filter((m) => m.id !== userId)
      .map((m) => ({
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name || "",
        profile_picture: m.profile_picture || "",
      }));
  }, [group.group_members, userId]);

  const filteredForwardUsers = useMemo(() => {
    if (!forwardSearch) return groupMemberForwardUsers;
    return groupMemberForwardUsers.filter((u) =>
      `${u.first_name} ${u.last_name}`
        .toLowerCase()
        .includes(forwardSearch.toLowerCase()),
    );
  }, [groupMemberForwardUsers, forwardSearch]);

  // Click outside search bar to close
  useEffect(() => {
    if (!showSearch) return;

    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        // Don't close if clicking the search toggle button
        const toggle = chatWindowRef.current?.querySelector(
          '[title="Search messages"]',
        );
        if (toggle && toggle.contains(event.target)) return;
        setShowSearch(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  // Auto-focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <div
      ref={chatWindowRef}
      className="group-chat-popup"
      style={{
        left: position.x,
        top: position.y,
        zIndex: 1000 + index,
        width: "300px",
        height: "480px",
        backgroundColor: "#fff",
        border: "2px solid #e0e0e0",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        overflow: "visible", // FIX
        position: "relative",
        transition: "all 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        className="group-chat-header"
        style={{
          padding: "12px 16px",
          backgroundColor: "#007bff",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "move",
        }}
        onMouseDown={handleMouseDown}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {group.avatar_url ? (
            <img
              src={group.avatar_url}
              alt={group.name}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
              }}
            />
          ) : (
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#25d366",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {group.name ? group.name.slice(0, 2).toUpperCase() : "G"}
            </div>
          )}
          <span style={{ fontWeight: "600" }}>
            {group.name || "Group Chat"}
          </span>
          {group.group_members && group.group_members.length > 0 && (
            <span style={{ fontSize: "12px", opacity: 0.7, marginLeft: "8px" }}>
              (
              {group.group_members
                .slice(0, 3)
                .map((member) => `${member.first_name} ${member.last_name}`)
                .join(", ")}
              )
              {group.group_members.length > 3 && (
                <span
                  style={{
                    cursor: "pointer",
                    color: "#fff",
                    textDecoration: "underline",
                    marginLeft: "5px",
                  }}
                  onClick={() => setShowMembersDropdown(!showMembersDropdown)}
                >
                  {showMembersDropdown
                    ? "(hide members)"
                    : `+ ${group.group_members.length - 3} other(s)`}
                </span>
              )}
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  connectionStatus === "connected"
                    ? "#28a745"
                    : connectionStatus === "connecting"
                      ? "#ffc107"
                      : "#dc3545",
              }}
              title={connectionStatus}
            />
            <small style={{ fontSize: "10px", opacity: 0.8 }}>
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
            </small>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button
            onClick={() => {
              if (!showSearch) {
                setSearchQuery("");
                matchElementsRef.current = [];
                setCurrentMatchIndex(0);
              }
              setShowSearch((prev) => !prev);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "14px",
              cursor: "pointer",
              padding: "0",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
            title="Search messages"
          >
            <i className="bi bi-search" style={{ fontSize: "13px" }} />
          </button>
          <button
            onClick={() => onClose(group.id)}
            style={{
              background: "none",
              border: "none",
              color: "#fff",
              fontSize: "18px",
              cursor: "pointer",
              padding: "0",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      {showSearch && (
        <div className="group-chat-popup-search-bar" ref={searchRef}>
          <div className="group-chat-popup-search-input-wrap">
            <i className="bi bi-search group-chat-popup-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="group-chat-popup-search-input"
              placeholder="Search messages…"
              aria-label="Search messages"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <span className="group-chat-popup-search-count">
                {matchElementsRef.current.length > 0
                  ? `${currentMatchIndex + 1} of ${matchElementsRef.current.length}`
                  : "No matches"}
              </span>
            )}
          </div>
          {searchQuery && matchElementsRef.current.length > 0 && (
            <div className="group-chat-popup-search-nav">
              <button
                className="group-chat-popup-search-nav-btn"
                onClick={() => navigateSearch("up")}
                title="Previous match"
              >
                <i className="bi bi-chevron-up" />
              </button>
              <button
                className="group-chat-popup-search-nav-btn"
                onClick={() => navigateSearch("down")}
                title="Next match"
              >
                <i className="bi bi-chevron-down" />
              </button>
            </div>
          )}
          <button
            className="group-chat-popup-search-close"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery("");
              matchElementsRef.current = [];
            }}
            title="Close search"
          >
            <i className="bi bi-x" />
          </button>
        </div>
      )}

      {/* Members Dropdown */}
      {showMembersDropdown &&
        group.group_members &&
        group.group_members.length > 3 && (
          <div
            style={{
              position: "absolute",
              top: "60px", // Adjust based on header height
              left: "16px",
              backgroundColor: "#fff",
              border: "1px solid #dee2e6",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 1001 + index,
              padding: "10px",
              maxHeight: "200px",
              overflowY: "auto",
              overflowX: "visible",
              width: "calc(100% - 32px)", // Full width minus padding
            }}
          >
            <h6
              style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#333" }}
            >
              All Group Members:
            </h6>
            <ul style={{ listStyle: "none", padding: "0", margin: "0" }}>
              {group.group_members.map((member) => (
                <li
                  key={member.id}
                  style={{ padding: "4px 0", fontSize: "13px", color: "#555" }}
                >
                  {member.first_name} {member.last_name}
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Messages Area */}
      <div
        className="group-chat-messages"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: `16px 16px ${messagesAreaPaddingBottom}px 16px`, // Dynamic padding-bottom
          backgroundColor: "#f8f9fa",
          position: "relative", // Added for positioning the scroll button
        }}
        onScroll={handleScroll}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDraggingFiles && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 123, 255, 0.1)",
              border: "2px dashed #007bff",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                textAlign: "center",
                color: "#007bff",
                fontWeight: "600",
                fontSize: "16px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>📁</div>
              <div>Drop files to upload</div>
            </div>
          </div>
        )}
        {loading || connectionStatus === "connecting" ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div
              style={{ marginTop: "10px", color: "#6c757d", fontSize: "14px" }}
            >
              {connectionStatus === "connecting"
                ? "Connecting to chat..."
                : "Loading messages..."}
            </div>
          </div>
        ) : error ? (
          <div
            style={{ textAlign: "center", color: "#dc3545", padding: "20px" }}
          >
            <div style={{ marginBottom: "10px" }}>{error}</div>
          </div>
        ) : allMessages.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}
          >
            No messages yet. Start the conversation!
          </div>
        ) : (
          allMessages.map((item, i) => {
            const isReply = item.messageType === "reply";
            const isMe = isReply
              ? item?.user.id === userId
              : item.sender_id === userId;
            const isFirstUnread =
              !isMe &&
              !item.is_read &&
              allMessages.slice(0, i).every((m) => {
                const mIsMe =
                  m.messageType === "reply"
                    ? m.user_id === userId
                    : m.sender_id === userId;
                return mIsMe || m.is_read;
              });

            // Skip deleted messages

            return (
              <React.Fragment key={`${item.messageType}-${item.id}`}>
                {/* Unread divider — shown before the first unread message */}
                {isFirstUnread && initialUnreadId && (
                  <div
                    ref={unreadDividerRef}
                    className="group-chat-unread-divider"
                  >
                    <div className="group-chat-unread-divider-line" />
                    <span className="group-chat-unread-divider-text">
                      Unread messages
                    </span>
                    <div className="group-chat-unread-divider-line" />
                  </div>
                )}
                <div
                  id={`message-${item.id}`}
                  className={`group-chat-message-item ${
                    i === 0 ? "group-chat-message-item-first" : ""
                  }`}
                  ref={(el) => {
                    if (isFirstUnread) {
                      firstUnreadMessageRef.current = el;
                    }
                  }}
                  style={{
                    marginBottom: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMe ? "flex-end" : "flex-start",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  {/* User info header */}
                  <div
                    className={`group-chat-message-meta ${
                      isMe ? "group-chat-message-meta-me" : ""
                    }`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                      flexDirection: isMe ? "row-reverse" : "row",
                    }}
                  >
                    {item.user?.profile_picture ? (
                      <img
                        src={item.user.profile_picture}
                        alt={`${item.user.first_name} ${item.user.last_name}`}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: isMe ? "#007bff" : "#6c757d",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      >
                        {item.user?.first_name
                          ? item.user.first_name.slice(0, 1).toUpperCase()
                          : "U"}
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: isMe ? "#007bff" : "#495057",
                      }}
                    >
                      {isMe
                        ? "You"
                        : `${item.user?.first_name || "Unknown"} ${item.user?.last_name || ""}`}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#6c757d",
                      }}
                    >
                      Delivered:{" "}
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                      {item.is_read && item.read && (
                        <span style={{ marginLeft: "8px" }}>
                          Read:{" "}
                          {formatDistanceToNow(
                            new Date(item.read_at || item.updated_at),
                            { addSuffix: true },
                          )}
                        </span>
                      )}
                      {item.updated_at &&
                        item.updated_at !== item.created_at &&
                        !(
                          item.is_read &&
                          item.read &&
                          new Date(item.updated_at).getTime() >
                            new Date(item.created_at).getTime() + 1000
                        ) &&
                        // <span style={{ marginLeft: "4px", fontStyle: "italic" }}>(edited)</span>
                        ""}
                    </span>
                    {item.tempId && (
                      <span style={{ fontSize: "11px", color: "#ffc107" }}>
                        Sending...
                      </span>
                    )}
                    {isMe && !isReply && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "11px",
                          color:
                            item.is_read && item.read ? "#28a745" : "#6c757d",
                        }}
                      >
                        {item.is_read && item.read ? (
                          <i className="bi bi-check-all"></i>
                        ) : item.is_read ? (
                          <i className="bi bi-check-all"></i>
                        ) : (
                          <i className="bi bi-check"></i>
                        )}
                      </span>
                    )}
                  </div>
                  {/* Message/Reply Container */}
                  <div
                    className={`group-chat-message-row ${
                      isMe ? "group-chat-message-row-me" : ""
                    }`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      width: "100%",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    {/* Message Actions (three-dot menu + reply + forward) */}
                    <div className="group-chat-message-actions">
                      {isMe && (
                        <>
                          <div
                            className="message-dropdown-wrapper"
                            ref={(el) => {
                              if (el) messageDropdownRefs.current[item.id] = el;
                            }}
                          >
                            <button
                              className="message-dropdown-toggle"
                              onClick={() =>
                                setShowDropdownForMessageId(
                                  showDropdownForMessageId === item.id
                                    ? null
                                    : item.id,
                                )
                              }
                            >
                              <i className="bi bi-three-dots-vertical"></i>
                            </button>
                            {showDropdownForMessageId === item.id && (
                              <div className="message-dropdown-menu">
                                <button
                                  onClick={() => {
                                    setMessageInfoModal({
                                      isOpen: true,
                                      message: item,
                                    });
                                    setShowDropdownForMessageId(null);
                                  }}
                                >
                                  <i className="bi bi-info-circle"></i>
                                  Info
                                </button>
                                <button
                                  onClick={() => {
                                    if (isReply) {
                                      startEditingReply(
                                        item,
                                        item.parentMessageId,
                                      );
                                    } else {
                                      startEditing(item);
                                    }
                                    setShowDropdownForMessageId(null);
                                  }}
                                >
                                  <i className="bi bi-pencil"></i>
                                  Edit
                                </button>
                                <div className="dropdown-divider" />
                                <button
                                  className="dropdown-action-danger"
                                  onClick={() => {
                                    if (isReply) {
                                      deleteReply(item.id);
                                    } else {
                                      deleteMessage(item.id);
                                    }
                                    setShowDropdownForMessageId(null);
                                  }}
                                >
                                  <i className="bi bi-trash"></i>
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <button
                        className="message-reply-btn"
                        onClick={() => handleReply(item)}
                      >
                        <i className="bi bi-reply"></i>
                      </button>
                      <button
                        className="message-forward-btn"
                        onClick={() => handleForward(item)}
                      >
                        <i className="bi bi-forward"></i>
                      </button>
                    </div>

                    {/* Message/Reply Content Bubble */}
                    <div
                      className="group-chat-message-bubble"
                      style={{
                        backgroundColor: isMe ? "#007bff" : "#fff",
                        color: isMe ? "#fff" : "#212529",
                        padding: "10px 14px",
                        borderRadius: "18px",
                        maxWidth: "calc(100% - 56px)",
                        border: isMe ? "none" : "1px solid #dee2e6",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        position: "relative",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* For replies, show the "Replying to" context */}
                      {isReply && item.parentMessageContent && (
                        <div
                          onClick={() => scrollToMessage(item.parentMessageId)}
                          style={{
                            backgroundColor: "rgba(0,0,0,0.1)",
                            padding: "6px 8px",
                            borderRadius: "8px",
                            marginBottom: "8px",
                            fontSize: "11px",
                            borderLeft: "3px solid rgba(0,0,0,0.3)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(0,0,0,0.2)";
                            e.currentTarget.style.borderLeftColor =
                              "rgba(0,0,0,0.5)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(0,0,0,0.1)";
                            e.currentTarget.style.borderLeftColor =
                              "rgba(0,0,0,0.3)";
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              color: isMe ? "rgba(255,255,255,0.9)" : "#6576ff",
                              marginBottom: "2px",
                            }}
                          >
                            {item.parentMessageSender || "User"}
                          </div>
                          <div style={{ fontStyle: "italic", opacity: 0.85 }}>
                            {item.parentMessageContent}
                          </div>
                        </div>
                      )}

                      {/* Main content */}
                      {(() => {
                        const text = isReply
                          ? item.reply_message
                          : item.content;
                        const isDeleted =
                          (isReply && item.reply_message === "Reply deleted") ||
                          (!isReply && item.content === "Message deleted");

                        if (isDeleted) {
                          return (
                            <span
                              style={{
                                fontSize: "12px",
                                fontStyle: "italic",
                                color: isMe ? "rgba(255,255,255,0.6)" : "#aaa",
                              }}
                            >
                              {isMe
                                ? "You deleted this message"
                                : "Message deleted"}
                            </span>
                          );
                        }

                        const isEmojiOnly =
                          !isReply && !item.attachment && isOnlyEmojis(text);
                        return (
                          <span
                            className="group-chat-message-text"
                            style={{
                              fontSize: isEmojiOnly ? "40px" : "inherit",
                              lineHeight: isEmojiOnly ? "1.2" : "inherit",
                              display: "inline-block",
                            }}
                          >
                            {isEmojiOnly ? text : renderMessageWithLinks(text)}
                          </span>
                        );
                      })()}

                      {!isReply && item.attachment && (
                        <AttachmentDisplay
                          attachment={item.attachment}
                          isMe={isMe}
                          message={item}
                        />
                      )}
                    </div>

                    {/* Reply button is now in actions above */}
                  </div>{" "}
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div
            style={{ padding: "8px 12px", color: "#6c757d", fontSize: "12px" }}
          >
            {typingUsers.map((user) => user.name).join(", ")}{" "}
            {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply/Edit Indicator */}
      <ReplyEditIndicator
        replyingTo={replyingTo}
        editMessageId={editMessageId}
        editingReply={editingReply}
        cancelReply={cancelReply}
      />

      <AttachmentInputPreview
        selectedFile={attachment}
        filePreview={attachmentPreview?.url}
        onRemove={removeAttachment}
      />
      <div
        style={{
          position: "absolute",
          bottom: messagesAreaPaddingBottom + 20,
          right: "2rem",
        }}
      >
        {showScrollToBottomButton && (
          <Button
            variant="primary"
            className="rounded-circle"
            onClick={scrollToBottom}
            style={{
              position: "sticky",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              zIndex: 100,
            }}
          >
            <i className="bi bi-arrow-down"></i>
          </Button>
        )}

        {/* Scroll to Top Button */}
        {showScrollToTopButton && (
          <Button
            variant="primary"
            className="rounded-circle"
            onClick={scrollToTop}
            style={{
              position: "sticky",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              zIndex: 100,
            }}
          >
            <i className="bi bi-arrow-up"></i>
          </Button>
        )}
      </div>
      {/* Input Area */}
      <div
        className="group-chat-input"
        style={{
          padding: "16px",
          backgroundColor: "#fff",
          borderTop:
            replyingTo || editMessageId || editingReply
              ? "none"
              : "1px solid #dee2e6",
          position: "relative", // Added relative positioning
        }}
      >
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          message={{
            content: deleteModal.content,
            type: deleteModal.messageType,
          }}
          onConfirm={confirmDelete}
          onCancel={() =>
            setDeleteModal({
              isOpen: false,
              messageId: null,
              messageType: null,
              content: null,
            })
          }
        />
        <Form onSubmit={sendMessage}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "flex-end",
              position: "relative",
            }}
          >
            {" "}
            {/* Changed alignItems to flex-end */}
            {/* Emoji Button - Outside on Left */}
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="bi bi-emoji-smile" style={{ fontSize: "24px" }}></i>
            </Button>
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
            <div style={{ flex: 1, position: "relative" }}>
              <div
                ref={contentEditableRef} // Attach the ref
                contentEditable="true"
                onInput={(e) => {
                  const val = e.currentTarget.innerText; // Get plain text
                  setMessageText(val);

                  // Check for @ mention
                  const atIndex = val.lastIndexOf("@");
                  if (atIndex !== -1) {
                    const query = val.slice(atIndex + 1);
                    setMentionQuery(query);
                    const suggestions = group.group_members?.filter((m) =>
                      `${m.first_name} ${m.last_name}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    );
                    setMentionSuggestions(suggestions);
                    setShowMentionDropdown(suggestions.length > 0);
                  } else {
                    setShowMentionDropdown(false);
                  }
                }}
                onKeyDown={handleKeyPress} // Use onKeyDown for Enter key handling
                placeholder={
                  editMessageId
                    ? "Edit your message..."
                    : editingReply
                      ? "Edit your reply..."
                      : replyingTo
                        ? "Type your reply..."
                        : "Type your message..."
                }
                disabled={sending || connectionStatus !== "connected"}
                style={{
                  width: "100%",
                  borderRadius: "20px",
                  border: "1px solid #dee2e6",
                  padding: "8px 12px", // Add padding to match Form.Control
                  minHeight: "40px", // Ensure it has a minimum height
                  outline: "none", // Remove default outline
                  whiteSpace: "pre-wrap", // Preserve whitespace and allow wrapping
                  wordBreak: "break-word", // Break long words
                }}
                // dangerouslySetInnerHTML will be replaced by manual DOM manipulation
              />

              {/* Mention Dropdown */}
              {showMentionDropdown && (
                <div
                  className="absolute bg-white border rounded shadow w-full max-h-40 overflow-y-auto z-50"
                  style={{
                    bottom: "calc(100% + 8px)",
                    left: "0",
                    width: "100%",
                  }}
                >
                  {mentionSuggestions.map((member) => (
                    <div
                      key={member.id}
                      className="p-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        const inputDiv = contentEditableRef.current;
                        if (!inputDiv) return;

                        const currentPlainMessage = inputDiv.innerText;
                        const atIndex = currentPlainMessage.lastIndexOf("@");
                        const mentionText = `@${member.first_name} ${member.last_name}`;
                        const newPlainMessageText =
                          currentPlainMessage.slice(0, atIndex) +
                          mentionText +
                          " ";

                        setMessageText(newPlainMessageText);
                        setShowMentionDropdown(false);

                        // The useEffect will handle updating the innerHTML and cursor position
                        // based on the new messageText state.
                      }}
                    >
                      {member.first_name} {member.last_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Attachment Button */}
            <Button
              type="button"
              variant="outline-secondary"
              onClick={() => fileInputRef.current?.click()}
              // disabled={sending || connectionStatus !== "connected"}
              style={{
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="bi bi-paperclip"></i>
            </Button>
            <Button
              type="submit"
              disabled={
                (!messageText.trim() && !attachment) ||
                sending ||
                connectionStatus !== "connected"
              }
              style={{
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {sending ? (
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Sending...</span>
                </div>
              ) : (
                <i className="bi bi-send"></i>
              )}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const validFile = AttechmentSizeLimit(file, e);
                if (!validFile) return;

                handleFileChange(file);
              }
              e.target.value = "";
            }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          />
        </Form>
      </div>

      <MessageInfoModal
        isOpen={messageInfoModal.isOpen}
        message={messageInfoModal.message}
        groupMembers={group.group_members}
        onClose={() => setMessageInfoModal({ isOpen: false, message: null })}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        show={forwardModal.show}
        onClose={() => {
          setForwardModal({ show: false, message: null });
          setForwardSearch("");
        }}
        forwardMessage={forwardModal.message}
        forwardSearch={forwardSearch}
        setForwardSearch={setForwardSearch}
        recentForwardUsers={[]}
        allForwardUsers={filteredForwardUsers}
        onForward={(messageId, recipientId) => {
          if (forwardModal.message) {
            handleForwardToUser(forwardModal.message, recipientId);
          }
        }}
        groups={allGroups.filter((g) => g.id !== group.id)}
        onForwardToGroup={(msg, groupId) => {
          handleForwardToGroup(msg, groupId);
        }}
        currentGroupId={group.id}
      />
    </div>
  );
};

export default GroupChatPopup;
