import { toast } from "react-toastify";

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
    const noWhitespace = str?.replace(/\s/g, '');
    const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})+$/u;
    return emojiRegex.test(noWhitespace) && [...noWhitespace].length <= 3;
};

// Renders message text with clickable links
export const renderMessageWithLinks = (text) => {
    if (!text) return null;
    // Matches http(s) URLs or bare domains like www.x.com or x.co or x.example.com
    const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)[^\s]+\.[a-zA-Z]{2,}[^\s]*|\b[^\s]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
        if (!urlRegex.test(part)) return <span key={i}>{part}</span>;
        // Reset lastIndex after test() consumed it
        urlRegex.lastIndex = 0;
        const href = /^https?:\/\//i.test(part) ? part : `https://${part}`;
        return (
            <a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#a8d4ff", textDecoration: "underline", wordBreak: "break-all" }}
                onClick={(e) => e.stopPropagation()}
            >
                {part}
            </a>
        );
    });
};
