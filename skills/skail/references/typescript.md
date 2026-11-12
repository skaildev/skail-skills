# Skail in TypeScript / Node

Read [concepts.md](concepts.md) first: everything here assumes replay and determinism.

## Project setup

- `@skail/runtime` in the app, `@skail/build` at build time.
- ESM with `"module": "NodeNext"`, and TC39 standard decorators: keep `"experimentalDecorators": false`
  in `tsconfig.json`.
- `tsc` alone does not produce the durable bundle. Build it with
  `skail build src/functions.ts --workload <name:vX.Y.Z> --out .skail/functions.mjs --manifest .skail/manifest.json`,
  and point the host at those files: `createSkailPlatform({ bundle, manifest })`. Run that build
  through the package scripts (`pnpm build`) or `npx skail build …` inside the project: there `skail`
  is `@skail/build`'s binary. A globally installed Skail CLI also answers to `skail`, and its `build`
  takes no file argument.
- `@skail/runtime` (2.0.0 and later) reads `SKAIL_WORKLOAD`, `SKAIL_SIDECAR` or `SKAIL_SIDECAR_URL`,
  `SKAIL_NAMESPACE` and `SKAIL_KEY` from the environment, so `createSkailPlatform({ bundle, manifest })`
  is enough — that is what the examples do. Passing `{ workload, sidecar: { baseUrl, namespace, key } }`
  in code also works and wins over the environment. If both sidecar variables are set,
  `SKAIL_SIDECAR` is used: keep them equal.

## Shape of the code

```ts
import { Skail, SkailCommand, SkailFunction } from "@skail/runtime";

export class Orders {
  @SkailFunction()                       // orchestration: public, async, instance method
  async Fulfill(order: { id: string }): Promise<string> {
    const paid = await this.charge(order.id);           // command: side effect, recorded
    if (!paid) return "payment-failed";
    const approved = await Skail.whenAny(
      Skail.waitForEvent<boolean>("approved", order.id), // external event
      Skail.delayMinutes(60),                            // durable timer; the worker can stop
    );
    return approved === true ? "shipped" : "expired";
  }

  @SkailCommand({ retryCount: 2 })       // side-effect boundary
  async charge(orderId: string): Promise<boolean> {
    const res = await fetch(`https://payments.example/charge/${orderId}`, {
      method: "POST",
      headers: { "Idempotency-Key": `charge-${orderId}` },
    });
    return res.ok;
  }
}
```

## Primitives

| Intent | API |
|---|---|
| Define a flow | `@SkailFunction()` on a public async instance method |
| Isolate I/O | `@SkailCommand({ retryCount: 2 })` |
| Wait for time | `await Skail.delaySeconds(30)`; `Skail.delay(ms)`, `Skail.delayMinutes(n)` |
| Wait for a signal | `await Skail.waitForEvent<T>(name, id)` |
| Wait for all | `const [x, y] = await Skail.whenAll(a, b)` |
| First to finish | `await Skail.whenAny(a, b)` returns the winning **value** (a delay returns `undefined`) |
| Current task id | `SkailContext.current.taskId` |
| Remote function | `@SkailStub("catalog:v1.0.0/Find")` |

- `whenAll` / `whenAny` accept only promises returned by durable calls — not `.then(...)` chains or
  arbitrary promises. `whenAny` does not cancel the loser; if you must tell a timeout from a reply,
  make the event payload distinguishable from the delay's `undefined`.
- Calling another `@SkailFunction` creates a child task. Commands cannot `delay` or `waitForEvent`.
- Command results must be JSON-serializable, and all I/O a command starts must be awaited.

## The bundle runs in a VM

The bundle runs in a VM per activation. `skail build` rejects static imports of `fs`, `http`, `net`,
`crypto`, `child_process`, `os`, `process` and similar. Load Node modules and drivers with
`await import("pkg")` **inside a command**, and do not read secrets at module top level.
