import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" }, robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="admin min-h-screen">{children}</div>;
}
