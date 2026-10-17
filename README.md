# L’Archive du Néant

Un jeu solo d’extraction et de collection, en 2D vue de dessus, jouable dans le navigateur.

Vous avez toujours vécu seul sur une surface blanche et infinie. Un jour, un Artefact apparaît : il ouvre des passages vers d’autres mondes. Vous y combattez, vous capturez des créatures et des gardiens, vous récoltez des ressources. Quand vous repartez, le monde est détruit. Tout ce que vous avez réussi à extraire rejoint votre Archive, qui grandit jusqu’à changer d’échelle.

## Jouer

**En local** : ouvrez `index.html` dans un navigateur récent (Chrome, Edge, Firefox, Safari). Aucune installation, aucune connexion requise.

**En ligne** : une fois publié (voir « Publier sur GitHub », plus bas), le jeu se joue à l’adresse https://azertyuser09876-spec.github.io/Archive-du-N-ant/, sur ordinateur, téléphone ou tablette.

**L’installer** : depuis la version en ligne, l’écran titre propose « Installer le jeu » (Chrome, Edge, Android). Sur iPhone et iPad : bouton Partager de Safari, puis « Sur l’écran d’accueil ». Le jeu installé s’ouvre en plein écran et fonctionne ensuite **hors ligne**.

**Trois parties** : l’écran titre présente trois emplacements de sauvegarde, chacun avec son rang, ses territoires, ses créatures et l’heure de la dernière partie. Tout est enregistré automatiquement dans le navigateur ; la pause (Échap) permet d’exporter et d’importer une partie sous forme de fichier, ou de changer de partie.

**Reprendre une expédition** : l’expédition en cours est enregistrée toutes les dix secondes, à chaque changement de zone et quand on ferme la page. Au retour, le jeu propose de la reprendre là où on l’avait laissée (sac, soute, zones conquises, découvertes intactes ; les créatures, elles, ont repris leur place) ou de l’abandonner.

**Première partie** : après l’introduction, le jeu propose **le Seuil**, un petit monde à part qui sert de tutoriel interactif (environ cinq minutes) : se déplacer, récolter, tirer, frapper et esquiver, capturer, affronter un gardien, extraire. On peut le passer, et le rejouer plus tard depuis la pause (sans rien garder).

## Commandes

Le jeu se joue au clavier et à la souris, à la manette ou à l’écran tactile ; on peut changer d’appareil à tout moment, et les touches affichées dans le jeu suivent celui qu’on utilise.

### Clavier et souris

Toutes les touches se changent dans **Pause → Commandes** (clic sur « Changer », puis la nouvelle touche ; deux actions ne partagent jamais une touche).

| Touche | Action |
|---|---|
| ZQSD ou WASD, flèches | Se déplacer (les touches sont lues par position : AZERTY et QWERTY fonctionnent) |
| Clic gauche | Tirer |
| Clic droit | Frapper au corps à corps |
| Espace | Esquiver (brève invulnérabilité). Dans une galaxie, maintenir puis relâcher pour sauter au-dessus du vide |
| F (maintenir) | Rayon de capture, sur une créature affaiblie ou un gardien épuisé |
| E | Interagir : Artefact, bâtiments, récolte, passages, plaques d’extraction, ruines, structures (fouiller, démonter), caveaux, prisonniers, chefs de village, ancres, balise de rappel |
| Q | Capacité prêtée par le compagnon actif (la molette change de compagnon) |
| G | Appel stratégique d’un géant de l’Archive (une fois par expédition) |
| R | Monter ou descendre de sa monture (aussi dans l’Archive) |
| 1 à 4 | Consommables |
| Tab | Sac et soute (expédition), collection (Archive) |
| X (maintenir) | Extraction d’urgence |
| Molette | Dézoomer dans l’Archive |
| V | Agencer les territoires de l’Archive (voir « Agencer l’Archive » plus bas) |
| Échap | Pause, options, sauvegarde |

### Manette

Toute manette reconnue par le navigateur en disposition standard (Xbox, PlayStation, la plupart des manettes USB ou Bluetooth). Brancher la manette suffit.

