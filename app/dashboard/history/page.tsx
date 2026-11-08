import { redirect } from "next/navigation";

export default function HistoryRedirectPage() {
  redirect("/dashboard/settings/history");
}
