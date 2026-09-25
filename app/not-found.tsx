import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto max-w-5xl space-y-4 p-8"><h1 className="text-2xl font-bold">Record not found</h1><p>This record may have been deleted, or the link is invalid.</p><Link className="underline" href="/properties">Properties</Link>{" · "}<Link className="underline" href="/contacts">Contacts</Link>{" · "}<Link className="underline" href="/tasks">Tasks</Link></main>;
}
