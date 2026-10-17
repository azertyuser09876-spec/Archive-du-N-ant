# Notes techniques

Ce document accompagne le code. Il décrit l’architecture, l’état des huit phases prévues par le document de conception, et la dette technique connue.

## Principes suivis

- **Données séparées de la logique.** Biomes, créatures, équipement et récit sont des objets JavaScript purs dans `js/data/`. Ajouter une créature ne demande pas de code.
- **Créatures par composants.** Une créature combine un tempérament (`passif`, `craintif`, `territorial`, `agressif`), un mode de déplacement (`walk`, `hop`, `fly`, `drift`, `burrow`, `blink`, `slither`), une attaque (`bite`, `shoot`, `charge`, `spit`, `zap`, `slam`) et des traits. Un seul module d’IA (`js/game/ai.js`) les anime toutes, compagnons compris.
- **Boss par motifs.** Gardiens et ultra-boss enchaînent des phases composées de motifs réutilisables (`radial`, `spiral`, `aimed`, `charge`, `slam`, `rain`, `summon`, `burrow`, `laser`, `shockwave`, `pools`, `blink`), voir `js/game/boss.js`.
- **Génération déterministe.** `AN.RNG` (mulberry32) et `AN.Noise` (bruit de valeur) sont initialisés par des graines dérivées par hachage. Un monde, ses zones, ses créatures et leurs variantes ne dépendent que de la graine du monde.
- **Génération séparée de l’affichage.** `js/gen/` produit des grilles et des listes ; `js/render/` les dessine.
- **Sauvegarde versionnée.** `AN.Save.VERSION`, une table `MIGRATIONS` et un complément automatique des champs manquants. Une sauvegarde d’une version future est refusée plutôt que corrompue.
- **Aucune dépendance.** Pas de bibliothèque, pas de compilation, pas de ressource externe (polices système, sons synthétisés, graphismes dessinés).

## Architecture

```
main.js           boucle (requestAnimationFrame, pas de temps plafonné à 50 ms), scènes, fondus
scènes            AN.Archive.scene, AN.Expedition.scene, AN.Cinematic.scene
état global       AN.Game.profile (sauvegarde), AN.X (expédition en cours)
entrées           AN.Input : touches par position physique (event.code), traduites en codes logiques
                  (reconfigurables) ; manette (AN.Pad) et tactile (AN.Touch) pressent ces mêmes codes
réglages          AN.Prefs : réglages de l’appareil, hors des parties (touches, accessibilité, tactile, manette)
interface         HTML par-dessus le canevas (js/ui/), bloque les entrées du jeu quand une fenêtre est ouverte
```

Une zone d’expédition est dessinée une seule fois dans un canevas hors écran (environ 2 400 px de côté), puis affichée par morceaux. Pendant l’effondrement, les tuiles effacées sont peintes en blanc directement dans ce canevas. Un seul canevas de zone existe à la fois.

## État des phases

| Phase | Contenu demandé | État |
|---|---|---|
| 1. Archive vide | déplacement, monde blanc, Artefact, interface de sélection | fait |
| 2. Première destination | un monde, une zone, des ressources, une créature hostile | fait, avec mondes de 2 à 4 zones et un cœur |
| 3. Capture | condition de capture, stockage limité, transport | fait : affaiblissement, rayon, soute à places |
| 4. Extraction | activation, délai, effondrement, retour | fait : plaques blanches, portail, effondrement progressif, cinématique de dézoom |
| 5. Intégration | apparition de la capture, fragment de terrain, habitat, sauvegarde | fait : territoires hexagonaux, habitats, production, sauvegarde automatique |
| 6. Risque | perte d’équipement, poursuivre ou repartir, valeurs de butin, urgence | fait : objets liés ou non, valeur en jeu affichée, extraction d’urgence (X) |
| 7. Boss | gardien, plusieurs phases, capture spéciale, conquête de zone | fait : 10 gardiens et 4 ultra-boss, épuisement, capture sous ondes de choc ou coup de grâce |
| 8. Procédural | graines, combinaisons de biomes, variantes, liste renouvelée | fait : 20 biomes combinables, 8 variantes, règles et anomalies, liste renouvelée après chaque expédition |

### Phase 9 : créatures approfondies (0.9)

