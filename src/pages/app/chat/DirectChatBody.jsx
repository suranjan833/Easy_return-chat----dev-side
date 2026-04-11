// import React, { useContext, useMemo, useRef, useEffect } from "react";
// import SimpleBar from "simplebar-react";
// import { Button } from "@/components/Component";
// import { DirectChatContext } from "./DirectChatContext";
// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com";

// const formatTime = (timestamp) => {
//   if (!timestamp) return "";
//   const date = new Date(timestamp);
//   return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
// };

// const formatDateSeparator = (timestamp) => {
//   if (!timestamp) return "";
//   const date = new Date(timestamp);
//   const today = new Date();
//   const yesterday = new Date();
//   yesterday.setDate(today.getDate() - 1);
//   if (date.toDateString() === today.toDateString()) return "Today";
//   if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
//   return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).split("/").join("/");
// };

// export default function DirectChatBody() {
//   const {
//     activeUser,
//     messages,
//     typingUsers,
//     isSelectionMode,
//     selectedMessages,
//     setSelectedMessages,
//     setIsSelectionMode,
//     replyToMessage,
//     setReplyToMessage,
//     editingMessageId,
//     editContent,
//     setEditContent,
//     handleTyping,
//     sendMessage,
//     startEditing,
//     cancelEditing,
//     attachment,
//     setAttachment,
//     isFileUploading,
//     handleFileChange,
//     deleteSelected,
//   } = useContext(DirectChatContext);

//   const formRef = useRef(null);
//   const fileRef = useRef(null);
//   const scrollRef = useRef(null);

// const onSubmit = (e) => {
//   e.preventDefault();
//   if (editContent.trim() || attachment) {
//     sendMessage(editContent);
//     setEditContent("");
//     setReplyToMessage(null);
//     if (fileRef.current) fileRef.current.value = null;
//   }
// };

//   useEffect(() => {
//     if (scrollRef.current) {
//       const el = scrollRef.current.getScrollElement();
//       el.scrollTop = el.scrollHeight;
//     }
//   }, [messages]);

//   if (!activeUser) {
//     return (
//       <div className="nk-chat-body">
//         <div className="nk-chat-blank">
//           <div className="nk-chat-blank-icon">
//             <div className="icon-circle icon-circle-xxl bg-white">💬</div>
//           </div>
//           <div className="nk-chat-blank-text">Select a chat to start messaging</div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="nk-chat-body show-chat">
//       <div className="nk-chat-head">
//         <ul className="nk-chat-head-info">
//           <li className="nk-chat-head-user">
//             <div className="user-card">
//               <div className="user-info">
//                 <div className="lead-text">
//                   {activeUser.first_name} {activeUser.last_name || ""}
//                 </div>
//               </div>
//             </div>
//           </li>
//         </ul>
//         <ul className="nk-chat-head-tools">
//           {isSelectionMode ? (
//             <li>
//               <Button size="sm" color="danger" onClick={deleteSelected} disabled={!selectedMessages.length}>
//                 Delete
//               </Button>
//             </li>
//           ) : null}
//           <li>
//             <Button size="sm" onClick={() => setIsSelectionMode((v) => !v)}>
//               {isSelectionMode ? "Cancel" : "Select"}
//             </Button>
//           </li>
//         </ul>
//       </div>

