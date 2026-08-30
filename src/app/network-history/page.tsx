import HistoryDashboard from "@/features/network-status/components/HistoryDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pakistan Mobile Network Status History",
  description: "Review recent community-reported mobile network incident trends and issue types for Jazz, Zong, and Ufone / Onic across Pakistan.",
  path: "/network-history",
});

export default function NetworkHistoryPage() { return <HistoryDashboard />; }
