# Lot 31 — Sources et limites

Vérifié le 1 octobre 2026. Les empreintes SHA256, effectifs et diagnostics sont
conservés dans le rapport diagnostic, avec les IDs publiables avant reprise.

- [Plum, widget public](https://apply.workable.com/api/v1/widget/accounts/withplum) :
  29 lignes, aucun stage sélectionné. Le résultat indexé Wealth Ops n'est pas une
  preuve de disponibilité actuelle. Pas de correctif justifié sur cet instantané.
- [Gen Digital, API publique](https://api.ashbyhq.com/posting-api/job-board/gen-digital) :
  121 annonces, deux stages à Kuala Lumpur ; référence marketing Prague absente.
  Le filtre Europe ne doit pas être relâché pour augmenter le compteur.
- [Civitta, annonce employeur](https://jobs.lever.co/Civitta/7106e170-c242-49a2-a46b-cfab2588136e) :
  liste explicite des pays ouverts pour le poste, dont Finlande et Bulgarie.
  Le champ lieu générique de l'API perdait cette information. Une fiche récupérée,
  pas 19 offres supplémentaires. Tous les lieux de l'annonce restent conservés.
- [Contrat de l'API Lever](https://github.com/lever/postings-api) : lieux dans
  categories/allLocations, pays structuré nullable, workplaceType et description.

La correction est volontairement étroite : elle ne résout pas toute phrase de
localisation, toutes les langues, ni toute annonce distante. Un pays structuré
existant bloque le fallback. Les tests couvrent les faux positifs géographiques,
les données publiques réduites des trois cas et l'idempotence d'import.
Résultat : nouvelle fiche 16033 ; zéro fusion proposée par l'audit ciblé. Les deux
sources sans résultat européen gardent leurs délais du 8 octobre. Workers rechargés
avec conservation des baux, sans forcer un travail déjà réservé par un collecteur.