| Manette | Action |
|---|---|
| Stick gauche | Se déplacer |
| Stick droit | Viser (dans l’Archive : zoomer) |
| Gâchette droite (RT / R2) | Tirer |
| RB / R1 | Frapper au corps à corps (vise tout seul la créature la plus proche si le stick droit est au repos) |
| Gâchette gauche (LT / L2, maintenir) | Rayon de capture (vise tout seul la cible capturable la plus proche) |
| A / Croix | Interagir |
| B / Rond | Esquiver |
| X / Carré | Capacité du compagnon |
| Y / Triangle | Monture |
| LB / L1 | Appel stratégique |
| Croix directionnelle | Consommables 1 à 4 |
| Vue / Share | Sac et soute, collection |
| Clic du stick gauche (maintenir) | Extraction d’urgence |
| Clic du stick droit | Agencer les territoires : stick droit le curseur, stick gauche la vue, A saisit et pose, B lâche, Y tourne, LT forme fixe ou adaptée, LB rangement automatique, X défaire |
| Menu / Options | Pause |

Dans les fenêtres : croix ou stick gauche pour aller d’un bouton à l’autre, A pour valider, B pour revenir, LB / RB pour changer d’onglet, stick droit pour faire défiler. La manette vibre quand on est touché (désactivable dans la pause).

### Écran tactile

Les commandes tactiles apparaissent dès qu’on touche l’écran (réglage dans **Pause → Jeu** : automatique, toujours, jamais ; trois tailles ; disposition inversée pour gaucher). Le jeu se joue de préférence à l’horizontale ; « Plein écran » est proposé sur l’écran titre.

- **Pouce gauche** : un stick apparaît là où on pose le doigt, pour se déplacer.
- **Pouce droit** : le stick de visée tire dès qu’on le pousse franchement. Autour de lui : Esquive, Frappe et Capture (qui visent seules la cible la plus proche), Agir (il s’allume quand une interaction est possible), Capacité, Appel, Monture.
- On touche directement un **consommable** dans sa barre, et l’encart **Sac** pour ouvrir le sac et la soute. Le bouton ❚❚ ouvre la pause (on y trouve aussi l’extraction d’urgence).
- **Dans l’Archive** : Agir, Monture, Agencer, Collection, zoom. En agençant, on touche un territoire puis sa nouvelle place, on fait glisser le doigt pour déplacer la vue ; le panneau d’agencement se touche directement, et les boutons Tourner, − et + restent sous le pouce.

### Accessibilité

Dans **Pause → Accessibilité** : taille de l’interface (90 à 150 %), couleurs (standard, adaptées au daltonisme rouge-vert, contraste élevé), texte plus grand dans les messages, effets réduits (moins de particules, ni flash ni tremblement). La pause automatique quand la fenêtre perd le focus se règle dans **Jeu**. Ces réglages valent pour l’appareil, toutes parties confondues.

### Son et musique

La musique est composée en direct par le jeu : un thème pour l’écran titre, un pour l’Archive (il s’étoffe avec le rang), un pour chaque monde (son mode et sa tonalité viennent de son paysage, et le même monde sonne toujours pareil), plus intense pendant les combats et devant un gardien, montante pendant l’effondrement. Les bruits sont placés dans l’espace : une créature qui crie à gauche de l’écran s’entend à gauche, et plus faiblement de loin. Volume général, musique, effets et ambiance se règlent dans **Pause → Son**.

## La boucle de jeu

