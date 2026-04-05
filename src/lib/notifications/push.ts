/**
 * Web Push Notification service for Teko Cash.
 *
 * Flow:
 *  1. User enables push in Settings → requestPermission() + subscribe()
 *  2. Subscription (endpoint + keys) saved to Supabase `push_subscriptions`
 *  3. On budget threshold exceeded → triggerLocalPush() (instant, no server needed)
 *  4. For background pushes → Supabase Edge Function reads subscriptions and sends via web-push
 *
 * VAPID public key must be set as VITE_VAPID_PUBLIC_KEY in .env
 */

import { supabase } from '@/lib/supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/** Returns true if the browser supports Web Push */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Current browser notification permission state */
export function getPermissionState(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Request notification permission. Returns the resulting permission state.
 * Must be called from a user gesture (button click).
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

/**
 * Subscribe this device to Web Push and persist the subscription in Supabase.
 * Requires VITE_VAPID_PUBLIC_KEY to be configured.
 * Returns the PushSubscription object, or null if it fails.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VITE_VAPID_PUBLIC_KEY not set — push subscription skipped');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const json = subscription.toJSON();
    const keys = json.keys as { p256dh: string; auth: string };

    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint!,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    }, { onConflict: 'user_id,endpoint' });

    return subscription;
  } catch (err) {
    console.error('[Push] subscribe error', err);
    return null;
  }
}

/**
 * Unsubscribe this device from Web Push and remove from Supabase.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
  } catch (err) {
    console.error('[Push] unsubscribe error', err);
  }
}

/**
 * Show an immediate local notification via the Service Worker.
 * Works even when VAPID keys are not configured — pure local push.
 */
export async function triggerLocalPush(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  if (!isPushSupported()) return;
  if (getPermissionState() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data?.tag as string | undefined,
      data: { url: data?.url ?? '/budgets', ...data },
    });
  } catch (err) {
    // Fallback: use Notification API directly
    try {
      new Notification(title, { body, icon: '/pwa-192x192.png' });
    } catch {
      console.warn('[Push] local notification failed', err);
    }
  }
}

/**
 * Check if this device is currently subscribed to push.
 */
export async function isSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}
