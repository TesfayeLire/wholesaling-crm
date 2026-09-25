"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-5xl space-y-4 p-8"><h1 className="text-2xl font-bold">Unable to load this page</h1><p>Please try again. If the problem continues, check the database connection in your working environment.</p><button className="rounded border px-4 py-2" onClick={reset}>Try again</button>{" "}<Link className="underline" href="/">Dashboard</Link></main>;
}
