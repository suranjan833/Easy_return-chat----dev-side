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
                        <span style={{ fontSize: "14px", color: "#606770" }}>
                            {editingReply
                                ? `Editing reply to ${messages?.find((msg) => msg.id === editingReply.id)?.user?.first_name || 'User'}: ${messages?.find((msg) => msg.id === editingReply.id)?.reply_message?.slice(0, 50) || ''}${messages?.find((msg) => msg.id === editingReply.id)?.reply_message?.length > 50 ? '...' : ''}`
                                : `Replying to ${replyingTo.user?.first_name || 'User'}: ${replyingTo?.message ? replyingTo?.message?.slice(0, 50) : replyingTo?.reply_message?.slice(0, 50)}${replyingTo.message?.length > 50 ? '...' : ''}`}
                        </span>

                        <Button
                            color="link"
                            className="text-danger p-0"
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
