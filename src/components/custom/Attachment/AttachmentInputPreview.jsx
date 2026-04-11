const AttachmentInputPreview = ({ selectedFile, filePreview, onRemove }) => {
  if (!selectedFile || !filePreview) {
    return null;
  }

  return (
    <div
      style={{
        padding: "10px 14px",
        background: "#F3F3F3",
        display: "flex",
        alignItems: "center",
        borderTop: "1px solid #E5E5E5",
        borderBottom: "1px solid #E5E5E5",
        gap: "12px",
        boxShadow: "0px 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      {/* Thumbnail */}
      {selectedFile?.type?.startsWith("image/") ||
      selectedFile?.content_type?.startsWith("image/") ? (
        <img
          src={selectedFile.data}
          alt="preview"
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            objectFit: "cover",
            border: "1px solid #dcdcdc",
            background: "#fff",
          }}
        />
      ) : (
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "12px",
            backgroundColor: "#e9ecef",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            color: "#6c757d",
          }}
        >
          <i
            className={`bi ${
              selectedFile?.type?.includes("pdf") ||
              selectedFile?.content_type?.includes("pdf")
                ? "bi-file-earmark-pdf"
                : selectedFile?.type?.includes("word") ||
                    selectedFile?.content_type?.includes("word")
                  ? "bi-file-earmark-word"
                  : selectedFile?.type?.includes("excel") ||
                      selectedFile?.content_type?.includes("excel")
                    ? "bi-file-earmark-excel"
                    : "bi-file-earmark"
            }`}
          ></i>
        </div>
      )}

      {/* File Details */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div
          style={{
            fontSize: "15px",
            maxWidth: "300px",
            fontWeight: 600,
            color: "#333",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedFile?.name ? selectedFile.name : selectedFile?.filename}
        </div>
        {selectedFile.size && (
          <div style={{ fontSize: "12px", color: "#777" }}>
            {selectedFile?.type?.split("/")[0]} •{" "}
            {Math.round(selectedFile.size / 1024)} KB
          </div>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        style={{
          border: "none",
          background: "#fff",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          boxShadow: "0 0 5px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "18px",
          color: "#444",
        }}
      >
        ×
      </button>
    </div>
  );
};

export default AttachmentInputPreview;
