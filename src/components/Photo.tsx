/* eslint-disable @next/next/no-img-element */
export function Photo({ fileName, alt, className }: { fileName: string; alt: string; className?: string }) {
  return <img src={`/media/${fileName}`} alt={alt} className={className} loading="lazy" />;
}
