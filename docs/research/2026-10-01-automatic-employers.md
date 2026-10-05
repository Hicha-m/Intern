# Admission automatique — 1er octobre 2026

Le premier passage a parcouru 500 pistes sans admission. Les liens ATS exploitables
étaient rares et les noms ambigus. Un préfiltre de liens structurés évite désormais
d'épuiser les tranches sur les annonces sans lien direct. Le registre ats-scrapers
épinglé déjà importé fournit une deuxième entrée de pistes, sous le même quota.

À 17:29:57, heure de Paris : 50 portails admis automatiquement, deux testés par le
worker de sondes (123 POUSSE et 2Care), aucun stage européen confirmé. Ces deux
portails restent en attente de nouvelle vérification ; les autres sont en file.
Aucune offre supplémentaire n'est revendiquée à cette mesure.

63 tests ciblés passent. Le quota, l'idempotence, la fraîcheur, l'identité, les
sources désactivées, la provenance de registre et l'absence de contournement des
sondes par l'activation historique sont couverts. Les détails du pilote sont dans
`generated/`, ignoré par Git. Les liens indirects et les alias de marque restent
à résoudre ; le lot n'ajoute pas de moteur de recherche web autonome et ne met
pas à jour automatiquement la révision de l'inventaire.
