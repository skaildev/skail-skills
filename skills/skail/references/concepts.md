# Skail concepts: the execution model

Read this before writing or changing Skail code. The language files
([csharp.md](csharp.md), [typescript.md](typescript.md)) assume it.

## Replay, not a frozen stack

The `await` is not a frozen line of code. Skail does not restore the stack, closures, promises or
objects of the previous worker: it **re-executes the function from the start** and matches each durable
step against the history. A completed step returns its recorded result (or error) without running
again; a pending step may wait again; a new step is executed. A local variable such as
`const response = await this.callApi(...)` exists again because the command's result is replayed.

Delays and event waits survive the worker shutting down; the resume runs when a worker for that
workload is available. A delay is a minimum, not a precise schedule. Calling another `SkailFunction`
(even in the same workload) is a durable call with its own Task. Logs written in the orchestration may
reappear on replay — never use logs, class fields or globals as proof that an effect happened.

## The rule that matters: functions are deterministic

With the same arguments and the same history, a function must reach the same sequence of durable calls.
Branches and loops may depend on inputs, pure computation, or results returned by commands, stubs and
events. Inside a function body **never**:

- read the clock (`Date.now()`, `new Date()`, `DateTime.Now`, `Stopwatch`), use randomness
  (`Math.random()`, `crypto.randomUUID()`, `Guid.NewGuid()`, `Random`), or read configuration that can
  change;
- do I/O: HTTP, files, databases, `process.env`, an AI model;
- use `setTimeout`, `Task.Delay`, `Promise.all`/`Promise.race` or `Task.WhenAll`/`Task.WhenAny` — use the
  durable equivalents;
- branch on mutable globals or on anything not returned by a durable call.

Need the time or a random id? Get it from a command and reuse the recorded result.

Inserting, removing, reordering or renaming steps that running Tasks already passed breaks their replay
(`SkailNonDeterministicError`). Append new steps at the end, or ship a new workload version for
incompatible changes — a new version does not migrate the history of running Tasks.

## Commands, idempotency and failures

1. A command performs the effect (charge, read a database, call a model). Its result is persisted before
   the function continues; on replay its body does not run again.
2. **Durable execution is not exactly-once for I/O.** If the effect happened but the result was not yet
   persisted, a redelivery runs the command again. Every mutation needs a stable idempotency key per
   logical operation, enforced at the destination (an API idempotency key, a unique constraint). The
   `TaskId` alone does not tell apart two intentional charges in the same Task — combine it with
   something that names the operation.
3. `retryCount: N` allows the first execution plus up to N retries: with `retryCount: 2`, a command
   that keeps failing runs **three** times. After the last one, the command's `await` throws — also on
   replay.
4. A function that exhausts its policy with an unhandled exception ends in `CompletedError`. That error
   is **not** returned to a caller as an RPC exception: the call stays pending so the task can be
   retried after a fix. When a caller must decide on an expected failure, return it as data
   (`{ success, value, errorCode, errorMessage }`).
5. Commands are not workflows: no delays, event waits, stubs or orchestration inside them, and a command
   does not call another command. Await every I/O they start, use timeouts, and return small,
   serializable values — never connections, clients, streams, functions or secrets.

## Events

A function waits for an event by name and id (`waitForEvent("approved", orderId)`); anything outside
fires it with the same name and id. The order does not matter: **an event fired before the function
starts waiting is kept** and delivered when the wait arrives. Each fire is delivered to exactly one wait,
in the order they were fired, per name and id — three fires before the function waits serve three
waits; they are not merged or overwritten. Use an id that names the one thing being waited for (the
order id, the document id), so fires meant for different runs never meet.

## Calling other functions

A `SkailStub` is the typed contract of a remote `SkailFunction` (`catalog:v1.0.0/Find`). Calling it
creates a child Task in the target workload; the caller waits durably for its result.

## Reading progress

Show progress to users from a read model written by idempotent commands — never read the task history
as a business database. The Monitor is for diagnosis.

## Check before saying it works

1. Start from the project: SDK, version, build setup, workload, existing examples. Do not invent
   configuration.
2. Design before coding: where the Task starts and ends, which steps need I/O, time, a signal or RPC.
3. Test success, waiting and resume with the same `TaskId`; stop the worker after a confirmed command,
   restart it and count the external calls. Test exhausted retries and redelivery.
4. Say what was tested. In-memory tests (`@skail/testing`) cover logic and replay, not transport, real
   I/O or deployment.