| Système | Module | Données |
|---|---|---|
| Niveaux, loyauté, faim, conflits, reproduction, évolution | `js/game/bonds.js` | `js/data/traits.js` |
| Montures | `js/game/mounts.js` | `mount` dans `traits.js` |
| Capacités prêtées et appels stratégiques | `js/game/abilities.js` | `D.ABILITIES`, `D.CALLS` |
| Clés d’environnement, caveaux, œufs | `js/game/keys.js`, `js/gen/zonegen.js` | `D.KEYS`, `keys` |
| Compagnons perdus, mondes en sursis, essences | `js/game/rescue.js` | — |

Le temps de l’Archive avance d’une minute par minute de jeu, et rattrape jusqu’à trois heures d’absence. Les traits sont des données : une créature ajoutée sans entrée dans `traits.js` reçoit des valeurs par défaut.

### Phase 10 : civilisations et morale (0.10)

| Système | Module | Données |
|---|---|---|
| Présence d’un peuple (tirage séparé, `RNG.from(graine, 'civilisation')`, pondéré par la réputation) | `js/gen/worldgen.js` | `D.PEOPLES`, `D.ATTITUDES`, `D.REP_WEIGHTS` |
| Clairière et bâtiments (tuiles `BUILDING`, creusés avant le calcul d’accessibilité) | `js/gen/zonegen.js` | — |
| Habitants, dialogues, rassemblement, force, arche, voleurs, iconoclastes, fin d’expédition | `js/game/civs.js`, `js/ui/dialogue.js` | `D.CIV_LINES`, `D.CIV_ROLES`, `D.CIV_RUMORS` |
| Peuples installés : humeur, demandes, offrandes, grèves, vols, bonus | `js/game/settlements.js` | `bonus` de chaque peuple, `D.CIV_REQUESTS`, `D.CIV_GIFTS` |
| Dessin des habitants et de l’architecture | `js/render/civArt.js` | `body`, `style` de chaque peuple |

Les habitants réutilisent le moteur des créatures : `AN.Civ.def(peuple, rôle)` fabrique une fausse espèce (`art.shape = 'npc'`, `npc: true`). Les habitants pacifiques sont dans l’équipe `civil` (liste `X.civils`), hors de portée du rayon et des tirs ; emmenés de force ou hostiles, ils passent dans l’équipe `wild`. Les créatures sauvages peuvent s’en prendre aux habitants « exposés » (en route vers la plaque, autour de l’arche).

Les mondes déjà générés en 0.9 restent identiques : la présence d’un peuple et le village utilisent leurs propres générateurs dérivés, et la clairière n’est creusée que dans les mondes habités.

### Phase 11 : échelles supérieures (1.0)

| Système | Module | Données |
|---|---|---|
| Échelons d’expédition (monde, orbite, système, galaxie) | `js/gen/worldgen.js` (`W.cosmic`), `js/gen/zonegen.js` | `D.ECHELONS`, biomes avec `scale` |
| Déplacements : inertie, puits de gravité, sauts | `js/game/cosmic.js`, `js/game/player.js`, `js/game/entities.js` (`e.accel`) | `move` de chaque échelon |
| Menaces : séismes, météores, éruptions, dévoreurs | `js/game/cosmic.js` | `event` de chaque échelon |
| Formes de capture, ancres, noyaux, attraction | `js/game/cosmic.js`, `js/game/capture.js`, `js/game/boss.js` (`B.EXTRA`) | `D.CAPTURE_FORMS`, `D.TIERS` 4 à 7 |
| Ancrage, astres, continents | `js/ui/panels.js` (transfert), `js/game/expedition.js` (fin) | `D.UPGRADES.ancrage`, `D.ASTRES` |
| Rangs, échelles et couches de l’Archive | `js/game/profile.js`, `js/game/cosmos.js`, `js/game/archive.js` | `D.RANKS` 6 à 9, `D.SCALES`, `D.EPILOGUE` |
| Formes dessinées | `js/render/cosmicArt.js` | `art.shape` : turtle, star, comet, nebula, spiral |

Toutes les données des échelles supérieures sont dans `js/data/cosmos.js`, chargé après les autres données : il ajoute des entrées sans modifier les existantes. Les régions générées avant la 1.0 restent identiques (les biomes cosmiques sont exclus de leurs tirages, et les gardiens sont filtrés par échelle). Le vide galactique est une tuile pleine (`ABYSS`) pour la marche et le calcul des chemins ; le joueur la franchit en sautant (déplacement sans collision pendant le saut), les volants la survolent.

