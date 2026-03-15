const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f1f5f9",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1.25rem 2rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  navLogo: {
    fontSize: "1.1rem",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: "#f1f5f9",
    textDecoration: "none",
  },
  navLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.875rem",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "0 2rem",
    gap: "3rem",
    minHeight: "calc(100vh - 62px)",
  },
  sidebar: {
    padding: "2.5rem 0",
    borderRight: "1px solid rgba(255,255,255,0.06)",
  },
  sidebarSection: {
    marginBottom: "2rem",
  },
  sidebarLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "#475569",
    marginBottom: "0.5rem",
  },
  sidebarLink: {
    display: "block",
    padding: "0.3rem 0",
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.875rem",
    lineHeight: 1.5,
  },
  content: {
    padding: "2.5rem 0 4rem",
    maxWidth: "700px",
  },
  h1: {
    fontSize: "2rem",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    marginBottom: "0.5rem",
    color: "#f1f5f9",
  },
  lead: {
    color: "#64748b",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    marginBottom: "2.5rem",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    paddingBottom: "2rem",
  },
  h2: {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#e2e8f0",
    marginBottom: "0.75rem",
    marginTop: "2.5rem",
  },
  p: {
    color: "#94a3b8",
    lineHeight: 1.7,
    marginBottom: "1rem",
    fontSize: "0.9rem",
  },
  pre: {
    background: "#020817",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    fontFamily: '"Fira Code", "Cascadia Code", monospace',
    fontSize: "0.85rem",
    color: "#a5b4fc",
    overflow: "auto" as const,
    marginBottom: "1.25rem",
    lineHeight: 1.6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.875rem",
    marginBottom: "1.5rem",
  },
  th: {
    textAlign: "left" as const,
    padding: "0.6rem 0.75rem",
    background: "rgba(255,255,255,0.04)",
    color: "#94a3b8",
    fontWeight: 600,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  td: {
    padding: "0.6rem 0.75rem",
    color: "#64748b",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    verticalAlign: "top" as const,
  },
  tdCode: {
    fontFamily: '"Fira Code", monospace',
    color: "#a5b4fc",
    fontSize: "0.82rem",
  },
  note: {
    background: "rgba(99,102,241,0.08)",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "8px",
    padding: "1rem 1.25rem",
    color: "#a5b4fc",
    fontSize: "0.875rem",
    lineHeight: 1.6,
    marginBottom: "1.25rem",
  },
};

