const BlockUserModal = ({ isOpen, userName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      padding: "10px 14px",
      background: "#FFF0F0",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      borderTop: "1px solid #FFCCCC",
      borderBottom: "1px solid #FFCCCC",
      gap: "8px",
      boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
      color: "#7B0000",
    }}>
      <div style={{ fontWeight: 600, fontSize: "15px" }}>Block User</div>
      <div style={{ fontSize: "14px" }}>
        Are you sure you want to block <strong>{userName || "this user"}</strong>?
      </div>
      <p style={{ fontSize: "13px", marginBottom: 0, color: "#9B1C1C" }}>
        They will no longer be able to create support tickets.
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
        <button
          onClick={onConfirm}
          style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 15px", cursor: "pointer", fontWeight: 600 }}
        >
          Block
        </button>
        <button
          onClick={onCancel}
          style={{ background: "#6C757D", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 15px", cursor: "pointer", fontWeight: 600 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BlockUserModal;
