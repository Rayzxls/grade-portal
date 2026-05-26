'use client';

interface PrintButtonProps {
  label?: string;
  className?: string;
}

export function PrintButton({ label = 'พิมพ์เอกสาร', className = 'btn-secondary btn-sm' }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`print-hide ${className}`}
      title={label}
    >
      <span aria-hidden="true">⎙</span>
      <span>{label}</span>
    </button>
  );
}
