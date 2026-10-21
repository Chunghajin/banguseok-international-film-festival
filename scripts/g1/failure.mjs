import { G1Error } from "./client.mjs";

export function failureDetails(error) {
  const locations = typeof error?.stack === "string"
    ? [...error.stack.matchAll(/scripts\/g1\/verify\.mjs:(\d+):(\d+)/g)]
      .slice(0, 3).map(match => `verify.mjs:${match[1]}:${match[2]}`) : [];
  const kind = error instanceof G1Error ? `HTTP ${error.status}`
    : error?.code === "ERR_ASSERTION" ? "ASSERTION"
    : error instanceof TypeError ? "TypeError" : "RUNNER_ERROR";
  // Never print assertion values, raw messages, stacks, or response bodies.
  const rejectedStatus = Number.isInteger(error?.actual?.status) ? ` rejected HTTP ${error.actual.status}` : "";
  return `${kind}${rejectedStatus}${locations.length ? ` at ${locations.join(" <- ")}` : ""}`;
}
