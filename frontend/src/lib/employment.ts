// Shared labels keep source categories explicit without guessing contract duration.
export const contractLabels: Record<string, string> = {
  internship: 'Stage', apprenticeship: 'Alternance', permanent: 'CDI', fixed_term: 'CDD',
  contractor: 'Mission indépendante', employment: 'Emploi salarié (durée non précisée)',
  temporary: 'Temporaire (durée non précisée)', unknown: 'Contrat non précisé',
}
export const seniorityLabels: Record<string, string> = {
  entry: 'Junior', mid: 'Intermédiaire', senior: 'Senior', lead: 'Responsable technique',
  executive: 'Direction', unknown: 'Niveau non précisé',
}
export const contractLabel = (value?: string | null) => contractLabels[value ?? 'unknown'] ?? contractLabels.unknown
export const seniorityLabel = (value?: string | null) => seniorityLabels[value ?? 'unknown'] ?? seniorityLabels.unknown
export const preferenceContractChoices = Object.entries(contractLabels).filter(([value]) => value !== 'unknown')
