self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "School Portal";
  const options = {
    body: data.message || "You have a new school notification.",
    data: { url: data.url || "/" },
    tag: data.type || "school-notification"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const notificationUrl = (event.notification.data && event.notification.data.url) || "/";
  const requestedUrl = new URL(notificationUrl, self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin
    ? requestedUrl.href
    : new URL("/", self.location.origin).href;

  event.waitUntil(clients.openWindow(targetUrl));
});