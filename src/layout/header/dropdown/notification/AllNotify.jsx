// import React, { useState, useEffect } from "react";
// import { Card, CardBody, CardHeader, Pagination, PaginationItem, PaginationLink } from "reactstrap";
// import Icon from "@/components/icon/Icon";
// import axios from "axios";
// import { v4 as uuidv4 } from "uuid";
// import { useNavigate } from "react-router-dom";
// import NotificationService from "../../../../Services/NotificationService";

// const BASE_URL_USER = "https://chatsupport.fskindia.com";

// // Formatting timestamp for display
// const formatDateTime = (timestamp) => {
//   if (!timestamp) return "";
//   const date = new Date(timestamp);
//   const today = new Date();
//   const yesterday = new Date();
//   yesterday.setDate(today.getDate() - 1);

//   const isToday = date.toDateString() === today.toDateString();
//   const isYesterday = date.toDateString() === yesterday.toDateString();

//   const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase();
//   if (isToday) return `Today, ${timeStr}`;
//   if (isYesterday) return `Yesterday, ${timeStr}`;
//   return `${date.toLocaleDateString("en-GB", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//   }).split("/").join("/")}, ${timeStr}`;
// };

// // Rendering individual notification item
// const NotificationItem = ({ icon, iconStyle, text, time, timestamp, type, id, ticket_number, name, email, issue_description, site_name }) => {
//   const navigate = useNavigate();
//   const maxDescriptionLength = 100;
//   const truncatedDescription = issue_description && issue_description.length > maxDescriptionLength
//     ? issue_description.substring(0, maxDescriptionLength) + "..."
//     : issue_description || "No description provided";
//   return (
//     <div
//       className="nk-notification-item d-flex align-items-center p-2 border-bottom"
//       key={id}
//       id={id}
//       onClick={() => {
//         if (ticket_number) {
//           console.log(`[ViewAll] Navigating to chat for ticket: ${ticket_number}`);
//           navigate(`/support-chat/${ticket_number}`);
//         }
//       }}
//       style={{ cursor: ticket_number ? 'pointer' : 'default' }}
//     >
//       <div className="nk-notification-icon me-2">
//         <Icon name={icon} className={`icon-circle ${iconStyle || ""}`} />
//       </div>
//       <div className="nk-notification-content flex-grow-1">
//         <div className="nk-notification-text">{text}</div>
//         {name && email && (
//           <div className="nk-notification-details small text-muted mt-1" style={{ fontSize: "0.75rem", lineHeight: "1.2" }}>
//             <div>Name: {name}</div>
//             <div>Email: {email}</div>
//             <div>Site: {site_name || "Unknown Site"}</div>
//             <div>Description: {truncatedDescription}</div>
//           </div>
//         )}
//         <div className="nk-notification-time text-muted small">
//           {timestamp ? formatDateTime(timestamp) : time || ""}
//           {type === "agent" && <span className="ms-1 badge badge-sm badge-info">Agent</span>}
//         </div>
//       </div>
//     </div>
//   );
// };

// // Main ViewAll component for displaying all notifications
// const ViewAll = () => {
//   const [notifications, setNotifications] = useState([]);
//   const [error, setError] = useState(null);
//   const [user, setUser] = useState(null);
//   const [connectionStatus, setConnectionStatus] = useState("Connecting...");
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;
//   const navigate = useNavigate();

//   // Fetching user details from API
//   const fetchUserDetails = async (token) => {
//     try {
//       
//       const response = await axios.get(`${BASE_URL_USER}/users/me`, {
//         headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
//       });
//       console.log("[ViewAll] User details fetched:", response.data);
//       localStorage.setItem("auth", JSON.stringify({
//         sub: response.data.sub,
//         exp: response.data.exp,
//         user: response.data.user,
//       }));
//       return response.data.user;
//     } catch (err) {
//       console.error("[ViewAll] Error fetching user details:", {
//         status: err.response?.status,
//         message: err.message,
//         details: err.response?.data?.detail || "No details",
//       });
//       return null;
//     }
//   };

