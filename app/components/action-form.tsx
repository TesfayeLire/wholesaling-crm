"use client";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";

const PendingContext = createContext(false);
export function SubmitButton({ children = "Save" }: { children?: ReactNode }) {
  const pending = useContext(PendingContext);
  return <button disabled={pending} type="submit" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : children}</button>;
}
export function ActionForm({ action, children, className = "space-y-5", confirmMessage }: { action: (form: FormData) => Promise<void>; children: ReactNode; className?: string; confirmMessage?: string }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <PendingContext.Provider value={pending}><form className={className} aria-busy={pending} onSubmit={event => {
    // Keep entered values on an unsuccessful save instead of resetting the form.
    event.preventDefault();
    if (pending || (confirmMessage && !window.confirm(confirmMessage))) return;
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try { await action(form); }
      catch (error) {
        // Next uses a thrown redirect internally; let its router handle it.
        if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
        setError("Could not save this change. Check the fields and try again. The record may have changed or been deleted.");
      }
    });
  }}>
    {children}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </form></PendingContext.Provider>;
}
