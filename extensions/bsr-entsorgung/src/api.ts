export const BSR_BASE = "https://umnewforms.bsr.de/p/de.bsr.adressen.app";

export interface Street {
  value: string;
  label: string;
}

export interface CollectionEvent {
  date: string; // YYYY-MM-DD
  summary: string;
  icon: string;
}

export async function searchStreets(q: string): Promise<Street[]> {
  const url = `${BSR_BASE}/streetNames?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Street search failed: ${res.status}`);
  return res.json() as Promise<Street[]>;
}

export async function getAddressId(street: string, houseNumber: string): Promise<string> {
  const searchQuery = `${street}:::${houseNumber}`;
  const url = `${BSR_BASE}/plzSet/plzSet?searchQuery=${encodeURIComponent(searchQuery)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Address lookup failed: ${res.status}`);
  const data = (await res.json()) as Array<{ value: string; label: string }>;
  if (!Array.isArray(data) || data.length === 0) throw new Error("Adresse nicht gefunden");
  return data[0].value;
}

export async function getCalendarICS(addressId: string, year: number, month: number): Promise<string> {
  const url = `${BSR_BASE}/abfuhr/kalender/ics/${addressId}?year=${year}&month=${month}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  return res.text();
}

export function parseICS(ics: string): CollectionEvent[] {
  const events: CollectionEvent[] = [];
  const blocks = ics.split("BEGIN:VEVENT");
  // First block is the VCALENDAR header, skip it
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const dtstart = block.match(/DTSTART(?:;[^:]+)?:(\d{8})/)?.[1];
    const summary = block.match(/SUMMARY:(.+)/)?.[1]?.trim();
    if (!dtstart || !summary) continue;

    const year = dtstart.slice(0, 4);
    const month = dtstart.slice(4, 6);
    const day = dtstart.slice(6, 8);
    const date = `${year}-${month}-${day}`;

    events.push({ date, summary, icon: getBinIcon(summary) });
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

export function getBinIcon(summary: string): string {
  const lower = summary.toLowerCase();
  if (lower.includes("hausmüll") || lower.includes("restmüll") || lower.includes("rest")) return "⚫";
  if (lower.includes("biogut") || lower.includes("bio")) return "🟤";
  if (lower.includes("papier")) return "🔵";
  if (lower.includes("wertstoff") || lower.includes("gelb")) return "🟡";
  if (lower.includes("glas")) return "🟢";
  if (lower.includes("sperr")) return "🔴";
  if (lower.includes("recycling")) return "♻️";
  return "🗑️";
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
