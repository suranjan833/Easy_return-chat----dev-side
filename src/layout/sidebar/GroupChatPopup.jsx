import "bootstrap-icons/font/bootstrap-icons.css";
import { formatDistanceToNow } from "date-fns";
import EmojiPicker from "emoji-picker-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate and useLocation
import { toast } from "react-toastify";
import AttachmentDisplay from "../../components/custom/Attachment/AttachmentDisplay";
import AttachmentInputPreview from "../../components/custom/Attachment/AttachmentInputPreview";
import DeleteConfirmationModal from "../../components/custom/DeleteConfirmationModal";
import ReplyEditIndicator from "../../components/custom/ReplyEditIndicator/ReplyEditIndicator"; // Import the new component
import { AttechmentSizeLimit, isOnlyEmojis } from "../../pages/comman/helper";
import { getGroupMessages } from "../../Services/api.js";
import groupChatService from "../../Services/GroupChatService";
import "./GroupChatPopup.css";
import MessageInfoModal from "./MessageInfoModal";


const GroupChatPopup = ({ group, onClose, userId: propUserId, token, initialPosition, index, isFixed = false }) => {
  const userId = parseInt(propUserId); // Ensure userId is always an integer

  const [messages, setMessages] = useState([]);
  const [showAllMembers, setShowAllMembers] = useState(false); // State for showing all members in the header
  const [showMembersDropdown, setShowMembersDropdown] = useState(false); // New state for dropdown visibility
  const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false); // State for scroll to bottom button
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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, messageId: null, messageType: null, content: null });
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [showDropdownForMessageId, setShowDropdownForMessageId] = useState(null); // New state for message dropdown
  const [messageInfoModal, setMessageInfoModal] = useState({ isOpen: false, message: null }); // State for Message Info Modal

  const [messagesAreaPaddingBottom, setMessagesAreaPaddingBottom] = useState(88); // Default for input area only
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
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
  const [hasScrolledToUnread, setHasScrolledToUnread] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const pendingMentionsRef = useRef([]); // Ref to track pending mentions
  const messageRefs = useRef({}); // Ref to store message elements for navigation

  // Helper function to apply styling to mentions
  const renderStyledMessage = (text, members) => {
    if (!text) return '';
    let styledText = text;
    // Sort members by length descending to match longer names first
    const sortedMembers = [...(members || [])].sort((a, b) =>
      `${b.first_name} ${b.last_name}`.length - `${a.first_name} ${a.last_name}`.length
    );

    sortedMembers.forEach(member => {
      const fullName = `${member.first_name} ${member.last_name}`;
      // Use a regex to find mentions and replace them with styled spans
      // Ensure it matches whole words to avoid partial matches
      const regex = new RegExp(`@${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      styledText = styledText.replace(regex, `<span style="color: #007bff;">@${fullName}</span>`);
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
    if (isFixed) return; // Disable dragging when fixed
    setIsDragging(true);
    const rect = chatWindowRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Handle drag movement
  const handleMouseMove = (e) => {
    if (!isDragging || isFixed) return;
    const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 400, e.clientY - dragOffset.current.y));
    setPosition({ x: newX, y: newY });
  };

  // Handle drag end
  const handleMouseUp = () => {
    if (isFixed) return;
    setIsDragging(false);
  };

  useEffect(() => {
    if (isFixed) return; // Don't add event listeners when fixed
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isFixed]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
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
    const messagesArea = chatWindowRef.current.querySelector('.group-chat-messages');
    if (messagesArea) {
      messagesArea.scrollTo({ top: 0, behavior: "smooth" });
      setShowScrollToTopButton(false); // Hide button when scrolled to top
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight, scrollToBottom } = e.target;
    // Show scroll to bottom button if not at the very bottom (with a small tolerance)
    if (scrollHeight - scrollTop > clientHeight + 100) { // 100px tolerance
      setShowScrollToBottomButton(true);
    } else {
      setShowScrollToBottomButton(false);
    }

    // Show scroll to top button if not at the very top (with a small tolerance)
    if (scrollTop == 100) { // 100px tolerance
      setShowScrollToTopButton(true);
    } else {
      setShowScrollToTopButton(false);
    }
  };

  useEffect(() => {
    if (initialLoadComplete && !hasScrolledToUnread) {
      if (firstUnreadMessageRef.current) {
        firstUnreadMessageRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setHasScrolledToUnread(true);
      } else if (messages.length > 0) {
        scrollToBottom();
        setHasScrolledToUnread(true);
      }
    }
  }, [messages, initialLoadComplete, hasScrolledToUnread]);

  const sortMessages = (messages) => {
    return messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  // Flatten messages and replies into a single chronological list (WhatsApp-like behavior)
  const allMessages = useMemo(() => {
    const flattened = [];

    messages.forEach((message) => {
      // Add the main message
      flattened.push({
        ...message,
        type: 'message',
        messageType: 'message'
      });

      // Add all replies as separate items
      if (message.replies_mentions && message.replies_mentions.length > 0) {
        message.replies_mentions.forEach((reply) => {
          flattened.push({
            ...reply,
            type: 'reply',
            messageType: 'reply',
            parentMessageId: message.id,
            parentMessageContent: message.content
          });
        });
      }
    });

    // Sort all items by created_at
    return flattened.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [messages]);


  // Subscribe to GroupChatService events
  useEffect(() => {
    if (!group || !groupChatService.isInitialized()) return;

    // Mark this group as active (open) to prevent unread count increments
    groupChatService.setGroupActive(group.id);

    const handleNewMessage = (data) => {
      if (data.groupId !== group.id) return;


      const newMsg = {
        id: data.message.id,
        group_id: data.message.group_id,
        content: data.message.content || "",
        attachment: data.message.attachment || null,
        created_at: data.message.created_at || new Date().toISOString(),
        updated_at: data.message.updated_at || new Date().toISOString(),
        user: {
          id: parseInt(data.message.sender_id),
          first_name: data.message.user?.first_name || "User",
          last_name: data.message.user?.last_name || "",
        },
        sender_id: parseInt(data.message.sender_id),
        is_read: data.message.is_read || false, // Add is_read property
        read: data.message.read || false, // Add read property
        read_at: data.message.read_at || null, // Add read_at property
      };

      setMessages((prev) => {
        if (prev.some((msg) => msg.id === newMsg.id)) {
          return prev;
        }
        return [...prev, newMsg].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
      scrollToBottom();

      // Check for pending mentions for this message
      if (newMsg.sender_id === userId) {
        const pendingIndex = pendingMentionsRef.current.findIndex(
          (pm) => pm.content === newMsg.content
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

      setMessages((prev) => prev.map((m) =>
        m.id === data.messageId
          ? { ...m, content: data.newContent, updated_at: data.updatedAt || new Date().toISOString() }
          : m
      ));
    };

    const handleMessageDelete = (data) => {
      if (data.groupId !== group.id) return;

      setMessages((prev) => prev.map((m) =>
        m.id === data.messageId
          ? { ...m, content: "Message deleted", attachment: null }
          : m
      ));
    };

    const handleMessageReply = (data) => {
      // if (data.groupId !== group.id) return; // Backend might not send groupId in reply payload, so we rely on finding the original message


      setMessages((prev) => {
        const newMessages = prev.map((msg) => {
          if (msg.id === data.reply.original_message_id) {

            const existingReplies = msg.replies_mentions || [];
            if (existingReplies.some(reply => reply.id === data.reply.id)) {
              return msg; // Avoid duplicate replies
            }
            const originalMessage = prev.find(m => m.id === data.reply.original_message_id);
            const replySender = group.group_members.find(member => member.id === parseInt(data.reply.user_id));
            const newReply = {
              id: data.reply.id,
              type: 'reply',
              created_at: data.reply.created_at,
              updated_at: data.reply.updated_at,
              user: parseInt(data.reply.user_id) === userId
                ? { id: userId, first_name: 'You', last_name: '', email: '', profile_picture: '' }
                : (replySender || {
                  id: data.reply.user?.id || parseInt(data.reply.user_id),
                  first_name: data.reply.user?.first_name || 'Unknown',
                  last_name: data.reply.user?.last_name || '',
                  email: data.reply.user?.email || '',
                  profile_picture: data.reply.user?.profile_picture || ''
                }),
              user_id: parseInt(data.reply.user_id),
              original_message_id: data.reply.original_message_id,
              original_message_content: originalMessage ? originalMessage.content : "Original message not found", // Add original message content
              reply_message: data.reply.reply_message,
            };
            // Check for temporary reply to replace
            const tempReplyIndex = existingReplies.findIndex(
              r => r.tempId &&
                r.user_id === parseInt(data.reply.user_id) &&
                r.reply_message === data.reply.reply_message
            );

            if (tempReplyIndex !== -1) {
              // Replace temporary reply with real one
              const updatedReplies = [...existingReplies];
              updatedReplies[tempReplyIndex] = newReply;
              return {
                ...msg,
                replies_mentions: updatedReplies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
              };
            }

            return {
              ...msg,
              replies_mentions: [...existingReplies, newReply].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
            };
          }
          return msg;
        });
        const updatedMessages = newMessages;
        return updatedMessages;
      });
      scrollToBottom();
    };

    const handleReplyEdit = (data) => {
      if (data.groupId !== group.id) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          if (msg.replies_mentions.some((reply) => reply.id === data.reply.id)) {
            return {
              ...msg,
              replies_mentions: msg.replies_mentions.map((reply) =>
                reply.id === data.reply.id
                  ? { ...reply, reply_message: data.reply.reply_message, updated_at: data.reply.updated_at }
                  : reply
              ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
            };
          }
          return msg;
        });
        return updatedMessages;
      });
    };

    const handleReplyDelete = (data) => {
      if (data.groupId !== group.id) return;

      setMessages((prev) => {
        const updatedMessages = prev.map((msg) => {
          if (msg.replies_mentions.some((reply) => reply.id === data.replyId)) {
            return {
              ...msg,
              replies_mentions: msg.replies_mentions.map((reply) =>
                reply.id === data.replyId
                  ? { ...reply, reply_message: 'Reply deleted', attachment: null }
                  : reply
              ),
            };
          }
          return msg;
        });
        return updatedMessages;
      });
    };

    const handleMention = (data) => {
      if (data.groupId && data.groupId !== group.id) return; // Optional check if groupId is present

      // Check if the current user is the one mentioned
      if (data.mentioned_user_id === userId || (data.mentioned_user && data.mentioned_user.id === userId)) {
        toast.info(data.notification_message || `You were mentioned in a group`);
      }
    };

    const handleTyping = (data) => {
      if (data.groupId !== group.id) return;

      if (data.senderId !== userId && data.status === "started") {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === data.senderId)) return prev;
          return [...prev, { id: data.senderId, name: data.user?.first_name || `User ${data.senderId}` }];
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

    // Subscribe to GroupChatService events
    groupChatService.subscribe("new_group_message", handleNewMessage);
    groupChatService.subscribe("group_message_edit", handleMessageEdit);
    groupChatService.subscribe("group_message_delete", handleMessageDelete);
    groupChatService.subscribe("group_message_reply", handleMessageReply);
    groupChatService.subscribe("group_reply_edit", handleReplyEdit);
    groupChatService.subscribe("group_reply_delete", handleReplyDelete);
    groupChatService.subscribe("group_mention", handleMention);
    groupChatService.subscribe("group_typing", handleTyping);
    groupChatService.subscribe("connection", handleConnection);

    // Set initial connection status
    setConnectionStatus(groupChatService.getConnectionStatus());

    return () => {
      // Mark group as inactive when component unmounts
      groupChatService.setGroupInactive(group.id);

      groupChatService.unsubscribe("new_group_message", handleNewMessage);
      groupChatService.unsubscribe("group_message_edit", handleMessageEdit);
      groupChatService.unsubscribe("group_message_delete", handleMessageDelete);
      groupChatService.unsubscribe("group_message_reply", handleMessageReply);
      groupChatService.unsubscribe("group_reply_edit", handleReplyEdit);
      groupChatService.unsubscribe("group_reply_delete", handleReplyDelete);
      groupChatService.unsubscribe("group_mention", handleMention);
      groupChatService.unsubscribe("group_typing", handleTyping);
      groupChatService.unsubscribe("connection", handleConnection);
    };
  }, [group, userId]);

  const fetchInitialMessages = async () => {
    setLoading(true);
    try {
      const backendMessages = await getGroupMessages(group.id);

      const sortedMessages = sortMessages(
        backendMessages.map((msg) => {

          const mappedMsg = {
            id: msg.id,
            group_id: msg.group_id,
            content: msg.message || "Empty message",
            attachment: msg.attachment || null,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
            user: msg.user || { id: msg.user?.id || 0, first_name: msg.user?.first_name || "Unknown", last_name: msg.user?.last_name || "", email: "", profile_picture: "" },
            sender_id: msg.user?.id || 0,
            is_read: msg.is_read || false, // Add is_read property
            read: msg.read || false, // Add read property
            read_at: msg.read_at || null, // Add read_at property
            replies_mentions: (msg.replies_mentions || []).map(reply => {
              const replySender = group.group_members.find(member => member.id === reply.user_id);

              return {
                ...reply,
                user_id: parseInt(reply.user_id), // Ensure user_id is an integer
                user: reply.user_id === userId
                  ? { id: userId, first_name: 'You', last_name: '', email: '', profile_picture: '' }
                  : (replySender || {
                    id: reply.user?.id || reply.user_id,
                    first_name: reply.user?.first_name || 'Unknown',
                    last_name: reply.user?.last_name || '',
                    email: reply.user?.email || '',
                    profile_picture: reply.user?.profile_picture || ''
                  }),
                original_message_content: backendMessages.find(m => m.id === reply.original_message_id)?.message || "Original message not found",
                reply_message: reply.reply_message || 'Reply deleted' // Ensure reply_message is set for deleted replies
              };
            }), // Include replies_mentions and original message content
          };

          return mappedMsg;
        })
      );
      setMessages(sortedMessages);
      setInitialLoadComplete(true);
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
    if ((!messageText.trim() && !attachment) || !token || !userId || !group.id) return;
    if (!groupChatService.isInitialized()) {
      setError("Not connected to chat server");
      return;
    }

    setSending(true);

    try {
      // Handle edit message
      if (editMessageId) {
        const payload = {
          type: "edit_group_message",
          message_id: parseInt(editMessageId),
          new_content: messageText
        };

        if (groupChatService.sendMessage(payload)) {
          setMessages((prev) => prev.map((m) =>
            m.id === editMessageId
              ? { ...m, content: messageText, updated_at: new Date().toISOString() }
              : m
          ));
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
        const payload = {
          type: "edit_group_reply",
          reply_id: parseInt(editingReply.id),
          reply_message: messageText
        };

        if (groupChatService.sendMessage(payload)) {
          setMessages((prev) => {
            const newMessages = prev.map((msg) => {
              if (msg.id === editingReply.original_message_id) {
                return {
                  ...msg,
                  replies_mentions: msg.replies_mentions.map((reply) =>
                    reply.id === editingReply.id
                      ? { ...reply, reply_message: messageText, updated_at: new Date().toISOString() }
                      : reply
                  ),
                };
              }
              return msg;
            });
            return newMessages;
          });
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

      // Handle reply to message
      if (replyingTo) {
        const payload = {
          type: "group_message_reply",
          original_message_id: parseInt(replyingTo.id),
          reply_message: messageText
          // group_id: group.id // Removed as per backend schema
        };

        if (groupChatService.sendMessage(payload)) {
          // Optimistically add the reply to the messages state
          const tempReplyId = `temp-${Date.now()}`; // Temporary ID for optimistic update
          const originalMessage = messages.find(m => m.id === replyingTo.id);
          const currentUser = group.group_members.find(member => member.id === userId);
          const newReply = {
            id: tempReplyId,
            type: 'reply',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user: currentUser ? {
              id: currentUser.id,
              first_name: currentUser.first_name,
              last_name: currentUser.last_name,
              email: currentUser.email,
              profile_picture: currentUser.profile_picture
            } : { id: userId, first_name: 'You', last_name: '', email: '', profile_picture: '' },
            user_id: userId,
            original_message_id: replyingTo.id,
            original_message_content: originalMessage ? originalMessage.content : "Original message not found", // Add original message content
            reply_message: messageText,
            tempId: true, // Mark as temporary
          };

          setMessages((prev) => {
            const updatedMessages = prev.map((msg) => {
              if (msg.id === replyingTo.id) {
                return {
                  ...msg,
                  replies_mentions: [...(msg.replies_mentions || []), newReply].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
                };
              }
              return msg;
            });
            return updatedMessages;
          });

          setReplyingTo(null);
          setMessageText("");
          setAttachment(null);
          setAttachmentPreview(null);
          scrollToBottom(); // Scroll to bottom after optimistic update
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
          group.group_members.forEach(member => {
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
            mentions: mentionedUsers
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

  // Load initial messages when component mounts
  useEffect(() => {
    if (groupChatService.isInitialized()) {
      fetchInitialMessages();
    }
  }, [group.id]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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


  const cancelReply = () => {
    setReplyingTo(null);
    setEditingReply(null);
    setEditMessageId(null);
    setMessageText("");
    setAttachment(null);
    setAttachmentPreview(null);
  };

  const deleteMessage = (messageId) => {
    const messageToDelete = messages.find(m => m.id === messageId);
    setDeleteModal({
      isOpen: true,
      messageId: messageId,
      messageType: 'message',
      content: messageToDelete ? messageToDelete.content : 'this message'
    });
  };

  const deleteReply = (replyId) => {
    // Find the reply in the messages
    let replyToDelete = null;
    messages.forEach(msg => {
      if (msg.replies_mentions) {
        const found = msg.replies_mentions.find(r => r.id === replyId);
        if (found) replyToDelete = found;
      }
    });

    setDeleteModal({
      isOpen: true,
      messageId: replyId,
      messageType: 'reply',
      content: replyToDelete ? replyToDelete.reply_message : 'this reply'
    });
  };

  const confirmDelete = () => {
    if (!groupChatService.isInitialized()) return;

    const { messageId, messageType } = deleteModal;

    if (messageType === 'message') {
      const payload = {
        type: "delete_group_message",
        message_id: parseInt(messageId)
      };

      if (groupChatService.sendMessage(payload)) {
        setMessages((prev) => prev.map((m) =>
          m.id === messageId
            ? { ...m, content: "Message deleted", attachment: null }
            : m
        ));
        toast.success("Message deleted successfully");
      }
    } else if (messageType === 'reply') {
      const payload = {
        type: "delete_group_reply",
        reply_id: parseInt(messageId)
      };

      if (groupChatService.sendMessage(payload)) {
        setMessages((prev) => {
          const newMessages = prev.map((msg) => {
            if (msg.replies_mentions.some((reply) => reply.id === parseInt(messageId))) {
              return {
                ...msg,
                replies_mentions: msg.replies_mentions.map((reply) =>
                  reply.id === parseInt(messageId)
                    ? { ...reply, reply_message: 'Reply deleted', attachment: null }
                    : reply
                ),
              };
            }
            return msg;
          });
          return newMessages;
        });
        toast.success("Reply deleted successfully");
      }
    }
    setDeleteModal({ isOpen: false, messageId: null, messageType: null, content: null });
  };

  const handleFileChange = (file) => {
    if (!file) return;

    // Check file size (3MB limit)
    if (file.size > 3 * 1024 * 1024) {
      toast.error('File size exceeds 3MB limit.');
      return;
    }

    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: PNG, JPEG, JPG, PDF, DOC, DOCX, XLS, XLSX');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({ base64: reader.result.split(",")[1], type: file.type, name: file.name });
      // Set preview
      if (file.type.startsWith('image/')) {
        setAttachmentPreview({ url: reader.result, type: 'image', name: file.name });
      } else if (file.type === 'application/pdf') {
        setAttachmentPreview({ type: 'pdf', name: file.name, url: reader.result });
      } else if (file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        setAttachmentPreview({ type: 'excel', name: file.name, url: reader.result });
      } else {
        setAttachmentPreview({ type: 'doc', name: file.name, url: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
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

  return (
    <div
      ref={chatWindowRef}
      className="group-chat-popup"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: 1000 + index,
        width: "500px",
        height: "600px",
        backgroundColor: "#fff",
        border: "2px solid #e0e0e0",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "all 0.3s ease"
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
          cursor: isFixed ? "default" : "move"
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
                borderRadius: "50%"
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
                fontWeight: "bold"
              }}
            >
              {group.name ? group.name.slice(0, 2).toUpperCase() : "G"}

            </div>
          )}
          <span style={{ fontWeight: "600" }}>{group.name || "Group Chat"}</span>
          {group.group_members && group.group_members.length > 0 && (
            <span style={{ fontSize: "12px", opacity: 0.7, marginLeft: "8px" }}>
              ({group.group_members.slice(0, 3).map(member => `${member.first_name} ${member.last_name}`).join(', ')})
              {group.group_members.length > 3 && (
                <span
                  style={{ cursor: 'pointer', color: '#fff', textDecoration: 'underline', marginLeft: '5px' }}
                  onClick={() => setShowMembersDropdown(!showMembersDropdown)}
                >
                  {showMembersDropdown ? '(hide members)' : `+ ${group.group_members.length - 3} other(s)`}
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
                backgroundColor: connectionStatus === "connected" ? "#28a745" :
                  connectionStatus === "connecting" ? "#ffc107" : "#dc3545"
              }}
              title={connectionStatus}
            />
            <small style={{ fontSize: "10px", opacity: 0.8 }}>
              {connectionStatus === "connected" ? "Connected" :
                connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
            </small>
          </div>
        </div>
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
            justifyContent: "center"
          }}
        >
          ×
        </button>
      </div>

      {/* Members Dropdown */}
      {showMembersDropdown && group.group_members && group.group_members.length > 3 && (
        <div
          style={{
            position: 'absolute',
            top: '60px', // Adjust based on header height
            left: '16px',
            backgroundColor: '#fff',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1001 + index,
            padding: '10px',
            maxHeight: '200px',
            overflowY: 'auto',
            width: 'calc(100% - 32px)', // Full width minus padding
          }}
        >
          <h6 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>All Group Members:</h6>
          <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
            {group.group_members.map(member => (
              <li key={member.id} style={{ padding: '4px 0', fontSize: '13px', color: '#555' }}>
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
      >
        {loading || connectionStatus === "connecting" ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <div style={{ marginTop: "10px", color: "#6c757d", fontSize: "14px" }}>
              {connectionStatus === "connecting" ? "Connecting to chat..." : "Loading messages..."}
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "#dc3545", padding: "20px" }}>
            <div style={{ marginBottom: "10px" }}>{error}</div>

          </div>
        ) : allMessages.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6c757d", padding: "20px" }}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          allMessages.map((item, i) => {

            const isReply = item.messageType === 'reply';
            const isMe = isReply ? item?.user.id === userId : item.sender_id === userId;
            const isFirstUnread = !isMe && !item.is_read &&
              allMessages.slice(0, i).every(m => {
                const mIsMe = m.messageType === 'reply' ? m.user_id === userId : m.sender_id === userId;
                return mIsMe || m.is_read;
              });

            // Skip deleted messages


            return (
              <div
                key={`${item.messageType}-${item.id}`}
                ref={(el) => {
                  if (el) {
                    // Store ref for both messages and replies
                    // For messages, use the message ID
                    // For replies, we still want to be able to scroll to them
                    if (!isReply) {
                      messageRefs.current[`message-${item.id}`] = el;
                    }
                  }
                  // Also set firstUnreadMessageRef if needed
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
                        borderRadius: "50%"
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
                        fontWeight: "bold"
                      }}
                    >
                      {item.user?.first_name ? item.user.first_name.slice(0, 1).toUpperCase() : "U"}
                    </div>
                  )}
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: isMe ? "#007bff" : "#495057"
                    }}
                  >
                    {isMe ? "You" : `${item.user?.first_name || 'Unknown'} ${item.user?.last_name || ""}`}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#6c757d"
                    }}
                  >
                    Delivered: {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    {item.is_read && item.read && (
                      <span style={{ marginLeft: "8px" }}>
                        Read: {formatDistanceToNow(new Date(item.read_at || item.updated_at), { addSuffix: true })}
                      </span>
                    )}

                    {item.updated_at && item.updated_at !== item.created_at && !(item.is_read && item.read && new Date(item.updated_at).getTime() > new Date(item.created_at).getTime() + 1000) && (
                      // <span style={{ marginLeft: "4px", fontStyle: "italic" }}>(edited)</span>
                      ''
                    )}
                  </span>
                  {item.tempId && (
                    <span style={{ fontSize: "11px", color: "#ffc107" }}>
                      Sending...
                    </span>
                  )}
                  {isMe && !isReply && (
                    <span style={{ marginLeft: "8px", fontSize: "11px", color: item.is_read && item.read ? "#28a745" : "#6c757d" }}>
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
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", width: "100%", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  {/* Reply Icon and Menu - for messages only */}
                  {isMe ? (
                    <div>

                      <div className="dropdown" ref={el => {
                        if (el) messageDropdownRefs.current[item.id] = el;
                      }}>
                        <Button
                          size="sm"
                          variant="border-0"
                          onClick={() => setShowDropdownForMessageId(showDropdownForMessageId === item.id ? null : item.id)}
                          style={{
                            padding: "4px 8px",
                            fontSize: "13px",
                            minWidth: "32px",
                            height: "32px"
                          }}
                        >
                          <i className="bi bi-three-dots-vertical"></i>
                        </Button>
                        {showDropdownForMessageId === item.id && (
                          <ul className="dropdown-menu show" style={{
                            position: "absolute",
                            top: "30px",
                            right: "0",
                            left: "auto",
                            margin: 0,
                            zIndex: 9999,
                          }}>
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMessageInfoModal({ isOpen: true, message: item });
                                  setShowDropdownForMessageId(null);
                                }}
                                style={{ fontSize: "12px", padding: "6px 12px" }}
                              >
                                <i className="bi bi-info-circle me-2"></i>Info
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  startEditing(item);
                                  setShowDropdownForMessageId(null);
                                }}
                                style={{ fontSize: "12px", padding: "6px 12px" }}
                              >
                                <i className="bi bi-pencil me-2"></i>Edit
                              </button>
                            </li>
                            <li>
                              <button
                                className="dropdown-item text-danger"
                                onClick={() => {
                                  deleteMessage(item.id);
                                  setShowDropdownForMessageId(null);
                                }}
                                style={{ fontSize: "12px", padding: "6px 12px" }}
                              >
                                <i className="bi bi-trash me-2"></i>Delete
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                      <Button
                        size="lg"
                        variant="border-0"
                        onClick={() => handleReply(item)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "15px",
                          minWidth: "32px",
                          height: "32px"
                        }}
                      >
                        <i className="bi bi-reply"></i>
                      </Button>
                    </div>
                  ) : null}

                  {/* Message/Reply Content Bubble */}
                  <div
                    style={{
                      backgroundColor: isMe ? "#007bff" : "#fff",
                      color: isMe ? "#fff" : "#212529",
                      padding: "10px 14px",
                      borderRadius: "18px",
                      maxWidth: "75%",
                      border: isMe ? "none" : "1px solid #dee2e6",
                      wordBreak: "break-word",
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
                          fontStyle: "italic",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.2)";
                          e.currentTarget.style.borderLeftColor = "rgba(0,0,0,0.5)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)";
                          e.currentTarget.style.borderLeftColor = "rgba(0,0,0,0.3)";
                        }}
                      >
                        <strong>Replying to:</strong> {item.parentMessageContent}
                      </div>
                    )}

                    {/* Main content */}
                    {(() => {
                      const text = isReply ? item.reply_message : item.content;
                      const isEmojiOnly = !isReply && !item.attachment && isOnlyEmojis(text);
                      return (
                        <span style={{ fontSize: isEmojiOnly ? "40px" : "inherit", lineHeight: isEmojiOnly ? "1.2" : "inherit", display: "inline-block" }}>
                          {text}
                        </span>
                      );
                    })()}

                    {!isReply && item.attachment && (
                      <AttachmentDisplay attachment={item.attachment} isMe={isMe} message={item} />
                    )}

                    {/* Edit/Delete buttons for replies */}
                    {item.reply_message !== "Reply deleted" && isReply && isMe && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => startEditingReply(item, item.parentMessageId)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            backgroundColor: "#ffffff",
                            color: "#333",
                            border: "1px solid rgba(0,0,0,0.1)",
                            borderRadius: "6px",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#f8f9fa";
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 3px 6px rgba(0,0,0,0.15)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#ffffff";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                          }}
                        >
                          <i className="bi bi-pencil" style={{ fontSize: "12px" }}></i>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => deleteReply(item.id)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            backgroundColor: "#ffffff",
                            color: "#dc3545",
                            border: "1px solid rgba(220, 53, 69, 0.2)",
                            borderRadius: "6px",
                            fontWeight: "500",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            transition: "all 0.2s"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#dc3545";
                            e.target.style.color = "#ffffff";
                            e.target.style.transform = "translateY(-1px)";
                            e.target.style.boxShadow = "0 3px 6px rgba(220, 53, 69, 0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#ffffff";
                            e.target.style.color = "#dc3545";
                            e.target.style.transform = "translateY(0)";
                            e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
                          }}
                        >
                          <i className="bi bi-trash" style={{ fontSize: "12px" }}></i>
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reply button for received messages */}
                  {!isReply && !isMe ? (
                    <div style={{ order: 2, marginRight: "8px" }}>
                      <Button
                        size="sm"
                        variant="border-0"
                        onClick={() => handleReply(item)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "15px",
                          minWidth: "32px",
                          height: "32px"
                        }}
                      >
                        <i className="bi bi-reply"></i>
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ padding: "8px 12px", color: "#6c757d", fontSize: "12px" }}>
            {typingUsers.map(user => user.name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
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
      <div style={{ position: "absolute", bottom: messagesAreaPaddingBottom + 20, right: "2rem" }}>
        {showScrollToBottomButton && (
          <Button
            variant="primary"
            className="rounded-circle"
            onClick={scrollToBottom}
            style={{
              position: 'sticky',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
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
              position: 'sticky',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
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
          borderTop: replyingTo || editMessageId || editingReply ? "none" : "1px solid #dee2e6",
          position: "relative" // Added relative positioning
        }}
      >
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          message={{ content: deleteModal.content, type: deleteModal.messageType }}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteModal({ isOpen: false, messageId: null, messageType: null, content: null })}
        />
        <Form onSubmit={sendMessage}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", position: "relative" }}> {/* Changed alignItems to flex-end */}
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
                flexShrink: 0
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
                    const suggestions = group.group_members
                      ?.filter((m) =>
                        `${m.first_name} ${m.last_name}`
                          .toLowerCase()
                          .includes(query.toLowerCase())
                      );
                    setMentionSuggestions(suggestions);
                    setShowMentionDropdown(suggestions.length > 0);
                  } else {
                    setShowMentionDropdown(false);
                  }
                }}
                onKeyDown={handleKeyPress} // Use onKeyDown for Enter key handling
                placeholder={
                  editMessageId ? "Edit your message..." :
                    editingReply ? "Edit your reply..." :
                      replyingTo ? "Type your reply..." :
                        "Type your message..."
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
                <div className="absolute bg-white border rounded shadow w-full max-h-40 overflow-y-auto z-50"
                  style={{ bottom: "calc(100% + 8px)", left: "0", width: "100%" }}>
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
                        const newPlainMessageText = currentPlainMessage.slice(0, atIndex) + mentionText + " ";

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
                justifyContent: "center"
              }}
            >
              <i className="bi bi-paperclip"></i>
            </Button>

            <Button
              type="submit"
              disabled={!messageText.trim() && !attachment || sending || connectionStatus !== "connected"}
              style={{
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
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

      {messageInfoModal.isOpen && <MessageInfoModal
        isOpen={messageInfoModal.isOpen}
        onClose={() => setMessageInfoModal({ isOpen: false, message: null })}
        message={messageInfoModal.message}
        group={group}
      />}
    </div>
  );
};

export default GroupChatPopup;
