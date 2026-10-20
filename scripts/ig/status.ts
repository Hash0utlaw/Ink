// scripts/ig/status.ts — is the background fetch still running, and how far is it?
// Reads data/cache/ig-fetch.pid and data/cache/ig-fetch.log. Calls nothing.
// Run: npm run ig:status

import fs from "fs"
import path from "path"
import { CACHE_FILE, FINAL, readCache } from "./lib"

const PID_FILE = path.resolve("data/cache/ig-fetch.pid")
const LOG_FILE = path.resolve("data/cache/ig-fetch.log")

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const pid = fs.existsSync(PID_FILE) ? Number(fs.readFileSync(PID_FILE, "utf-8").trim()) : NaN
const log = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf-8").split("\n") : []
const progress = log.filter((l) => l.startsWith("PROGRESS")).pop()
const tail = log.filter((l) => /^(Done:|STOPPED|  usage .*pausing)/.test(l.trim()) || l.startsWith("STOPPED")).slice(-2)

console.log(`Process: ${Number.isNaN(pid) ? "no pid file" : `${pid} ${alive(pid) ? "RUNNING" : "NOT running"}`}`)
console.log(`Latest: ${progress ?? "(no progress line yet)"}`)
for (const l of tail) console.log(`        ${l.trim()}`)
const cache = readCache()
const final = Array.from(cache.values()).filter((r) => FINAL.has(r.status)).length
console.log(`Cache:  ${final} usernames finished (${CACHE_FILE})`)
