# Préparation Podman sur Fedora — 12 octobre 2026

## Choix et travaux confirmés

Omar a demandé explicitement d'utiliser Podman à la place de Docker Engine.
Le poste `fedora` utilise Podman **5.8.2**, podman-compose **1.5.0**, Linux
`6.19.14-108.fc42.x86_64` et les trois VM de la référence. La connexion SSH
par clé au compte utilisateur a réussi. Docker Engine n'a pas été installé.

Le dépôt de travail distant possède des modifications locales et une autre
branche ; il n'a pas été écrasé. Une copie dédiée du TP a été préparée dans
`~/.local/share/intern-tp-20261012`, avec une configuration privée neuve et un
nom de projet distinct `intern-tp`. Les deux images ont été construites avec
Podman. Les chemins d'images officiels sont explicites pour éviter la sélection
interactive de registre. Les montages SQL portent le label SELinux `Z` dans
cette copie dédiée.

Le TP utilise Python **3.12.3**, comme les VM. Le Dockerfile commun garde
Python 3.14 comme valeur par défaut pour les autres déploiements. Nginx reste
1.28.0-alpine dans le TP, contre 1.24.0 dans les VM : cette différence doit
figurer dans l'analyse des mesures.

Le contrôle du manifest backend des VM a trouvé **248 sources identiques sur
249** dans le projet du Mac. La seule différence est
`jobboard/services/company_logos.py`. Pour mesurer la même version que les VM,
la copie de benchmark Fedora utilise ce fichier de la copie distante existante,
dont l'empreinte correspond au manifest VM :
`1a8808dfe6751fa946d834fd694f22ef46c47641a6860c4c62e76858377cad69`.
Le fichier applicatif du Mac et le dépôt distant d'origine sont conservés.
L'image métier de benchmark a été reconstruite après cette copie.

## Adaptations livrées

- `CONTAINER_ENGINE=podman` sélectionne le moteur dans les scripts.
- Le fournisseur Compose reçoit `--in-pod=false` pour empêcher le partage
  d'un même espace réseau entre les trois services.
- L'attente des trois états de santé est adaptée à podman-compose.
- La lecture des métriques et des volumes prend en charge le mode rootless.
- `mesurer_vm.py` répète trois séries VM avec arrêt ACPI, repos de 30 secondes
  et dix consultations par série ; il n'emploie aucun arrêt forcé.
- Les scripts de mesure refusent les redirections HTTP hors de la route locale.

## Interruption et état non confirmé

L'ancienne instance `pod_intern` a été arrêtée pour ne mesurer qu'un seul
déploiement à la fois. La mesure des VM a été lancée ensuite. La connexion
SSH à Fedora s'est interrompue avant la réception d'une première série.
Les nouvelles connexions au port 22 expirent.

**Aucun résultat comparatif Fedora n'est livré à ce stade.** L'état final des
VM, le résultat du processus distant et la remise en marche de l'ancienne
instance ne sont pas confirmés. Les preuves Docker/Hetzner déjà enregistrées
dans `VALIDATION.md` restent valables pour leur environnement ; elles ne
prouvent pas une exécution des trois conteneurs Podman sur Fedora.

Après rétablissement de l'accès, inspecter d'abord les processus de mesure,
l'état des trois VM et de `pod_intern`, puis récupérer les résultats éventuels.
Ne pas lancer une seconde mesure tant que la première pourrait encore tourner.
Les VM utilisent désormais `test.hicham.dpdns.org` et
`testadmin.hicham.dpdns.org` comme hôtes HTTP autorisés. Utiliser
`TP_COMPARISON_HOST=test.hicham.dpdns.org` pour la requête locale et vérifier
l'absence de redirection externe avant toute campagne.

La configuration SSH invitée contient des chemins avec espaces. Pour les
contrôles ponctuels, une copie temporaire de la configuration a été utilisée
avec un ProxyCommand explicite ; la redirection SSH `ssh-verification`
temporairement ajoutée au proxy a été retirée après ces lectures.
