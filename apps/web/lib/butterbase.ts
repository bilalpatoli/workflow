// Butterbase REST client (server-only).
//
// All DB access goes through server components / server actions, using the
// service key. Never import this from a client component.

import "server-only";

const apiUrl = process.env.BUTTERBASE_API_URL;
const serviceKey = process.env.BUTTERBASE_SERVICE_KEY;

if (!apiUrl) {
  throw new Error("BUTTERBASE_API_URL is not set");
}
if (!serviceKey) {
  throw new Error("BUTTERBASE_SERVICE_KEY is not set");
}

const baseHeaders = {
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

type Filters = Record<string, string>;

type SelectOptions = {
  filters?: Filters;
  order?: string;
  limit?: number;
  select?: string;
};

function buildUrl(table: string, params?: Record<string, string | number>) {
  const url = new URL(`${apiUrl}/${table}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  return url;
}

export async function selectRows<T>(table: string, options: SelectOptions = {}): Promise<T[]> {
  const url = buildUrl(table);
  if (options.filters) {
    for (const [k, v] of Object.entries(options.filters)) url.searchParams.set(k, v);
  }
  if (options.order) url.searchParams.set("order", options.order);
  if (options.limit !== undefined) url.searchParams.set("limit", String(options.limit));
  if (options.select) url.searchParams.set("select", options.select);

  const res = await fetch(url, { headers: baseHeaders, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Butterbase select ${table} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function selectOne<T>(table: string, filters: Filters): Promise<T | null> {
  const rows = await selectRows<T>(table, { filters, limit: 1 });
  return rows[0] ?? null;
}

export async function insertRow<T>(table: string, data: Record<string, unknown>): Promise<T> {
  const url = buildUrl(table);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...baseHeaders, Prefer: "return=representation" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Butterbase insert ${table} failed: ${res.status} ${await res.text()}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function updateRows<T>(
  table: string,
  filters: Filters,
  data: Record<string, unknown>
): Promise<T[]> {
  const url = buildUrl(table);
  for (const [k, v] of Object.entries(filters)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...baseHeaders, Prefer: "return=representation" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Butterbase update ${table} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// ---- Domain types matching the Butterbase schema ----

export type Company = {
  id: string;
  name: string;
  created_at: string;
};

export type Sop = {
  id: string;
  company_id: string;
  title: string;
  source_type: "text" | "loom" | "file";
  source_text: string | null;
  source_url: string | null;
  created_at: string;
};

export type QuizItem = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  rationale: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
};

export type Training = {
  id: string;
  sop_id: string;
  status: "pending" | "generating" | "ready" | "failed";
  video_url: string | null;
  duration_seconds: number | null;
  quiz_json: QuizItem[] | null;
  checklist_json: ChecklistItem[] | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type Trainee = {
  id: string;
  company_id: string;
  name: string;
  email: string;
  created_at: string;
};

export type QuizAttempt = {
  id: string;
  training_id: string;
  trainee_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  answers_json: Array<{ qId: string; selectedIndex: number; correct: boolean }> | null;
};
