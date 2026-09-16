import { execSync } from "node:child_process";
import net from "node:net";

export function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", (err) => {
        if (err.code === "EADDRINUSE") {
          resolve(false);
        } else {
          resolve(true);
        }
      })
      .once("listening", () => {
        tester.once("close", () => resolve(true)).close();
      })
      .listen(port);
  });
}

export async function ensurePortAvailable(port) {
  const available = await isPortAvailable(port);
  if (available) return true;

  if (process.env.NODE_ENV === "production") {
    console.warn(`[port] Port ${port} is currently in use in production mode.`);
    return false;
  }

  console.warn(`[port] Port ${port} is occupied by a lingering process. Attempting automatic cleanup...`);
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"]
      });
      const lines = output.trim().split("\n");
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && Number(pid) !== process.pid && !isNaN(Number(pid))) {
          console.log(`[port] Freeing port ${port} by terminating stale process (PID ${pid})...`);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          } catch {
            // Process may have already terminated
          }
        }
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" });
    }

    // Give the operating system a brief moment to clean up socket
    await new Promise((r) => setTimeout(r, 600));
    const nowAvailable = await isPortAvailable(port);
    if (nowAvailable) {
      console.log(`[port] Successfully freed port ${port}.`);
      return true;
    }
  } catch (err) {
    console.warn(`[port] Notice: Could not automatically free port ${port}: ${err.message}`);
  }

  return false;
}
