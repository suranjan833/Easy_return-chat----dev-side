import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import './NotificationPage.css';
import Icon from "@/components/icon/Icon";

const BASE_URL_NOTIFICATIONS = "https://supportdesk.fskindia.com";
const BASE_URL_SITES = "https://chatsupport.fskindia.com";

const formatDateTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toUpperCase();
  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).split("/").join("/")}, ${timeStr}`;
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [siteNames, setSiteNames] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const itemsPerPage = 10;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const savedAuth = JSON.parse(localStorage.getItem("auth") || "{}");
      const email = savedAuth?.user?.email;

      if (!token || !email) {
        setError("Please log in to view notifications.");
        return;
      }

      const response = await axios.get(
        `${BASE_URL_NOTIFICATIONS}/support/notifications/unread/${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }
      );

      const notificationsData = response.data.notifications || [];
      setNotifications(notificationsData);
      setUnreadCount(response.data.unread_count || 0);

      // Fetch site names for unique site IDs
      const uniqueSiteIds = [...new Set(notificationsData.map(n => n.site_id))];
      const siteNamePromises = uniqueSiteIds.map(async (siteId) => {
        try {
          const siteResponse = await axios.get(
            `${BASE_URL_SITES}/sites/${siteId}`,
            {
              headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
            }
          );
          return { siteId, domain: siteResponse.data.domain };
        } catch (err) {
          console.error(`[NotificationsPage] Error fetching site ${siteId}:`, err);
          return { siteId, domain: `Site ${siteId}` };
        }
      });

      const siteResults = await Promise.all(siteNamePromises);
      const siteNameMap = siteResults.reduce((acc, { siteId, domain }) => ({
        ...acc,
        [siteId]: domain,
      }), {});
      setSiteNames(siteNameMap);
    } catch (err) {
      console.error("[NotificationsPage] Error fetching notifications:", {
        status: err.response?.status,
        message: err.message,
        details: err.response?.data?.detail || "No details",
      });
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(
        `${BASE_URL_NOTIFICATIONS}/support/notifications/mark-read/${notificationId}`,
        { is_read: true },
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        }
      );

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount((prev) => prev - 1);
      toast.success("Notification marked as read.");
    } catch (err) {
      console.error("[NotificationsPage] Error marking notification as read:", {
        status: err.response?.status,
        message: err.message,
        details: err.response?.data?.detail || "No details",
      });
      toast.error("Failed to mark notification as read.");
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotifications = notifications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(notifications.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="container mx-auto mt-4 px-4 py-8">
      <h2 className="text-2xl font-bold mb-4 mt-4">Notifications ({unreadCount} Unread)</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      )}

   {!loading && !error && (
        <>
          <div className="shadow-md rounded-lg w-full">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Icon</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket Number</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentNotifications.length > 0 ? (
                  currentNotifications.map((notification) => {
                    let icon, iconStyle;
                    if (notification.message?.toLowerCase().includes("transferred")) {
                      icon = "user-switch";
                      iconStyle = "bg-success";
                    } else if (notification.message?.toLowerCase().includes("conversation closed")) {
                      icon = "check-circle";
                      iconStyle = "bg-info";
                    } else if (notification.message?.toLowerCase().includes("handoff")) {
                      icon = "user";
                      iconStyle = "bg-primary";
                    } else {
                      icon = "bell";
                      iconStyle = "bg-warning";
                    }

                    return (
                      <tr
                        key={notification.id}
                        className={`hover:bg-gray-50 ${notification.isRead ? 'bg-gray-100' : ''}`}
                        onClick={() => {
                          if (notification.ticket_number) {
                            navigate(`/support-chat/${notification.ticket_number}`);
                          }
                        }}
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          <Icon name={icon} className={`icon-circle ${iconStyle}`} />
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{notification.ticket_number}</td>
                        <td className="px-4 py-4 text-sm text-gray-500">{notification.message}</td>
                        <td className="px-4 py-4 text-sm text-gray-500">{formatDateTime(notification.created_at)}</td>
                        <td className="px-4 py-4 text-sm text-gray-500">{siteNames[notification.site_id] || `Site ${notification.site_id}`}</td>
                        <td className="px-4 py-4 text-sm">
                          {!notification.isRead && (
                            <button
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              onClick={(e) => {
                                e.stopPropagation();
                                markNotificationAsRead(notification.id);
                              }}
                            >
                              Mark as Read
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-center text-sm text-gray-500">
                      No notifications available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center mt-6" >
              <ul className="flex flex-nowrap items-center -space-x-px overflow-x-auto">
                <li>
                  <button
                    className={`px-4 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 ${currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''}`}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                {[...Array(totalPages).keys()].map((page) => (
                  <li key={page + 1}>
                    <button
                      className={`px-4 py-2 leading-tight border border-gray-300 hover:bg-gray-100 hover:text-gray-700 ${currentPage === page + 1 ? 'bg-blue-50 text-blue-600 border-blue-300' : 'bg-white text-gray-500'}`}
                      onClick={() => handlePageChange(page + 1)}
                    >
                      {page + 1}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    className={`px-4 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 ${currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''}`}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
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
  );
};

export default NotificationsPage;
