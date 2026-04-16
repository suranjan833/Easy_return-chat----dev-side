const getFilenameFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf("/") + 1);
  } catch (e) {
    console.error("Error parsing URL for filename:", e);
    return "";
  }
};

const getMimeTypeFromFilename = (filename) => {
  const extension = filename.split(".").pop().toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
};

const AttachmentDisplay = ({ attachment, isMe, message }) => {
  if (!attachment) {
    return null;
  }

  // Determine the filename and URL/base64 content
  let filename = message.attachment?.filename || "";
  let attachmentContent = message.attachment?.content || "";
  let attachmentUrl = message.attachment?.url || "";

  // If attachment is a string, it's likely a URL
  const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://chatsupport.fskindia.com") + "/";

  // Filename priority: attachment path/url > attachment object name > message.content (only if it looks like a filename)
  // message.content is a caption and should NOT be used for extension detection after editing

  if (typeof attachment === "string") {
    attachmentUrl = attachment.startsWith("http")
      ? encodeURI(attachment)
      : encodeURI(BASE_URL + attachment);
    // Derive filename from the URL path
    filename = decodeURIComponent(attachment.split("/").pop().split("?")[0]);
  } else if (attachment?.url) {
    attachmentUrl = attachment.url.startsWith("http")
      ? encodeURI(attachment.url)
      : encodeURI(BASE_URL + attachment.url);
    filename = decodeURIComponent(attachment.url.split("/").pop().split("?")[0]);
  } else if (attachment?.name) {
    filename = attachment.name;
    attachmentContent = attachment.base64 || attachment.data;
  }

  // Use message.content as caption display only — override filename only if it looks like a real filename (has extension)
  if (!filename && message?.content) {
    const raw = message.content.startsWith("File:")
      ? message.content.replace(/^File:\s*/, "").trim()
      : message.content.trim();
    // Only use as filename if it contains a dot (has an extension)
    if (raw.includes(".")) filename = raw;
  }

  if (!filename && attachment?.filename) filename = attachment.filename;

  // Final fallback
  if (!filename) filename = "file";

  const fileExtension = filename.split(".").pop().toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension);
  const isPdf = fileExtension === "pdf";
  const isWord = ["doc", "docx"].includes(fileExtension);
  const isExcel = ["xls", "xlsx"].includes(fileExtension);

  let finalHref;
  let displaySrc;
  let downloadFilename = filename;
  let fileTypeIconClass;

  if (attachmentUrl) {
    finalHref = attachmentUrl;
    displaySrc = isImage ? attachmentUrl : null;
  } else if (attachmentContent) {
    const mimeType = getMimeTypeFromFilename(filename);
    finalHref = `data:${mimeType};base64,${attachmentContent}`;
    displaySrc = isImage ? finalHref : null;
  } else {
    // If no URL or content, nothing to display
    return null;
  }

  const linkClassName = isMe ? "text-white" : "text-dark";

  if (isImage) {
    fileTypeIconClass = "bi bi-image";
  } else if (isPdf) {
    fileTypeIconClass = "bi bi-file-earmark-pdf";
  } else if (isWord) {
    fileTypeIconClass = "bi bi-file-earmark-word";
  } else if (isExcel) {
    fileTypeIconClass = "bi bi-file-earmark-excel";
  } else {
    fileTypeIconClass = "bi bi-paperclip";
  }

  return (
    <div style={{ marginTop: "8px" }}>
      {isImage && displaySrc ? (
        <div
          style={{
            position: "relative",
            display: "inline-block",
            maxWidth: "100%",
          }}
          onClick={() => {
            const newWindow = window.open();
            newWindow.document.write(`
              <html>
                <head><title>${downloadFilename}</title></head>
                <body style="margin:0;padding:20px;background:#f0f0f0;text-align:center;">
                  <img src="${displaySrc}"
                       style="max-width:100%;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);"
                       alt="${downloadFilename}" />
                  <p style="margin-top:10px;color:#666;font-family:Arial,sans-serif;">${downloadFilename}</p>
                </body>
              </html>
            `);
          }}
        >
          <img
            src={displaySrc}
            alt={downloadFilename}
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              width: "auto",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          />
          <a
            href={finalHref}
            download={downloadFilename}
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: "50%",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "16px",
              textDecoration: "none",
              cursor: "pointer",
            }}
            title="Download Image"
            onClick={(e) => e.stopPropagation()}
          >
            <i className="bi bi-download"></i>
          </a>
        </div>
      ) : (
        <a
          href={finalHref}
          download={downloadFilename}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
          }}
        >
          <div
            style={{
              padding: "8px",
              backgroundColor: isMe ? "rgba(255,255,255,0.1)" : "#f0f0f0",
              borderRadius: "6px",
              border: `1px solid ${isMe ? "rgba(255,255,255,0.2)" : "#dee2e6"}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <i
              className={fileTypeIconClass}
              style={{ fontSize: "32px", color: isMe ? "#fff" : "#6c757d" }}
            ></i>
            <span style={{ fontSize: "14px" }}>
              {downloadFilename?.length > 35
                ? downloadFilename.substring(0, 35) + "..."
                : downloadFilename}
            </span>
            <i
              className="bi bi-download"
              style={{
                marginLeft: "auto",
                fontSize: "16px",
                color: isMe ? "#fff" : "#6c757d",
              }}
            ></i>
          </div>
        </a>
      )}
    </div>
  );
};

export default AttachmentDisplay;
