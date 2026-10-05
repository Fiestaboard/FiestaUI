/**
 * Whether this is a development build — where a renderer may be loud about a
 * caller's mistake (a cell grid that does not fit its device, a board
 * override its model does not offer) instead of quietly drawing what it can.
 *
 * The library ships `process.env.NODE_ENV` untouched (Vite leaves it alone
 * in library mode), so the consumer's bundler decides: Next, Vite and
 * webpack substitute the literal, and a production build evaluates to
 * `false` with the check folded away. Without any bundler there is no
 * `process` at all; that throws, and the answer is "not development" — a
 * page loading bare ES modules gets the quiet behaviour, never a crash.
 */
export function isDevBuild(): boolean {
  try {
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}
