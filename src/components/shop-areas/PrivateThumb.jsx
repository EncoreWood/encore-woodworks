import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Renders a privately stored image by resolving a short-lived signed URL.
 */
export default function PrivateThumb({ uri, alt = "", className = "" }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (!uri) return;
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 })
      .then(({ signed_url }) => {
        if (!cancelled) setUrl(signed_url);
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!url) return <div className={`bg-slate-100 animate-pulse ${className}`} />;
  return <img src={url} alt={alt} className={className} />;
}