1. **Dans l’Archive**, approchez l’Artefact (E). Sa console range ses pages en quatre groupes : **Voyager** (Destinations, Préparation), **Fabriquer** (Atelier, Améliorations, Constructions), **L’Archive** (Vue d’ensemble, Collection, Peuples) et **Savoir** (Bestiaire, Journal) ; un badge signale ce qui vous attend dans chaque page. L’Artefact propose plusieurs mondes, disposés sur une carte : plus un monde est loin de l’Artefact, plus il est dangereux. Les informations affichées sont estimées : leur fiabilité dépend du scanner. Si vous cherchez quelque chose de précis (une ressource, une créature déjà observée), utilisez « Je cherche » : l’Artefact indique exactement quels mondes la contiennent, et vous guide sur place.
2. **Préparez** l’expédition : armes, protection, sac, outils, consommables, compagnons, appel stratégique ; le risque est résumé en bas de la page, à côté de « Ouvrir le passage ». L’équipement fabriqué est perdu si vous tombez ; l’équipement « lié » ne l’est jamais.
3. **Explorez** : chaque monde compte de deux à quatre zones, chacune gardée par un gardien. Vaincre ou capturer tous les gardiens ouvre le Cœur de la région, où vit un ultra-boss.
4. **Capturez** : affaiblissez une créature (elle s’entoure d’un cercle bleu), puis maintenez F. Un gardien se capture quand il est épuisé, en évitant ses ondes de choc. La soute de l’Artefact limite ce que vous pouvez emporter.
5. **Extrayez** depuis une plaque blanche : choisissez les territoires conquis à emporter, puis restez dans le portail pendant que le monde s’efface autour de vous. La zone se brise, le monde s’éteint, et l’on voit chaque territoire emporté rejoindre sa place dans l’Archive.
6. **Retrouvez** vos captures et les territoires dans l’Archive ; le rapport de retour fait le compte des gains et des pertes. Les territoires produisent des ressources, les créatures aussi. Placés côte à côte, certains territoires créent des synergies.

Rien n’est acquis avant l’extraction. Si vous tombez, le butin, la soute et l’équipement non lié sont perdus. Les compagnons restés à vos côtés reviennent blessés ; les autres restent dans le monde, qui tient encore trois expéditions : une mission de sauvetage apparaît alors parmi les destinations.

Certains mondes sont habités. Leurs habitants peuvent vous suivre, refuser, vous combattre, fuir à bord d’une arche ou vous trahir. Ceux que vous emmenez s’installent dans l’Archive, avec leurs humeurs et leurs demandes ; ceux que vous laissez disparaissent avec leur monde. Les peuples suivants s’en souviennent.

Quand l’Archive atteint le rang Monde, l’Artefact capte des destinations plus grandes : des **mondes** entiers, puis des **orbites**, des **systèmes** et des **galaxies**. Chacun a ses déplacements (apesanteur, gravité, sauts au-dessus du vide), sa menace, son maître et sa façon de le capturer. L’amélioration **Ancrage** retient ces êtres trop grands pour la soute, puis des astres entiers, qui rejoignent le ciel de l’Archive. Dézoomez dans l’Archive pour voir ce qu’elle devient.

### Agencer l’Archive

Chaque territoire rapporté choisit sa forme en arrivant : il garde son nombre de cases (1 pour un fragment, 7 pour un territoire, 12 pour un cœur de région, 16 pour un continent, 22 pour un cratère), mais il pousse dans les creux de l’Archive plutôt que de s’ajouter en couronne, et il se rapproche des territoires avec lesquels il forme une synergie. L’Archive grandit ainsi d’un seul tenant, sans trous, avec des avancées et des baies propres à chaque partie : elle n’a pas besoin d’être ronde.

Appuyez sur **V** (ou le bouton Agencer) pour l’agencer vous-même :
- **Déplacer** : choisissez un territoire, puis sa nouvelle place. La vue se déplace en faisant glisser la souris ou le doigt (ou avec les touches de déplacement), la molette zoome.
- **Forme fixe ou adaptée** (F) : en forme fixe, le territoire garde sa forme et R le fait tourner ; en forme adaptée, il prend la forme de sa nouvelle place, et R propose une autre forme. Le fantôme du territoire annonce ce que donnerait cette place (synergies, néfastes, production).
- **Ranger automatiquement** (G) : l’Archive cherche la disposition qui forme le plus de synergies, sépare les voisins néfastes et les peuples ennemis, et reste compacte. On choisit de garder les formes ou de les adapter.
- **Défaire** (Q, ou Retour arrière) : revient en arrière, un pas à la fois.
- Les frontières entre voisins s’allument en vert quand elles rapportent, en rouge quand elles coûtent. Le panneau détaille le territoire survolé : ses synergies, et les paysages avec lesquels il s’accorderait.

