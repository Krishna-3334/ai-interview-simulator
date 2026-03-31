/**
 * Maps browser fetch failures to actionable copy (dev server, URL, etc.).
 */
export function describeClientNetworkError(error: unknown): string {
  if (error instanceof TypeError) {
    return clientUnreachableMessage();
  }
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    if (
      m.includes("failed to fetch") ||
      m.includes("load failed") ||
      m.includes("networkerror") ||
      m.includes("network request failed") ||
      m.includes("connection refused") ||
      m.includes("err_connection")
    ) {
      return clientUnreachableMessage();
    }
  }
  return error instanceof Error ? error.message : "Something went wrong";
}

function clientUnreachableMessage(): string {
  return [
    "The page could not reach the app server (connection failed).",
    "Fix: open a terminal in the project folder, run `npm run dev`, wait until it says Ready, then open http://localhost:3000 in the same browser.",
    "If you already use another port, use that URL. Try http://127.0.0.1:3000 if localhost fails.",
  ].join(" ");
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(describeClientNetworkError(e));
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error(
      res.ok ? "Invalid JSON from server — check the terminal for errors." : `Server error (${res.status}).`,
    );
  }

  if (!res.ok) {
    const err = (data as { error?: string })?.error;
    throw new Error(typeof err === "string" ? err : `Request failed (${res.status}).`);
  }

  return data as T;
}
