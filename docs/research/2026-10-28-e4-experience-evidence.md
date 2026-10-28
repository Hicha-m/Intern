# E4.2b — Expérience demandée avec preuves

Branche : `feat/e4-experience-evidence`, dépendante de E4.2a.

## Critères et réalisation

- Années/mois demandés conservés dans leur unité native, sans conversion ni
  déduction à partir du contrat, de la séniorité, d’un âge ou d’une durée de stage.
- Minimum, maximum, fourchette et valeur simplement mentionnée sont distincts.
  « 3 years experience » est `stated=3`, pas un minimum inventé. Les opérateurs
  stricts « less/more than » conservent `inclusive=false`.
- « No experience required » ou « sans expérience » donne `none_required`,
  `qualification=not_required`, minimum zéro et maximum inconnu. Cela n’exclut
  pas les candidats expérimentés et ne prouve pas que toutes les autres exigences
  de l’offre sont satisfaites.
- Exigence, souhait, mention non qualifiée et négation restent séparés. Les indices
  mélangés restent non qualifiés. Les alternatives sont signalées ; les clauses
  contradictoires sont conservées, sans choisir arbitrairement une seule borne.
- Chaque observation conserve révision, chemin JSON, extrait original, offsets en
  points de code Unicode, comparaison, unité et qualification. La confiance reste
  inconnue, sans probabilité inventée.

Le découpage des descriptions/sections et le masquage du contenu caché sont
partagés avec les compétences dans `requirement_text.py`. Les tests de compétences
sont rejoués après ce changement. Les mêmes champs source connus et listes Lever
sont réutilisés ; titres de section entreprise, avantages et recrutement exclus.
La présence d’un mot expérience est obligatoire pour les expressions numériques.
Une clause explicitement relative à l’entreprise/fondation est exclue.

`ExperienceExtraction` versionne le traitement et sa date, avec couverture
`processed`, `no_description`, `too_large` (limite 200 000 caractères). L’absence
observée de fait n’est pas une preuve d’absence d’exigence. `ExperienceEvidence`
conserve les observations multiples par clause/révision, sans les écraser dans
`Offer.experience_years_min/max`. Les dates d’observation viennent des révisions.
Les imports entreprise et publications recruteur créent les preuves dans leurs
transactions existantes ; rejeu de même révision/version idempotent.

La sélection `current_experience_evidence(offers)` exige un corpus explicite et
retient uniquement hash courant, source fraîche/active et board activé. Les
observations anciennes et contradictoires restent en base pour audit.

## Migration 0041

Ajout de tables, sans modifier les données ou champs canoniques existants.
Contraintes SQL : états, unités, unicité, offsets valides, bornes non négatives et
ordonnées. Retour du schéma protégé contre la perte d’observations ; retour
applicatif possible en gardant les nouvelles tables. La migration est vérifiée
aller/retour avec conservation des révisions et refus de suppression implicite.

## Validation

Première passe : 47 tests Django/PostgreSQL réussis en 27,788 secondes. Validation
finale : **78 tests réussis en 40,692 secondes**, dont neuf nouveaux tests de
règles, persistance et migration, avec régression des compétences, salaires,
collectes et matching. Ruff, contrôle Django, absence de dérive des migrations et
`git diff --check` réussis. Cas couverts :
FR/EN, décimales, années/mois, bornes strictes, fourchettes, sans expérience,
contradictions, alternatives, négation, HTML, faux positifs entreprise/durée/junior,
idempotence, sélection actuelle et contraintes PostgreSQL.

Sources réseau contrôlées et PostgreSQL réel ; pas de parcours UI ou d’API publique
modifié. Build frontend, Playwright et recette navigateur non relancés pour cette
extraction interne. Suite Django complète non relancée : régressions ciblées des
modules concernés. Aucun déploiement, migration de production, collecte externe,
publication GitHub ou CI distante exécuté.

## Limites et suite

Règles initiales FR/EN avec nombres écrits en chiffres ; nombres en lettres,
conditions de substitution diplôme/expérience, rattachement à une compétence
précise et autres langues ne sont pas validés. Les fourchettes inversées ne sont
pas réparées ; leur texte reste dans la révision. La portée d’une mention (un
outil ou tout le poste) ne doit pas être inventée par le futur panel.

Les régressions ne remplacent pas le corpus indépendant de 200 annonces du PRD.
Aucun objectif de précision/rappel n’est annoncé atteint. Les autres exigences
(diplôme, certifications, langues) et la présentation des preuves dans le panel
restent à livrer. Les reprises historiques restent en E4.5.