Avant de partir, on choisit aussi ses **outils** (récolte, capture, module d’extraction, transport). Dans les mondes, des **structures** attendent d’être fouillées, puis démontées et rapportées ; dans l’Archive, on construit des **bâtiments** autour de l’Artefact (onglet Constructions). Pendant l’exploration, des **événements** peuvent survenir : pluie de météores, floraison, migration, éclipse, faille, écho d’un monde.

Les créatures progressent : niveaux, loyauté, faim, évolutions, reproduction dans l’Archive. Certaines servent de montures, toutes prêtent une capacité, et leurs clés d’environnement ouvrent les caveaux scellés des mondes visités. Le détail est dans `CHANGELOG.md`.

## Publier sur GitHub

Le jeu est un site statique : il n’y a rien à compiler.

### En un double-clic (Windows)

`publier-sur-github.bat`, à la racine du dossier, fait tout le travail pour le compte **azertyuser09876-spec** et le dépôt **Archive-du-N-ant** :

1. vérifie que Git est installé (et propose de l’installer avec winget sinon) ;
2. propose d’installer GitHub CLI et de vous connecter à GitHub dans le navigateur (recommandé : le dépôt et la publication sont alors créés automatiquement) ;
3. prépare le dépôt local (branche `main`, adresse du dépôt distant) et une identité Git pour les envois, avec l’adresse anonyme `@users.noreply.github.com` de GitHub (aucune adresse personnelle n’est utilisée) ;
4. enregistre l’état du dossier dans un commit daté, sans le dossier `mods` (le mod de triche reste sur votre ordinateur) ;
5. crée le dépôt public s’il n’existe pas (sans GitHub CLI, il ouvre la page de création, préremplie, et attend que vous l’ayez créé) ;
6. envoie le tout sur GitHub (si le dépôt contient déjà un historique différent, il demande avant d’écraser) ;
7. active GitHub Pages en mode « GitHub Actions » et suit la publication (sans GitHub CLI, il ouvre la page des réglages et indique quoi choisir) ;
8. ouvre le jeu en ligne : https://azertyuser09876-spec.github.io/Archive-du-N-ant/

Pour publier une nouvelle version, remplacez les fichiers du dossier par ceux de la nouvelle archive (en gardant le dossier caché `.git`) et relancez le même fichier : seules les différences sont envoyées. La première publication prend une à deux minutes de plus, le temps que GitHub prépare le site.

### À la main

1. Créez le dépôt `Archive-du-N-ant` sur GitHub et envoyez-y le contenu de ce dossier (branche `main`).
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le fichier `.github/workflows/deploy.yml` publie le jeu à chaque envoi sur `main`. L’adresse apparaît dans l’onglet **Actions**, puis dans **Settings → Pages**.

Alternative sans Actions : **Source : Deploy from a branch**, branche `main`, dossier `/ (root)`. Le fichier `.nojekyll` est déjà présent.

Pour publier une « release » téléchargeable, créez une release GitHub et joignez-y une archive zip de ce dossier : elle fonctionne hors ligne en ouvrant `index.html`.

## Contenu

