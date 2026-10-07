// Cookie choice for Google Analytics. Analytics only loads after someone presses Accept.
// Cookies that keep a person logged in are essential and do not need a choice.

const KEY = 'pmb-consent';
const GA_ID = 'G-ZFE1PC7PR0';
const EVENT = 'pmb-consent-change';

export function getConsent() {
  try { const v = localStorage.getItem(KEY); return v === 'accepted' || v === 'declined' ? v : null; } catch (e) { return null; }
}

export function setConsent(value) {
  try { localStorage.setItem(KEY, value); } catch (e) { /* storage unavailable */ }
  if (value === 'accepted') loadAnalytics();
  else removeAnalyticsCookies();
  window.dispatchEvent(new Event(EVENT));
}

export function clearConsent() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  window.dispatchEvent(new Event(EVENT));
}

export function onConsentChange(fn) {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

let loaded = false;
export function loadAnalytics() {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

// If someone declines after accepting earlier, remove the analytics cookies from this browser.
function removeAnalyticsCookies() {
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name.startsWith('_ga')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
      }
    });
  } catch (e) { /* ignore */ }
  window['ga-disable-' + GA_ID] = true;
}

// Called once when the app starts.
export function initConsent() {
  if (getConsent() === 'accepted') loadAnalytics();
}
