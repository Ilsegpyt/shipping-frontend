import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Search } from 'lucide-react';

/**
 * High-performance searchable combobox / dropdown.
 * Caps rendered DOM items to `maxResults` (default 50) so it remains instantaneous
 * even with 14,000+ items (like Sea Ports).
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Select --',
  disabled = false,
  required = false,
  allowCustom = false,
  compact = false,
  variant = 'default',
  className = '',
  maxResults = 50,
  emptyMessage = 'No matching results',
  id,
  name,
  title,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220, openUpwards: false });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to { value, label, searchStr, raw }
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (opt === null || opt === undefined) return null;
      if (typeof opt === 'string' || typeof opt === 'number') {
        const str = String(opt);
        return { value: str, label: str, searchStr: str.toLowerCase(), raw: opt };
      }
      const val = opt.value !== undefined ? opt.value : (opt.id || opt.code || opt.name || '');
      const lbl = opt.label !== undefined ? opt.label : (opt.name || opt.companyName || opt.title || String(val));
      const sub = opt.sublabel || opt.code || opt.abbreviation || '';
      const sStr = (opt.searchStr || `${lbl} ${sub} ${val}`).toLowerCase();
      return {
        value: val,
        label: lbl,
        sublabel: sub,
        searchStr: sStr,
        raw: opt.raw || opt.item || opt
      };
    }).filter(Boolean);
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (value === null || value === undefined || value === '') return null;
    const strVal = String(value).toLowerCase().trim();
    return normalizedOptions.find((opt) =>
      String(opt.value).toLowerCase().trim() === strVal ||
      String(opt.label).toLowerCase().trim() === strVal ||
      (opt.raw?.name && String(opt.raw.name).toLowerCase().trim() === strVal) ||
      (opt.raw?.code && String(opt.raw.code).toLowerCase().trim() === strVal) ||
      (opt.sublabel && String(opt.sublabel).toLowerCase().trim() === strVal)
    ) || (allowCustom ? { value, label: String(value) } : null);
  }, [normalizedOptions, value, allowCustom]);

  // Filter options based on query, capping to maxResults
  const { filtered, totalMatches } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        filtered: normalizedOptions.slice(0, maxResults),
        totalMatches: normalizedOptions.length
      };
    }
    const matches = [];
    for (let i = 0; i < normalizedOptions.length; i++) {
      const opt = normalizedOptions[i];
      if (opt.searchStr.includes(q)) {
        matches.push(opt);
        if (matches.length >= maxResults) break;
      }
    }
    // Also get rough count if needed
    const total = matches.length >= maxResults
      ? normalizedOptions.filter((opt) => opt.searchStr.includes(q)).length
      : matches.length;

    return { filtered: matches, totalMatches: total };
  }, [normalizedOptions, query, maxResults]);

  // Close on click outside (checking both container and portaled dropdown)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        (!dropdownRef.current || !dropdownRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update dropdown portal positioning relative to viewport
  useEffect(() => {
    if (!isOpen) return;

    const updatePos = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dropWidth = Math.max(rect.width, 220);
        let left = rect.left;
        if (left + dropWidth > window.innerWidth - 8) {
          left = Math.max(8, window.innerWidth - dropWidth - 8);
        }
        if (left < 8) left = 8;

        const spaceBelow = window.innerHeight - rect.bottom;
        const openUpwards = spaceBelow < 280 && rect.top > 280;

        setCoords({
          top: openUpwards ? rect.top - 4 : rect.bottom + 4,
          left,
          width: dropWidth,
          openUpwards,
        });
      }
    };

    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [isOpen]);

  // Reset query and highlight when opening/closing
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlightIndex(-1);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (opt) => {
    if (disabled) return;
    if (opt) {
      onChange && onChange(opt.value, opt.raw || opt);
    } else {
      onChange && onChange('', null);
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange && onChange('', null);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev < filtered.length - 1 ? prev + 1 : 0;
        scrollOptionIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filtered.length - 1;
        scrollOptionIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        handleSelect(filtered[highlightIndex]);
      } else if (allowCustom && query.trim()) {
        handleSelect({ value: query.trim(), label: query.trim() });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollOptionIntoView = (index) => {
    if (listRef.current && listRef.current.children[index]) {
      listRef.current.children[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const displayLabel = selectedOption ? selectedOption.label : '';

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full text-start font-sans ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      onKeyDown={handleKeyDown}
      id={id}
    >
      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={value || ''} required={required} />}

      {/* Trigger Box */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        title={title || displayLabel || placeholder}
        className={`flex items-center justify-between w-full transition select-none ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} ${variant === 'filter'
            ? 'h-[32px] min-h-[32px] px-2.5 py-1 text-xs font-normal bg-white rounded-xl border border-slate-300 hover:border-slate-400 focus:border-sky-500 text-slate-700 shadow-2xs'
            : compact
              ? 'h-[34px] min-h-[34px] px-2 text-xs font-semibold bg-transparent rounded border border-transparent hover:border-sky-300 focus:border-sky-500 focus:bg-white text-slate-700'
              : 'h-[44px] min-h-[44px] px-3.5 py-2 text-[14px] bg-white border border-slate-300 rounded-xl shadow-2xs hover:border-slate-400 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-slate-800'
          } ${isOpen ? 'border-sky-500 ring-2 ring-sky-100' : ''}`}
      >
        <span className={`truncate me-2 ${!displayLabel ? (variant === 'filter' ? 'text-slate-600 font-normal' : 'text-slate-400 font-normal') : 'font-medium text-slate-800'}`}>
          {displayLabel || placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0 ms-1">
          {displayLabel && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
              title="Clear"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={compact ? 13 : 15}
            className={`text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-sky-600' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu rendered via Portal to prevent any parent overflow clipping */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed z-[99999] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-100 text-start ${coords.openUpwards ? '-translate-y-full' : ''
              }`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              minWidth: '220px',
            }}
          >
            {/* Search Input Bar */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/90 sticky top-0 z-10 flex items-center gap-2">
              <Search size={14} className="text-slate-400 shrink-0 ms-1" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightIndex(-1);
                }}
                placeholder="Type to search..."
                className="w-full text-xs bg-transparent border-none outline-hidden text-slate-800 placeholder-slate-400 text-start"
                onClick={(e) => e.stopPropagation()}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div
              ref={listRef}
              className="max-h-60 overflow-y-auto overscroll-contain py-1 text-xs divide-y divide-slate-50"
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-slate-400">
                  {emptyMessage}
                  {allowCustom && query.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSelect({ value: query.trim(), label: query.trim() })}
                      className="mt-2 block w-full px-2 py-1 text-center font-semibold text-sky-600 bg-sky-50 rounded hover:bg-sky-100 transition"
                    >
                      Use "{query.trim()}"
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((opt, idx) => {
                  const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                  const isHighlighted = idx === highlightIndex;
                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightIndex(idx)}
                      className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition ${isSelected
                          ? 'bg-sky-50 text-sky-800 font-bold'
                          : isHighlighted
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      <span className="truncate text-start">{opt.label}</span>
                      {opt.sublabel && opt.sublabel !== opt.label && (
                        <span className="ms-2 text-[10px] text-slate-400 shrink-0 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Info (if more items exist) */}
            {totalMatches > maxResults && (
              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
                Showing top {maxResults} of {totalMatches.toLocaleString()} results (type to narrow down)
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

