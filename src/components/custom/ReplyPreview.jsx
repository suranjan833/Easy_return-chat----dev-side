
const ReplyPreview = ({ replyToMessage, setReplyToMessage }) => {
    if (!replyToMessage) {
        return null;
    }

    const content = replyToMessage.content || replyToMessage.reply_content;
    const slicedContent = content ? content.slice(0, 50) : '';
    const needsEllipsis = content && content.length > 50;

    return (
        <div className="modern-reply-preview">
            <div className="modern-reply-preview-content">
                Replying to: {slicedContent}{needsEllipsis ? '...' : ''}
            </div>
            <button
                className="modern-reply-preview-close"
                onClick={() => {
                    setReplyToMessage(null);
                }}
            >
                ✕
            </button>
        </div>
    );
};

export default ReplyPreview;
