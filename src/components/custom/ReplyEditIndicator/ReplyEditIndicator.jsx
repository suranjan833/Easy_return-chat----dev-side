import { Button } from 'react-bootstrap';

const ReplyEditIndicator = ({ replyingTo, editMessageId, editingReply, cancelReply }) => {
    if (!replyingTo && !editMessageId && !editingReply) {
        return null;
    }

    // Determine the parent message content from replyingTo
    const getParentContent = () => {
        if (!replyingTo) return null;
        // Regular message has .content, reply has .reply_message
        return replyingTo.content || replyingTo.reply_message || "";
    };

    const getSenderName = () => {
        if (!replyingTo) return "";
        if (replyingTo.user?.first_name) return replyingTo.user.first_name;
        // replies have user_id or user object
        return replyingTo.sender?.first_name || "User";
    };

    return (
        <div
            style={{
                padding: "8px 16px",
                backgroundColor: "#f0f4ff",
                borderTop: "1px solid #d0d7ef",
                borderBottom: "1px solid #d0d7ef"
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: "#6576ff", fontWeight: 600, marginBottom: "2px" }}>
                        <i className="bi bi-reply-fill" style={{ marginRight: "4px", fontSize: "10px" }}></i>
                        {editMessageId && "Editing message"}
                        {editingReply && "Editing reply"}
                        {replyingTo && `Replying to ${getSenderName()}`}
                    </div>
                    {(replyingTo || editingReply) && (
                        <div
                            style={{
                                fontSize: "12px",
                                color: "#495057",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "100%",
                                paddingLeft: "14px",
                                borderLeft: "2px solid #6576ff",
                                lineHeight: "1.4",
                            }}
                        >
                            {replyingTo && getParentContent()}
                            {editingReply && (editingReply.reply_message || "")}
                        </div>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={cancelReply}
                    style={{
                        padding: "2px 8px",
                        fontSize: "10px",
                        flexShrink: 0,
                        borderRadius: "12px",
                        border: "1px solid #d0d7ef",
                        color: "#6576ff",
                    }}
                >
                    <i className="bi bi-x"></i> Cancel
                </Button>
            </div>
        </div>
    );
};

export default ReplyEditIndicator;
