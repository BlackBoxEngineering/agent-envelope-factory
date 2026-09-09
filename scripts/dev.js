import { spawn } from "node:child_process";
import process from "node:process";

const viteArgs = ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", ...process.argv.slice(2)];
const children = [
  start("bridge", process.execPath, ["scripts/ai-operator-bridge.js"]),
  start("vite", process.execPath, viteArgs),
];

let shuttingDown = false;

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: true,
  });

  child.stdout.on("data", (chunk) => write(name, chunk));
  child.stderr.on("data", (chunk) => write(name, chunk));
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    const suffix = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[${name}] exited with ${suffix}`);
    shutdown(code ?? 1);
  });

  return child;
}

function write(name, chunk) {
  const text = chunk.toString();
  for (const line of text.split(/\r?\n/)) {
    if (line) console.log(`[${name}] ${line}`);
  }
}

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
