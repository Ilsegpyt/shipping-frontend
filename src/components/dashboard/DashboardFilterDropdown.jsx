import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Filter } from 'lucide-react';
import './dashboard-filter-dropdown.css';

export default function DashboardFilterDropdown({ value, options, onChange, label = 'Filter' }) {
    const [open, setOpen] = useState(false);
    const root = useRef(null);
    const trigger = useRef(null);
    const items = useRef([]);
    const id = useId();
    const selected = options.findIndex(option => option.value === value);

    useEffect(() => {
        if (!open) return;
        items.current[Math.max(0, selected)]?.focus();
        const closeOutside = event => {
            if (!root.current?.contains(event.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => document.removeEventListener('pointerdown', closeOutside);
    }, [open, selected]);

    function close() {
        setOpen(false);
        trigger.current?.focus();
    }

    return (
        <div ref={root} className="ils-dashboard-filter-dropdown" onClick={event => event.stopPropagation()}
            onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
            onKeyDown={event => {
                if (event.key === 'Escape' && open) { event.preventDefault(); close(); }
            }}>
            <button ref={trigger} type="button" className="ils-dashboard-button ils-dashboard-button--secondary ils-dashboard-filter-trigger"
                aria-label={`${label}: ${options[selected]?.label ?? label}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
                onClick={() => setOpen(previous => !previous)}
                onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
                <Filter size={16} aria-hidden="true" />
                <span>{options[selected]?.label ?? label}</span>
                <ChevronDown size={15} aria-hidden="true" className={open ? 'is-open' : ''} />
            </button>
            {open && <div id={id} role="listbox" aria-label={label} className="ils-dashboard-filter-options">
                {options.map((option, index) => <button key={option.value} ref={node => { items.current[index] = node; }}
                    type="button" role="option" aria-selected={value === option.value} tabIndex={-1}
                    className="ils-dashboard-filter-option"
                    onClick={() => { onChange(option.value); close(); }}
                    onKeyDown={event => {
                        const next = { ArrowDown: (index + 1) % options.length, ArrowUp: (index + options.length - 1) % options.length, Home: 0, End: options.length - 1 }[event.key];
                        if (next !== undefined) { event.preventDefault(); items.current[next]?.focus(); }
                    }}>
                    <span>{option.label}</span>
                    {value === option.value && <Check size={15} aria-hidden="true" />}
                </button>)}
            </div>}
        </div>
    );
}