- 33 biomes : 20 pour les régions et les mondes, 13 pour l’espace (orbites, systèmes, galaxies)
- 102 créatures : 42 mineures, 26 prédateurs, 20 gardiens de zone, 4 ultra-boss régionaux, 3 souverains du monde, 3 cataclysmes planétaires, 2 entités stellaires, 2 organismes galactiques ; 31 formes dessinées (dont grenouille, oiseau, escargot, crabe, raie et scorpion)
- 5 échelons d’expédition (région, monde, orbite, système, galaxie), 4 formes de capture, 12 types d’astres
- Variantes procédurales (robuste, vif, géant, nain, féroce, albinos, chromatique)
- 32 ressources, 9 armes à distance, 6 armes de corps à corps, 7 protections, 5 sacs, 8 consommables
- 6 améliorations de l’Artefact, 10 rangs d’Archive (le dernier reste un mystère), 17 synergies entre territoires
- 8 peuples, 8 attitudes, 5 réputations
- 24 fragments de récit à retrouver
- 12 outils de préparation (récolte, capture, modules d’extraction, transport)
- 8 bâtiments à construire dans l’Archive, 12 structures à découvrir dans les mondes, à démonter et à reconstruire
- 6 événements des mondes (météores, floraison, migration, éclipse, faille, écho)
- Un tutoriel interactif dans un monde à part, le Seuil
- Trois emplacements de partie, reprise des expéditions, 17 actions reconfigurables, manette, écran tactile, application installable hors ligne
- Agencement de l’Archive : formes qui comblent les creux, formes adaptées au déplacement, rangement automatique qui maximise les synergies
- Musique générative (titre, Archive, un thème par monde, combat, effondrement, fin), sons placés dans l’espace, une voix par arme et par famille de créatures
- Tous les graphismes, tous les sons et toute la musique sont générés par le code : aucun fichier image ou audio

## Structure du projet

```
index.html            point d’entrée
manifest.webmanifest  description de l’application installable
sw.js                 service worker : le jeu en cache pour jouer hors ligne
icons/                icônes de l’application
publier-sur-github.bat  publication automatique sur GitHub Pages (Windows)
css/style.css         interface (y compris commandes tactiles et petits écrans)
js/core/              espace de noms, aléatoire à graine, réglages de l’appareil (prefs.js),
                      entrées et touches reconfigurables, effets sonores (audio.js),
                      musique générative (music.js), sauvegarde à emplacements
js/data/              données pures : biomes, créatures, traits, peuples, équipement, monde, récit,
                      échelles supérieures (cosmos.js), nouvelle faune (fauna.js),
                      outils, structures et événements (works.js)
js/gen/               génération des mondes et des zones (sans affichage)
js/render/            caméra, particules, icônes, dessin des créatures et des terrains,
                      mosaïque de l’Archive en miniature (mosaic.js)
js/game/              règles : profil, entités, combat, IA, boss, capture, joueur,
                      expédition, effondrement, cinématique, production, Archive,
                      liens, montures, capacités, caveaux, sauvetage, peuples,
                      échelons cosmiques (cosmic.js), couches de l’Archive (cosmos.js),
                      formes des territoires (shapes.js), recherche précise (search.js),
                      tutoriel du Seuil (tutorial.js), outils (tools.js),
                      structures (structures.js), événements des mondes (events.js),
                      reprise des expéditions (resume.js), agencement de l’Archive (arrange.js)
js/ui/                affichage tête haute, fenêtres, console de l’Artefact, carte des destinations,
                      manette (gamepad.js), commandes tactiles (touch.js)
mods/triche.js        mod de triche, à part du jeu (local seulement, jamais publié)
tests/index.html      tests automatiques (ouvrir dans un navigateur)
tests/gallery.html    galerie de contrôle : biomes, créatures et structures
NOTES_TECHNIQUES.md   architecture, état des phases, dette technique
```

Les scripts sont des scripts classiques (pas de modules ES) : c’est ce qui permet au jeu de fonctionner en ouvrant directement `index.html`, sans serveur.

## Mode triche (pour tester)

Le dossier `mods` contient un mod de triche, `mods/triche.js`, pour ne pas tout regagner à chaque essai. C’est un programme à part : le jeu se contente d’essayer de le charger au démarrage, et seulement en local (`index.html` ouvert depuis le disque, ou un serveur sur `localhost`). Absent, il n’a aucun effet.

