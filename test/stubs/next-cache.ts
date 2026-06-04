// Test stub for `next/cache`.
//
// `unstable_cache` wraps a function and memoizes it via the Next.js data cache.
// Under Vitest there is no Next runtime, so we replace it with a pass-through
// that simply returns the original function untouched. `revalidateTag` and
// `revalidatePath` become no-ops.

export function unstable_cache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult> | TResult,
): (...args: TArgs) => Promise<TResult> | TResult {
  return fn;
}

export function revalidateTag(_tag: string): void {}
export function revalidatePath(_path: string, _type?: string): void {}
export function unstable_noStore(): void {}
