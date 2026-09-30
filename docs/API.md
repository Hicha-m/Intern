# API candidat Intern

Préfixe `/api/v1/`. JSON objet et cookie de session Django. Toutes les mutations requièrent `X-CSRFToken`, y compris inscription et connexion. Récupérer le token via `GET auth/csrf/` et utiliser le nouveau token retourné après authentification. Pas de CORS ouvert : le frontend est prévu sur la même origine. Réponses privées `Cache-Control: no-store`.

Les routes et objectifs figurent dans [BACKEND_SPEC.md](BACKEND_SPEC.md). Exemples de corps :

```json
{"username":"candidate","email":"candidate@example.com","password":"a-long-unique-password","full_name":"Ada Example"}
```

`auth/register/` POST. Connexion : `auth/login/` POST `{username,password}`. Déconnexion : POST `{}`. Identité : `auth/me/` GET. Mot de passe : `auth/password/` POST `{old_password,new_password}`. Reset : POST `{email}` sur `auth/password-reset/` puis `{uid,token,new_password}` sur `auth/password-reset-confirm/`. Le lien email cible la page frontend `/reset-password?uid=...&token=...` ; celle-ci devra appeler l'API de confirmation. Un jeton utilisé devient invalide.

## Profil et recherche

`profile/` PATCH accepte `full_name`, `first_name`, `last_name`, `phone`, `headline`, `presentation`, `location_text`, `location_id`, `available_from`, `linkedin_url`, `github_url`, `portfolio_url`, `skill_ids`. Les champs absents sont conservés ; les champs nullable acceptent null. Version et propriétaire ne sont jamais assignables.

Collections `/profile/experiences/`, `/profile/education/`, `/profile/projects/`, `/profile/work-authorizations/` : GET paginé, POST création, puis PATCH/DELETE sur `/<id>/`. Les champs exacts sont les listes explicites `CHILDREN` dans `jobboard/services/profiles.py`. Une autorisation de travail envoyée par le candidat reçoit une date de confirmation serveur.

`preferences/` PUT conserve les champs omis et remplace les listes fournies. Exemple :

```json
{"role_ids":[1],"location_ids":[1],"contracts":["internship"],"work_modes":["hybrid","remote"],"minimum_salary":"1200.00","salary_currency":"EUR","salary_period":"month","salary_gross_net":"gross","willing_to_relocate":true}
```

Pour supprimer le salaire minimum, envoyer `minimum_salary`, `salary_currency`, `salary_period` à null ensemble. Les listes vides sont conservées comme choix explicites.

`offers/` GET : `q`, `role` (ID), `location` (ID), `contract_type`, `work_mode`, `page`, `page_size`. `offers/<id>/` ajoute la description en texte. Les descriptions doivent être affichées comme du texte, jamais comme du HTML de confiance. `catalogue/?kind=roles|skills|locations` est paginé, avec recherche `q`. `saved-offers/<offer_id>/` PUT `{}` et DELETE sont idempotents ; `saved-offers/` retourne aussi les anciennes offres sauvegardées. `recommendations/` retourne `{offer,reasons}` ; aucun score de probabilité d'embauche. Les contrats et modes acceptés sont obligatoires ensemble ; sans préférences explicites, aucune recommandation. `include_unknown=true` conserve les données inconnues, `false` les exclut. Un salaire n'est comparé que si devise, période et brut/net correspondent ; `unknown_fields` et `salary_comparison` expliquent ce traitement.

## Documents

`documents/` POST multipart : un `file` PDF et un `kind` (`resume` ou `cover_letter`). Réponse : ID, statut, SHA-256, taille, nom. `profile/resume/` PUT `{ "document_id": 1 }` sélectionne le CV courant. GET `documents/` paginé ; GET `documents/<id>/download/` télécharge le PDF en pièce jointe. DELETE `documents/<id>/` retourne 204 ; 409 si une révision, un CV courant, une preuve ou un upload actif empêche la suppression.

## Dossiers, approbation et suivi

`applications/` POST `{offer_id,source_id}` crée ou retrouve le dossier existant. GET paginé, filtre `status` facultatif. `applications/<id>/` retourne le dossier, `latest_revision` et `latest_run`. Les historiques indépendants sont paginés avec GET `/revisions/`, `/runs/` et `/events/`.

POST `/prepare/` `{}` prend un nouveau snapshot du profil, de l'offre et du formulaire. Chaque correction POST `/revisions/` crée une nouvelle révision :

```json
{"answers":[{"field_key":"first_name","value":"Ada"},{"field_key":"last_name","value":"Example"},{"field_key":"email","value":"candidate@example.com"}],"document_ids":[1]}
```

Envoyer la liste complète des réponses voulues ; les réponses omises ne sont pas reprises. `field_key` doit exister dans `form_snapshot.fields` ; les fichiers sont représentés dans `document_ids`, jamais comme des réponses textuelles. Les sources et dates de confirmation des corrections sont fixées serveur. Les révisions retournent `content_hash`, `missing_fields`, les snapshots et pièces réellement prévues.

POST `/approve/` :

```json
{"revision_id":1,"content_hash":"64-caracteres-hexadecimaux-retournes-par-la-revision","idempotency_key":"0aaf3ac0-32c4-4e84-8b67-b4486bac9536"}
```

Réutiliser **la même clé pour le même clic**, même après coupure réseau. Retour : run queued ou run précédemment créé. Une autre clé ne contourne pas un run actif/incertain. Le frontend doit afficher exactement le dossier correspondant au hash approuvé. Accord limité à 24 h. Toute modification impose une nouvelle révision et approbation.

POST `/revoke/` `{}` annule avant effet externe ; après début d'envoi, 409. POST `/resolve/` `{outcome:"submitted"|"not_submitted",evidence:"référence ou vérification effectuée"}` est réservé à la résolution humaine d'un run incertain après fin de lease. Cette action n'envoie rien. L'origine `user` est conservée dans l'historique.

POST `/status/` `{status,reason}` enregistre une correction de suivi ; elle est bloquée pendant un run actif/incertain. Statuts : draft, submitted, screening, interview, offer_received, accepted, rejected, withdrawn. Une candidature envoyée ne revient pas à draft.

`/tasks/` GET/POST puis `/<id>/` PATCH/DELETE : title, due_at, completed_at. `/interviews/` mêmes méthodes : title, starts_at, ends_at, display_timezone (IANA), meeting_url, location_text, status, notes. Pas d'événement envoyé par email/calendrier : ces objets sont le suivi interne.

## Export et suppression

GET `account/export/` : ZIP privé, `data.json` versionné et `documents/<id>.pdf`, maximum 100 Mio. POST `account/delete/` `{password}` : désactivation immédiate, déconnexion, reçu de demande. La commande `purge_accounts` effectue ensuite la purge reprise sur erreur.

## Erreurs et pagination

```json
{"error":{"code":"missing_answers","message":"Complete required application fields.","details":{"fields":["first_name"]}}}
```

Listes : `{results,count,page,page_size}`. Pages commencent à 1, taille par défaut 20, maximum 100. Une page inexistante renvoie 404. Les IDs étrangers retournent la même erreur 404 qu'une ressource absente. 400 validation, 401 session, 403 CSRF, 409 conflit, 413 taille, 415 mauvais Content-Type, 429 limite d'authentification, 503 source/stockage indisponible.
