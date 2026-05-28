import { Button, Icon, UserAvatar } from "@/components/Component";
import EmojiPicker from "emoji-picker-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import DeleteConfirmationModal from "../../../components/custom/DeleteConfirmationModal";
import GroupAttachmentPreview from "../../../components/custom/GroupAttachmentPreview";
import MessageInfoModal from "../../../components/custom/MessageInfoModal";
import ReplyPreview from "../../../components/custom/GroupChatPreview/ReplyPreview";
import { addGroupChatPopup } from "../../../redux/slices/chatPopupsSlice";
import { isOnlyEmojis } from "../../comman/helper";
import "./GroupChatBody.css";
import { GroupChatContext } from "./GroupChatContext";
import ForwardMessageModal from "../chat/modals/ForwardMessageModal";
import { DirectChatContext } from "../chat/DirectChatContext";
import { GroupMeChat, GroupYouChat, MetaChat } from "./GroupChatPartials";

const groupMessagesByDate = (list) => {
  const segments = [];
  let lastDate = null;
  list.forEach((m) => {
    const ts = m.created_at ? new Date(m.created_at) : new Date();
    const headerKey = ts.toDateString();
    if (headerKey !== lastDate) {
      lastDate = headerKey;
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      let label =
        ts.toDateString() === today.toDateString()
          ? "Today"
          : ts.toDateString() === yesterday.toDateString()
            ? "Yesterday"
            : ts.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
      segments.push({ meta: { metaText: label } });
    }
    segments.push(m);
  });
  return segments;
};

// export const linkifyText = (text = "") => {
//   if (!text || typeof text !== "string") return text;

//   // Improved URL regex that matches complete URLs properly
//   const urlRegex =
//     /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
//   const parts = [];
//   let lastIndex = 0;
//   let match;

//   // Create a new regex without the 'g' flag for testing
//   const testRegex = /^(?:https?:\/\/|www\.)/i;

//   // Reset regex for iteration
//   const regexForLoop =
//     /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

//   while ((match = regexForLoop.exec(text)) !== null) {
//     // Add text before the match
//     if (match.index > lastIndex) {
//       parts.push({
//         type: "text",
//         content: text.slice(lastIndex, match.index),
//       });
//     }

//     const url = match[0];

//     // Skip if it looks like a malformed URL (e.g., "https:///")
//     if (
//       !url ||
//       url === "https://" ||
//       url === "http://" ||
//       url.match(/^https?:\/\/\/$/) ||
//       url.match(/^[/:]+$/)
//     ) {
//       parts.push({
//         type: "text",
//         content: url,
//       });
//     } else {
//       // Build proper href
//       let href = url;
//       if (!url.match(testRegex)) {
//         href = `https://${url}`;
//       }

//       parts.push({
//         type: "link",
//         content: url,
//         href: href,
//       });
//     }

//     lastIndex = regexForLoop.lastIndex;
//   }

//   // Add remaining text
//   if (lastIndex < text.length) {
//     parts.push({
//       type: "text",
//       content: text.slice(lastIndex),
//     });
//   }

//   // If no URLs found, just return the text
//   if (parts.length === 0) {
//     return text;
//   }

//   return parts.map((part, index) => {
//     if (part.type === "text") {
//       return <React.Fragment key={index}>{part.content}</React.Fragment>;
//     }

