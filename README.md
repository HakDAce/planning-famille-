# Planning Famille

Application de planning familial (mobile et tablette) : agenda de la semaine, activités qui se répètent, tâches de la maison, temps d'activités par membre, menus et liste de courses.

Elle est **reliée à l'appli [Courses](https://github.com/HakDAce/courses)** : même projet Firebase, même compte de connexion.

| Données | Collection Firestore | Partagée avec Courses |
|---|---|---|
| Membres de la famille | `famille` | non |
| Activités (uniques ou chaque semaine) | `activites` | non |
| Tâches | `taches` | non |
| Menus de la semaine | `menus` | **oui** (lecture et écriture) |
| Recettes | `plats` | **oui** (lecture) |
| Liste de courses | `courses` | **oui** (lecture et écriture) |

## Mise en route

1. **Règles Firestore** : dans la console Firebase (projet `budget-foyer-f354e`) → Firestore → Règles, ajouter les 3 nouvelles collections avec **la même condition que `courses`**. Exemple si la règle actuelle est « utilisateur connecté » :

   ```
   match /famille/{id}   { allow read, write: if request.auth != null; }
   match /activites/{id} { allow read, write: if request.auth != null; }
   match /taches/{id}    { allow read, write: if request.auth != null; }
   ```

2. **Publication** : Settings → Pages → Deploy from a branch → `main` / root. L'appli sera à `https://hakdace.github.io/planning-famille-/`.

3. **Domaine autorisé** : Firebase → Authentication → Settings → Authorized domains. Le domaine `<compte>.github.io` doit y être (il l'est déjà si Courses est publiée sur GitHub Pages).

4. Sur téléphone ou tablette : ouvrir l'adresse, puis « Ajouter à l'écran d'accueil ».

## Fichiers

- `index.html` : structure et écran de connexion
- `style.css` : apparence (thème clair et sombre)
- `app.js` : logique et lien Firebase
- `config.js` : configuration Firebase (valeurs publiques, identiques à Courses)
- `sw.js`, `manifest.webmanifest`, icônes : installation et fonctionnement hors ligne
