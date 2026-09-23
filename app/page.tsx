import Link from "next/link";

const stats = [
  { label: "Active Leads", value: "0", detail: "Properties in your pipeline" },
  { label: "Tasks Due", value: "0", detail: "Follow-ups needing attention" },
  { label: "Under Contract", value: "0", detail: "Deals moving toward closing" },
  { label: "Closed Deals", value: "0", detail: "Completed wholesale deals" },
];

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Properties", href: "/properties" },
  { label: "Contacts", href: "/contacts" },
  { label: "Pipeline", href: "#" },
  { label: "Tasks", href: "#" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">
              Deal management workspace
            </p>
          </div>

          <Link
            href="/properties/new"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            + Add Property
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav className="space-y-1">
            {navigation.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  index === 0
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main>
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-slate-500">
              Keep your leads, follow-ups, and deals organized in one place.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {stat.detail}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold">Pipeline</h2>
              <p className="text-sm text-slate-500">
                Current deal activity
              </p>

              <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
                <p className="font-medium">No properties yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add your first property to start building your pipeline.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold">Upcoming Tasks</h2>
              <p className="text-sm text-slate-500">
                Your next follow-ups and actions
              </p>

              <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
                <p className="font-medium">Nothing due yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Tasks will appear here as you work your leads.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Quick Actions</h2>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/properties/new"
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                + Add Property
              </Link>

              <Link
                href="/contacts/new"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                + Add Contact
              </Link>

              <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">
                + Create Task
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}