# ✳ ANOMALIA — L'atelier de l'impossible

**Et si un mot devenait un monde ?**

Expérience web artistique, interactive, responsive et entièrement originale.
Tapez un mot, un lieu, un souvenir ou une idée : une planète, sa lumière, son ciel,
ses anneaux, ses montagnes, sa météo et sa légende prennent vie.

## Explorer

- **Inventer** un monde à partir de n'importe quel mot, ou cliquer sur « Surprenez-moi ».
- **Bouger** la souris ou le doigt pour déplacer subtilement le point de vue.
- **Toucher le ciel** pour semer des étoiles, dessiner des constellations et jouer des notes.
- **Activer le son** pour entendre l'ambiance musicale et la mélodie de chaque étoile.
- **Appuyer sur Espace** (ordinateur) pour traverser brièvement le ciel en hypervitesse.
- **Ouvrir Mon atlas** pour retrouver ses mondes et les étoiles qu'on y a déposées.
- **Capturer** un monde en PNG.
- **Partager** une URL `?monde=...` qui recrée un monde identique chez quelqu'un d'autre.

## Technique

- HTML, CSS et JavaScript natifs, sans framework, sans build et sans compte.
- Graphismes procéduraux animés en **Canvas 2D** ; musique synthétisée avec **Web Audio**.
- Mondes déterministes : le même mot redonne le même univers visuel.
- Atlas personnel enregistré dans **localStorage** du navigateur (24 mondes max, 60 étoiles par monde).
- Interface et interactions pensées pour les téléphones, tablettes et ordinateurs.
- Les polices Google Fonts sont facultatives : des polices locales de remplacement sont prévues.
- Pas de serveur, pas de collecte de données, pas de cookies analytiques. Le partage ne partage pas les étoiles privées enregistrées sur l'appareil.

## Mise en ligne (très simple)

### Sur Vercel

1. Aller sur [vercel.com/new](https://vercel.com/new).
2. Choisir **Import Git Repository** et sélectionner `ludodulac/Site-tonnant-`.
3. Sélectionner la branche **main**. Framework **Other** ; laisser les commandes de build vides.
4. Cliquer sur **Deploy**. La racine du projet contient directement `index.html`.

### Sur GitHub Pages (alternative)

1. Ouvrir le dépôt GitHub > **Settings** > **Pages**.
2. Dans **Build and deployment**, choisir **Deploy from a branch**.
3. Sélectionner **main**, dossier **/(root)**, puis **Save**.

L'adresse publique sera, en général :
`https://ludodulac.github.io/Site-tonnant-/`

## Développement local

Ouvrir `index.html` dans un navigateur récent, ou servir le dossier avec :

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

## Fichiers

- `index.html` : structure et accessibilité.
- `style.css` : direction artistique, mobile et animations.
- `app.js` : moteur graphique, interaction, synthèse sonore, atlas et partage.
- `favicon.svg` : icône de marque.

*ANOMALIA est une œuvre interactive fictionnelle, pas une carte astronomique scientifique.*