// <SimpleBar className="nk-chat-panel" scrollableNodeProps={{ ref: (n) => (scrollRef.current = n) }}>
//   {messages.length === 0 ? (
//     <div className="text-center text-muted my-3">No messages yet.</div>
//   ) : (
//     messages.map((m, idx, arr) => {
//       const showDate = idx === 0 || new Date(arr[idx - 1].timestamp).toDateString() !== new Date(m.timestamp).toDateString();
//       return (
//         <React.Fragment key={m.id || idx}>
//           {showDate && (
//             <div className="text-center my-2">
//               <span className="badge bg-light text-dark">{formatDateSeparator(m.timestamp)}</span>
//             </div>
//           )}
//           <div className={`d-flex mb-2 ${m.sender_id === activeUser.id ? "justify-content-start" : "justify-content-end"}`}>
//             <div className={`p-2 rounded ${m.sender_id === activeUser.id ? "bg-white" : "bg-primary text-white"}`} style={{ maxWidth: "70%" }}>
//               {m.reply && (
//                 <div className="reply-context mb-2" style={{
//                   padding: "8px",
//                   background: m.sender_id === activeUser.id ? "#f8f9fa" : "rgba(255,255,255,0.1)",
//                   borderRadius: "6px",
//                   borderLeft: "3px solid #25d366"
//                 }}>
//                   <div>
//                     <small className={m.sender_id === activeUser.id ? "text-muted" : "text-white-50"} style={{ fontSize: "12px" }}>
//                       <strong>{m.reply.user?.first_name || 'User'}:</strong> {m.reply.reply_content}
//                     </small>
//                     <small style={{ display: 'block', fontSize: '10px', color: m.sender_id === activeUser.id ? '#666' : '#ccc' }}>
//                       {new Date(m.reply.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
//                       {m.reply.updated_at && m.reply.updated_at !== m.reply.created_at && ' (edited)'}
//                     </small>
//                   </div>
//                 </div>
//               )}
//               {m.content && <div className="mb-1">{m.content}</div>}
//               {m.attachment && (
//                 <div className="mb-1">
//                   <a
//                     href={`${API_BASE_URL}/messaging/upload-file/${m.attachment.filename}`}
//                     target="_blank"
//                     rel="noreferrer"
//                   >
//                     {m.attachment.filename || "Attachment"}
//                   </a>
//                 </div>
//               )}
//               <div className="d-flex align-items-center">
//                 <small className={m.sender_id === activeUser.id ? "text-muted" : "text-white-50"}>
//                   {m.edited ? "edited " : ""}
//                   {formatTime(m.timestamp)}
//                 </small>
//                 {m.sender_id !== activeUser.id && (
//                   <span className="ms-2">
//                     {m.read ? (
//                       <i className="bi bi-check2-all text-success" title="Read"></i>
//                     ) : m.delivered ? (
//                       <i className="bi bi-check2 text-primary" title="Delivered"></i>
//                     ) : null}
//                   </span>
//                 )}
//               </div>
//               <div className="mt-1 d-flex gap-2">
//                 <Button size="xs" onClick={() => setReplyToMessage(m)}>
//                   Reply
//                 </Button>
//                 {m.sender_id === activeUser.id && (
//                   <Button size="xs" onClick={() => startEditing(m)}>
//                     Edit
//                   </Button>
//                 )}
//                 {isSelectionMode && (
//                   <input
//                     type="checkbox"
//                     checked={selectedMessages.includes(m.id)}
//                     onChange={() =>
//                       setSelectedMessages((prev) =>
//                         prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
//                       )
//                     }
//                   />
//                 )}
//               </div>
//             </div>
//           </div>
//         </React.Fragment>
//       );
//     })
//   )}
//   {activeUser && typingUsers[activeUser.id] && (
//     <div className="d-flex mb-2 justify-content-start">
//       <div className="p-2 bg-white rounded">
//         <small className="text-muted">{activeUser.first_name} is typing...</small>
//       </div>
//     </div>
//   )}
// </SimpleBar>

//       <div className="nk-chat-editor">
//   {replyToMessage && (
//     <div className="reply-preview" style={{
//       padding: "8px 16px",
//       background: "#e8ecef",
//       borderLeft: "4px solid #25d366",
//       margin: "0 16px 8px 16px",
//       borderRadius: "8px"
//     }}>
//       <div className="d-flex align-items-center justify-content-between">
//         <span style={{ fontSize: "14px", color: "#606770" }}>
//           Replying to: {replyToMessage.content?.slice(0, 50)}{replyToMessage.content?.length > 50 ? '...' : ''}
//         </span>
//         <Button
//           color="link"
//           className="text-danger p-0"
//           onClick={() => {
//              // Debug log
//             setReplyToMessage(null);
//           }}
//           style={{ fontSize: "14px" }}
//         >
//           ✕
//         </Button>
//       </div>
//     </div>
//   )}

