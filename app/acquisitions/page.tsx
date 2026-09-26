import { connection } from "next/server";
import { getAcquisitions } from "@/src/acquisition-data";
import { AcquisitionSummary } from "@/app/components/acquisition-summary";
export default async function Acquisitions() {
  await connection();
  return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Offers & acquisition deadlines</h1><AcquisitionSummary data={await getAcquisitions()}/></main>;
}
