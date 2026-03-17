import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f1f5f9",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    flexDirection: "column" as const,
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
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  navLinks: {
    display: "flex",
    gap: "1.5rem",
    alignItems: "center",
  },
  navLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.875rem",
    transition: "color 0.15s",
  },
  hero: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "5rem 2rem 4rem",
    textAlign: "center" as const,
    maxWidth: "860px",
    margin: "0 auto",
    width: "100%",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    background: "rgba(99,102,241,0.15)",
    border: "1px solid rgba(99,102,241,0.35)",
    color: "#a5b4fc",
    fontSize: "0.78rem",
    fontWeight: 500,
    marginBottom: "2rem",
  },
  h1: {
    fontSize: "clamp(2.5rem, 6vw, 4rem)",
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
    marginBottom: "1.25rem",
    background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
    WebkitBackgroundClip: "text" as const,
    WebkitTextFillColor: "transparent" as const,
  },
  subtitle: {
    fontSize: "1.15rem",
    color: "#64748b",
    lineHeight: 1.7,
    marginBottom: "2.5rem",
    maxWidth: "520px",
  },
  terminal: {
    background: "#020817",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "1rem 1.5rem",
    fontFamily: '"Fira Code", "Cascadia Code", monospace',
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1.5rem",
    width: "100%",
    maxWidth: "420px",
    cursor: "pointer",
    position: "relative" as const,
    transition: "border-color 0.15s",
  },
  prompt: {
    color: "#4ade80",
    userSelect: "none" as const,
  },
  cmd: {
    color: "#f1f5f9",
    flex: 1,
    textAlign: "left" as const,
  },
  copyHint: {
    fontSize: "0.75rem",
    color: "#475569",
    marginBottom: "2rem",
  },
  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.75rem",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.95rem",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    transition: "opacity 0.15s",
    marginBottom: "3rem",
  },
  divider: {
    width: "100%",
    height: "1px",
    background: "rgba(255,255,255,0.06)",
    margin: "0 0 3rem",
  },
  stepsSection: {
    width: "100%",
    maxWidth: "860px",
    margin: "0 auto",
    padding: "0 2rem 5rem",
  },
  stepsTitle: {
    textAlign: "center" as const,
    fontSize: "0.78rem",
    fontWeight: 600,
    letterSpacing: "0.1em",
    color: "#475569",
    textTransform: "uppercase" as const,
    marginBottom: "2.5rem",
  },
  steps: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  step: {
    background: "#0f1a2e",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  stepNum: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "rgba(99,102,241,0.2)",
    border: "1px solid rgba(99,102,241,0.4)",
    color: "#a5b4fc",
    fontSize: "0.8rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  stepTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
    color: "#e2e8f0",
  },
  stepDesc: {
    fontSize: "0.85rem",
    color: "#64748b",
    lineHeight: 1.6,
  },
  code: {
    fontFamily: '"Fira Code", monospace',
    background: "rgba(99,102,241,0.12)",
    color: "#a5b4fc",
    padding: "0.15em 0.4em",
    borderRadius: "4px",
    fontSize: "0.88em",
  },
  footer: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "1.5rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#475569",
    fontSize: "0.8rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
};

export default function Landing() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  function copyCmd() {
    navigator.clipboard.writeText("npx oneshot-app install").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <nav style={styles.nav}>
        <a href="/" style={styles.navLogo}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="100" height="100" rx="18" ry="18" fill="#1a1a2e" />
            <defs>
              <mask id="nav-logo-m">
                <rect width="100" height="100" fill="white" />
                <rect
                  x="3"
                  y="25"
                  width="30"
                  height="14"
                  fill="black"
                  transform="rotate(30, 18, 32)"
                />
                <rect
                  x="67"
                  y="61"
                  width="30"
                  height="14"
                  fill="black"
                  transform="rotate(30, 82, 68)"
                />
              </mask>
            </defs>
            <path
              fillRule="evenodd"
              d="M50,3 A47,47,0,1,1,50,97 A47,47,0,1,1,50,3 Z M50,23 A27,27,0,1,0,50,77 A27,27,0,1,0,50,23 Z"
              fill="#e8e8e8"
              mask="url(#nav-logo-m)"
            />
          </svg>
          oneshot
        </a>
        <div style={styles.navLinks}>
          <a href="/docs" style={styles.navLink}>
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

      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.badge}>
          <span>✦</span>
          <span>Open source · Bring your own keys</span>
        </div>

        <h1 style={styles.h1}>
          AI draws your ideas
          <br />
          in real-time
        </h1>

        <p style={styles.subtitle}>
          Watch your AI agent sketch diagrams and architecture directly on a
          live whiteboard — as it thinks.
        </p>

        {/* Terminal */}
        <div
          style={{
            ...styles.terminal,
            borderColor: copied
              ? "rgba(74,222,128,0.4)"
              : "rgba(255,255,255,0.08)",
          }}
          onClick={copyCmd}
          title="Click to copy"
        >
          <span style={styles.prompt}>$</span>
          <span style={styles.cmd}>npx oneshot-app install</span>
          <span style={{ color: "#475569", fontSize: "0.8rem" }}>
            {copied ? "✓ copied" : "copy"}
          </span>
        </div>

        <p style={styles.copyHint}>
          Installs the oneshot skill into Claude Code, Cursor, and other AI
          agents
        </p>

        <a
          href="https://github.com/thesekron/oneshot#readme"
          style={styles.cta}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Started →
        </a>
      </section>

      {/* Steps */}
      <div style={styles.stepsSection}>
        <div style={styles.divider} />
        <p style={styles.stepsTitle}>How it works</p>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNum}>1</div>
            <div style={styles.stepTitle}>Install once</div>
            <p style={styles.stepDesc}>
              Run <code style={styles.code}>npx oneshot-app install</code> — the
              skill is added to your AI agent automatically.
            </p>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>2</div>
            <div style={styles.stepTitle}>Agent draws</div>
            <p style={styles.stepDesc}>
              Your AI agent writes to{" "}
              <code style={styles.code}>workspace.json</code>. The oneshot
              daemon watches and syncs changes live.
            </p>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>3</div>
            <div style={styles.stepTitle}>You watch</div>
            <p style={styles.stepDesc}>
              Open the room URL the agent prints. The canvas updates in
              real-time — no account needed.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>oneshot — AI canvas sync</span>
        <div style={{ display: "flex", gap: "1rem" }}>
          <a
            href="/docs"
            style={{ color: "#475569", textDecoration: "none" }}
          >
            Docs
          </a>
          <a
            href="https://github.com/thesekron/oneshot"
            style={{ color: "#475569", textDecoration: "none" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://npmjs.com/package/oneshot-app"
            style={{ color: "#475569", textDecoration: "none" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            npm
          </a>
        </div>
      </footer>
    </div>
  );
}
