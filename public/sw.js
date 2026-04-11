self.addEventListener("push", (event) => {

  const data = event.data ? event.data.json() : {};
  
  let title;
  if (data.notification_type === "transfer") {
    title = `ASSIGNED: New ticket transferred to you - ${data.ticket_number}`;
  } else if (data.notification_type === "general" && data.message?.toLowerCase().includes("conversation closed")) {
    title = `CLOSED: Ticket ${data.ticket_number} closed`;
  } else if (data.status === "closed" || data.status === "resolved") {
    title = `Ticket ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`;
  } else if (data.status === "agent_engaged" || data.message?.toLowerCase().includes("handoff")) {
    title = "Agent Handoff Request";
  } else {
    title = `New Support Request from ${data.name || "User"}`;
  }
  
  const maxDescriptionLength = 100;
  const truncatedDescription = data.issue_description && data.issue_description.length > maxDescriptionLength
    ? data.issue_description.substring(0, maxDescriptionLength) + "..."
    : data.issue_description || "No description provided";
  
  const origin = (self.location && self.location.origin) || new URL(self.registration.scope).origin;
  const targetUrl = `${origin}/support-chat/${data.ticket_number || ""}`;
  const options = {
    body: data.notification_type === "general" && data.message?.toLowerCase().includes("conversation closed")
      ? `Ticket ${data.ticket_number} has been closed.\nSite: ${data.site_name || "Unknown Site"}`
      : `Name: ${data.name || "Unknown User"}\nEmail: ${data.email || "Unknown Email"}\nSite: ${data.site_name || "Unknown Site"}\nDescription: ${truncatedDescription}\nPriority: ${data.priority || "medium"}`,
    icon: "/image1.png",
    data: {
      url: targetUrl,
    },
  };
  

  event.waitUntil(self.registration.showNotification(title, options));
});

// Ensure new SW takes control of existing clients immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("notificationclick", (event) => {

  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const defaultOrigin = (self.location && self.location.origin) || new URL(self.registration.scope).origin;
      const url = (event.notification && event.notification.data && event.notification.data.url) || `${defaultOrigin}/support-chat/`;

      // Prefer a visible client from the same origin
      let targetClient = clientList.find((c) => {
        try { return new URL(c.url).origin === defaultOrigin && c.visibilityState === "visible"; } catch (_) { return false; }
      });
      if (!targetClient) {
        targetClient = clientList.find((c) => {
          try { return new URL(c.url).origin === defaultOrigin; } catch (_) { return false; }
        });
      }

      if (targetClient) {
        if ("focus" in targetClient) {
          targetClient.focus();
        }
        if ("navigate" in targetClient) {
          return targetClient.navigate(url);
        }
        // Fallback: ask the client to navigate via postMessage
        targetClient.postMessage({ action: "navigate", type: "notificationclick", url });

        return undefined;
      }

      if (clients.openWindow) {

        return clients.openWindow(url);
      }
      return undefined;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && (event.data.action === "navigate" || event.data.type === "navigate")) {

    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ action: "navigate", type: "notificationclick", url: event.data.url });
      }
    });
  }
});