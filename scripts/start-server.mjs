import { spawn } from "node:child_process";
import path from "node:path";

const port = process.env.PORT || "8080";
const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextCli, "start", "-H", "0.0.0.0", "-p", port], {
  env: process.env,
  stdio: "inherit",
});

server.on("exit", (code) => {
  process.exit(code ?? 1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}