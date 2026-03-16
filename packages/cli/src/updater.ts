import * as p from "@clack/prompts"
import pc from "picocolors"

export async function checkForUpdates(currentVersion: string) {
  try {
    const res = await fetch("https://registry.npmjs.org/oneshot-app/latest", {
      signal: AbortSignal.timeout(3000),
    })
    const data = (await res.json()) as { version?: string }
    const latest = data.version

    if (latest && latest !== currentVersion) {
      p.log.warn(
        [
          `Update available: ${pc.dim(currentVersion)} → ${pc.green(latest)}`,
          `Run: ${pc.cyan("npx oneshot-app@latest")}`,
        ].join("\n"),
      )
    }
  } catch {
    // Network unavailable — silently ignore
  }
}
