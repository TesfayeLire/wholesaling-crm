import Link from "next/link";
import { createTask } from "@/app/actions";

export default function NewTaskPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xl font-bold">Wholesaling CRM</p>
            <p className="text-sm text-slate-500">Create a follow-up task</p>
          </div>

          <Link
            href="/tasks"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Back to Tasks
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Task</h1>
          <p className="mt-2 text-slate-500">
            Add a follow-up or action you need to complete.
          </p>
        </div>

        <form action={createTask} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold">Task Information</h2>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">
                  Task Title *
                </span>
                <input
                  name="title"
                  required
                  placeholder="Call seller for follow-up"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">Due Date</span>
                <input
                  name="dueDate"
                  type="date"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-medium">Status</span>
                <select
                  name="status"
                  defaultValue="PENDING"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium">
                  Description
                </span>
                <textarea
                  name="description"
                  rows={5}
                  placeholder="Add any details about this follow-up..."
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none"
                />
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/tasks"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Save Task
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}