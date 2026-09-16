import { redirect } from 'next/navigation';

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) qs.set(key, v);
  }
  redirect(qs.size > 0 ? `/marketplace?${qs.toString()}` : '/marketplace');
}