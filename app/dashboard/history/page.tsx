"use client";

import { useEffect, useState } from "react";
import { getHistoryActivities } from "@/app/actions/history";
import { Button } from "@/components/ui/button";

const PAGE_SIZES = [10, 20, 40, 80, 100];

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ items: any[]; totalPages: number; total: number }>({
    items: [],
    totalPages: 0,
    total: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getHistoryActivities(page, pageSize);
      setData({ items: res.items, totalPages: res.totalPages, total: res.total });
      setLoading(false);
    };
    load();
  }, [page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">History Activity</h1>
        <div className="flex items-center gap-2 text-sm">
          <span>Rows:</span>
          <select
            className="bg-card border rounded-lg px-3 py-1"
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-3">Waktu</th>
              <th className="p-3">Action</th>
              <th className="p-3">Deskripsi</th>
              <th className="p-3">Device</th>
              <th className="p-3">Lokasi</th>
              <th className="p-3">IP</th>
              <th className="p-3">Route</th>
            </tr>
          </thead>
          <tbody>
            {!loading && data.items.length === 0 && (
              <tr>
                <td className="p-4 text-muted-foreground" colSpan={7}>Belum ada history aktivitas.</td>
              </tr>
            )}
            {data.items.map((item) => (
              <tr key={item.id} className="border-t border-border/60">
                <td className="p-3 whitespace-nowrap">{new Date(item.createdAt).toLocaleString("id-ID")}</td>
                <td className="p-3 font-semibold">{item.action.replaceAll("_", " ")}</td>
                <td className="p-3 max-w-md truncate" title={item.description || ""}>{item.description || "-"}</td>
                <td className="p-3">{item.deviceType || "Unknown"}</td>
                <td className="p-3">{item.location || "Unknown"}</td>
                <td className="p-3">{item.ipAddress || "Unknown"}</td>
                <td className="p-3">{item.route || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Total: {data.total}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Prev</Button>
          <span className="text-sm">Page {page} / {Math.max(data.totalPages, 1)}</span>
          <Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
