import axios from "axios";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import { useChatContext } from "../../Global/ChatContext";

const AgentChatsPage = () => {
  const { panels, addChatPanel, removeChatPanel } = useChatContext();
  const [agentChatPairs, setAgentChatPairs] = useState([]);
  const [loadingChatPairs, setLoadingChatPairs] = useState(true);
  const [selectedChatPair, setSelectedChatPair] = useState(null);
  const BASE_URL = "https://chatsupport.fskindia.com";
  const TOKEN = localStorage.getItem("accessToken");
  const ROLE_ID =
    JSON.parse(localStorage.getItem("auth"))?.user?.role_id || null;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (ROLE_ID !== 2) {
      console.warn(
        "[AgentChatsPage] Access denied: Not an admin (ROLE_ID !== 2)",
      );
      toast.error("Access denied: Admin only");
      return;
    }

    const currentPanel = panels.find((p) => p.pairId === selectedChatPair);

    const user1 = currentPanel?.user1Id;
    const user2 = currentPanel?.user2Id;

    console.log("CHAT USERS", { currentPanel });

    const fetchAgentChatPairs = async () => {
      try {
        const chatsResponse = await axios.get(
          `${BASE_URL}/messaging/recent-chats`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          },
        );
        const chats = chatsResponse.data.conversations || [];

        console.log("API Response:", chatsResponse.data);

        const CURRENT_USER_ID = JSON.parse(localStorage.getItem("auth"))?.user
          ?.id;
        const agentChatPairs = chats.map((chat) => {
          const [user1Id, user2Id] = chat.conversation_id
            .split("_")
            .map(Number);

          // flatten users
          const users = chat.other_user.flatMap((item) => Object.values(item));

          const user1 = users.find((u) => u.id === user1Id);
          const user2 = users.find((u) => u.id === user2Id);

          return {
            pairId: chat.conversation_id,
            user1Id,
            user2Id,

            // ✅ show BOTH users (correct admin view)
            user2Name: `${user1?.first_name || ""} ↔ ${user2?.first_name || ""}`,

            lastMessage: chat.latest_message?.content || "No messages",
            lastMessageTimestamp:
              chat.latest_message?.timestamp || new Date().toISOString(),

            messages: chat.messages || [], // 🔥 important for right panel
          };
        });
        setAgentChatPairs(
          agentChatPairs.sort(
            (a, b) =>
              new Date(b.lastMessageTimestamp) -
              new Date(a.lastMessageTimestamp),
          ),
        );
        setLoadingChatPairs(false);
      } catch (err) {
        console.error("[AgentChatsPage] Fetch agent chat pairs error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        toast.error("Failed to load direct messages.");
        setLoadingChatPairs(false);
      }
    };

    fetchAgentChatPairs();
  }, []);

  // Modified: Scroll to the latest message with block: 'end'
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [panels, selectedChatPair]);

  // Format date separators like DirectMessagesPage.jsx
  const formatDateSeparator = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .split("/")
      .join("/");
  };

  // Format message time like DirectMessagesPage.jsx
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      .toUpperCase();
  };

  const handleChatPairClick = (
    pairId,
    pairName,
    user1Id,
    user2Id,
    messages,
  ) => {
    addChatPanel(pairId, pairName, user1Id, user2Id, messages);
    setSelectedChatPair(pairId);
  };

  return (
    <div
      className="d-flex flex-column flex-md-row"
      style={{
        height: "calc(100vh - 60px)",
        marginTop: "60px",
        backgroundColor: "#f8f9fa",
        overflow: "hidden",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="p-3 bg-white shadow-sm"
        style={{
          width: "100%",
          maxWidth: "350px",
          minWidth: "250px",
          borderRight: "1px solid #ddd",
          marginBottom: "20px",
          flexShrink: 0,
        }}
      >
        <h4 className="mb-3">Agent Chats</h4>
        {loadingChatPairs ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : agentChatPairs.length === 0 ? (
          <p className="text-muted text-center py-4">
            No direct messages available.
          </p>
        ) : (
          <SimpleBar style={{ maxHeight: "calc(100vh - 150px)" }}>
            {agentChatPairs.map((pair) => {
              const pairId = pair.pairId;
              const pairName = pair.user2Name;
              return (
                <div
                  key={pairId}
                  className={`p-2 mb-2 rounded ${selectedChatPair === pairId ? "bg-primary text-white" : "bg-light"}`}
                  onClick={() =>
                    handleChatPairClick(
                      pairId,
                      pairName,
                      pair.user1Id,
                      pair.user2Id,
                      pair.messages, // ✅ ADD THIS
                    )
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleChatPairClick(
                        pairId,
                        pairName,
                        pair.user1Id,
                        pair.user2Id,
                      );
                    }
                  }}
                  aria-label={`Select chat with ${pair.user2Name}`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center">
                    <i
                      className="bi bi-chat-dots me-2"
                      style={{ fontSize: "0.8rem" }}
                    ></i>
                    <div>
                      <strong>{pairName}</strong>
                      <small
                        className="d-block text-truncate"
                        style={{ maxWidth: "200px" }}
                      >
                        {pair.lastMessage.substring(0, 20)}...
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
          </SimpleBar>
        )}
      </div>

      <div
        className="flex-grow-1 p-2"
        style={{ maxWidth: "100%", overflowX: "hidden" }}
      >
        {selectedChatPair ? (
          <div
            className="bg-white rounded-3 shadow-sm d-flex flex-column"
            style={{
              height: "calc(100vh - 130px)",
              border: "1px solid #ddd",
              maxWidth: "100%",
              boxSizing: "border-box",
            }}
          >
            <div className="d-flex align-items-center p-2 border-bottom">
              <h5 className="m-0" style={{ fontSize: "14px" }}>
                {panels?.find((p) => p.pairId === selectedChatPair)?.pairName ||
                  "Chat"}
              </h5>
              <button
                className="btn btn-sm btn-link p-0 ms-auto"
                onClick={() => {
                  removeChatPanel(selectedChatPair);
                  setSelectedChatPair(null);
                }}
                aria-label="Close chat"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
            <SimpleBar
              className="flex-grow-1"
              style={{
                backgroundColor: "#f0f9fa",
                minHeight: 0,
                padding: "4px",
                maxWidth: "100%",
              }}
            >
              {panels?.find((p) => p.pairId === selectedChatPair)?.messages
                ?.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minHeight: "100%",
                  }}
                >
                  {panels
                    .find((p) => p.pairId === selectedChatPair)
                    .messages.reduce((acc, message, index) => {
                      // Date separator logic
                      const messageDate = new Date(
                        message.timestamp,
                      ).toDateString();
                      const prevMessageDate =
                        index > 0
                          ? new Date(
                              panels.find((p) => p.pairId === selectedChatPair)
                                .messages[index - 1].timestamp,
                            ).toDateString()
                          : null;

                      if (index === 0 || messageDate !== prevMessageDate) {
                        acc.push(
                          <div
                            key={`date-${messageDate}-${index}`}
                            className="text-center my-2"
                          >
                            <span
                              className="text-muted px-3 py-1 rounded"
                              style={{
                                fontSize: "12px",
                                backgroundColor: "white",
                              }}
                            >
                              {formatDateSeparator(message.timestamp)}
                            </span>
                          </div>,
                        );
                      }

                      acc.push(
                        <div
                          key={message.id || `msg-${index}`}
                          className={`mb-1 ${
                            // Modified: Changed mb-2 to mb-1 for tighter spacing
                            message.sender_id ===
                            panels.find((p) => p.pairId === selectedChatPair)
                              .user1Id
                              ? "text-end"
                              : "text-start"
                          }`}
                        >
                          <div
                            className={`d-inline-block p-2 ${
                              message.sender_id ===
                              panels.find((p) => p.pairId === selectedChatPair)
                                .user1Id
                                ? "bg-primary text-white"
                                : "bg-light text-dark"
                            }`}
                            style={{
                              maxWidth: "70%",
                              borderRadius:
                                message.sender_id ===
                                panels.find(
                                  (p) => p.pairId === selectedChatPair,
                                ).user1Id
                                  ? "12px 12px 0px 12px"
                                  : "12px 12px 12px 0px",
                            }}
                          >
                            {message.content}
                            <small
                              className={`d-block ${
                                message.sender_id ===
                                panels.find(
                                  (p) => p.pairId === selectedChatPair,
                                ).user1Id
                                  ? "text-light"
                                  : "text-muted"
                              }`}
                              style={{ fontSize: "10px" }}
                            >
                              {formatTime(message.timestamp)}
                            </small>
                          </div>
                        </div>,
                      );
                      return acc;
                    }, [])}
                  <div ref={messagesEndRef} style={{ height: 0 }} />
                </div>
              ) : (
                <div
                  className="text-center text-muted"
                  style={{
                    flexGrow: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  No messages yet.
                </div>
              )}
            </SimpleBar>
          </div>
        ) : (
          <div className="text-center text-muted mt-5">
            Select a chat to view messages.
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentChatsPage;
