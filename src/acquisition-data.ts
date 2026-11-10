import { db } from "./prisma/db";
import { acquisitionSummary } from "./acquisitions";
import { readRows, safeDbQuery } from "./db-safety";

export type Offer = NonNullable<Awaited<ReturnType<typeof db.orm.public.Offer.first>>>;
export type AcquisitionContract = NonNullable<Awaited<ReturnType<typeof db.orm.public.AcquisitionContract.first>>>;

export async function getAcquisitions() {
  return safeDbQuery("acquisition-data", async () => {
    const [offers, contracts, properties] = await Promise.all([
      readRows(db.orm.public.Offer.all()),
      readRows(db.orm.public.AcquisitionContract.all()),
      readRows(db.orm.public.Property.all()),
    ]);
    return { ...acquisitionSummary(offers, contracts), offers, contracts, properties };
  }, { ...acquisitionSummary([], []), offers: [], contracts: [], properties: [] });
}