//   // Initializing notification service and handling real-time notifications
//   useEffect(() => {
//     console.log('[ViewAll] useEffect triggered. localStorage:', {
//       userEmail: localStorage.getItem("userEmail"),
//       userId: localStorage.getItem("userId"),
//       accessToken: !!localStorage.getItem("accessToken") ? "Set" : "Not set",
//       auth: localStorage.getItem("auth"),
//     });

//     const token = localStorage.getItem("accessToken");
//     let savedAuth;
//     try {
//       savedAuth = JSON.parse(localStorage.getItem("auth") || "{}");
//     } catch (e) {
//       console.error("[ViewAll] Error parsing auth from localStorage:", e);
//       savedAuth = {};
//     }

//     if (!token) {
//       console.warn('[ViewAll] Missing token');
//       setError("Please log in to view notifications.");
//       setConnectionStatus("Disconnected");
//       return;
//     }

//     const loadUserAndNotifications = async () => {
//       try {
//         let currentUser = savedAuth.user;
//         console.log("[ViewAll] Saved auth user:", currentUser);

//         if (!currentUser?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentUser.email)) {
//           
//           const userData = await fetchUserDetails(token);
//           if (!userData) {
//             setError("Failed to fetch user details.");
//             setConnectionStatus("Disconnected");
//             return;
//           }
//           currentUser = userData;
//         }

//         setUser(currentUser);

//         if (!currentUser?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentUser.email)) {
//           console.log(`[ViewAll] Invalid agent_email: ${currentUser?.email}`);
//           setNotifications([]);
//           setError("Notifications are only available for valid agent emails.");
//           setConnectionStatus("Disconnected");
//           return;
//         }

//         console.log(`[ViewAll] Agent detected (email: ${currentUser.email}). Loading notifications`);
//         localStorage.removeItem(`notifications_${currentUser.email}`);
//         setNotifications([]);

//         await NotificationService.initialize(currentUser.email, token);

//         const supportRequestCallback = (notification) => {
//           const newNotification = {
//             id: notification.id,
//             icon: notification.message?.toLowerCase().includes("handoff") ? "user" : "bell",
//             iconStyle: notification.message?.toLowerCase().includes("handoff") ? "bg-primary" : "bg-warning",
//             text: notification.message || `New support request: ${notification.ticket_number}`,
//             timestamp: notification.timestamp || new Date().toISOString(),
//             type: "agent",
//             ticket_number: notification.ticket_number,
//             name: notification.name,
//             email: notification.email,
//             issue_description: notification.issue_description,
//             site_name: notification.site_name,
//           };
//           setNotifications((prev) => {
//             if (notification.ticket_number && prev.some(n => n.ticket_number === notification.ticket_number)) {
//               return prev;
//             }
//             const updated = [newNotification, ...prev.filter(n => n.id !== notification.id)].slice(0, 50);
//             console.log(`[ViewAll] Added new notification: ${notification.message}, Total: ${updated.length}`);
//             localStorage.setItem(`notifications_${currentUser.email}`, JSON.stringify(updated));
//             return updated;
//           });
//         };
//         NotificationService.subscribe("realtime_notification", supportRequestCallback);

//         const connectionCallback = (data) => {
//           // console.log(`[ViewAll] Connection status: ${data.status}`);
//           setConnectionStatus(data.status);
//         };
//         NotificationService.subscribe("connection", connectionCallback);

//         const errorCallback = (error) => {
//           console.log(`[ViewAll] Error notification: ${error.message}`);
//           setError(error.message === "Unable to connect to notifications. Check console for details." ?
//             "Notification service unavailable." :
//             error.message);
//           setConnectionStatus("Disconnected");
//         };
//         NotificationService.subscribe("error", errorCallback);

