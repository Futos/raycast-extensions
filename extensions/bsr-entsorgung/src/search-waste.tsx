import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";

const WASTE_JSON_URL = "https://www.bsr.de/abc-synonyms.json";
const BSR_BASE_URL = "https://www.bsr.de/";

interface WasteItem {
  id: string;
  synonymTitle: string;
  fractionTitle: string;
  synonymDisposalPositive: string[];
  iconColorVariant: string;
  widgetsText: [string, string][];
}

function getColorVariantIcon(variant: string): string {
  switch (variant) {
    case "grey":
      return "⚫";
    case "brown":
      return "🟤";
    case "blue":
      return "🔵";
    case "yellow":
      return "🟡";
    case "green":
      return "🟢";
    case "brick":
      return "♻️";
    default:
      return "🗑️";
  }
}

function getColorVariantColor(variant: string): Color {
  switch (variant) {
    case "grey":
      return Color.SecondaryText;
    case "brown":
      return Color.Orange;
    case "blue":
      return Color.Blue;
    case "yellow":
      return Color.Yellow;
    case "green":
      return Color.Green;
    default:
      return Color.PrimaryText;
  }
}

function buildDetailUrl(item: WasteItem): string {
  const slug = item.synonymTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-äöüß]/g, "");
  return `${BSR_BASE_URL}${slug}-${item.id}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function SearchWaste() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, error } = useFetch<WasteItem[]>(WASTE_JSON_URL, {
    keepPreviousData: true,
    onError: () => {
      // Fall through to browser fallback
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = searchText.toLowerCase();
    if (!query) return data;
    return data.filter(
      (item) => item.synonymTitle?.toLowerCase().includes(query) || item.fractionTitle?.toLowerCase().includes(query),
    );
  }, [data, searchText]);

  const browserSearchAction = (
    <Action.OpenInBrowser
      title="Auf BSR.de Suchen"
      url={`${BSR_BASE_URL}suche?q=${encodeURIComponent(searchText || "Abfall")}`}
      icon={Icon.Globe}
    />
  );

  if (error && !data) {
    return (
      <List
        searchBarPlaceholder="Abfallart eingeben (z.B. Pfanne, Batterie...)"
        onSearchTextChange={setSearchText}
        throttle
      >
        <List.EmptyView
          title="BSR-Datenbank nicht verfügbar"
          description={searchText ? `Auf BSR.de nach "${searchText}" suchen` : "Auf BSR.de suchen"}
          icon={Icon.Globe}
          actions={<ActionPanel>{browserSearchAction}</ActionPanel>}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Abfallart eingeben (z.B. Pfanne, Batterie...)"
      onSearchTextChange={setSearchText}
      throttle
    >
      {filtered.length === 0 && !isLoading ? (
        <List.EmptyView
          title={searchText ? `Nichts gefunden für "${searchText}"` : "Abfallart eingeben"}
          description="Auf BSR.de suchen"
          icon={Icon.MagnifyingGlass}
          actions={<ActionPanel>{browserSearchAction}</ActionPanel>}
        />
      ) : (
        filtered.map((item) => {
          const binIcon = getColorVariantIcon(item.iconColorVariant);
          const binColor = getColorVariantColor(item.iconColorVariant);
          const disposal = item.synonymDisposalPositive?.join(", ") ?? "";
          const tipHtml = item.widgetsText?.[0]?.[1] ?? "";
          const tip = tipHtml ? stripHtml(tipHtml) : "";
          return (
            <List.Item
              key={item.id}
              title={item.synonymTitle}
              subtitle={item.fractionTitle}
              accessories={[
                {
                  tag: { value: binIcon + (disposal ? "  " + disposal : ""), color: binColor },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Auf BSR.de Ansehen" url={buildDetailUrl(item)} icon={Icon.Globe} />
                  {tip && (
                    <Action.CopyToClipboard
                      title="Entsorgungshinweis Kopieren"
                      content={tip}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
