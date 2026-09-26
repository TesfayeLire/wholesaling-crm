import { CommandCenter } from "@/app/components/command-center";
import { getCommandCenter } from "@/src/command-center-data";
import { connection } from "next/server";
import Link from "next/link";
import { db } from "@/src/prisma/db";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Properties", href: "/properties" },
  { label: "Contacts", href: "/contacts" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Tasks", href: "/tasks" },
  { label: "Follow-Ups", href: "/follow-ups" },
];

export default async function Home() {
  await connection();
  const center = await getCommandCenter();
  const properties = center.properties;
  const tasks = await db.orm.public.Task.all();

  const activeLeads = properties.filter(
    (property) =>
      property.status !== "CLOSED" && property.status !== "DEAD",
  ).length;

  const pendingTaskCount = tasks.filter(
    (task) => task.status === "PENDING",
  ).length;

  const underContract = properties.filter(
    (property) => property.status === "UNDER_CONTRACT",
  ).length;

  const closedDeals = properties.filter(
    (property) => property.status === "CLOSED",
  ).length;

  const stats = [
    {
      label: "Active Leads",
      value: activeLeads,
      detail: "Properties in your pipeline",
    },
    {
      label: "Pending Tasks",
      value: pendingTaskCount,
      detail: "All tasks marked pending",
    },
    {
      label: "Under Contract",
      value: underContract,
      detail: "Deals moving toward closing",
    },
    {
      label: "Closed Deals",
      value: closedDeals,
      detail: "Completed wholesale deals",
    },
  ];

  const activeProperties = properties.filter(
    (property) =>
      property.status !== "CLOSED" && property.status !== "DEAD",
  );

  const pendingTasks = tasks.filter(
    (task) => task.status === "PENDING",
  );

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

          <section className="mt-8"><CommandCenter data={center} compact/></section>
          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Pipeline</h2>
                  <p className="text-sm text-slate-500">
                    Current deal activity
                  </p>
                </div>

                <Link
                  href="/pipeline"
                  className="text-sm font-semibold"
                >
                  View Pipeline
                </Link>
              </div>

              {activeProperties.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
                  <p className="font-medium">No active properties</p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {activeProperties.slice(0, 5).map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div>
                        <Link className="font-semibold underline" href={`/properties/${property.id}`}>{property.address}</Link>
                        <p className="text-sm text-slate-500">
                          {property.city}, {property.state}
                        </p>
                      </div>

                      <span className="text-xs font-semibold">
                        {property.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Pending Tasks</h2>
                  <p className="text-sm text-slate-500">
                    Your next follow-ups and actions
                  </p>
                </div>

                <Link
                  href="/tasks"
                  className="text-sm font-semibold"
                >
                  View Tasks
                </Link>
              </div>

              {pendingTasks.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center">
                  <p className="font-medium">No pending tasks</p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {pendingTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <Link className="font-semibold underline" href={`/tasks/${task.id}/edit`}>{task.title}</Link>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.dueDate
                          ? `Due ${new Date(task.dueDate).toLocaleDateString()}`
                          : "No due date"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
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

              <Link
                href="/tasks/new"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                + Create Task
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
