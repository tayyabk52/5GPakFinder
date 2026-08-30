import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";

export type BreadcrumbItem = { name: string; href: `/${string}` | "/" };

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };

  return <>
    <JsonLd data={structuredData} />
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
      {items.map((item, index) => <span key={item.href} className="flex items-center gap-2">
        {index > 0 && <span aria-hidden>/</span>}
        {index === items.length - 1
          ? <span aria-current="page" className="text-slate-800">{item.name}</span>
          : <Link href={item.href} className="hover:text-slate-950 hover:underline">{item.name}</Link>}
      </span>)}
    </nav>
  </>;
}
