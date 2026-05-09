import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">
          CopilotKit hackathon starter
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          <span className="font-medium text-foreground">CoachMe+</span> is a
          full stack demo: LangGraph tools write{" "}
          <code className="rounded bg-muted px-1 text-xs">coaching_data</code> /
          <code className="rounded bg-muted px-1 text-xs">coaching_status</code>{" "}
          to the agent snapshot (TwelveLabs Pegasus + Marengo), CopilotKit
          streams the canvas, and generative UI tools render in the sidebar.
          Set{" "}
          <code className="rounded bg-muted px-1 text-xs">
            COACHME_SKIP_NOTION=1
          </code>{" "}
          plus{" "}
          <code className="rounded bg-muted px-1 text-xs">TWELVELABS_*</code> /{" "}
          <code className="rounded bg-muted px-1 text-xs">GEMINI_API_KEY</code>{" "}
          in <code className="rounded bg-muted px-1 text-xs">apps/agent/.env</code>
          . Use <strong>Load mock JSON</strong> on{" "}
          <span className="font-medium text-foreground">/coach</span> for an
          offline walkthrough.
        </p>
      </div>
      <nav className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/coach"
          className="rounded-xl border border-border bg-card px-6 py-3 text-center text-sm font-semibold text-card-foreground shadow-sm transition-colors hover:bg-muted/50"
        >
          CoachMe+ (TwelveLabs + AG-UI canvas)
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
