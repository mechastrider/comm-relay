import { test as base, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";

async function unusedPort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  const port = address.port;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null) return;
  const done = once(child, "exit");
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  await done;
  clearTimeout(timer);
}

export const test = base.extend<{
  viewerCount: number;
  runtime: { url: string; restart: () => Promise<void> };
}>({
  viewerCount: [3, { option: true }],
  runtime: async ({ viewerCount }, use, info) => {
    const dir = await mkdtemp(join(tmpdir(), "comm-relay-e2e-"));
    const bin = join(tmpdir(), "comm-relay-e2e-bin");
    const ext = process.platform === "win32" ? ".exe" : "";
    const config = join(dir, "config.json");
    await writeFile(
      config,
      JSON.stringify({
        twitch: { enabled: false },
        youtube: { enabled: false },
        vk: { enabled: false },
        admin: { time_locale: "en-GB" },
      }),
    );
    const port = await unusedPort();
    const url = "http://127.0.0.1:" + port;
    let logs = "";
    const start = async () => {
      const args = ["-config", config, "-addr", "127.0.0.1:" + port];
      if (process.env.COMM_RELAY_E2E_DISK) args.push("-web", "./web");
      const child = spawn(
        process.env.COMM_RELAY_E2E_SERVER || join(bin, "server" + ext),
        args,
        { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, TZ: "UTC" } },
      );
      child.stdout?.on("data", (chunk) => {
        logs += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        logs += chunk.toString();
      });
      let ready = false;
      for (let attempt = 0; attempt < 150; attempt++) {
        if (child.exitCode !== null) throw new Error("Server exited: " + logs);
        try {
          ready = (await fetch(url + "/health")).ok;
        } catch {
          /* Wait for startup. */
        }
        if (ready) return child;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await stop(child);
      throw new Error("Server startup timed out: " + logs);
    };
    let child: ChildProcess | undefined;
    try {
      child = await start();
      const db = new DatabaseSync(join(dir, "comm-relay.db"));
      try {
        db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
        const at = "2026-01-01T12:00:00Z";
        const insert = db.prepare(
          "INSERT INTO viewers(id, display_name, message_count, xp, last_seen_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        );
        const identity = db.prepare(
          "INSERT INTO viewer_identities(platform,user_id,viewer_id,username,display_name,last_seen_at) VALUES (?, ?, ?, ?, ?, ?)",
        );
        for (const [index, name] of [
          "Night Owl",
          "PixelFox",
          "<b>HTML</b> & quotes",
          ...Array.from(
            { length: Math.max(0, viewerCount - 3) },
            (_, index) => `Viewer ${String(index).padStart(4, "0")}`,
          ),
        ].entries()) {
          const id = "e2e-viewer-" + index;
          insert.run(id, name, 10 + index, 20 + index, at, at);
          identity.run("twitch", id, id, name, name, at);
        }
        db.exec("COMMIT");
      } finally {
        db.close();
      }
      await use({
        url,
        restart: async () => {
          if (child) await stop(child);
          child = await start();
        },
      });
    } finally {
      if (child) await stop(child);
      if (info.status !== info.expectedStatus)
        await info.attach("server.log", {
          body: logs,
          contentType: "text/plain",
        });
      await rm(dir, { recursive: true, force: true });
    }
  },
  page: async ({ page, runtime }, use, info) => {
    // Stabilize displayed dates without stopping timers, WS reconnect or media.
    // Backend time stays real; visual fixtures must not depend on its clock.
    if (info.title.includes("@visual") || info.tags.includes("@visual"))
      await page.clock.setFixedTime(new Date("2026-01-02T12:00:00Z"));
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        !message.text().startsWith("Failed to load resource:") &&
        !message.text().includes("WebSocket connection to")
      )
        failures.push(message.text());
    });
    page.on("requestfailed", (request) => {
      if (
        ["script", "stylesheet", "document"].includes(request.resourceType()) &&
        !["net::ERR_ABORTED", "NS_BINDING_ABORTED", "cancelled"].includes(
          request.failure()?.errorText ?? "",
        )
      )
        failures.push(request.url() + ": " + request.failure()?.errorText);
    });
    await page.addInitScript(() => {
      try {
        if (!localStorage.getItem("commRelay.uiLocale"))
          localStorage.setItem("commRelay.uiLocale", "en-GB");
      } catch {
        /* Storage-denial tests intentionally disable preferences. */
      }
    });
    await page.goto(runtime.url);
    await expect(page.locator("#workspace-live")).toBeVisible();
    await use(page);
    await page.unrouteAll({ behavior: "wait" });
    await page.close();
    if (failures.length)
      await info.attach("browser-errors.json", {
        body: JSON.stringify(failures, null, 2),
        contentType: "application/json",
      });
    expect(failures, "Browser startup and runtime errors").toEqual([]);
  },
});
export { expect };
