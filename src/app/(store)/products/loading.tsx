import { ProductGridSkeleton } from "@/components/store/ProductCard";

export default function Loading() {
  return (
    <div className="container py-8" aria-busy="true">
      <div className="skeleton mb-6 h-8 w-64" />
      <ProductGridSkeleton n={10} />
    </div>
  );
}
