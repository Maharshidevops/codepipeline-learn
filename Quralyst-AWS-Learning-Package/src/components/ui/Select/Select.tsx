// Select — React port of Backup/static/js/components/dropdowns.js (CustomDropdown). Renders the
// same .custom-dropdown markup (dropdowns.css) and reproduces: keyboard ↑↓/Enter/Space/Esc +
// type-to-search (600ms reset), .selected/.active highlight, has-selection state, and `portal` mode
// (menu rendered to document.body with fixed positioning to escape overflow:hidden table ancestors).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  suggested?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm';
  portal?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Extra class(es) merged onto the trigger button (e.g. `profile-input` for parity). */
  buttonClassName?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Accessible name for the combobox (a11y, Phase 35) — use when no visible caption exists. */
  'aria-label'?: string;
  /** id of the visible caption element naming this combobox (a11y, Phase 35). */
  'aria-labelledby'?: string;
}

interface PortalRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  size,
  portal = false,
  disabled = false,
  id,
  className,
  buttonClassName,
  searchable,
  searchPlaceholder,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [portalRect, setPortalRect] = useState<PortalRect | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Stable ids for ARIA wiring (listbox + per-option), independent of the optional `id` prop.
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<{ str: string; timeout: number | undefined }>({
    str: '',
    timeout: undefined,
  });


  const isSearchable = searchable ?? options.length >= 6;

  const filteredOptions = useMemo(() => {
    if (!isSearchable || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }, [options, searchQuery, isSearchable]);

  const selectedIndex = useMemo(
    () => filteredOptions.findIndex((o) => o.value === value),
    [filteredOptions, value],
  );
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder;
  const hasSelection = value !== '' && selectedIndex >= 0;

  const positionPortal = useCallback(() => {
    if (!portal || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const maxH = Math.max(120, Math.min(300, window.innerHeight - rect.bottom - 12));
    setPortalRect({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: maxH });
  }, [portal]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setSearchQuery('');
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    setActiveIndex(selectedIndex);
    setOpen(true);
    if (portal) positionPortal();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [disabled, portal, positionPortal, selectedIndex]);

  // Reposition portal on scroll/resize while open (dropdowns.js _portalReposition).
  useEffect(() => {
    if (!open || !portal) return;
    const handler = () => positionPortal();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, portal, positionPortal]);

  // Close on outside click (menu may be portaled under body).
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside =
        containerRef.current?.contains(target) || contentRef.current?.contains(target);
      if (!inside) close();
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open, close]);

  const selectOption = useCallback(
    (opt: SelectOption) => {
      if (opt.value !== value) onChange(opt.value);
      close();
    },
    [value, onChange, close],
  );

  const scrollActiveIntoView = useCallback((index: number) => {
    const node = contentRef.current?.querySelectorAll<HTMLElement>('.custom-dropdown-item')[index];
    node?.scrollIntoView({ block: 'nearest' });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    if (e.key.length === 1) {
      // Type-to-search.
      e.preventDefault();
      if (!open) openMenu();
      searchRef.current.str += e.key.toLowerCase();
      window.clearTimeout(searchRef.current.timeout);
      searchRef.current.timeout = window.setTimeout(() => {
        searchRef.current.str = '';
      }, 600);
      const term = searchRef.current.str;
      const matchIndex = filteredOptions.findIndex(
        (o) => !o.suggested && o.label.trim().toLowerCase().startsWith(term),
      );
      if (matchIndex >= 0) {
        setActiveIndex(matchIndex);
        scrollActiveIntoView(matchIndex);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (open) {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          selectOption(filteredOptions[activeIndex]);
        } else if (e.key === 'Enter') {
          close();
        }
      } else {
        e.preventDefault();
        openMenu();
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      if (!filteredOptions.length) return;
      let current = activeIndex;
      if (current === -1) current = selectedIndex;
      if (e.key === 'ArrowDown') {
        current = current < filteredOptions.length - 1 ? current + 1 : 0;
      } else {
        current = current > 0 ? current - 1 : filteredOptions.length - 1;
      }
      setActiveIndex(current);
      scrollActiveIntoView(current);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        close();
        containerRef.current?.focus();
      }
    }
  };

    const menu = (
    <div
      ref={contentRef}
      className={`custom-dropdown-content${open ? ' show' : ''}${
        portal && open ? ' dropdown-portal-open' : ''
      }`}
      style={
        portal && open && portalRect
          ? {
              top: portalRect.top,
              left: portalRect.left,
              width: portalRect.width,
              maxWidth: portalRect.width,
              maxHeight: portalRect.maxHeight,
            }
          : undefined
      }
    >
      {isSearchable && (
        <div className="custom-dropdown-search">
          <div className="custom-dropdown-search__box">
            <i className="bi bi-search custom-dropdown-search__icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              className="custom-dropdown-search__input"
              placeholder={searchPlaceholder || 'Search location...'}
              aria-label={searchPlaceholder || 'Search options'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setActiveIndex(0);
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (
                  e.key === 'ArrowDown' ||
                  e.key === 'ArrowUp' ||
                  e.key === 'Enter' ||
                  e.key === 'Escape'
                ) {
                  handleKeyDown(e);
                }
              }}
            />
          </div>
        </div>
      )}
      <div id={listboxId} role="listbox" className="custom-dropdown-options">
        {filteredOptions.length === 0 ? (
          <div className="custom-dropdown-empty px-3 py-2 text-muted small" role="option" aria-selected={false}>
            No matches found
          </div>
        ) : (
          filteredOptions.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <button
                key={opt.value}
                type="button"
                id={optionId(i)}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={`custom-dropdown-item${isSelected ? ' selected' : ''}${
                  isActive ? ' active' : ''
                }`}
                data-value={opt.value}
                data-suggested={opt.suggested ? 'true' : 'false'}
                onClick={() => selectOption(opt)}
              >
                {opt.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      id={id}
      className={`custom-dropdown${size === 'sm' ? ' custom-dropdown--sm' : ''}${
        className ? ` ${className}` : ''
      }`}
      role="combobox"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={btnRef}
        type="button"
        tabIndex={-1}
        className={`custom-dropdown-btn${size === 'sm' ? ' custom-dropdown-btn--sm' : ''}${
          hasSelection ? ' has-selection' : ''
        }${disabled ? ' disabled' : ''}${buttonClassName ? ` ${buttonClassName}` : ''}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          if (open) close();
          else openMenu();
        }}
      >
        <span>{selectedLabel}</span>
      </button>
      {portal && open ? createPortal(menu, document.body) : menu}
    </div>
  );
}
