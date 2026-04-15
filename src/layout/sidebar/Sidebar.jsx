import { useTheme, useThemeUpdate } from "@/layout/provider/Theme";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import classNames from "classnames";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import SimpleBar from "simplebar-react";
import { useTickets } from "../../Global/TicketsContext";
import { DirectChatContext } from "../../pages/app/chat/DirectChatContext";
import { GroupChatContext } from "../../pages/app/group-chat/GroupChatContext";
import "../../pages/Support/SupportChatWidget.css";
import {
  addGroupChatPopup,
  addUserChatPopup,
} from "../../redux/slices/chatPopupsSlice.js";
import chatService from "../../Services/ChatService";
import groupChatService from "../../Services/GroupChatService";
import { getGroups } from "../../Services/api";
import { getRecentChats } from "../../Services/DirectsmsApi";
import { getSupportRequests } from "../../Services/widget";
import Logo from "../logo/Logo";
import Menu from "../menu/Menu";
import "./Sidebar.css";
import Toggle from "./Toggle";

const Sidebar = ({
  fixed,
  className,
  menuData,
  isAgent,
  agentEmail,
  ...props
}) => {
  const theme = useTheme();
  const themeUpdate = useThemeUpdate();
  const navigate = useNavigate();
  const location = useLocation();
  const directChatContext = useContext(DirectChatContext);
  const groupChatContext = useContext(GroupChatContext);
  const [mouseEnter, setMouseEnter] = useState(false);
  const [activeTickets, setActiveTickets] = useState([]);
  const [inactiveTickets, setInactiveTickets] = useState([]);
  const [solvedTickets, setSolvedTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTicketsView, setShowTicketsView] = useState(true);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [recentChats, setRecentChats] = useState([]);
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [showGroupSearch, setShowGroupSearch] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [siteCache, setSiteCache] = useState(new Map());
  const [agents, setAgents] = useState([]);
  const dispatch = useDispatch();
  const { openChatPopups, openGroupChatPopups, openSupportChatPopups } = useSelector(
    (state) => state.chatPopups,
  );
  const [groupMetadata, setGroupMetadata] = useState(new Map());

  // const [openChatPopups, setOpenChatPopups] = useState([]); // Replaces showChatPopup and selectedUser
  // const [openGroupChatPopups, setOpenGroupChatPopups] = useState([]); // For group chat popups
  const ticketsPerPage = 5;
  const groupsPerPage = 5;
  const usersPerPage = 5;
  const [currentGroupsPage, setCurrentGroupsPage] = useState(1);
  const [currentUsersPage, setCurrentUsersPage] = useState(1);
  const fetchTicketsRef = useRef(null);
  const fetchGroupsRef = useRef(null);
  const fetchUsersRef = useRef(null);
  var ROLE_ID = null;
  try {
    ROLE_ID = JSON.parse(localStorage.getItem("auth"))?.user?.role_id || null;
  } catch (e) {}
  const BASE_URL = "https://chatsupport.fskindia.com";
  const WS_BASE_URL = "wss://chatsupport.fskindia.com";
  const TOKEN = localStorage.getItem("accessToken");
  const ME_ID = parseInt(localStorage.getItem("userId")) || null;
  const { tickets: contextTickets } = useTickets();

  const filteredMenuData = menuData.filter((item) => {
    if (ROLE_ID === 2) return true; // admin → all
    if (!item.allowedRoles) return true; // public
    return item.allowedRoles.includes(ROLE_ID); // agent restriction
  });
  const fetchSiteName = async (site_id, retries = 3, delay = 2000) => {
    if (!site_id) {
      console.warn(`[Sidebar] No site_id provided, cannot fetch site name`);
      return "Unknown Site";
    }
    if (siteCache.has(site_id)) {
      // console.log(
      //   `[Sidebar] Using cached site name for site_id ${site_id}: ${siteCache.get(
      //     site_id
      //   )}`
      // );
      return siteCache.get(site_id);
    }
    if (!TOKEN) {
      console.warn(
        `[Sidebar] No accessToken provided, cannot fetch site name for site_id ${site_id}`,
      );
      return "Unknown Site";
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // console.log(
        //   `[Sidebar] Fetching site name for site_id ${site_id}, attempt ${attempt}/${retries}, token: ${TOKEN ? "Set" : "Unset"
        //   }`
        // );
        const response = await axios.get(`${BASE_URL}/sites/${site_id}`, {
          headers: {
            Authorization: `Bearer ${TOKEN}`,
            Accept: "application/json",
          },
        });
        // console.log(
        //   `[Sidebar] Sites API response for site_id ${site_id}:`,
        //   JSON.stringify(response.data, null, 2)
        // );
        const siteName = response.data?.domain || "Unknown Site";
        setSiteCache((prev) => new Map(prev).set(site_id, siteName));
        // console.log(
        //   `[Sidebar] Fetched site name for site_id ${site_id}: ${siteName}`
        // );
        return siteName;
      } catch (err) {
        console.error(
          `[Sidebar] Error fetching site name for site_id ${site_id}, attempt ${attempt}/${retries}:`,
          {
            status: err.response?.status,
            message: err.message,
            responseData: err.response?.data,
            details: err.response?.data?.detail || "No details",
          },
        );
        if (attempt === retries) {
          console.warn(
            `[Sidebar] Max retries reached for site_id ${site_id}, returning Unknown Site`,
          );
          return "Unknown Site";
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return "Unknown Site";
  };
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          console.warn("[Sidebar] Missing accessToken for fetching agents");
          return;
        }
        const response = await axios.get(
          "https://chatsupport.fskindia.com/users/agents/all",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.data) {
          throw new Error("Invalid agent data received");
        }
        setAgents(response.data);
        //console.log("[Sidebar] Fetched agents:", response.data);
      } catch (error) {
        //console.error("[Sidebar] Failed to fetch agents:", error);
        toast.error("Failed to load agent data");
        setTimeout(() => {
          navigate("/auth-login");
        }, 1500);
      }
    };
    fetchAgents();
  }, []);

  const getAgentName = (email) => {
    const agent = agents.find((agent) => agent.email === email);
    return agent
      ? `${agent.first_name} ${agent.last_name || ""}`
      : email || "Unassigned";
  };

  useEffect(() => {
    const fetchTickets = async () => {
      setLoadingTickets(true);
      try {
        if (
          isAgent &&
          (!agentEmail ||
            typeof agentEmail !== "string" ||
            agentEmail.trim() === "")
        ) {
          console.error("[Sidebar] Invalid agent email:", agentEmail);
          toast.error("Invalid agent email. Please verify your credentials.");
          setActiveTickets([]);
          setInactiveTickets([]);
          setSolvedTickets([]);
          setLoadingTickets(false);
          return;
        }

        // console.log("[Sidebar] Fetching tickets:", {
        //   agentEmail: isAgent ? agentEmail : undefined,
        //   status: "initiated,agent_engaged,transferred",
        // });

        const params = {
          agent_email: isAgent ? agentEmail : undefined,
          status: "initiated,agent_engaged,transferred",
        };

        const data = await getSupportRequests(params);
        if (!Array.isArray(data)) {
          console.error("[Sidebar] Invalid ticket data received:", data);
          toast.error("Invalid ticket data received from server.");
          setActiveTickets([]);
          setInactiveTickets([]);
          setSolvedTickets([]);
          setLoadingTickets(false);
          return;
        }

        const uniqueSiteIds = [
          ...new Set(
            data
              .filter((ticket) => ticket.site_id)
              .map((ticket) => ticket.site_id),
          ),
        ];
        const siteNamePromises = uniqueSiteIds.map((site_id) =>
          fetchSiteName(site_id).then((siteName) => ({ site_id, siteName })),
        );
        const siteNameResults = await Promise.all(siteNamePromises);
        const siteNameMap = new Map(
          siteNameResults.map(({ site_id, siteName }) => [site_id, siteName]),
        );

        const newTicketsMap = new Map();
        const inactiveNewTicketsMap = new Map();
        const reslovedTicketsMap = new Map();
        data.forEach((ticket) => {
          if (
            ticket.ticket_number &&
            ["initiated", "agent_engaged", "transferred"].includes(
              ticket.status?.toLowerCase(),
            )
          ) {
            const ticketAgentEmail =
              ticket.agent_email || ticket.assigned_agent || agentEmail;
            const existingTicket = activeTickets.find(
              (t) => t.ticket_number === ticket.ticket_number,
            );
            const siteName = ticket.site_id
              ? siteNameMap.get(ticket.site_id) ||
                ticket.site_name ||
                "Unknown Site"
              : ticket.site_name || "Unknown Site";
            newTicketsMap.set(ticket.ticket_number, {
              ...ticket,
              agent_email: ticketAgentEmail,
              agent_name:
                existingTicket?.agent_name || ticket.agent_name || null,
              status: ticket.status || "initiated",
              site_name: siteName,
            });
          } else if (
            ticket.ticket_number &&
            ["closed"].includes(ticket.status?.toLowerCase())
          ) {
            const ticketAgentEmail =
              ticket.agent_email || ticket.assigned_agent || agentEmail;
            const existingTicket = activeTickets.find(
              (t) => t.ticket_number === ticket.ticket_number,
            );
            const siteName = ticket.site_id
              ? siteNameMap.get(ticket.site_id) ||
                ticket.site_name ||
                "Unknown Site"
              : ticket.site_name || "Unknown Site";
            inactiveNewTicketsMap.set(ticket.ticket_number, {
              ...ticket,
              agent_email: ticketAgentEmail,
              agent_name:
                existingTicket?.agent_name || ticket.agent_name || null,
              status: ticket.status || "initiated",
              site_name: siteName,
            });
          } else if (
            ticket.ticket_number &&
            ["resolved"].includes(ticket.status?.toLowerCase())
          ) {
            const ticketAgentEmail =
              ticket.agent_email || ticket.assigned_agent || agentEmail;
            const existingTicket = activeTickets.find(
              (t) => t.ticket_number === ticket.ticket_number,
            );
            const siteName = ticket.site_id
              ? siteNameMap.get(ticket.site_id) ||
                ticket.site_name ||
                "Unknown Site"
              : ticket.site_name || "Unknown Site";
            reslovedTicketsMap.set(ticket.ticket_number, {
              ...ticket,
              agent_email: ticketAgentEmail,
              agent_name:
                existingTicket?.agent_name || ticket.agent_name || null,
              status: ticket.status || "initiated",
              site_name: siteName,
            });
          }
        });

        setActiveTickets((prevTickets) => {
          const updatedTickets = Array.from(newTicketsMap.values()).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          );
          const prevTicketsMap = new Map(
            prevTickets.map((t) => [t.ticket_number, t]),
          );
          const hasChanges =
            newTicketsMap.size !== prevTicketsMap.size ||
            Array.from(newTicketsMap).some(([ticketNumber, newTicket]) => {
              const prevTicket = prevTicketsMap.get(ticketNumber);
              return (
                !prevTicket ||
                JSON.stringify(prevTicket) !== JSON.stringify(newTicket)
              );
            });
          if (!hasChanges && prevTicketsMap.size > 0) {
            return prevTickets;
          }
          return updatedTickets;
        });

        setInactiveTickets((prevTickets) => {
          const updatedTickets = Array.from(
            inactiveNewTicketsMap.values(),
          ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          const prevTicketsMap = new Map(
            prevTickets.map((t) => [t.ticket_number, t]),
          );
          const hasChanges =
            inactiveNewTicketsMap.size !== prevTicketsMap.size ||
            Array.from(inactiveNewTicketsMap).some(
              ([ticketNumber, newTicket]) => {
                const prevTicket = prevTicketsMap.get(ticketNumber);
                return (
                  !prevTicket ||
                  JSON.stringify(prevTicket) !== JSON.stringify(newTicket)
                );
              },
            );
          if (!hasChanges && prevTicketsMap.size > 0) {
            return prevTickets;
          }
          return updatedTickets;
        });

        setSolvedTickets((prevTickets) => {
          const updatedTickets = Array.from(reslovedTicketsMap.values()).sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at),
          );
          const prevTicketsMap = new Map(
            prevTickets.map((t) => [t.ticket_number, t]),
          );
          const hasChanges =
            reslovedTicketsMap.size !== prevTicketsMap.size ||
            Array.from(reslovedTicketsMap).some(([ticketNumber, newTicket]) => {
              const prevTicket = prevTicketsMap.get(ticketNumber);
              return (
                !prevTicket ||
                JSON.stringify(prevTicket) !== JSON.stringify(newTicket)
              );
            });
          if (!hasChanges && prevTicketsMap.size > 0) {
            return prevTickets;
          }
          return updatedTickets;
        });
        setLoadingTickets(false);
      } catch (err) {
        console.error("[Sidebar] Fetch tickets error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        toast.error(err.message || "Failed to load active tickets.");
        setLoadingTickets(false);
      }
    };

    const fetchGroups = async () => {
      try {
        const data = await getGroups();
        if (!Array.isArray(data)) {
          toast.error("Invalid group data received from server.");
          setGroups([]);
          return;
        }
        setGroups((prevGroups) => {
          const updatedGroups = data.sort(
            (a, b) =>
              new Date(b.created_at || b.updated_at) -
              new Date(a.created_at || a.updated_at),
          );
          const prevGroupsMap = new Map(prevGroups.map((g) => [g.id, g]));
          const newGroupsMap = new Map(updatedGroups.map((g) => [g.id, g]));
          const hasChanges =
            newGroupsMap.size !== prevGroupsMap.size ||
            Array.from(newGroupsMap).some(([groupId, newGroup]) => {
              const prevGroup = prevGroupsMap.get(groupId);
              return (
                !prevGroup ||
                JSON.stringify(prevGroup) !== JSON.stringify(newGroup)
              );
            });
          if (!hasChanges && prevGroupsMap.size > 0) {
            return prevGroups;
          }
          return updatedGroups;
        });
        setLoadingGroups(false);
      } catch (err) {
        console.error("[Sidebar] Fetch groups error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        toast.error(err.message || "Failed to load groups.");
        setLoadingGroups(false);
      }
    };

    const fetchUsers = async () => {
      try {
        if (!ME_ID || !TOKEN || isNaN(ME_ID)) {
          console.warn("[Sidebar] Invalid user ID or token", {
            userId: ME_ID,
            token: TOKEN,
          });
          toast.error("Please log in to access users.");
          setUsers([]);
          setLoadingUsers(false);
          return;
        }

        const res = await axios.get(`${BASE_URL}/users/?skip=0&limit=100`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
        });

        // const res = await axios.get(`${BASE_URL}/messaging/recent-chats`, {
        //   headers: { Authorization: `Bearer ${TOKEN}` },
        // });

        const filtered = res.data.records.filter((u) => u.id !== ME_ID);
        setUsers(filtered);
        // Rely on ChatService for recent chats
        setRecentChats(chatService.getRecentChats());
        setLoadingUsers(false);
      } catch (err) {
        console.error("[Sidebar] Fetch users error:", {
          message: err.message,
          status: err.response?.status,
          response: err.response?.data,
        });
        toast.error("Failed to load users.");
        setLoadingUsers(false);
      }
    };

    fetchTicketsRef.current = fetchTickets;
    fetchGroupsRef.current = fetchGroups;
    fetchUsersRef.current = fetchUsers;

    // console.log("[Sidebar] ROLE_ID:", ROLE_ID);
    fetchTickets();
    fetchGroups();
    fetchUsers();
  }, [agentEmail, isAgent]);

  useEffect(() => {
    const handleInitialData = (data) => {
      if (data.recentChats) {
        setRecentChats(data.recentChats);
      }
    };

    const handleRecentChatsUpdate = (data) => {
      if (data.recentChats) {
        setRecentChats(data.recentChats);
      }
    };

    const handleOpenChatWithUser = (data) => {
      if (data?.user?.id) {
        directChatContext.selectUser(data.user.id);
      }
      navigate("/messages");
    };

    chatService.subscribe("initial_data", handleInitialData);
    chatService.subscribe("recent_chats_updated", handleRecentChatsUpdate);
    chatService.subscribe("open_chat_with_user", handleOpenChatWithUser);

    // Attempt to get initial chats immediately if ChatService is already initialized
    // This handles cases where Sidebar mounts after ChatService has already completed initialization
    if (chatService.isInitialized()) {
      const currentChats = chatService.getRecentChats();
      if (currentChats && currentChats.length > 0) {
        setRecentChats(currentChats);
      }
    }

    const handleUserStatusUpdate = (data) => {
      if (data.userId && typeof data.isActive === "boolean") {
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === data.userId
              ? { ...user, is_active: data.isActive }
              : user,
          ),
        );
      }
    };

    chatService.subscribe("initial_data", handleInitialData);
    chatService.subscribe("recent_chats_updated", handleRecentChatsUpdate);
    chatService.subscribe("open_chat_with_user", handleOpenChatWithUser);
    chatService.subscribe("user_status_updated", handleUserStatusUpdate); // New subscription for user status

    // Attempt to get initial chats immediately if ChatService is already initialized
    // This handles cases where Sidebar mounts after ChatService has already completed initialization
    if (chatService.isInitialized()) {
      const currentChats = chatService.getRecentChats();
      if (currentChats && currentChats.length > 0) {
        setRecentChats(currentChats);
      }
    }

    return () => {
      chatService.unsubscribe("initial_data", handleInitialData);
      chatService.unsubscribe("recent_chats_updated", handleRecentChatsUpdate);
      chatService.unsubscribe("open_chat_with_user", handleOpenChatWithUser);
      chatService.unsubscribe("user_status_updated", handleUserStatusUpdate); // Unsubscribe
    };
  }, []);

  // Subscribe to group metadata updates
  useEffect(() => {
    const handleGroupMetadataUpdate = (data) => {
      if (data.groupId && data.metadata) {
        setGroupMetadata((prev) => {
          const updated = new Map(prev);
          updated.set(data.groupId, data.metadata);
          return updated;
        });
      }
    };

    const handleOpenGroupChat = (data) => {
      if (data.group) {
        // Check if group chat is already open
        if (
          openGroupChatPopups.some((popup) => popup.group.id === data.group.id)
        ) {
          toast.warning("Group chat already open.");
          return;
        }

        const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;

        // Check if we've reached the combined limit
        if (total >= 3) {
          toast.error("Maximum of 3 chat windows can be open at a time.");
          return;
        }

        // Add the group chat popup
        dispatch(addGroupChatPopup(data.group));
      }
    };

    groupChatService.subscribe(
      "group_metadata_updated",
      handleGroupMetadataUpdate,
    );
    groupChatService.subscribe("open_group_chat", handleOpenGroupChat);

    // Initialize with existing metadata
    const currentMetadata = groupChatService.getGroupMetadata();
    if (currentMetadata && Object.keys(currentMetadata).length > 0) {
      setGroupMetadata(new Map(Object.entries(currentMetadata)));
    }

    return () => {
      groupChatService.unsubscribe(
        "group_metadata_updated",
        handleGroupMetadataUpdate,
      );
      groupChatService.unsubscribe("open_group_chat", handleOpenGroupChat);
    };
  }, []);

  const filteredGroups = groups.filter((group) =>
    group.name?.toLowerCase().includes(groupSearchTerm.toLowerCase()),
  );
  const filteredUsers = users.filter((user) =>
    `${user.first_name} ${user.last_name || ""}`
      .toLowerCase()
      .includes(userSearchTerm.toLowerCase()),
  );

  useEffect(() => {
    setCurrentGroupsPage(1);
  }, [groupSearchTerm]);

  useEffect(() => {
    setCurrentUsersPage(1);
  }, [userSearchTerm]);

  const groupedTickets = activeTickets.reduce((acc, ticket) => {
    const siteId = ticket.site_id || "unknown";
    if (!acc[siteId]) {
      acc[siteId] = {
        site_name: ticket.site_name || "Unknown Site",
        tickets: [],
      };
    }
    acc[siteId].tickets.push(ticket);
    return acc;
  }, {});

  const groupedInactiveTickets = inactiveTickets.reduce((acc, ticket) => {
    const siteId = ticket.site_id || "unknown";
    if (!acc[siteId]) {
      acc[siteId] = {
        site_name: ticket.site_name || "Unknown Site",
        tickets: [],
      };
    }
    acc[siteId].tickets.push(ticket);
    return acc;
  }, {});

  const groupedSolvedTickets = solvedTickets.reduce((acc, ticket) => {
    const siteId = ticket.site_id || "unknown";
    if (!acc[siteId]) {
      acc[siteId] = {
        site_name: ticket.site_name || "Unknown Site",
        tickets: [],
      };
    }
    acc[siteId].tickets.push(ticket);
    return acc;
  }, {});

  const indexOfLastTicket = currentPage * ticketsPerPage;
  const indexOfFirstTicket = indexOfLastTicket - ticketsPerPage;
  const currentTickets = activeTickets.slice(
    indexOfFirstTicket,
    indexOfLastTicket,
  );
  const totalTicketPages = Math.ceil(activeTickets.length / ticketsPerPage);

  const indexOfLastGroup = currentGroupsPage * groupsPerPage;
  const indexOfFirstGroup = indexOfLastGroup - groupsPerPage;
  const currentGroups = filteredGroups
    .sort((a, b) => {
      const metadataA = groupMetadata.get(a.id);
      const metadataB = groupMetadata.get(b.id);

      const timeA = metadataA?.lastMessageTimestamp
        ? new Date(metadataA.lastMessageTimestamp).getTime()
        : 0;
      const timeB = metadataB?.lastMessageTimestamp
        ? new Date(metadataB.lastMessageTimestamp).getTime()
        : 0;

      // Sort by most recent message first (descending)
      return timeB - timeA;
    })
    .slice(indexOfFirstGroup, indexOfLastGroup);
  const totalGroupPages = Math.ceil(filteredGroups.length / groupsPerPage);

  const indexOfLastUser = currentUsersPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers
    .sort((a, b) => {
      const chatA = recentChats.find((chat) => chat.recipient_id === a.id);
      const chatB = recentChats.find((chat) => chat.recipient_id === b.id);
      const timeA = chatA?.last_message_timestamp
        ? new Date(chatA.last_message_timestamp).getTime()
        : 0;
      const timeB = chatB?.last_message_timestamp
        ? new Date(chatB.last_message_timestamp).getTime()
        : 0;
      return timeB - timeA;
    })
    .slice(indexOfFirstUser, indexOfLastUser);

  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handlePageChange = (pageNumber, type = "tickets") => {
    if (type === "tickets") {
      setCurrentPage(pageNumber);
      const ticketList = document.querySelector(".active-tickets-list");
      if (ticketList) {
        ticketList.scrollTop = 0;
      }
    } else if (type === "groups") {
      setCurrentGroupsPage(pageNumber);
      const groupList = document.querySelector(".groups-list");
      if (groupList) {
        groupList.scrollTop = 0;
      }
    } else if (type === "users") {
      setCurrentUsersPage(pageNumber);
      const userList = document.querySelector(".users-list");
      if (userList) {
        userList.scrollTop = 0;
      }
    }
  };

  // Sync active tickets with global TicketsContext so notifications update sidebar live
  useEffect(() => {
    const syncFromContext = async () => {
      try {
        let relevant = (contextTickets || []).filter((t) => {
          const status = (t.status || "").toLowerCase();
          return status === "initiated" || status === "agent_engaged";
        });
        if (isAgent && agentEmail) {
          relevant = relevant.filter((t) => {
            const isInitiated = (t.status || "").toLowerCase() === "initiated";
            // Show initiated to everyone; only show engaged if assigned to this agent
            return (
              isInitiated ||
              t.agent_email === agentEmail ||
              t.assigned_agent === agentEmail
            );
          });
        }
        const processed = await Promise.all(
          relevant.map(async (t) => {
            if (!t.site_name && t.site_id) {
              const siteName = await fetchSiteName(t.site_id);
              return { ...t, site_name: siteName };
            }
            return t;
          }),
        );
        const sorted = processed.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        );
        setActiveTickets(sorted);
        setLoadingTickets(false);
      } catch (e) {
        console.warn("[Sidebar] Failed syncing tickets from context", e);
      }
    };
    syncFromContext();
  }, [contextTickets, isAgent, agentEmail]);

  const getGroupInitials = (name) => {
    if (!name || typeof name !== "string") return "G";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  };

  const getUserInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${
      lastName ? lastName.charAt(0) : ""
    }`.toUpperCase();
  };

  // const handleGroupClick = (group) => {
  //   // console.log(
  //   //   "[Sidebar] Opening group chat for:",
  //   //   group.id,
  //   //   "Name:",
  //   //   group.name
  //   // );
  //   console.log("openGroupChatPopups", openGroupChatPopups);

  //   // Check if group chat is already open
  //   if (openGroupChatPopups.some((popup) => popup.group.id === group.id)) {
  //   //  console.log('[Sidebar] Group chat already open:', group.id);
  //     toast.warning('Group chat already open for this group.');
  //     return;
  //   }

  //   // Limit to 3 open group chat popups
  //   if (openGroupChatPopups.length >= 3) {
  //     toast.error('Maximum of 3 group chat windows can be open at a time.');
  //     return;
  //   }

  //   // Add new group chat popup
  //   setOpenGroupChatPopups((prev) => [
  //     ...prev,
  //     {
  //       group,
  //       key: `group-chat-${group.id}-${Date.now()}`,
  //       position: { x: 0, y: 0 } // Position will be calculated by the page
  //     }
  //   ]);

  //   // Navigate to chat popups page
  //   navigate('/chat-popups', {
  //     state: {
  //       groupChatPopups: [...openGroupChatPopups, {
  //         group,
  //         key: `group-chat-${group.id}-${Date.now()}`,
  //         position: { x: 0, y: 0 }
  //       }],
  //       chatPopups: openChatPopups
  //     },
  //     replace: false,
  //   });
  // };

  // console.log(openGroupChatPopups,'openGroupChatPopups')

  // const handleUserClick = (user) => {
  // //  console.log('[Sidebar] Opening chat for user:', user.id, 'Name:', `${user.first_name} ${user.last_name || ''}`);

  //   // Check if user chat is already open
  //   if (openChatPopups.some((popup) => popup.user.id === user.id)) {
  //   //  console.log('[Sidebar] Chat for user already open:', user.id);
  //   //  toast.warning('Chat already open for this user.');
  //     return;
  //   }

  //   // Limit to 3 open chat popups
  //   if (openChatPopups.length >= 3) {
  //     toast.error('Maximum of 3 chat windows can be open at a time.');
  //     return;
  //   }

  //   // Add new chat popup
  //   setOpenChatPopups((prev) => [
  //     ...prev,
  //     {
  //       user,
  //       key: `chat-${user.id}-${Date.now()}`,
  //       position: { x: 0, y: 0 } // Position will be calculated by the page
  //     }
  //   ]);

  //   // Navigate to chat popups page
  //   navigate('/chat-popups', {
  //     state: {
  //       chatPopups: [...openChatPopups, {
  //         user,
  //         key: `chat-${user.id}-${Date.now()}`,
  //         position: { x: 0, y: 0 }
  //       }],
  //       groupChatPopups: openGroupChatPopups
  //     },
  //     replace: false,
  //   });
  // };

  const handleGroupClick = (group) => {
    // Mark group as read
    groupChatService.markGroupAsRead(group.id);

    const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;

    if (openGroupChatPopups.some((popup) => popup.group.id === group.id)) {
      toast.warning("Group chat already open.");
      return;
    }

    if (total >= 3) {
      toast.error("Maximum of 3 chat windows can be open at a time.");
      return;
    }

    const isOnGroupChatPage = location.pathname === "/app-group-chat";
    const hasActiveInlineGroup = !!(groupChatContext?.activeGroup);

    if (isOnGroupChatPage && !hasActiveInlineGroup && total === 0) {
      groupChatContext.selectGroup(group.id);
    } else {
      dispatch(addGroupChatPopup(group));
    }
  };

  // bhaii click hocche .
  const handleUserClick = (user) => {
    chatService.markAsRead(user.id); // Mark messages as read

    const total = openChatPopups.length + openGroupChatPopups.length + openSupportChatPopups.length;

    if (openChatPopups.some((popup) => popup.user.id === user.id)) {
      toast.warning("Chat already open for this user.");
      return;
    }

    if (total >= 3) {
      toast.error("Maximum of 3 chat windows can be open at a time.");
      return;
    }

    const isOnMessagesPage = location.pathname === "/messages";
    const hasActiveInlineChat = !!(directChatContext?.activeUser);

    if (isOnMessagesPage && !hasActiveInlineChat && total === 0) {
      directChatContext.selectUser(user.id);
    } else {
      dispatch(addUserChatPopup(user));
    }
  };

  const handleAgentChatsClick = () => {
    //
    navigate("/agent-chats");
  };

  const toggleGroupSearch = () => {
    setShowGroupSearch((prev) => !prev);
    if (showGroupSearch) {
      setGroupSearchTerm(""); // Clear search term when hiding input
    }
  };

  const toggleUserSearch = () => {
    setShowUserSearch((prev) => !prev);
    if (showUserSearch) {
      setUserSearchTerm(""); // Clear search term when hiding input
    }
  };

  const classes = classNames({
    "nk-sidebar": true,
    "nk-sidebar-fixed": fixed,
    "nk-sidebar-active": theme.sidebarVisibility,
    "nk-sidebar-hidden": theme.sidebarHidden,
    "nk-sidebar-mobile": theme.sidebarMobile,
    "is-compact": theme.sidebarCompact,
    "has-hover": theme.sidebarCompact && mouseEnter,
    [`is-light`]: theme.sidebar === "white",
    [`is-${theme.sidebar}`]:
      theme.sidebar !== "white" && theme.sidebar !== "light",
    [`${className}`]: className,
  });

  const [searchTerm, setSearchTerm] = useState("");

  const ticketsBySite = Object.entries(groupedTickets).map(
    ([siteId, { site_name, tickets }]) => ({
      siteId,
      site_name,
      active: tickets,
      closed: groupedInactiveTickets?.[siteId]?.tickets || [],
      solved: groupedSolvedTickets?.[siteId]?.tickets || [],
    }),
  );

  const [ticketView, setTicketView] = useState({});

  const getView = (siteId) => ticketView[siteId] || "active";

  const totalTickets = ticketsBySite.reduce(
    (sum, s) => sum + s.active.length + s.closed.length + s.solved.length,
    0,
  );

  return (
    <>
      <div className={classes}>
        <div className="nk-sidebar-element nk-sidebar-head">
          <div className="nk-menu-trigger">
            <Toggle
              className="nk-nav-toggle nk-quick-nav-icon d-xl-none me-n2"
              icon="arrow-left"
              click={themeUpdate.sidebarVisibility}
            />
            <Toggle
              className={`nk-nav-compact nk-quick-nav-icon d-none d-xl-none ${theme.sidebarCompact ? "compact-active" : ""}`}
              click={themeUpdate.sidebarCompact}
              icon="menu"
            />
          </div>
          <div className="nk-sidebar-brand">
            <Logo />
          </div>
        </div>
        <div
          className="nk-sidebar-content"
          onMouseEnter={() => setMouseEnter(true)}
          onMouseLeave={() => setMouseEnter(false)}
        >
          <SimpleBar className="nk-sidebar-menu">
            {showTicketsView ? (
              <>
                <div className="active-tickets-section mb-3">
                  {/* HEADER */}
                  <div className="px-3 py-2 d-flex align-items-center">
                    <h4 className="sidebar-title flex-grow-1 mb-0">
                      Tickets ({totalTickets})
                    </h4>

                    <button
                      className="btn btn-link text-light p-0"
                      onClick={() => fetchTicketsRef.current?.()}
                      title="Refresh tickets"
                    >
                      <i className="bi bi-arrow-clockwise" />
                    </button>
                  </div>

                  {/* SEARCH */}
                  <div className="px-3 pb-2">
                    <input
                      type="text"
                      className="form-control form-control-sm bg-darkk text-light border-secondary"
                      placeholder="Search tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: "6px 8px",
                        fontSize: "0.85rem",
                        borderRadius: "6px",
                      }}
                    />
                  </div>

                  {/* LOADING */}
                  {loadingTickets ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary" />
                    </div>
                  ) : (
                    <div className="px-3">
                      {ticketsBySite.map((site) => {
                        const currentView = getView(site.siteId);

                        const allTickets = [
                          ...site.active,
                          ...site.closed,
                          ...site.solved,
                        ];

                        const tickets = searchTerm
                          ? allTickets
                          : site[currentView];

                        const filteredTickets = tickets.filter((ticket) => {
                          if (!searchTerm) return true;

                          const q = searchTerm.toLowerCase();

                          return (
                            ticket.ticket_number?.toString().includes(q) ||
                            ticket.name?.toLowerCase().includes(q) ||
                            ticket.agent_email?.toLowerCase().includes(q) ||
                            ticket.assigned_agent_email
                              ?.toLowerCase()
                              .includes(q)
                          );
                        });

                        const siteTotal =
                          site.active.length +
                          site.closed.length +
                          site.solved.length;

                        // 🚫 Hide empty sites
                        if (!searchTerm && siteTotal === 0) return null;
                        if (searchTerm && filteredTickets.length === 0)
                          return null;

                        return (
                          <div
                            key={site.siteId}
                            className="bg-darkk rounded mb-3 p-2"
                          >
                            {/* SITE NAME */}
                            <div className="fw-semibold text-light mb-2">
                              {site.site_name}
                            </div>

                            {/* STATUS BUTTONS (hidden during search) */}
                            {!searchTerm && (
                              <div className="d-flex mb-1">
                                {[
                                  {
                                    key: "active",
                                    label: "Active",
                                    count: site.active.length,
                                  },
                                  {
                                    key: "closed",
                                    label: "Closed",
                                    count: site.closed.length,
                                  },
                                  {
                                    key: "solved",
                                    label: "Solved",
                                    count: site.solved.length,
                                  },
                                ].map(({ key, label, count }) => (
                                  <button
                                    key={key}
                                    className={`btn btn-sm flex-fill ${
                                      currentView === key
                                        ? "btn-primary"
                                        : "btn-outline-light"
                                    }`}
                                    style={{
                                      margin: "0 2px",
                                      padding: "2px 4px",
                                      fontSize: "0.75rem",
                                    }}
                                    onClick={() =>
                                      setTicketView((p) => ({
                                        ...p,
                                        [site.siteId]: key,
                                      }))
                                    }
                                  >
                                    {label} ({count})
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* TICKET LIST */}
                            <SimpleBar style={{ maxHeight: "160px" }}>
                              {[...filteredTickets]
                                .sort(
                                  (a, b) =>
                                    new Date(b.created_at) -
                                    new Date(a.created_at),
                                )
                                .map((ticket) => (
                                  <div
                                    key={ticket.ticket_number}
                                    className={`ticket-card mb-2 p-2 d-flex align-items-center
                      ${
                        ticket.status.toLowerCase() === "agent_engaged"
                          ? "bg-success bg-opacity-10"
                          : ticket.status.toLowerCase() === "initiated"
                            ? "bg-blue bg-opacity-10"
                            : ticket.status.toLowerCase() === "resolved"
                              ? "bg-warning bg-opacity-10"
                              : "bg-pink bg-opacity-10"
                      }
                      ${
                        selectedTicket === ticket.ticket_number
                          ? "border border-light border-2"
                          : ""
                      }`}
                                    onClick={() => {
                                      setSelectedTicket(ticket.ticket_number);
                                      navigate(
                                        `/support-chat/${ticket.ticket_number}`,
                                      );
                                    }}
                                    role="button"
                                    tabIndex={0}
                                  >
                                    <div className="flex-grow-1">
                                      <strong className="text-light">
                                        {ticket.name || "N/A"}
                                      </strong>
                                      <small className="text-light d-block">
                                        Agent:{" "}
                                        {ticket.agent_email ||
                                        ticket.assigned_agent_email
                                          ? getAgentName(
                                              ticket.agent_email ||
                                                ticket.assigned_agent_email,
                                            )
                                          : "Unassigned"}
                                      </small>
                                      <small className="text-light d-block">
                                        Status: {ticket.status.toUpperCase()}
                                      </small>
                                    </div>
                                  </div>
                                ))}
                            </SimpleBar>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="groups-section mb-3">
                  <div className="px-3 py-2 d-flex align-items-center">
                    <h4 className="sidebar-title flex-grow-1 mb-0">Groups</h4>
                    <button
                      className="btn btn-link text-light p-0"
                      onClick={toggleGroupSearch}
                      aria-label={
                        showGroupSearch
                          ? "Hide group search"
                          : "Show group search"
                      }
                    >
                      <i
                        className="bi bi-search"
                        style={{ fontSize: "1rem" }}
                      ></i>
                    </button>
                  </div>
                  {showGroupSearch && (
                    <div className="px-3 py-2">
                      <input
                        type="text"
                        style={{
                          backgroundColor: "transparent",
                          color: "#fff",
                        }}
                        className="form-control form-control-sm"
                        placeholder="Search groups..."
                        value={groupSearchTerm}
                        onChange={(e) => setGroupSearchTerm(e.target.value)}
                        aria-label="Search groups"
                      />
                    </div>
                  )}
                  {loadingGroups ? (
                    <div className="text-center py-4">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <p className="text-muted text-center py-4">
                      {groupSearchTerm
                        ? "No groups match your search."
                        : "No groups available."}
                    </p>
                  ) : (
                    <>
                      <SimpleBar
                        style={{ maxHeight: "160px" }}
                        className="groups-list px-3"
                      >
                        {currentGroups.map((group) => (
                          <div
                            key={group.id}
                            className="group-card mb-2 d-flex align-items-center bg-primary bg-opacity-10"
                            onClick={() => handleGroupClick(group)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleGroupClick(group);
                              }
                            }}
                            aria-label={`Select group ${group.name}`}
                            style={{ padding: "10px", fontSize: "0.9rem" }}
                          >
                            <div className="d-flex align-items-center w-100">
                              <div className="me-2">
                                {group.avatar_url ? (
                                  <img
                                    src={group.avatar_url}
                                    alt={group.name}
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                      background: "#25d366",
                                      color: "#fff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {getGroupInitials(group.name)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-grow-1">
                                <strong className="text-light">
                                  {group.name || "Unnamed Group"}
                                </strong>
                              </div>
                              {(() => {
                                const metadata = groupMetadata.get(group.id);
                                const unreadCount = metadata?.unreadCount || 0;
                                return unreadCount > 0 ? (
                                  <span
                                    className="badge rounded-pill bg-danger ms-2"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    {unreadCount}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        ))}
                      </SimpleBar>
                      {totalGroupPages > 1 && (
                        <nav aria-label="Groups pagination">
                          <ul className="pagination pagination-sm justify-content-center mt-2">
                            <li
                              className={`page-item ${
                                currentGroupsPage === 1 ? "disabled" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  handlePageChange(
                                    currentGroupsPage - 1,
                                    "groups",
                                  )
                                }
                                disabled={currentGroupsPage === 1}
                                aria-label="Previous group page"
                              >
                                <i className="bi bi-arrow-left"></i>
                              </button>
                            </li>
                            {totalGroupPages > 1 && (
                              <li
                                className={`page-item ${
                                  currentGroupsPage === 1 ? "active" : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(1, "groups")}
                                  aria-label="Group page 1"
                                >
                                  1
                                </button>
                              </li>
                            )}
                            {currentGroupsPage > 2 && totalGroupPages > 5 && (
                              <li className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            )}
                            {[...Array(totalGroupPages).keys()]
                              .map((page) => page + 1)
                              .filter((page) => {
                                return (
                                  page !== 1 &&
                                  page !== totalGroupPages &&
                                  page >= currentGroupsPage - 1 &&
                                  page <= currentGroupsPage + 1
                                );
                              })
                              .map((page) => (
                                <li
                                  key={page}
                                  className={`page-item ${
                                    currentGroupsPage === page ? "active" : ""
                                  }`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() =>
                                      handlePageChange(page, "groups")
                                    }
                                    aria-label={`Group page ${page}`}
                                  >
                                    {page}
                                  </button>
                                </li>
                              ))}
                            {currentGroupsPage < totalGroupPages - 1 &&
                              totalGroupPages > 5 && (
                                <li className="page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              )}
                            {totalGroupPages > 1 && (
                              <li
                                className={`page-item ${
                                  currentGroupsPage === totalGroupPages
                                    ? "active"
                                    : ""
                                }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    handlePageChange(totalGroupPages, "groups")
                                  }
                                  aria-label={`Group page ${totalGroupPages}`}
                                >
                                  {totalGroupPages}
                                </button>
                              </li>
                            )}
                            <li
                              className={`page-item ${
                                currentGroupsPage === totalGroupPages
                                  ? "disabled"
                                  : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  handlePageChange(
                                    currentGroupsPage + 1,
                                    "groups",
                                  )
                                }
                                disabled={currentGroupsPage === totalGroupPages}
                                aria-label="Next group page"
                              >
                                <i className="bi bi-arrow-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </>
                  )}
                </div>
                {/* Direct messages part ache bhai */}
                {/* <div className="direct-messages-section mb-3">
                  <div className="px-3 py-2 d-flex align-items-center">
                    <h4 className="sidebar-title flex-grow-1 mb-0">
                      Direct Messages
                    </h4>
                    <button
                      className="btn btn-link text-light p-0"
                      onClick={toggleUserSearch}
                      aria-label={
                        showUserSearch ? "Hide user search" : "Show user search"
                      }
                    >
                      <i
                        className="bi bi-search"
                        style={{ fontSize: "1rem" }}
                      ></i>
                    </button>
                  </div>
                  {showUserSearch && (
                    <div className="px-3 py-2">
                      <input
                        type="text"
                        style={{
                          backgroundColor: "transparent",
                          color: "#fff",
                        }}
                        className="form-control form-control-sm"
                        placeholder="Search users..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        aria-label="Search users"
                      />
                    </div>
                  )}
                  {loadingUsers ? (
                    <div className="text-center py-4">
                      <div
                        className="spinner-border text-primary"
                        role="status"
                      >
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-muted text-center py-4">
                      {userSearchTerm
                        ? "No users match your search."
                        : "No users available."}
                    </p>
                  ) : (
                    <>
                      <SimpleBar
                        style={{ maxHeight: "160px" }}
                        className="users-list px-3"
                      >
                        {currentUsers.map((user) => (
                          <div
                            key={user.id}
                            className="user-card mb-2 d-flex align-items-center bg-primary bg-opacity-10"
                            onClick={() => handleUserClick(user)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUserClick(user);
                              }
                            }}
                            aria-label={`Select user ${user.first_name} ${user.last_name || ""}`}
                            style={{ padding: "10px", fontSize: "0.9rem" }}
                          >
                            <div className="d-flex align-items-center w-100">
                              <div className="me-2 position-relative">

                                {user.profile_picture ? (
                                  <img
                                    src={user.profile_picture}
                                    alt={`${user.first_name} ${user.last_name || ""}`}
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "50%",
                                      background: "#007bff",
                                      color: "#fff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {getUserInitials(
                                      user.first_name,
                                      user.last_name || ""
                                    )}
                                  </div>
                                )}
                                <span
                                  style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: user.is_active ? '#28a745' : '#dc3545',
                                    border: '1px solid #fff'
                                  }}
                                />
                              </div>
                              <div className="flex-grow-1">
                                <strong className="text-light">
                                  {user.first_name} {user.last_name || ""}
                                </strong>

                              </div>
                              {(() => {
                                const chat = recentChats.find((c) => c.recipient_id === user.id);
                                const unreadCount = chat?.unread_count || 0;
                                return unreadCount > 0 ? (
                                  <span
                                    className="badge rounded-pill bg-danger ms-2"
                                    style={{ fontSize: "0.7rem" }}
                                  >
                                    {unreadCount}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        ))}
                      </SimpleBar>
                      {totalUserPages > 1 && (
                        <nav aria-label="Users pagination">
                          <ul className="pagination pagination-sm justify-content-center mt-2">
                            <li
                              className={`page-item ${currentUsersPage === 1 ? "disabled" : ""
                                }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  handlePageChange(
                                    currentUsersPage - 1,
                                    "users"
                                  )
                                }
                                disabled={currentUsersPage === 1}
                                aria-label="Previous user page"
                              >
                                <i className="bi bi-arrow-left"></i>
                              </button>
                            </li>
                            {totalUserPages > 1 && (
                              <li
                                className={`page-item ${currentUsersPage === 1 ? "active" : ""
                                  }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() => handlePageChange(1, "users")}
                                  aria-label="User page 1"
                                >
                                  1
                                </button>
                              </li>
                            )}
                            {currentUsersPage > 2 && totalUserPages > 5 && (
                              <li className="page-item disabled">
                                <span className="page-link">...</span>
                              </li>
                            )}
                            {[...Array(totalUserPages).keys()]
                              .map((page) => page + 1)
                              .filter((page) => {
                                return (
                                  page !== 1 &&
                                  page !== totalUserPages &&
                                  page >= currentUsersPage - 1 &&
                                  page <= currentUsersPage + 1
                                );
                              })
                              .map((page) => (
                                <li
                                  key={page}
                                  className={`page-item ${currentUsersPage === page ? "active" : ""
                                    }`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() =>
                                      handlePageChange(page, "users")
                                    }
                                    aria-label={`User page ${page}`}
                                  >
                                    {page}
                                  </button>
                                </li>
                              ))}
                            {currentUsersPage < totalUserPages - 1 &&
                              totalUserPages > 5 && (
                                <li className="page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              )}
                            {totalUserPages > 1 && (
                              <li
                                className={`page-item ${currentUsersPage === totalUserPages
                                  ? "active"
                                  : ""
                                  }`}
                              >
                                <button
                                  className="page-link"
                                  onClick={() =>
                                    handlePageChange(totalUserPages, "users")
                                  }
                                  aria-label={`User page ${totalUserPages}`}
                                >
                                  {totalUserPages}
                                </button>
                              </li>
                            )}
                            <li
                              className={`page-item ${currentUsersPage === totalUserPages
                                ? "disabled"
                                : ""
                                }`}
                            >
                              <button
                                className="page-link"
                                onClick={() =>
                                  handlePageChange(
                                    currentUsersPage + 1,
                                    "users"
                                  )
                                }
                                disabled={currentUsersPage === totalUserPages}
                                aria-label="Next user page"
                              >
                                <i className="bi bi-arrow-right"></i>
                              </button>
                            </li>
                          </ul>
                        </nav>
                      )}
                    </>
                  )}
                </div> */}
                {ROLE_ID === 2 && (
                  <div className="agent-chats-nav mb-3 px-3 py-2">
                    <button
                      className="btn btn-primary w-100"
                      onClick={handleAgentChatsClick}
                      aria-label="View agent-to-agent chats"
                    >
                      <i className="bi bi-chat-dots me-2"></i>
                      Agent Chats
                    </button>
                  </div>
                )}
                <div className="px-3 py-2">
                  <button
                    className="btn btn-dark w-100"
                    onClick={() => setShowTicketsView(false)}
                    aria-label="Show menu options"
                  >
                    Show Menu
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="menu-section mb-3">
                  <Menu data={filteredMenuData} />
                </div>
                <div className="px-3 py-2">
                  <button
                    className="btn btn-dark w-100"
                    onClick={() => setShowTicketsView(true)}
                    aria-label="Show active tickets"
                  >
                    Show Active Tickets
                  </button>
                </div>
              </>
            )}
          </SimpleBar>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
