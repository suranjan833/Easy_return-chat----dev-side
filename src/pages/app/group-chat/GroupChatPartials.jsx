import { Icon, UserAvatar } from "@/components/Component";
import { formatDistanceToNow } from "date-fns";
import React, { useRef, useState } from "react";
import { renderMessageWithLinks } from "../../comman/helper";

export const GroupMeChat = ({
  item,
  message,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onInfo,
  onScrollToMessage,
  highlightedMessageId,
  isDeleted,
  isOnlyEmojis,
}) => {
  const currentUserId = Number(localStorage.getItem("userId") || 0);
  const senderId = Number(message.sender_id || message.user?.id || 0);
  const isOwnMessage = senderId === currentUserId;
  const messageDropdownRefs = useRef({});
  const [showDropdownForMessageId, setShowDropdownForMessageId] = useState(null);

  return (
    <div id={`message-${message.id}`} className={`chat is-me my-1 ${highlightedMessageId === message.id ? 'highlight-message' : ''}`}>
      <div className="chat-content" style={{ display: "flex" }}>
        {isOwnMessage && !isDeleted ? (
          <>
            <div
              className="dropdown"
              ref={(el) => {
                if (el) messageDropdownRefs.current[message.id] = el;
              }}
            >
              <button
                size="sm"
                variant="border-0"
                onClick={() =>
                  setShowDropdownForMessageId(
                    showDropdownForMessageId === message.id ? null : message.id,
                  )
                }
                style={{
                  padding: "4px 8px",
                  fontSize: "13px",
                  minWidth: "32px",
                  height: "32px",
                }}
              >
                <i className="bi bi-three-dots-vertical"></i>
              </button>
              {showDropdownForMessageId === message.id && (
                <ul
                  className="dropdown-menu show"
                  style={{
                    position: "absolute",
                    top: "30px",
                    right: "0",
                    left: "auto",
                    margin: 0,
                    zIndex: 9999,
                  }}
                >
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onInfo(message);
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
                        onEdit(message);
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
                        onDelete(message.id);
                        setShowDropdownForMessageId(null);
                      }}
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      <i className="bi bi-trash me-2"></i>Delete
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onForward(message);
                        setShowDropdownForMessageId(null);
                      }}
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                    >
                      <i className="bi bi-forward me-2"></i>Forward
                    </button>
                  </li>
                </ul>
              )}
            </div>

            <div className="me-2">
              <button
                className="btn border-0"
                onClick={() => onReply(message)}
                style={{ fontSize: "12px", padding: "4px 8px" }}
              >
                <Icon name="reply" className="me-1" />
              </button>
            </div>
          </>
        ) : null}

        <div style={{ flex: 1 }}>
          <ul className="chat-meta">
            Delivered:{" "}
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
            {message.is_read && message.read && (
              <span style={{ marginLeft: "8px" }}>
                Read:{" "}
                {formatDistanceToNow(
                  new Date(message.read_at || message.updated_at),
                  { addSuffix: true },
                )}
              </span>
            )}
          </ul>
          <div className="chat-bubbles">
            <div className="chat-bubble ">
              {isDeleted ? (
                <div className="chat-msg border bg-white text-muted">
                  Message has been deleted
                </div>
              ) : (
                <React.Fragment>
                  <div
                    className={`chat-msg bg-primary w-100  ${isDeleted ? "deleted-message" : ""} ${message.syncFailed ? "sync-failed" : ""}`}
                    style={{
                      fontSize:
                        !message.attachment && isOnlyEmojis(message?.message)
                          ? "40px"
                          : "inherit",
                      lineHeight:
                        !message.attachment && isOnlyEmojis(message?.message)
                          ? "1.2"
                          : "inherit",
                    }}
                  >
                    {(message.type === "reply" ||
                      message.type === "group_message_reply") &&
                      message.parentMsg && (
                        <div 
                          className="reply-context mb-2 p-2 bg-light rounded" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => onScrollToMessage(message.parentMsg.id)}
                        >
                          <div style={{ fontSize: "0.85em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {(message.parentMsg?.message || message.parentMsg?.content || "")?.slice(0, 50)}
                            {(message.parentMsg?.message || message.parentMsg?.content || "").length > 50 ? "..." : ""}
                          </div>
                        </div>
                      )}
                    {message.is_forwarded && (
                      <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <i className="bi bi-reply-fill" style={{ fontSize: "11px", transform: "scaleX(-1)" }}></i>
                        <span>Forwarded</span>
                      </div>
                    )}
                    {renderMessageWithLinks(message.message || message.reply_message || message.content)}
                    {message.attachment && (
                      <div className="attachment-container mt-2">
                        {/* {console.log('Rendering attachment:', message.attachment)} */}
                        {/* {console.log('Attachment type:', message.attachment.type)} */}
                        {/* {console.log('Is image:', message.attachment.type && message.attachment.type.startsWith('image/'))} */}
                        {(() => {
                          // Handle different attachment formats
                          const isImageByType =
                            message.attachment.type &&
                            message.attachment.type.startsWith("image/");
                          const isImageByUrl =
                            typeof message.attachment === "string" &&
                            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                              message.attachment,
                            );
                          const isImageByUrlInObject =
                            message.attachment.url &&
                            /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                              message.attachment.url,
                            );
                          const isImage =
                            isImageByType ||
                            isImageByUrl ||
                            isImageByUrlInObject;

                          // console.log('Is image by type:', isImageByType);
                          // console.log('Is image by URL string:', isImageByUrl);
                          // console.log('Is image by URL in object:', isImageByUrlInObject);
                          // console.log('Final is image:', isImage);

                          if (isImage) {
                            // Determine the image source
                            let imageSrc = "";
                            if (typeof message.attachment === "string") {
                              imageSrc = message.attachment;
                            } else if (message.attachment.url) {
                              imageSrc = message.attachment.url;
                            } else if (
                              message.attachment.base64 ||
                              message.attachment.data
                            ) {
                              imageSrc = `data:${message.attachment.type};base64,${message.attachment.base64 || message.attachment.data}`;
                            }

                            // console.log('Image source:', imageSrc);

                            return (
                              <div className="image-attachment-wrapper">
                                <img
                                  src={imageSrc}
                                  alt={
                                    message.attachment.name ||
                                    "Image attachment"
                                  }
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "300px",
                                    borderRadius: "8px",
                                    display: "block",
                                    objectFit: "contain",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => {
                                    // Open image in new tab for full view
                                    const newWindow = window.open();
                                    newWindow.document.write(`
                                  <html>
                                    <head><title>${message.attachment.name || "Image"}</title></head>
                                    <body style="margin:0;padding:20px;background:#f0f0f0;text-align:center;">
                                      <img src="${imageSrc}" 
                                           style="max-width:100%;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" 
                                           alt="${message.attachment.name || "Image"}" />
                                      <p style="margin-top:10px;color:#666;font-family:Arial,sans-serif;">${message.attachment.name || "Image"}</p>
                                    </body>
                                  </html>
                                `);
                                  }}
                                  onError={(e) => {
                                    console.error("Failed to load image:", e);
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display =
                                      "block";
                                  }}
                                />
                                <div
                                  style={{
                                    display: "none",
                                    padding: "10px",
                                    textAlign: "center",
                                    color: "#666",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      marginRight: "8px",
                                    }}
                                  >
                                    🖼️
                                  </span>
                                  <span>
                                    {message.attachment.name || "Image"} (Failed
                                    to load)
                                  </span>
                                </div>
                              </div>
                            );
                          } else if (
                            message.attachment.type === "application/pdf" ||
                            (typeof message.attachment === "string" &&
                              message.attachment.toLowerCase().includes(".pdf"))
                          ) {
                            // Determine the file source
                            let fileSrc = "";
                            if (typeof message.attachment === "string") {
                              fileSrc = message.attachment;
                            } else if (message.attachment.url) {
                              fileSrc = message.attachment.url;
                            }

                            return (
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      color: "#dc3545",
                                      marginRight: "8px",
                                    }}
                                  >
                                    📄
                                  </span>
                                  <span style={{ color: "#a2a2a3" }}>
                                    {message.attachment.name || "PDF Document"}
                                  </span>
                                </div>
                                <a
                                  href={fileSrc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="border-0"
                                  style={{
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                    textDecoration: "none",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      marginRight: "4px",
                                    }}
                                  >
                                    <i className="bi bi-download"></i>
                                  </span>
                                </a>
                              </div>
                            );
                          } else if (
                            (message.attachment.type &&
                              (message.attachment.type ===
                                "application/msword" ||
                                message.attachment.type ===
                                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) ||
                            (typeof message.attachment === "string" &&
                              (message.attachment
                                .toLowerCase()
                                .includes(".doc") ||
                                message.attachment
                                  .toLowerCase()
                                  .includes(".docx")))
                          ) {
                            // Determine the file source
                            let fileSrc = "";
                            if (typeof message.attachment === "string") {
                              fileSrc = message.attachment;
                            } else if (message.attachment.url) {
                              fileSrc = message.attachment.url;
                            }

                            return (
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      color: "#007bff",
                                      marginRight: "8px",
                                    }}
                                  >
                                    📝
                                  </span>
                                  <span>
                                    {message.attachment.name || "Word Document"}
                                  </span>
                                </div>
                                <a
                                  href={fileSrc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn border-0"
                                  style={{
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                    textDecoration: "none",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      marginRight: "4px",
                                    }}
                                  >
                                    <i className="bi bi-download"></i>
                                  </span>
                                </a>
                              </div>
                            );
                          } else {
                            // Determine the file source
                            let fileSrc = "";
                            if (typeof message.attachment === "string") {
                              fileSrc = message.attachment;
                            } else if (message.attachment.url) {
                              fileSrc = message.attachment.url;
                            }

                            return (
                              <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center">
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      color: "#6c757d",
                                      marginRight: "8px",
                                    }}
                                  >
                                    📎
                                  </span>
                                  <span>
                                    {message.attachment.name ||
                                      "File Attachment"}
                                  </span>
                                </div>
                                <a
                                  href={fileSrc}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn border-0"
                                  style={{
                                    fontSize: "12px",
                                    padding: "4px 8px",
                                    textDecoration: "none",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "14px",
                                      marginRight: "4px",
                                    }}
                                  >
                                    <i className="bi bi-download"></i>
                                  </span>
                                </a>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}
                    {message.syncFailed && (
                      <div className="sync-failed-indicator mt-2">
                        <small className="text-warning">
                          <Icon name="alert-circle" className="me-1" />
                          Message may not have been saved
                        </small>
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <span className="text-[10px] text-gray-300" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {item.date}
                        {message.is_edited && (
                          <span style={{ color: "#fff", marginLeft: "4px" }}>
                            <small>(edited)</small>
                          </span>
                        )}
                        {/* Always-visible seen tick */}
                        <span style={{ marginLeft: "4px", lineHeight: 1 }}>
                          {(message.is_read || (message.read_receipts && message.read_receipts.length > 0))
                            ? <i className="bi bi-check2-all" style={{ color: "#1ee0ac", fontSize: "13px" }} title="Seen" />
                            : <i className="bi bi-check2" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }} title="Delivered" />
                          }
                        </span>
                      </span>
                    </div>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GroupYouChat = ({
  item,
  message,
  onReply,
  onForward,
  onScrollToMessage,
  highlightedMessageId,
  isDeleted,
  isOnlyEmojis,
}) => {
  return (
    <div id={`message-${message.id}`} className={`chat is-you my-1 ${highlightedMessageId === message.id ? 'highlight-message' : ''}`}>
      <div className="chat-avatar">
        <UserAvatar
          theme="primary"
          text={(message.user?.first_name || "U").slice(0, 1).toUpperCase()}
        />
      </div>
      <div className="chat-content" style={{ display: "flex" }}>
        <div style={{ flex: 1 }}>
          <ul className="chat-meta">
            Delivered:{" "}
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
            })}
            {message.is_read && message.read && (
              <span style={{ marginLeft: "8px" }}>
                Read:{" "}
                {formatDistanceToNow(
                  new Date(message.read_at || message.updated_at),
                  { addSuffix: true },
                )}
              </span>
            )}
            {/* <li>{message.user?.first_name ? message.user?.first_name : "You"}</li> */}
          </ul>
          <div className="chat-bubble">
            <div
              className={`chat-msg w-100 ${isDeleted ? "deleted-message bg-light text-muted" : ""}`}
              style={{
                fontSize:
                  !message.attachment && isOnlyEmojis(message?.message)
                    ? "40px"
                    : "inherit",
                lineHeight:
                  !message.attachment && isOnlyEmojis(message?.message)
                    ? "1.2"
                    : "inherit",
              }}
            >
              {isDeleted ? (
                <span style={{ fontStyle: "italic" }}>Message has been deleted</span>
              ) : (
                <>
                  {(message.type === "reply" ||
                    message.type === "group_message_reply") &&
                    message.parentMsg && (
                      <div 
                        className="reply-context mb-2" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => onScrollToMessage(message.parentMsg.id)}
                      >
                        <div style={{ fontSize: "0.85em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {(message.parentMsg?.message || message.parentMsg?.content || "")?.slice(0, 50)}
                          {(message.parentMsg?.message || message.parentMsg?.content || "").length > 50 ? "..." : ""}
                        </div>
                      </div>
                    )}
                  {message.is_forwarded && (
                    <div style={{ fontSize: "11px", opacity: 0.7, marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <i className="bi bi-reply-fill" style={{ fontSize: "11px", transform: "scaleX(-1)" }}></i>
                      <span>Forwarded</span>
                    </div>
                  )}
                  {renderMessageWithLinks(message.message || message?.mention_message || message.reply_message || "")}
              {message.attachment && !isDeleted && (
                <div className="attachment-container mt-2">
                  {/* {console.log('Rendering attachment (GroupYouChat):', message.attachment)} */}
                  {/* {console.log('Attachment type (GroupYouChat):', message.attachment.type)} */}
                  {/* {console.log('Is image (GroupYouChat):', message.attachment.type && message.attachment.type.startsWith('image/'))} */}
                  {(() => {
                    // Handle different attachment formats
                    const isImageByType =
                      message.attachment.type &&
                      message.attachment.type.startsWith("image/");
                    const isImageByUrl =
                      typeof message.attachment === "string" &&
                      /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                        message.attachment,
                      );
                    const isImageByUrlInObject =
                      message.attachment.url &&
                      /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                        message.attachment.url,
                      );
                    const isImage =
                      isImageByType || isImageByUrl || isImageByUrlInObject;

                    // console.log('Is image by type (GroupYouChat):', isImageByType);
                    // console.log('Is image by URL string (GroupYouChat):', isImageByUrl);
                    // console.log('Is image by URL in object (GroupYouChat):', isImageByUrlInObject);
                    // console.log('Final is image (GroupYouChat):', isImage);

                    if (isImage) {
                      // Determine the image source
                      let imageSrc = "";
                      if (typeof message.attachment === "string") {
                        imageSrc = message.attachment;
                      } else if (message.attachment.url) {
                        imageSrc = message.attachment.url;
                      } else if (
                        message.attachment.base64 ||
                        message.attachment.data
                      ) {
                        imageSrc = `data:${message.attachment.type};base64,${message.attachment.base64 || message.attachment.data}`;
                      }

                      // console.log('Image source (GroupYouChat):', imageSrc);

                      return (
                        <div className="image-attachment-wrapper">
                          <img
                            src={imageSrc}
                            alt={message.attachment.name || "Image attachment"}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "300px",
                              borderRadius: "8px",
                              display: "block",
                              objectFit: "contain",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              // Open image in new tab for full view
                              const newWindow = window.open();
                              newWindow.document.write(`
                              <html>
                                <head><title>${message.attachment.name || "Image"}</title></head>
                                <body style="margin:0;padding:20px;background:#f0f0f0;text-align:center;">
                                  <img src="${imageSrc}" 
                                       style="max-width:100%;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" 
                                       alt="${message.attachment.name || "Image"}" />
                                  <p style="margin-top:10px;color:#666;font-family:Arial,sans-serif;">${message.attachment.name || "Image"}</p>
                                </body>
                              </html>
                            `);
                            }}
                            onError={(e) => {
                              console.error("Failed to load image:", e);
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "block";
                            }}
                          />
                          <div
                            style={{
                              display: "none",
                              padding: "10px",
                              textAlign: "center",
                              color: "#666",
                            }}
                          >
                            <span
                              style={{ fontSize: "20px", marginRight: "8px" }}
                            >
                              🖼️
                            </span>
                            <span>
                              {message.attachment.name || "Image"} (Failed to
                              load)
                            </span>
                          </div>
                        </div>
                      );
                    } else if (
                      message.attachment.type === "application/pdf" ||
                      (typeof message.attachment === "string" &&
                        message.attachment.toLowerCase().includes(".pdf"))
                    ) {
                      // Determine the file source
                      let fileSrc = "";
                      if (typeof message.attachment === "string") {
                        fileSrc = message.attachment;
                      } else if (message.attachment.url) {
                        fileSrc = message.attachment.url;
                      }

                      return (
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <span
                              style={{
                                fontSize: "20px",
                                color: "#dc3545",
                                marginRight: "8px",
                              }}
                            >
                              📄
                            </span>
                            <span>
                              {message.attachment.name || "PDF Document"}
                            </span>
                          </div>
                          <a
                            href={fileSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn border-0"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              textDecoration: "none",
                            }}
                          >
                            <span
                              style={{ fontSize: "14px", marginRight: "4px" }}
                            >
                              <i className="bi bi-download"></i>
                            </span>
                          </a>
                        </div>
                      );
                    } else if (
                      (message.attachment.type &&
                        (message.attachment.type === "application/msword" ||
                          message.attachment.type ===
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) ||
                      (typeof message.attachment === "string" &&
                        (message.attachment.toLowerCase().includes(".doc") ||
                          message.attachment.toLowerCase().includes(".docx")))
                    ) {
                      // Determine the file source
                      let fileSrc = "";
                      if (typeof message.attachment === "string") {
                        fileSrc = message.attachment;
                      } else if (message.attachment.url) {
                        fileSrc = message.attachment.url;
                      }

                      return (
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <span
                              style={{
                                fontSize: "20px",
                                color: "#007bff",
                                marginRight: "8px",
                              }}
                            >
                              📝
                            </span>
                            <span>
                              {message.attachment.name || "Word Document"}
                            </span>
                          </div>
                          <a
                            href={fileSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn border-0"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              textDecoration: "none",
                            }}
                          >
                            <span
                              style={{ fontSize: "14px", marginRight: "4px" }}
                            >
                              <i className="bi bi-download"></i>
                            </span>
                          </a>
                        </div>
                      );
                    } else {
                      // Determine the file source
                      let fileSrc = "";
                      if (typeof message.attachment === "string") {
                        fileSrc = message.attachment;
                      } else if (message.attachment.url) {
                        fileSrc = message.attachment.url;
                      }

                      return (
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center">
                            <span
                              style={{
                                fontSize: "20px",
                                color: "#6c757d",
                                marginRight: "8px",
                              }}
                            >
                              📎
                            </span>
                            <span>
                              {message.attachment.name || "File Attachment"}
                            </span>
                          </div>
                          <a
                            href={fileSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn border-0"
                            style={{
                              fontSize: "12px",
                              padding: "4px 8px",
                              textDecoration: "none",
                            }}
                          >
                            <span
                              style={{ fontSize: "14px", marginRight: "4px" }}
                            >
                              <i className="bi bi-download"></i>
                            </span>
                          </a>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}
              <div className="mt-2 flex justify-end">
                <span className="text-[10px] text-gray-300">
                  {item.date}
                  {message.is_edited && (
                    <span className="text-muted ms-1">
                      <small>(edited)</small>
                    </span>
                  )}
                </span>
              </div>
                </>
              )}
            </div>
          </div>
          <ul className="chat-meta">
            <li>{message.user?.first_name || "User"}</li>
            <li>{item.date}</li>
            {message.is_edited && (
              <li className="text-muted"><small>(edited)</small></li>
            )}
          </ul>
        </div>
        {!isDeleted && (
          <div className="ms-2">
            <button
              className="btn border-0"
              onClick={() => onReply(message)}
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              <Icon name="reply" className="me-1" />
            </button>
            <button
              className="btn border-0"
              onClick={() => onForward(message)}
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              <i className="bi bi-forward"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// export const GroupReplyChat = ({ reply, originalMessage, onEdit, onDelete, onReply }) => {
//   const [menuOpen, setMenuOpen] = useState(false);
//   const currentUserId = parseInt(localStorage.getItem("userId") || "0");
//   const isOwnReply = reply.user.id === currentUserId || reply.user?.id === currentUserId;
//   const isDeleted = reply.reply_message === 'Reply deleted';

//   return (
//     <div className={`chat ${isOwnReply ? 'is-me' : 'is-you'}`}>
//       {!isOwnReply && (
//         <div className="chat-avatar">
//           <UserAvatar
//             theme="secondary"
//             text={(reply.user?.first_name || "U").slice(0, 1).toUpperCase()}
//             size="sm"
//           />
//         </div>
//       )}
//       {!isDeleted && (
//         <div className="ms-2">
//           <button
//             className="btn border-0"
//             onClick={() => onReply(reply)}
//             style={{ fontSize: '12px', padding: '4px 8px' }}
//           >
//             <Icon name="reply" className="me-1" />
//           </button>
//         </div>
//       )}
//       <div className="chat-content">
//         <div className="chat-bubbles">
//           <div className="reply-context mb-2">
//             <small className="text-muted">
//               Replying to {originalMessage?.user?.first_name || 'User'}: {originalMessage?.message?.slice(0, 50)}
//               {originalMessage?.message?.length > 50 ? '...' : ''}
//             </small>
//           </div>
//           <div className="chat-bubble">
//             <div className={`chat-msg ${isOwnReply ? 'bg-primary' : ''} ${isDeleted ? 'deleted-message bg-light text-muted' : ''}`}>
//               {reply.reply_message || 'Empty reply'}
//             </div>

//             {isOwnReply && !isDeleted && (
//               <ul className="chat-msg-more">
//                 <li className="d-sm-block">
//                   <UncontrolledDropdown isOpen={menuOpen} toggle={() => setMenuOpen(!menuOpen)}>
//                     <DropdownToggle tag="a" className="btn btn-icon btn-sm btn-trigger dropdown-toggle">
//                       <Icon name="more-h" />
//                     </DropdownToggle>
//                     <DropdownMenu end>
//                       <ul className="link-list-opt no-bdr">
//                         <li>
//                           <DropdownItem
//                             tag="a"
//                             href="#edit"
//                             onClick={(ev) => {
//                               ev.preventDefault();
//                               setMenuOpen(false);
//                               onEdit(reply, reply.original_message_id);
//                             }}
//                           >
//                             <Icon name="edit" className="me-2" />
//                             Edit
//                           </DropdownItem>
//                         </li>
//                         <li>
//                           <DropdownItem
//                             tag="a"
//                             href="#delete"
//                             onClick={(ev) => {
//                               ev.preventDefault();
//                               setMenuOpen(false);
//                               onDelete(reply.id);
//                             }}
//                           >
//                             <Icon name="trash" className="me-2" />
//                             Delete
//                           </DropdownItem>
//                         </li>
//                       </ul>
//                     </DropdownMenu>
//                   </UncontrolledDropdown>
//                 </li>
//               </ul>
//             )}
//           </div>
//         </div>
//         <ul className="chat-meta">
//           <li>{isOwnReply ? 'You' : reply.user?.first_name || 'User'}</li>
//           <li>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</li>
//           {reply.updated_at !== reply.created_at && (
//             <li className="text-muted">
//               {/* <small>(edited)</small> */}
//             </li>
//           )}
//         </ul>

//       </div>
//     </div>
//   );
// };

export const MetaChat = ({ item }) => {
  return (
    <div className="chat-sap">
      <div className="chat-sap-meta">
        <span>{item}</span>
      </div>
    </div>
  );
};
