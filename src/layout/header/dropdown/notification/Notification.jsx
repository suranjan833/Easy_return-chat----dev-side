import React, { useState, useEffect, useRef } from "react";
import { DropdownToggle, DropdownMenu, UncontrolledDropdown } from "reactstrap";
import Icon from "../../../../components/icon/Icon";
import axios from "axios";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import NotificationService from "../../../../Services/NotificationService";
import { useTickets } from "../../../../Global/TicketsContext";

const BASE_URL_USER = "https://chatsupport.fskindia.com";
const BASE_URL_NOTIFICATIONS = "https://supportdesk.fskindia.com";

// Formatting timestamp for display
const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    .toUpperCase();
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .split("/")
    .join("/")}, ${timeStr}`;
};

const NotificationItem = ({
  icon,
  iconStyle,
  message,
  text,
  time,
  timestamp,
  type,
  id,
  ticket_number,
  name,
  email,
  issue_description,
  site_name,
  isRead,
  onMarkAsRead,
}) => {
  const navigate = useNavigate();
  const maxDescriptionLength = 100;
  const truncatedDescription =
    issue_description && issue_description.length > maxDescriptionLength
      ? issue_description.substring(0, maxDescriptionLength) + "..."
      : issue_description || "No description provided";

  //     console.log(
  // message,'item')

  return (
    <div
      className="nk-notification-item d-flex align-items-center p-2 position-relative"
      key={id}
      id={id}
      onClick={(e) => {
        if (ticket_number && !e.target.closest(".mark-read-icon")) {
          navigate(`/support-chat/${ticket_number}`);
        }
      }}
      style={{
        cursor: ticket_number ? "pointer" : "default",
        backgroundColor: isRead ? "#f5f5f5" : "transparent",
      }}
    >
      <div className="nk-notification-icon me-2">
        {icon ? (
          <Icon name={icon} className={`icon-circle ${iconStyle || ""}`} />
        ) : (
          <div
            className={`icon-circle ${iconStyle || ""} d-flex align-items-center justify-content-center text-uppercase`}
          >
            {message ? message.substring(0, 2) : ""}
          </div>
        )}
      </div>
      <div className="nk-notification-content flex-grow-1">
        <div className="nk-notification-text">{message || text}</div>
        {timestamp && (
          <div
            className="nk-notification-details small text-muted mt-1"
            style={{ fontSize: "0.75rem", lineHeight: "1.2" }}
          >
            <div>{formatDateTime(timestamp)}</div>
          </div>
        )}
        {name && email && (
          <div
            className="nk-notification-details small text-muted mt-1"
            style={{ fontSize: "0.75rem", lineHeight: "1.2" }}
          >
            <div>Name: {name}</div>
          </div>
        )}
        <div className="nk-notification-time text-muted small">
          {type === "agent" && (
            <span className="ms-1 badge badge-sm badge-info">Agent</span>
          )}
        </div>
      </div>
      <div
        className="mark-read-icon position-absolute"
        style={{
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          cursor: "pointer",
        }}
        onClick={() => onMarkAsRead(id)} // Corrected to use id instead of ticket_number
      >
        <i className={`bi bi-bookmark-check${isRead ? "-fill" : ""}`}></i>
      </div>
    </div>
  );
};

// Main Notification component
const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [user, setUser] = useState(null);
  const title = "Notifications";
  const navigate = useNavigate();
  const { upsertTickets, updateTicketPartial } = useTickets();
  const isInitialized = useRef(false); // Use useRef for persistent flag

  // Fetching user details from API
  const fetchUserDetails = async (token) => {
    try {
      const response = await axios.get(`${BASE_URL_USER}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      localStorage.setItem(
        "auth",
        JSON.stringify({
          sub: response.data.sub,
          exp: response.data.exp,
          user: response.data.user,
        }),
      );
      return response.data.user;
    } catch (err) {
      console.error("[Notification] Error fetching user details:", {
        status: err.response?.status,
        message: err.message,
        details: err.response?.data?.detail || "No details",
      });
      toast.error("Failed to load user details.");
      return null;
    }
  };

  // Marking a single notification as read
  const markNotificationAsRead = async (notificationId) => {
    // console.log(notificationId,'notificationId')

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.put(
        `${BASE_URL_NOTIFICATIONS}/support/notifications/mark-read/${notificationId}`,
        { is_read: true },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      AllNotifications();

      // setNotifications((prev) =>
      //   prev.map((notification) =>
      //     notification.id === notificationId
      //       ? { ...notification, isRead: true }
      //       : notification
      //   )
      // );
      // localStorage.setItem(
      //   `notifications_${user.email}`,
      //   JSON.stringify(
      //     notifications.map((notification) =>
      //       notification.id === notificationId
      //         ? { ...notification, isRead: true }
      //         : notification
      //     )
      //   )
      // );
      toast.success("Notification marked as read.");
    } catch (err) {
      console.error("[Notification] Error marking notification as read:", {
        status: err.response?.status,
        message: err.message,
        details: err.response?.data?.detail || "No details",
      });
      toast.error("Failed to mark notification as read.");
    }
  };

  // Marking all notifications as read
  const markAllNotificationsRead = async () => {
    if (!user?.email) return;

    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.put(
        `${BASE_URL_NOTIFICATIONS}/support/notifications/mark-all-read/${user.email}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      if (response.data.status === "success") {
        AllNotifications();
        toast.success(response.data.message);
      }
    } catch (err) {
      console.error("[Notification] Error marking notifications as read:", {
        status: err.response?.status,
        message: err.message,
        details: err.response?.data?.detail || "No details",
      });
      toast.error("Failed to mark notifications as read.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    let savedAuth;
    try {
      savedAuth = JSON.parse(localStorage.getItem("auth") || "{}");
    } catch (e) {
      console.error("[Notification] Error parsing auth from localStorage:", e);
      savedAuth = {};
    }

    if (!token) {
      setError("Please log in to view notifications.");
      setConnectionStatus("Disconnected");
      return;
    }

    const loadUserAndNotifications = async () => {
      try {
        let currentUser = savedAuth.user;
        if (
          !currentUser?.email ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentUser.email)
        ) {
          const userData = await fetchUserDetails(token);
          if (!userData) {
            setError("Failed to fetch user details.");
            setConnectionStatus("Disconnected");
            return;
          }
          currentUser = userData;
        }

        setUser(currentUser);

        if (
          !currentUser?.email ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentUser.email)
        ) {
          setNotifications([]);
          setError("Notifications are only available for valid agent emails.");
          return;
        }

        if (isInitialized.current) {
          //
          return;
        }

        localStorage.removeItem(`notifications_${currentUser.email}`);
        setNotifications([]);

        await NotificationService.initialize(currentUser.email, token);
        isInitialized.current = true;

        const supportRequestCallback = (notification) => {
          try {
            if (notification?.ticket_number) {
              const status = (notification.status || "initiated").toLowerCase();
              const shouldAttachAgent =
                status === "agent_engaged" ||
                notification.notification_type === "transfer";
              upsertTickets({
                ticket_number: notification.ticket_number,
                name: notification.name,
                email: notification.email,
                mobile: notification.mobile,
                issue_description: notification.issue_description,
                agent_email: shouldAttachAgent
                  ? notification.agent_email
                  : null,
                status: notification.status || "initiated",
                site_id: notification.site_id,
                created_at: notification.created_at || notification.timestamp,
              });
            }

            setNotifications((prev) => {
              if (
                notification.ticket_number &&
                prev.some(
                  (n) =>
                    n.ticket_number === notification.ticket_number &&
                    n.message === notification.message,
                )
              ) {
                return prev;
              }

              let icon, iconStyle, text;
              if (notification.notification_type === "transfer") {
                icon = "user-switch";
                iconStyle = "bg-success";
                text = `ASSIGNED: Ticket ${notification.ticket_number} transferred to you`;
              } else if (
                notification.notification_type === "general" &&
                notification.message
                  ?.toLowerCase()
                  .includes("conversation closed")
              ) {
                icon = "check-circle";
                iconStyle = "bg-info";
                text = `CLOSED: Ticket ${notification.ticket_number} closed`;
              } else if (
                notification.message?.toLowerCase().includes("handoff")
              ) {
                icon = "user";
                iconStyle = "bg-primary";
                text = notification.message;
              } else if (
                notification.message?.toLowerCase().includes("joined the chat")
              ) {
                icon = "user-plus";
                iconStyle = "bg-success";
                text = notification.message;
              } else {
                icon = "bell";
                iconStyle = "bg-warning";
                text =
                  notification.message ||
                  `New support request: ${notification.ticket_number}`;
              }

              const newNotification = {
                id: notification.id,
                icon,
                iconStyle,
                text,
                timestamp: notification.timestamp || new Date().toISOString(),
                type: "agent",
                ticket_number: notification.ticket_number,
                name: notification.name,
                email: notification.email,
                issue_description: notification.issue_description,
                site_name: notification.site_name,
                isRead: notification.is_read || false,
              };

              const updated = [
                newNotification,
                ...prev.filter((n) => n.id !== notification.id),
              ].slice(0, 50);
              localStorage.setItem(
                `notifications_${currentUser.email}`,
                JSON.stringify(updated),
              );
              return updated.slice(0, 5);
            });
          } catch (e) {
            console.warn("[Notification] Failed to process notification:", e);
          }
        };
        NotificationService.subscribe(
          "realtime_notification",
          supportRequestCallback,
        );

        const connectionCallback = (data) => {
          setConnectionStatus(data.status);
        };
        NotificationService.subscribe("connection", connectionCallback);

        const errorCallback = (error) => {
          setError(
            error.message ===
              "Unable to connect to notifications. Check console for details."
              ? "Notification service unavailable."
              : error.message,
          );
        };
        NotificationService.subscribe("error", errorCallback);

        return () => {
          NotificationService.unsubscribe(
            "realtime_notification",
            supportRequestCallback,
          );
          NotificationService.unsubscribe("connection", connectionCallback);
          NotificationService.unsubscribe("error", errorCallback);
          if (isInitialized.current) {
            NotificationService.close();
            isInitialized.current = false;
          }
        };
      } catch (err) {
        console.error("[Notification] Load error:", err);
        setError("Failed to load notifications. Please try again.");
        setConnectionStatus("Disconnected");
      }
    };

    loadUserAndNotifications();
  }, []);

  //  const AllNotifications = async () => {
  //     if (!user?.email) return;

  //     try {
  //       const token = localStorage.getItem("accessToken");
  //       const response = await axios.get(
  //         `${BASE_URL_NOTIFICATIONS}/support/notifications/unread/${user.email}`,
  //         {},
  //         {
  //           headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  //         }
  //       );

  //       const unreadNotifications = response?.data?.notifications;
  //       setNotifications(unreadNotifications);

  //     //   if (response.data.status ===200) {
  //     //  console.log(response,'response')
  //     //     setNotifications((prev) =>
  //     //       prev.map((notification) => ({
  //     //         ...notification,
  //     //         isRead: false,
  //     //       }))
  //     //     );

  //     //     localStorage.setItem(
  //     //       `notifications_${user.email}`,
  //     //       JSON.stringify(
  //     //         notifications.map((notification) => ({
  //     //           ...notification,
  //     //           isRead: true,
  //     //         }))
  //     //       )
  //     //     );
  //     //     toast.success(response.data.message);
  //     //   }
  //     } catch (err) {
  //       console.error("[Notification] Error marking notifications as read:", {
  //         status: err.response?.status,
  //         message: err.message,
  //         details: err.response?.data?.detail || "No details",
  //       });
  //       toast.error("Failed to mark notifications as read.");
  //     }
  //   };

  //   useEffect(()=>{
  //     AllNotifications()
  //   },[])

  // Clearing all notifications
  const clearNotifications = () => {
    setNotifications([]);
    localStorage.setItem(`notifications_${user?.email}`, "[]");
  };

  // Rendering notification dropdown
  return (
    <>
      <UncontrolledDropdown className="text-center">
        <DropdownToggle tag="a" className="dropdown-toggle nk-quick-nav-icon">
          <div
            className={`icon-status icon-status-${connectionStatus === "Connected" ? "success" : "danger"}`}
          >
            <Icon name="bell" />
            {notifications.length > 0 && (
              <span className="badge badge-dot badge-danger"></span>
            )}
          </div>
        </DropdownToggle>
        <DropdownMenu end className="dropdown-menu-xl dropdown-menu-s1">
          <div className="dropdown-head">
            <span className="sub-title nk-dropdown-title">{title}</span>
            {notifications.length > 0 && (
              <div>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    clearNotifications();
                  }}
                  className="me-2"
                >
                  Clear All
                </a>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllNotificationsRead();
                  }}
                >
                  Mark All as Read
                </a>
              </div>
            )}
          </div>
          <div className="dropdown-body">
            <div className="nk-notification">
              {error && (
                <div className="nk-notification-item p-2">
                  <div className="nk-notification-content">
                    <div className="nk-notification-text text-danger">
                      {error}
                    </div>
                  </div>
                </div>
              )}
              {!error && notifications.length > 0
                ? notifications.map((item) => (
                    <NotificationItem
                      key={item.id}
                      id={item.id}
                      icon={item.icon}
                      iconStyle={item.iconStyle}
                      text={item.text}
                      message={item?.message}
                      time={item.time}
                      timestamp={item.timestamp || item?.created_at}
                      type={item.type}
                      ticket_number={item.ticket_number}
                      name={item.name}
                      email={item.email}
                      issue_description={item.issue_description}
                      site_name={item.site_name}
                      isRead={item.isRead}
                      onMarkAsRead={markNotificationAsRead}
                    />
                  ))
                : !error && (
                    <div className="nk-notification-item p-2">
                      <div className="nk-notification-content">
                        <div className="nk-notification-text">
                          No new notifications
                        </div>
                      </div>
                    </div>
                  )}
            </div>
          </div>
          <div className="dropdown-footer text-center my-2">
            <NavLink to="/unread-notifications">View unread</NavLink>
          </div>
        </DropdownMenu>
      </UncontrolledDropdown>
    </>
  );
};

export default Notification;
