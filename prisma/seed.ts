// Creates the admin account(s) from ADMIN_EMAILS. Run `npm run db:seed -- --demo` to add sample data.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  for (const email of admins) {
    await db.user.upsert({ where: { email }, create: { email, role: "ADMIN", emailUpdates: false }, update: { role: "ADMIN" } });
    console.log(`✓ admin: ${email}`);
  }
  if (!admins.length) console.log("⚠ Set ADMIN_EMAILS in .env to create your admin login.");

  if (!process.argv.includes("--demo")) return;

  const people = [
    { name: "Grace Miller", email: "grace@example.com", amount: 10000, interval: "MONTHLY", method: "OTHER", source: "Home church", signal: true },
    { name: "Dan & Priya Shah", email: "shahs@example.com", amount: 25000, interval: "MONTHLY", method: "CHECK", source: "College friends" },
    { name: "Ruth Kowalski", email: "ruth@example.com", amount: 60000, interval: "QUARTERLY", method: "BANK", source: "Family", signal: true },
    { name: "Marcus Lee", email: "marcus@example.com", amount: 5000, interval: "MONTHLY", method: "OTHER", source: "Small group" },
    { name: "Hope Community Church", email: "missions@hopecc.example", amount: 50000, interval: "MONTHLY", method: "CHECK", source: "Church partner" },
    { name: "Sam Ortiz", email: "sam@example.com", amount: 0, interval: "MONTHLY", method: "OTHER", source: "Newsletter signup" },
  ];
  for (const p of people) {
    const user = await db.user.upsert({
      where: { email: p.email },
      create: { email: p.email, name: p.name, source: p.source, signalMember: Boolean(p.signal) },
      update: {},
    });
    if (p.amount && !(await db.pledge.count({ where: { userId: user.id } }))) {
      await db.pledge.create({ data: { userId: user.id, amountCents: p.amount, interval: p.interval, method: p.method, startedAt: new Date(Date.now() - 200 * 86_400_000) } });
      for (let m = 0; m < 6; m++) {
        if (p.interval === "QUARTERLY" && m % 3) continue;
        const d = new Date();
        d.setMonth(d.getMonth() - m, 5);
        await db.gift.create({ data: { userId: user.id, amountCents: p.amount, receivedAt: d, method: p.method } });
      }
    }
  }
  console.log(`✓ demo supporters`);
}

main().finally(() => db.$disconnect());
