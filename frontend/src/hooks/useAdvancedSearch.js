import { useState, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';

/**
 * Advanced Search Hook with Comprehensive Functionality
 * Provides debounced search, filter history, smart suggestions, and real-time filtering
 * 
 * Features:
 * - Debounced search input (300ms delay)
 * - Search history with persistence
 * - Smart filter suggestions based on data
 * - Real-time filter application
 * - Filter combination validation
 * - Performance optimization
 */
export const useAdvancedSearch = ({
  initialFilters = {},
  onFilterChange,
  filterOptions = {},
  debounceDelay = 300
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [filterSuggestions, setFilterSuggestions] = useState([]);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(savedHistory.slice(-10)); // Keep last 10 searches
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      if (onFilterChange) {
        onFilterChange('search', term);
      }
      
      // Save to search history if not empty
      if (term.trim()) {
        const newHistory = [
          ...searchHistory.filter(h => h.term !== term),
          {
            term,
            timestamp: Date.now(),
            filters: { ...activeFilters }
          }
        ].slice(-10);
        
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }
    }, debounceDelay),
    [onFilterChange, searchHistory, activeFilters, debounceDelay]
  );

  // Handle search input change
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    debouncedSearch('');
  }, [debouncedSearch]);

  // Generate smart suggestions based on current data and filters
  const generateSmartSuggestions = useCallback(() => {
    const suggestions = [];

    // Client-focused suggestions (primary feature)
    if (filterOptions.clients?.length > 0) {
      // VIP clients suggestion
      suggestions.push({
        id: 'vip-clients',
        type: 'client',
        label: 'Show VIP Clients Only',
        description: 'Filter work for high-priority clients',
        icon: '⭐',
        action: () => onFilterChange('clientPriority', 'vip'),
        priority: 1
      });

      // Removed individual client suggestions - not practical for UI
      // Users can select clients from the dropdown filter instead
    }

    // Practical filter suggestions
    suggestions.push(
      {
        id: 'overdue-work',
        type: 'status',
        label: 'Overdue Work',
        description: 'Show work that needs immediate attention',
        icon: '⚠️',
        action: () => onFilterChange('status', 'overdue'),
        priority: 1
      },
      {
        id: 'this-week',
        type: 'date',
        label: 'This Week',
        description: 'Focus on current week deliverables',
        icon: '📅',
        action: () => {
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          
          onFilterChange('startDate', startOfWeek.toISOString().split('T')[0]);
          onFilterChange('endDate', endOfWeek.toISOString().split('T')[0]);
        },
        priority: 2
      },
      {
        id: 'in-progress',
        type: 'status',
        label: 'In Progress',
        description: 'Show currently active work items',
        icon: '🔄',
        action: () => onFilterChange('status', 'in-progress'),
        priority: 3
      },
      {
        id: 'high-priority',
        type: 'priority',
        label: 'High Priority',
        description: 'Show urgent and high priority items',
        icon: '🔥',
        action: () => onFilterChange('priority', 'high'),
        priority: 4
      },
      {
        id: 'completed-today',
        type: 'status',
        label: 'Completed',
        description: 'Show completed work items',
        icon: '✅',
        action: () => onFilterChange('status', 'completed'),
        priority: 5
      }
    );

    // Project-based suggestions
    if (filterOptions.projects?.length > 0) {
      const activeProjects = filterOptions.projects.slice(0, 2);
      activeProjects.forEach((project, index) => {
        suggestions.push({
          id: `project-${project._id}`,
          type: 'project',
          label: `${project.name}`,
          description: `Filter by ${project.name} project`,
          icon: '📋',
          action: () => onFilterChange('project', project._id),
          priority: 4 + index
        });
      });
    }

    // Sort by priority and return top suggestions
    return suggestions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 6);
  }, [filterOptions, onFilterChange]);

  // Update suggestions when filter options change
  useEffect(() => {
    const suggestions = generateSmartSuggestions();
    setFilterSuggestions(suggestions);
  }, [generateSmartSuggestions]);

  // Search within specific fields
  const searchInField = useCallback((field, value) => {
    const fieldSearchTerm = `${field}:${value}`;
    setSearchTerm(fieldSearchTerm);
    debouncedSearch(fieldSearchTerm);
  }, [debouncedSearch]);

  // Advanced search with operators
  const advancedSearch = useCallback((query) => {
    // Parse advanced search syntax
    // Examples: 
    // - "client:ABC status:overdue" 
    // - "priority:high OR priority:urgent"
    // - "title:contains:meeting"
    
    const filters = {};
    const parts = query.split(' ');
    
    parts.forEach(part => {
      if (part.includes(':')) {
        const [field, ...valueParts] = part.split(':');
        const value = valueParts.join(':');
        
        if (field && value) {
          filters[field] = value;
        }
      }
    });

    // Apply parsed filters
    Object.entries(filters).forEach(([field, value]) => {
      onFilterChange(field, value);
    });

    setSearchTerm(query);
  }, [onFilterChange]);

  // Get search suggestions based on current input
  const getSearchSuggestions = useCallback((input) => {
    if (!input || input.length < 2) return [];

    const suggestions = [];
    
    // Client name suggestions
    filterOptions.clients?.forEach(client => {
      if (client.name.toLowerCase().includes(input.toLowerCase())) {
        suggestions.push({
          type: 'client',
          label: client.name,
          value: client.name,
          action: () => onFilterChange('client', client._id)
        });
      }
    });

    // Project name suggestions
    filterOptions.projects?.forEach(project => {
      if (project.name.toLowerCase().includes(input.toLowerCase())) {
        suggestions.push({
          type: 'project',
          label: project.name,
          value: project.name,
          action: () => onFilterChange('project', project._id)
        });
      }
    });

    // Employee name suggestions
    filterOptions.employees?.forEach(employee => {
      if (employee.name.toLowerCase().includes(input.toLowerCase())) {
        suggestions.push({
          type: 'employee',
          label: employee.name,
          value: employee.name,
          action: () => onFilterChange('employee', employee._id)
        });
      }
    });

    return suggestions.slice(0, 5);
  }, [filterOptions, onFilterChange]);

  // Validate filter combinations
  const validateFilterCombination = useCallback((newFilters) => {
    const validation = {
      isValid: true,
      warnings: [],
      suggestions: []
    };

    // Check client-project consistency
    if (newFilters.client && newFilters.client !== 'all' && 
        newFilters.project && newFilters.project !== 'all') {
      const selectedProject = filterOptions.projects?.find(p => p._id === newFilters.project);
      if (selectedProject && selectedProject.client?._id !== newFilters.client) {
        validation.warnings.push('Selected project does not belong to the selected client');
        validation.suggestions.push('Clear project filter or select matching client');
      }
    }

    // Check date range logic
    if (newFilters.startDate && newFilters.endDate) {
      if (new Date(newFilters.startDate) > new Date(newFilters.endDate)) {
        validation.isValid = false;
        validation.warnings.push('Start date cannot be after end date');
      }
    }

    // Check for potentially empty results
    const activeFilterCount = Object.values(newFilters).filter(v => v && v !== 'all').length;
    if (activeFilterCount > 4) {
      validation.warnings.push('Many filters applied - results may be limited');
      validation.suggestions.push('Consider using fewer filters for broader results');
    }

    return validation;
  }, [filterOptions]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return {
    // Search state
    searchTerm,
    searchHistory,
    filterSuggestions,
    
    // Search actions
    handleSearchChange,
    clearSearch,
    searchInField,
    advancedSearch,
    
    // Suggestions
    getSearchSuggestions,
    generateSmartSuggestions,
    
    // Validation
    validateFilterCombination,
    
    // Utilities
    isSearching: searchTerm.length > 0
  };
};

export default useAdvancedSearch;