//         return () => {
//           NotificationService.unsubscribe("realtime_notification", supportRequestCallback);
//           NotificationService.unsubscribe("connection", connectionCallback);
//           NotificationService.unsubscribe("error", errorCallback);
//           NotificationService.close();
//         };
//       } catch (err) {
//         console.error("[ViewAll] Load error:", err);
//         setError("Failed to load notifications.");
//         setConnectionStatus("Disconnected");
//       }
//     };

//     loadUserAndNotifications();
//   }, [navigate]);

//   // Clearing all notifications
//   const clearNotifications = () => {
//     console.log(`[ViewAll] Clearing notifications for ${user?.email}`);
//     setNotifications([]);
//     localStorage.setItem(`notifications_${user?.email}`, "[]");
//     setCurrentPage(1);
//   };

//   // Pagination logic
//   const totalPages = Math.ceil(notifications.length / itemsPerPage);
//   const startIndex = (currentPage - 1) * itemsPerPage;
//   const endIndex = startIndex + itemsPerPage;
//   const currentNotifications = notifications.slice(startIndex, endIndex);

//   // Handling page change for pagination
//   const handlePageChange = (page) => {
//     if (page >= 1 && page <= totalPages) {
//       setCurrentPage(page);
//       console.log(`[ViewAll] Changed to page ${page}`);
//     }
//   };

//   // Rendering ViewAll component
//   return (
//     <div className="nk-content">
//       <div className="container-fluid">
//         <div className="nk-content-inner">
//           <div className="nk-content-body">
//             <Card className="card-bordered">
//               <CardHeader className="card-header text-light" style={{backgroundColor:"#6576ff"}}>
//                 <h5 className="card-title">All Notifications</h5>
//                 {notifications.length > 0 && (
//                   <a href="#" className="link link-danger" onClick={(e) => { e.preventDefault(); clearNotifications(); }}>
//                     Clear All
//                   </a>
//                 )}
//               </CardHeader>
//               <CardBody className="card-inner">
//                 <div className="nk-notification">
//                   {error && (
//                     <div className="nk-notification-item p-2">
//                       <div className="nk-notification-content">
//                         <div className="nk-notification-text text-danger">{error}</div>
//                       </div>
//                     </div>
//                   )}
//                   {notifications.length > 0 ? (
//                     currentNotifications.map((item) => (
//                       <NotificationItem
//                         key={item.id}
//                         id={item.id}
//                         icon={item.icon}
//                         iconStyle={item.iconStyle}
//                         text={item.text}
//                         time={item.time}
//                         timestamp={item.timestamp}
//                         type={item.type}
//                         ticket_number={item.ticket_number}
//                         name={item.name}
//                         email={item.email}
//                         issue_description={item.issue_description}
//                         site_name={item.site_name}
//                       />
//                     ))
//                   ) : (
//                     !error && (
//                       <div className="nk-notification-item p-2">
//                         <div className="nk-notification-content">
//                           <div className="nk-notification-text">No notifications available</div>
//                         </div>
//                       </div>
//                     )
//                   )}
//                 </div>
//                 {notifications.length > 0 && (
//                   <Pagination className="mt-3 d-flex justify-content-center">
//                     <PaginationItem disabled={currentPage === 1}>
//                       <PaginationLink previous onClick={() => handlePageChange(currentPage - 1)} />
//                     </PaginationItem>
//                     {[...Array(totalPages).keys()].map((index) => (
//                       <PaginationItem key={index + 1} active={currentPage === index + 1}>
//                         <PaginationLink onClick={() => handlePageChange(index + 1)}>
//                           {index + 1}
//                         </PaginationLink>
//                       </PaginationItem>
//                     ))}
//                     <PaginationItem disabled={currentPage === totalPages}>
//                       <PaginationLink next onClick={() => handlePageChange(currentPage + 1)} />
//                     </PaginationItem>
//                   </Pagination>
//                 )}
//               </CardBody>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ViewAll;