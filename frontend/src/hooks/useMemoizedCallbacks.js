import { useCallback, useMemo } from 'react';

/**
 * Custom hook to create memoized callbacks for common list operations
 * Prevents unnecessary re-renders of child components
 */
export const useMemoizedListCallbacks = (handlers = {}) => {
  const {
    onEdit,
    onDelete,
    onView,
    onSelect,
    onFilter,
    onSearch,
    onSort,
    onPaginate
  } = handlers;

  // Memoize edit handler
  const memoizedEdit = useCallback((item) => {
    if (onEdit) onEdit(item);
  }, [onEdit]);

  // Memoize delete handler
  const memoizedDelete = useCallback((item) => {
    if (onDelete) onDelete(item);
  }, [onDelete]);

  // Memoize view handler
  const memoizedView = useCallback((item) => {
    if (onView) onView(item);
  }, [onView]);

  // Memoize select handler
  const memoizedSelect = useCallback((item, selected) => {
    if (onSelect) onSelect(item, selected);
  }, [onSelect]);

  // Memoize filter handler
  const memoizedFilter = useCallback((filterKey, filterValue) => {
    if (onFilter) onFilter(filterKey, filterValue);
  }, [onFilter]);

  // Memoize search handler
  const memoizedSearch = useCallback((query) => {
    if (onSearch) onSearch(query);
  }, [onSearch]);

  // Memoize sort handler
  const memoizedSort = useCallback((sortKey, sortOrder) => {
    if (onSort) onSort(sortKey, sortOrder);
  }, [onSort]);

  // Memoize pagination handler
  const memoizedPaginate = useCallback((page, limit) => {
    if (onPaginate) onPaginate(page, limit);
  }, [onPaginate]);

  // Return memoized object
  return useMemo(() => ({
    onEdit: memoizedEdit,
    onDelete: memoizedDelete,
    onView: memoizedView,
    onSelect: memoizedSelect,
    onFilter: memoizedFilter,
    onSearch: memoizedSearch,
    onSort: memoizedSort,
    onPaginate: memoizedPaginate
  }), [
    memoizedEdit,
    memoizedDelete,
    memoizedView,
    memoizedSelect,
    memoizedFilter,
    memoizedSearch,
    memoizedSort,
    memoizedPaginate
  ]);
};

/**
 * Hook to memoize color/style functions
 */
export const useMemoizedColorFunctions = (colorMap = {}) => {
  return useMemo(() => {
    const getColor = (key, defaultColor = 'secondary') => {
      return colorMap[key] || defaultColor;
    };

    return { getColor };
  }, [colorMap]);
};

/**
 * Hook to memoize filter functions
 */
export const useMemoizedFilters = (items = [], filterConfig = {}) => {
  return useMemo(() => {
    let filtered = [...items];

    // Apply each filter
    Object.entries(filterConfig).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(item => {
          if (Array.isArray(value)) {
            return value.includes(item[key]);
          }
          return item[key] === value;
        });
      }
    });

    return filtered;
  }, [items, filterConfig]);
};

/**
 * Hook to memoize search function
 */
export const useMemoizedSearch = (items = [], searchQuery = '', searchFields = []) => {
  return useMemo(() => {
    if (!searchQuery || searchFields.length === 0) {
      return items;
    }

    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (value === null || value === undefined) return false;
        return value.toString().toLowerCase().includes(query);
      });
    });
  }, [items, searchQuery, searchFields]);
};

/**
 * Hook to memoize sort function
 */
export const useMemoizedSort = (items = [], sortKey = '', sortOrder = 'asc') => {
  return useMemo(() => {
    if (!sortKey) return items;

    const sorted = [...items].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [items, sortKey, sortOrder]);
};