Les couches lointaines de l’Archive (orbite, système, galaxie, inconnue) sont dessinées en coordonnées d’écran calculées en double précision : à un zoom de 1e-7, les transformations du canevas (en simple précision) ne suffiraient plus.

### Territoires multi-cases (1.1)

Un territoire garde une case d’ancrage (`q`, `r`) et une liste de cases relatives (`cells`, la première en `[0, 0]`). Tout passe par `js/game/shapes.js` : taille selon la qualité (`AN.Shapes.SIZE`), forme tirée de la zone (`fromZone` : grille hexagonale posée sur la zone, croissance vers les cases les plus ouvertes, avec un bonus de compacité), placement (`place`, `canPlace` : pas de chevauchement, contact avec l’Archive), voisinage (`neighbors`, utilisé par les synergies et les peuples), contour et découpe. Le rendu d’un territoire de plusieurs cases (`renderShape`) peint directement à l’échelle dans un canevas découpé selon la forme ; une version légère (`renderTerritoryLo`) sert aux vues lointaines, et l’Archive ne calcule qu’un terrain détaillé par image, en oubliant ceux qui ne sont plus regardés.

### Carte des destinations et recherche précise (1.2)

`js/ui/worldmap.js` dessine la carte (canevas animé, arrêté dès que l’élément quitte la page). La position d’un monde est stable : angle tiré de sa graine, distance tirée de sa menace sur une ellipse dont les anneaux s’adaptent à la menace maximale captée. `js/game/search.js` fait le décompte exact : il génère les zones du monde (génération déterministe, sans affichage), après un filtre rapide par biome, et met le résultat en cache par graine et par cible. Le balayage ciblé tire des graines dédiées jusqu’à trouver un monde qui contient la cible. La recherche est stockée dans `profile.search` (champ facultatif, sans migration), copiée dans l’expédition (`X.search`) ; `Search.onEnterZone`, `drawMinimap` et `drawCompass` s’y branchent.

### Nouvelle faune et tutoriel (1.3)

`js/data/fauna.js` ajoute 19 espèces au même format que `creatures.js` (traits dans `D.EXTRA_TRAITS`), dessinées par `js/render/faunaArt.js` (six formes). Le champ `unique` exclut une espèce des tirages (`WorldGen.guardianFor`) : le Veilleur du Seuil n’a aucun biome.

`js/game/tutorial.js` : le Seuil est une destination ordinaire marquée `tutorial`. `ZoneGen.generate` délègue sa zone à `Tutorial.zone` (salles reliées par des couloirs, gisements et groupes placés à la main) ; tout le reste passe par le moteur d’expédition, avec quelques crochets : `Tutorial.setup` (carte d’objectifs), `update` (étapes, soute du Seuil, gardien qui ne se relève pas, Mousseron de remplacement), `guard` (dans `PlayerCtl.damage` : pas de chute), `drawWorld` / `drawScreen` (cercle et flèche), et dans `Expedition.finish` la sortie (`leave`) ou la réussite (`onExtracted`). Les étapes sont des données (`Tutorial.STEPS` : titre, texte, cible, condition). La partie d’essai remplace le profil par un profil jetable et suspend la sauvegarde (`Save.suspended`) ; le vrai profil est rendu à la sortie. Un Seuil interrompu (onglet fermé) est effacé sans pénalité au chargement (`Tutorial.recover`) et reproposé.

### Outils, structures et événements (1.4)

Données : `js/data/works.js` (outils ajoutés à `D.GEAR` avec leurs effets `fx`, `D.TOOL_SLOTS`, `D.GEAR_SLOTS` qui remplace partout la liste des emplacements emportés, `D.STRUCTURES` à bâtir ou à découvrir, `D.STRUCT_SLOTS` autour de l’Artefact, `D.WORLD_EVENTS`). Rendu : `js/render/structArt.js` (une forme par structure, état envahi dans son monde, fantôme pour l’écho).

