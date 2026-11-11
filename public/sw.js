self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Between Days", {
    body: data.body || "새 알림이 있습니다.",
    icon: "/icon.png",
    badge: "/icon.png",
    tag: data.tag || "between-days-reminder",
    data: { url: data.url || "/" }
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
    const existing = windowClients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      existing.navigate(targetUrl);
      return existing.focus();
    }
    return clients.openWindow(targetUrl);
  }));
});

