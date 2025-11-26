"use client";

type Props = {
  sensorIds?: string[];   // e.g., ["floodsense001"]
  all?: boolean;          // export all sensors
  pretty?: boolean;       // human-friendly CSV (local time, rounded)
};

export default function ExportButton({ sensorIds, all = false, pretty = true }: Props) {
  async function handleClick() {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({ from, to });
    if (all) params.set("all", "true");
    if (sensorIds?.length) params.set("sensors", sensorIds.join(","));
    if (pretty) params.set("pretty", "true");

    const url = `/api/export?${params.toString()}`;

    // Force download by fetching, creating a Blob, and using a temporary <a download>
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text();
      alert(`Export failed: ${t}`);
      return;
    }
    const blob = await res.blob();

    // Suggest a nice filename
    const fname =
      res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ??
      `floodsense_export_${new Date().toISOString().slice(0,10)}.csv`;

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  return (
    <button
      onClick={handleClick}
      className="px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
      title="Download last 30 days as CSV"
    >
      Export CSV
    </button>
  );
}