- `js/game/tools.js` : `Tools.apply` réunit les effets dans `X.T` à la fin de `PlayerCtl.computeStats` ; il fournit le poids effectif de la soute (`cargoUsed`, `weightFor`), la durée et le bonus de récolte, et les interactions propres (filon profond verrouillé, balise de rappel). Les interactions de l’expédition ont un cas par défaut qui délègue aux outils puis aux structures.
- `js/game/structures.js` : liste du profil (`profile.structures`, partagée avec les arches des peuples), construction, amélioration, reconstruction, rangement, recyclage ; `Structures.powers` rejoint `Profile.powers`, et les systèmes existants lisent ces valeurs (production : `Production.cap` / `offlineMax` ; scanner : `Profile.scanner` ; liens ; consommables : `Profile.consumableMax` ; reproduction, expérience et loyauté dans `bonds.js` ; guérison et transfert à la fin de l’expédition et dans `collapse.js`). Côté monde : fouille, démontage, objet de soute `{ structure, weight }`, retour dans l’Archive à l’extraction.
- Génération : `WorldGen.structuresAndEvents` tire, avec des flux d’aléatoire séparés, la structure et l’événement de chaque zone (le scanner peut ainsi les annoncer) ; `ZoneGen.generate` place la structure et les filons profonds avec un flux propre, après tout le reste. Une graine donne toujours le même monde.
- `js/game/events.js` : un événement par zone et par visite, déclenché après un délai tiré à la génération ; chaque type est un petit objet `start` / `update` / `end` / `draw` dans `Events.HANDLERS`.

### Confort (1.5)

- **Emplacements.** `AN.Save` connaît trois clés (`archive-du-neant/save`, `-2`, `-3`) ; la première reste celle des versions précédentes, si bien qu’une partie existante devient l’emplacement 1 sans migration. `Save.peek(n)` lit le résumé d’un emplacement pour l’écran titre sans le charger. Le dernier emplacement utilisé est dans `AN.Prefs`.
- **Réglages de l’appareil** (`js/core/prefs.js`) : une clé à part (`archive-du-neant/prefs`), complétée par des valeurs par défaut. `Prefs.applyUI` pose des variables CSS (`--ui-zoom`, `--cyan`, `--stamp`) et des classes sur `<html>` ; les couleurs du canevas lisent `AN.CYAN` et `AN.STAMP`, et le cache des icônes est vidé quand la palette change. Les réglages de son restent dans le profil, comme avant.
- **Touches reconfigurables.** Le jeu continue de tester les codes par défaut (`KeyF`, `KeyE`…), qui deviennent des codes « logiques » ; `Input` traduit la touche physique pressée en code logique d’après `Prefs.keys`. Une réattribution échange les deux touches en conflit. `Input.label(code)` donne le nom à afficher selon l’appareil utilisé en dernier (`Input.lastDevice`) et la disposition du clavier.
- **Reprise des expéditions** (`js/game/resume.js`). Un point de reprise est un résumé : la description du monde (sa graine suffit à regénérer chaque zone à l’identique), puis, par zone visitée, ce qui a changé depuis la génération (`zoneDelta` : gisements, ruines, caveaux, œufs, structure, plaques posées par la balise, brouillard codé par plages). À la reprise, `Expedition.start` reçoit `{ snap }`, `Resume.prepare` remet l’état général, chaque zone est regénérée en y entrant puis `Resume.applyZone` y réapplique son delta, et `Resume.after` replace le joueur et les compagnons. Les créatures ne sont pas enregistrées : elles réapparaissent à partir de la génération. Points de reprise toutes les 10 s (`Resume.tick`), au changement de zone, sur `beforeunload` et `visibilitychange`.

### Jouer partout (1.6)

