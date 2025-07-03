import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const situationId = event.notification.data?.situationId;
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindowToFocus = clientsArr.some((windowClient) => {
        if (windowClient.url === urlToOpen) {
          windowClient.focus();
          if (situationId) {
            windowClient.postMessage({ type: 'GOTO_SITUATION', situationId: situationId });
          }
          return true;
        }
        return false;
      });

      if (!hadWindowToFocus) {
        self.clients.openWindow(urlToOpen).then((client) => {
          if (client) {
            setTimeout(() => {
              client.postMessage({ type: 'GOTO_SITUATION', situationId: situationId });
            }, 500);
          }
        });
      }
    })
  );
});
