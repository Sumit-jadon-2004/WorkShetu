

/**
 * Push Notification Utility for WorkShetu
 * Supports browser notifications and prepared architecture for FCM Web Push.
 */

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn("Notification permission request failed:", err);
      return "denied";
    }
  }

  return Notification.permission;
}

export function showBrowserNotification(title, options = {}) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: options.tag || "workshetu-booking",
        ...options,
      });

      if (options.url) {
        notification.onclick = () => {
          window.focus();
          window.location.href = options.url;
        };
      }

      return notification;
    } catch (err) {
      console.warn("Failed to display notification:", err);
    }
  }

  return null;
}
