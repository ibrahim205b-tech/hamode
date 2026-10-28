"use client";

export function AutoSubmitSelect({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][] }) {
  return (
    <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
