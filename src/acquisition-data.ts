import { db } from "./prisma/db";
import { acquisitionSummary } from "./acquisitions";
export type Offer = NonNullable<Awaited<ReturnType<typeof db.orm.public.Offer.first>>>;
export type AcquisitionContract = NonNullable<Awaited<ReturnType<typeof db.orm.public.AcquisitionContract.first>>>;
export async function getAcquisitions() {
  const [offers, contracts, properties] = await Promise.all([db.orm.public.Offer.all(), db.orm.public.AcquisitionContract.all(), db.orm.public.Property.all()]);
  return { ...acquisitionSummary(offers, contracts), offers, contracts, properties };
}
