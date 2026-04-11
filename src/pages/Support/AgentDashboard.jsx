import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useRef, useState } from "react";
import { BiPaperclip, BiSend, BiUserPlus, BiXCircle } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  closeConversation,
  connectWebSocket,
  getMessages,
  getSocketUrl,
  getSupportRequests,
  requestHumanAgent,
} from "../../Services/widget";
import "./AgentDashboard.css";

const BASE_URL_USER = "https://chatsupport.fskindia.com";
const SUPPORT_API_URL =
  "https://supportdesk.fskindia.com/support-messages/support_requests";

const AgentDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketNumber, setTicketNumber] = useState(null);
  const [websocketUrl, setWebsocketUrl] = useState(null);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isHumanHandoff, setIsHumanHandoff] = useState(false);
  const [agentEmail, setAgentEmail] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("active");
  const socketRef = useRef(null);
  const chatBodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Handle sending messages
  const handleSendMessage = () => {
    if (!messageText.trim()) {
      toast.error("Bhai, kuch toh likh!");
      return;
    }
    if (selectedTicket?.status === "closed") {
      toast.error("Ticket band hai. Message nahi bhej sakta.");
      return;
    }
    if (!isHumanHandoff) {
      toast.error("Please click Join Chat before sending messages.");
      return;
    }
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Connection lost. Please refresh the page.");
      return;
    }
    const message = {
      message_type: "text",
      content: messageText,
      sender_type: "agent",
      sender_email: agentEmail,
      timestamp: new Date().toISOString(),
      is_read: false,
    };

    socketRef.current.send(JSON.stringify(message));
    setMessages((prev) =>
      [...prev, message].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
      ),
    );
    setMessageText("");
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }
    if (selectedTicket?.status === "closed") {
      toast.error("Ticket band hai. File upload nahi kar sakta.");
      return;
    }
    if (!ticketNumber) {
      toast.error("Invalid ticket number. Please select a ticket.");
      return;
    }
    if (!isHumanHandoff) {
      toast.error("Please click Join Chat before uploading files.");
      return;
    }
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Connection lost. Please refresh the page.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        `https://supportdesk.fskindia.com/support/upload-file/${ticketNumber}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const downloadUrl = `https://supportdesk.fskindia.com/support/serve-file/${response.data.filename}`;

      const message = {
        message_type: "file_upload",
        filename: response.data.filename,
        content: downloadUrl,
        sender_type: "agent",
        sender_email: agentEmail,
        timestamp: new Date().toISOString(),
      };
      socketRef.current.send(JSON.stringify(message));
      setMessages((prev) => {
        const newMessages = [...prev, message].sort(
          (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
        );
        return newMessages.slice(-100);
      });
      setFile(null);
      fileInputRef.current.value = "";
      toast.success("File uploaded!");
    } catch (err) {
      console.error("[AgentDashboard] File upload error:", err.message);
      toast.error(
        err.message || "File upload nahi kar sakta. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle ticket selection
  const handleSelectTicket = (ticket) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.error("Session expired. Please login again.");
      navigate("/auth-login");
      return;
    }
    if (!ticket.ticket_number) {
      toast.error("Invalid ticket: Ticket number missing.");
      return;
    }
    setSelectedTicket(ticket);
    setTicketNumber(ticket.ticket_number);
    setMessages([]);
    setFeedback("");
    setShowFeedbackPanel(false);
    setIsHumanHandoff(ticket.status === "agent_engaged");
  };

  // Handle request human agent
  const handleRequestHuman = async () => {
    if (!ticketNumber) {
      toast.error("No ticket selected.");
      return;
    }
    if (selectedTicket?.status === "closed") {
      toast.error("Ticket band hai. Human agent request nahi kar sakta.");
      return;
    }
    if (!agentEmail) {
      toast.error("Agent email missing. Please login again.");
      return;
    }
    setSubmitting(true);
    try {
      await requestHumanAgent({
        ticket_number: ticketNumber,
        agent_email: agentEmail,
      });
      setIsHumanHandoff(true);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticket_number === ticketNumber
            ? { ...t, agent_email: agentEmail, status: "agent_engaged" }
            : t,
        ),
      );

      toast.success("Agent notified!");
    } catch (err) {
      console.error("[AgentDashboard] Request human error:", err.message);
      toast.error(
        err.message || "Human agent request nahi kar sakta. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle close conversation
  const handleCloseConversation = async () => {
    if (!ticketNumber) {
      toast.error("No ticket selected.");
      return;
    }
    if (
      !feedback.trim() ||
      feedback.trim() === "Please provide feedback before closing the ticket..."
    ) {
      toast.error("Please provide meaningful feedback.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await closeConversation({
        ticket_number: ticketNumber,
        user_feedback: feedback,
        close_by_agent: true,
      });

      toast.success("Ticket closed!");
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        const message = {
          message_type: "ticket_closed",
          content: `Ticket ${ticketNumber} closed by agent with feedback: ${feedback}`,
          sender_type: "agent",
          sender_email: agentEmail,
          timestamp: new Date().toISOString(),
        };
        socketRef.current.send(JSON.stringify(message));

        socketRef.current.close();
      }
      setMessages([]);
      setFeedback("");
      setShowFeedbackPanel(false);
      setSelectedTicket(null);
      setTicketNumber(null);
      setWebsocketUrl(null);
      setToken(null);
      setIsHumanHandoff(false);
      setTickets((prev) =>
        prev.map((t) =>
          t.ticket_number === ticketNumber ? { ...t, status: "closed" } : t,
        ),
      );
    } catch (err) {
      console.error("[AgentDashboard] Close conversation error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || "Failed to close ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch user email on mount
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      // toast.error('Please login again.');
      navigate("/auth-login");
      return;
    }

    const fetchUserEmail = async () => {
      try {
        const response = await axios.get(`${BASE_URL_USER}/users/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });
        const email = response.data.user?.email;
        if (!email) {
          throw new Error("No email found in user data");
        }

        setAgentEmail(email);
        localStorage.setItem("userEmail", email);
      } catch (err) {
        console.error("[AgentDashboard] Error fetching user details:", {
          status: err.response?.status,
          message: err.message,
          details: err.response?.data?.detail || "No details",
        });
        toast.error("Failed to fetch user details. Please login again.");
        navigate("/auth-login");
      }
    };

    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(savedEmail)) {
      setAgentEmail(savedEmail);
    } else {
      fetchUserEmail();
    }
  }, [navigate]);

  // Fetch tickets for the logged-in agent
  useEffect(() => {
    if (!agentEmail) {
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      toast.error("No access token found. Please login again.");
      navigate("/auth-login");
      return;
    }

    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        const statusFilter =
          dateFilter === "active"
            ? "agent_engaged,initiated"
            : "resolved,closed";
        const params = {
          agent_email: agentEmail,
          status: statusFilter,
          limit: 20,
          offset: 0,
        };

        const data = await getSupportRequests(params);

        if (!Array.isArray(data)) {
          console.error(
            "[AgentDashboard] Invalid response format from getSupportRequests:",
            data,
          );
          toast.error("Invalid ticket data received from server.");
          setTickets([]);
          setFilteredTickets([]);
          return;
        }

        // Normalize and validate ticket statuses
        const validStatuses =
          dateFilter === "active"
            ? ["agent_engaged", "initiated"]
            : ["resolved", "closed"];
        const newTicketsMap = new Map();
        data.forEach((ticket) => {
          if (!ticket.ticket_number) {
            console.warn(
              "[AgentDashboard] Skipping ticket with missing ticket_number:",
              ticket,
            );
            return;
          }
          const normalizedStatus = ticket.status?.toLowerCase() || "closed";
          if (!validStatuses.includes(normalizedStatus)) {
            console.warn("[AgentDashboard] Ticket with unexpected status:", {
              ticket_number: ticket.ticket_number,
              status: normalizedStatus,
            });
            return;
          }
          if (!newTicketsMap.has(ticket.ticket_number)) {
            newTicketsMap.set(ticket.ticket_number, {
              ...ticket,
              agent_email:
                ticket.assigned_agent_email || ticket.agent_email || null,
              status: normalizedStatus,
            });
          } else {
            console.warn(
              "[AgentDashboard] Duplicate ticket detected:",
              ticket.ticket_number,
            );
          }
        });

        const updatedTickets = Array.from(newTicketsMap.values()).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at),
        );

        setTickets(updatedTickets);
        const filtered = nameFilter.trim()
          ? updatedTickets.filter(
              (ticket) =>
                ticket.name?.toLowerCase().includes(nameFilter.toLowerCase()) ||
                ticket.email?.toLowerCase().includes(nameFilter.toLowerCase()),
            )
          : updatedTickets;
        setFilteredTickets(filtered);
      } catch (err) {
        console.error("[AgentDashboard] Fetch tickets error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        toast.error(
          err.message ||
            "Failed to load tickets. Please check your credentials.",
        );
        setTickets([]);
        setFilteredTickets([]);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [agentEmail, dateFilter, navigate]);

  // Apply name filter client-side
  useEffect(() => {
    const filtered = nameFilter.trim()
      ? tickets.filter(
          (ticket) =>
            ticket.name?.toLowerCase().includes(nameFilter.toLowerCase()) ||
            ticket.email?.toLowerCase().includes(nameFilter.toLowerCase()),
        )
      : tickets;
    setFilteredTickets(filtered);
  }, [nameFilter, tickets]);

  // Fetch WebSocket URL for selected ticket
  useEffect(() => {
    if (!selectedTicket || !ticketNumber) {
      return;
    }

    const fetchWebsocketUrl = async () => {
      try {
        const response = await getSocketUrl(ticketNumber);

        setWebsocketUrl(response.websocket_url);
        setToken(response.token || localStorage.getItem("accessToken"));
      } catch (err) {
        console.error("[AgentDashboard] WebSocket URL error:", {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        if (
          err.message.includes("not active") ||
          err.message.includes("not found")
        ) {
          setWebsocketUrl(null);
          setToken(null);
          toast.info("This ticket is not active. You can view chat history.");
        } else if (err.message.includes("Forbidden")) {
          toast.error(
            "Authentication failed. Please verify your credentials or contact support.",
          );
        } else {
          toast.error(err.message || "Failed to fetch WebSocket URL.");
        }
      }
    };

    if (selectedTicket?.status === "closed") {
      setWebsocketUrl(null);
      setToken(null);
      toast.info("This ticket is closed. You can view chat history.");
      return;
    }

    fetchWebsocketUrl();
  }, [selectedTicket, ticketNumber]);

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (
      !websocketUrl ||
      !token ||
      !ticketNumber ||
      selectedTicket?.status === "closed"
    ) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    socketRef.current = connectWebSocket(
      ticketNumber,
      token,
      (message) => {
        if (message.message_type === "ticket_closed") {
          toast.info(message.content || `Ticket ${ticketNumber} closed.`);
          setTickets((prev) =>
            prev.map((t) =>
              t.ticket_number === ticketNumber ? { ...t, status: "closed" } : t,
            ),
          );
          if (selectedTicket?.ticket_number === ticketNumber) {
            setMessages([]);
            setFeedback("");
            setShowFeedbackPanel(false);
            setSelectedTicket(null);
            setTicketNumber(null);
            setWebsocketUrl(null);
            setToken(null);
            setIsHumanHandoff(false);
          }
        } else if (
          message.message_type === "text" ||
          message.message_type === "file_upload"
        ) {
          setMessages((prev) => {
            if (prev.some((m) => m.timestamp === message.timestamp))
              return prev;
            const newMessages = [...prev, message].sort(
              (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            );
            return newMessages.slice(-100);
          });
        }
      },
      () => {},
      (event) => {
        toast.info("This ticket is not active. You can view chat history.");
      },
      (error) => {
        console.error(
          "[AgentDashboard] WebSocket error:",
          JSON.stringify(error, null, 2),
        );
        toast.error(
          "Connection failed. Please check your credentials or refresh the page.",
        );
      },
    );

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [websocketUrl, token, ticketNumber, selectedTicket]);

  // Fetch messages for the selected ticket
  useEffect(() => {
    if (!ticketNumber) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await getMessages({ ticket_number: ticketNumber });

        setMessages(
          data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
        );
      } catch (err) {
        console.error("[AgentDashboard] Fetch messages error:", {
          message: err.message,
          status: err.status,
          response: err.response?.data,
        });
        toast.error(err.message || "Failed to fetch messages.");
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [ticketNumber]);

  // Scroll chat to bottom when messages change
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="agent-dashboard-container">
      <ToastContainer />
      <div className="dashboard-header">
        <h3 className="dashboard-title">Agent Dashboard</h3>
        <span className="agent-email">{agentEmail || "Agent"}</span>
      </div>
      <div className="dashboard-content">
        <div className="ticket-sidebar">
          <h5 className="sidebar-title">Your Tickets</h5>
          <div className="filter-panel mb-3 p-3 bg-light border rounded">
            <h6>Filter Tickets</h6>
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Search by name or email"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              aria-label="Filter by name or email"
            />
            <div
              className="btn-group mb-2 w-100"
              role="group"
              aria-label="Ticket status filter"
            >
              <button
                type="button"
                className={`btn ${dateFilter === "active" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setDateFilter("active")}
                aria-pressed={dateFilter === "active"}
              >
                Active
              </button>
              <button
                type="button"
                className={`btn ${dateFilter === "history" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setDateFilter("history")}
                aria-pressed={dateFilter === "history"}
              >
                History
              </button>
            </div>
          </div>
          {loadingTickets ? (
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-ticket-detailed empty-icon"></i>
              <p>No tickets match the filters.</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.ticket_number}
                className={`ticket-card ${selectedTicket?.ticket_number === ticket.ticket_number ? "active" : ""} ${
                  ticket.status.toLowerCase() === "agent_engaged"
                    ? "bg-success bg-opacity-10"
                    : ticket.status.toLowerCase() === "initiated"
                      ? "bg-secondary bg-opacity-10"
                      : ticket.status.toLowerCase() === "resolved"
                        ? "bg-primary bg-opacity-25"
                        : ticket.status.toLowerCase() === "closed"
                          ? "bg-danger bg-opacity-10"
                          : "bg-secondary bg-opacity-10"
                }`}
                onClick={() => handleSelectTicket(ticket)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSelectTicket(ticket)
                }
                tabIndex={0}
                role="button"
                aria-label={`Select ticket ${ticket.ticket_number}`}
              >
                <div className="ticket-header">
                  <strong>{ticket.name || "N/A"}</strong>
                  <span
                    className={`badge ${
                      ticket.status.toLowerCase() === "agent_engaged"
                        ? "bg-success"
                        : ticket.status.toLowerCase() === "initiated"
                          ? "bg-secondary"
                          : ticket.status.toLowerCase() === "resolved"
                            ? "bg-primary"
                            : ticket.status.toLowerCase() === "closed"
                              ? "bg-danger"
                              : "bg-secondary"
                    }`}
                  >
                    {ticket.status.charAt(0).toUpperCase() +
                      ticket.status.slice(1) || "Open"}
                  </span>
                </div>
                <p className="ticket-issue">
                  {ticket.issue_description || "No description available"}
                </p>
                <small className="text-muted">
                  Email: {ticket.email || "N/A"}
                </small>
                <small className="text-muted d-block">
                  Site ID: {ticket.site_id || "N/A"}
                </small>
                <small className="text-muted d-block">
                  Agent: {ticket.agent_email || "Unassigned"}
                </small>
                <small className="text-muted d-block">
                  Created:{" "}
                  {new Date(ticket.created_at || Date.now()).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </small>
              </div>
            ))
          )}
        </div>
        <div className="chat-panel">
          {selectedTicket ? (
            <div className="card chat-card">
              <div className="card-header">
                <b>
                  Name: {selectedTicket.name || "N/A"}, Email:{" "}
                  {selectedTicket.email || "N/A"}
                </b>
                <span
                  className={`badge ${
                    selectedTicket.status.toLowerCase() === "agent_engaged"
                      ? "bg-success"
                      : selectedTicket.status.toLowerCase() === "initiated"
                        ? "bg-secondary"
                        : selectedTicket.status.toLowerCase() === "resolved"
                          ? "bg-primary"
                          : selectedTicket.status.toLowerCase() === "closed"
                            ? "bg-danger"
                            : "bg-secondary"
                  }`}
                >
                  {selectedTicket.status.charAt(0).toUpperCase() +
                    selectedTicket.status.slice(1) || "Open"}
                </span>
              </div>
              <div className="card-body chat-body" ref={chatBodyRef}>
                {loadingMessages ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-muted text-center py-4">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  <div className="chat-messages">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`message ${msg.sender_type === "agent" || msg.sender_type === "bot" ? "message-right" : "message-left"}`}
                      >
                        <div className="message-sender">
                          {msg.sender_type.charAt(0).toUpperCase() +
                            msg.sender_type.slice(1)}{" "}
                          ({msg.sender_email || "N/A"})
                        </div>
                        <div className="message-content">
                          {msg.message_type === "text" && <p>{msg.content}</p>}
                          {msg.message_type === "file_upload" && (
                            <a
                              href={msg.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-link d-flex align-items-center p-2 rounded bg-light border border-secondary text-decoration-none"
                              style={{
                                maxWidth: "250px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={msg.filename}
                            >
                              <BiPaperclip className="me-2" />
                              <span>
                                {msg.filename.length > 20
                                  ? `${msg.filename.slice(0, 17)}...`
                                  : msg.filename}
                              </span>
                            </a>
                          )}
                          <small className="text-muted d-block mt-1">
                            {new Date(msg.timestamp).toLocaleString("en-US", {
                              hour: "numeric",
                              minute: "numeric",
                              hour12: true,
                            })}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card-footer">
                {selectedTicket.status !== "closed" &&
                selectedTicket.status !== "resolved" ? (
                  <>
                    <div className="input-group mb-3">
                      <input
                        type="text"
                        className="form-control chat-input"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message..."
                        disabled={
                          submitting ||
                          selectedTicket.status === "closed" ||
                          !isHumanHandoff
                        }
                        aria-label="Message input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && messageText.trim()) {
                            handleSendMessage();
                          }
                        }}
                      />
                      <input
                        type="file"
                        className="form-control"
                        ref={fileInputRef}
                        onChange={(e) => setFile(e.target.files[0])}
                        disabled={
                          submitting ||
                          selectedTicket.status === "closed" ||
                          !isHumanHandoff
                        }
                        accept="image/jpeg,image/png,application/pdf"
                        style={{ maxWidth: "120px" }}
                        aria-label="File upload"
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleSendMessage}
                        disabled={
                          submitting ||
                          !messageText.trim() ||
                          selectedTicket.status === "closed" ||
                          !isHumanHandoff
                        }
                        aria-label="Send message"
                      >
                        <BiSend />
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleFileUpload}
                        disabled={
                          submitting ||
                          !file ||
                          selectedTicket.status === "closed" ||
                          !isHumanHandoff
                        }
                        aria-label="Upload file"
                      >
                        <BiPaperclip />
                      </button>
                    </div>
                    <div className="action-buttons">
                      <button
                        className="btn btn-warning"
                        onClick={handleRequestHuman}
                        disabled={
                          submitting ||
                          selectedTicket.status === "closed" ||
                          isHumanHandoff
                        }
                        aria-label="Request human agent"
                      >
                        <BiUserPlus /> Join Chat
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => setShowFeedbackPanel(!showFeedbackPanel)}
                        disabled={
                          submitting || selectedTicket.status === "closed"
                        }
                        aria-label="Close ticket"
                      >
                        <BiXCircle /> Close Ticket
                      </button>
                    </div>
                    {showFeedbackPanel && (
                      <div className="details">
                        <textarea
                          className="form-control"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Please provide feedback before closing the ticket..."
                          rows="4"
                          disabled={submitting}
                          aria-label="Feedback input"
                        />
                        <button
                          className="btn btn-danger mt-2 w-100"
                          onClick={handleCloseConversation}
                          disabled={
                            submitting ||
                            !feedback.trim() ||
                            feedback.trim() ===
                              "Please provide feedback before closing the ticket..."
                          }
                          aria-label="Confirm close ticket"
                        >
                          Confirm Close
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted text-center py-2">
                    This ticket is {selectedTicket.status}. You can only view
                    the chat history.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-chat-state">
              <i className="bi bi-chat-square-text empty-icon"></i>
              <h4>Select a Ticket</h4>
              <p>Choose a ticket from the sidebar to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
