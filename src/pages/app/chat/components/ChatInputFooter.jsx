import AttachmentInputPreview from "@/components/custom/Attachment/AttachmentInputPreview";
import ReplyPreview from "@/components/custom/ReplyPreview";
import { AttechmentSizeLimit } from "@/pages/comman/helper";
import EmojiPicker from "emoji-picker-react";
import React, { useRef, useState } from "react";
import { Button } from "reactstrap";

const ChatInputFooter = ({ direct }) => {
  const fileRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleEmojiClick = (emojiObject) => {
    direct.setEditContent((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="chat-footer">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (direct.editContent.trim() || direct.attachment) {
            direct.sendMessage(direct.editContent);
            direct.setEditContent("");
            direct.setReplyToMessage(null);
            if (fileRef.current) fileRef.current.value = null;
          }
        }}
      >
        <ReplyPreview
          replyToMessage={direct?.replyToMessage}
          setReplyToMessage={direct?.setReplyToMessage}
        />
        {direct?.editingMessageId && (
          <div className="modern-edit-preview">
            <div className="modern-edit-preview-content">Editing message</div>
            <button className="modern-edit-preview-close" onClick={direct.cancelEditing}>
              ✕
            </button>
          </div>
        )}
        {direct?.attachment && (
          <AttachmentInputPreview
            selectedFile={direct.attachment}
            filePreview={direct.attachment.data}
            onRemove={() => {
              direct.setAttachment(null);
              if (fileRef.current) fileRef.current.value = null;
            }}
            isFileUploading={direct.isFileUploading}
          />
        )}
        <div className="modern-chat-input-form" style={{ position: "relative" }}>
          {/* Emoji Button */}
          <button
            type="button"
            className="modern-chat-input-attach"
            title="Add Emoji"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={direct?.isFileUploading}
          >
            <i className="bi bi-emoji-smile"></i>
          </button>

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

          {/* File Attach Button */}
          <button
            type="button"
            className="modern-chat-input-attach"
            title="Attach File"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={direct?.isFileUploading}
          >
            <i className="bi bi-paperclip"></i>
          </button>

          <input
            type="file"
            ref={fileRef}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              const validFile = AttechmentSizeLimit(file, e);
              if (!validFile) return;
              direct?.handleFileChange(validFile);
            }}
            accept="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />

          <textarea
            className="modern-chat-input-field"
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (let item of items) {
                if (item.kind === "file") {
                  const file = item.getAsFile();
                  if (!file) continue;
                  const validFile = AttechmentSizeLimit(file, e);
                  if (!validFile) return;
                  direct?.handleFileChange(validFile);
                  e.preventDefault();
                  break;
                }
              }
            }}
            rows="1"
            id="direct-textarea"
            onChange={(e) => {
              direct?.setEditContent(e.target.value);
              direct?.handleTyping();
            }}
            value={direct?.editContent}
            placeholder={
              direct?.editingMessageId
                ? "Edit your message..."
                : direct?.replyToMessage
                  ? `Replying to ${direct?.replyToMessage.user?.first_name || "User"}...`
                  : "Type a message..."
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (direct?.editContent.trim() || direct?.attachment) {
                  direct.sendMessage(direct?.editContent);
                  direct?.setEditContent("");
                  direct?.setReplyToMessage(null);
                  if (fileRef.current) fileRef.current.value = null;
                }
              }
            }}
            disabled={direct?.isFileUploading}
          />

          <Button
            color="primary"
            onClick={() => direct.sendMessage(direct?.editContent)}
            className="btn-round btn-icon p-2"
            disabled={!direct?.editContent.trim() && !direct?.attachment}
            style={{
              marginLeft: "8px",
              flexShrink: 0,
              minWidth: "50px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {direct?.editingMessageId ? "✓" : "➤"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInputFooter;