- **Ouvrir ou fermer** : **F8**, la touche **²** (au-dessus de Tab), ou l’onglet **TRICHE** sur le bord gauche de l’écran (pratique au doigt).
- **Ressources** : +100, +1 000 ou +10 000 de chaque ressource, ou la quantité voulue d’une seule ; ramasser toutes les productions.
- **Équipement et Artefact** : tout l’équipement et les outils (+10 de chaque consommable), améliorations au maximum, bâtiments au niveau maximum, toutes les structures trouvées.
- **Archive** : territoires (qualité et paysage au choix), rang suivant ou rang maximal (ajoute ce qu’il faut : territoires, gardiens, astres…), astres, temps qui passe (+1 h, +8 h, +24 h : production, faim, reproduction), bestiaire complet, tout le récit, nouvelles destinations.
- **Créatures** : n’importe quelle espèce (avec un filtre), variante, niveau, nombre, en compagnon ; toutes au maximum (niveau, loyauté, faim, soins).
- **Expédition** : cases à cocher qui restent actives d’une partie à l’autre (invincible, dégâts ×10, vitesse ×1,5, sac et soute illimités, capture facile, carte révélée, transfert éclair) ; boutons vigueur pleine, affaiblir ou vaincre les créatures, épuiser ou achever le gardien, révéler la carte, aller à l’arène, au passage ou à une plaque, ouvrir et finir le transfert.
- **Voyager** : partir tout de suite vers un échelon (région, monde, orbite, système, galaxie), un paysage, une menace, un monde habité.
- **Jeu** : vitesse du jeu ×1 à ×8, sauvegarde immédiate.

Les triches modifient la partie en cours et sont enregistrées avec elle : pour essayer sans rien abîmer, jouez sur un autre emplacement. L’onglet devient rouge et compte les triches actives.

**Il ne part pas sur GitHub.** Le dossier `mods` est ignoré par Git (`.gitignore`), et `publier-sur-github.bat` le vérifie à chaque publication. Pour l’enlever tout à fait, supprimez le dossier `mods` ; pour le couper un moment, ajoutez `?triche=0` à l’adresse. Si vous envoyez un jour les fichiers à la main sur GitHub, laissez ce dossier de côté (même publié, il ne se chargerait qu’avec `?triche=1` dans l’adresse).

## Tests et débogage

- Ouvrez `tests/index.html` : 63 tests vérifient la génération déterministe, l’accessibilité des zones, l’intégrité des données, la sauvegarde (emplacements, migrations, reprise d’expédition), les touches reconfigurables, l’agencement (arrivées, formes adaptées, rangement), la composition de la musique et les règles de l’Archive.
- Ajoutez `?debug=1` à l’adresse du jeu pour activer les outils de console : `AN.dbg.give()` (ressources), `AN.dbg.go(0)` (partir vers la première destination), `AN.dbg.goBiome('riviere_lave')`, `AN.dbg.god()`, `AN.dbg.tp('arena')`, `AN.dbg.boss()`, `AN.dbg.add('salamandre', { companion: true })`, `AN.dbg.time(60)` (fait passer une heure dans l’Archive), `AN.dbg.vault()`, `AN.dbg.goCiv('fiers')` (monde habité, attitude au choix), `AN.dbg.village()`, `AN.dbg.cosmic(8)` (profil avancé jusqu’au rang Galaxie), `AN.dbg.goScale('orbite')` (expédition d’un échelon), `AN.dbg.astre('nebuleuse')`, `AN.dbg.zoom(1e-5)` (dézoom de l’Archive), `AN.dbg.terr(20)` (vingt territoires de qualités et de paysages variés, posés comme au retour d’expédition). Avec `?debug=1&auto=1`, la partie démarre directement dans l’Archive (emplacement 1, tutoriel passé, sans pause automatique) ; ajoutez `&tuto=1` pour garder la proposition du Seuil, ou lancez `AN.Tutorial.start(AN.Game.profile, { sandbox: true })`.

## Crédits

- Concept, univers et direction : l’auteur du projet.
- Structuration du document de conception : M365 Copilot, à partir des idées de l’auteur.
- Code, données, graphismes et sons procéduraux : Claude (Anthropic).

Aucune licence n’est encore choisie. Ajoutez un fichier `LICENSE` avant de publier si vous souhaitez autoriser la réutilisation du code.
