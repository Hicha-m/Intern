import { Link } from 'react-router'
import type { MouseEvent } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import './Pagination.css'

type Props = {
  page: number
  pageSize: number
  count: number
  params: URLSearchParams
  onNavigate: () => void
}

/** Bounded page window: always expose the first, last and adjacent pages. */
function pageItems(page: number, total: number): (number | string)[] {
  const visible = total <= 7 ? Array.from({ length: total }, (_, index) => index + 1)
    : [...new Set([1, total, page - 1, page, page + 1, ...(page <= 2 ? [2, 3] : []), ...(page >= total - 1 ? [total - 2, total - 1] : [])])].filter(value => value >= 1 && value <= total).sort((a, b) => a - b)
  return visible.flatMap((value, index) => {
    const previous = visible[index - 1]
    if (index && value - previous === 2) return [previous + 1, value]
    if (index && value - previous > 2) return [`gap-${value}`, value]
    return [value]
  })
}

export function Pagination({ page, pageSize, count, params, onNavigate }: Props) {
  const total = Math.ceil(count / pageSize)
  if (total <= 1) return null
  const number = (value: number) => value.toLocaleString('fr-FR')
  const href = (value: number) => {
    const next = new URLSearchParams(params)
    if (value === 1) next.delete('page'); else next.set('page', String(value))
    return { search: next.toString() ? `?${next}` : '', hash: '#offers-results' }
  }
  const navigate = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate()
  }
  return <div className="catalogue-pagination">
    <p className="catalogue-pagination-range">{number((page - 1) * pageSize + 1)}–{number(Math.min(page * pageSize, count))} sur <strong>{number(count)}</strong> offres</p>
    <nav aria-label="Pages des offres" className="catalogue-pagination-nav">
      {page > 1 ? <Link className="pagination-direction" to={href(page - 1)} onClick={navigate} rel="prev" aria-label="Page précédente"><HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" /><span>Précédent</span></Link>
        : <span className="pagination-direction" aria-disabled="true"><HugeiconsIcon icon={ArrowLeft01Icon} size={18} aria-hidden="true" /><span>Précédent</span></span>}
      <ul className="pagination-pages">
        {pageItems(page, total).map(item => <li key={item}>{typeof item === 'number'
          ? <Link to={href(item)} onClick={item === page ? event => event.preventDefault() : navigate} aria-label={`Page ${number(item)}`} aria-current={item === page ? 'page' : undefined}>{number(item)}</Link>
          : <span className="pagination-ellipsis" aria-hidden="true">…</span>}</li>)}
      </ul>
      <span className="pagination-mobile-position">Page {number(page)} sur {number(total)}</span>
      {page < total ? <Link className="pagination-direction" to={href(page + 1)} onClick={navigate} rel="next" aria-label="Page suivante"><span>Suivant</span><HugeiconsIcon icon={ArrowRight01Icon} size={18} aria-hidden="true" /></Link>
        : <span className="pagination-direction" aria-disabled="true"><span>Suivant</span><HugeiconsIcon icon={ArrowRight01Icon} size={18} aria-hidden="true" /></span>}
    </nav>
  </div>
}
