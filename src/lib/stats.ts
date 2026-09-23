import "server-only";
import { db } from "./db";
import { monthlyEquivalent } from "./money";

export async function monthlyCommitted() {
  const pledges = await db.pledge.findMany({ where: { status: "ACTIVE" } });
  return pledges.reduce((sum, p) => sum + monthlyEquivalent(p.amountCents, p.interval), 0);
}
