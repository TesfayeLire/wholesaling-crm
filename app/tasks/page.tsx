import Link from "next/link";
import { TaskList } from "@/app/components/task-list";
import { db } from "@/src/prisma/db";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = params.status === "PENDING" || params.status === "COMPLETED" ? params.status : "ALL";
  const [allTasks, properties, contacts] = await Promise.all([db.orm.public.Task.all(), db.orm.public.Property.all(), db.orm.public.Contact.all()]);
  const tasks = allTasks.filter(task => status === "ALL" || task.status === status);

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

        <form method="get" className="mb-6 flex gap-3">
          <select name="status" aria-label="Task status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-4 py-2">
            <option value="ALL">All tasks</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option>
          </select>
          <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm text-white">Filter</button>
          <Link href="/tasks" className="px-4 py-2 text-sm underline">Clear</Link>
        </form>
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Task</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Related To</span>
          </div>

          <TaskList tasks={tasks} properties={properties} contacts={contacts}/>
        </section>
      </main>
    </div>
  );
}