- **Entrées virtuelles.** `Input.vAxis` (déplacement analogique), `Input.press / release` (touches logiques), `Input.mousePress / mouseRelease` (tir, frappe), `Input.aimDir` et `Input.virtualCursor()` : la souris est placée autour du personnage dans la direction visée, si bien que tout le code de visée existant (qui lit la souris) fonctionne sans changement. `Input.lastDevice` vaut `clavier`, `manette` ou `tactile`.
- **Manette** (`js/ui/gamepad.js`) : `Pad.poll(dt)` à chaque image, avant la scène. Zone morte de 0,22. Visée assistée (`Pad.assist`) pour la frappe et la capture quand le stick droit est au repos. Dans une fenêtre ouverte, la manette ne joue plus : elle déplace un focus entre les éléments visibles (recherche spatiale par direction), valide (A), revient (B, qui envoie un Échap synthétique), change d’onglet (LB / RB) et fait défiler (stick droit).
- **Tactile** (`js/ui/touch.js`) : une couche HTML par-dessus le canevas, dans laquelle chaque bouton presse un code logique ; deux sticks dynamiques (ils naissent sous le doigt, reviennent à leur place de repos au relâchement). `Touch.update` choisit la disposition (`exp`, `arc`, `map`) d’après la scène et masque tout quand une fenêtre est ouverte. Les consommables et l’encart du sac reçoivent directement les touches. Affichage automatique : dès qu’un toucher a été vu, ou sur un écran à pointeur grossier sans souris.
- **Application hors ligne** : `manifest.webmanifest`, icônes dans `icons/`, `sw.js` (service worker). À l’installation, il lit `index.html` pour mettre en cache toutes les ressources qu’il cite ; ensuite il sert le cache et le rafraîchit en arrière-plan. Il n’est enregistré qu’en http(s) et hors mode débogage : ouvrir `index.html` depuis le disque reste possible et inchangé. Changer `CACHE` dans `sw.js` à chaque version force le renouvellement.
- **Publication** : `publier-sur-github.bat` (Windows) enchaîne Git, GitHub CLI (facultatif), dépôt, envoi et activation de Pages ; il n’utilise que l’adresse anonyme `noreply` de GitHub pour les commits.

### Agencement de l’Archive (1.7)

`js/game/arrange.js` (`AN.Arrange`), logique pure : il lit le profil et rend des dispositions `{ uid: { q, r, cells } }`, que l’Archive applique (`Arrange.apply`) et dessine.

- **Grille.** Une case hexagonale est un entier (`(q + 1024) × 2048 + (r + 1024)`) : les voisins s’obtiennent par addition, les ensembles et les cartes restent légers. Le centre est réservé à l’Artefact.
- **Valeur d’un voisinage.** Pour chaque paire de territoires, la somme des synergies qu’ils formeraient, pondérée par leur production de base (`Production.BASE`), plus la Forge (deux au plus comptent) et une pénalité pour deux peuples ennemis côte à côte. La valeur d’une disposition ajoute une petite pénalité par côté de l’Archive tourné vers le vide (compacité, trous) et, quand les formes changent, par côté de chaque territoire (formes ramassées).
- **Croissance d’une forme** (`grow`). On part d’une case libre et on ajoute, case après case, la mieux notée : voisines de la forme (ramassée), voisines de l’Archive (creux), nouveaux partenaires de synergie, et un champ de bruit propre à la partie (`seed` du profil) qui donne à l’Archive des avancées et des baies. Les cases de départ candidates sont les meilleures cases du pourtour ; la forme retenue est la meilleure à l’arrivée. Réglages dans `Arrange.TUNE`.
- **Arrivées** (`Arrange.arrival`, appelé par `Expedition` à l’extraction) et **forme adaptée** (`Arrange.moldAt`, depuis la case visée ; `variant` change le tirage).
- **Rangement** (`Arrange.auto`). Formes fixes : pose gloutonne (les plus grands d’abord, toutes rotations, à chaque case du pourtour), puis améliorations locales (retirer un territoire et le reposer ailleurs, échanger deux formes identiques). Formes adaptées : croissance gloutonne (à chaque étape, le territoire qui gagne le plus à être posé maintenant), puis échanges de territoires de même taille, redécoupage de la place de deux voisins, déplacements. La disposition actuelle sert aussi de point de départ : le résultat n’est jamais moins bien noté qu’elle. L’Archive reste reliée à l’Artefact à chaque étape. Durée bornée (1,6 s par défaut, `budget`), déterministe tant que la borne n’est pas atteinte.
- **Archive** : vue d’agencement libre (`mapView`, glisser, molette vers le pointeur), clic au relâcher (un glisser ne pose rien), historique pour défaire (`Arrange.snapshot` / `restore`), glissement animé après un rangement ou un retour en arrière, synergies dessinées sur les frontières communes (`Shapes.contactEdges`) et mises en cache par version de disposition (`layoutV`). Panneau : `HUD.arrange`, reconstruit seulement quand son contenu change. Dialogue : `UI.arrangeDialog`.
- **Entrées** : dans l’Archive, un doigt sur le canevas agit comme la souris (événements pointeur), et les clics émulés qui suivent sont ignorés.

### Menus, son et fin d’expédition (1.8)

