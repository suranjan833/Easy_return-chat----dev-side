import { toast } from "react-toastify";
import React from "react";

export const AttechmentSizeLimit = (file, e) => {
  const maxSize = 3 * 1024 * 1024; // 3MB

  if (file.size > maxSize) {
    toast.error("File size must be less than 3MB!");
    e.target.value = "";
    return null;
  }

  return file;
};

export const isOnlyEmojis = (str) => {
  if (!str?.length === 0) return false;
  const noWhitespace = str?.replace(/\s/g, "");
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
  return emojiRegex.test(noWhitespace) && [...noWhitespace].length <= 3;
};

// Renders message text with clickable links - Fixed version
export const renderMessageWithLinks = (text = "") => {
  if (!text || typeof text !== "string") return text;

  // Improved URL regex that matches complete URLs properly
  const urlRegex =
    /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  // Create a new regex without the 'g' flag for testing
  const testRegex = /^(?:https?:\/\/|www\.)/i;

  // Reset regex for iteration
  const regexForLoop =
    /https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;

  while ((match = regexForLoop.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    const url = match[0];

    // Skip if it looks like a malformed URL (e.g., "https:///")
    if (
      !url ||
      url === "https://" ||
      url === "http://" ||
      url.match(/^https?:\/\/\/$/) ||
      url.match(/^[/:]+$/)
    ) {
      parts.push({
        type: "text",
        content: url,
      });
    } else {
      // Build proper href
      let href = url;
      if (!url.match(testRegex)) {
        href = `https://${url}`;
      }

      parts.push({
        type: "link",
        content: url,
        href: href,
      });
    }

    lastIndex = regexForLoop.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  // If no URLs found, just return the text
  if (parts.length === 0) {
    return text;
  }

  return parts.map((part, index) => {
    if (part.type === "text") {
      return <React.Fragment key={index}>{part.content}</React.Fragment>;
    }

    return (
      <a
        key={index}
        href={part.href}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "white",
          textDecoration: "underline",
          wordBreak: "break-word",
          cursor: "pointer",
        }}
        title={part.href}
      >
        {part.content}
      </a>
    );
  });
};