//     return (
//       <a
//         key={index}
//         href={part.href}
//         target="_blank"
//         rel="noopener noreferrer"
//         style={{
//           color: "#1877f2",
//           textDecoration: "underline",
//           wordBreak: "break-word",
//           cursor: "pointer",
//         }}
//         title={part.href}
//       >
//         {part.content}
//       </a>
//     );
//   });
// };
export default function GroupChatBody() {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [mentionPosition, setMentionPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false); /* Added for emoji functionality */
  const emojiPickerRef = useRef(null); /* Added for emoji functionality */
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [messageInfoModal, setMessageInfoModal] = useState({
    isOpen: false,
    message: null,
  });
  const [forwardModal, setForwardModal] = useState({
    show: false,
    message: null,
  });
  const [forwardSearch, setForwardSearch] = useState("");
  const [initialUnreadId, setInitialUnreadId] = useState(null);

  // ── Search state ──
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchElementsRef = useRef([]);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } =
    useSelector((state) => state.chatPopups);

  const {
    activeGroup,
    selectGroup,
    messages,
    typingUsers,
    inputText,
    setInputText,
    handleTyping,
    handleFileChange,
    sendMessage,
    startEditing,
    startEditingReply,
    deleteMessage,
    deleteReply,
    handleReply,
    cancelReply,
    replyingTo,
    editingReply,
    editMessageId,
    deleteModal,
    setDeleteModal,
    attachmentPreview,
    setAttachmentPreview,
    groups,
    forwardMessageToGroup,
    forwardMessageToUser,
  } = useContext(GroupChatContext);

  const directChat = useContext(DirectChatContext);

  const handleMinimize = () => {
    if (openGroupChatPopups.some((p) => p.group.id === activeGroup.id)) {
      toast.warning("Chat is already open as a popup.");
      return;
    }
    const total =
      openChatPopups.length +
      openGroupChatPopups.length +
      openSupportChatPopups.length;
    if (total >= 4) {
      toast.error("Maximum of 4 chat windows can be open at a time.");
      return;
    }
    dispatch(addGroupChatPopup(activeGroup));
    selectGroup(null);
  };

  // Debug logging

  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const hasAutoScrolledToUnread = useRef(false);
  const hasPreventedBottomScrollAfterUnread = useRef(false);

  const currentUserId = Number(localStorage.getItem("userId")) || -1;
  //change korlm bhai
  // const isMessageReadByCurrentUser = (message) => {
  //   if (!message) return true;

  //   const senderId = Number(message.sender_id || message.user?.id || -1);
  //   if (senderId === currentUserId) return true;

  //   if (message.type === "reply" || message.type === "group_message_reply") {
  //     if (message.is_read || message.read_at) return true;
  //   }

  //   if (message.is_read) return true;

  //   const receipts = message.read_receipts || [];
  //   return receipts.some(
  //     (receipt) =>
  //       Number(receipt.reader_id || receipt.user_id || -1) === currentUserId,
  //   );
  // };
  const isMessageReadByCurrentUser = (message) => {
    if (!message) return true;

    const senderId = Number(message.sender_id || message.user?.id || -1);

    // amar nijer message unread na
    if (senderId === currentUserId) {
      return true;
    }

    // backend read status
    if (message.is_read === true) {
      return true;
    }

    // read receipt check
    const receipts = message.read_receipts || [];

    const hasReadReceipt = receipts.some(
      (receipt) =>
        Number(receipt.reader_id || receipt.user_id || -1) === currentUserId,
    );

    return hasReadReceipt;
  };
  const firstUnreadMessageId = useMemo(() => {
    const unreadMessage = messages.find(
      (message) => !isMessageReadByCurrentUser(message),
    );
    return unreadMessage ? unreadMessage.id : null;
  }, [messages, currentUserId]);

  const orderedMessages = useMemo(
    () => groupMessagesByDate(messages || []),
    [messages],
  );

  const firstUnreadMessageIndex = useMemo(() => {
    return orderedMessages.findIndex(
      (item) => item && !item.meta && !isMessageReadByCurrentUser(item),
    );
  }, [orderedMessages, currentUserId]);

  const messagesWithUnreadDivider = useMemo(() => {
    const unreadIndex = orderedMessages.findIndex(
      (item) => item && !item.meta && !isMessageReadByCurrentUser(item),
    );

    if (unreadIndex === -1) return orderedMessages;

    return [
      ...orderedMessages.slice(0, unreadIndex),
      {
        meta: true,
        metaText: "Unread Messages",
        unreadDivider: true,
        id: "unread-divider",
      },
      ...orderedMessages.slice(unreadIndex),
    ];
  }, [orderedMessages, currentUserId]);

  useEffect(() => {
    hasAutoScrolledToUnread.current = false;
    hasPreventedBottomScrollAfterUnread.current = false;
  }, [activeGroup?.id]);
  useEffect(() => {
    if (firstUnreadMessageId && !initialUnreadId) {
      setInitialUnreadId(firstUnreadMessageId);
    }
  }, [firstUnreadMessageId, initialUnreadId]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const hasUnreadDivider = messagesWithUnreadDivider.some(
      (m) => m?.unreadDivider,
    );

    // If any unread message exists, do not auto-scroll to bottom.
    if (initialUnreadId || firstUnreadMessageId || hasUnreadDivider) {
      hasPreventedBottomScrollAfterUnread.current = true;
      return;
    }

    if (hasPreventedBottomScrollAfterUnread.current) return;
    el.scrollTop = el.scrollHeight;
  }, [
    messages,
    typingUsers,
    firstUnreadMessageId,
    initialUnreadId,
    messagesWithUnreadDivider,
  ]);

  useEffect(() => {
    if (!initialUnreadId || hasAutoScrolledToUnread.current) return;

    const timer = setTimeout(() => {
      const dividerElement = document.getElementById("unread-divider");
      if (dividerElement) {
        dividerElement.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightedMessageId(initialUnreadId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      } else {
        scrollToMessage(initialUnreadId);
      }

      hasAutoScrolledToUnread.current = true;
      hasPreventedBottomScrollAfterUnread.current = true;
    }, 150);
    return () => clearTimeout(timer);
  }, [initialUnreadId, activeGroup?.id, messagesWithUnreadDivider]);
  useEffect(() => {
    if (!initialUnreadId) return;

    const unreadStillExists = messages.some(
      (msg) => msg.id === initialUnreadId && !isMessageReadByCurrentUser(msg),
    );

    let removeTimer = null;
    if (!unreadStillExists) {
      // Delay removal so user sees the divider disappear smoothly after message marked read
      removeTimer = setTimeout(() => setInitialUnreadId(null), 2500);
    }

    return () => {
      if (removeTimer) clearTimeout(removeTimer);
    };
  }, [messages, initialUnreadId]);
  useEffect(() => {
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);

    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);
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

  useEffect(() => {
    if (activeGroup?.id) {
      const fetchGroupMembers = async () => {
        try {
          const response = await fetch(
            `https://chatsupport.fskindia.com/groups/${activeGroup.id}/members`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
              },
            },
          );
          const data = await response.json();
          setGroupMembers(data);
        } catch (error) {
          console.error("Error fetching group members:", error);
        }
      };
      fetchGroupMembers();
    }
  }, [activeGroup]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    setShowScrollDown(false);
  };

  const handleScroll = (e) => {
    const el = e.target;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setShowScrollDown(el.scrollTop < maxScroll - 150);
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 3000); // Remove highlight after 3 seconds
    }
  };

  const prevMessagesLength = useRef((messages || []).length);

  useEffect(() => {
    const prev = prevMessagesLength.current;
    const len = messages.length;
    if (len > prev) {
      const last = messages[len - 1];
      const lastSenderId = Number(last?.sender_id || last?.user?.id || -1);
      if (last && lastSenderId === currentUserId) {
        // small delay to ensure DOM updated
        setTimeout(() => scrollToBottom(), 50);
      }
    }
    prevMessagesLength.current = len;
  }, [messages]);

  // ── Search functions ──
  const handleSearchChange = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    setCurrentMatchIndex(0);

    // Clear highlights
    document.querySelectorAll(".chat-search-highlight").forEach((h) => {
      h.classList.remove("chat-search-highlight");
    });

    if (!query) {
      matchElementsRef.current = [];
      return;
    }

    // Search against the data array (message text only), not DOM textContent
    // This avoids false matches from timestamps, delivery info, user names, etc.
    const matchedMessages = (messages || []).filter((m) => {
      const text = (
        m.message ||
        m.reply_message ||
        m.content ||
        ""
      ).toLowerCase();
      return text.includes(query);
    });

    // Find corresponding DOM elements by id
    const elements = matchedMessages
      .map((m) => document.getElementById(`message-${m.id}`))
      .filter(Boolean);

    matchElementsRef.current = elements;

    if (elements.length > 0) {
      elements[0].scrollIntoView({ behavior: "smooth", block: "center" });
      highlightMatch(elements[0]);
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

  // Click outside search bar to close
  useEffect(() => {
    if (!showSearch) return;

    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target)
      ) {
        const toggle = document.querySelector(".group-chat-search-toggle");
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

  if (!activeGroup) {
    return (
      <div className="nk-chat-body">
        <div className="nk-chat-blank">
          <Icon name="chat" className="icon-circle icon-circle-xxl bg-white" />
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (deleteModal.messageType === "message") {
      deleteMessage(deleteModal.messageId);
    } else if (deleteModal.messageType === "reply") {
      deleteReply(deleteModal.messageId);
    }
    setDeleteModal({ isOpen: false, messageId: null, messageType: null });
  };

  const handleMentionInput = (e) => {
    const value = e.target.value;
    setInputText(value);

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1 && cursorPosition - lastAtSymbolIndex <= 50) {
      // Limit query length
      const query = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      setMentionQuery(query);
      setShowMentionList(true);
      setMentionPosition(lastAtSymbolIndex);
    } else {
      setShowMentionList(false);
      setMentionQuery("");
    }

    handleTyping();
  };

  // Emoji handling
  const handleEmojiClick = (emojiObject) => {
    setInputText((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Handle member selection
  const handleMemberSelect = (member) => {
    const memberName = `@${member.first_name}${member.last_name || ""}`;
    const textBeforeMention = inputText.slice(0, mentionPosition);
    const textAfterMention = inputText.slice(
      textareaRef.current.selectionStart,
    );
    const newText = `${textBeforeMention}${memberName} ${textAfterMention}`;
    setInputText(newText);
    setShowMentionList(false);
    setMentionQuery("");
    textareaRef.current.focus();
  };

  return (
    <div
      className="nk-chat-body show-chat"
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files || []);

        if (!files.length) return;

        files.forEach((file) => {
          handleFileChange(file);
        }); // 🔥 existing function reuse
      }}
    >
      <div className="nk-chat-head">
        <ul className="nk-chat-head-info">
          <li className="nk-chat-head-user">
            <div
              className="user-card"
              onClick={() =>
                navigate(`/app-group-create/${activeGroup.id}/settings`)
              }
            >
              <UserAvatar
                theme="primary"
                text={(activeGroup.name || "?").slice(0, 2).toUpperCase()}
                image={activeGroup.group_avatar || activeGroup.avatar_url}
              />
              <div className="user-info">
                <div className="lead-text">{activeGroup.name}</div>
              </div>
            </div>
          </li>
        </ul>
        <div className="nk-chat-head-actions">
          <button
            className="btn btn-sm btn-icon group-chat-search-toggle"
            onClick={() => {
              if (!showSearch) {
                setSearchQuery("");
                matchElementsRef.current = [];
                setCurrentMatchIndex(0);
              }
              setShowSearch((prev) => !prev);
            }}
            title="Search"
          >
            <i className="bi bi-search" />
          </button>
          <button
            className="btn btn-sm btn-icon"
            onClick={handleMinimize}
            title="Minimize"
          >
            <i className="bi bi-dash-lg" />
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      {showSearch && (
        <div className="group-chat-search-bar" ref={searchRef}>
          <div className="group-chat-search-input-wrap">
            <i className="bi bi-search group-chat-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="group-chat-search-input"
              placeholder="Search messages…"
              aria-label="Search messages"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
            />
            {searchQuery && (
              <span className="group-chat-search-count">
                {matchElementsRef.current.length > 0
                  ? `${currentMatchIndex + 1} of ${matchElementsRef.current.length}`
                  : "No matches"}
              </span>
            )}
          </div>
          {searchQuery && matchElementsRef.current.length > 0 && (
            <div className="group-chat-search-nav">
              <button
                className="btn btn-sm btn-icon group-chat-search-nav-btn"
                onClick={() => navigateSearch("up")}
                title="Previous match"
              >
                <i className="bi bi-chevron-up" />
              </button>
              <button
                className="btn btn-sm btn-icon group-chat-search-nav-btn"
                onClick={() => navigateSearch("down")}
                title="Next match"
              >
                <i className="bi bi-chevron-down" />
              </button>
            </div>
          )}
          <button
            className="btn btn-sm btn-icon group-chat-search-close"
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

      <SimpleBar
        className="nk-chat-panel"
        style={{
          flex: 1,
          height: 0,
          minHeight: 0,
          overflowY: "auto",
          position: "relative",
        }}
        scrollableNodeProps={{
          ref: (n) => (scrollRef.current = n),
          onScroll: handleScroll,
        }}
      >
        {messagesWithUnreadDivider.map((m, idx) => {
          if (m?.meta) {
            return (
              <MetaChat
                id={m.unreadDivider ? "unread-divider" : undefined}
                key={`meta-${m.unreadDivider ? "unread" : idx}`}
                item={m.meta?.metaText || m.metaText}
                className={m.unreadDivider ? "chat-sap-unread" : ""}
              />
            );
          }

          const messageSenderId =
            Number(m?.sender_id || m?.user?.id || -1) || -1;
          const isMe = messageSenderId === currentUserId;

          const safeDate = m.created_at ? new Date(m.created_at) : new Date();
          const item = {
            id: m.id,
            chat: m.message || "",
            date: isNaN(safeDate.getTime())
              ? ""
              : safeDate
                  .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  .toUpperCase(),
            isReply: m.type === "reply" || m.type === "group_message_reply",
            parentMsg: m.parentMsg || null,
          };

          const messageNode = (
            <div key={`message-${m.id}-${idx}`}>
              {m.id === initialUnreadId && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: "18px 0",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: "1px",
                      background: "#e5e7eb",
                    }}
                  />

                  <div
                    style={{
                      background: "#fff5f5",
                      color: "#ef4444",
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: "600",
                      border: "1px solid #fecaca",
                      zIndex: 2,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    }}
                  >
                    Unread Messages
                  </div>
                </div>
              )}
              {/* ✅ MAIN MESSAGE */}
              {isMe ? (
                <GroupMeChat
                  item={item}
                  isReply={m.type === "group_message_reply"}
                  parentMsg={m.parentMsg}
                  message={m}
                  groupMembers={groupMembers}
                  activeGroup={activeGroup}
                  onEdit={
                    m.type === "reply" || m.type === "group_message_reply"
                      ? () => startEditingReply(m, m.original_message_id)
                      : () => startEditing(m)
                  }
                  onDelete={(messageId) =>
                    setDeleteModal({
                      isOpen: true,
                      messageId,
                      messageType:
                        m.type === "reply" || m.type === "group_message_reply"
                          ? "reply"
                          : "message",
                    })
                  }
                  onReply={handleReply}
                  onForward={(msg) =>
                    setForwardModal({ show: true, message: msg })
                  }
                  onInfo={(msg) =>
                    setMessageInfoModal({ isOpen: true, message: msg })
                  }
                  onScrollToMessage={scrollToMessage}
                  highlightedMessageId={highlightedMessageId}
                  isDeleted={m.is_deleted}
                  isOnlyEmojis={isOnlyEmojis}
                />
              ) : (
                <GroupYouChat
                  item={item}
                  message={m}
                  groupMembers={groupMembers}
                  activeGroup={activeGroup}
                  onReply={handleReply}
                  onForward={(msg) =>
                    setForwardModal({ show: true, message: msg })
                  }
                  onScrollToMessage={scrollToMessage}
                  highlightedMessageId={highlightedMessageId}
                  isDeleted={m.is_deleted}
                  isOnlyEmojis={isOnlyEmojis}
                />
              )}

              {/* 🔥 REPLIES RENDER (THIS WAS MISSING) */}
            </div>
          );

          return messageNode;
        })}
      </SimpleBar>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          onClick={scrollToBottom}
          style={{
            position: "absolute",
            bottom: "80px",
            right: "20px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "none",
            background: "#6576ff",
            color: "#fff",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            cursor: "pointer",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Scroll to bottom"
        >
          <i className="bi bi-arrow-down" style={{ fontSize: "16px" }} />
        </button>
      )}

      {typingUsers.length > 0 && (
        <div
          className="nk-chat-typing"
          style={{
            padding: "10px 16px",
            background: "#f5f7f8",
            fontSize: "13px",
            color: "#606770",
          }}
        >
          <div className="d-flex align-items-center">
            <small className="me-2">
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing`
                : `${typingUsers.length} people are typing`}
            </small>
            <div className="typing-animation">
              <span
                style={{
                  height: "6px",
                  width: "6px",
                  margin: "0 3px",
                  background: "#606770",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "typing 1.2s infinite ease-in-out",
                }}
              ></span>
              <span
                style={{
                  height: "6px",
                  width: "6px",
                  margin: "0 3px",
                  background: "#606770",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "typing 1.2s infinite ease-in-out 200ms",
                }}
              ></span>
              <span
                style={{
                  height: "6px",
                  width: "6px",
                  margin: "0 3px",
                  background: "#606770",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "typing 1.2s infinite ease-in-out 400ms",
                }}
              ></span>
            </div>
          </div>
          <style>
            {`
              @keyframes typing {
                0% { transform: translateY(0px); opacity: 0.6; }
                28% { transform: translateY(-5px); opacity: 1; }
                44% { transform: translateY(0px); opacity: 0.6; }
              }
            `}
          </style>
        </div>
      )}
      <ReplyPreview
        messages={messages}
        replyingTo={replyingTo}
        editMessageId={editMessageId}
        editingReply={editingReply}
        cancelReply={cancelReply}
      />
      {attachmentPreview && (
        <GroupAttachmentPreview
          attachmentPreview={attachmentPreview}
          setAttachmentPreview={() => setAttachmentPreview(null)}
        />
      )}
      {deleteModal.isOpen && (
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          message={{
            content: deleteModal.content,
            type: deleteModal.messageType,
          }}
          onConfirm={handleDelete}
          onCancel={() =>
            setDeleteModal({
              isOpen: false,
              messageId: null,
              messageType: null,
              content: null,
            })
          }
        />
      )}
      <MessageInfoModal
        isOpen={messageInfoModal.isOpen}
        message={messageInfoModal.message}
        groupMembers={groupMembers}
        onClose={() => setMessageInfoModal({ isOpen: false, message: null })}
      />
      <ForwardMessageModal
        show={forwardModal.show}
        message={forwardModal.message}
        forwardMessage={forwardModal.message}
        onClose={() => {
          setForwardModal({ show: false, message: null });
          setForwardSearch("");
        }}
        groups={groups}
        currentGroupId={activeGroup?.id}
        onForwardToGroup={forwardMessageToGroup}
        forwardSearch={forwardSearch}
        setForwardSearch={setForwardSearch}
        recentForwardUsers={
          directChat?.recentChats
            ?.map((chat) => {
              const user = directChat.allUsers?.find(
                (u) => u.id === chat.recipient_id,
              );
              return user || null;
            })
            .filter(Boolean) || []
        }
        allForwardUsers={
          directChat?.allUsers?.filter((u) =>
            `${u.first_name} ${u.last_name}`
              .toLowerCase()
              .includes(forwardSearch.toLowerCase()),
          ) || []
        }
        onForward={(messageId, recipientId) => {
          if (forwardMessageToUser) {
            forwardMessageToUser(forwardModal.message, recipientId);
          }
        }}
      />
      <div className="nk-chat-editor">
        <div className="nk-chat-input-group d-flex align-items-center flex-grow-1 py-2 px-3">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={editingReply || editMessageId}
            style={{
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginRight: "8px", // Added spacing
            }}
          >
            <i className="bi bi-emoji-smile" style={{ fontSize: "24px" }}></i>
          </Button>

          <div
            className="flex form-control-wrap"
            style={{ position: "relative", flexGrow: 1 }}
          >
            <textarea
              className="modern-chat-input-field"
              rows="1"
              id="group-textarea"
              ref={textareaRef}
              onChange={handleMentionInput}
              value={inputText}
              placeholder={
                editingReply
                  ? "Edit your reply..."
                  : replyingTo
                    ? "Type your reply..."
                    : editMessageId
                      ? "Edit your message..."
                      : "Type your message..."
              }
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;

                let hasFile = false;

                for (let item of items) {
                  if (item.kind === "file") {
                    const file = item.getAsFile();

                    if (!file) continue;

                    hasFile = true;
                    handleFileChange(file);
                  }
                }

                if (hasFile) {
                  e.preventDefault();
                }
              }}
              onKeyDown={(e) => {
                if (e.code === "Enter" || e.code === "NumpadEnter") {
                  e.preventDefault();
                  sendMessage();
                }

                if (
                  showMentionList &&
                  (e.code === "ArrowUp" || e.code === "ArrowDown")
                ) {
                  e.preventDefault();
                }
              }}
            ></textarea>
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "0",
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
            {showMentionList && groupMembers.length > 0 && (
              <div
                className="mention-list"
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "0",
                  right: "0",
                  maxHeight: "150px",
                  overflowY: "auto",
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  zIndex: 1000,
                }}
              >
                {groupMembers
                  .filter((member) =>
                    `${member.first_name}${member.last_name || ""}`
                      .toLowerCase()
                      .includes(mentionQuery.toLowerCase()),
                  )
                  .map((member) => (
                    <div
                      key={member.id}
                      className="mention-item"
                      onClick={() => handleMemberSelect(member)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "#fff",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f0f2f5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#fff")
                      }
                    >
                      <UserAvatar
                        theme="primary"
                        text={(member.first_name || "?")
                          .slice(0, 2)
                          .toUpperCase()}
                        image={member.profile_picture}
                        style={{ marginRight: "10px" }}
                      />
                      <span style={{ marginLeft: "10px" }}>
                        {member.first_name} {member.last_name || ""}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <input
            type="file"
            id="group-file"
            style={{ display: "none" }}
            onChange={(e) => {
              handleFileChange(e.target.files?.[0]);
            }}
            accept=".png,.jpg,.jpeg,.pdf,.doc,.docx"
          />
          <button
            type="button"
            onClick={() => {
              document.getElementById("group-file").click();
            }}
            disabled={editingReply || editMessageId}
            style={{
              backgroundColor: "#f0f2f5",
              color: "#1877f2",
              minWidth: "40px",
              minHeight: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              position: "relative",
              zIndex: 10,
              borderRadius: "50%",
              cursor: "pointer",
              outline: "none",
              marginLeft: "8px", // Added spacing
            }}
          >
            📎
          </button>

          <Button
            color="primary"
            onClick={() => sendMessage()}
            className="btn-round btn-icon p-2"
            disabled={!inputText.trim() && !attachmentPreview}
            style={{
              marginLeft: "8px",
              flexShrink: 0,
              minWidth: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }} // Increased minWidth for a wider button and added centering
          >
            {editingReply || editMessageId ? "✓" : "➤"}
          </Button>
        </div>
      </div>
    </div>
  );
}
