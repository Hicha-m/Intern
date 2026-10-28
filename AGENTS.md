# Instructions essentielles

- Lire le [PRD](PRD.md), l’[architecture](ARCHITECTURE.md) et la [roadmap](ROADMAP.md) avant de développer. Respecter l’existant et signaler les écarts.
- Travailler par epic, puis par petites stories avec critères d’acceptation. Mettre la roadmap à jour après chaque story terminée.
- Avant toute modification, examiner `git status` et la branche courante. Créer une branche courte depuis `master` à jour : `feat/<epic>-<sujet>`, `fix/<sujet>`, `docs/<sujet>` ou `test/<sujet>`. Changer de branche entre stories indépendantes ; conserver la branche d’une story en cours. Ne jamais écraser le travail local.
- Après chaque modification cohérente et vérifiée, faire immédiatement un commit ciblé avec un message Conventional Commits en anglais. Ne pas attendre la fin d’une session. Ajouter explicitement les fichiers concernés. Aucun commit direct sur `master` ; fusion par PR après contrôles réussis.
- Pour chaque changement fonctionnel, exécuter les tests unitaires et d’intégration concernés. Pour un correctif, ajouter un test de régression reproduisant le défaut. Pour un parcours utilisateur modifié, vérifier les E2E Playwright et la recette avec API/PostgreSQL réels. Tester aussi permissions, erreurs et migrations selon l’impact.
- Exécuter lint et build pertinents avant commit. Pour une modification documentaire seule : vérifier liens, cohérence et `git diff --check`. Voir les commandes dans [README.md](README.md) et [tests/README.md](tests/README.md).
- Distinguer tests simulés, recette réelle et contrôles non exécutés. Rapporter les résultats et blocages ; ne jamais annoncer une validation non réalisée.
- Garder le code simple. Préserver données, migrations, sessions et confidentialité des CV. Ne versionner aucun secret, identifiant de proxy ou corpus brut volumineux. Documenter toute nouvelle dépendance et décision structurante.
