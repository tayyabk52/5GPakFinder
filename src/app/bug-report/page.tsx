import BugReportPage from "@/features/bug-reports/BugReportPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Report a Platform Problem",
  description: "Send an anonymous technical problem report to the 5GPak team.",
  path: "/bug-report",
  index: false,
});

export default function Page() { return <BugReportPage />; }
