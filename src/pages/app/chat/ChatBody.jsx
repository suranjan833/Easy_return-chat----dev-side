import { currentTime } from "@/utils/Utils";
import { motion } from "framer-motion";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { addUserChatPopup } from "@/redux/slices/chatPopupsSlice";

import { ChatContext } from "./ChatContext";
import { DirectChatContext } from "./DirectChatContext";
import { GroupChatContext } from "../group-chat/GroupChatContext";

import AttachmentDisplay from "../../../components/custom/Attachment/AttachmentDisplay";
import DeleteConfirmationModal from "../../../components/custom/DeleteConfirmationModal";
import { AttechmentSizeLimit, isOnlyEmojis } from "../../comman/helper";
import { MeChat, MetaChat, YouChat } from "./ChatPartials2";

import ChatHeader from "./components/ChatHeader";
import ChatInputFooter from "./components/ChatInputFooter";
import MessageSearchBar from "./components/MessageSearchBar";
import SelectionBar from "./components/SelectionBar";
import TypingIndicator from "./components/TypingIndicator";
import ForwardMessageModal from "./modals/ForwardMessageModal";
import MessageInfoModal from "./modals/MessageInfoModal";

import { Icon } from "@/components/Component";

const ChatBody = ({ id, mobileView, setMobileView, setSelectedId }) => {
  const { chatState } = useContext(ChatContext);
  const direct = useContext(DirectChatContext);
  const groupChat = useContext(GroupChatContext);

  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } = useSelector(
    (state) => state.chatPopups
  );

  const [chat, setChat] = chatState;
  const [Uchat, setUchat] = useState({});
  const [sidebar, setsidebar] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatOptions, setChatOptions] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [infoMessage, setInfoMessage] = useState(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const user = JSON.parse(localStorage?.getItem("user"));
  const messagesEndRef = useRef(null);
  const messageRefs = useRef({});
  const checkboxColumnRef = useRef(null);
  const dropdownRefs = useRef({});
  const unreadDividerRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const lastScrollTop = useRef(0);
  const prevMessageCountRef = useRef(0);
  const hasScrolledToUnread = useRef(false);

  // ── Scroll helpers ──────────────────────────────────────────────────────────
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const scrollToMessage = (messageId) => {
    const el = messageRefs.current[`message-${messageId}`];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.backgroundColor = "rgba(255, 193, 7, 0.3)";
      setTimeout(() => { el.style.backgroundColor = ""; }, 2000);
    }
  };

  const canModifyMessage = (timestamp) => {
    if (!timestamp) return false;
    return (Date.now() - new Date(timestamp).getTime()) / (1000 * 60) <= 10;
  };

  // ── Linkify ─────────────────────────────────────────────────────────────────
  const linkifyText = (text) => {
    if (!text) return text;
    const urlRegex = /\b((https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
    const elements = [];
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const start = match.index;
      if (start > lastIndex) elements.push(text.substring(lastIndex, start));
      const href = url.startsWith("http") ? url : `https://${url}`;
      elements.push(
        <span key={start} style={{ color: "#0d6efd", textDecoration: "underline", cursor: "pointer", wordBreak: "break-word" }}
          onClick={(e) => { e.stopPropagation(); const t = window.open(href, "_blank", "noopener,noreferrer"); if (t) t.focus(); }}>
          {url}
        </span>
      );
      lastIndex = start + url.length;
    }
    if (lastIndex < text.length) elements.push(text.substring(lastIndex));
    return elements;
  };

  // ── Search navigation ────────────────────────────────────────────────────────
  const goToNextResult = () => {
    if (!direct?.searchResults?.length) return;
    const next = currentSearchIndex + 1 >= direct.searchResults.length ? 0 : currentSearchIndex + 1;
    setCurrentSearchIndex(next);
    scrollToMessage(direct.searchResults[next].id);
  };

  const goToPrevResult = () => {
    if (!direct?.searchResults?.length) return;
    const prev = currentSearchIndex - 1 < 0 ? direct.searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prev);
    scrollToMessage(direct.searchResults[prev].id);
  };

  // ── Forward user lists ───────────────────────────────────────────────────────
  const recentForwardUsers = (direct?.recentChats || [])
    .map((c) => (direct?.allUsers || []).find((u) => u.id === c.recipient_id))
    .filter(Boolean)
    .filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(forwardSearch.toLowerCase()));

  const allForwardUsers = (direct?.allUsers || [])
    .filter((u) => u.id !== direct?.ME_ID && !recentForwardUsers.some((r) => r.id === u.id))
    .filter((u) => `${u.first_name} ${u.last_name}`.toLowerCase().includes(forwardSearch.toLowerCase()));

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const onRemoveMessage = (messageId) => {
    const allChat = chat;
    const index = allChat.find((item) => item.id === id);
    if (index !== -1) { allChat[index].convo[messageId].chat = ["deleted"]; setChat([...allChat]); }
  };

  const handleConfirmDelete = () => {
    if (messageToDelete) { direct.deleteMessage(messageToDelete.id); setMessageToDelete(null); }
  };

  const resizeFunc = () => setsidebar(window.innerWidth > 1550);

  const onTextSubmit = (e) => {
    e.preventDefault();
    if (direct && direct.activeUser) { direct.sendMessage(inputText); setInputText(""); return; }
    const allChat = chat;
    const index = allChat.find((item) => item.id === id);
    const defaultChat = Uchat;
    if (index !== -1) { allChat[index].convo.push({ me: true, chat: [inputText], date: currentTime() }); setChat([...allChat]); }
    else { defaultChat.convo.push({ me: true, chat: [inputText], date: currentTime() }); setUchat({ ...defaultChat }); }
    setInputText("");
  };

  // ── Group messages by date ───────────────────────────────────────────────────
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];
    
    // Deduplicate messages by ID before grouping
    const seen = new Set();
    const deduped = messages.filter((msg) => {
      // Keep meta messages and unread dividers (they don't have numeric IDs)
      if (msg.meta || msg.type === "unread_divider") return true;
      
      // For regular messages, deduplicate by ID
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
    
    const grouped = [];
    let currentDate = null;
    deduped.forEach((message) => {
      if (!message.timestamp) { grouped.push(message); return; }
      const messageDate = new Date(message.timestamp).toDateString();
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        grouped.push({
          meta: true,
          metaText: messageDate === today ? "Today" : messageDate === yesterday ? "Yesterday"
            : new Date(message.timestamp).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        });
      }
      grouped.push(message);
    });
    return grouped;
  };

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const allMessages = [...(direct?.hiddenMessages || []), ...(direct?.messages || [])];
    const currentCount = allMessages.length;
    const isInitialLoad = prevMessageCountRef.current === 0 && currentCount > 0;
    const isNewMessage = currentCount === prevMessageCountRef.current + 1;
    prevMessageCountRef.current = currentCount;
    const hasUnreadDivider = allMessages.some((msg) => msg.type === "unread_divider");

    if (isInitialLoad && hasUnreadDivider && !hasScrolledToUnread.current) {
      const timer = setTimeout(() => {
        if (unreadDividerRef.current) {
          unreadDividerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop -= 50;
            }
          }, 400);
          hasScrolledToUnread.current = true;
        } else {
          scrollToBottom();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if ((isInitialLoad && !hasUnreadDivider) || isNewMessage) {
      if (isInitialLoad && hasScrolledToUnread.current) return;
      const timer = setTimeout(() => scrollToBottom(), 50);
      return () => clearTimeout(timer);
    }
  }, [direct?.messages, direct?.hiddenMessages]);

  useEffect(() => {
    if (direct?.searchResults?.length && direct.searchResults[currentSearchIndex]) {
      scrollToMessage(direct.searchResults[currentSearchIndex].id);
    }
  }, [currentSearchIndex, direct?.searchResults]);

  useEffect(() => {
    if (direct?.searchResults?.length > 0) scrollToMessage(direct.searchResults[0].id);
  }, [direct?.searchResults]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const current = container.scrollTop;
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (current < lastScrollTop.current - 5) setShowSearchBar(true);
      if (current >= maxScroll - 10) setShowSearchBar(false);
      setShowScrollDown(current < maxScroll - 150);
      if (current < 80 && direct?.hasHidden && !direct?.isLoadingMore) {
        const prevHeight = container.scrollHeight;
        direct.prependHidden();
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight - prevHeight; });
      }
      if (current >= maxScroll - 80 && direct?.hasMore && !direct?.isLoadingMore) direct.loadMoreMessages();
      lastScrollTop.current = current;
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [direct?.hasMore, direct?.isLoadingMore, direct?.loadMoreMessages, direct?.hasHidden, direct?.prependHidden]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const timer = setTimeout(() => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      setShowScrollDown(container.scrollTop < maxScroll - 150);
    }, 100);
    return () => clearTimeout(timer);
  }, [direct?.messages]);

  useEffect(() => {
    if (!showSearchBar) { direct?.setMessageSearchTerm(""); setCurrentSearchIndex(0); }
  }, [showSearchBar]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const openEl = dropdownRefs.current[openDropdown];
      if (openEl && !openEl.contains(e.target)) setOpenDropdown(null);
    };
    if (openDropdown !== null) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  useEffect(() => {
    if (direct?.replyToMessage && messageRefs.current[direct.replyToMessage.id]) {
      messageRefs.current[direct.replyToMessage.id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [direct?.replyToMessage, direct?.messages]);

  // Reset scroll flags only when the active conversation actually changes
  const prevActiveUserIdRef = useRef(null);

  useEffect(() => {
    if (!direct) {
      chat.forEach((item) => { if (item.id === id) setUchat(item); });
    }

    const currentActiveUserId = direct?.activeUser?.id ?? id;
    if (currentActiveUserId !== prevActiveUserIdRef.current) {
      prevActiveUserIdRef.current = currentActiveUserId;
      hasScrolledToUnread.current = false;
      prevMessageCountRef.current = 0;
    }
  }, [id, direct?.activeUser?.id]);

  useEffect(() => {
    window.addEventListener("resize", resizeFunc);
    resizeFunc();
    return () => window.removeEventListener("resize", resizeFunc);
  }, []);

  // ── Render message ───────────────────────────────────────────────────────────
  const renderMessage = (message, i) => {
    const meId = parseInt(localStorage.getItem("userId"));
    const isMe = message.sender_id === (meId || -1);
    const isSearchMatch = direct?.searchResults?.some((m) => m.id === message.id);
    const messageTime = new Date(message.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    // Generate unique key - use ID if available, otherwise use index with prefix
    const messageKey = message.id ? `msg-${message.id}` : `idx-${i}`;

    if (message?.type === "unread_divider") {
      return (
        <motion.div key={messageKey} id="unread-divider" ref={unreadDividerRef}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "12px 0", width: "100%" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e0e0e0" }} />
          <span style={{ margin: "0 10px", fontSize: "12px", color: "#888", background: "#fff", padding: "2px 8px", borderRadius: "10px", border: "1px solid #e0e0e0" }}>
            Unread messages
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e0e0e0" }} />
        </motion.div>
      );
    }

    return !message?.meta ? (
      <div key={messageKey} ref={(el) => { if (el) messageRefs.current[`message-${message.id}`] = el; }}
        className={`d-flex mb-2 ${isMe ? "justify-content-end" : "justify-content-start"}`}>
        <div className={`p-2 shadow-sm ${isMe ? "bg-primary text-white" : "bg-white"}`}
          style={{ borderRadius: 12, maxWidth: "70%", outline: isSearchMatch ? "2px solid #ffc107" : "none", backgroundColor: isSearchMatch ? "#fff3cd" : undefined }}>
          {message.is_deleted ? (
            <span style={{ fontStyle: "italic", opacity: 0.6 }}>{isMe ? "You deleted this message" : "This message was deleted"}</span>
          ) : (
            <>
              {message.attachment ? (
                <AttachmentDisplay attachment={message.attachment} isMe={isMe} message={message} />
              ) : (
                <>
                  {(message.type === "message_reply" || message.type === "reply") && message.message_id && (() => {
                    // Resolve original message content from loaded messages list
                    const allMsgs = [...(direct?.hiddenMessages || []), ...(direct?.messages || [])];
                    const originalMsg = allMsgs.find((m) => m.id === message.message_id);
                    const originalContent = message.parent_content
                      || originalMsg?.content
                      || originalMsg?.reply_content
                      || message.parentMsg?.content
                      || "Original message";
                    const originalSenderId = originalMsg?.sender_id ?? message.parentMsg?.sender_id;
                    const originalSenderName = originalSenderId === meId ? "You" : (originalMsg?.sender?.first_name || user?.first_name || "User");
                    return (
                      <div className="reply-preview p-2 mb-2 rounded" onClick={() => scrollToMessage(message.message_id)}
                        style={{ backgroundColor: isMe ? "rgba(255,255,255,0.2)" : "#f0f0f0", borderLeft: `3px solid ${isMe ? "#fff" : "#ccc"}`, cursor: "pointer" }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = isMe ? "rgba(255,255,255,0.3)" : "#e0e0e0"; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = isMe ? "rgba(255,255,255,0.2)" : "#f0f0f0"; }}>
                        <small className="text-muted" style={{ fontSize: "0.75em", opacity: 0.7 }}>
                          {originalSenderName}
                        </small>
                        <p className="mb-0" style={{ fontSize: "0.85em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {originalContent}
                        </p>
                      </div>
                    );
                  })()}
                  {(() => {
                    if (message.is_deleted) return <span style={{ fontStyle: "italic", opacity: 0.6 }}>{isMe ? "You deleted this message" : "This message was deleted"}</span>;
                    const isEmojiOnly = message.message_type !== "attachment" && !message.reply_to_id && isOnlyEmojis(message.content);
                    return (
                      <div style={{ display: "inline-block" }}>
                        {(message.type === "forward_message" || message.forwarded || message.forwarded_from_message_id) && (
                          <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <i className="bi bi-reply-fill" style={{ fontSize: "11px", transform: "scaleX(-1)" }}></i>
                            <span>Forwarded</span>
                          </div>
                        )}
                        <span style={{ fontSize: isEmojiOnly ? "40px" : "inherit", lineHeight: isEmojiOnly ? "1.2" : "inherit", display: "inline-block" }}>
                          {linkifyText(message.content || message.reply_content)}
                          {(message.edited || message.is_edited) && <span className="ms-1 text-muted" style={{ fontSize: "0.75em" }}>(edited)</span>}
                        </span>
                      </div>
                    );
                  })()}
                </>
              )}
              <small className={`ms-2 ${isMe ? "text-white-50" : "text-muted"} message-status`}
                style={{ fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                {!message.is_deleted && (
                  <>
                    <span>{messageTime}</span>
                    {isMe && (
                      <>
                        {message.read
                          ? <i className="bi bi-check2-all" style={{ color: "#34B7F1", fontSize: "14px" }} title="Read"></i>
                          : message.delivered
                            ? <i className="bi bi-check2-all" style={{ color: "#999", fontSize: "14px" }} title="Delivered"></i>
                            : <i className="bi bi-check2" style={{ color: "#999", fontSize: "14px" }} title="Sent"></i>}
                      </>
                    )}
                    <span className="relative" ref={(el) => { if (el) dropdownRefs.current[message.id] = el; }}>
                      <button className={`p-1 ${isMe ? "text-white/60" : "text-black/50"}`}
                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === message.id ? null : message.id); }}>
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                      {openDropdown === message.id && (
                        <ul className="absolute right-0 mt-1 w-32 bg-white text-black rounded-md shadow-lg border z-50 overflow-hidden">
                          {isMe && canModifyMessage(message.timestamp) && (
                            <>
                              <li><button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { direct.startEditing(message); setOpenDropdown(null); }}>Edit</button></li>
                              <li><button className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-100"
                                onClick={() => { setMessageToDelete(message); setOpenDropdown(null); direct?.setDeleteType(message?.type === "message_reply" || message?.type === "reply" ? "delete_reply" : "delete_message"); }}>Delete</button></li>
                            </>
                          )}
                          <li><button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { setOpenDropdown(null); direct?.setReplyToMessage(message); }}>Reply</button></li>
                          <li><button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { setOpenDropdown(null); setForwardMessage(message); setShowForwardModal(true); }}>Forward</button></li>
                          <li><button className="w-full text-left px-3 py-2 hover:bg-gray-100"
                            onClick={() => { setOpenDropdown(null); direct.setIsSelectionMode(true); direct.setSelectedMessages((prev) => prev.includes(message.id) ? prev : [...prev, message.id]); }}>Select</button></li>
                          {isMe && <li><button className="w-full text-left px-3 py-2 hover:bg-gray-100" onClick={() => { setInfoMessage(message); setOpenDropdown(null); }}>Message Info</button></li>}
                        </ul>
                      )}
                    </span>
                  </>
                )}
              </small>
            </>
          )}
        </div>
      </div>
    ) : (
      <div key={`meta-${i}-${message?.metaText}`} className="d-flex justify-content-center">
        <span className="inline-flex items-center rounded-md bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 inset-ring inset-ring-gray-400/20">
          {message?.metaText}
        </span>
      </div>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!direct && !Uchat.convo) {
    return (
      <div className="modern-chat-empty-state">
        <div className="modern-chat-empty-content">
          <div className="modern-chat-empty-icon"><i className="bi bi-chat-dots"></i></div>
          <h3>Welcome to Chat</h3>
          <p>Select a conversation from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <React.Fragment>
      {direct && direct.activeUser ? (
        <div
          className="modern-chat-main"
          style={{ display: "flex", position: "relative" }}
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (!file) return;
            const validFile = AttechmentSizeLimit(file, e);
            if (!validFile) return;
            direct?.handleFileChange(validFile);
          }}
        >
          <ChatHeader
            activeUser={direct.activeUser}
            activeUserIDs={direct.activeUserIDs}
            isSelectionMode={direct.isSelectionMode}
            selectedMessages={direct.selectedMessages}
            onDeleteSelected={direct.deleteSelected}
            onToggleSelection={(val) => direct.setIsSelectionMode(val)}
            onMinimize={() => {
              if (!direct.activeUser) return;
              if (openChatPopups.some((p) => p.user.id === direct.activeUser.id)) {
                toast.warning("Chat is already open as a popup.");
                return;
              }
              const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
              if (total >= 4) {
                toast.error("Maximum of 4 chat windows can be open at a time.");
                return;
              }
              const conv = direct.users?.find((u) => u.other_user?.id === direct.activeUser.id);
              const payload = conv?.conversation_id
                ? { ...direct.activeUser, conversation_id: conv.conversation_id }
                : direct.activeUser;
              dispatch(addUserChatPopup(payload));
              direct.selectUser(null);
            }}
          />

          {direct?.isSelectionMode && (
            <SelectionBar
              messages={direct.messages}
              selectedMessages={direct.selectedMessages}
              setSelectedMessages={direct.setSelectedMessages}
              setIsSelectionMode={direct.setIsSelectionMode}
              deleteMessage={direct.deleteMessage}
            />
          )}

          {/* Messages container */}
          <div className="modern-chat-messages" ref={messagesContainerRef}
            style={{ position: "relative", overflowY: "auto", flex: 1, height: 0, minHeight: 0 }}>
            {showSearchBar && (
              <MessageSearchBar
                messageSearchTerm={direct?.messageSearchTerm}
                setMessageSearchTerm={direct?.setMessageSearchTerm}
                onPrev={goToPrevResult}
                onNext={goToNextResult}
              />
            )}
            {!direct?.hasMore && direct?.messages?.length > 0 && (
              <div style={{ textAlign: "center", padding: "8px 0", color: "#bbb", fontSize: "12px" }}>No more messages</div>
            )}
            {direct?.isLoadingMore && (
              <div style={{ textAlign: "center", padding: "10px 0", color: "#888", fontSize: "13px" }}>Loading more messages...</div>
            )}
            {groupMessagesByDate([...(direct?.hiddenMessages || []), ...(direct?.messages || [])]).length === 0 ? (
              direct?.isInitialLoading ? (
                <div className="flex justify-center align-center items-center py-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center items-center py-8 text-gray-400 text-sm">No messages yet. Say hello!</div>
              )
            ) : (
              groupMessagesByDate([...(direct?.hiddenMessages || []), ...(direct?.messages || [])]).map((message, i) => renderMessage(message, i))
            )}
            <TypingIndicator typingUsers={direct?.typingUsers} />
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollDown && (
            <button onClick={scrollToBottom}
              style={{ position: "absolute", bottom: "80px", right: "20px", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "#0d6efd", color: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.25)", cursor: "pointer", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="bi bi-arrow-down"></i>
            </button>
          )}

          <ForwardMessageModal
            show={showForwardModal}
            onClose={() => setShowForwardModal(false)}
            forwardMessage={forwardMessage}
            forwardSearch={forwardSearch}
            setForwardSearch={setForwardSearch}
            recentForwardUsers={recentForwardUsers}
            allForwardUsers={allForwardUsers}
            onForward={direct.forwardMessage}
            groups={groupChat?.groups || []}
            onForwardToGroup={direct.forwardMessageToGroup}
            currentGroupId={null}
          />

          <MessageInfoModal message={infoMessage} onClose={() => setInfoMessage(null)} />

          <DeleteConfirmationModal
            isOpen={!!messageToDelete}
            message={{ content: messageToDelete?.content, type: messageToDelete?.message_type || "message" }}
            onConfirm={handleConfirmDelete}
            onCancel={() => setMessageToDelete(null)}
          />

          <ChatInputFooter direct={direct} />
        </div>

      ) : Uchat.convo ? (
        <div className="modern-chat-main" style={{ display: "flex" }}>
          <div className="modern-chat-header">
            <div className="modern-chat-header-user">
              <img src={Uchat.avatar || "https://via.placeholder.com/40"} alt={Uchat.name || "User"} className="modern-chat-header-avatar" />
              <div className="modern-chat-header-info">
                <h5>{Uchat.name || "User"}</h5>
                <p>{Uchat?.availability === true || Uchat?.is_active === true ? "Online" : "Offline"}</p>
              </div>
            </div>
            <div className="modern-chat-header-actions">
              <button className="modern-chat-header-btn" onClick={() => setChatOptions(!chatOptions)}>
                <Icon name="more-h" />
              </button>
            </div>
          </div>

          <div className="modern-chat-messages" ref={messagesEndRef}>
            {Uchat.convo.map((item, idx) => {
              if (item.me) return <MeChat key={idx} item={item} chat={Uchat} onRemoveMessage={onRemoveMessage} />;
              else if (item.meta) return <MetaChat key={idx} item={item.meta.metaText} />;
              else return <YouChat key={idx} item={item} chat={Uchat} />;
            })}
          </div>

          <div className="modern-chat-input-area">
            <form onSubmit={onTextSubmit}>
              <div className="modern-chat-input-form">
                <textarea className="modern-chat-input-field" rows="1" value={inputText}
                  onChange={(e) => setInputText(e.target.value)} placeholder="Type a message..."
                  onKeyDown={(e) => { if (e.code === "Enter" && !e.shiftKey) { e.preventDefault(); if (inputText.trim()) onTextSubmit(e); } }} />
                <button type="submit" className="modern-chat-input-send">➤</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </React.Fragment>
  );
};

export default ChatBody;
