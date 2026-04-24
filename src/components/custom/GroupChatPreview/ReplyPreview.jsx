// Assuming 'Button' is a component that needs to be imported, adjust path as necessary
// import { Button } from 'some-ui-library'; 

import { Button } from "reactstrap";

const ReplyPreview = ({ replyingTo, editingReply, messages, cancelReply }) => {
    return (
        <>
            {(replyingTo || editingReply) && (
                <div className="reply-preview" style={{
                    padding: "8px 16px",
                    background: "#e8ecef",
                    borderLeft: "4px solid #25d366",
                    margin: "0 16px 8px 16px",
                    borderRadius: "8px"
                }}>
                    <div className="d-flex align-items-center justify-content-between">
                        <div style={{ fontSize: "14px", color: "#606770", overflow: "hidden" }}>
                            {editingReply ? (
                                <>
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#6576ff", marginBottom: "2px" }}>
                                        {messages?.find((msg) => msg.id === editingReply.id)?.user?.first_name || "User"}
                                    </div>
                                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {messages?.find((msg) => msg.id === editingReply.id)?.reply_message?.slice(0, 50) || ""}
                                        {messages?.find((msg) => msg.id === editingReply.id)?.reply_message?.length > 50 ? "..." : ""}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#6576ff", marginBottom: "2px" }}>
                                        {replyingTo?.user?.first_name
                                            ? `${replyingTo.user.first_name} ${replyingTo.user.last_name || ""}`.trim()
                                            : replyingTo?.sender?.first_name
                                            ? `${replyingTo.sender.first_name} ${replyingTo.sender.last_name || ""}`.trim()
                                            : "User"}
                                    </div>
                                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {(replyingTo?.message || replyingTo?.reply_message || "").slice(0, 50)}
                                        {(replyingTo?.message || replyingTo?.reply_message || "").length > 50 ? "..." : ""}
                                    </div>
                                </>
                            )}
                        </div>
                        <Button
                            color="link"
                            className="text-danger p-0 ms-2 flex-shrink-0"
                            onClick={cancelReply}
                            style={{ fontSize: "14px" }}
                        >
                            ✕
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReplyPreview;