//   {editingMessageId && (
//     <div className="reply-preview" style={{
//       padding: "8px 16px",
//       background: "#fff3cd",
//       borderLeft: "4px solid #ffc107",
//       margin: "0 16px 8px 16px",
//       borderRadius: "8px"
//     }}>
//       <div className="d-flex align-items-center justify-content-between">
//         <span style={{ fontSize: "14px", color: "#856404" }}>
//           Editing message
//         </span>
//         <Button
//           color="link"
//           className="text-danger p-0"
//           onClick={cancelEditing}
//           style={{ fontSize: "14px" }}
//         >
//           ✕
//         </Button>
//       </div>
//     </div>
//   )}

//   {attachment && (
//     <div className="attachment-preview-container" style={{
//       padding: "8px 16px",
//       background: "#f8f9fa",
//       borderLeft: "4px solid #007bff",
//       margin: "0 16px 8px 16px",
//       borderRadius: "8px"
//     }}>
//       <div className="d-flex align-items-center justify-content-between">
//         <div className="d-flex align-items-center">
//           <span style={{ fontSize: '12px', color: '#666', marginRight: '8px' }}>📎</span>
//           <span style={{ fontSize: '14px' }}>{attachment.filename}</span>
//           {isFileUploading && <span className="spinner-border spinner-border-sm ms-2" role="status" />}
//         </div>
//         <Button
//           color="link"
//           className="text-danger p-0"
//           onClick={() => {
//             setAttachment(null);
//             if (fileRef.current) fileRef.current.value = null;
//           }}
//           style={{ fontSize: "14px" }}
//         >
//           ✕
//         </Button>
//       </div>
//     </div>
//   )}

//   <form ref={formRef} onSubmit={(e) => {
//     e.preventDefault();
//     if (editContent.trim() || attachment) {
//       console.log('[DirectChatBody] Submitting with replyToMessage:', replyToMessage); // Debug log
//       sendMessage(editContent);
//       setEditContent("");
//       setReplyToMessage(null);
//       if (fileRef.current) fileRef.current.value = null;
//     }
//   }}>
//     <div className="form-control-wrap d-flex gap-2">
//       <button
//         type="button"
//         className="btn btn-outline-secondary"
//         title="Attach File"
//         onClick={() => fileRef.current && fileRef.current.click()}
//         disabled={isFileUploading}
//       >
//         <i className="bi bi-paperclip"></i>
//       </button>
//       <input
//         type="file"
//         ref={fileRef}
//         style={{ display: "none" }}
//         onChange={(e) => handleFileChange(e.target.files?.[0])}
//         accept="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//       />
//       <input
//         type="text"
//         className="form-control form-control-simple"
//         placeholder={
//           editingMessageId ? 'Edit your message...' :
//             replyToMessage ? 'Type your reply...' :
//               'Type a message...'
//         }
//         value={editContent}
//         onChange={(e) => {
//           handleTyping();
//           setEditContent(e.target.value);
//         }}
//         onKeyDown={(e) => {
//           if (e.code === "Enter" && !e.shiftKey) {
//             e.preventDefault();
//             if (editContent.trim() || attachment) {
//               console.log('[DirectChatBody] Enter key with replyToMessage:', replyToMessage); // Debug log
//               sendMessage(editContent);
//               setEditContent("");
//               setReplyToMessage(null);
//               if (fileRef.current) fileRef.current.value = null;
//             }
//           }
//         }}
//         disabled={isFileUploading}
//       />
//       <Button color="primary" type="submit" disabled={isFileUploading} className="btn-round btn-icon p-2">
//         {editingMessageId ? "✓" : "➤"}
//       </Button>
//     </div>
//   </form>
// </div>
//     </div>
//   );
// }


