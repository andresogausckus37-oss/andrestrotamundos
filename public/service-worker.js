self.addEventListener("push", (event) => {
  const datos = event.data
    ? event.data.json()
    : {};

  const titulo =
    datos.titulo || "Andrés Imprimibles";

  const opciones = {
    body:
      datos.mensaje ||
      "Nueva actividad en la web",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: "nueva-visita",
    renotify: true,
    data: {
      url: datos.url || "/",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      titulo,
      opciones
    )
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const url =
      event.notification.data?.url || "/";

    event.waitUntil(
      clients.openWindow(url)
    );
  }
);