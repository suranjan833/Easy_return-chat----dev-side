import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const WS_BASE_URL = "wss://supportdesk.fskindia.com";
const BASE_URL_NOTIFY = "https://supportdesk.fskindia.com";
const SITES_API = "https://chatsupport.fskindia.com/sites/";
const DEPARTMENTS_API = `${BASE_URL_NOTIFY}/support-messages/departments`;

class NotificationService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.token = null;
    this.email = null;
    this.siteId = null;
    this.apiKey = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.generatedIds = new Set();
    this.ticketNumbers = new Set();
    this.isConnecting = false;
    this.siteCache = new Map();
    this.departmentCache = new Map();
    this.ticketCache = new Map();
    this.pendingTicketFetches = new Map();
    this.lastNotificationTime = 0;
    this.notificationCooldown = 1000;
    this.lastMessageHash = null; // To store the hash of the last processed message
    this.seenNotificationIds = new Set(); // To store IDs of seen unread_notification messages
    this.navigateCallback = null; // Callback for client-side navigation
  }

  // Utility to generate a simple hash for message data
  _generateMessageHash(data) {
    return JSON.stringify(data); // Simple stringify for hashing
  }

  async fetchTicketDetails(ticketNumber, retries = 5, delay = 5000) {
    if (!ticketNumber) {
      console.warn(
        "[NotificationService] No ticketNumber provided for fetchTicketDetails",
      );
      return null;
    }
    if (this.ticketCache.has(ticketNumber)) {
      return this.ticketCache.get(ticketNumber);
    }
    if (this.pendingTicketFetches.has(ticketNumber)) {
      return this.pendingTicketFetches.get(ticketNumber);
    }
    const fetchPromise = (async () => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await axios.get(
            `${BASE_URL_NOTIFY}/support-messages/support_requests`,
            {
              headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/json",
                "x-api-key": this.apiKey,
              },
            },
          );
          const tickets = Array.isArray(response.data)
            ? response.data
            : [response.data];
          const ticket = tickets.find((t) => t.ticket_number === ticketNumber);
          if (!ticket) {
            if (attempt === retries) {
              console.warn(
                `[NotificationService] No ticket found for ticket_number ${ticketNumber} after ${retries} attempts`,
              );
              return null;
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          this.ticketCache.set(ticket.ticket_number, ticket);
          return ticket;
        } catch (err) {
          console.error(
            `[NotificationService] Error fetching ticket details for ticket_number ${ticketNumber}, attempt ${attempt}/${retries}:`,
            {
              status: err.response?.status,
              message: err.message,
              details: err.response?.data?.detail || "No details",
            },
          );
          if (attempt === retries) return null;
          await new Promise((resolve) => setTimeout(resolve, delay));
        } finally {
          this.pendingTicketFetches.delete(ticketNumber);
        }
      }
      return null;
    })();
    this.pendingTicketFetches.set(ticketNumber, fetchPromise);
    return fetchPromise;
  }

  async fetchSiteName(site_id, retries = 3, delay = 2000) {
    if (!site_id) {
      console.warn(
        `[NotificationService] No site_id provided, cannot fetch site name`,
      );
      return "Unknown Site";
    }
    if (this.siteCache.has(site_id)) {
      return this.siteCache.get(site_id);
    }
    if (!this.token) {
      console.warn(
        `[NotificationService] No token provided, cannot fetch site name for site_id ${site_id}`,
      );
      return "Unknown Site";
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(`${SITES_API}${site_id}`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/json",
          },
        });
        const siteName = response.data?.domain || "Unknown Site";
        this.siteCache.set(site_id, siteName);
        return siteName;
      } catch (err) {
        if (attempt === retries) {
          console.warn(
            `[NotificationService] Max retries reached for site_id ${site_id}, returning Unknown Site`,
          );
          return "Unknown Site";
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return "Unknown Site";
  }

  async fetchDepartmentName(departmentId) {
    if (this.departmentCache.has(departmentId)) {
      return this.departmentCache.get(departmentId);
    }
    if (!this.apiKey) {
      return "Unknown Department";
    }
    try {
      const response = await axios.get(`${DEPARTMENTS_API}?skip=0&limit=100`, {
        headers: { "x-api-key": this.apiKey },
      });
      const departments = Array.isArray(response.data)
        ? response.data
        : [response.data];
      const department = departments.find(
        (d) => d.id === parseInt(departmentId),
      );
      const departmentName = department?.name || "Unknown Department";
      this.departmentCache.set(departmentId, departmentName);
      return departmentName;
    } catch (err) {
      console.error(
        `[NotificationService] Error fetching department name for department_id ${departmentId}:`,
        {
          status: err.response?.status,
          message: err.message,
          details: err.response?.data?.detail || "No details",
        },
      );
      return "Unknown Department";
    }
  }

  async requestNotificationPermission() {
    if (!("Notification" in window)) {
      console.warn(
        "[NotificationService] Browser does not support notifications",
      );
      return false;
    }
    if (Notification.permission === "granted") {
      //
      return true;
    }
    try {
      const permission = await Notification.requestPermission();
      // console.log(`[NotificationService] Notification permission requested: ${permission}`);
      return permission === "granted";
    } catch (err) {
      // console.error("[NotificationService] Error requesting notification permission:", err);
      return false;
    }
  }

  async showBrowserNotification(data, skipFetchTicketDetails = false) {
    if (!("Notification" in window)) {
      console.warn(
        "[NotificationService] Browser does not support notifications",
      );
      return;
    }
    if (Notification.permission !== "granted") {
      console.warn(
        "[NotificationService] Notifications not permitted, permission:",
        Notification.permission,
      );
      const permission = await this.requestNotificationPermission();
      if (!permission) {
        console.warn(
          "[NotificationService] Notification permission denied after re-request",
        );
        return;
      }
    }

    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return;
    }

    try {
      let ticketDetails = { ...data };
      if (data.ticket_number && !skipFetchTicketDetails) {
        const fetchedTicket = await this.fetchTicketDetails(data.ticket_number);
        if (!fetchedTicket) {
          return;
        }
        ticketDetails = { ...data, ...fetchedTicket };
      }

      const siteName = ticketDetails.site_id
        ? await this.fetchSiteName(ticketDetails.site_id)
        : ticketDetails.site_name || "Unknown Site";

      const maxDescriptionLength = 100;
      const truncatedDescription =
        ticketDetails.issue_description &&
        ticketDetails.issue_description.length > maxDescriptionLength
          ? ticketDetails.issue_description.substring(0, maxDescriptionLength) +
            "..."
          : ticketDetails.issue_description || "No description provided";

      let title;
      if (ticketDetails.notification_type === "transfer") {
        title = `ASSIGNED: New ticket transferred to you - ${ticketDetails.ticket_number}`;
      } else if (
        ticketDetails.notification_type === "general" &&
        ticketDetails.message?.toLowerCase().includes("conversation closed")
      ) {
        title = `CLOSED: Ticket ${ticketDetails.ticket_number} closed`;
      } else if (
        ticketDetails.status === "closed" ||
        ticketDetails.status === "resolved"
      ) {
        title = `Ticket ${ticketDetails.status.charAt(0).toUpperCase() + ticketDetails.status.slice(1)}`;
      } else if (
        ticketDetails.status === "agent_engaged" ||
        ticketDetails.message?.toLowerCase().includes("handoff")
      ) {
        title = "Agent Handoff Request";
      } else {
        title = `New Support Request from ${ticketDetails.name || "User"}`;
      }

      const appOrigin =
        typeof window !== "undefined" &&
        window.location &&
        window.location.origin
          ? window.location.origin
          : "";
      const targetUrl = `${appOrigin}/support-chat/${ticketDetails.ticket_number || ""}`;
      const options = {
        body:
          ticketDetails.notification_type === "general" &&
          ticketDetails.message?.toLowerCase().includes("conversation closed")
            ? `Ticket ${ticketDetails.ticket_number} has been closed.\nSite: ${siteName}`
            : `Name: ${ticketDetails.name || "Unknown User"}\nEmail: ${ticketDetails.email || "Unknown Email"}\nSite: ${siteName}\nDescription: ${truncatedDescription}\nPriority: ${ticketDetails.priority || "medium"}`,
        icon: "/image1.png",
        data: {
          url: targetUrl,
        },
      };

      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;

          await registration.showNotification(title, options);
          navigator.serviceWorker.addEventListener("message", (event) => {
            const msg = event.data || {};
            if (
              (msg.type === "notificationclick" || msg.action === "navigate") &&
              msg.url
            ) {
              window.focus();
              if (this.navigateCallback) {
                this.navigateCallback(msg.url);
              } else if (window.location.href !== msg.url) {
                window.location.assign(msg.url);
              }
            }
          });
        } catch (swErr) {
          console.error(
            "[NotificationService] Service worker notification error:",
            swErr,
          );
          const notification = new Notification(title, options);
          notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            if (this.navigateCallback) {
              this.navigateCallback(options.data.url);
            } else if (window.location.href !== options.data.url) {
              window.location.assign(options.data.url);
            }
          };
        }
      } else {
        console.warn(
          "[NotificationService] Service workers not supported, using Notification API",
        );
        const notification = new Notification(title, options);
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          if (this.navigateCallback) {
            this.navigateCallback(options.data.url);
          } else if (window.location.href !== options.data.url) {
            window.location.assign(options.data.url);
          }
        };
      }

      if (ticketDetails.ticket_number) {
        this.ticketNumbers.add(ticketDetails.ticket_number);
        this.saveTicketNumbersToStorage();
        this.lastNotificationTime = now;
      }
    } catch (err) {
      console.error(
        "[NotificationService] Error showing browser notification:",
        err,
      );
    }
  }

  loadTicketNumbersFromStorage() {
    try {
      const stored = localStorage.getItem(`seen_ticket_numbers_${this.email}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.ticketNumbers = new Set(parsed);
        } else {
          console.warn(
            "[NotificationService] Invalid seen ticket numbers in localStorage, resetting",
          );
          this.ticketNumbers = new Set();
          localStorage.setItem(
            `seen_ticket_numbers_${this.email}`,
            JSON.stringify([]),
          );
        }
      } else {
        this.ticketNumbers = new Set();
        localStorage.setItem(
          `seen_ticket_numbers_${this.email}`,
          JSON.stringify([]),
        );
      }
    } catch (err) {
      console.error(
        "[NotificationService] Error loading seen ticket numbers from localStorage:",
        err,
      );
      this.ticketNumbers = new Set();
      localStorage.setItem(
        `seen_ticket_numbers_${this.email}`,
        JSON.stringify([]),
      );
    }
  }

  saveTicketNumbersToStorage() {
    try {
      const ticketNumbersArray = Array.from(this.ticketNumbers);
      const limitedTickets = ticketNumbersArray.slice(-1000);
      localStorage.setItem(
        `seen_ticket_numbers_${this.email}`,
        JSON.stringify(limitedTickets),
      );
    } catch (err) {
      console.error(
        "[NotificationService] Error saving seen ticket numbers to localStorage:",
        err,
      );
    }
  }

  async initialize(
    email,
    token,
    siteId = "10",
    apiKey = null,
    navigateCallback = null,
  ) {
    if (!token || !email) {
      console.error("[NotificationService] Invalid email or token:", {
        email,
        token: token ? "Set" : "Unset",
      });
      throw new Error("Invalid email or token provided");
    }
    if (!siteId) {
      console.error("[NotificationService] Invalid site_id:", siteId);
      throw new Error("Invalid site_id provided");
    }

    this.close();
    this.email = email;
    this.token = token;
    this.siteId = siteId;
    this.apiKey = apiKey;
    this.navigateCallback = navigateCallback; // Store the navigation callback
    localStorage.removeItem(`notifications_${email}`);
    localStorage.setItem("site_id", siteId);

    this.loadTicketNumbersFromStorage();

    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        // console.log("[NotificationService] Service worker registered:", registration.scope);
      } catch (err) {
        // console.error("[NotificationService] Service worker registration failed:", err);
      }
    } else {
      console.warn(
        "[NotificationService] Service workers not supported in this browser",
      );
    }

    const permissionGranted = await this.requestNotificationPermission();
    if (!permissionGranted) {
      console.warn(
        "[NotificationService] Notification permission not granted, notifications will not be shown",
      );
    }

    this.connectWebSocket();
  }

  connectWebSocket() {
    // Prevent multiple connection attempts
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.CONNECTING)
    ) {
      //
      return;
    }

    // Reuse existing WebSocket if it is open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      //
      return;
    }

    // Close existing WebSocket if not already closed
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      //
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = true;
    // Removed problematic console.log that accessed this.ws.readyState before assignment
    this.ws = new WebSocket(
      `${WS_BASE_URL}/support/ws/notifications/${encodeURIComponent(this.email)}`,
    );

    this.ws.onopen = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Ensure ws is not null and is open
        // console.log(`[NotificationService] WebSocket opened for ${this.email}`);
        this.ws.send(JSON.stringify({ token: this.token }));
        this.notifySubscribers("connection", { status: "Connected" });
        this.retryCount = 0;
        this.isConnecting = false;
      } else {
        console.error(
          "[NotificationService] WebSocket is not open or is null in onopen handler. Cannot send token.",
        );
        this.isConnecting = false; // Reset connection flag
        this.notifySubscribers("error", {
          message:
            "WebSocket connection failed to establish or was closed prematurely.",
        });
      }
    };

    this.ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        const currentMessageHash = this._generateMessageHash(data);
        if (currentMessageHash === this.lastMessageHash) {
          return;
        }
        this.lastMessageHash = currentMessageHash;

        if (data.agent_email && data.agent_email !== this.email) {
          // console.log(`[NotificationService] Skipping notification: agent_email=${data.agent_email}, expected=${this.email}`);
          return;
        }
        const isAgentJoin =
          data.message_type === "notification" &&
          data.message?.toLowerCase().includes("has joined ticket");
        const isTransfer = data.notification_type === "transfer";
        const isTicketClosed =
          data.notification_type === "general" &&
          data.message?.toLowerCase().includes("conversation closed");
        const isUnreadNotification = data.type === "unread_notification"; // New flag to identify unread_notification type

        // Check for duplicate unread_notification messages
        if (isUnreadNotification && data.notification_id) {
          if (this.seenNotificationIds.has(data.notification_id)) {
            // console.log(`[NotificationService] Skipping duplicate unread_notification with ID: ${data.notification_id}`);
            return;
          }
          this.seenNotificationIds.add(data.notification_id);
        }

        // Allow "has joined" notifications even if ticket_number is already seen
        if (
          data.ticket_number &&
          this.ticketNumbers.has(data.ticket_number) &&
          !isAgentJoin &&
          !isTransfer &&
          !isTicketClosed
        ) {
          // console.log(`[NotificationService] Skipping duplicate ticket_number: ${data.ticket_number}`);
          return;
        }

        const messageTime = new Date(
          data.datetime || data.timestamp || Date.now(),
        ).getTime();
        const now = Date.now();
        if (now - messageTime > 5 * 60 * 1000) {
          // console.log(`[NotificationService] Skipping outdated notification: ${data.ticket_number}`);
          return;
        }

        const id = uuidv4();
        if (this.generatedIds.has(id)) {
          // console.warn(`[NotificationService] Duplicate ID detected: ${id}`);
          return;
        }
        this.generatedIds.add(id);

        let notificationData = {
          id,
          ticket_number: data.ticket_number,
          agent_email: data.agent_email || this.email,
          message: data.message || "New support request",
          timestamp:
            data.datetime || data.timestamp || new Date().toISOString(),
          priority: data.priority || "medium",
          issue_description:
            data.issue_description || "No description provided",
          status: data.status || "initiated",
          created_at:
            data.created_at || data.datetime || new Date().toISOString(),
          site_id: data.site_id || this.siteId,
          name: data.name || "Unknown User",
          email: data.email || "Unknown Email",
          mobile: data.mobile || "Unknown Mobile",
          site_name: data.site_name || "Unknown Site",
          notification_type: data.notification_type || "general",
          is_read: data.is_read || false,
        };

        if (data.ticket_number && !isTicketClosed && !isAgentJoin) {
          const ticketDetails = await this.fetchTicketDetails(
            data.ticket_number,
          );
          if (ticketDetails) {
            notificationData = {
              ...notificationData,
              name: ticketDetails.name || notificationData.name,
              email: ticketDetails.email || notificationData.email,
              mobile: ticketDetails.mobile || notificationData.mobile,
              issue_description:
                ticketDetails.issue_description ||
                notificationData.issue_description,
              site_id: ticketDetails.site_id || notificationData.site_id,
              status: ticketDetails.status || notificationData.status,
              created_at:
                ticketDetails.created_at || notificationData.created_at,
              site_name: ticketDetails.site_name || notificationData.site_name,
            };
          }
        }

        // console.log("[NotificationService] Processing notification:", notificationData);

        // Show browser notification for join, transfer, or ticket closed events
        // Prevent browser notification for unread_notification type that is also a ticket closed event
        if (
          (isAgentJoin || isTransfer || isTicketClosed) &&
          !(isUnreadNotification && isTicketClosed)
        ) {
          await this.showBrowserNotification(notificationData, true);
        } else if (!isUnreadNotification) {
          // Only show general notifications if not an unread_notification type
          await this.showBrowserNotification(notificationData);
        } else {
        }

        // Notify subscribers (for in-app notification panel)
        this.notifySubscribers("realtime_notification", notificationData);

        if (data.ticket_number) {
          this.ticketNumbers.add(data.ticket_number);
          this.saveTicketNumbersToStorage();
        }
      } catch (err) {
        console.error(
          "[NotificationService] WebSocket message parsing error:",
          err,
          { rawData: event.data },
        );
        this.notifySubscribers("error", {
          message: "Invalid notification received.",
        });
      }
    };

    this.ws.onclose = (event) => {
      // console.log(`[NotificationService] WebSocket closed: Code ${event.code}, Reason: ${event.reason || "Unknown"}`);
      this.notifySubscribers("connection", { status: "Disconnected" });
      this.isConnecting = false;
      this.ws = null;
      if (this.retryCount < this.maxRetries) {
        const delay = Math.min(5000 * Math.pow(2, this.retryCount), 30000);

        setTimeout(() => {
          if (
            !this.isConnecting &&
            (!this.ws || this.ws.readyState === WebSocket.CLOSED)
          ) {
            this.retryCount++;
            this.connectWebSocket();
          } else {
          }
        }, delay);
      } else {
        console.warn(
          "[NotificationService] Max WebSocket retry attempts reached.",
        );
        this.notifySubscribers("error", {
          message: "Unable to connect to notifications.",
        });
      }
    };

    this.ws.onerror = (event) => {
      console.error("[NotificationService] WebSocket error:", {
        event,
        url: this.ws.url,
        token: this.token ? `Set (Length: ${this.token.length})` : "Unset",
        email: this.email,
        siteId: this.siteId,
        readyState: this.ws ? this.ws.readyState : "Unknown",
      });
      this.notifySubscribers("error", {
        message:
          "Unable to connect to notifications. Check console for details.",
      });
      this.isConnecting = false;
      this.ws = null;
    };
  }

  async fetchTickets() {
    try {
      const response = await axios.get(`${BASE_URL_NOTIFY}/support/tickets`, {
        params: { agent_email: this.email, site_id: this.siteId },
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
        },
      });
      if (!Array.isArray(response.data)) {
        throw new Error("Expected an array of tickets");
      }
      const activeTickets = response.data.filter(
        (ticket) =>
          ticket.status === "initiated" || ticket.status === "agent_engaged",
      );
      return Promise.all(
        activeTickets.map(async (ticket) => {
          const siteName = ticket.site_id
            ? await this.fetchSiteName(ticket.site_id)
            : ticket.site_name || "Unknown Site";
          const departmentName =
            ticket.department_id && this.apiKey
              ? await this.fetchDepartmentName(ticket.department_id)
              : ticket.department_name || "Unknown Department";
          return {
            ticket_number: ticket.ticket_number,
            websocket_url: ticket.websocket_url,
            agent_email: ticket.agent_email,
            token: ticket.token,
            priority: ticket.priority || "medium",
            issue_description:
              ticket.issue_description || "No description provided",
            status: ticket.status || "initiated",
            created_at: ticket.created_at || new Date().toISOString(),
            site_id: ticket.site_id,
            name: ticket.name,
            email: ticket.email,
            mobile: ticket.mobile,
            site_name: siteName,
            department_name: departmentName,
          };
        }),
      );
    } catch (err) {
      console.error("[NotificationService] Fetch tickets error:", {
        status: err.response?.status,
        message: err.message,
        details: err.response?.data?.detail || "No details",
      });
      if (err.response?.status === 401) {
        this.notifySubscribers("error", {
          message: "Session expired. Please log in again.",
        });
      } else if (err.response?.status === 404) {
        this.notifySubscribers("error", {
          message: "Ticket endpoint not found. Contact support.",
        });
      }
      return [];
    }
  }

  subscribe(type, callback) {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type).push(callback);
  }

  unsubscribe(type, callback) {
    const callbacks = this.subscribers.get(type) || [];
    this.subscribers.set(
      type,
      callbacks.filter((cb) => cb !== callback),
    );
  }

  notifySubscribers(type, data) {
    const callbacks = this.subscribers.get(type) || [];
    callbacks.forEach((cb) => cb(data));
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.generatedIds.clear();
    this.ticketNumbers.clear();
    this.isConnecting = false;
    this.siteId = null;
    this.apiKey = null;
    this.siteCache.clear();
    this.departmentCache.clear();
    this.ticketCache.clear();
    this.pendingTicketFetches.clear();
    this.lastNotificationTime = 0;
    this.seenNotificationIds.clear(); // Clear seen notification IDs on close
    this.navigateCallback = null; // Clear navigation callback on close
  }
}

export default new NotificationService();
