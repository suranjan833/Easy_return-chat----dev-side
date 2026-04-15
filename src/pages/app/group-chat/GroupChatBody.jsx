import { Button, Icon, UserAvatar } from "@/components/Component";
import EmojiPicker from "emoji-picker-react";
import { useContext, useEffect, useRef, useState } from "react";
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
import ChatPopupsContainer from "@/pages/app/chat-popups/ChatPopupsContainer";
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

export default function GroupChatBody() {
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [mentionPosition, setMentionPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false); /* Added for emoji functionality */
  const emojiPickerRef = useRef(null); /* Added for emoji functionality */
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [messageInfoModal, setMessageInfoModal] = useState({ isOpen: false, message: null });
  const [forwardModal, setForwardModal] = useState({ show: false, message: null });
  const [forwardSearch, setForwardSearch] = useState("");

  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } = useSelector(
    (state) => state.chatPopups
  );

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
      openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
    if (total >= 3) {
      toast.error("Maximum of 3 chat windows can be open at a time.");
      return;
    }
    dispatch(addGroupChatPopup(activeGroup));
    selectGroup(null);
  };

  // Debug logging

  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typingUsers]); // Added typingUsers to trigger scroll on typing indicator

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 3000); // Remove highlight after 3 seconds
    }
  };

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
      style={{ position: "relative" }}
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

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        handleFileChange(file); // 🔥 existing function reuse
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
        <button
          className="btn btn-sm btn-icon"
          onClick={handleMinimize}
          title="Minimize"
        >
          <i className="bi bi-dash-lg" />
        </button>
      </div>
      <SimpleBar
        className="nk-chat-panel"
        scrollableNodeProps={{ ref: (n) => (scrollRef.current = n) }}
      >
        {groupMessagesByDate(messages).map((m, idx) => {
          if (m.meta)
            return <MetaChat key={`meta-${idx}`} item={m.meta.metaText} />;
          const currentUserId = Number(localStorage.getItem("userId")) || -1;
          const messageSenderId =
            Number(m?.sender_id || m?.user?.id || -1) || -1;

          const isMe = messageSenderId === currentUserId;

          const safeDate = m.created_at ? new Date(m.created_at) : new Date();

          const item = {
            id: m.id,
            chat: m.message || "", // 🔥 CLEAN

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

          return (
            <div key={`message-${m.id}-${idx}`}>
              {/* ✅ MAIN MESSAGE */}
              {isMe ? (
                <GroupMeChat
                  item={item}
                  isReply={m.type === "group_message_reply"}
                  parentMsg={m.parentMsg}
                  message={m}
                  onEdit={
                    m.type === "reply" || m.type === "group_message_reply"
                      ? () => startEditingReply(m, m.original_message_id)
                      : () => startEditing(m)
                  }
                  onDelete={(messageId) =>
                    setDeleteModal({
                      isOpen: true,
                      messageId,
                      messageType: (m.type === "reply" || m.type === "group_message_reply") ? "reply" : "message",
                    })
                  }
                  onReply={handleReply}
                  onForward={(msg) => setForwardModal({ show: true, message: msg })}
                  onInfo={(msg) => setMessageInfoModal({ isOpen: true, message: msg })}
                  onScrollToMessage={scrollToMessage}
                  highlightedMessageId={highlightedMessageId}
                  isDeleted={m.is_deleted}
                  isOnlyEmojis={isOnlyEmojis}
                />
              ) : (
                <GroupYouChat
                  item={item}
                  message={m}
                  onReply={handleReply}
                  onForward={(msg) => setForwardModal({ show: true, message: msg })}
                  onScrollToMessage={scrollToMessage}
                  highlightedMessageId={highlightedMessageId}
                  isDeleted={m.is_deleted}
                  isOnlyEmojis={isOnlyEmojis}
                />
              )}

              {/* 🔥 REPLIES RENDER (THIS WAS MISSING) */}
            </div>
          );
        })}
      </SimpleBar>
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
        recentForwardUsers={directChat?.recentChats?.map(chat => {
          const user = directChat.allUsers?.find(u => u.id === chat.recipient_id);
          return user || null;
        }).filter(Boolean) || []}
        allForwardUsers={directChat?.allUsers?.filter(u => 
          `${u.first_name} ${u.last_name}`.toLowerCase().includes(forwardSearch.toLowerCase())
        ) || []}
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

                for (let item of items) {
                  if (item.kind === "file") {
                    const file = item.getAsFile();
                    if (!file) continue;

                    e.preventDefault();
                    handleFileChange(file);
                    break;
                  }
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
      <ChatPopupsContainer />
    </div>
  );
}
