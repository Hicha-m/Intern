import { useState, type KeyboardEvent } from 'react'
import type { ContentBlock, OfferContent } from '../../lib/offerContent'

const labels: Record<string, string> = { about_role: 'À propos du poste', responsibilities: 'Ce que tu feras', requirements: 'Profil demandé', preferred: 'Un plus', conditions: 'Conditions du poste', about_company: 'À propos de l’entreprise', benefits: 'Avantages', recruitment: 'Recrutement', other: 'Informations complémentaires' }
const order = Object.keys(labels)

function Block({ block }: { block: ContentBlock }) {
  if (block.kind === 'heading') return <h3>{block.text}</h3>
  if (block.items) {
    const List = block.kind === 'ordered_list' ? 'ol' : 'ul'
    return <List>{block.items.map((item, index) => <li key={index}>{item.text}{item.children?.map((child, childIndex) => <Block key={childIndex} block={child} />)}</li>)}</List>
  }
  return <p>{block.text}</p>
}

export function LegacyDescription({ text }: { text: string }) {
  const clean = text.replace(/&(?:amp|nbsp|quot|apos|lt|gt);/g, entity => ({ '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[entity] ?? entity)
  return <>{clean.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean).map((block, index) => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
    const heading = lines.join(' ').replace(/\s+/g, ' ')
    if (heading.length < 90 && /^(?:à propos (?:du poste|de toi|de vous|de .+)|principales responsabilités|vos missions|missions|votre profil|profil recherché|pourquoi nous (?:choisir|rejoindre)|responsibilities|requirements|qualifications|about (?:you|the role|us)|what (?:you.ll do|we offer))[ :? ]*$/i.test(heading)) return <h3 key={index}>{heading}</h3>
    const bullet = /^(?:[•*–-]|\d+[.)])\s+/
    const first = lines.findIndex(line => bullet.test(line))
    if (first >= 0) {
      const items: string[] = []
      for (const line of lines.slice(first)) {
        if (bullet.test(line)) items.push(line.replace(bullet, ''))
        else items[items.length - 1] += ` ${line}`
      }
      return <div key={index}>{first > 0 && <p>{lines.slice(0, first).join(' ')}</p>}<ul>{items.map((item, i) => <li key={i}>{item}</li>)}</ul></div>
    }
    return <p key={index}>{heading.replace(/\s+([,:;.])/g, '$1')}</p>
  })}</>
}

export function OfferDescription({ content, text }: { content?: OfferContent; text: string }) {
  const [view, setView] = useState<'summary' | 'original'>('summary')
  const structured = Boolean(content?.blocks.length)
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 'summary' : event.key === 'End' ? 'original' : view === 'summary' ? 'original' : 'summary'
    setView(next)
    document.getElementById(`offer-tab-${next}`)?.focus()
  }
  const sections = content?.sections.filter(section => section.block_ids.length).reduce<OfferContent['sections']>((result, section) => {
    const previous = section.kind !== 'other' && result.find(item => item.kind === section.kind)
    if (previous) previous.block_ids.push(...section.block_ids)
    else result.push({ ...section, block_ids: [...section.block_ids] })
    return result
  }, []).toSorted((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)) ?? []
  const blocks = new Map(content?.blocks.map(block => [block.id, block]) ?? [])
  const profileIds = new Set(sections.filter(section => ['requirements', 'preferred'].includes(section.kind)).flatMap(section => section.block_ids))
  const profile = content?.requirements.filter(item => profileIds.has(item.block_id)) ?? []
  const requested = profile.filter(item => item.modality !== 'preferred' && item.modality !== 'optional')
  const preferred = profile.filter(item => item.modality === 'preferred' || item.modality === 'optional')
  const profileRendered = new Set<string>()
  return <>
    <div className="offer-reading-tabs" role="tablist" aria-label="Lecture de l’offre">
      {(['summary', 'original'] as const).map(tab => <button key={tab} id={`offer-tab-${tab}`} role="tab" type="button" aria-selected={view === tab} aria-controls={`offer-panel-${tab}`} tabIndex={view === tab ? 0 : -1} onClick={() => setView(tab)} onKeyDown={keyboard}>{tab === 'summary' ? 'L’essentiel' : 'Annonce complète'}</button>)}
    </div>
    <div id="offer-panel-summary" role="tabpanel" aria-labelledby="offer-tab-summary" hidden={view !== 'summary'} className="offer-description-copy">
      {structured && sections.length ? sections.map((section, index) => {
        if (profile.length && ['requirements', 'preferred'].includes(section.kind)) {
          if (profileRendered.has('profile')) return null
          profileRendered.add('profile')
          return <div key={index}>{requested.length > 0 && <section className="offer-content-section"><h3>Profil demandé</h3><ul>{requested.map((item, i) => <li key={i}>{item.text}</li>)}</ul></section>}{preferred.length > 0 && <section className="offer-content-section"><h3>Un plus et compétences facultatives</h3><ul>{preferred.map((item, i) => <li key={i}>{item.text}</li>)}</ul></section>}</div>
        }
        return <section key={index} className="offer-content-section"><h3>{section.kind === 'other' && section.original_heading ? section.original_heading : labels[section.kind] ?? section.original_heading}</h3>{section.block_ids.map(id => { const block = blocks.get(id); return block ? <Block key={id} block={block} /> : null })}</section>
      }) : <LegacyDescription text={text} />}
    </div>
    <div id="offer-panel-original" role="tabpanel" aria-labelledby="offer-tab-original" hidden={view !== 'original'} className="offer-description-copy">
      {structured ? content!.blocks.map(block => <Block key={block.id} block={block} />) : <LegacyDescription text={text} />}
    </div>
  </>
}
