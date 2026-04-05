/**
 * Supabase Edge Function: send-budget-push
 *
 * Sends Web Push notifications to all subscribed devices for a user
 * when a budget threshold is exceeded.
 *
 * Expected request body:
 * {
 *   userId: string;
 *   budgetName: string;
 *   pct: number;          // percentage spent (e.g. 85 or 105)
 *   type: 'warn' | 'over';
 * }
 *
 * Required environment variables (set via Supabase Dashboard → Edge Functions):
 *   VAPID_SUBJECT      e.g. "mailto:tu@email.com"
 *   VAPID_PUBLIC_KEY   Base64url-encoded public VAPID key
 *   VAPID_PRIVATE_KEY  Base64url-encoded private VAPID key
 *
 * Deploy:
 *   supabase functions deploy send-budget-push --no-verify-jwt
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@tekocash.app';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

// ─── VAPID JWT helpers ───────────────────────────────────────────────────────

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: vapidSubject };

  const enc = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const sigInput = enc.encode(`${headerB64}.${payloadB64}`);

  const keyData = base64UrlToUint8Array(vapidPrivateKey!);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, sigInput);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function sendPush(sub: { endpoint: string; p256dh: string; auth_key: string }, payload: string): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) return false;

  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience);

  const authHeader = `vapid t=${jwt},k=${vapidPublicKey}`;
  const body = new TextEncoder().encode(payload);

  try {
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body,
    });
    return res.ok || res.status === 201;
  } catch {
    return false;
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' },
    });
  }

  try {
    const { userId, budgetName, pct, type } = await req.json() as {
      userId: string;
      budgetName: string;
      pct: number;
      type: 'warn' | 'over';
    };

    if (!userId || !budgetName) {
      return new Response(JSON.stringify({ error: 'userId and budgetName required' }), { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all push subscriptions for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', userId);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), { status: 200 });
    }

    const title = type === 'over' ? '⛔ Presupuesto superado' : '⚠️ Alerta de presupuesto';
    const body = type === 'over'
      ? `"${budgetName}" — gastaste el ${pct}% de tu estimado`
      : `"${budgetName}" — ya usaste el ${pct}% de tu estimado`;

    const pushPayload = JSON.stringify({ title, body, url: '/budgets', tag: `budget-${type}-${userId}` });

    // Log notification in DB
    await supabase.from('notification_log').insert({
      user_id: userId,
      type: type === 'over' ? 'budget_over' : 'budget_warn',
      title,
      body,
      data: { budgetName, pct },
    });

    // Send to all devices
    const results = await Promise.allSettled(subs.map(s => sendPush(s, pushPayload)));
    const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
