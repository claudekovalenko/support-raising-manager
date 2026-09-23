export const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);
export const smsConfigured = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
