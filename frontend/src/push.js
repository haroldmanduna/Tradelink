// Web Push helpers (service worker registration + subscribe/unsubscribe).
import { api } from './api.js';

let swReg = null;

export function pushSupported() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

// Register the service worker once (safe to call on every app load).
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swReg = await navigator.serviceWorker.register('/sw.js');
    return swReg;
  } catch (e) {
    console.warn('SW registration failed:', e.message);
    return null;
  }
}

export function permissionState() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Ask permission + subscribe this device. Returns { ok, reason }.
export async function enablePush() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };
  try {
    const { vapidPublicKey } = await api.get('/meta/config');
    if (!vapidPublicKey) return { ok: false, reason: 'not-configured' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: permission };

    const reg = swReg || await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    await api.post('/push/subscribe', { subscription: sub.toJSON() });
    return { ok: true };
  } catch (e) {
    console.warn('enablePush failed:', e.message);
    return { ok: false, reason: 'error' };
  }
}

export async function disablePush() {
  try {
    const reg = swReg || await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
    return { ok: true };
  } catch (e) { return { ok: false }; }
}
