# Skail in C# / .NET

Read [concepts.md](concepts.md) first: everything here assumes replay and determinism.

## Project setup

- Packages: start from the example's `.csproj`. It references `Skail.Platform.Runtime` and
  `Skail.Platform.Analyzer`; the build-time rewriter of the Skail methods (`Skail.Platform.Runtime.Build`)
  comes as a dependency of the runtime package.
- `Program.cs` has `[assembly: VisibleToSkailPlatform]` and calls `builder.UseSkail()`.
- The worker reads `SKAIL_WORKLOAD`, `SKAIL_SIDECAR`, `SKAIL_NAMESPACE` and `SKAIL_KEY` from the
  environment. Keep I/O inside commands even when the client comes from dependency injection.

## Shape of the code

```cs
[assembly: VisibleToSkailPlatform]

public class Orders
{
    [SkailFunction]
    public async SkailTask<string> Fulfill(string orderId)
    {
        var paid = await Charge(orderId);
        if (!paid) return "payment-failed";

        await SkailTask.Delay(TimeSpan.FromMinutes(5));   // durable: the worker can stop meanwhile
        return "shipped";
    }

    [SkailCommand(retryCount: 2)]
    private async SkailTask<bool> Charge(string orderId)
    {
        // I/O here, with an idempotency key the payment provider enforces.
        return true;
    }
}
```

Functions and commands return `SkailTask` / `SkailTask<T>`, never `Task`.

## Primitives

| Intent | API |
|---|---|
| Define a flow | `[SkailFunction]` on a `public async SkailTask<T>` method |
| Isolate I/O | `[SkailCommand(retryCount: 2)]` |
| Wait for time | `await SkailTask.DelaySeconds(30)`, `await SkailTask.Delay(TimeSpan)` |
| Wait for a signal | `await SkailTask.WaitForEvent<T>(name, id)` |
| Wait for all | `await SkailTask.WhenAll(a, b)` |
| First to finish | `await SkailTask.WhenAny(a, b)` returns the winning `SkailTask` |
| Current task id | `SkailContext.Current.TaskId` |
| Remote function | `[SkailStub("catalog:v1.0.0/Find")]` |

`WhenAny` does not cancel the loser.

## The analyzer

`Skail.Platform.Analyzer` reports the common mistakes at build time — treat its warnings as errors:

- **SKAIL004**: a branch in a function depends on something non-deterministic.
- **SKAIL006**: a command calls another command.

A build that passes the analyzer can still be non-deterministic (a value read from a static, a
dictionary iterated in hash order); [concepts.md](concepts.md) has the full rule.
