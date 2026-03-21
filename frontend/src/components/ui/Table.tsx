import React from 'react';

interface TableWrapperProps { className?: string; children: React.ReactNode }
interface TableHeadProps { className?: string; children: React.ReactNode }
interface TableBodyProps { className?: string; children: React.ReactNode }
interface TableRowProps { className?: string; children: React.ReactNode; onClick?: () => void }
interface TableHeaderCellProps { className?: string; children: React.ReactNode }
interface TableCellProps { className?: string; children: React.ReactNode; colSpan?: number }
interface TableFooterProps { className?: string; children: React.ReactNode }

export function Table({ className = '', children }: TableWrapperProps) {
  return (
    <div className={['w-full overflow-x-auto', className].join(' ')}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ className = '', children }: TableHeadProps) {
  return <thead className={className}>{children}</thead>;
}

export function TableBody({ className = '', children }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ className = '', children, onClick }: TableRowProps) {
  return (
    <tr
      className={[
        'border-b border-[var(--color-neutral-100)] last:border-0',
        'hover:bg-[var(--color-neutral-50)]/70 transition-colors duration-100',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = '', children }: TableHeaderCellProps) {
  return (
    <th
      className={[
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        'text-[var(--color-neutral-500)] bg-[var(--color-neutral-50)]',
        'border-b border-[var(--color-neutral-200)]',
        'first:pl-6 last:pr-6',
        className,
      ].join(' ')}
    >
      {children}
    </th>
  );
}

export function TableCell({ className = '', children, colSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={[
        'px-4 py-3.5 text-[var(--color-neutral-700)] align-middle',
        'first:pl-6 last:pr-6',
        className,
      ].join(' ')}
    >
      {children}
    </td>
  );
}

export function TableFooter({ className = '', children }: TableFooterProps) {
  return (
    <tfoot className={['border-t border-[var(--color-neutral-200)]', className].join(' ')}>
      {children}
    </tfoot>
  );
}
