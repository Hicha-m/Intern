import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import './SearchSelect.css'

export type SelectOption = { value: string; label: string; detail?: string }
type Props = {
  id?: string
  label: string
  placeholder: string
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  optional?: boolean
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
}
const normalize = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('fr').trim()

/** Editable, list-constrained combobox. Only choosing an option commits a value. */
export function SearchSelect({ id: suppliedId, label, placeholder, options, value = '', onChange, optional, required, disabled, error, hint }: Props) {
  const generatedId = useId()
  const id = suppliedId ?? generatedId
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [activeValue, setActiveValue] = useState<string | null>(null)
  const [pointerMotion, setPointerMotion] = useState(false)
  const open = expanded && !disabled
  const selected = options.find(option => option.value === value)
  const matches = useMemo(() => {
    const search = normalize(query)
    return options.filter(option => normalize(`${option.label} ${option.detail ?? ''}`).includes(search))
  }, [options, query])
  const active = matches.find(option => option.value === activeValue)
  const { refs: { setReference, setFloating, reference, floating }, floatingStyles, placement, isPositioned } = useFloating({
    open,
    placement: 'bottom-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ padding: 12 }), shift({ padding: 12 }), size({ padding: 12, apply({ rects, availableHeight, availableWidth, elements }) {
      Object.assign(elements.floating.style, { width: `${Math.min(rects.reference.width, availableWidth)}px`, '--select-available-height': `${Math.max(0, availableHeight)}px` })
    } })],
  })
  useEffect(() => {
    if (!open) return
    function dismiss(event: PointerEvent) {
      const target = event.target as Node
      if (!floating.current?.contains(target) && !(reference.current as HTMLElement | null)?.contains(target)) setExpanded(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open, reference, floating])
  useEffect(() => {
    if (open && active && isPositioned) {
      // Scroll only the list, never the form or the page.
      const item = document.getElementById(`${id}-option-${active.value}`)
      const container = list.current
      if (item && container) {
        if (item.offsetTop < container.scrollTop) container.scrollTop = item.offsetTop
        else if (item.offsetTop + item.offsetHeight > container.scrollTop + container.clientHeight) container.scrollTop = item.offsetTop + item.offsetHeight - container.clientHeight
      }
    }
  }, [active, id, isPositioned, open])

  function show(pointer: boolean, last = false) {
    if (disabled) return
    setPointerMotion(pointer); setQuery(''); setExpanded(true)
    setActiveValue(selected?.value ?? (last ? options.at(-1)?.value : options[0]?.value) ?? null)
  }
  function choose(option: SelectOption) {
    if (disabled) return
    onChange(option.value)
    setExpanded(false); setQuery(''); setActiveValue(null)
    input.current?.focus({ preventScroll: true })
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    setPointerMotion(false)
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) { show(false, event.key === 'ArrowUp'); return }
      const index = matches.findIndex(option => option.value === activeValue)
      const next = event.key === 'ArrowDown' ? Math.min(index + 1, matches.length - 1) : Math.max(index - 1, 0)
      setActiveValue(matches[next]?.value ?? null)
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      if (active) choose(active)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setExpanded(false)
    } else if (event.key === 'Tab') setExpanded(false)
    // Home/End and editing shortcuts keep their standard text-input behavior.
  }

  return <div className="search-select" data-disabled={disabled || undefined}>
    <label className="search-select-label" id={`${id}-label`} htmlFor={id}>{label}{optional && <span> (facultatif)</span>}</label>
    <div ref={setReference} className="search-select-control" data-open={open || undefined} data-invalid={Boolean(error) || undefined}>
      <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} aria-hidden="true" />
      <input ref={input} id={id} type="text" role="combobox" autoComplete="off" autoCorrect="off" spellCheck={false}
        aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} aria-autocomplete="list" aria-haspopup="listbox"
        aria-activedescendant={open && active ? `${id}-option-${active.value}` : undefined} aria-required={required || undefined}
        aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        disabled={disabled} value={open ? query : selected?.label ?? ''} placeholder={open ? 'Rechercher…' : placeholder}
        onFocus={event => { if (!open) event.target.select() }} onClick={() => { if (!open) show(true) }} onBlur={() => setExpanded(false)} onKeyDown={keyDown}
        onChange={event => {
          const next = event.target.value
          setQuery(next); setExpanded(true); setPointerMotion(false)
          setActiveValue(options.find(option => normalize(`${option.label} ${option.detail ?? ''}`).includes(normalize(next)))?.value ?? null)
        }} />
      <button type="button" tabIndex={-1} aria-label={`${open ? 'Fermer' : 'Ouvrir'} : ${label}`} disabled={disabled}
        onMouseDown={event => event.preventDefault()} onClick={() => { input.current?.focus({ preventScroll: true }); if (open) setExpanded(false); else show(true) }}>
        <HugeiconsIcon icon={ArrowDown01Icon} size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
    {hint && !error && <p className="search-select-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="search-select-error" id={`${id}-error`}>{error}</p>}
    {open && createPortal(<div ref={setFloating} style={{ ...floatingStyles, visibility: isPositioned ? 'visible' : 'hidden' }} className="search-select-positioner" data-side={placement.split('-')[0]}>
      <div className="search-select-popup" data-motion={pointerMotion ? 'pointer' : 'keyboard'} onMouseDown={event => event.preventDefault()}>
        <div className="search-select-summary" role="status" aria-live="polite">{matches.length ? `${matches.length} résultat${matches.length > 1 ? 's' : ''}` : 'Aucun résultat'}</div>
        <div ref={list} className="search-select-list" id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}>
          {matches.map(option => <div key={option.value} id={`${id}-option-${option.value}`} role="option" aria-selected={option.value === value}
            className="search-select-option" data-active={option.value === active?.value || undefined}
            onPointerMove={event => { if (event.pointerType === 'mouse') setActiveValue(option.value) }} onClick={() => choose(option)}>
            {option.detail && <span className="search-select-code" aria-hidden="true">{option.detail}</span>}
            <span>{option.label}</span>
            {option.value === value && <HugeiconsIcon icon={Tick02Icon} size={20} strokeWidth={1.5} aria-hidden="true" />}
          </div>)}
        </div>
        {!matches.length && <p className="search-select-empty">{options.length ? 'Essayez un autre terme.' : 'Tous les pays disponibles ont été ajoutés.'}</p>}
      </div>
    </div>, document.body)}
  </div>
}
