import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Module-level signed-URL cache: file_uri -> { url, expiresAt }
const cache = new Map();

export async function resolveSignedUrl(fileUri) {
  const hit = cache.get(fileUri);
  if (hit && hit.expiresAt > Date.now() + 10_000) return hit.url;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileUri,
    expires_in: 3600,
  });
  cache.set(fileUri, { url: signed_url, expiresAt: Date.now() + 3500_000 });
  return signed_url;
}

// Renders a privately-stored image via a time-limited signed URL
export function SignedImage({ fileUri, alt = "", className = "", onClick }) {
  const [url, setUrl] = useState(() => cache.get(fileUri)?.url || null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await resolveSignedUrl(fileUri);
        if (!cancelled) setUrl(resolved);
      } catch (e) {
        console.error("Failed to sign file url:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [fileUri]);

  if (!url) return <div className={`${className} bg-slate-200 animate-pulse`} />;
  return <img src={url} alt={alt} className={className} onClick={onClick} />;
}

// Opens a privately-stored file in a new tab via a signed URL
export function SignedFileLink({ fileUri, name, className = "" }) {
  const open = async (e) => {
    e.preventDefault();
    try {
      const url = await resolveSignedUrl(fileUri);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };
  return (
    <a href="#" onClick={open} className={className}>
      📎 {name}
    </a>
  );
}