export default function Docs() {
  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <a href="/" style={styles.navLogo}>
          oneshot
        </a>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a href="/docs" style={{ ...styles.navLink, color: "#f1f5f9" }}>
            Docs
          </a>
          <a
            href="https://github.com/thesekron/oneshot"
            style={styles.navLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </nav>

      <div style={styles.layout}>
        {/* Sidebar */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>Getting Started</div>
            <a href="#install" style={styles.sidebarLink}>
              Installation
            </a>
            <a href="#quickstart" style={styles.sidebarLink}>
              Quick start
            </a>
            <a href="#how-it-works" style={styles.sidebarLink}>
              How it works
            </a>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>CLI Reference</div>
            <a href="#cli-install" style={styles.sidebarLink}>
              oneshot install
            </a>
            <a href="#cli-start" style={styles.sidebarLink}>
              oneshot start
            </a>
            <a href="#cli-sessions" style={styles.sidebarLink}>
              oneshot sessions
            </a>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>Configuration</div>
            <a href="#config-ably" style={styles.sidebarLink}>
              Ably (relay)
            </a>
            <a href="#config-supabase" style={styles.sidebarLink}>
              Supabase (persistent)
            </a>
          </div>
          <div style={styles.sidebarSection}>
            <div style={styles.sidebarLabel}>Canvas Format</div>
            <a href="#workspace-json" style={styles.sidebarLink}>
              workspace.json
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main style={styles.content}>
          <h1 style={styles.h1}>Documentation</h1>
          <p style={styles.lead}>
            oneshot connects your AI agent to a live whiteboard. The agent
            writes to a local file; you see the result in real-time.
          </p>

          {/* Install */}
          <h2 id="install" style={styles.h2}>
            Installation
          </h2>
          <p style={styles.p}>
            Install the skill into your AI agent (Claude Code, Cursor, etc.):
          </p>
          <pre style={styles.pre}>npx oneshot install</pre>
          <p style={styles.p}>
            This writes the oneshot skill to your agent&apos;s skills directory.
            You only need to do this once.
          </p>

          {/* Quick start */}
          <h2 id="quickstart" style={styles.h2}>
            Quick start
          </h2>
          <p style={styles.p}>
            In your project directory, start a session:
          </p>
          <pre style={styles.pre}>{"npx oneshot start"}</pre>
          <p style={styles.p}>
            This prints a URL like{" "}
            <code
              style={{
                fontFamily: "monospace",
                color: "#a5b4fc",
                fontSize: "0.9em",
              }}
            >
              https://oneshot.app/r/abc123#...
            </code>
            . Open it in your browser. Then ask your AI agent to draw
            something — the canvas updates in real-time.
          </p>
          <div style={styles.note}>
            The URL hash contains your credentials and is never sent to any
            server. Your canvas data goes directly to your Ably or Supabase
            account.
          </div>

          {/* How it works */}
          <h2 id="how-it-works" style={styles.h2}>
            How it works
          </h2>
          <p style={styles.p}>
            oneshot has three parts:
          </p>
          <ol
            style={{
              color: "#94a3b8",
              lineHeight: 1.9,
              paddingLeft: "1.25rem",
              fontSize: "0.9rem",
              marginBottom: "1rem",
            }}
          >
            <li>
              <strong style={{ color: "#e2e8f0" }}>CLI daemon</strong> — watches{" "}
              <code style={{ fontFamily: "monospace", color: "#a5b4fc" }}>
                workspace.json
              </code>{" "}
              for changes and publishes them to Ably or Supabase.
            </li>
            <li>
              <strong style={{ color: "#e2e8f0" }}>AI skill</strong> — tells
              your agent to write Excalidraw JSON to{" "}
              <code style={{ fontFamily: "monospace", color: "#a5b4fc" }}>
                workspace.json
              </code>
              .
            </li>
            <li>
              <strong style={{ color: "#e2e8f0" }}>Web canvas</strong> —
              subscribes to the same channel and renders updates live.
            </li>
          </ol>

          {/* CLI commands */}
          <h2 id="cli-install" style={styles.h2}>
            oneshot install
          </h2>
          <p style={styles.p}>
            Installs the skill file into your AI agent&apos;s skills directory.
          </p>
          <pre style={styles.pre}>npx oneshot install</pre>

          <h2 id="cli-start" style={styles.h2}>
            oneshot start
          </h2>
          <p style={styles.p}>
            Starts the sync daemon and prints a room URL.
          </p>
          <pre style={styles.pre}>
            {`npx oneshot start
npx oneshot start --resume <roomId>   # reuse an existing session`}
          </pre>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Flag</th>
                <th style={styles.th}>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...styles.td, ...styles.tdCode }}>
                  --resume &lt;id&gt;
                </td>
                <td style={styles.td}>
                  Resume an existing session (same room URL).
                </td>
              </tr>
            </tbody>
          </table>

          <h2 id="cli-sessions" style={styles.h2}>
            oneshot sessions
          </h2>
          <p style={styles.p}>Lists all saved sessions.</p>
          <pre style={styles.pre}>npx oneshot sessions</pre>

          {/* Config */}
          <h2 id="config-ably" style={styles.h2}>
            Ably (relay mode)
          </h2>
          <p style={styles.p}>
            Ably provides ephemeral pub/sub — canvas data is never stored.
            Create a free account at{" "}
            <a
              href="https://ably.com"
              style={{ color: "#a5b4fc" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              ably.com
            </a>{" "}
            and copy your API key.
          </p>
          <pre style={styles.pre">
            {`# ~/.oneshot/config.json
{
  "sync": "ably",
  "apiKey": "your-ably-api-key"
}`}
          </pre>

          <h2 id="config-supabase" style={styles.h2}>
            Supabase (database mode)
          </h2>
          <p style={styles.p}>
            Supabase persists the canvas between sessions. Create a project and
            run the following SQL to create the workspaces table:
          </p>
          <pre style={styles.pre}>
            {`create table workspaces (
  id text primary key,
  elements jsonb,
  app_state jsonb,
  updated_by text,
  updated_at timestamptz
);
alter table workspaces enable row level security;
create policy "public read" on workspaces for select using (true);
create policy "public write" on workspaces for all using (true);`}
          </pre>
          <pre style={styles.pre}>
            {`# ~/.oneshot/config.json
{
  "sync": "supabase",
  "supabaseUrl": "https://xxxx.supabase.co",
  "supabaseKey": "your-anon-key"
}`}
          </pre>

          {/* workspace.json */}
          <h2 id="workspace-json" style={styles.h2}>
            workspace.json format
          </h2>
          <p style={styles.p}>
            The agent writes standard Excalidraw JSON. Minimal example:
          </p>
          <pre style={styles.pre}>
            {`{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    {
      "type": "rectangle",
      "x": 100, "y": 100,
      "width": 200, "height": 100,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "id": "abc123",
      "version": 1,
      "versionNonce": 1,
      "isDeleted": false,
      "fillStyle": "solid",
      "strokeWidth": 2,
      "roughness": 1,
      "opacity": 100,
      "angle": 0,
      "seed": 1,
      "groupIds": [],
      "frameId": null,
      "index": "a0",
      "roundness": null,
      "updated": 1
    }
  ],
  "appState": { "viewBackgroundColor": "#0f172a" }
}`}
          </pre>
        </main>
      </div>
    </div>
  );
}