- **Mosaïque** (`js/render/mosaic.js`, `AN.Mosaic`) : dessine l’Archive en miniature avec les vraies formes (`Shapes.pathCells`, `strokeOutline`) dans la couleur de chaque biome. `canvas(territoires, w, h)` pour les sceaux (console, emplacements de partie), `draw` pour un contexte déjà placé (fond de l’écran titre, cinématique), `shape(t, taille)` pour l’icône d’un seul territoire (rapport, vue d’ensemble).
- **Console** (`js/ui/console.js`) : `GROUPS` (quatre groupes d’onglets), `TABS` (noms), `ICON` (icônes SVG en ligne). `todo(profil)` calcule les badges et la liste « À faire » de la vue d’ensemble. L’en-tête (sceau, rang, réserve) est reconstruit à chaque affichage ; chaque page passe par `page(cls, titre, description, actions, …contenu)`.
- **Position gardée** : `UI.keepPlace(conteneur, fn)` mémorise le défilement de chaque élément défilant et l’élément actif (par son rang parmi les éléments qui prennent le focus), reconstruit, puis les remet ; `UI.reopenKeep(fn)` fait de même pour une fenêtre fermée puis rouverte (classe `instant` : pas d’animation d’ouverture). La console, la pause, le sac, les transferts, la fiche d’une créature et les dialogues des peuples s’en servent ; une nouvelle page (changement d’onglet) repart en haut.
- **Musique** (`js/core/music.js`, `AN.Music`) : un séquenceur en doubles-croches, programmé à l’avance (horloge `setInterval` de 50 ms, notes posées sur l’horloge audio avec 0,22 s d’avance). `build(humeur, options)` fixe le mode, la tonique, le tempo, la suite d’accords (tirée de la graine) et le niveau de cinq couches (nappe, basse, arpège, cloches, percussions) ; `mood()` attend la mesure suivante pour changer, et ignore une demande identique. En expédition, `biomeMood` choisit le mode d’après les étiquettes du biome ; `Expedition.updateMusic` règle l’intensité (créatures qui attaquent à moins de 900 px, gardien) quatre fois par seconde et la montée de l’effondrement. Sortie : bus propre avec écho (retard réinjecté), sous le volume général ; atténuée à 45 % quand une fenêtre est ouverte (`setDuck`). Réglage `settings.music`.
- **Effets** (`js/core/audio.js`) : `SHOTS` et `SWINGS` (une recette par arme), `VOICE` (une famille de cris par forme de créature : grognement, pépiement, bourdonnement…), `A.cry(e, genre)` (hauteur selon la taille, voix grave pour les gardiens et au-delà). `A.play(nom, { at })` place un son dans l’espace d’après `A.listener` (la caméra, mise à jour à chaque image) : panoramique stéréo selon la position à l’écran, atténuation au-delà de 0,55 écran, son ignoré sous 6 % ; `key` espace les répétitions d’une même entité.
- **Cinématique** (`js/game/cinematic.js`) : quatre phases enchaînées sur une seule horloge, avec chevauchements (constantes `A_END`, `B0`… `D_END`). A : la zone (canevas de l’expédition) découpée en éclats hexagonaux, qui cèdent du bord vers le joueur ; colonne de lumière et soute. B : le monde en secteurs (vignettes des zones), fissures, effacement par le Néant, territoires emportés dessinés avec leur forme et aspirés en spirale. C : l’échelle supérieure (système, galaxie, grille selon l’échelon), éclair, ondes de choc, tampon. D : la mosaïque de l’Archive, où les nouveaux territoires se posent à leur vraie place (déjà choisie par `Arrange.arrival` avant la cinématique). Sons et frappes de musique déclenchés une seule fois par instant (`at`). Un échec ou une urgence accélère (×1,25) et s’arrête après C.

### Mod de triche (1.8.1)

