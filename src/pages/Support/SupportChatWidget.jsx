import "bootstrap/dist/css/bootstrap.min.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { BiUserPlus, BiXCircle } from "react-icons/bi";
import { BsTicketDetailed, BsTicketPerforated } from "react-icons/bs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid";
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";
import { Icon } from "@/components/Component";
import { useTickets } from "../../Global/TicketsContext";
import Head from "../../layout/head/Head.jsx";
import { joinChat, leaveChat } from "../../redux/slices/chatConnectionSlice";
import { addSupportChatPopup } from "../../redux/slices/chatPopupsSlice";
import NotificationService from "../../Services/NotificationService";
import {
  closeConversation,
  connectWebSocket,
  getMessages,
  getSiteDetails,
  getSocketUrl,
  getSupportRequests,
  requestHumanAgent,
  blockUser,
} from "../../Services/widget";
import ChatMessages from "./ChatMessages";
import ChatTransfer from "./ChatTransfer";
import FilterPanel from "./FilterPanel";
import HistoricalTickets from "./HistoricalTickets";
import MessageInput from "./MessageInput";
import StatusCheckModal from "./StatusCheckModal";
import DeleteConfirmationModal from "../../components/custom/DeleteConfirmationModal";
import BlockUserModal from "../../components/custom/BlockUserModal";
import "./SupportChatWidget.css";
import TransferHistory from "./TransferHistory";
const SupportChatWidget = ({ isAgent, agentEmail }) => {
  const [localIsAgent, setLocalIsAgent] = useState(isAgent ?? null);
  const [theme, setTheme] = useState("light");
  const [messageText, setMessageText] = useState("");
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [blockModal, setBlockModal] = useState(false);
  // You might integrate a global theme context or user preference here if available.
  // Example: const { theme } = useThemeContext();
  const [localAgentEmail, setLocalAgentEmail] = useState(agentEmail ?? null);
  const isAgentWithFallback = localIsAgent ?? false;
  const { tickets, replaceTickets, updateTicketPartial } = useTickets();
  const dispatch = useDispatch();
  const { joinedTickets, activeJoinedTicket } = useSelector(
    (state) => state.chatConnection,
  );
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } = useSelector(
    (state) => state.chatPopups,
  );
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketNumber, setTicketNumber] = useState(null);
  const hasJoined = useMemo(() => {
    return joinedTickets.some((t) => t.ticketNumber === ticketNumber);
  }, [joinedTickets, ticketNumber]);
  const [websocketUrl, setWebsocketUrl] = useState(null);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isHumanHandoff, setIsHumanHandoff] = useState(false);
  const [showHistoricalTickets, setShowHistoricalTickets] = useState(false);
  const [socket, setSocket] = useState(null);
  // const reconnectAttemptsRef = useRef(0);
  // const maxReconnectAttempts = 3;
  // const reconnectInterval = 3000;
  const chatBodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTicketNumber = searchParams.get("ticket");
  const fetchTicketsRef = useRef(null);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [userEmailFilter, setUserEmailFilter] = useState("");
  const [agentEmailFilter, setAgentEmailFilter] = useState("");
  const [ticketNumberFilter, setTicketNumberFilter] = useState("");
  const [siteIdFilter, setSiteIdFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("active");
  const [datessFilter, setDatesFilter] = useState("");
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 100;
  const [lastUserMessageTime, setLastUserMessageTime] = useState(null);
  const inactivityTimeoutRef = useRef(null);
  const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
  const messageInputRef = useRef(null);
  const [typingStatus, setTypingStatus] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [replyToMessageId, setReplyToMessageId] = useState(null);
  const typingTimeoutRef = useRef(null);
  const [isFetching, setIsFetching] = useState(false);
  const [botRepliesEnabled, setBotRepliesEnabled] = useState(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isChatTabOpen, setIsChatTabOpen] = useState(true);
  const [departmentName, setDepartmentName] = useState("N/A");
  const [agents, setAgents] = useState([]);

  // const joinAttemptedRef = useRef(null);
  const isConnectingRef = useRef(false);
  const selectedTicketRef = useRef(selectedTicket);
  useEffect(() => { selectedTicketRef.current = selectedTicket; }, [selectedTicket]);
  const memoizedSelectedTicket = useMemo(
    () => selectedTicket,
    [selectedTicket?.ticket_number],
  );
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    // If we're supposed to be joined but have no socket, auto-reconnect
    if (
      ticketNumber &&
      selectedTicket &&
      hasJoined &&
      !socket &&
      !isConnectingRef.current &&
      (selectedTicket.status === "agent_engaged" ||
        selectedTicket.status === "transferred")
    ) {
      handleJoinOrRequestHuman();
    }
  }, [ticketNumber, selectedTicket, hasJoined, socket]);

  const markMessagesAsRead = useCallback(
    async (messageIds = [], ticketNumberParam = null) => {
      try {
        const token = localStorage.getItem("websocket_token");
        if (!token) {
          console.warn(
            "[SupportChatWidget.jsx] Missing token for marking messages as read",
          );
          // toast.error("Authentication error: Please log in again");
          return;
        }
        if (!messageIds.length && !ticketNumberParam) {
          console.warn(
            "[SupportChatWidget.jsx] Missing identifiers for marking messages as read: no message IDs or ticket number",
          );
          return;
        }

        // Filter valid message IDs
        const validMessageIds = messageIds.filter(
          (id) =>
            id &&
            Number.isInteger(Number(id)) &&
            !id.toString().startsWith("temp-"),
        );
        if (!validMessageIds.length && !ticketNumberParam) {
          console.warn(
            "[SupportChatWidget.jsx] No valid message IDs or ticket number provided",
          );
          return;
        }

        // Fallback to ticketNumber from state if ticketNumberParam is null
        const effectiveTicketNumber = ticketNumberParam || ticketNumber;
        if (!effectiveTicketNumber) {
          console.error(
            "[SupportChatWidget.jsx] Ticket number is undefined; cannot mark messages as read",
          );
          toast.error("Cannot mark messages as read: Missing ticket number");
          return;
        }

        // Update local state immediately for UI responsiveness
        setMessages((prev) => {
          if (validMessageIds.length) {
            return prev.map((msg) =>
              validMessageIds.includes(msg.id)
                ? { ...msg, is_read: true }
                : msg,
            );
          } else if (effectiveTicketNumber) {
            return prev.map((msg) =>
              msg.ticket_number === effectiveTicketNumber &&
              msg.sender_type === "user"
                ? { ...msg, is_read: true }
                : msg,
            );
          }
          return prev;
        });

        // Make PUT API call to backend
        const payload = {
          message_ids: validMessageIds.length ? validMessageIds : undefined,
          ticket_number: effectiveTicketNumber,
          agent_email: isAgentWithFallback
            ? agentEmail || localAgentEmail || "agent@example.com"
            : undefined,
        };
        // console.log("[SupportChatWidget.jsx] Sending PUT request to mark messages as read:", payload);
        const response = await fetch(
          "https://supportdesk.fskindia.com/support/messages/mark-read",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        //
      } catch (error) {
        console.error(
          "[SupportChatWidget.jsx] Failed to mark messages as read:",
          error,
        );
        toast.error("Failed to mark messages as read");
      }
    },
    [
      isAgentWithFallback,
      agentEmail,
      localAgentEmail,
      setMessages,
      toast,
      ticketNumber,
    ],
  );

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          console.warn(
            "[SupportChatWidget] Missing accessToken for fetching agents",
          );
          return;
        }
        const response = await fetch(
          "https://chatsupport.fskindia.com/users/agents/all",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        const data = await response.json();
        setAgents(data);
        //console.log("[SupportChatWidget] Fetched agents:", data);
      } catch (error) {
        console.error("[SupportChatWidget] Failed to fetch agents:", error);
        toast.error("Failed to load agent data");
      }
    };
    fetchAgents();
  }, []);

  const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent
      ? `${agent.first_name} ${agent.last_name}`
      : email || "Unassigned";
  };

  useEffect(() => {
    const fetchDepartmentName = async () => {
      if (selectedTicket?.department_id) {
        try {
          const token = localStorage.getItem("accessToken");
          const response = await fetch(
            `https://chatsupport.fskindia.com/departments/${selectedTicket.department_id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (!response.ok) {
            throw new Error("Failed to fetch department name");
          }
          const data = await response.json();
          setDepartmentName(data.name || "N/A");
        } catch (error) {
          console.error(
            "[SupportChatWidget] Fetch department name error:",
            error,
          );
          setDepartmentName("N/A");
        }
      } else {
        setDepartmentName("N/A");
      }
    };
    fetchDepartmentName();
  }, [selectedTicket?.department_id]);

  useEffect(() => {
    if (isAgent === undefined || agentEmail === undefined) {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      if (authData.user?.email && authData.user?.role_id) {
        // console.log("[SupportChatWidget] Loaded user from auth.user:", {
        //   email: authData.user.email,
        //   role_id: authData.user.role_id,
        // });
        setLocalIsAgent(authData.user.role_id === 3);
        setLocalAgentEmail(authData.user.email);
      } else {
        setLocalIsAgent(false);
        setLocalAgentEmail(null);
      }
    }
  }, [isAgent, agentEmail]);
  useEffect(() => {
    const agentEmailElement = document.getElementById("agent-email");
    if (agentEmailElement && selectedTicket) {
      const agentDisplay =
        selectedTicket.agent_name || selectedTicket.agent_email || "Unassigned";
      agentEmailElement.textContent = `${agentDisplay}`;
      // console.log(
      //   "[SupportChatWidget] Updated agent-email element:",
      //   agentDisplay
      // );
    }
  }, [selectedTicket]);
  useEffect(() => {
    if (isAgent === undefined) {
    }
  }, [isAgent, isAgentWithFallback]);

  const handleReplyToMessage = (messageId) => {
    const message = messages.find((msg) => msg.id === messageId);
    if (!message) {
      console.error("[SupportChatWidget] Message not found for reply:", {
        messageId,
      });
      toast.error("Message not found.");
      return;
    }

    // console.log("[SupportChatWidget] Selected message to reply:", {
    //   messageId,
    //   ticketNumber: selectedTicket?.ticket_number,
    //   ticketStatus: selectedTicket?.status,
    //   isAgent: isAgentWithFallback,
    //   hasJoined,
    // });
    setReplyToMessageId(messageId);

    // Log conditions for enabling input
    if (
      selectedTicket?.status !== "closed" &&
      (!isAgentWithFallback ||
        joinedTickets.some((t) => t.ticketNumber === ticketNumber))
    ) {
      //
    } else {
      toast.warn("Cannot reply: Ticket is closed or you haven't joined.");
    }
  };

  const handleInactivityTimeout = async () => {
    if (!ticketNumber) return;
    try {
      const response = await closeConversation({
        ticket_number: ticketNumber,
        close_by_agent: isAgentWithFallback,
      });

      toast.success("Ticket closed due to inactivity.");
      if (socket.current && socket.current.readyState === WebSocket.OPEN) {
        const message = {
          message_type: "ticket_closed",
          content: `Ticket ${ticketNumber} closed due to inactivity.`,
          sender_type: isAgentWithFallback ? "agent" : "user",
          sender_email: isAgentWithFallback
            ? agentEmail || localAgentEmail || "forus@gmail.com"
            : "forus@gmail.com",
          timestamp: new Date().toISOString(),
        };
        socket.current.send(JSON.stringify(message));
        socket.current.close();
      }
      setMessages([]);
      setSelectedTicket(null);
      setTicketNumber(null);
      setWebsocketUrl(null);
      setToken(null);
      localStorage.removeItem("websocket_token");
      setIsHumanHandoff(false);
      updateTicketPartial(ticketNumber, { status: "closed" });
      setLastUserMessageTime(null);
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
      navigate("/messages?tab=Support-Ticket", { replace: true });
      if (fetchTicketsRef.current) {
        setTimeout(() => fetchTicketsRef.current(), 1000);
      }
    } catch (err) {
      console.error("[SupportChatWidget] Inactivity close error:", {
        message: err.message,
        status: err.status,
        response: err.response,
        code: err.code,
      });
      // toast.error(
      //   err.status === 404 || err.message.includes('Ticket not found') || err.message.includes('support request not found')
      //     ? 'Failed to close ticket due to server issue. Please contact support.'
      //     : err.message || 'Failed to close ticket due to inactivity. Please try again or contact support.'
      // );
    }
  };

  useEffect(() => {
    if (lastUserMessageTime && ticketNumber) {
      inactivityTimeoutRef.current = setTimeout(
        handleInactivityTimeout,
        INACTIVITY_TIMEOUT,
      );
    }
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };
  }, [lastUserMessageTime, ticketNumber]);

  // const prevFiltersRef = useRef({ nameFilter: "", dateFilter: "active" });

  useEffect(() => {
    if (
      isAgent &&
      (!agentEmail ||
        typeof agentEmail !== "string" ||
        agentEmail.trim() === "")
    ) {
      console.error("[SupportChatWidget] Invalid agent email:", agentEmail);
      // toast.error('Invalid agent email. Please verify your credentials.');
      return;
    }
  }, [agentEmail, isAgent]);

  const fetchTickets = async () => {
    setIsFetching(true);
    try {
      // console.log("[SupportChatWidget] Fetching real-time tickets:", {
      //   agentEmail,
      //   dateFilter,
      //   limit: ticketsPerPage,
      //   offset: (currentPage - 1) * ticketsPerPage,
      // });

      const params = {
        agent_email: isAgent ? agentEmail : undefined,
        limit: ticketsPerPage,
        offset: (currentPage - 1) * ticketsPerPage,
        status:
          dateFilter === "active"
            ? "initiated,agent_engaged"
            : dateFilter === "history"
              ? "resolved,closed"
              : "transferred",
      };

      // console.log(
      //   "[SupportChatWidget] API request params for real-time tickets:",
      //   params
      // );
      const data = await getSupportRequests(params);
      if (!Array.isArray(data)) {
        console.error(
          "[SupportChatWidget] Invalid response format from getSupportRequests:",
          data,
        );
        // toast.error('Invalid ticket data received from server.');
        return;
      }

      const newTicketsMap = new Map();
      data.forEach((ticket) => {
        if (!newTicketsMap.has(ticket.ticket_number)) {
          const existingTicket = tickets.find(
            (t) => t.ticket_number === ticket.ticket_number,
          );
          newTicketsMap.set(ticket.ticket_number, {
            ...ticket,
            agent_email: ticket.agent_email || null,
            agent_name: existingTicket?.agent_name || ticket.agent_name || null,
            status: ticket.status || "initiated",
            site_id: ticket.site_id || null,
          });
        } else {
          console.warn(
            "[SupportChatWidget] Duplicate ticket detected:",
            ticket.ticket_number,
          );
        }
      });

      const updatedTickets = Array.from(newTicketsMap.values()).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      replaceTickets(updatedTickets);
      if (
        !showFilterPanel &&
        !usernameFilter &&
        !userEmailFilter &&
        !agentEmailFilter &&
        !ticketNumberFilter &&
        !siteIdFilter
      ) {
        setFilteredTickets(updatedTickets);
      }
    } catch (err) {
      console.error("[SupportChatWidget] Fetch real-time tickets error:", {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
      });
      // toast.error(err.message || 'Failed to load tickets. Please check your credentials.');
    } finally {
      setIsFetching(false);
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTicketsRef.current = fetchTickets;
  }, [fetchTickets]);

  useEffect(() => {
    const handleNotification = (data) => {
      // console.log("[SupportChatWidget] Received notification:", data);
      if (
        data.notification_type === "general" ||
        data.notification_type === "transfer" ||
        (data.message_type === "notification" &&
          data.message?.toLowerCase().includes("ticket created")) ||
        data.status === "initiated"
      ) {
        //
        if (fetchTicketsRef.current) {
          fetchTicketsRef.current();
        }
      }
    };

    NotificationService.subscribe("realtime_notification", handleNotification);

    return () => {
      NotificationService.unsubscribe(
        "realtime_notification",
        handleNotification,
      );
    };
  }, []);

  const fetchFilteredTickets = async () => {
    setIsFetching(true);
    try {
      // console.log("[SupportChatWidget] Fetching filtered tickets:", {
      //   agentEmail,
      //   usernameFilter,
      //   userEmailFilter,
      //   agentEmailFilter,
      //   ticketNumberFilter,
      //   siteIdFilter,
      //   dateFilter,
      //   limit: ticketsPerPage,
      //   offset: (currentPage - 1) * ticketsPerPage,
      // });

      const params = {
        agent_email: isAgent
          ? agentEmailFilter || agentEmail
          : agentEmailFilter || undefined,
        ticket_number: ticketNumberFilter || undefined,
        site_id: siteIdFilter || undefined,
        username: usernameFilter || undefined,
        user_email: userEmailFilter || undefined,
        limit: ticketsPerPage,
        offset: (currentPage - 1) * ticketsPerPage,
        status:
          dateFilter === "active"
            ? "initiated,agent_engaged"
            : dateFilter === "history"
              ? "resolved,closed"
              : "transferred",
      };

      // console.log(
      //   "[SupportChatWidget] API request params for filtered tickets:",
      //   params
      // );
      const data = await getSupportRequests(params);
      if (!Array.isArray(data)) {
        console.error(
          "[SupportChatWidget] Invalid response format from getSupportRequests:",
          data,
        );
        // toast.error('Invalid ticket data received from server.');
        return;
      }

      const newTicketsMap = new Map();
      data.forEach((ticket) => {
        if (!newTicketsMap.has(ticket.ticket_number)) {
          const existingTicket = tickets.find(
            (t) => t.ticket_number === ticket.ticket_number,
          );
          newTicketsMap.set(ticket.ticket_number, {
            ...ticket,
            agent_email: ticket.agent_email || null,
            agent_name: existingTicket?.agent_name || ticket.agent_name || null,
            status: ticket.status || "initiated",
            site_id: ticket.site_id || null,
          });
          // console.log("[SupportChatWidget] Processed filtered ticket:", {
          //   ticket_number: ticket.ticket_number,
          //   agent_email: ticket.agent_email,
          //   agent_name: existingTicket?.agent_name || ticket.agent_name || null,
          //   status: ticket.status,
          //   site_id: ticket.site_id,
          // });
        } else {
          console.warn(
            "[SupportChatWidget] Duplicate ticket detected:",
            ticket.ticket_number,
          );
        }
      });

      const updatedTickets = Array.from(newTicketsMap.values()).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      );
      setFilteredTickets(updatedTickets);
    } catch (err) {
      console.error("[SupportChatWidget] Fetch filtered tickets error:", {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
      });
      // toast.error(err.message || 'Failed to load filtered tickets. Please check your credentials.');
    } finally {
      setIsFetching(false);
      setLoadingTickets(false);
    }
  };
  const resetFilteredTickets = () => {
    setFilteredTickets([]);
  };
  const handleFilterPanelToggle = () => {
    setShowFilterPanel((prev) => {
      const newState = !prev;
      if (!newState) {
        setUsernameFilter("");
        setUserEmailFilter("");
        setAgentEmailFilter("");
        setTicketNumberFilter("");
        setSiteIdFilter("");
        setCurrentPage(1);
        setFilteredTickets(tickets); // Restore tickets for Active/History view
      } else {
        resetFilteredTickets(); // Clear tickets when opening filter panel
      }
      return newState;
    });
  };

  const handleMinimize = () => {
    if (!selectedTicket) return;
    if (openSupportChatPopups.some((p) => p.ticket.ticket_number === selectedTicket.ticket_number)) {
      toast.warning("This support chat is already open as a popup panel.");
      return;
    }
    const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;
    if (total >= 4) {
      toast.error("Maximum of 4 chat windows are already open.");
      return;
    }
    // Pass full ticket, messages, websocket credentials so popup can restore state
    dispatch(addSupportChatPopup({
      ...selectedTicket,
      _messages: messages,
      _websocketUrl: websocketUrl,
      _token: token,
      _hasJoined: hasJoined,
    }));
    setSelectedTicket(null);
    setTicketNumber(null);
  };
  // Handle URL ticket number to auto-select and open ticket chat
  useEffect(() => {
    // Skip if no urlTicketNumber or already processing a ticket
    if (!urlTicketNumber || ticketNumber === urlTicketNumber) {
      // console.log("[SupportChatWidget] Skipping URL ticket processing:", {
      //   urlTicketNumber,
      //   currentTicketNumber: ticketNumber,
      // });
      return;
    }

    const ticket =
      tickets.find((t) => t.ticket_number === urlTicketNumber) ||
      filteredTickets.find((t) => t.ticket_number === urlTicketNumber);

    if (ticket) {
      setSelectedTicket(ticket);
      setTicketNumber(urlTicketNumber);
      navigate(`/messages?tab=Support-Ticket&ticket=${urlTicketNumber}`, { replace: true });
    } else {
      console.warn(
        "[SupportChatWidget] No ticket found for URL ticket number:",
        urlTicketNumber,
      );
      setSelectedTicket(null);
      setTicketNumber(null);
      navigate("/messages?tab=Support-Ticket", { replace: true });
      //
    }
  }, [urlTicketNumber, tickets, filteredTickets, navigate]);

  useEffect(() => {
    if (isAgent) {
      setLoadingTickets(false);
      return;
    }
    if (!showFilterPanel) {
      // console.log(
      //   "[SupportChatWidget] Fetching tickets for Active/History view"
      // );
      fetchTickets();
    }
  }, [
    isAgent,
    agentEmail,
    dateFilter,
    currentPage,
    datessFilter,
  ]);

  useEffect(() => {
    if (!memoizedSelectedTicket) return;

    const fetchSiteDetails = async () => {
      try {
        const siteIdStr = String(memoizedSelectedTicket.site_id);
        const siteData = await getSiteDetails(siteIdStr);
        setBotRepliesEnabled(siteData.bot_replies || false);
      } catch (err) {
        console.error("[SupportChatWidget] Fetch site details error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        setBotRepliesEnabled(false);
      }
    };
    fetchSiteDetails();
  }, [memoizedSelectedTicket?.ticket_number]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setIsChatTabOpen(true);
        if (selectedTicket?.ticket_number && messages.length > 0) {
          const unreadMessages = messages.filter(
            (m) =>
              !m.is_read &&
              m.sender_type !==
                (isAgentWithFallback || isHumanHandoff ? "agent" : "user"),
          );
          if (unreadMessages.length > 0) {
            const messageIds = unreadMessages
              .map((m) => m.id)
              .filter((id) => id && Number.isInteger(Number(id)));
            if (messageIds.length > 0) {
              markMessagesAsRead(messageIds, selectedTicket?.ticket_number);
            }
          }
        }
      } else {
        setIsChatTabOpen(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [
    selectedTicket,
    messages,
    isAgentWithFallback,
    isHumanHandoff,
    markMessagesAsRead,
  ]);

  const fetchMessages = useCallback(async (tNumber) => {
    const target = tNumber || ticketNumber;
    if (!target) return;
    setLoadingMessages(true);
    try {
      const data = await getMessages({ ticket_number: target });
      setMessages(
        data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      );
      const unreadMessageIds = data
        .filter((msg) => !msg.is_read && msg.sender_type !== "agent")
        .map((msg) => msg.id)
        .filter((id) => !id.toString().startsWith("temp-") && Number.isInteger(Number(id)));
      if (unreadMessageIds.length > 0 && isChatTabOpen) {
        await markMessagesAsRead(unreadMessageIds, target);
      }
    } catch (err) {
      console.error("[SupportChatWidget] Fetch messages error:", err.message);
    } finally {
      setLoadingMessages(false);
    }
  }, [ticketNumber, isChatTabOpen, markMessagesAsRead]);

  // Load messages whenever ticket changes
  useEffect(() => {
    if (!ticketNumber) return;
    setMessages([]); // Clear previous ticket messages before loading new ones
    fetchMessages(ticketNumber);
  }, [ticketNumber]);

  async function handleJoinOrRequestHuman() {
    if (!ticketNumber) {
      toast.error("No ticket selected");
      return;
    }
    if (selectedTicket?.status === "closed") {
      toast.error("Ticket is closed. Cannot perform action.");
      return;
    }
    if (!agentEmail && isAgent) {
      toast.error("Agent email missing. Please login again.");
      return;
    }
    if (
      joinedTickets.some((t) => t.ticketNumber === ticketNumber) &&
      socket?.readyState === WebSocket.OPEN
    ) {
      return;
    }
    if (isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;
    setSubmitting(true);
    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      const agentEmailToUse = agentEmail || authData.sub || "agent@example.com";
      const agentName =
        authData.user?.first_name && authData.user?.last_name
          ? `${authData.user.first_name} ${authData.user.last_name}`
          : authData.user?.name || "Agent";

      // Check if the ticket is already fully assigned (both agents)
      if (
        selectedTicket?.assigned_agent_email &&
        selectedTicket?.final_agent_email &&
        selectedTicket.assigned_agent_email !== agentEmailToUse &&
        selectedTicket.final_agent_email !== agentEmailToUse
      ) {
        toast.error("This ticket already has two agents assigned.");
        return;
      }

      if (socket) {
        socket.close();
        setSocket(null);
      }

      let response;
      if (botRepliesEnabled) {
        response = await requestHumanAgent({
          ticket_number: ticketNumber,
          agent_email: agentEmailToUse,
        });
      } else {
        response = await getSocketUrl(ticketNumber, agentEmailToUse, agentName);
      }

      if (!response?.websocket_url || !response?.token) {
        console.error(
          "[JoinOrRequestHuman] Invalid WebSocket response:",
          response,
        );
        toast.error("Failed to retrieve WebSocket details. Please try again.");
        return;
      }

      // Check if another agent is connected and ensure second slot is available
      if (
        response.current_agent &&
        response.current_agent !== agentEmailToUse &&
        selectedTicket?.final_agent_email &&
        selectedTicket.final_agent_email !== agentEmailToUse
      ) {
        toast.error("This ticket already has two agents handling it.");
        return;
      }

      const correctedWebsocketUrl = response.websocket_url.replace(
        /^ws:\/\//,
        "wss://",
      );
      setWebsocketUrl(correctedWebsocketUrl);
      setToken(response.token);
      // Store token in localStorage so markMessagesAsRead can access it
      localStorage.setItem("websocket_token", response.token);

      // Determine if this is the first or second agent
      const isSecondAgent =
        selectedTicket?.assigned_agent_email &&
        !selectedTicket?.final_agent_email;
      const ticketUpdate = {
        agent_name: agentName,
        agent_email: agentEmailToUse,
        [isSecondAgent ? "final_agent_email" : "assigned_agent_email"]:
          agentEmailToUse,
        status: "agent_engaged",
      };

      // Update ticket state
      updateTicketPartial(ticketNumber, ticketUpdate);
      setSelectedTicket((prev) =>
        prev?.ticket_number === ticketNumber
          ? { ...prev, ...ticketUpdate }
          : prev,
      );

      // Dispatch Redux action to join chat AFTER local state is updated
      dispatch(joinChat({ ticketNumber }));

      // Create new WebSocket connection
      const newSocket = connectWebSocket(
        ticketNumber,
        response.token,
        (message) => {

          // Handle server-side errors (e.g. edit/delete rejected)
          if (message.type === "error") {
            toast.error(message.content || "Server error.");
            // Revert any optimistic edit — restore original content from server
            if (message.content?.toLowerCase().includes("edit")) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === editingMessageId
                    ? { ...m, content: m._originalContent ?? m.content, is_edited: m._wasEdited ?? m.is_edited }
                    : m
                )
              );
              setEditingMessageId(null);
            }
            return;
          }

          if (message.message_type === "ticket_closed") {
            // Prevent automatic closure if the ticket is still considered active
            if (
              selectedTicketRef.current &&
              selectedTicketRef.current.status !== "closed" &&
              selectedTicketRef.current.status !== "resolved"
            ) {
              console.warn(
                "[SupportChatWidget] Received ticket_closed message for an active ticket. Ignoring automatic closure.",
              );
              toast.warn(
                message.content ||
                  `Conversation received a close signal, but remains active.`,
              );
              // Do not proceed with closing the chat
            } else {
              toast.info(message.content || `Conversation closed.`);
              updateTicketPartial(ticketNumber, { status: "closed" });
              setMessages([]);
              setSelectedTicket(null);
              setTicketNumber(null);
              setWebsocketUrl(null);
              setToken(null);
      localStorage.removeItem("websocket_token");
              setIsHumanHandoff(false);
              setHasJoined(false);
              if (socket) {
                socket.close();
                setSocket(null);
              }
              if (message.sender_type === "user" && dateFilter !== "history") {
                setDateFilter("history");
              }
              if (fetchTicketsRef.current) {
                setTimeout(() => fetchTicketsRef.current(), 1000);
              }
            }
          } else if (message.type === "typing") {
            if (
              message.sender_email !==
              (isAgentWithFallback || isHumanHandoff
                ? agentEmail || localAgentEmail || "agent@gmail.com"
                : "agent@gmail.com")
            ) {
              if (message.status === "started") {
                setTypingStatus({
                  sender_type: message.sender_type || "unknown",
                  sender_email: message.sender_email || "unknown@example.com",
                });
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  setTypingStatus(null);
                }, 3000);
              } else if (message.status === "stopped") {
                setTypingStatus(null);
              }
            }
          } else if (
            ["message_edited", "edit"].includes(message.message_type)
          ) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message.message_id
                  ? {
                      ...msg,
                      content: message.content,
                      timestamp:
                        message.edited_at ||
                        message.timestamp ||
                        new Date().toISOString(),
                      is_edited: true,
                      edited_by: message.edited_by || message.sender_type,
                    }
                  : msg,
              ),
            );
          } else if (
            message.message_type === "update_status" ||
            message.type === "status_updated" ||
            message.message_type === "status_updated"
          ) {
            console.log("Message status updated", message);
            const isRead = message.is_read || message.status === "read";
            const readAt = message.read_at || message.updated_at || new Date().toISOString();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === message.message_id
                  ? { ...m, is_read: isRead, read_at: isRead ? readAt : m.read_at }
                  : m,
              ),
            );
          } else if (message.message_type === "file_upload_success") {
            toast.success(message.message || "File uploaded successfully");
          } else if (message.message_type === "file_upload_error") {
            toast.error(message.message || "File upload failed");
          } else if (
            ["text", "file_upload", "file", "notification"].includes(
              message.message_type,
            )
          ) {
            setMessages((prev) => {
              let updatedContent = message.content;
              if (message.message_type === "file") {
                updatedContent = `https://supportdesk.fskindia.com/support/serve-file/${message.filename}`;
              }
              const messageWithId = {
                ...message,
                content: updatedContent,
                id: message.message_id,
                is_read: message.is_read || false,
                sender_type: message.sender_type || "unknown",
                timestamp: message.timestamp || new Date().toISOString(),
              };

              const existingIndex = prev.findIndex(
                (m) =>
                  m.id === message.message_id ||
                  (String(m.id).startsWith("temp-") && m.content === message.content)
              );

              let newMessages;
              if (existingIndex !== -1) {
                // Replace optimistic or existing message to update its ID
                newMessages = [...prev];
                newMessages[existingIndex] = messageWithId;
              } else {
                newMessages = [...prev, messageWithId];
              }

              newMessages = newMessages
                .slice(-100)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

              if (message.sender_type === "user") {
                setLastUserMessageTime(Date.now());
              }
              if (
                isChatTabOpen &&
                message.sender_type !==
                  (isAgentWithFallback || isHumanHandoff ? "agent" : "user") &&
                !message.is_read &&
                messageWithId.id &&
                Number.isInteger(Number(messageWithId.id))
              ) {
                markMessagesAsRead([messageWithId.id], null);
              }
              return newMessages;
            });
            if (
              message.message_type === "notification" &&
              message.content?.toLowerCase().includes("ticket created")
            ) {
              fetchTicketsRef.current?.();
            }
          }

          const content = message.content?.toLowerCase() || "";

          if (
            content.includes("closed by user") ||
            content.includes("closed by user with rating:")
          ) {
            setSelectedTicket((prev) => ({
              ...prev,
              status: "closed",
            }));
            handleCloseConversation();

            updateTicketPartial(ticketNumber, { status: "closed" });

            toast.info("Ticket closed by user");
          }
          setMessages((prev) => {
            if (!message.id || !Number.isInteger(Number(message.id))) {
              return prev;
            }
            const messageWithId = {
              ...message,
              id: message.id,
              is_read: message.is_read || false,
              sender_type: "system",
              timestamp: message.timestamp || new Date().toISOString(),
            };
            if (
              prev.some(
                (m) =>
                  m.id === messageWithId.id ||
                  (m.content === messageWithId.content &&
                    m.timestamp === messageWithId.timestamp),
              )
            ) {
              return prev;
            }
            return [...prev, messageWithId]
              .slice(-100)
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
          toast.info(message.content);
        },
        () => {
          isConnectingRef.current = false;
          toast.success(
            botRepliesEnabled ? "Agent notified!" : "Joined chat successfully!",
            {
              toastId: `join-${ticketNumber}`,
            },
          );
          // Send notification through ticket-specific WebSocket
          const notificationMessage = {
            message_type: "notification",
            ticket_number: ticketNumber,
            agent_email: agentEmailToUse,
            message: `${agentName} has joined the conversation`,
            timestamp: new Date().toISOString(),
          };
          newSocket.send(JSON.stringify(notificationMessage));

          if (messageInputRef.current) {
            messageInputRef.current.focus();
          }

          // Manually trigger notification for the joining agent through NotificationService
          const localNotificationData = {
            id: uuidv4(),
            ticket_number: ticketNumber,
            agent_email: agentEmailToUse,
            message: `${agentName} has joined the conversation`,
            timestamp: new Date().toISOString(),
            priority: "medium",
            issue_description:
              selectedTicket?.issue_description || "No description provided",
            status: "agent_engaged",
            created_at: selectedTicket?.created_at || new Date().toISOString(),
            site_id: selectedTicket?.site_id || NotificationService.siteId,
            name: selectedTicket?.name || "Unknown User",
            email: selectedTicket?.email || "Unknown Email",
            mobile: selectedTicket?.mobile || "Unknown Mobile",
            site_name: selectedTicket?.site_name || "Unknown Site",
            notification_type: "general",
            is_read: false,
          };
        },
        (event) => {
          // Socket closed — re-fetch messages to preserve history, don't clear
          setSocket(null);
          dispatch(leaveChat({ ticketNumber }));
          isConnectingRef.current = false;
          fetchMessages(ticketNumber);
        },
        (error) => {
          console.error("[SupportChatWidget] WebSocket error:", error);
          setSocket(null);
          dispatch(leaveChat({ ticketNumber }));
          isConnectingRef.current = false;
          toast.error("Connection lost. Please try joining again.");
          fetchMessages(ticketNumber);
        },
        correctedWebsocketUrl,
      );
      // Set socket immediately so MessageInput can check readyState without waiting for onOpen
      if (newSocket) setSocket(newSocket);
    } catch (err) {
      console.error("[JoinOrRequestHuman] Error:", {
        message: err.message,
        status: err.response?.status,
      });
      if (err.response?.status === 404) {
        toast.info("Ticket not found.");
        setSelectedTicket(null);
        setTicketNumber(null);
      } else if (err.response?.status === 403) {
        toast.error("Forbidden: Unable to perform action.");
        navigate("/auth-login", { replace: true });
      } else if (err.message.includes("already assigned")) {
        toast.error("This ticket already has two agents assigned.");
      } else {
        toast.error(err.message || "Action failed. Please try again.");
      }
    } finally {
      isConnectingRef.current = false;
      setSubmitting(false);
    }
  }
  // Updated cleanup useEffect (unchanged, retained for completeness)
  useEffect(() => {
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        //
        socket.close();
        setSocket(null);
        dispatch(leaveChat({ ticketNumber }));
      }
      isConnectingRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFetchTickets = () => {
    setCurrentPage(1);
    fetchTickets();
  };

  const handleEditMessage = (messageId, newContent) => {
    if (!messageId || !newContent.trim()) {
      console.error("[SupportChatWidget] Edit message failed: Invalid input", {
        messageId,
        newContent,
      });
      toast.error("Please provide valid message content.");
      return;
    }
    if (selectedTicket?.status === "closed") {
      console.error(
        "[SupportChatWidget] Edit message failed: Ticket is closed",
        { ticketNumber: selectedTicket.ticket_number },
      );
      toast.error("Cannot edit messages in closed tickets.");
      return;
    }
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error(
        "[SupportChatWidget] Edit message failed: WebSocket not connected",
        { readyState: socket?.readyState },
      );
      toast.error("Connection lost. Unable to edit message.");
      return;
    }

    const message = messages.find((msg) => msg.id === messageId);
    if (!message) {
      toast.error("Message not found.");
      return;
    }

    // Check ownership by email — works regardless of role
    const authData = JSON.parse(localStorage.getItem("auth") || "{}");
    const myEmail = authData.user?.email || localAgentEmail || agentEmail;
    if (myEmail && message.sender_email && message.sender_email !== myEmail) {
      toast.error("You can only edit your own messages.");
      return;
    }

    const messageTimestamp = new Date(message.timestamp).getTime();
    if (new Date().getTime() - messageTimestamp > 1 * 60 * 1000) {
      toast.error("Messages can only be edited within 1 minute.");
      return;
    }

    const editMessage = {
      type: "edit",
      message_id: messageId,
      content: newContent,
      ticket_number: selectedTicket.ticket_number,
      timestamp: new Date().toISOString(),
      sender_type: senderType,
      sender_email:
        isAgentWithFallback || isHumanHandoff
          ? agentEmail || localAgentEmail || "agent@example.com"
          : "user@example.com",
    };

    try {
      socket.send(JSON.stringify(editMessage));
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                _originalContent: msg.content,   // save for potential revert
                _wasEdited: msg.is_edited,
                content: newContent,
                is_edited: true,
                timestamp: editMessage.timestamp,
              }
            : msg,
        ),
      );
      setEditingMessageId(null);
      toast.success("Message edited successfully.");
    } catch (error) {
      console.error("[SupportChatWidget] Error sending edit message:", {
        message: error.message,
        ticketNumber: selectedTicket.ticket_number,
        messageId,
      });
      toast.error("Failed to edit message. Please try again.");
    }
  };
  const onEditMessage = (id, content) => {
    if (!messageInputRef.current) {
      console.warn(
        "[SupportChatWidget] messageInputRef is null, cannot set input value",
      );
      toast.error(
        "Cannot edit message: Input field not found. Please try again.",
      );
      return;
    }
    setEditingMessageId(id);
    setMessageText(content);
    messageInputRef.current.focus();
  };

  const handleDeleteMessage = (messageId) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      toast.error("Not connected. Please join the ticket first.");
      return;
    }
    const payload = {
      type: "delete",
      message_id: messageId,
      ticket_number: ticketNumber,
    };
    socket.send(JSON.stringify(payload));
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "", is_deleted: true } : m,
      ),
    );
  };
  // Modified handleJoinOrRequestHuman to enforce single agent connection

  useEffect(() => {
    if (showFilterPanel) return; // Do not filter client-side when panel is open
    const filterTickets = () => {
      let result = tickets;

      if (usernameFilter.trim()) {
        result = result.filter(
          (ticket) =>
            ticket.name?.toLowerCase().includes(usernameFilter.toLowerCase()) ||
            ticket.email?.toLowerCase().includes(usernameFilter.toLowerCase()),
        );
      }
      if (userEmailFilter.trim()) {
        result = result.filter(
          (ticket) =>
            ticket.name
              ?.toLowerCase()
              .includes(userEmailFilter.toLowerCase()) ||
            ticket.email?.toLowerCase().includes(userEmailFilter.toLowerCase()),
        );
      }
      if (agentEmailFilter.trim()) {
        result = result.filter((ticket) =>
          ticket.assigned_agent_email
            ?.toLowerCase()
            .includes(agentEmailFilter.toLowerCase()),
        );
      }
      if (ticketNumberFilter.trim()) {
        result = result.filter((ticket) =>
          ticket.ticket_number
            ?.toLowerCase()
            .includes(ticketNumberFilter.toLowerCase()),
        );
      }
      if (siteIdFilter.trim()) {
        result = result.filter((ticket) =>
          ticket.site_id?.toString().includes(siteIdFilter),
        );
      }
      if (datessFilter.trim()) {
        result = result.filter((ticket) =>
          ticket.created_at?.toString().slice(0, 10).includes(datessFilter),
        );
      }

      if (dateFilter === "active") {
        result = result.filter((ticket) =>
          ["agent_engaged", "initiated"].includes(ticket.status?.toLowerCase()),
        );
      } else if (dateFilter === "history") {
        result = result.filter((ticket) =>
          ["resolved", "closed"].includes(ticket.status?.toLowerCase()),
        );
      } else if (dateFilter === "transferred") {
        result = result.filter((ticket) =>
          ["transferred"].includes(ticket.status?.toLowerCase()),
        );
      }

      const totalPages = Math.ceil(result.length / ticketsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      }

      setFilteredTickets(result);
      // console.log("[SupportChatWidget] Filtered tickets:", {
      //   count: result.length,
      //   tickets: result.map((t) => ({
      //     ticket_number: t.ticket_number,
      //     assigned_agent_email: t.assigned_agent_email,
      //     agent_email: t.agent_email,
      //     status: t.status,
      //     site_id: t.site_id,
      //   })),
      // });
    };

    filterTickets();
  }, [
    tickets,
    usernameFilter,
    userEmailFilter,
    agentEmailFilter,
    ticketNumberFilter,
    siteIdFilter,
    dateFilter,
    datessFilter,
    currentPage,
  ]);

  const handleBlockUser = async () => {
    if (!selectedTicket) return;
    try {
      const authData = JSON.parse(localStorage.getItem("auth") || "{}");
      const blocked_by = authData.sub || agentEmail || "agent@example.com";
      await blockUser({
        email: selectedTicket.email,
        mobile: selectedTicket.mobile,
        ticket_number: selectedTicket.ticket_number,
        blocked_by,
        reason: "Blocked by agent",
      });
      toast.success(`User ${selectedTicket.name || selectedTicket.email} has been blocked.`);
    } catch (err) {
      toast.error(err?.message || "Failed to block user.");
    } finally {
      setBlockModal(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!ticketNumber) {
      toast.error("No ticket selected.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await closeConversation({
        ticket_number: ticketNumber,
        close_by_agent: isAgentWithFallback,
      });

      toast.success("Ticket closed!");
      if (socket && socket.readyState === WebSocket.OPEN) {
        const message = {
          message_type: "ticket_closed",
          content: `Ticket ${ticketNumber} closed by ${
            isAgentWithFallback ? "agent" : "user"
          }`,
          sender_type: isAgentWithFallback ? "agent" : "user",
          sender_email: isAgentWithFallback
            ? agentEmail || localAgentEmail || "agent@gmail.com"
            : "agent@gmail.com",
          timestamp: new Date().toISOString(),
        };
        socket.send(JSON.stringify(message));
        socket.close();
      }
      setMessages([]);
      setSelectedTicket(null);
      setTicketNumber(null);
      setWebsocketUrl(null);
      setToken(null);
      localStorage.removeItem("websocket_token");
      setIsHumanHandoff(false);
      updateTicketPartial(ticketNumber, { status: "closed" });
      if (fetchTicketsRef.current) {
        setTimeout(() => fetchTicketsRef.current(), 1000);
      }
      navigate("/support-chat", { replace: true });
    } catch (err) {
      console.error("[SupportChatWidget] Close conversation error:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      toast.error(err.response?.data?.message || "Failed to close ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = filteredTickets.slice(
    indexOfFirstTicket,
    indexOfLastTicket,
  );
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const ticketList = document.querySelector(".ticket-list");
    if (ticketList) {
      ticketList.scrollTop = 0;
    }
  };

  // console.log(tickets)

  return (
    <>
      <Head title="Support Chat"></Head>
      <div className="support-chat-wrapper">
        <div className="support-chat-container">
          <div className="sidebar">
            {/* Gear icon switcher — switch between Chats, Groups, Support */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
              <UncontrolledDropdown>
                <DropdownToggle tag="a" className="modern-chat-sidebar-tool-btn" style={{ cursor: "pointer" }}>
                  <Icon name="setting-alt-fill" />
                </DropdownToggle>
                <DropdownMenu end>
                  <ul className="link-list-opt no-bdr">
                    <li>
                      <DropdownItem tag="a" href="#" onClick={(e) => { e.preventDefault(); navigate("/messages"); }}>
                        <span>Messages</span>
                      </DropdownItem>
                    </li>
                    <li>
                      <DropdownItem tag="a" href="#" onClick={(e) => { e.preventDefault(); navigate("/app-group-chat"); }}>
                        <span>Group Chats</span>
                      </DropdownItem>
                    </li>
                    <li>
                      <DropdownItem tag="a" href="#" onClick={(e) => { e.preventDefault(); navigate("/support-chat"); }}>
                        <span>Support Ticket</span>
                      </DropdownItem>
                    </li>
                  </ul>
                </DropdownMenu>
              </UncontrolledDropdown>
            </div>
            <h4 className="sidebar-title">Your Tickets</h4>
            <button
              className={`btn ${
                showFilterPanel ? "btn-secondary" : "btn-primary"
              } mb-3 w-100`}
              onClick={handleFilterPanelToggle}
              aria-label={
                showFilterPanel
                  ? "Switch to Active/History Tickets"
                  : "Filter Tickets "
              }
            >
              {showFilterPanel
                ? "Show Active/History Tickets"
                : "Filter Tickets"}
            </button>
            {showFilterPanel ? (
              <FilterPanel
                usernameFilter={usernameFilter}
                setUsernameFilter={setUsernameFilter}
                userEmailFilter={userEmailFilter}
                setUserEmailFilter={setUserEmailFilter}
                agentEmailFilter={agentEmailFilter}
                setAgentEmailFilter={setAgentEmailFilter}
                ticketNumberFilter={ticketNumberFilter}
                setTicketNumberFilter={setTicketNumberFilter}
                siteIdFilter={siteIdFilter}
                setSiteIdFilter={setSiteIdFilter}
                dateFilter={dateFilter}
                datessFilter={setDatesFilter}
                setDatesFilter={setDatesFilter}
                setDateFilter={setDateFilter}
                fetchFilteredTickets={fetchFilteredTickets}
                isFetching={isFetching}
                setCurrentPage={setCurrentPage}
                resetFilteredTickets={resetFilteredTickets}
              />
            ) : (
              <div className="filter-panel mb-3 p-3 bg-light border rounded">
                <h5>
                  {dateFilter === "active"
                    ? "Active Tickets "
                    : dateFilter === "history"
                      ? "History Tickets"
                      : "Transferred Tickets"}
                  <button
                    className="bg-transparent border-0 text-info"
                    onClick={handleFetchTickets}
                    title="Refresh tickets"
                    aria-label="Refresh tickets list"
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                  </button>
                </h5>
                <div
                  className="btn-group mb-2 w-100"
                  role="group"
                  aria-label="Ticket status filter"
                >
                  <button
                    type="button"
                    className={`btn ${dateFilter === "active" ? "btn-primary" : "btn-outline-primary"} p-1`}
                    onClick={() => setDateFilter("active")}
                    aria-pressed={dateFilter === "active"}
                  >
                    Active{" "}
                    <span className="badge bg-primary ms-1">
                      {
                        tickets.filter(
                          (ticket) =>
                            ["agent_engaged", "initiated"].includes(
                              ticket.status.toLowerCase(),
                            ),
                        ).length
                      }
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${dateFilter === "history" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setDateFilter("history")}
                    aria-pressed={dateFilter === "history"}
                  >
                    History
                  </button>
                  <button
                    type="button"
                    className={`btn ${dateFilter === "transferred" ? "btn-primary" : "btn-outline-primary"} p-1`}
                    onClick={() => setDateFilter("transferred")}
                    aria-pressed={dateFilter === "transferred"}
                  >
                    Transferred{" "}
                    <span className="badge bg-warning ms-1">
                      {
                        tickets.filter(
                          (ticket) =>
                            ticket.status.toLowerCase() === "transferred",
                        ).length
                      }
                    </span>
                  </button>
                </div>
              </div>
            )}
            {loadingTickets ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <p className="text-muted text-center py-4">
                No tickets match the filters.
              </p>
            ) : (
              <>
                <div className="ticket-list">
                  {currentTickets.map((ticket) => (
                    <div
                      key={ticket.ticket_number}
                      className={`ticket-card ${
                        selectedTicket?.ticket_number === ticket.ticket_number
                          ? "active"
                          : ""
                      } ${
                        ticket.status.toLowerCase() === "initiated"
                          ? "bg-info bg-opacity-10"
                          : ticket.status.toLowerCase() === "agent_engaged"
                            ? "bg-success bg-opacity-10"
                            : ticket.status.toLowerCase() === "resolved"
                              ? "bg-primary bg-opacity-25"
                              : ticket.status.toLowerCase() === "closed"
                                ? "bg-danger bg-opacity-10"
                                : ticket.status.toLowerCase() === "transferred"
                                  ? "bg-warning bg-opacity-10"
                                  : "bg-secondary bg-opacity-10"
                      }`}
                      onClick={() => {
                        if (
                          isAgent &&
                          (ticket.status === "closed" ||
                            ticket.status === "resolved")
                        ) {
                          toast.error(
                            "Cannot join closed or resolved tickets.",
                          );
                          return;
                        }
                        if (
                          showFilterPanel &&
                          dateFilter === "active" &&
                          ticket.status !== "initiated" &&
                          ticket.status !== "agent_engaged"
                        ) {
                          toast.error("Ticket is not active.");
                          return;
                        }
                        if (
                          isAgent &&
                          ticket.status === "transferred" &&
                          ticket.agent_email !== localAgentEmail
                        ) {
                          toast.error(
                            "You are not assigned to this transferred ticket.",
                          );
                          return;
                        }
                        if (
                          !selectedTicket ||
                          selectedTicket.ticket_number !== ticket.ticket_number
                        ) {
                          setMessages([]);
                        }
                        setSelectedTicket(ticket);

                        setTicketNumber(ticket.ticket_number);
                        navigate(
                          `/messages?tab=Support-Ticket&ticket=${ticket.ticket_number}`,
                          {
                            replace: true,
                          },
                        );
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (
                            isAgent &&
                            (ticket.status === "closed" ||
                              ticket.status === "resolved")
                          ) {
                            toast.error(
                              "Cannot join closed or resolved tickets.",
                            );
                            return;
                          }
                          if (
                            showFilterPanel &&
                            dateFilter === "active" &&
                            ticket.status !== "initiated" &&
                            ticket.status !== "agent_engaged"
                          ) {
                            toast.error("Ticket is not active.");
                            return;
                          }
                          if (
                            isAgent &&
                            ticket.status === "transferred" &&
                            ticket.agent_email !== localAgentEmail
                          ) {
                            toast.error(
                              "You are not assigned to this transferred ticket.",
                            );
                            return;
                          }
                          setSelectedTicket(ticket);
                          setTicketNumber(ticket.ticket_number);
                          navigate(
                            `/messages?tab=Support-Ticket&ticket=${ticket.ticket_number}`,
                            {
                              replace: true,
                            }
                          );
                        }
                      }}
                      aria-label={`Select ticket ${ticket.ticket_number}`}
                    >
                      <div className="ticket-header">
                        <strong>{ticket.name || "N/A"}</strong>
                        <span
                          className={`badge ${
                            ticket.status.toLowerCase() === "initiated"
                              ? "bg-info"
                              : ticket.status.toLowerCase() === "agent_engaged"
                                ? "bg-success"
                                : ticket.status.toLowerCase() === "resolved"
                                  ? "bg-primary"
                                  : ticket.status.toLowerCase() === "closed"
                                    ? "bg-danger"
                                    : ticket.status.toLowerCase() ===
                                        "transferred"
                                      ? "bg-warning"
                                      : "bg-secondary"
                          }`}
                        >
                          {ticket.status.toLowerCase() === "agent_engaged" &&
                          ticket.assigned_agent_email
                            ? ticket.final_agent_email
                              ? `${getAgentName(ticket.assigned_agent_email)}, ${getAgentName(ticket.final_agent_email)}`
                              : getAgentName(ticket.assigned_agent_email)
                            : ticket.status.charAt(0).toUpperCase() +
                                ticket.status.slice(1) || "Open"}
                        </span>
                      </div>
                      <p className="ticket-issue">
                        {ticket.issue_description || "No description available"}
                      </p>
                      <small className="text-muted">
                        Created:{" "}
                        {new Date(
                          ticket.created_at || Date.now(),
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        })}
                      </small>
                      <small className="text-muted d-block">
                        Agent:{" "}
                        {ticket.assigned_agent_email
                          ? ticket.final_agent_email
                            ? `${getAgentName(ticket.assigned_agent_email)}, ${getAgentName(ticket.final_agent_email)}`
                            : getAgentName(ticket.assigned_agent_email)
                          : "Unassigned"}
                      </small>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav aria-label="Ticket list pagination">
                    <ul className="pagination justify-content-center mt-3">
                      <li
                        className={`page-item ${
                          currentPage === 1 ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          aria-label="Previous page"
                        >
                          Previous
                        </button>
                      </li>
                      {[...Array(totalPages).keys()].map((page) => (
                        <li
                          key={page + 1}
                          className={`page-item ${
                            currentPage === page + 1 ? "active" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(page + 1)}
                            aria-label={`Page ${page + 1}`}
                          >
                            {page + 1}
                          </button>
                        </li>
                      ))}
                      <li
                        className={`page-item ${
                          currentPage === totalPages ? "disabled" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          aria-label="Next page"
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </>
            )}
          </div>
          <div className="chat-panel">
            {!selectedTicket && !isAgent ? (
              <div className="card new-ticket-card">
                <div className="card-body text-center py-5">
                  <h5 className="text-muted">
                    Select a ticket to start chatting
                  </h5>
                </div>
              </div>
            ) : (
              <div className="card chat-card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    {selectedTicket?.name && (
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          backgroundColor: "#6777ef" /* Example color */,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          marginRight: "8px",
                          fontSize: "12px",
                        }}
                      >
                        {selectedTicket.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <b>Name: {selectedTicket?.name || "N/A"}</b>
                    <b className="ms-3">
                      Email: {selectedTicket?.email || "N/A"}
                    </b>
                    <b className="ms-3">
                      Mobile: {selectedTicket?.mobile || "N/A"}
                    </b>
                    <div className="dropdown ms-2 mx-2">
                      <button
                        className="btn btn-link text-decoration-none p-0"
                        type="button"
                        id="ticketDetailsDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        aria-label="Toggle ticket details"
                      >
                        <i className="bi bi-info-circle"></i>
                      </button>
                      <ul
                        className="dropdown-menu"
                        aria-labelledby="ticketDetailsDropdown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <li className="dropdown-item bg-light">
                          <small>
                            <b>Copy both</b>
                            {(selectedTicket?.email ||
                              selectedTicket?.mobile) && (
                              <i
                                className="bi bi-clipboard ms-2 user-info-copy-icon"
                                role="button"
                                title="Copy name, email, and mobile"
                                onClick={() => {
                                  const textToCopy = `Name: ${selectedTicket?.name || "N/A"}\n\nEmail: ${selectedTicket?.email || "N/A"}\n\nMobile: ${selectedTicket?.mobile || "N/A"}`;
                                  navigator.clipboard.writeText(textToCopy);
                                  const icon = document.querySelector(
                                    `#ticketDetailsDropdown + .dropdown-menu .user-info-copy-icon`,
                                  );
                                  if (icon) {
                                    icon.classList.remove("bi-clipboard");
                                    icon.classList.add(
                                      "bi-clipboard-check-fill",
                                    );
                                    setTimeout(() => {
                                      icon.classList.remove(
                                        "bi-clipboard-check-fill",
                                      );
                                      icon.classList.add("bi-clipboard");
                                    }, 2000);
                                  }
                                }}
                              ></i>
                            )}
                          </small>
                        </li>
                        <li className="dropdown-item">
                          <small>
                            Email: {selectedTicket?.email || "N/A"}
                            {selectedTicket?.email && (
                              <i
                                className="bi bi-clipboard ms-2 email-copy-icon"
                                role="button"
                                title="Copy email"
                                onClick={() => {
                                  const textToCopy = `Email: ${selectedTicket.email}`;
                                  navigator.clipboard.writeText(textToCopy);
                                  const icon = document.querySelector(
                                    `#ticketDetailsDropdown + .dropdown-menu .email-copy-icon`,
                                  );
                                  if (icon) {
                                    icon.classList.remove("bi-clipboard");
                                    icon.classList.add(
                                      "bi-clipboard-check-fill",
                                    );
                                    setTimeout(() => {
                                      icon.classList.remove(
                                        "bi-clipboard-check-fill",
                                      );
                                      icon.classList.add("bi-clipboard");
                                    }, 2000);
                                  }
                                }}
                              ></i>
                            )}
                          </small>
                        </li>
                        <li className="dropdown-item">
                          <small>
                            Mobile: {selectedTicket?.mobile || "N/A"}
                            {selectedTicket?.mobile && (
                              <i
                                className="bi bi-clipboard ms-2 mobile-copy-icon"
                                role="button"
                                title="Copy mobile"
                                onClick={() => {
                                  const textToCopy = `Mobile: ${selectedTicket.mobile}`;
                                  navigator.clipboard.writeText(textToCopy);
                                  const icon = document.querySelector(
                                    `#ticketDetailsDropdown + .dropdown-menu .mobile-copy-icon`,
                                  );
                                  if (icon) {
                                    icon.classList.remove("bi-clipboard");
                                    icon.classList.add(
                                      "bi-clipboard-check-fill",
                                    );
                                    setTimeout(() => {
                                      icon.classList.remove(
                                        "bi-clipboard-check-fill",
                                      );
                                      icon.classList.add("bi-clipboard");
                                    }, 2000);
                                  }
                                }}
                              ></i>
                            )}
                          </small>
                        </li>
                      </ul>
                    </div>
                    {isAgentWithFallback &&
                      !hasJoined &&
                      selectedTicket?.status !== "closed" &&
                      selectedTicket?.status !== "resolved" && (
                        <button
                          className="btn btn-success text-dark border-0 mx-2"
                          onClick={handleJoinOrRequestHuman}
                          disabled={submitting || botRepliesEnabled === null}
                          aria-label={
                            botRepliesEnabled ? "Request Human" : "Join Ticket"
                          }
                        >
                          {botRepliesEnabled ? (
                            <>
                              <BiUserPlus /> Hand off
                            </>
                          ) : (
                            <>
                              <BiUserPlus /> Join Chat
                            </>
                          )}
                        </button>
                      )}
                    {selectedTicket?.status !== "closed" &&
                      selectedTicket?.status !== "resolved" && (
                        <ChatTransfer
                          ticketNumber={ticketNumber}
                          selectedTicket={selectedTicket}
                          isAgentWithFallback={isAgentWithFallback}
                          hasJoined={hasJoined}
                          agentEmail={agentEmail}
                          localAgentEmail={localAgentEmail}
                          setMessages={setMessages}
                          socket={socket}
                          setSelectedTicket={setSelectedTicket}
                          setTicketNumber={setTicketNumber}
                          setWebsocketUrl={setWebsocketUrl}
                          setToken={setToken}
                          setIsHumanHandoff={setIsHumanHandoff}
                          navigate={navigate}
                        />
                      )}
                    <TransferHistory
                      ticketNumber={ticketNumber}
                      selectedTicket={selectedTicket}
                    />
                    <StatusCheckModal
                      isOpen={showStatusModal}
                      toggle={() => setShowStatusModal(false)}
                      ticketNumber={ticketNumber}
                      isAgent={isAgent}
                      isHumanHandoff={isHumanHandoff}
                      agentEmail={agentEmail}
                      localAgentEmail={localAgentEmail}
                      socket={socket}
                      setMessages={setMessages}
                    />
                    {/* <button
        className="btn btn-primary"
        onClick={() => setShowHistoricalTickets((prev) => !prev)}
        aria-label={
          showHistoricalTickets
            ? <BsTicketPerforated />
            : <BsTicketDetailed />
        }
      >
        {showHistoricalTickets
          ? <BsTicketPerforated />
          : <BsTicketDetailed />
        }
      </button> */}
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip id="tooltip-ticket">
                          {showHistoricalTickets
                            ? "Show Current Tickets"
                            : "Show Historical Tickets"}
                        </Tooltip>
                      }
                    >
                      <button
                        onClick={() =>
                          setShowHistoricalTickets((prev) => !prev)
                        }
                        aria-label={
                          showHistoricalTickets
                            ? "Show Current Tickets"
                            : "Show Historical Tickets"
                        }
                        className={`
          mx-1 px-2 py-1 rounded
          bg-blue-600 text-white text-sm
          hover:bg-red-700
          transition-all duration-200
          flex items-center justify-center
        `}
                      >
                        {showHistoricalTickets ? (
                          <BsTicketPerforated size={16} />
                        ) : (
                          <BsTicketDetailed size={16} />
                        )}
                      </button>
                    </OverlayTrigger>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {selectedTicket && (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleMinimize}
                        title="Minimize"
                        aria-label="Minimize chat to popup"
                      >
                        <i className="bi bi-dash-lg" />
                      </button>
                    )}
                    {selectedTicket && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setBlockModal(true)}
                        title="Block user"
                        aria-label="Block this user"
                      >
                        <i className="bi bi-slash-circle" />
                      </button>
                    )}                    <span
                      className={`badge ${
                        selectedTicket?.status === "initiated"
                          ? "bg-info"
                          : selectedTicket?.status === "agent_engaged"
                            ? "bg-success"
                            : selectedTicket?.status === "resolved"
                              ? "bg-primary"
                              : selectedTicket?.status === "closed"
                                ? "bg-danger"
                                : selectedTicket?.status === "transferred"
                                  ? "bg-warning"
                                  : "bg-secondary"
                      }`}
                    >
                      {selectedTicket?.status === "agent_engaged"
                        ? selectedTicket?.assigned_agent_email
                          ? selectedTicket?.final_agent_email
                            ? `${getAgentName(selectedTicket.assigned_agent_email)}, ${getAgentName(selectedTicket.final_agent_email)}`
                            : getAgentName(selectedTicket.assigned_agent_email)
                          : "Unassigned"
                        : selectedTicket?.status.charAt(0).toUpperCase() +
                            selectedTicket?.status.slice(1) || "Open"}
                    </span>
                  </div>
                </div>
                <div className="card-subheader p-2 bg-light border-bottom">
                  <p className="ticket-issue mb-0">
                    <strong>
                      <b>Department:</b>{" "}
                    </strong>
                    {departmentName}
                    <br />
                    <strong>
                      <b>Ticket No:</b>{" "}
                    </strong>
                    {selectedTicket?.ticket_number}
                    <br />
                    <strong>
                      <b>Issue:</b>{" "}
                    </strong>
                    <span className="issue-description">
                      {selectedTicket?.issue_description?.length > 30
                        ? (() => {
                            const text = `${selectedTicket.issue_description.slice(0, 80)}...`;
                            const urlRegex = /\b((https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
                            const parts = text.split(urlRegex);
                            return parts.map((part, i) => {
                              if (part.match(urlRegex)) {
                                const href = part.startsWith("http")
                                  ? part
                                  : `https://${part}`;
                                return (
                                  <a
                                    key={i}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {part}
                                  </a>
                                );
                              }
                              return part;
                            });
                          })()
                        : (() => {
                            const text =
                              selectedTicket?.issue_description ||
                              "No description available";
                            const urlRegex = /\b((https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*)/gi;
                            const parts = text.split(urlRegex);
                            return parts.map((part, i) => {
                              if (part.match(urlRegex)) {
                                const href = part.startsWith("http")
                                  ? part
                                  : `https://${part}`;
                                return (
                                  <a
                                    key={i}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {part}
                                  </a>
                                );
                              }
                              return part;
                            });
                          })()}
                      {selectedTicket?.issue_description?.length > 30 && (
                        <span className="issue-tooltip">
                          {selectedTicket.issue_description}

                          <i
                            className="bi bi-clipboard ms-2"
                            role="button"
                            title="Copy description and department name"
                            onClick={() => {
                              const textToCopy = `${selectedTicket.issue_description}\nDepartment: ${departmentName}`;
                              navigator.clipboard.writeText(textToCopy);
                              const icon =
                                document.querySelector(".bi-clipboard");
                              icon.classList.remove("bi-clipboard");
                              icon.classList.add("bi-clipboard-check-fill");
                              setTimeout(() => {
                                icon.classList.remove(
                                  "bi-clipboard-check-fill",
                                );
                                icon.classList.add("bi-clipboard");
                              }, 2000);
                            }}
                          ></i>
                        </span>
                      )}
                    </span>
                  </p>
                </div>
                <ChatMessages
                  messages={messages}
                  selectedTicket={selectedTicket}
                  isAgentWithFallback={isAgentWithFallback}
                  isHumanHandoff={isHumanHandoff}
                  typingStatus={typingStatus}
                  handleReplyToMessage={handleReplyToMessage}
                  chatBodyRef={chatBodyRef}
                  onEditMessage={onEditMessage}
                  handleDeleteMessage={handleDeleteMessage}
                  hasJoined={hasJoined}
                  localAgentEmail={localAgentEmail}
                  setMessageToDelete={setMessageToDelete}
                />
                {/* selected ticket after closing */}
                <div className="card-footer">
                  {selectedTicket &&
                  selectedTicket?.status !== "closed" &&
                  selectedTicket?.status !== "resolved" ? (
                    <>
                      <DeleteConfirmationModal
                        isOpen={!!messageToDelete}
                        message={{ content: messageToDelete?.content, type: "message" }}
                        onConfirm={() => { handleDeleteMessage(messageToDelete.id); setMessageToDelete(null); }}
                        onCancel={() => setMessageToDelete(null)}
                      />
                      <BlockUserModal
                        isOpen={blockModal}
                        userName={selectedTicket?.name || selectedTicket?.email}
                        onConfirm={handleBlockUser}
                        onCancel={() => setBlockModal(false)}
                      />
                      <MessageInput
                        ticketNumber={ticketNumber}
                        selectedTicket={selectedTicket}
                        isAgentWithFallback={isAgentWithFallback}
                        hasJoined={hasJoined}
                        socket={socket}
                        setMessages={setMessages}
                        agentEmail={agentEmail}
                        localAgentEmail={localAgentEmail}
                        isHumanHandoff={isHumanHandoff}
                        messages={messages}
                        setLastUserMessageTime={setLastUserMessageTime}
                        replyToMessageId={replyToMessageId}
                        setReplyToMessageId={setReplyToMessageId}
                        editingMessageId={editingMessageId}
                        setEditingMessageId={setEditingMessageId}
                        fileInputRef={fileInputRef}
                        handleEditMessage={handleEditMessage}
                        setSubmitting={setSubmitting}
                        submitting={submitting}
                        messageInputRef={messageInputRef}
                        theme={theme} // Pass the theme prop
                      />
                      <div className="action-buttons">
                        {/* Join button — show when not yet connected */}
                        {!hasJoined &&
                          selectedTicket?.status !== "closed" &&
                          selectedTicket?.status !== "resolved" && (
                            <button
                              className="btn btn-success"
                              onClick={handleJoinOrRequestHuman}
                              disabled={submitting}
                              aria-label={botRepliesEnabled ? "Request Human" : "Join Ticket"}
                            >
                              <BiUserPlus />{" "}
                              {submitting
                                ? "Joining..."
                                : botRepliesEnabled
                                  ? "Request Human"
                                  : "Join Chat"}
                            </button>
                          )}
                        {/* Close button — show when joined */}
                        {hasJoined &&
                          selectedTicket?.status !== "closed" && (
                            <button
                              className="btn btn-danger"
                              onClick={handleCloseConversation}
                              disabled={submitting}
                              aria-label="Close ticket"
                            >
                              <BiXCircle /> Close
                            </button>
                          )}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted text-center py-2">
                      This ticket is {selectedTicket?.status || "closed"}. You
                      can only view the chat history.
                    </div>
                  )}

                  {showHistoricalTickets && (
                    <HistoricalTickets
                      userEmail={selectedTicket?.email}
                      currentTicketNumber={selectedTicket?.ticket_number}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
export default SupportChatWidget;

