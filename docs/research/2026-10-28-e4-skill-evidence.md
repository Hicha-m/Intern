# E4.2a — Première extraction des compétences avec preuves

Branche : `feat/e4-skill-evidence`, dépendante du catalogue et des collectes E1/E2.

## Périmètre et critères

Réutiliser `Skill`, ses identifiants existants et les primitives de description du
projet ; conserver mentions obligatoires, souhaitées, non qualifiées et négatives,
avec révision, chemin, extrait et version. Ne pas déduire une compétence absente,
modifier une préférence privée ou transformer une alternative en paire obligatoire.
Le résultat reste une baseline de règles, pas une validation des cibles du PRD.

## Modèle et intégration

`SkillExtraction` enregistre révision, version, date d’exécution, champs lus et
statut `processed`, `no_description` ou `too_large`. Un traitement sans mention
est distinct d’une description absente ; aucune absence de mention ne démontre
l’absence d’exigence dans le marché. Limite : 200 000 caractères par révision.

`SkillEvidence` conserve le lien vers `Skill`, la qualification, le chemin JSON,
les offsets en points de code Unicode et l’extrait littéral du champ source, incluant les
balises HTML éventuelles. L’extrait n’est pas du HTML à exécuter. La révision
fournit source et date d’observation ; l’extraction fournit méthode et date de
traitement. La confiance numérique reste inconnue (`null`), faute de calibration.

Les imports entreprise et publications recruteur créent ces preuves dans leurs
transactions existantes. Un rejeu de la même révision/version est idempotent ; une
nouvelle révision conserve les preuves précédentes. La migration 0040 est additive,
préserve les compétences existantes et refuse de supprimer des preuves lors d’un
retour de schéma. Un retour applicatif peut conserver les nouvelles tables.

`OfferSkill` est le résumé canonique déjà utilisé par les recommandations, avec
une seule ligne par couple offre/compétence. Il ne permet pas de conserver plusieurs
preuves ou négations de sources distinctes. Les nouvelles tables enregistrent ces
preuves, sans remplacer ce résumé ni ses qualifications manuelles. Aucun profil
candidat ou CV ne participe à l’extraction.

## Règles et couverture

La taxonomie existante de métiers n’est pas un dictionnaire de technologies.
`skills-1` ajoute donc un vocabulaire technique explicite et versionné de 24
compétences (Python, JavaScript, TypeScript, Java, C++, C#, SQL, PostgreSQL,
React, Vue.js, Node.js, Django, FastAPI, Docker, Kubernetes, Git, Linux, Terraform,
AWS, Azure, Rust, Go via « Golang », TensorFlow et PyTorch). Les synonymes connus
réutilisent un `Skill` existant par slug ou nom avant de créer une entrée.
Les mots trop ambigus comme « Go » seul ne sont pas reconnus dans cette version.

Les sections reprennent `section_kind` et `plain_text` existants. Les marqueurs
FR/EN et sections de profil/préférences donnent la qualification. Les indices
mélangés ou contradictoires deviennent non qualifiés, avec motif `mixed_cues`.
Les négations explicites sont gardées ; les alternatives « or/ou » sont signalées.
Elles ne prouvent pas que chaque option est requise séparément. Les mentions de
présentation entreprise, avantages et recrutement sont exclues ; scripts/styles
sont masqués en conservant les positions originales.

Champs pris en charge : `descriptionPlain`, `descriptionHtml`, `description`,
`content`, `jobDescription`, description imbriquée Workday et listes Lever, avec
contexte du titre de liste. Les autres formes, dont certains profils WTTJ et
sections structurées ATS, restent à compléter. Un langage autre que FR/EN n’est
pas considéré comme validé par ces règles.

`current_skill_evidence(offers)` exige un corpus d’offres explicite, puis filtre
sur méthode courante, hash source courant, source active/fraîche et board activé.
Les anciennes preuves restent en base mais n’alimentent pas cette sélection.
Les mentions négatives ne doivent pas être comptées comme exigences ; les
alternatives et les non qualifiées doivent rester séparées dans les agrégats.
Le futur panel devra appliquer en amont le même périmètre public d’offres à toutes
ses métriques et publier la couverture du vocabulaire et des champs.

## Validation

Les tests ciblés ont reproduit puis corrigé une fuite de contexte après un bloc
script : une présentation entreprise ne doit pas hériter du statut « requis ».
Les offsets continuent à pointer l’extrait original après masquage du contenu caché.
Première reprise ciblée réussie. Régression complète finale : **646 tests Django
réussis sur PostgreSQL isolé en 214,203 secondes**, dont 11 nouveaux tests de
règles, persistance, sélection courante et migration. La première suite complète
avait encore chargé le découpage HTML précédent et a échoué sur ce cas ; la suite
finale a été relancée après correction. Ruff, contrôle Django, absence de dérive
des migrations et `git diff --check` réussis.

Les tests couvrent FR/EN, synonymes, faux amis, C++/C#, Node.js, négations,
alternatives, indices contradictoires, HTML, scripts, champs absents, limites,
idempotence, révisions, conservation des résumés manuels, ancienne orthographe
des slugs, sélection fraîche et retour protégé des migrations. Ce sont des
régressions contrôlées, pas le corpus indépendant de 200 annonces du PRD.
Aucune précision/rappel cible n’est revendiquée. L’évaluation annotée reste ouverte.

Aucun nouvel écran ou endpoint public, aucun parcours UI changé : pas de build
frontend ou recette navigateur relancés pour cette extraction interne. Sources
réseau simulées, transactions PostgreSQL réelles. Aucun déploiement, migration de
production, collecte externe, CI distante ou publication GitHub exécuté.

## Suite

Élargir les champs et le corpus annoté ; extraire diplôme, certification, langues,
années d’expérience et séniorité dans les stories suivantes. Le panel pourra
présenter effectifs, inconnus et liens vers ces preuves ; cette interface et les
cibles de qualité restent à livrer. Les reprises historiques appartiennent à E4.5.
