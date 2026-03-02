import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { CollectionEvent, formatDate, getAddressId, getCalendarICS, parseICS } from "./api";

interface Preferences {
  street: string;
  houseNumber: string;
}

const BSR_CALENDAR_URL = "https://www.bsr.de/abfuhrkalender";

type LoadState = "idle" | "loading" | "done" | "error";

function getUpcomingMonths(): Array<{ year: number; month: number }> {
  const now = new Date();
  return [
    { year: now.getFullYear(), month: now.getMonth() + 1 },
    {
      year: now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear(),
      month: now.getMonth() === 11 ? 1 : now.getMonth() + 2,
    },
  ];
}

function groupByDate(events: CollectionEvent[]): Map<string, CollectionEvent[]> {
  const map = new Map<string, CollectionEvent[]>();
  for (const event of events) {
    const existing = map.get(event.date) ?? [];
    existing.push(event);
    map.set(event.date, existing);
  }
  return map;
}

export default function CollectionCalendar() {
  const { street, houseNumber } = getPreferenceValues<Preferences>();
  const [state, setState] = useState<LoadState>("idle");
  const [events, setEvents] = useState<CollectionEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!street || !houseNumber) return;
    setState("loading");

    async function load() {
      try {
        const addressId = await getAddressId(street, houseNumber);
        const months = getUpcomingMonths();
        const icsResults = await Promise.all(months.map(({ year, month }) => getCalendarICS(addressId, year, month)));
        const allEvents = icsResults.flatMap(parseICS);
        // Only show future events (from today)
        const today = new Date().toISOString().slice(0, 10);
        const upcoming = allEvents.filter((e) => e.date >= today);
        setEvents(upcoming);
        setState("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    }

    load();
  }, [street, houseNumber]);

  // No address configured
  if (!street || !houseNumber) {
    return (
      <List>
        <List.EmptyView
          title="Adresse nicht eingestellt"
          description="Bitte trage deine Berliner Adresse in den Einstellungen ein."
          icon={Icon.House}
          actions={
            <ActionPanel>
              <Action title="Einstellungen ÖFfnen" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (state === "error") {
    return (
      <List>
        <List.EmptyView
          title="Fehler beim Laden"
          description={errorMsg || "Abfuhrkalender konnte nicht geladen werden."}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="BSR-Kalender ÖFfnen" url={BSR_CALENDAR_URL} icon={Icon.Globe} />
              <Action title="Einstellungen ÖFfnen" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const grouped = groupByDate(events);
  const sortedDates = [...grouped.keys()].sort();

  return (
    <List isLoading={state === "loading"} navigationTitle={`${street} ${houseNumber}`}>
      {sortedDates.length === 0 && state === "done" ? (
        <List.EmptyView
          title="Keine Abholtermine gefunden"
          description="Für die nächsten zwei Monate sind keine Abholtermine eingetragen."
          icon={Icon.Calendar}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="BSR-Kalender ÖFfnen" url={BSR_CALENDAR_URL} icon={Icon.Globe} />
            </ActionPanel>
          }
        />
      ) : (
        sortedDates.map((date) => {
          const dayEvents = grouped.get(date)!;
          const label = formatDate(date);
          const icons = dayEvents.map((e) => e.icon).join(" ");
          const summaries = dayEvents.map((e) => e.summary).join(", ");

          return (
            <List.Item
              key={date}
              title={label}
              subtitle={icons + "  " + summaries}
              icon={Icon.Calendar}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Datum Kopieren"
                    content={`${label}: ${summaries}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.OpenInBrowser title="BSR-Kalender ÖFfnen" url={BSR_CALENDAR_URL} icon={Icon.Globe} />
                  <Action
                    title="Einstellungen ÖFfnen"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
