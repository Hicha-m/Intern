# Validation Docker — 12 octobre 2026

## Environnement et portée

Les images et les trois conteneurs ont été construits et exécutés sur une
instance de TP isolée du serveur Hetzner. Docker Desktop sur le Mac répondait
à `docker --version`, mais son API `_ping` et `docker info` ne répondaient pas.
Le TP a donc utilisé son propre projet `intern-tp`, ses réseaux/volumes et le
port **127.0.0.1:18088**, distincts du projet en ligne `intern`.

Hôte de validation : Ubuntu 26.04 LTS, x86_64, AMD EPYC-Rome, environ 7,56 Gio
de RAM. Les images de runtime sont Python 3.14 slim, PostgreSQL 16.15-bookworm
et Nginx 1.28.0-alpine. Le client a été construit dans Node 22-alpine.
Les IDs/digests exacts, versions Docker/Compose et empreintes des deux SQL
figurent dans les fichiers JSON. Le code applicatif n'a pas été modifié.

## Résultats

| Livrable / contrôle | Résultat | Preuve |
| --- | --- | --- |
| Étape 11 : PostgreSQL initialisé par les deux SQL, volume et santé | Huit comptes, quatre offres ; **34 invariants SQL réussis**, écritures annulées | `verification.txt` |
| Rôle applicatif | Ni superutilisateur, ni création de bases/rôles ; objets possédés par le rôle applicatif | `verification.txt` |
| Étape 12 : backend construit, dépendances avant le code, exclusions | Réussi ; ressources de `seed_dev` disponibles, migrations à jour | `verification.txt`, `mesures-docker.json` |
| Étape 13 : exactement trois services et deux réseaux, proxy seul publié | Trois services sains ; API seule sur les deux réseaux, base sur réseau interne | `verification.json`, `services.txt`, `trois-services.png` |
| Matrice étape 14 | Huit liaisons TCP positives/négatives conformes ; hôte/proxy HTTP 200 | `verification.json` |
| Persistance après `down` puis recréation | Ancien conteneur supprimé, même volume, marqueur conservé, 34 invariants encore réussis | `persistance.json` |
| Client connecté aux services réels | **Six contrôles navigateur réussis**, sans réponses API simulées | `recette.txt`, captures |
| Exécution répétée | Trois séries de démarrage, repos de 30 s et dix GET par série | `mesures-docker.json` |
| Syntaxe/statique | Python, shell et JavaScript valides ; Ruff E4/E7/E9/F/I réussi | Contrôles exécutés sur le Mac |

Le navigateur a vérifié chaîne complète et CSRF, connexion candidat et session
après rechargement, catalogue SQL et CV privé, refus du rôle candidat sur l'API
recruteur, connexion recruteur et ses ressources, administration et statiques,
affichage mobile, origine API unique et absence d'erreur JavaScript. Les données
sont fictives ; les contrôles ne contactent ni ATS ni fournisseur email.

## Matrice observée

| Depuis | Proxy :80 | Métier :8000 | Données :5432 |
| --- | --- | --- | --- |
| Hôte | HTTP 200 via 18088 | Refus TCP | Refus TCP |
| Proxy | — | Succès TCP | Refus TCP |
| Métier | Succès TCP | — | Succès TCP et SQL |
| Données | Refus TCP | Succès TCP | — |

Sur Linux natif, les refus hôte sont renforcés par `isoler_hote.py`, qui cible
uniquement les IP privées de ce TP. Ce contrôle n'est pas déduit de l'absence
de port publié. Les services sont sains pendant les tentatives négatives.

## Mesures de validation, non comparables aux VM Fedora

| Série | Démarrage jusqu'au catalogue (s) | Médiane de dix GET (ms) |
| --- | ---: | ---: |
| 1 | 18,186 | 46,227 |
| 2 | 18,226 | 32,770 |
| 3 | 18,753 | 35,653 |
| Médiane retenue | **18,226** | **35,653** |

Tailles logiques des images : backend **345 187 869 octets**, proxy
**23 689 265 octets**, PostgreSQL **157 461 691 octets**. Ce sont des tailles
d'images, pas une mesure de leur empreinte allouée totale. Les couches partagées,
volumes et la mémoire du moteur sont consignés séparément dans le JSON.

Ces essais sont sur un serveur partagé distinct du Fedora des VM. Aucun gain,
ratio ou classement VM/Docker n'en est déduit. Pour terminer l'étape 14, rejouer
`mesurer.py` sur le même Fedora avec les VM éteintes, maîtriser les tâches de
fond et finaliser le tableau et le compte rendu de deux pages. Sur macOS,
inclure en plus le coût de la VM Docker Desktop. Voir
[comparaison.md](../../docs/comparaison.md).

## Fichiers et reproduction

- [Procédure](../PROCEDURE.md) : construction, peuplement, vérifications, mesures, arrêt et réinitialisation.
- [Vérifications JSON](verification.json) et [sorties SQL](verification.txt).
- [Persistance](persistance.json), [mesures brutes](mesures-docker.json), [recette navigateur](recette.txt).
- [Trois services](trois-services.png), [connexion](connexion.png), [candidat](candidat.png), [recruteur](recruteur.png).

La capture des trois services est un rendu lisible de la sortie Compose réelle
conservée dans `services.txt`. Les captures applicatives viennent du navigateur
via un tunnel SSH vers le proxy du TP ; aucun port public de test n'a été ouvert.

Après validation, les trois conteneurs de TP et leurs réseaux ont été arrêtés
et supprimés, leurs volumes conservés et le filtre hôte retiré. Le service
en ligne `intern` répond toujours `status: ok` à `/health/ready/`.
