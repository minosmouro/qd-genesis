import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';
import Checkbox from './Checkbox';

// Definição dos tipos dentro do arquivo para melhor portabilidade
export interface TableColumn<T> {
  key: (keyof T & string) | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  selectedIds?: (string | number)[];
  onSort?: (key: keyof T, direction: 'asc' | 'desc') => void;
  sortKey?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

const Table = <T extends { id: string | number }>({
  // Garante que T tem uma propriedade id
  data,
  columns,
  loading = false,
  selectable = false,
  onSelectionChange,
  selectedIds = [],
  onSort,
  sortKey,
  sortDirection,
}: TableProps<T>) => {
  const handleSelectAll = () => {
    if (onSelectionChange) {
      if (selectedIds.length === data.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(data.map(item => item.id));
      }
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (onSelectionChange) {
      const newSelectedIds = selectedIds.includes(id)
        ? selectedIds.filter(selectedId => selectedId !== id)
        : [...selectedIds, id];
      onSelectionChange(newSelectedIds);
    }
  };

  const handleSort = (key: keyof T) => {
    if (onSort && columns.find(c => c.key === key)?.sortable) {
      const direction =
        sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, direction);
    }
  };

  const renderCell = (column: TableColumn<T>, item: T) => {
    const value = item[column.key as keyof T];
    return column.render
      ? column.render(value, item)
      : (value as React.ReactNode);
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-border/50"></div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-surface border-t border-border"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border table-fixed">
          <thead className="bg-background/50">
            <tr>
              {selectable && (
                <th className="px-6 py-3 text-left w-16">
                  <Checkbox
                    checked={
                      selectedIds.length === data.length && data.length > 0
                    }
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider',
                    column.sortable && 'cursor-pointer hover:bg-border/50'
                  )}
                  onClick={() => handleSort(column.key as keyof T)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="flex flex-col opacity-50 group-hover:opacity-100">
                        <ChevronUp
                          className={cn(
                            'h-3 w-3',
                            sortKey === column.key &&
                              sortDirection === 'asc' &&
                              'text-primary'
                          )}
                        />
                        <ChevronDown
                          className={cn(
                            'h-3 w-3 -mt-1',
                            sortKey === column.key &&
                              sortDirection === 'desc' &&
                              'text-primary'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={selectable ? columns.length + 1 : columns.length}
                  className="px-6 py-12 text-center text-text-secondary"
                >
                  Nenhum item encontrado
                </td>
              </tr>
            ) : (
              data.map(item => (
                <tr
                  key={item.id}
                  className={cn(
                    'transition-colors',
                    selectedIds.includes(item.id)
                      ? 'bg-primary/10'
                      : 'hover:bg-border/30'
                  )}
                >
                  {selectable && (
                    <td className="px-6 py-4 whitespace-nowrap w-16">
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                        aria-label={`Select row ${item.id}`}
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td
                      key={String(column.key)}
                      className="px-6 py-4 text-sm text-text-primary"
                    >
                      {renderCell(column, item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;
