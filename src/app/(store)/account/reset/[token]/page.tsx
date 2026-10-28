import type { Metadata } from "next";
import { ResetForm } from "../../AuthForms";

export const metadata: Metadata = { title: "إعادة تعيين كلمة المرور", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="container max-w-md py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="mb-6 text-2xl font-bold text-white">كلمة مرور جديدة</h1>
        <ResetForm token={token} />
      </div>
    </div>
  );
}
