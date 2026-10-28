# E2.5a — Transport des rémunérations JobSpy

Branche : `feat/e2-salary-transport`, dépendante des stories E1/E2 locales.

## Contrat et critères

Conserver les montants, devise, période et données source disponibles avant
normalisation analytique ; ne pas inventer salaire absent, période annuelle,
devise ou statut publié. Conserver les révisions et l’idempotence des imports.
Aucun nouveau service, dépendance, abonnement ou réseau de proxys.

## Audit du commit épinglé

Le `direct_url.json` de l’installation locale confirme le commit JobSpy
`7f0ff3ab25a4a4cd204af421cf6378ede3da5569`, également épinglé dans
[pyproject.toml](../../metier/pyproject.toml). Lecture du code installé :

- `Compensation` fournit bornes, intervalle et devise avec défaut USD.
- Indeed `get_compensation` accepte soit `baseSalary`, soit `estimated`, puis
  perd cette distinction dans le modèle retourné et peut tronquer les montants.
- Glassdoor lit `payPeriodAdjustedPay` et applique USD si la devise manque.
- LinkedIn lit le texte de salaire mais ne renseigne pas la période dans ce modèle.

Ces constats viennent du code installé, pas d’une collecte live ou d’un benchmark
amont. Une valeur parsée ne prouve donc pas un salaire déclaré par l’employeur.

## Réalisation

Le [runner](../../metier/app/jobboard/integrations/jobspy_runner.py) observe
`_process_job` dans les trois adaptateurs épinglés. Il conserve les champs de
compensation Indeed avant perte de distinction base/estimé, les champs de paie
Glassdoor et le texte salarial LinkedIn. Les données de salaire restent un
sous-ensemble de l’annonce publique ; aucun profil ou CV n’y est ajouté.

L’enveloppe `jobspy-salary-1` contient commit adaptateur, bornes sous forme de
chaînes décimales finies, devise et intervalle parsés, données source et
`eligibility=unverified`. Les valeurs absentes restent nulles ; un montant non
fini/invalide ne devient pas zéro. Les valeurs originales restent dans les
champs source disponibles, même si JobSpy a déjà arrondi sa projection.

Le [normaliseur](../../metier/app/jobboard/integrations/jobspy_catalogue.py)
transmet cette enveloppe comme entrée de compensation et dans le payload brut.
Le hash source change lorsqu’elle change. Les imports existants conservent le
payload dans `OfferSource.raw_payload` et dans les `SourceRevision` immuables.
Un rejeu identique ne crée pas de révision ; les anciennes valeurs restent
consultables après modification. Il n’y a pas encore de nouveau `CompensationBand`
ni d’affichage salarial issu de ce transport : c’est la responsabilité E2.5b/E4.3.
La version d’enrichissement métier peut rester identique malgré une nouvelle
révision de salaire ; elle ne constitue pas le versionnement des rémunérations.

## Validation

39 tests Django réussis sur PostgreSQL isolé en 3,908 secondes, dont six tests de
transport : provenance base/estimé, devise/période inconnue, montants invalides,
runner complet avec adaptateur contrôlé, normalisation et persistance/idempotence
avec révisions. Les autres cas couvrent contrats IT, collecte, runtime et reprise.
Le premier passage a détecté un paramètre de salaire branché à tort sur
l’extraction métier ; corrigé avant la passe finale. Le mock historique du runner
a été adapté à l’interface `_process_job` réellement utilisée dans la dépendance.

Ruff, contrôle Django, absence de migration imprévue et `git diff --check` réussis.
Réseau externe simulé, PostgreSQL réel. Suite Django complète, build frontend,
Playwright et recette navigateur non relancés pour ce transport backend sans
changement de parcours UI. Aucun essai live, migration de production, publication
GitHub, CI distante ou déploiement exécuté.

## Suite

E2.5b doit classifier les preuves de salaire publié/estimé/inconnu, normaliser les
bornes sans annualisation implicite, lier les fourchettes à leur révision et
rendre les données absentes ou contradictoires visibles. La supervision des
sources prévue par E2.5 reste ouverte. Ces travaux précèdent les statistiques E5.
