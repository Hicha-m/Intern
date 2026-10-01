# Sources du diagnostic lot 32

Vérifications publiques le 1 octobre 2026, empreintes dans le rapport projection.

- [Winamax — Lever public](https://api.lever.co/v0/postings/winamax?mode=json&limit=100) :
  29 annonces dans la réponse du diagnostic ; pays FR explicite sur les deux
  stages poker, libellé principal Paris. Le précédent adaptateur ignorait country.
- [Qube — Greenhouse public](https://boards-api.greenhouse.io/v1/boards/quberesearchandtechnologies/jobs?content=true) :
  199 annonces ; quatre stages perdus à cause de listes de villes séparées par
  virgules. La métadonnée Locations et les adresses des offices apportent la preuve.
  Une cinquième liste partiellement corroborée reste non résolue : pas d'inférence
  des villes manquantes. Le cas Graduate or Internship explicite bien la possibilité
  d'un stage de 3–6 mois ; ne pas le présenter comme exclusivement un stage.
- [WPP Media — Greenhouse public](https://boards-api.greenhouse.io/v1/boards/wppmedia/jobs?content=true) :
  977 annonces ; dix-sept titres de stagiaires danois associés à une rubrique de
  période de stage. Le titre seul ne suffit pas dans la nouvelle règle.

Rapport initial : 1615 boards enabled. Les principales incertitudes incluent des
postes ordinaires classés uncertain ; leur nombre n'est pas un potentiel de gain.
La sélection des correctifs repose sur les annonces corroborées, pas uniquement
sur la taille des buckets. Les collectes partielles et les erreurs restent visibles
par board dans le rapport, sans promettre une exhaustivité upstream.

Gain réel : 23 fiches visibles ; DK 18, FR 6, GB 4 avec recoupement géographique.
L'audit ciblé laisse trois groupes ambigus (deux Winamax et un Qube), aucune fusion
certaine. Rapports complets before, projection, pilot, after, results conservés.