- **Chargement** : `loadMods()` dans `main.js`, après le démarrage. Un `<script>` est ajouté pour `mods/triche.js` seulement en local (`file:`, `localhost`, `127.0.0.1`) ou avec `?triche=1` ; `?triche=0` l’empêche. En cas d’échec (dossier absent), la balise est retirée et rien d’autre ne se passe. Le script n’est pas cité dans `index.html` : le service worker ne le met pas en cache, et il ignore les requêtes vers `/mods/`.
- **Crochets** : le mod n’édite aucun fichier du jeu ; il enveloppe au chargement `PlayerCtl.computeStats` (dégâts, vitesse, sac, soute, rayon), `PlayerCtl.damage` (invincible), `Capture.eligible` (capture facile), `Expedition.enterZone` (carte révélée), `Collapse.start` (transfert éclair) et `update` des scènes Archive et Expédition (vitesse du jeu : plusieurs pas de simulation par image, `Input.endFrame` entre deux pas pour qu’une touche ne compte qu’une fois). Le reste passe par les fonctions publiques (`Profile`, `Structures`, `Arrange.arrival`, `Bonds.tick`, `Production`, `Boss.onZero` / `finish`, `UI.transferDialog`, `WorldGen.destination`, `Expedition.start`).
- **Panneau** : HTML et style injectés par le mod (`#triche`, `#triche-tab`, z-index 89 à 90, au-dessus des fenêtres du jeu) ; sur grand écran, les fenêtres du jeu se centrent à côté (`body.triche-open`). Les boutons perdent le focus après un clic pour qu’Espace ou Entrée ne les relancent pas en jouant ; les champs de saisie sont ignorés par `Input`. Après chaque action : sauvegarde, Archive reconstruite, console redessinée à la même place.
- **Réglages** : `localStorage['archive-du-neant/triche']` (cases cochées, vitesse, sections ouvertes, onglet masqué).
- **Publication** : `.gitignore` contient `mods/` ; `publier-sur-github.bat` rajoute la ligne si elle manque et retire `mods` de l’index Git (`git rm --cached`) avant chaque commit.

Ajouts au-delà des phases, préparés pour la suite : rangs de l’Archive et dézoom par paliers, synergies entre territoires, pouvoirs territoriaux des gardiens, bonus globaux des ultra-boss, compagnons à rôles, atelier, journal et fragments de récit.

## Dette technique et solutions provisoires

