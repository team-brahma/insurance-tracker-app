import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@utils/Cn.js';
import { useDebounce } from '@repo/hooks';
import { useClientsSearchQuery } from '@features/policies/hooks/useClientsSearchQuery.js';
import type { Client } from '@repo/types';

export interface ClientSearchProps {
  selectedClient?: { id: string; insuredName: string; mobileNumber: string | null } | null;
  onSelect: (
    client: { id: string; insuredName: string; mobileNumber: string | null } | null,
  ) => void;
  disabled?: boolean;
  label?: string;
}

export default function ClientSearch({
  selectedClient,
  onSelect,
  disabled,
  label,
}: ClientSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedTerm = useDebounce(inputValue.trim(), 500);

  const isSearching = isOpen && inputValue.length >= 3;
  const { data: clients = [], isLoading } = useClientsSearchQuery(debouncedTerm, isSearching);

  useEffect(() => {
    if (debouncedTerm.length >= 3) setIsOpen(true);
    else setIsOpen(false);
    if (debouncedTerm) setHighlightedIndex(-1);
  }, [debouncedTerm]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 3) setIsOpen(true);
  }, [inputValue]);

  const handleSelect = useCallback(
    (client: Client) => {
      onSelect({
        id: client.id,
        insuredName: client.insuredName,
        mobileNumber: client.mobileNumber,
      });
      setInputValue(client.insuredName);
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || !clients.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < clients.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : clients.length - 1));
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        const client = clients[highlightedIndex];
        if (client) handleSelect(client);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [isOpen, clients, highlightedIndex, handleSelect],
  );

  const showSpinner = isLoading && isSearching;

  return (
    <section className="bg-surface border border-line rounded-2xl p-5 shadow-sm text-left">
      {label && (
        <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
          <Search size={14} className="text-slate" />
          {label}
        </h3>
      )}

      <div className="relative">
        {selectedClient ? (
          <div
            className={cn(
              'flex items-center gap-2 h-11 px-3 rounded-xl border bg-paper',
              disabled ? 'opacity-60 pointer-events-none' : 'border-line-strong',
            )}
          >
            <Check size={14} className="text-green-edge shrink-0" />
            <span className="text-sm text-ink font-medium truncate">
              {selectedClient.insuredName}
            </span>
            <span className="text-xs text-ink-faint font-mono shrink-0">
              {selectedClient.mobileNumber ? `· ${selectedClient.mobileNumber}` : '· No phone'}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="ml-auto text-ink-faint hover:text-ink transition-colors cursor-pointer p-0.5"
                aria-label="Clear client selection"
              >
                <X size={15} />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
            />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={() => {
                setTimeout(() => {
                  setIsOpen(false);
                }, 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search existing clients…"
              disabled={disabled}
              className={cn(
                'w-full h-11 pl-9 pr-9 rounded-xl border bg-surface text-sm text-ink',
                'placeholder:text-ink-faint outline-none transition-all',
                'focus:border-slate focus:shadow-[0_0_0_3px_rgba(15,118,110,0.15)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'border-line-strong',
              )}
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              autoComplete="off"
            />
            {showSpinner && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate animate-spin"
              />
            )}
          </div>
        )}

        {isOpen && inputValue.length >= 3 && (
          <>
            {clients.length > 0 ? (
              <div
                ref={dropdownRef}
                className="absolute z-[9999] mt-1 w-full rounded-xl border border-line bg-surface shadow-[0_16px_48px_rgba(10,20,36,0.18)] overflow-hidden"
              >
                <ul className="py-1 max-h-48 overflow-y-auto" role="listbox">
                  {clients.map((client, idx) => (
                    <li
                      key={client.id}
                      role="option"
                      aria-selected={idx === highlightedIndex}
                      onMouseDown={() => {
                        handleSelect(client);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(idx);
                      }}
                      className={cn(
                        'px-3 py-2.5 flex items-center justify-between cursor-pointer text-sm transition-colors',
                        idx === highlightedIndex ? 'bg-paper' : 'hover:bg-paper',
                      )}
                    >
                      <span className="text-ink font-medium">{client.insuredName}</span>
                      <span className="text-xs text-ink-faint font-mono shrink-0 ml-2">
                        {client.mobileNumber ? `· ${client.mobileNumber}` : '· No phone'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              !isLoading && (
                <div className="absolute z-[9999] mt-1 w-full rounded-xl border border-line bg-surface shadow-md p-3 text-center text-sm text-ink-faint">
                  No clients found for &ldquo;{inputValue}&rdquo;
                </div>
              )
            )}
          </>
        )}
      </div>

      {!selectedClient && (
        <p className="text-[11px] text-ink-faint mt-2">
          Type at least 3 characters to search existing clients, or fill the fields below to create
          a new one.
        </p>
      )}
    </section>
  );
}
