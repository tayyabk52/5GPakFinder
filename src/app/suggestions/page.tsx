import SuggestionPage from "@/features/suggestions/SuggestionPage";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Suggest a 5GPak Feature",
  description: "Send an anonymous, structured product suggestion to the 5GPak team.",
  path: "/suggestions",
  index: false,
});

export default function Page() { return <SuggestionPage />; }
