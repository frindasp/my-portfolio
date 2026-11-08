"use client";

import { useEffect, useState } from "react";
import { getHistoryActivities } from "@/app/actions/history";
import { Combobox } from "@/components/ui/combobox";
import { History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZES = [10, 20, 40, 80, 100];

export default function SettingsHistoryPage() {
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tight flex items-center gap-3">
            <HistoryIcon className="h-8 w-8 text-primary" />
            History Activity
          </h1>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">
            Riwayat log aktivitas autentikasi dan akun Anda
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm bg-card border px-3 py-1.5 rounded-2xl">
          <span className="text-muted-foreground text-xs font-semibold">Rows:</span>
          <Combobox
            options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
            value={String(pageSize)}
            onChange={(val) => {
              setPage(1);
              setPageSize(Number(val));
            }}
            className="w-20 h-8 text-xs font-semibold rounded-lg bg-background"
            placeholder={String(pageSize)}
            searchPlaceholder="Rows..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border bg-card shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground border-b text-[10px]">
            <tr>
              <th className="p-4">Waktu</th>
              <th className="p-4">Action</th>
              <th className="p-4">Deskripsi</th>
              <th className="p-4">Device</th>
              <th className="p-4">Lokasi</th>
              <th className="p-4">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Memuat data riwayat...
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Belum ada riwayat aktivitas.
                </td>
              </tr>
            ) : (
              data.items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-mono text-[11px] whitespace-nowrap">
                    {format(new Date(item.createdAt), "d/M/yyyy, HH.mm.ss")}
                  </td>
                  <td className="p-4 font-bold text-primary whitespace-nowrap">{item.action}</td>
                  <td className="p-4 max-w-xs">{item.description}</td>
                  <td className="p-4 whitespace-nowrap">{item.device || "-"}</td>
                  <td className="p-4 whitespace-nowrap">{item.location || "-"}</td>
                  <td className="p-4 font-mono text-[11px] whitespace-nowrap">{item.ip || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

