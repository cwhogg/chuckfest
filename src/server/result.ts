export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string }

/** Run an action body and turn thrown errors into a message the UI can show. */
export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    // redirect() and notFound() signal through errors; let them through.
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_')) throw err
    return { ok: false, error: err instanceof Error ? err.message : 'Something went wrong' }
  }
}
