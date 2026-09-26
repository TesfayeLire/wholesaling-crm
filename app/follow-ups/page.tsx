import { connection } from "next/server";
import { getCommandCenter } from "@/src/command-center-data";
import { CommandCenter } from "@/app/components/command-center";

export default async function FollowUps() {
  await connection();
  const data = await getCommandCenter();
  return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Follow-Up Command Center</h1><CommandCenter data={data}/></main>;
}
