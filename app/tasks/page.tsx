import Link from "next/link";
import { db } from "@/src/prisma/db";

export default async function TasksPage() {
  const tasks = await db.orm.public.Task.all();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">
              Follow-ups and task management
            </p>
          </div>

          <Link
            href="/tasks/new"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            + Create Task
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="mt-2 text-slate-500">
            Keep track of follow-ups and next actions for your leads.
          </p>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Task</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Related To</span>
          </div>

          {tasks.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold">No tasks yet</p>
              <p className="mt-2 text-sm text-slate-500">
                Create your first follow-up task to stay on top of your leads.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-slate-500">
                    {task.description ?? "—"}
                  </p>
                </div>

                <span>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : "—"}
                </span>

                <span>
                  {task.status === "COMPLETED" ? "Completed" : "Pending"}
                </span>

                <span>
                  {task.propertyId
                    ? "Property"
                    : task.contactId
                      ? "Contact"
                      : "General"}
                </span>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}