- **Reprise des expéditions.** Les créatures ne sont pas enregistrées : à la reprise, celles de la génération réapparaissent (un gardien vaincu dans une zone conquise ne revient pas, la zone restant conquise, mais un gardien blessé retrouve sa vigueur). Les situations transitoires d’un peuple (rassemblement, arche, départ) reviennent à « rencontré ». Les événements de zone déjà terminés ne se rejouent pas, un événement en cours est perdu. Recharger la page pour échapper à un mauvais pas reste possible dans la limite du dernier point de reprise (10 s au plus) : c’est accepté.
- **Déplacement des créatures.** Un champ de flux recalculé toutes les 0,35 s autour du joueur sert aux poursuites. Les créatures n’évitent pas les terrains dangereux ; les volants traversent le relief.
- **Pas de collision joueur / créatures.** Les créatures se repoussent entre elles, pas le joueur. Les dégâts de contact passent par les attaques.
- **Archive décorative.** Le relief des territoires n’a pas de collision ; les créatures y errent librement.
- **Équilibrage de premier jet.** Points de vie, dégâts, coûts et débits n’ont pas été ajustés par de vraies parties. Les valeurs sont regroupées dans `js/data/` pour faciliter les réglages.
- **Production hors ligne** plafonnée à 3 h et à 60 unités par territoire.
- **Agencement.** Le rangement automatique est une recherche locale bornée dans le temps : sur une très grande Archive (une centaine de territoires et plus), il s’arrête à la borne et peut donner un résultat différent d’une machine à l’autre. Les formes fixes laissent parfois une case enclavée, qu’un fragment peut combler. `Shapes.fromZone` (forme tirée de la zone) n’est plus utilisée pour placer un territoire ; elle reste testée, pour une éventuelle option « forme d’origine ». Le nom d’un territoire ne suit pas forcément sa forme (il est posé au centre de gravité, qui peut tomber hors d’une forme en croissant).
- **Structures et événements.** Les bâtiments de l’Archive n’ont pas de collision pour les créatures (seul le joueur les contourne). Une structure démontée et laissée dans une autre zone y reste jusqu’à la fin de l’expédition. Les événements ne se déclenchent qu’aux échelles région ; les échelons cosmiques gardent leurs menaces propres.
- **Tutoriel.** Le Seuil n’a qu’une zone et pas de cœur ; les touches affichées suivent la disposition détectée du clavier, les touches reconfigurées et l’appareil utilisé (clavier, manette, tactile).
- **Recherche précise.** Le décompte génère les zones d’un monde (quelques dizaines de millisecondes par monde, mis en cache). Les créatures apparues en cours de route (renforts, éclosions dans l’Archive) ne sont pas comptées : seules celles prévues par la génération le sont.
- **Échelles supérieures.** La structure d’une expédition reste celle d’une région (zones, cœur) à tous les échelons : seules les données, les déplacements et les menaces changent. Les astres sont des bonus et des éléments de décor de l’Archive, pas des lieux explorables. L’échelle inconnue n’a pas de gameplay : c’est voulu.
- **Équilibrage cosmique de premier jet.** Les échelons cosmiques fixent la menace à 7 ; leurs créatures ont des statistiques de base plus élevées. Les formes de capture laissent 36 secondes d’épuisement.
- **Caveaux** : une poche de 3 tuiles de rayon creusée dans la roche après le calcul d’accessibilité, reliée par un couloir de deux tuiles dont deux rangs sont des barrières (`KEYWALL`). Les barrières sont dessinées à chaque image, pas dans le canevas de la zone.
- **Reproduction** : probabiliste, accumulée par territoire et par espèce (`profile.breeding`). Plafonnée par la capacité du territoire.
- **Habitants dans l’Archive** : décoratifs (pas de collision), comme les créatures. Leurs événements (vols, grèves, offrandes, demandes) sont tirés au hasard toutes les 9 à 17 minutes d’Archive.
- **Rassemblement** : les habitants n’embarquent que depuis la zone de leur village. Ceux d’un village resté dans une autre zone sont comptés comme abandonnés si le monde est détruit.
- **Manette.** Seule la disposition « standard » de l’API Gamepad est reconnue ; une manette exotique peut avoir ses boutons dans le désordre (pas d’écran de réattribution pour la manette). Une seule manette à la fois.
- **Tactile.** Les commandes sont pensées pour l’horizontale ; à la verticale le jeu reste jouable mais serré. Pas de multi-touches sur les fenêtres (pas de pincement pour zoomer : boutons + et −). Les sticks tactiles et la manette ont été testés avec des événements synthétiques ; un passage sur de vrais appareils reste à faire.
- **Hors ligne.** Le service worker ne fonctionne qu’en ligne (http ou https) : la version ouverte depuis le disque n’en a pas besoin. La toute première visite doit se faire avec une connexion.
- **Musique et sons.** Vérifiés par mesure (niveaux de crête, pas de saturation, humeurs et intensité qui changent quand il faut), pas encore à l’oreille sur de vrais haut-parleurs : le mixage est de premier jet. Le séquenceur repose sur `setInterval` : un onglet en arrière-plan peut le ralentir ; au retour, il se recale sur l’horloge audio au lieu de rattraper son retard. Les sons spatialisés n’utilisent qu’un panoramique stéréo, pas de HRTF.
- **Cinématique.** Les éclats de la phase A sont des découpes du canevas de la zone (une découpe par éclat et par image, une centaine d’éclats) : c’est la phase la plus coûteuse, sensible sur un téléphone ancien ; « effets réduits » retire l’éclair et la plupart des ondes de choc, pas les éclats. `Cinematic.__seek(t)` sert aux captures de test et reste accessible.
- **Console.** Les badges sont recalculés à chaque affichage de la console, pas en continu : une ressource qui arrive pendant que la console est ouverte ne les met à jour qu’au prochain affichage.
- **Mod de triche.** Il dépend des noms des fonctions qu’il enveloppe : si l’une d’elles est renommée, la triche correspondante cesse d’agir (sans erreur pour le jeu, puisque l’enveloppe est posée sur ce qui existe). La vitesse ×8 fait huit pas de simulation par image : lourd dans une grande zone peuplée. Ouvert depuis le disque sans le dossier `mods`, le navigateur note un fichier introuvable dans sa console de développement ; ce n’est pas une erreur du jeu.
- **Non implémenté** : autres langues.
- **Aléatoire des combats** : l’IA utilise `Math.random` ; seuls les mondes sont reproductibles, pas les combats.

## Pistes pour la suite

À valider une à une, comme le prévoit le document de conception :

1. Équilibrage après quelques parties réelles.
2. Essais sur de vrais téléphones, tablettes et manettes, et réglage des tailles et zones mortes.
3. Astres explorables (une lune de l’Archive comme destination), échelle dimensionnelle.
