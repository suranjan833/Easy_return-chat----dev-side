import { Button } from 'react-bootstrap';

const ReplyEditIndicator = ({ replyingTo, editMessageId, editingReply, cancelReply }) => {
    if (!replyingTo && !editMessageId && !editingReply) {
        return null;
    }

    return (
        <div
            style={{
                padding: "8px 16px",
                backgroundColor: "#f8f9fa",
                borderTop: "1px solid #dee2e6",
                borderBottom: "1px solid #dee2e6"
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>
                    {editMessageId && "Editing message..."}
                    {editingReply && "Editing reply..."}
                    {replyingTo && `Replying to ${replyingTo.user?.first_name || "message"}...`}
                </div>
                <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={cancelReply}
                    style={{ padding: "2px 8px", fontSize: "10px" }}
                >
                    <i className="bi bi-x"></i> Cancel
                </Button>
            </div>
        </div>
    );
};

export default ReplyEditIndicator;
