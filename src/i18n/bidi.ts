/** Isolate Latin runs without changing their visible copy or reversing acronyms. */
export function isolateLatin(text: string): string {
  if (!/[\u0600-\u06ff]/.test(text) || /[\u2066-\u2069]/.test(text)) return text;
  return text.replace(/[A-Za-z0-9][A-Za-z0-9@.+/:_&() -]*[A-Za-z0-9)]|[A-Za-z0-9]/g, (run) => `\u2066${run.trimEnd()}\u2069${run.endsWith(' ') ? ' ' : ''}`);
}
