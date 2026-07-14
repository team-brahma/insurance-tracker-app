import { useState } from 'react';
import { useDebounce } from '@repo/hooks';

interface UseSearchOptions {
  debounceMs?: number;
}

export function useSearch({ debounceMs = 500 }: UseSearchOptions = {}) {
  const [searchText, setSearchText] = useState('');
  const debouncedSearchText = useDebounce(searchText, debounceMs);

  const clearSearch = () => {
    setSearchText('');
  };

  return { searchText, debouncedSearchText, setSearchText, clearSearch };
}
