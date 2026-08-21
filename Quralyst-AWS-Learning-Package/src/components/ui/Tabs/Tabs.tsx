// Tabs — controlled rounded-pill tab row (Tabs.css). Replaces Bootstrap nav-tabs/pills with React
// state. Optional per-tab icon (Bootstrap/FA class) and count badge. a11y (Phase 17): roving tabindex
// + arrow/Home/End keyboard navigation (WCAG tab pattern, automatic activation); pass `controls` to
// associate a tab with its panel id.
import { useRef } from 'react';
import './Tabs.css';

export interface TabDef {
  id: string;
  label: string;
  icon?: string; // e.g. 'bi bi-people'
  count?: number;
  controls?: string; // id of the panel this tab controls (for aria-controls)
}

export interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, active, onChange }: TabsProps) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    onChange(tab.id);
    btnRefs.current[index]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    focusTab(next);
  };

  return (
    <div className="quralyst-tabs" role="tablist">
      {tabs.map((tab, i) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={tab.controls}
            tabIndex={isActive ? 0 : -1}
            className={`quralyst-tab${isActive ? ' active' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tab.icon && <i className={tab.icon} aria-hidden="true" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && <span className="quralyst-tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
