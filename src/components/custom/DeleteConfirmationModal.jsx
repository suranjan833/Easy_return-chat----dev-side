
const DeleteConfirmationModal = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            style={{
                padding: "10px 14px",
                background: "#FFF3CD", // Light orange background for warning
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                borderTop: "1px solid #FFECB3",
                borderBottom: "1px solid #FFECB3",
                gap: "8px",
                boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
                color: "#664D03", // Dark yellow text
            }}
        >
            <div style={{ fontWeight: 600, fontSize: "15px" }}>
                Confirm Deletion
            </div>
            <div style={{ fontSize: "14px" }}>
                Are you sure you want to delete this {message.type}?
            </div>
            {message.content && (
                <p
                    style={{
                        fontSize: "13px",
                        fontStyle: "italic",
                        marginBottom: "0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                    }}
                >
                    "{message.content}"
                </p>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                <button
                    onClick={onConfirm}
                    style={{
                        background: "#DC3545", // Red for delete
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 15px",
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    Delete
                </button>
                <button
                    onClick={onCancel}
                    style={{
                        background: "#6C757D", // Grey for cancel
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 15px",
                        cursor: "pointer",
                        fontWeight: 600,
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
