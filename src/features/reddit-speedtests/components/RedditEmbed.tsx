"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MessageSquareText } from "lucide-react";

export default function RedditEmbed({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    const script = document.createElement("script");
    script.src = "https://embed.reddit.com/widgets.js";
    script.async = true;
    script.dataset.redditEmbed = "true";
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [loaded]);
  if (!loaded) return <div className="border border-slate-200 bg-slate-50 p-5"><MessageSquareText size={22} className="text-[#d63c00]"/><h2 className="mt-3 text-lg font-bold">Reddit source preview</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Loading the preview connects your browser to Reddit. The source link remains available if the post was removed or embedding is unavailable.</p><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setLoaded(true)} className="min-h-11 bg-[#FF4500] px-4 text-sm font-bold text-white">Load Reddit post</button><a href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800">Open source <ExternalLink size={15}/></a></div></div>;
  return <div className="min-h-48 border border-slate-200 bg-white p-3"><blockquote className="reddit-embed-bq" data-embed-theme="light"><a href={url}>View the source post on Reddit</a></blockquote></div>;
}
