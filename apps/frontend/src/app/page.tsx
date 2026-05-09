import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">
          CopilotKit hackathon starter
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Pick a demo route. CoachMe+ can load demo coaching data from the repo
          until the agent is connected.
        </p>
      </div>
      <nav className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/coach"
          className="rounded-xl border border-border bg-card px-6 py-3 text-center text-sm font-semibold text-card-foreground shadow-sm transition-colors hover:bg-muted/50"
        >
          CoachMe+ (demo canvas)
        </Link>
        <Link
          href="/leads"
          className="rounded-xl border border-border bg-secondary px-6 py-3 text-center text-sm font-semibold text-secondary-foreground shadow-sm transition-colors hover:opacity-90"
        >
          Leads CRM demo
        </Link>
      </nav>
    </div>
  );
}
