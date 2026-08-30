import StatusDashboard from "@/features/network-status/components/StatusDashboard";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Pakistan Mobile Network Status",
  description: "Check privacy-preserving community availability signals for Jazz, Zong, and Ufone / Onic in Pakistan. Signals are not operator-confirmed outage notices.",
  path: "/network-status",
});

export default function NetworkStatusPage() { return <StatusDashboard />; }
