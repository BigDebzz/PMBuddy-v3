// PM Buddy — Service Worker Registration

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      if (isLocalhost) {
        checkValidServiceWorker(swUrl);
      } else {
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker.register(swUrl).then((registration) => {
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            console.log('PM Buddy updated. Refresh to see the latest version.');
          } else {
            console.log('PM Buddy is ready to work offline.');
          }
        }
      };
    };
  }).catch((error) => {
    console.error('Service worker registration failed:', error);
  });
}

function checkValidServiceWorker(swUrl) {
  fetch(swUrl, { headers: { 'Service-Worker': 'script' } }).then((response) => {
    const contentType = response.headers.get('content-type');
    if (response.status === 404 || (contentType && !contentType.includes('javascript'))) {
      navigator.serviceWorker.ready.then((registration) => registration.unregister()).then(() => window.location.reload());
    } else {
      registerValidSW(swUrl);
    }
  }).catch(() => {
    console.log('No internet connection. PM Buddy is running in offline mode.');
  });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => registration.unregister());
  }
}
