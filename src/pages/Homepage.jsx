import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import logo from '../images/Easy return logo png.png';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { useNavigate, useLocation } from 'react-router-dom'; // Import useLocation
import { getDirectMessages, getRecentChats, getUnreadCount, markAllRead } from '../Services/DirectsmsApi';
import { getGroups } from "../Services/api";
// import "./Homepage.css"; // Import the new CSS file
import { useDispatch, useSelector } from "react-redux";
import { addGroupChatPopup, removeGroupChatPopup } from "../redux/slices/chatPopupsSlice"; // Import addGroupChatPopup
import GroupChatPopup from "../layout/sidebar/GroupChatPopup"; // Import GroupChatPopup
import { toast } from "react-toastify"; // Assuming react-toastify is used for toasts
// import { decrement, increment, reset } from "../redux/counterSlice";

const BASE_URL = "https://chatsupport.fskindia.com";
const WS_BASE = "wss://chatsupport.fskindia.com"; 
const TOKEN = localStorage.getItem("accessToken");
const ME_ID = parseInt(localStorage.getItem("userId"));

export default function ChatApp() {
  //   const count = useSelector((state) => state.counter.value);
  // const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [ws, setWs] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("messages");
  const [recentChats, setRecentChats] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
    const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const messagesEndRef = useRef();
  const navigate = useNavigate();
  const location = useLocation(); // Initialize useLocation

  // ✅ Get initials
  const getGroupInitials = (name) => {
    if (!name || typeof name !== "string") return "G";
    const words = name.trim().split(/\s+/);
    return words.length === 1
      ? words[0].slice(0, 2).toUpperCase()
      : words.slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  };

  const getUserInitials = (firstName, lastName) =>
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  // ✅ Filtered group list
  const filteredGroups = groups.filter((group) =>
    group.name?.toLowerCase().includes(groupSearchTerm.toLowerCase())
  );

  // ✅ Fetch groups from API
  const fetchGroups = async () => {
    try {
      setLoadingGroups(true);
      const data = await getGroups();

      if (!Array.isArray(data)) {
        toast.error("Invalid group data received from server.");
        setGroups([]);
        setLoadingGroups(false);
        return;
      }

      setGroups((prevGroups) => {
        const updatedGroups = data.sort(
          (a, b) =>
            new Date(b.created_at || b.updated_at) -
            new Date(a.created_at || a.updated_at)
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

  // ✅ Load groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);
      // console.log(filteredGroups,'filteredGroups')

  // Fetch users, recent chats, and unread counts
  useEffect(() => {
    if (!ME_ID || !TOKEN) {
      navigate("/auth-login");
      return;
    }

    // Fetch users
    axios.get(`${BASE_URL}/users/?skip=0&limit=100`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    })
      .then(res => {
        const filtered = res.data.records.filter(u => u.id !== ME_ID);
        setUsers(filtered);
        setFilteredUsers(filtered);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userId");
          navigate("/auth-login");
        }
      });

    // Fetch recent chats
    getRecentChats()
      .then(chats => {
        setRecentChats(chats);
        const counts = {};
        chats.forEach(chat => {
          counts[chat.recipient_id] = chat.unread_count || 0;
        });
        setUnreadCounts(counts);
      })
      .catch(err => console.error('Error fetching recent chats:', err));

    // Fetch unread counts
    getUnreadCount(ME_ID)
      .then(data => {
        const counts = {};
        Object.keys(data).forEach(userId => {
          counts[parseInt(userId)] = data[userId] || 0;
        });
        setUnreadCounts(prev => ({ ...prev, ...counts }));
      })
      .catch(err => console.error('Error fetching unread count:', err.message));
  }, []);

  // Filter users based on search term
useEffect(() => {
  const base = users.filter((user) => {
    const firstName = user.first_name || "";
    const lastName = user.last_name || "";

    let joinedDateFormats = "";
    if (user.date_joined) {
      const date = new Date(user.date_joined);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      // Get month name for flexible search
      const monthName = date.toLocaleString("default", { month: "long" });

      joinedDateFormats = [
        `${yyyy}-${mm}-${dd}`, // 2025-05-19
        `${dd}-${mm}-${yyyy}`, // 19-05-2025
        `${dd}/${mm}/${yyyy}`, // 19/05/2025
        `${dd} ${monthName} ${yyyy}`, // 19 May 2025
        `${monthName} ${dd}, ${yyyy}`, // May 19, 2025
      ].join(" ");
    }

    const fullText = `${firstName} ${lastName} ${joinedDateFormats}`.toLowerCase();
    return fullText.includes(searchTerm.toLowerCase().trim());
  });

  const sorted = [...base].sort((a, b) => {
    const chatA = recentChats.find((c) => c.recipient_id === a.id);
    const chatB = recentChats.find((c) => c.recipient_id === b.id);
    const timeA = chatA?.last_message_timestamp
      ? new Date(chatA.last_message_timestamp).getTime()
      : 0;
    const timeB = chatB?.last_message_timestamp
      ? new Date(chatB.last_message_timestamp).getTime()
      : 0;
    return timeB - timeA;
  });

  setFilteredUsers(sorted);
}, [searchTerm, users, recentChats]);


// console.log(users,'users')
  // useEffect(() => {
  //   if (searchTerm.trim() === "") {
  //     setFilteredUsers(users);
  //   } else {
  //     const filtered = users.filter(user =>
  //       `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  //     );
  //     setFilteredUsers(filtered);
  //   }
  // }, [searchTerm, users]);

  // WebSocket connection
  useEffect(() => {
    if (!activeUser || !ME_ID || !TOKEN) return;

    if (ws) ws.close();

    const socket = new WebSocket(`${WS_BASE}/messaging/ws/${ME_ID}/${TOKEN}`);
    setWs(socket);

    socket.onopen = () => {
      setConnectionStatus("connected");
      
    };

    socket.onerror = (error) => {
      setConnectionStatus("error");
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      setConnectionStatus("disconnected");
      
      setTimeout(() => setWs(new WebSocket(`${WS_BASE}/messaging/ws/${ME_ID}/${TOKEN}`)), 3000);
    };

    socket.onmessage = (e) => {
      const message = JSON.parse(e.data);


      if (message.type === "message") {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === message.id);
          if (messageExists) return prev;
          const updatedMessages = [...prev, message];
          if (message.sender_id === activeUser?.id) {
            // Mark as read if the message is from the active user
            markAllRead()
              .then(() => {
                setUnreadCounts(prev => ({ ...prev, [activeUser.id]: 0 }));
                updatedMessages.forEach(msg => {
                  if (msg.sender_id !== ME_ID && !msg.read) {
                    msg.read = true;
                  }
                });
                if (socket.readyState === 1) {
                  socket.send(JSON.stringify({
                    type: "status_update",
                    sender_id: ME_ID,
                    recipient_id: activeUser.id,
                    status: "read"
                  }));
                }
              })
              .catch(err => console.error('Error marking messages as read:', err));
          }
          return updatedMessages;
        });

        if (message.sender_id !== ME_ID && message.sender_id !== activeUser?.id) {
          // Update unread count for non-active users
          setUnreadCounts(prev => ({
            ...prev,
            [message.sender_id]: (prev[message.sender_id] || 0) + 1
          }));
          // Fetch recent chats to update last message
          getRecentChats()
            .then(chats => setRecentChats(chats))
            .catch(err => console.error('Error updating recent chats:', err));
        }
      } else if (message.type === "status_update") {
        setMessages(prev => {
          const updatedMessages = [...prev];
          updatedMessages.forEach(msg => {
            if (msg.id === message.message_id) {
              msg.read = message.status === "read";
            }
          });
          return updatedMessages;
        });
        if (message.sender_id === activeUser?.id) {
          setUnreadCounts(prev => ({ ...prev, [activeUser.id]: 0 }));
        }
      } else if (message.type === "delete_message") {
        setMessages(prev => prev.filter(msg => msg.id !== message.message_id));
        setSelectedMessages(prev => prev.filter(id => id !== message.message_id));
      }
    };

    // Fetch chat history
    getDirectMessages(ME_ID, activeUser.id, 0, 100)
      .then(messages => {
        setMessages(messages);
        markAllRead()
          .then(() => {
            setUnreadCounts(prev => ({ ...prev, [activeUser.id]: 0 }));
            if (socket.readyState === 1) {
              socket.send(JSON.stringify({
                type: "status_update",
                sender_id: ME_ID,
                recipient_id: activeUser.id,
                status: "read"
              }));
            }
          })
          .catch(err => console.error('Error marking messages as read:', err));
      })
      .catch(err => console.error('Error fetching messages:', err));

    return () => socket.close();
  }, [activeUser]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    const input = e.target.elements.message;
    const text = input.value.trim();

    if (text && ws && ws.readyState === 1) {
      const message = {
        type: "message",
        sender_id: ME_ID,
        recipient_id: activeUser.id,
        content: text,
        timestamp: new Date().toISOString(),
        delivered: true,
        read: false
      };

      ws.send(JSON.stringify(message));
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === message.id);
        if (messageExists) return prev;
        return [...prev, message];
      });
      input.value = "";

      // Sync with API
      setTimeout(() => {
        getDirectMessages(ME_ID, activeUser.id, 0, 100)
          .then(updatedMessages => {
            setMessages(updatedMessages);
            // Update recent chats
            getRecentChats()
              .then(chats => setRecentChats(chats))
              .catch(err => console.error('Error updating recent chats:', err));
          })
          .catch(err => console.error('Error syncing messages:', err));
      }, 500);
    }
  };

  const deleteSelectedMessages = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedMessages.length} message(s)?`)) {
      if (ws && ws.readyState === WebSocket.OPEN && selectedMessages.length > 0) {
        selectedMessages.forEach(messageId => {
          const deleteMessage = {
            type: "delete_message",
            message_id: messageId
          };
          ws.send(JSON.stringify(deleteMessage));
        });

        setMessages(prev => prev.filter(msg => !selectedMessages.includes(msg.id)));
        setSelectedMessages([]);

        setTimeout(() => {
          getDirectMessages(ME_ID, activeUser.id, 0, 100)
            .then(updatedMessages => {
              setMessages(updatedMessages);
            })
            .catch(err => console.error('Error syncing messages after deletion:', err));
        }, 500);
      }
    }
  };

  const handleMessageSelect = (messageId) => {
    setSelectedMessages(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMessages(prev =>
      prev.length === messages.length
        ? []
        : messages.map(msg => msg.id)
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 1000 / 60);
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr ago`;
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
  };

  const getLastMessage = (userId) => {
    const chat = recentChats.find(c => c.recipient_id === userId);
    if (chat) {
      return { content: chat.last_message, timestamp: chat.last_message_timestamp };
    }
    // Fallback: Fetch messages if recentChats is empty
    getDirectMessages(ME_ID, userId, 0, 1)
      .then(messages => {
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          setRecentChats(prev => [
            ...prev,
            {
              recipient_id: userId,
              last_message: lastMessage.content,
              last_message_timestamp: lastMessage.timestamp,
              unread_count: lastMessage.read ? 0 : 1
            }
          ]);
          return { content: lastMessage.content, timestamp: lastMessage.timestamp };
        }
        return {};
      })
      .catch(err => console.error('Error fetching last message:', err));
    return {};
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ''}`.toUpperCase();
  };


  // Handle group click
  // const handleGroupClick = (group) => {
  //   // Check if group chat is already open
  //   if (openGroupChatPopups.some((popup) => popup.group.id === group.id)) {
  //     toast.warning('Group chat already open for this group.');
  //     return;
  //   }

  //   // Limit to 3 open group chat popups
  //   if (openGroupChatPopups.length >= 3) {
  //     toast.error('Maximum of 3 group chat windows can be open at a time.');
  //     return;
  //   }

  //   // Add new group chat popup
  //   const newGroupPopup = {
  //     group,
  //     key: `group-chat-${group.id}-${Date.now()}`,
  //     position: { x: 0, y: 0 } // Position will be calculated by the page
  //   };

  //   setOpenGroupChatPopups((prev) => [
  //     ...prev,
  //     newGroupPopup
  //   ]);

  //   // Navigate to chat popups page
  //   navigate('/chat-popups', {
  //     state: { 
  //       groupChatPopups: [...openGroupChatPopups, newGroupPopup],
  //       chatPopups: openChatPopups, // Assuming openChatPopups is also managed here
  //       fromPath: location.pathname // Pass the current path
  //     },
  //     replace: false,
  //   });
  // };

  const { openGroupChatPopups } = useSelector((state) => state.chatPopups);
  const dispatch = useDispatch();

  // const handleGroupClick = (group) => {
  //   // Check if group chat is already open
  //   if (openGroupChatPopups.some((popup) => popup.group.id === group.id)) {
  //     toast.warning("Group chat already open for this group.");
  //     return;
  //   }

  //   // Limit to 3 open popups
  //   if (openGroupChatPopups.length >= 3) {
  //     toast.error("Maximum of 3 group chat windows can be open at a time.");
  //     return;
  //   }

  //   // Create a new popup object
  //   const newGroupPopup = {
  //     group,
  //     key: `group-chat-${group.id}-${Date.now()}`,
  //     position: { x: 0, y: 0 },
  //   };

  //   // Add to Redux store
  //   dispatch(addGroupChatPopup(newGroupPopup));

  //   // No navigation needed, GroupChatPopup is rendered based on Redux state
  // };


 const handleGroupClick = (group) => {
  if (openGroupChatPopups.some((popup) => popup.group.id === group.id)) {
    toast.warning('Group chat already open.');
    return;
  }

  if (openGroupChatPopups.length >= 3) {
    toast.error('Maximum of 3 group chat windows can be open at a time.');
    return;
  }

  dispatch(addGroupChatPopup(group));

  navigate('/chat-popups', {
    state: { 
      groupChatPopups: [...openGroupChatPopups, { group }]
      // chatPopups: openChatPopups,
    },
  });
};


  // const handleRemoveGroupChatPopup = (groupId) => {
  //   dispatch(removeGroupChatPopup(groupId));
  // };

  return (<>
  
   {/* <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Redux Counter</h1>
      <h2>{count}</h2>
      <div>
        <button onClick={() => dispatch(increment())}>+</button>
        <button onClick={() => dispatch(decrement())}>-</button>
        <button onClick={() => dispatch(reset())}>Reset</button>
      </div>
    </div> */}
  
    <div className="d-flex" style={{ height: "100vh", marginTop: "60px", padding: "10px", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div className="d-flex flex-column bg-white shadow-sm rounded-3" style={{ width: "300px", border: "1px solid #e9ecef" }}>
        <div className="p-3 border-bottom d-flex align-items-center">
          <img src={logo} alt="MSM Logo" style={{ width: "60px" }} />
          <h2 className="ms-2 mb-0 header-title-text" style={{ fontSize: "1.5rem" }}>Chats</h2>
        </div>

        <div className="d-flex border-bottom">
          <button
            className={`flex-grow-1 btn ${activeTab === "messages" ? "btn-primary" : "btn-outline-primary"} rounded-0`}
            onClick={() => setActiveTab("messages")}
          >
            Messages
          </button>
          <button
            className={`flex-grow-1 btn ${activeTab === "groups" ? "btn-primary" : "btn-outline-primary"} rounded-0`}
             onClick={() => setActiveTab("groups")}
          >
            Groups 
          </button>
        </div>
{activeTab === 'messages' ? (
  <>
    <div className="p-3 border-bottom">
  <div className="position-relative">
    {/* Search Icon */}
    <i
      className="bi bi-search position-absolute"
      style={{
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--bs-gray-500)", // adapts to dark/light via Bootstrap variable
        fontSize: "16px",
        pointerEvents: "none",
      }}
    ></i>

    {/* Input */}
    <input
      type="text"
      className="form-control ps-5 rounded-3"
      placeholder="Search by name"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      style={{
        height: "40px",
        fontSize: "14px",
        backgroundColor: "var(--bs-body-bg)", // adapts to light/dark
        color: "var(--bs-body-color)",        // adapts to light/dark
        border: "1px solid var(--bs-border-color)", // adapts
      }}
    />
  </div>
</div>



    <div className="flex-grow-1 overflow-auto">
      {filteredUsers.map(user => {
        const { content: lastMessage, timestamp: lastMessageTime } = getLastMessage(user.id) || {};
        return (
          <div
            key={user.id}
            className={`d-flex align-items-center p-3 border-bottom cursor-pointer group-item-hover-effect ${activeUser?.id === user.id ? "bg-primary bg-opacity-10" : ""}`}
            onClick={() => setActiveUser(user)}
            style={{ transition: "background-color 0.2s" }}
          >
            <div className="position-relative me-3">
              {user.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "40px", height: "40px", objectFit: "cover" }}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                  style={{ width: "40px", height: "40px", fontSize: "16px" }}
                >
                  {getInitials(user.first_name, user.last_name || '')}
                </div>
              )}
              <div
                className="position-absolute bottom-0 end-0 rounded-circle border border-white"
                style={{
                  width: "10px",
                  height: "10px",
                  backgroundColor: user.availability ? "#28a745" : "#6c757d"
                }}
              ></div>
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <strong className="text-dark" style={{ fontSize: "14px" }}>{user.first_name} {user.last_name}</strong>
                <small className="text-primary" style={{ fontSize: "12px" }}>{formatTime(lastMessageTime)}</small>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted text-truncate" style={{ maxWidth: "150px", fontSize: "12px" }}>
                  {lastMessage ? (lastMessage.length > 20 ? lastMessage.substring(0, 20) + "..." : lastMessage) : "No messages yet"}
                </small>
                {unreadCounts[user.id] > 0 && (
                  <span className="badge bg-primary rounded-circle ms-2 d-flex align-items-center justify-content-center"
                    style={{ width: "20px", height: "20px", fontSize: "10px" }}>
                    {unreadCounts[user.id]}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </>
) : activeTab === 'groups' ? (
  <>
  <div className="p-3 border-bottom">
  <div className="position-relative">
    {/* Search Icon */}
    <i
      className="bi bi-search position-absolute"
      style={{
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--bs-gray-500)", // adapts to dark/light
        fontSize: "16px",
        pointerEvents: "none",
      }}
    ></i>

    {/* Input */}
    <input
      type="text"
      className="form-control ps-5 rounded-3"
      placeholder="Search group..."
      value={groupSearchTerm}
      onChange={(e) => setGroupSearchTerm(e.target.value)}
      style={{
        height: "40px",
        fontSize: "14px",
        backgroundColor: "var(--bs-body-bg)", // adapts to light/dark
        color: "var(--bs-body-color)",        // adapts to light/dark
        border: "1px solid var(--bs-border-color)", // adapts
      }}
    />
  </div>
</div>


    {loadingGroups ? (
      <p className="text-center text-muted p-3">Loading groups...</p>
    ) : (
      <div className="flex-grow-1 overflow-auto">
        {Array.isArray(filteredGroups) && filteredGroups.length > 0 ? (
          filteredGroups.map(group => {
            const lastMsgObj = getLastMessage(group.id);
            const lastMessage = lastMsgObj?.content || "";
            const lastMessageTime = lastMsgObj?.timestamp || "";

            return (
              <div
                key={group.id}
                className={`d-flex align-items-center p-3 border-bottom cursor-pointer group-item-hover-effect ${
                  activeGroup?.id === group.id ? "bg-primary bg-opacity-10" : ""
                }`}
                onClick={() => {
                  setActiveGroup(group); // Keep active group state for styling
                  handleGroupClick(group); // Handle navigation and popup logic
                }}
                style={{ transition: "background-color 0.2s" }}
              >
                <div className="position-relative me-3">
                  {group.group_avatar ? (
                    <img
                      src={group.group_avatar}
                      alt="Group Avatar"
                      className="rounded-circle"
                      style={{ width: "40px", height: "40px", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white"
                      style={{ width: "40px", height: "40px", fontSize: "16px" }}
                    >
                      {getGroupInitials(group.name)}
                    </div>
                  )}
                </div>

                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong className="text-dark" style={{ fontSize: "14px" }}>
                      {group.name}
                    </strong>
                    <small className="text-primary" style={{ fontSize: "12px" }}>
                      {formatTime(lastMessageTime)}
                    </small>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <small
                      className="text-muted text-truncate"
                      style={{ maxWidth: "150px", fontSize: "12px" }}
                    >
                      {lastMessage
                        ? lastMessage.length > 20
                          ? lastMessage.substring(0, 20) + "..."
                          : lastMessage
                        : "No messages yet"}
                    </small>
                    {unreadCounts[group.id] > 0 && (
                      <span
                        className="badge bg-primary rounded-circle ms-2 d-flex align-items-center justify-content-center"
                        style={{ width: "20px", height: "20px", fontSize: "10px" }}
                      >
                        {unreadCounts[group.id]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-muted p-3">No groups found</p>
        )}
      </div>
    )}
  </>
) : null}
       

    

      </div>

      {/* Chat Area */}
      <div className="flex-grow-1 d-flex flex-column ms-3 bg-white rounded-3 shadow-sm">
        {connectionStatus === "connected" ||connectionStatus ==='Disconnected'&&<>
        <div className="p-2 text-center" style={{ backgroundColor: connectionStatus === "connected" ? "#d4edda" : "#f8d7da" }}>
          <small>{connectionStatus === "connected" ? "Connected" :connectionStatus ==='Disconnected'? "Disconnected":''}</small>
        </div>
        </>}
        
        {activeUser ? (
          <>
            <div className="d-flex align-items-center p-3 border-bottom">
              <div className="position-relative me-3">
                {activeUser.profile_picture ? (
                  <img
                    src={activeUser.profile_picture}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ width: "40px", height: "40px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
                    style={{ width: "40px", height: "40px", fontSize: "16px" }}
                  >
                    {getInitials(activeUser.first_name, activeUser.last_name || '')}
                  </div>
                )}
                <div
                  className="position-absolute bottom-0 end-0 rounded-circle border border-white"
                  style={{
                    width: "10px",
                    height: "10px",
                    backgroundColor: activeUser.availability ? "#28a745" : "#6c757d"
                  }}
                ></div>
              </div>
              <div>
                <h5 className="m-0" style={{ fontSize: "16px" }}>
                  {activeUser.first_name} {activeUser.last_name}
                  {activeUser.availability && (
                    <small className="ms-2 text-success">Online</small>
                  )}
                </h5>
                <small className="text-muted" style={{ fontSize: "12px" }}>
                  Active {formatTime(activeUser.last_login)}
                </small>
              </div>
              <div className="ms-auto d-flex align-items-center">
                <input
                  type="checkbox"
                  className="me-2"
                  checked={selectedMessages.length === messages.length && messages.length > 0}
                  onChange={handleSelectAll}
                  title="Select All"
                />
                <span className="me-2" style={{ fontSize: "14px" }}>Select All</span>
                {selectedMessages.length > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={deleteSelectedMessages}>
                    Delete ({selectedMessages.length})
                  </button>
                )}
              </div>
            </div>

            {/* <div
              className="flex-grow-1 p-3 overflow-auto"
              style={{ backgroundColor: "#f8f9fa" }}
            >
              {messages.length === 0 ? (
                <div className="text-center text-muted">
                  No messages yet.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`d-flex mb-3 ${message.sender_id === ME_ID ? "justify-content-end" : "justify-content-start"}`}
                  >
                    <div
                      className={`p-3 rounded-3 shadow-sm ${message.sender_id === ME_ID ? "bg-primary text-white" : "bg-white"}`}
                      style={{ maxWidth: "70%", transition: "all 0.2s" }}
                    >
                      <div className="d-flex align-items-center">
                        <input
                          type="checkbox"
                          className="me-2"
                          checked={selectedMessages.includes(message.id)}
                          onChange={() => handleMessageSelect(message.id)}
                        />
                        <span>{message.content}</span>
                      </div>
                      <div
                        className={`d-flex justify-content-end align-items-center mt-1 ${message.sender_id === ME_ID ? "text-white-50" : "text-muted"}`}
                      >
                        <small style={{ fontSize: "10px" }}>{formatTime(message.timestamp)}</small>
                        {message.sender_id === ME_ID && (
                          <span className="ms-2">
                            {message.read ? (
                              <i className="bi bi-check2-all text-success" title="Read"></i>
                            ) : (
                              <i className="bi bi-check2 text-muted" title="Delivered"></i>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div> */}
            <div
  className="flex-grow-1 p-3 overflow-auto"
  style={{ backgroundColor: "#f8f9fa" }}
>
  {messages.length === 0 ? (
    <div className="text-center text-muted">No messages yet.</div>
  ) : (
    [...messages] // ✅ Create a shallow copy to avoid mutating state
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) // ✅ Sort oldest → newest
      .map((message, index) => (
        <div
          key={index}
          className={`d-flex mb-3 ${
            message.sender_id === ME_ID
              ? "justify-content-end"
              : "justify-content-start"
          }`}
        >
          <div
            className={`p-3 rounded-3 shadow-sm ${
              message.sender_id === ME_ID
                ? "bg-primary text-white"
                : "bg-white"
            }`}
            style={{ maxWidth: "70%", transition: "all 0.2s" }}
          >
            <div className="d-flex align-items-center">
              <input
                type="checkbox"
                className="me-2"
                checked={selectedMessages.includes(message.id)}
                onChange={() => handleMessageSelect(message.id)}
              />
              <span>{message.content}</span>
            </div>

            <div
              className={`d-flex justify-content-end align-items-center mt-1 ${
                message.sender_id === ME_ID
                  ? "text-white-50"
                  : "text-muted"
              }`}
            >
              <small style={{ fontSize: "10px" }}>
                {formatTime(message.timestamp)}
              </small>

              {message.sender_id === ME_ID && (
                <span className="ms-2">
                  {message.read ? (
                    <i
                      className="bi bi-check2-all text-success"
                      title="Read"
                    ></i>
                  ) : (
                    <i
                      className="bi bi-check2 text-muted"
                      title="Delivered"
                    ></i>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      ))
  )}
  <div ref={messagesEndRef} /> {/* ✅ Keep scroll reference intact */}
</div>


            <div className="p-3 border-top bg-white">
              <form onSubmit={sendMessage}>
                <div className="input-group">
                  <input
                    type="text"
                    name="message"
                    className="form-control border rounded-start me-2"
                    placeholder="Type a message..."
                    autoComplete="off"
                    style={{ fontSize: "14px" }}
                  />
                  <button className="btn btn-primary rounded-end" type="submit">
                    <i className="bi bi-send"></i>
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light rounded-3">
            <i className="bi bi-chat-square-text" style={{ fontSize: "5rem", color: "#dee2e6" }}></i>
            <h4 className="mt-3 text-muted">Select a chat to start messaging</h4>
          </div>
        )}
      </div>
    </div>
  
  </>);
}
