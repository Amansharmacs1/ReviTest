import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export const Pagination = ({ pagination, onPageChange, isLoading = false }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white text-xs text-slate-500">
      <div>
        Showing <span className="font-semibold text-navy">{startItem}</span> to{' '}
        <span className="font-semibold text-navy">{endItem}</span> of{' '}
        <span className="font-semibold text-navy">{total}</span> records
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!pagination.hasPrevPage || isLoading}
          icon={ChevronLeft}
        >
          Previous
        </Button>

        <span className="px-2 font-mono font-medium text-slate-700">
          Page {page} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!pagination.hasNextPage || isLoading}
          icon={ChevronRight}
          iconPosition="right"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
