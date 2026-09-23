import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="h-section mb-2">Page not found</h1>
        <Link href="/" className="text-brand underline">Go home</Link>
      </div>
    </div>
  );
}
