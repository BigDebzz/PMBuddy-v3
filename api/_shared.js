// Shared helpers for marketing emails (newsletter and "start your first project" nudges).
// A file starting with an underscore is not exposed as a web address.
import crypto from 'crypto';

// The postal address printed at the bottom of marketing emails. CAN-SPAM requires a real one.
export const POSTAL_ADDRESS = '';

export function unsubscribeToken(userId) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return crypto.createHmac('sha256', secret).update(String(userId)).digest('hex').slice(0, 40);
}

export function unsubscribeUrl(userId) {
  return `https://pmbuddy.app/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

export function isOptedOut(user) {
  return !!(user && user.user_metadata && user.user_metadata.marketing_opt_out);
}

// Lines for the bottom of an email: why they got it, how to stop, and the postal address.
export function marketingFooter(userId, color = '#9CA3AF') {
  const link = unsubscribeUrl(userId);
  const address = POSTAL_ADDRESS ? `<p style="margin:6px 0 0;font-size:12px;color:${color};">${POSTAL_ADDRESS}</p>` : '';
  return `<p style="margin:10px 0 0;font-size:12px;color:${color};">You are getting this because you have a PM Buddy account. <a href="${link}" style="color:${color};text-decoration:underline;">Unsubscribe from these emails</a>.</p>${address}`;
}

// Brevo headers so Gmail and Outlook show their own "Unsubscribe" button.
export function unsubscribeHeaders(userId) {
  return {
    'List-Unsubscribe': `<${unsubscribeUrl(userId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
