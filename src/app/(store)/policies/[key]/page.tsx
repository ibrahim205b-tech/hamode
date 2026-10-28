import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";

const LABELS: Record<string, string> = { shipping: "سياسة التوصيل", returns: "الاستبدال والإرجاع", warranty: "الضمان", privacy: "سياسة الخصوصية", terms: "الشروط والأحكام" };
type Props = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  return LABELS[key] ? { title: LABELS[key], alternates: { canonical: `/policies/${key}` } } : {};
}

export default async function PolicyPage({ params }: Props) {
  const { key } = await params;
  const s = await getSettings();
  const text = (s.policies as Record<string, string>)[key];
  if (!LABELS[key] || !text?.trim()) notFound();
  return (
    <div className="container max-w-3xl py-10">
      <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">{LABELS[key]}</h1>
      <div className="card prose-store whitespace-pre-line p-6">{text}</div>
    </div>
  );
}
