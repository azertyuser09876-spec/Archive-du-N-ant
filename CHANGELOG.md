# Journal des versions

## 1.13.0 — Les nations, sans leurs limites

- **Les gardes défendent leur ville.** Dans une nation amie, les gardes, les archers et le champion s’en prennent aux bêtes qui attaquent près de leurs murs (ils épargnent celles qui sont affaiblies, qu’on puisse les capturer). Les bêtes se retournent contre eux.
- **Raids.** Environ une ville sur trois est attaquée une fois pendant l’expédition, une demi-minute à peu près après votre arrivée : deux vagues de bêtes du paysage marchent sur ses habitants (le gouverneur et le souverain restent à l’abri). Ceux qui restent pour aider gagnent leur faveur (+1 par bête abattue, jusqu’à +6 par ville ; +8 quand la ville a tenu). La ligne dorée sous le nom du monde suit le raid.
- **Missions des gouverneurs.** Chaque ville (hors capitale) a son gouverneur, près de la fontaine ; une bulle signale qu’il a quelque chose à demander (!) ou qu’il attend votre retour (?). Une mission par ville, tirée de la graine :
  - **Battue** : abattre quelques bêtes dans les environs ;
  - **Livraison** : apporter une ressource de leur paysage, depuis le sac ;
  - **Défense** : repousser avec les gardes une harde qui approche ;
  - **Caravane perdue** : retrouver une cargaison dans une autre zone, gardée par des bêtes (une flèche dorée y conduit), et la rapporter ;
  - **Le gardien** : abattre ou capturer le gardien de la zone.
  - Récompense : leur ressource préférée et une ressource rare de la ville (davantage dans un monde plus grand), et de la faveur (+8 à +12). Le suivi s’affiche dans la ligne dorée et sur la mini-carte.
- **Reprise d’une expédition.** Après une page fermée, la nation retrouve sa faveur, sa guerre éventuelle, ses offres, ses missions et ses présents, et **les mercenaires reviennent**, avec leur vigueur.
- **Demandes des nations ancrées.** Dans la console (page Peuples), chaque nation ancrée formule une demande toutes les 30 minutes : une ressource commune que son monde ne donne pas. On l’envoie depuis la réserve ; elle rend une ressource rare de son monde, et sa faveur monte de 8.
- **Les nations ancrées dans le ciel de l’Archive.** Une région tenue par un peuple flotte au bord de la mosaïque, reliée à l’Archive par un fil bleu ; un monde entier tourne près du globe ; une orbite, ou un système, prend place dans la couche du ciel correspondante. Leurs lumières s’allument, un « ! » signale une demande, et un clic y conduit, à n’importe quel zoom. Tant que le rang de l’Archive ne laisse pas voir aussi loin, elles restent au plus près.
- **Corrections des nations de la 1.12.**
  - Déclarer la guerre fait enfin prendre les armes à leurs gens : en 1.12, ils restaient pacifiques, le souverain ne pouvait pas être vaincu et la soumission était impossible par cette voie.
  - Les villes des zones déjà visitées suivent l’humeur de la nation quand on y revient (guerre déclarée, ou souverain épargné).
  - Les mercenaires engagés depuis la console rejoignent la prochaine expédition quel que soit le monde (en 1.12, seulement le monde d’une nation : ailleurs, ils attendaient en occupant les places).
  - Une reprise d’expédition ne compte plus une nouvelle rencontre avec le peuple.
- **Les lieux ancrés restent ceux qu’on a connus.** Un lieu ancré (ce qu’on a rapporté d’un monde) ne peut plus devenir, après coup, le monde d’une nation : il est de nouveau identique à ce qu’il était en 1.11.
- Débogage : `AN.dbg.mission('caravane')` (mission de la ville où l’on se trouve), `AN.dbg.cityRaid()`, `AN.dbg.nationSky()` (une nation ancrée de chaque taille). Mod de triche : raid sur la ville, mission du gouverneur accomplie.
- Nouveaux tests (88 au total) : lieux ancrés sans nation et identiques à la 1.11 ; missions (reproductibles, battue, livraison, caravane, gardien, défense, délai dans une nation ancrée) ; guerre et épargne (les gens prennent les armes, les zones déjà visitées suivent) ; raids (bêtes affaiblies, faveur plafonnée, défense abandonnée) ; reprise de l’état de la nation et des mercenaires ; demandes des nations ancrées ; place dans le ciel selon la taille et le rang.

**Changements de règles à noter.**
- **Faveur** : nouvelles façons de la gagner (raids, missions, demandes). Les bêtes tuées par les gardes laissent leur butin comme les autres et comptent dans vos statistiques.
- **Habitants exposés** : pendant un raid, les habitants et les gardes peuvent être tués par les bêtes. Cela ne vous coûte pas de faveur. Le souverain ne sort plus se battre.
- **Défense** : quitter la zone pendant la défense, ou laisser les gardes faire seuls, fait manquer la mission (pas de second essai). Une bête affaiblie ne compte plus parmi les assaillants : la ville peut tenir sans qu’on l’achève.
- **Gouverneurs** : ils restent près de la fontaine au lieu de flâner dans toute la ville. Dans une nation ancrée, un gouverneur dont on a accompli la mission n’en donne pas d’autre avant 30 minutes.
- **Mondes** : à graine égale, une destination est la même qu’en 1.12. Les lieux ancrés reviennent à leur version 1.11 : ceux qui étaient devenus des nations en 1.12 perdent leurs villes. Les mondes en sursis gardent la réserve de la 1.11.
- Sauvegarde : le format reste le **6** ; une nation ancrée garde sa demande en cours (`request`) et l’heure des missions accomplies (`missionAt`), et le point de reprise d’une expédition s’enrichit de `nation` et `mercs` (les anciens points de reprise se chargent comme avant).

## 1.12.0 — Les nations, et des bienfaits à la mesure de l’échelle

- **Des mondes tenus par un peuple.** Certaines destinations ne sont plus un monde sauvage avec un village, mais le monde tout entier d’une **nation** : une ville dans chaque zone, sa capitale au cœur, un souverain. On en trouve dès la menace 2, environ une région sur huit, un monde entier sur trois, une orbite ou un système sur six, selon les peuples qui savent vivre à cette échelle :
  - la Théocratie des Pâles, le Grand Réseau mycélien et la Ruche-État chitinide tiennent des régions et des mondes ;
  - l’Ordre des Socles tient aussi des orbites ;
  - la Confédération des forges tient aussi des systèmes ;
  - la Mécanocratie des Rouages et la Thalassocratie des Nautes tiennent des orbites et des systèmes ;
  - la Garde du Seuil ne tient que des régions.
  - Le scanner les signale (« Thalassocratie des Nautes : une ville par zone »), leur fiche porte l’étiquette « Nation », et la carte « vous êtes ici » marque leurs villes.
- **Les villes.** Une place pavée avec sa fontaine, des rues, deux couronnes de maisons dans le style du peuple, un **comptoir** (un étal sous un auvent à leurs couleurs), une **caserne** (bannières, râtelier), et dans la capitale un **palais** (enceinte, tours, la maison du peuple en grand). Habitants, gardes et gouverneur y vivent ; le nom de la ville s’affiche quand on approche, et elles sont éclairées dans les mondes sombres.
- **La faveur** (de −100 à 100). Elle part de leur humeur (accueillants, marchands, fiers, dévots, hostiles, iconoclastes), de votre réputation et de ce que ce peuple sait de vous (ceux que vous avez sauvés, emmenés de force ou tués). Elle monte quand on commerce, quand on fait des présents au souverain et quand on abat les gardiens qui menacent leurs villes ; elle tombe quand on tue les leurs. En dessous de −20, leurs villes vous ferment leurs portes et leurs gardes attaquent à vue.
- **Commerce.** Chaque comptoir propose du troc, payé avec le sac : des ressources rares de leur paysage, de l’essence, des consommables, un œuf ; et ils achètent cher la ressource qu’ils préfèrent. Les prix suivent la faveur (de ×1,6 à ×0,8), et chaque échange l’améliore un peu.
- **Mercenaires.** À la caserne, on engage leurs **gardes**, leurs **archers**, et leur **champion** (à la capitale, ou quand ils vous estiment). Ils se battent à vos côtés jusqu’à la fin de l’expédition, puis rentrent chez eux. Trois au plus.
- **Audience.** Au palais de la capitale, on offre des présents au souverain, on lui propose que son monde rejoigne l’Archive (faveur de 60), ou on lui déclare la guerre.
- **Ancrer le monde d’une nation.** Par **alliance**, ou par la **soumission** (en guerre, vaincre le souverain : il s’agenouille, et l’on choisit de soumettre son monde ou de l’épargner). Le monde n’est pas détruit : l’expédition s’achève sans effondrement, on rentre avec le sac et la soute, et il devient un **lieu ancré peuplé**. Ses villes, ses comptoirs et ses mercenaires vous attendent, sa capitale vous est toujours ouverte, et il envoie un **tribut** de ses ressources toutes les 20 minutes. Une nation soumise paie davantage, mais ne vous aime pas.
- **Console** (page Peuples) : les nations ancrées, avec leur faveur et leur tribut ; leur comptoir (payé avec la réserve de l’Archive, renouvelé toutes les 30 minutes), des présents, et leurs mercenaires à engager pour la prochaine expédition.
- **Les peuples dans les nouveaux paysages** : les Pâles dans les Salines chantantes et sur la Calotte polaire, les Cendriers sur le Rift continental, les Mycéliens dans la Forêt-continent, les Nautes sur la Mer intérieure, les Chitinides dans la Forêt de cire, les Lithes sur la Calotte polaire ; et, pour les nations des échelons cosmiques, quelques paysages de l’espace.
- **Des bienfaits à la mesure de l’échelle.** Plus ce qu’on rapporte est grand, plus il apporte :
  - **Astres**, selon leur couche : ×1,5 en orbite, ×1,75 dans un système, ×2 dans une galaxie, ×2,5 dans un amas, ×3 dans la Toile. Par exemple : la Lune grise passe de +8 à +15 % de production, la Nébuleuse de 8 à 30 % de capture, le Grand Attracteur de 10 à 45 %, le Grand Mur de 15 à 60 PV.
  - **Pouvoir des gardiens de zone** des échelons supérieurs : ×1,25 pour les continents, jusqu’à ×3,5 dans le Pli (ceux des régions ne changent pas).
  - **Influence des grands êtres** : ×1,25 pour les Souverains du monde, jusqu’à ×2,75 pour le Relieur (+85 PV, +70 % de production et carte toujours révélée).
  - Les textes de ces bienfaits sont recalculés à partir de leurs valeurs.
- Débogage : `AN.dbg.goNation('monde')` (échelon, puis peuple et humeur au choix : `AN.dbg.goNation('region', 'nautes', 'hostiles')`), `AN.dbg.favor(80)`. Mod de triche : case « nation » dans Voyager, faveur de la nation au maximum, aller à la capitale.
- Nouveaux tests (84 au total) : bienfaits croissants avec l’échelle (astres, gardiens, grands êtres), nations (reproductibles, une ville par zone avec comptoir et caserne, la capitale et son palais), faveur, prix, mercenaires, tribut, nation ancrée regénérée à l’identique.

**Changements de règles à noter.**
- **Bienfaits plus forts** aux échelons supérieurs : les astres, gardiens et grands êtres déjà rapportés deviennent plus puissants. Deux astres changent de nature pour ne pas doubler un voisin : la Naine brune régénère 1,8 PV par seconde (au lieu de −4 % de dégâts reçus), le Halo sombre réduit les dégâts reçus de 16 % (au lieu de +10 % de dégâts à distance). En contrepartie, les bonus de vitesse de déplacement s’additionnent jusqu’à +60 % au plus.
- **Les mondes ont encore changé** : certaines destinations sont des nations (sans village isolé), et des villages apparaissent dans les paysages de la 1.11. À graine égale, un monde n’est plus celui de la 1.11 (même réserve qu’en 1.11 pour les mondes en sursis et les lieux ancrés).
- **Dans le monde d’une nation**, on ne capture pas ses habitants. Tuer un habitant coûte 15 de faveur, un garde 6. Le cœur (la capitale) s’ouvre comme d’habitude, après les gardiens des zones, sauf dans une nation ancrée, où il est toujours ouvert.
- **Ancrer une nation** demande un Ancrage à sa mesure : rien de plus pour une région, de quoi retenir un Souverain du monde pour un monde entier, un Cataclysme planétaire pour une orbite, une Entité stellaire pour un système. On n’en rapporte aucun territoire. Une alliance compte comme douze habitants sauvés pour votre réputation, une soumission comme douze emmenés de force.
- **Mercenaires** : ce ne sont pas des compagnons. Ils ne coûtent pas de lien, ne gagnent pas d’expérience, ne prêtent pas de capacité et ne servent pas de monture. Ceux qui sont à terre à la fin rentrent quand même chez eux, mais chacun coûte 3 de faveur à une nation ancrée. Si une nation vous ferme ses portes, ses mercenaires s’en vont. Une reprise d’expédition (page fermée) ne les retrouve pas.
- **Tribut** : jusqu’à 5 unités de chaque ressource commune de leur paysage par période (davantage dans un monde plus grand, ×1,5 pour une nation soumise), parfois une ressource rare ; rien tant que leur faveur est négative.
- Sauvegarde : le format reste le **6** ; les champs `nations` (nations ancrées) et `mercs` (mercenaires engagés pour la prochaine expédition) sont ajoutés automatiquement.

## 1.11.0 — Bestiaire et noms : chaque chose à sa taille

- **Des noms à l’échelle de ce qu’ils désignent.** Dans un système, chaque zone est désormais un **astre** (« Astre 1/3 ») : la Couronne solaire devient le **Monde-tison**, une planète qui frôle son étoile ; la Ceinture de fer, une **Planète éventrée** ; la Queue de comète, une **Comète chevelue** ; et l’on n’en rapporte plus une « étoile naine », mais une **planète-tison**. D’une galaxie, on ne ramène que ce qui est à sa taille : une **Pouponnière d’étoiles** (nébuleuse), un **Courant stellaire** (l’ancien « amas d’étoiles », qu’on ne confond plus avec l’Amas), un **Bulbe galactique** (l’ancien « système stellaire »). Dans l’Amas, chaque zone est une galaxie : **Galaxie fantôme** (ex-Ponts sombres), **Spirale barrée** (ex-Galaxie naine), **Fusion galactique** ; le cœur s’appelle la **Géante du centre**. La Toile est faite de **superamas** : **Filament de galaxies**, **Lisière du Grand Vide**, **Grand Attracteur** (ex-Nœud de la Toile).
- **Des noms propres.** Chaque monde des échelons cosmiques porte un nom tiré de son code : « Planète Nylombe », « Orbites de Calémire », « Système d’Arithal », « Galaxie d’Orsène », « Amas de Corune », « Trame d’Omuve », « Cahier de Quelore ». Ce qu’on en rapporte porte le même : la « Planète-tison d’Arithal » vient du « Système d’Arithal ». Ces noms s’affichent dans le ciel de l’Archive, la vue d’ensemble, le rapport de retour et le choix des astres au transfert.
- **Lieux ancrés, nommés et regroupés.** Un lieu ancré est le monde d’où l’on a rapporté quelque chose, à son échelle : deux astres pris dans le même système ouvrent un seul lieu, le « Système d’Arithal ». Un monde dont on a rapporté des continents devient une planète (« Planète Nylombe »). La fiche du lieu dit ce qui l’ancre (« Planète-tison d’Arithal, Géante d’Arithal »). Ce qu’on rapporte d’un lieu ancré y reste rattaché.
- **Douze nouveaux biomes.**
  - Régions : la **Forêt de cire** (des arbres de cire sous un soleil immobile) et les **Salines chantantes** (un lac de sel dont le vent joue les cristaux).
  - Mondes entiers : quatre continents qui n’existent qu’à cette échelle, le **Rift continental**, la **Mer intérieure**, la **Calotte polaire** et la **Forêt-continent**. Ils se mêlent aux paysages des régions.
  - Un de plus par échelon cosmique : **Lune de soufre** (orbite), **Naine brune** (système), **Rémanent de supernova** (galaxie), **Galaxie-méduse** (amas), **Grand Mur** (Toile), **Le Brouillon** (Pli).
- **Quatre-vingts nouvelles créatures**, et **chaque biome en a désormais au moins une qui n’existe que là** :
  - une par biome de région, par exemple le Bramespore (un cerf dont les bois portent des champignons), la Bobinelle, le Sablier, la Pieuvre-lucarne, le Fulgaure, la Maçonne, la Gommeuse et le Pointillé de la Lisière ;
  - les habitants des deux nouveaux paysages, dont le Grand Cierge et l’Orgue des sels ;
  - douze pour les continents, dont le Ravaudeur, la Mère des marées, l’Enfoui et le Tronc-qui-marche ;
  - trente-neuf dans les cieux, par exemple la Sonde perdue, le Pétrisseur, la Montgolfière, l’Allumeur, la Lentille, le Pulsard, la Coquille, la Brebis égarée (celle qui manque toujours au compte du Berger), la Méduse-mère, le Funambule, le Rempart, le Renard plié, le Gribouille et l’Esquisse.
  - Douze nouveaux gardiens de zone, chacun avec ses trois phases et son pouvoir.
- **Dans l’Amas, la Toile et le Pli**, chaque biome a maintenant ses propres créatures (elles étaient toutes communes à l’échelon).
- **Onze nouvelles formes dessinées** : cierge, cloche (et orgue), cerf, sablier, sonde, pulsar, galaxie-méduse, nœud, tache d’encre, origami, montgolfière. Le Nœud vivant prend la forme d’un nœud.
- **Noms plus justes** : Lunaire devient Lunambule, Comète naine Cométule, Dévoreur Ventre-noir, Chasseur de lumière Happe-photons, Gardien du bras le Phare du bras, Arpenteur Géomètre, Mangeur de vide Buveur de vide.
- Nouveaux tests (81 au total) : chaque biome a une créature à lui (et tout ce qu’appellent les gardiens existe), noms propres (stables, bien formés, élidés, à l’échelle), lieux ancrés regroupés par monde d’origine, continents des mondes entiers ; l’empreinte des mondes est recalculée.

**Changements de règles à noter.**
- **Les mondes ont changé.** Les nouveaux paysages entrent dans les tirages : à graine égale, une destination n’est plus celle de la 1.10. Les destinations déjà proposées restent telles quelles (elles sont enregistrées). En revanche, un monde **en sursis** (mission de sauvetage) et un **lieu ancré** sont regénérés à partir de leur graine et peuvent avoir changé de paysage.
- **Mondes entiers** : environ un continent sur trois est un continent propre aux mondes. Le Cratère du Souverain reste le cœur et ne sert jamais de continent.
- **Astres** : les astres déjà rapportés prennent leur nouveau nom et leur nouvel aspect, sans changer d’effet. Cinq astres de plus : Lune de soufre (+6 % de dégâts au corps à corps), Naine brune (−4 % de dégâts reçus), Pulsar (+10 % de dégâts à distance), Galaxie-méduse (capture 8 % plus rapide), Grand Mur (+15 PV maximum).
- **Lieux ancrés** : deux astres du même monde ne font plus qu’un lieu. Ce lieu garde l’identifiant et la mémoire des visites du premier astre ; celle des autres est oubliée.
- Les nouveaux gardiens apportent leur pouvoir à l’Archive comme les autres (dégâts, armure, production, capture, vitesse, PV ou régénération).
- Sauvegarde : le format reste le **6**. Rien n’est enregistré des noms propres : ils se recalculent à partir du code des mondes.

## 1.10.0 — Au-delà de la galaxie, et les lieux qu’on a ramenés

- **Trois nouveaux paliers.** Après la galaxie, l’Artefact capte l’**Amas**, la **Toile**, puis le **Pli**. Chacun a son rang d’Archive, son échelle de dézoom, son type de destination, ses déplacements, sa menace, son maître et sa forme de capture.
  - **Amas** : trois galaxies et le Centre de l’amas. On marche sur des îles au-dessus du vide, reliées par des **ponts de matière sombre** qui se font et se défont (ils pâlissent avant de disparaître). Qui se trouve sur un pont qui se défait tombe : il revient au dernier endroit sûr, un peu blessé. On peut toujours sauter au-dessus du vide. Menace : les **collisions de galaxies** (après un avertissement, deux ondes de choc traversent la zone). Maître : **le Berger d’amas**. Forme de capture **Rassemblement** : ses galaxies errantes s’éloignent ; frappez-les pour les repousser dans son orbite, toutes, puis capturez-le.
  - **Toile** : trois nœuds et le Cœur de la Toile. Des **filaments de lumière** relient les lieux de chaque zone : on y file, ailleurs on se traîne. Menace : **le Grand Vide**, des vides qui s’étendent près de vous et qu’on traverse très lentement. Maître : **le Tisserand**. Forme **Tissage** : des nœuds s’allument autour de lui ; touchez-les dans l’ordre indiqué, puis capturez-le.
  - **Pli** : deux ou trois feuillets, et le Pli lui-même. Un monde blanc, comme le Néant du début. Par endroits, **la marche s’inverse**. On y croise des **échos de soi-même**, tirés du journal des expéditions : écoutés (E), ils rappellent une expédition passée et laissent un feuillet blanc ; les échos des expéditions où l’on est tombé sont hostiles. Menace : les **pliures** (une ligne annoncée traverse la zone ; quand la page se replie, ce qui s’y trouvait est emporté de l’autre côté). Maître : **le Relieur**. Forme **Reflet** : il se dédouble, et seul le vrai porte une ombre ; le rayon déchire un reflet, et le vrai reprend des forces.
  - Le rang **Inconnue** a enfin un contenu : il ouvre le Pli. Il reste le dernier rang.
- **Contenu de ces paliers** : 9 biomes (trois par palier, dont le Pli, réservé à son cœur), 21 créatures (par palier : deux mineures, deux prédateurs, deux gardiens et un maître ; 5 nouvelles formes dessinées), 3 ressources (onde gravitationnelle, fil de lumière, feuillet blanc), 6 astres (galaxie errante, galaxie naine, galaxies en collision, filament, morceau du Grand Vide, nœud de la Toile), 3 appels stratégiques prêtés par les maîtres capturés, 3 pièces d’équipement (Houlette d’amas, Navette de fil, Manteau blanc), 3 niveaux d’Ancrage, 3 fragments de récit.
- **Lieux ancrés.** Ce que vous avez ramené devient une destination permanente : un lieu par monde dont vous avez rapporté des continents ou le cratère, un lieu par astre (orbite, système, galaxie, amas, toile). L’Artefact s’y téléporte sans limite, depuis la console (Destinations, puis **Lieux ancrés**) ou en cliquant dessus dans l’Archive dézoomée (le continent ou l’astre survolé s’entoure et propose de s’y rendre). Un lieu est regénéré à partir de sa graine : c’est toujours le même. Il n’est **jamais détruit** : au retour, ni effondrement ni cinématique, l’hexagone repart et l’on retrouve l’Archive. On y récolte et l’on y capture ; les gisements repoussent en 30 minutes, les créatures reviennent en 20, les gardiens en 60 (temps réel). Le rapport s’intitule « Retour de… », avec le tampon « Ancré ».
- **Le globe.** À partir du rang Monde, l’Archive dézoomée repose sur un globe centré sur l’Artefact : parallèles et méridiens, ombres de nuages qui tournent, bord assombri. Plus loin que la galaxie, on voit l’amas (galaxies voisines, liens qui se forment et se défont, le Berger), puis la Toile (nœuds et filaments, le Tisserand), puis, tout au bout, une trame que l’on ne comprend pas.
- **L’impression d’y être.**
  - Monde : un horizon courbe en haut de l’écran, sous un ciel clair, et des ombres de nuages qui passent.
  - Orbite : la planète en contrebas, qui défile plus lentement que le sol (on la voit au travers), des étoiles, et des débris qui passent devant.
  - Système : l’étoile et les autres planètes au loin, chacune à sa distance, et une trame de l’espace creusée par les puits de gravité.
  - **Carte « vous êtes ici »**, sous la mini-carte : un schéma de l’échelon (région ou monde en secteurs, orbite et ses lunes, système et ses planètes, galaxie, amas, toile, feuillets du Pli), avec la zone où l’on se trouve, les zones conquises et l’hexagone. Sur écran tactile, toucher la mini-carte passe de l’une à l’autre.
- Cinématique : l’échelle supérieure d’une galaxie est désormais son amas, celle d’un amas sa toile.
- Débogage : `AN.dbg.goScale('amas')` (et `'toile'`, `'pli'`), `AN.dbg.place()` (liste des lieux ancrés), `AN.dbg.place(0)` (départ vers le premier), `AN.dbg.cosmic(11)`. Mod de triche : section **Lieux ancrés** (s’y rendre, tout faire repousser) ; Voyager propose les nouveaux échelons ; « Rang suivant » ajoute aussi les entités d’amas et de la Toile ; « Capture facile » ne prend ni les galaxies du Berger ni les échos.
- Nouveaux tests (77 au total) : les mondes d’avant 1.10 sont inchangés (même empreinte qu’en 1.9), zones de l’Amas, de la Toile et du Pli reproductibles et accessibles (ponts, filaments, endroits de l’envers), ancrage et indices des nouvelles formes de capture, échos, liste des lieux ancrés et monde regénéré à l’identique, repousse des gisements et retour des créatures.

**Changements de règles à noter.**
- **Rangs.** L’ancien dernier rang, Inconnue (atteint avec un organisme galactique), s’appelle désormais **Amas**. Suivent **Toile** (une entité d’amas et huit astres) et **Inconnue** (une entité de la Toile). Une partie qui était au rang Inconnue passe au rang Amas, sans rien perdre.
- **Lieux ancrés.** On n’en rapporte aucun territoire : le retour (plaque ou hexagone) ramène le sac et la soute, sans choix de territoires. La menace y est toujours de 7, sans peuple ni mission de sauvetage. Si l’on y tombe, le sac, la soute et l’équipement non lié sont perdus comme ailleurs, mais tous les compagnons rentrent blessés, de même que les gardes laissés au sol : rien ne reste en sursis. Une zone conquise le reste jusqu’au retour de son gardien. Le monde d’un lieu est propre à chaque partie.
- **Amas.** Tomber d’un pont coûte 16 points de vigueur ; une créature qui s’y trouve disparaît sans butin. **Toile** : vitesse ×1,9 sur un filament, ×0,6 ailleurs, ×0,45 dans le Grand Vide (pour vous comme pour les créatures). **Pli** : dans un endroit de l’envers, les commandes de déplacement sont inversées.
- **Ancrage.** Trois niveaux de plus (entités d’amas, de la Toile, du Pli ; trois puis quatre astres par extraction).
- **Orbite et système.** Le sol est en partie transparent pour laisser voir le fond ; seule l’apparence change.
- Sauvegarde : le format reste le **6** ; un champ `cosmos.visits` (ce qui reste des visites des lieux ancrés) est ajouté automatiquement.

## 1.9.0 — La base mobile : l’hexagone de l’Artefact part avec vous

- **L’hexagone part en expédition.** En ouvrant le passage, l’hexagone central de l’Archive (celui de l’Artefact) se détache, s’élève et disparaît dans la lumière. Il se pose dans le monde choisi, à l’entrée de la première zone : le sol est dégagé sous lui, le choc repousse les créatures alentour, et l’on en descend. Dans l’Archive, il ne reste qu’une empreinte en pointillés jusqu’au retour, où on le voit se reposer avant l’arrivée des territoires.
- **Point d’extraction principal.** Au pied de l’Artefact (E), « Transfert depuis l’hexagone » ouvre le même choix de territoires qu’une plaque. Le portail est l’hexagone entier, et le transfert y dure 15 % de moins. À la fin, l’hexagone repart avec le butin, vous à bord, puis vient la cinématique habituelle. Les plaques blanches et l’extraction d’urgence restent comme avant.
- **Gardes.** On affecte à l’hexagone des créatures de la collection (page **Hexagone** de la console, ou « Garder l’hexagone » sur leur fiche), en plus des compagnons. Un garde coûte autant de points que de liens ; il y en a 3 sans garnison. Les gardes restent à leur poste sur l’hexagone, défendent les abords pendant l’exploration et le transfert, et épargnent les créatures affaiblies. À terre, ils se relèvent comme des compagnons (E).
- **Défenses.** Cinq modules à bâtir et améliorer (deux niveaux chacun), installés dans l’hexagone : **Tourelle** (tire sur ce qui menace), **Mur d’enceinte** (vigueur et coups absorbés), **Générateur de bouclier** (un dôme qui se recharge), **Phare ralentisseur** (ralentit et éclaire), **Source de soin** (soigne le joueur et les gardes sur l’hexagone). Trois modules installés à la fois, davantage avec un chantier. Ils voyagent avec l’hexagone et ne se perdent jamais.
- **Assauts.** Dans la zone de l’hexagone, des créatures marchent sur lui de temps à autre, et les vagues du transfert le visent quand on le lance depuis lui. Sa vigueur s’affiche dans l’encart « Intégrité », une flèche le désigne quand il est attaqué hors de vue, et la mini-carte le montre. Il se répare lentement quand on le laisse en paix.
- **Hexagone submergé.** S’il tombe, l’Artefact rentre seul avec ses défenses et **toute la soute** (créatures, œufs, structures démontées, habitants embarqués) : tout cela rejoint l’Archive, quoi qu’il arrive ensuite. Les gardes debout sur l’hexagone partent avec lui ; ceux qui sont à terre ou loin restent au sol, et l’on peut encore les relever pour qu’ils rentrent avec vous. Un transfert en cours depuis l’hexagone s’interrompt (le monde se fige tel qu’il est). Vous restez dans le monde : il faut sortir par une plaque blanche ou par l’extraction d’urgence, et la soute, vide, peut se remplir de nouveau. Si vous étiez à bord, l’Artefact vous emporte avec lui.
- **Les bâtiments quittent l’Artefact.** L’hexagone central ne garde que l’Artefact, les défenses et les gardes. Chaque bâtiment se dresse sur une case d’un territoire et le suit quand on l’agence ou qu’il change de forme. Un territoire accueille un bâtiment, plus un par tranche de quatre cases (1 pour un fragment, 2 pour un territoire, 3 pour un cœur, 4 pour un continent, 6 pour un cratère). Un **paysage favorable** ajoute un bonus propre à chaque bâtiment (la forge sur un sol chaud ou métallique, la couveuse dans un paysage vivant…), et chaque structure rapportée gagne un bonus dans son paysage d’origine. On choisit le territoire en bâtissant ; « Déplacer » et « Ranger » sont sur la fiche du bâtiment et dans Constructions. Un bâtiment qui vient d’être posé sort de terre.
- **Sept nouveaux bâtiments** (15 en tout) : **Observatoire** (scanner, balayage ciblé), **Bibliothèque** (fragments de récit plus fréquents, expérience), **Garnison** (points de garde), **Port d’astres** (un astre de plus retenu par l’Ancrage), **Temple** (humeur des peuples installés), **Serre** (les créatures ont faim moins souvent), **Chantier** (constructions et modules moins chers, un module de plus dans l’hexagone).
- Les arches emportées se dressent désormais près de leur peuple.
- **Typographie.** Les textes de l’interface reçoivent à l’affichage les espaces insécables du français (avant « : », « % », « ; », « ? », « ! », à l’intérieur des guillemets).
- Débogage : `AN.dbg.base()` (aller à l’hexagone), `AN.dbg.raid()` (assaut), `AN.dbg.submerge()`, `AN.dbg.guard('salamandre')` (ajouter un garde). Mod de triche : aller à l’hexagone, assaut, submerger ; « Vigueur pleine » répare aussi l’hexagone et relève les gardes ; « Bâtiments au niveau maximum » pose les bâtiments sur les territoires et monte les modules au maximum.
- Nouveaux tests (70 au total) : migration des bâtiments, gardes, modules, sol dégagé sous l’hexagone (le reste du monde inchangé), submersion (soute sauvée, gardes abandonnés en sursis ou perdus), effets et bonus des nouveaux bâtiments.

**Changements de règles à noter.**
- **On n’arrive plus sur l’entrée d’une zone, mais sur l’hexagone**, qui s’y pose : environ cinq cases de rayon autour de l’entrée de la première zone sont dégagées (relief, terrain dangereux et vide deviennent du sol). Le reste du monde est généré exactement comme avant, à graine égale.
- **L’extraction depuis l’hexagone** est plus courte (−15 %), mais l’hexagone peut être attaqué ; les assauts ne commencent qu’à partir de la troisième expédition, et seulement dans sa zone (rien n’arrive à l’hexagone quand on explore une autre zone).
- **Ce que ramène un hexagone submergé est acquis**, même si l’on tombe ensuite. En revanche, il ne ramène aucun territoire : seule une extraction (depuis l’hexagone ou une plaque) en rapporte.
- **Gardes perdus.** Un garde encore au sol quand l’hexagone repart est perdu : après une chute, le monde n’est pas détruit et il y reste en sursis (mission de sauvetage) ; sinon il ne reste de lui qu’une essence. Après une chute, un garde à terre sur l’hexagone reste aussi dans le monde. Après une extraction réussie ou d’urgence, un garde à terre revient blessé.
- **Un garde n’est pas un compagnon** : choisir l’un retire l’autre. Un garde blessé, perdu ou rebelle quitte la garde.
- **Bâtiments.** Ils ne sont plus limités à 22 emplacements autour de l’Artefact, mais par la place sur les territoires : sans territoire, on ne bâtit pas. Leurs effets de base ne changent pas ; le bonus du paysage s’y ajoute. Les constructions profitent aussi du chantier (en plus des réductions de l’Atelier).
- **Lumière.** Les mondes sombres sont éclairés autour de l’hexagone.
- Sauvegarde : **format 6**. Migration automatique : chaque bâtiment posé autour de l’Artefact rejoint le territoire qui lui convient le mieux (paysage favorable d’abord, puis le plus de place) ; faute de place, il est rangé, déjà payé, et se repose gratuitement. Les structures rapportées jamais reconstruites restent à reconstruire. Les arches perdent leur emplacement. Un champ `base` (gardes, modules bâtis, modules installés) est ajouté. Un point de reprise d’expédition d’avant la 1.9 reprend avec l’hexagone déjà posé.

## 1.8.2 — Optimisation : le même jeu, plus fluide

Rien ne change dans les règles, les commandes ni les images : le jeu fait le même travail, en moins de temps.

- **Plus d’arrêts dans l’Archive.** Le terrain détaillé d’un territoire se dessinait d’un seul coup quand il entrait dans la vue, ce qui figeait le jeu jusqu’à un quart de seconde pour un continent. Il se dessine maintenant par morceaux, dans le temps libre de chaque image (la version légère reste affichée en attendant), et ceux qui bordent la vue ou qui vont arriver sont préparés d’avance. Les terrains déjà dessinés sont gardés pendant l’expédition : au retour, l’Archive n’a plus à les refaire. Un territoire qu’on révèle au retour d’expédition apparaît toujours détaillé.
- **Archive** : quand on se promène, les territoires ne sont plus redessinés un à un à chaque image ; ils sont gardés dans un calque qui suit la caméra. Environ deux à quatre fois moins de travail par image.
- **Expéditions** : le terrain de la zone n’est plus agrandi à l’écran à chaque image (même calque qui suit la caméra) ; l’obscurité des mondes sombres n’est plus calculée sur tout l’écran, seulement autour des lumières. Environ deux fois moins de travail par image en combat.
- **Transfert** : la carte n’est plus recalculée dix fois par seconde pendant l’effondrement (seules les cases effacées sont repeintes), et le halo blanc du bord de l’écran n’est plus recalculé à chaque image.
- **Affichage** : les compteurs, barres et textes à l’écran ne sont réécrits que lorsqu’ils changent ; quelques calculs fréquents (couleurs, nombres, visibilité, centre des territoires) sont plus rapides.
- Mesures (temps moyen d’une image, rendu sans carte graphique) : Archive −45 à −70 %, combat −50 %, gardien et galaxie −40 %, effondrement −20 % ; pire arrêt dans l’Archive : de 278 ms à environ 30 ms. Les scènes rejouées à l’identique donnent le même état de jeu qu’avant.
- Nouveau test (64 au total) : les fonctions optimisées rendent exactement les mêmes résultats qu’avant.

**Changements de règles à noter.**
- Aucun. Seules différences possibles à l’écran, invisibles à l’œil : le terrain suit la caméra au pixel près (au plus un demi-pixel d’écart avec les créatures), le halo du transfert peut varier d’un ou deux niveaux sur 255, et un terrain détaillé peut mettre une fraction de seconde de plus à remplacer sa version légère.

## 1.8.1 — Mod de triche, à part du jeu

- **Mod de triche** (`mods/triche.js`) pour tester sans tout regagner : ressources, équipement et outils, améliorations et bâtiments au maximum, structures, territoires, rang suivant ou maximal, astres, temps qui passe, bestiaire et récit complets, n’importe quelle créature (variante, niveau, compagnon), triches d’expédition (invincible, dégâts ×10, vitesse, sac et soute illimités, capture facile, carte révélée, transfert éclair, gardien épuisé ou achevé, déplacements instantanés, transfert terminé d’un clic), départ immédiat vers n’importe quel échelon ou paysage, vitesse du jeu jusqu’à ×8. S’ouvre avec F8, la touche ² ou l’onglet TRICHE au bord gauche de l’écran.
- **Un programme à part.** Le jeu n’en dépend pas : il essaie seulement de charger `mods/triche.js` en local (fichier ouvert depuis le disque, ou `localhost`), ou avec `?triche=1` dans l’adresse ; `?triche=0` l’en empêche. Le mod ne modifie aucun fichier du jeu : il enveloppe quelques fonctions au chargement. Supprimer le dossier `mods` suffit à l’enlever.
- **Jamais publié** : `mods/` est ignoré par Git, et `publier-sur-github.bat` vérifie à chaque publication qu’il reste sur l’ordinateur. Le service worker ne le garde pas en cache.

**Changements de règles à noter.**
- Aucun. Sans le dossier `mods`, le jeu est identique à la 1.8.0. Les triches modifient la partie en cours comme le ferait le jeu (format de sauvegarde inchangé) ; les réglages du mod sont enregistrés à part (`archive-du-neant/triche`).

## 1.8.0 — Menus refaits, musique générative, nouvelle fin d’expédition

- **Console de l’Artefact réorganisée.** Les dix onglets sont rangés en quatre groupes (Voyager : Destinations, Préparation ; Fabriquer : Atelier, Améliorations, Constructions ; L’Archive : Vue d’ensemble, Collection, Peuples ; Savoir : Bestiaire, Journal), chacun avec son icône. Un **badge** signale ce qui attend : améliorations abordables, structures à reconstruire, créatures prêtes à évoluer, essences à ranimer, demandes des peuples, missions de sauvetage. L’en-tête montre la mosaïque de l’Archive en miniature (elle ouvre la vue d’ensemble), le rang et la progression vers le suivant, et la réserve (les six ressources les plus précieuses ; le reste s’ouvre d’un clic, rangé par rareté).
- **Vue d’ensemble** (ancien onglet Archive) : grande mosaïque de l’Archive avec les vraies formes des territoires, rang et prochain palier, chiffres (dont les synergies de l’agencement), liste « À faire » qui mène au bon onglet, productions et rapatriement, astres, territoires avec leur forme, synergies et pouvoirs.
- **Préparation** en cartes : chaque emplacement (armes, protection, sac, outils) est une carte qui s’ouvre sur ses choix sans quitter la page ; consommables en tuiles avec des boutons − et +, compagnons en tuiles à cocher (avec les liens entre eux), appel stratégique au choix ; une barre fixe en bas résume le risque et garde « Ouvrir le passage » à portée.
- **Atelier** : filtres en pastilles, case « seulement ce que je peux fabriquer », étiquette « Équipé ». **Collection** : filtres en pastilles et réglage des soins (nourrir automatiquement) en tête de liste.
- **La page ne remonte plus en haut** quand on fabrique, équipe, ajoute, retire, coche ou change de filtre : dans la console, le sac, les transferts, la fiche d’une créature, les peuples et la pause, la position de défilement et le bouton actif sont gardés.
- **Écran titre vivant** : la mosaïque de chaque partie sert de sceau à son emplacement, et la mosaïque de la partie survolée tourne lentement en fond.
- **Pause** en cinq onglets : Son (volume général, musique, effets, ambiance), Jeu, Accessibilité, Commandes, Partie (actions irréversibles regroupées dans une zone à part, temps de jeu).
- **Rapport de retour** refait : bandeau aux couleurs du monde, tampon « Détruit » ou « En sursis », gains à gauche (territoires avec leur forme, astres, créatures et œufs éclos, structures, peuple), ressources rangées par valeur à droite avec leur total, niveaux des compagnons, progression du rang ; les pertes à part.
- **Style commun** : titres, pastilles, barres, cartes et tuiles partagés par toutes les fenêtres ; ouverture animée (coupée par « effets réduits » et par le réglage du système) ; mises en page pour téléphone.
- **Musique générative.** Une musique composée en temps réel, sans fichier : un thème pour l’écran titre, un pour l’Archive (il s’étoffe avec le rang), un par monde (mode musical et tonalité tirés de son paysage et de sa graine : un monde volcanique ne sonne pas comme un monde d’eau, et le même monde sonne toujours pareil), qui s’intensifie quand des créatures attaquent et devant un gardien, une montée pendant l’effondrement et une conclusion à la fin d’expédition. Elle s’efface derrière les fenêtres ouvertes. Réglage « Musique » dans la pause.
- **Effets plus riches.** Chaque arme à distance et de corps à corps a son propre son ; les impacts suivent les dégâts ; les créatures crient (agressivité, blessure, mort) d’une voix qui dépend de leur forme et de leur taille ; les sons sont **placés dans l’espace** (à gauche, à droite, atténués au loin) ; nouveaux sons d’interface (onglets, validation, refus, équipement, fabrication, construction, amélioration, balayage, montée de niveau).
- **Nouvelle fin d’expédition.** La zone se brise en éclats hexagonaux, du bord vers le joueur, pendant qu’une colonne de lumière emporte la soute (créatures, structures, habitants). On recule : le monde se fend, le Néant l’efface, et les territoires emportés, avec leurs vraies formes, s’enroulent vers le portail. On recule encore jusqu’à l’échelle supérieure, où le monde s’éteint (« Détruit » ou « En sursis »). Puis l’Archive apparaît : chaque nouveau territoire vient se poser à la place qu’il a choisie, la soute rejoint l’Artefact. Après une extraction d’urgence ou un échec, elle est plus brève : rien ne monte dans la lumière, et elle s’arrête sur le monde qui s’éteint. On peut toujours la passer (Espace, Entrée, Échap, E, clic ou toucher).
- Correction : les messages d’arrivée d’une expédition (règle du monde, conseils) ne s’affichent plus s’ils arrivent après sa fin, par-dessus la cinématique ou dans l’Archive.
- Nouveau test (63 au total) : composition de la musique (un mode connu pour chaque paysage, même graine même thème, graines différentes thèmes différents, échelons cosmiques plus graves).

**Changements de règles à noter.**
- Aucune règle de jeu ne change.
- L’onglet « Artefact » de la console s’appelle désormais **Améliorations** ; les productions et le rapatriement sont passés dans la **Vue d’ensemble**, le réglage des soins dans la **Collection**. L’onglet « Son et jeu » de la pause est séparé en **Son** et **Jeu**.
- Sauvegarde : le format reste le 5 ; un réglage `music` (volume de la musique, 0,55 par défaut) est ajouté à `settings`.

## 1.7.0 — Agencer l’Archive : formes qui comblent les creux, rangement automatique

- **Les territoires choisissent leur forme en arrivant.** Un territoire rapporté garde son nombre de cases, mais pousse case par case dans les creux de l’Archive (les cases qui touchent déjà quelque chose d’abord), en restant ramassé et en se rapprochant de ses partenaires de synergie. L’Archive grandit d’un seul tenant, sans trous ; un relief propre à chaque partie lui donne des avancées et des baies plutôt qu’un cercle.
- **Forme fixe ou adaptée** (F, ou le panneau). En forme adaptée, un territoire déplacé prend la forme de sa nouvelle place (R : une autre forme) ; en forme fixe, il garde la sienne et R le fait tourner, comme avant.
- **Rangement automatique** (G, ou le panneau). L’Archive cherche la disposition qui forme le plus de synergies (pondérées par ce que produit chaque territoire), compte la Forge, sépare les voisins néfastes et les peuples ennemis, et reste compacte. Les formes sont gardées (rotations permises) ou adaptées, au choix. Les territoires glissent vers leur nouvelle place.
- **Défaire** (Q, Retour arrière, ou le panneau) : chaque déplacement et chaque rangement se défont, un pas à la fois.
- **Panneau d’agencement** : synergies et néfastes de l’Archive, part de production gagnée par les voisinages, Forge, peuples ennemis côte à côte, cases enclavées ; pour le territoire survolé, ses synergies et les paysages avec lesquels il s’accorderait ou qu’il vaut mieux tenir loin. Le fantôme d’un territoire saisi annonce ce que donnerait la place visée.
- **Carte d’agencement plus lisible** : les frontières entre voisins s’allument en vert ou en rouge, avec un badge (le détail s’affiche de près ou au survol) ; les noms s’effacent quand ils deviennent illisibles ; le territoire survolé est surligné.
- **Vue libre** : la vue d’agencement montre toute l’Archive quel que soit le rang, se déplace en glissant (souris ou doigt) ou avec les touches de déplacement, et zoome à la molette vers le pointeur. Un clic sans glisser saisit ou pose.
- **Tactile et manette** : au doigt, on touche un territoire puis sa place, on glisse pour déplacer la vue, boutons Tourner, − et + ; le panneau se touche directement. À la manette : stick droit le curseur, stick gauche la vue, A saisir et poser, B lâcher, Y tourner, LT forme, LB rangement, X défaire. Correction : au doigt, la case touchée est désormais bien celle qui est visée.
- Débogage : `AN.dbg.terr(n)` ajoute n territoires variés, posés comme au retour d’expédition.
- Nouveaux tests (62 au total) : arrivées sans chevauchement ni trou et reproductibles, forme adaptée, rangement (formes gardées ou adaptées, Archive d’un seul tenant, jamais moins bien rangée qu’avant), défaire.

**Changements de règles à noter.**
- **La forme d’un nouveau territoire ne vient plus de sa zone d’origine** : elle est choisie à l’arrivée pour combler l’Archive (même nombre de cases qu’avant). Les territoires déjà rapportés gardent leur forme et leur place.
- **Un territoire peut changer de forme** quand on le déplace en forme adaptée ou au rangement automatique ; son nombre de cases ne change jamais. Ses habitants et ses créatures le suivent.
- Les synergies elles-mêmes ne changent pas : toujours une par paire de voisins qui se touchent, quelle que soit la longueur de la frontière.
- Sauvegarde : le format reste le 5 ; un champ `arrange` (forme adaptée, choix du rangement) est ajouté au profil.

## 1.6.0 — Jouer partout : écran tactile, manette, application hors ligne

- **Écran tactile.** Sur téléphone et tablette, des commandes apparaissent dès qu’on touche l’écran : un stick de déplacement sous le pouce gauche (il naît là où l’on pose le doigt), un stick de visée sous le pouce droit qui tire dès qu’on le pousse, et autour de lui Esquive, Frappe, Capture, Agir, Capacité, Appel et Monture. Frappe et Capture visent seules la cible la plus proche ; Agir s’allume quand une interaction est possible. On touche directement un consommable dans sa barre, l’encart du sac pour l’ouvrir. L’Archive a ses propres boutons (Agir, Monture, Agencer, Collection, zoom) et l’agencement des territoires se fait au doigt (Tourner, Terminer). Réglages : automatique, toujours ou jamais ; trois tailles ; disposition pour gaucher.
- **Manette.** Toute manette en disposition standard : stick gauche pour se déplacer, stick droit pour viser, gâchette droite pour tirer, RB pour frapper, gâchette gauche pour capturer (visée assistée quand le stick droit est au repos), A interagir, B esquiver, X capacité, Y monture, LB appel, croix consommables, Vue sac, Menu pause. Les fenêtres se parcourent entièrement à la manette (A valider, B revenir, LB / RB onglets, stick droit défilement). Vibrations quand on est touché (désactivables).
- **Les touches affichées suivent l’appareil utilisé** : aides, invites, toasts et cartes du tutoriel nomment la touche du clavier, le bouton de la manette ou le bouton tactile, et changent dès qu’on passe de l’un à l’autre.
- **Application installable et hors ligne.** Le jeu publié en ligne s’installe comme une application (bouton « Installer le jeu » sur l’écran titre, ou « Sur l’écran d’accueil » sur iPhone et iPad), s’ouvre en plein écran et se joue ensuite sans connexion. Un service worker garde le jeu en cache et se met à jour en arrière-plan.
- **Petits écrans.** L’affichage tête haute se resserre quand les commandes tactiles sont là ; la console de l’Artefact, la pause et l’écran titre s’adaptent aux téléphones (onglets en bandeau, fenêtres plein écran, emplacements de partie empilés à la verticale). Bouton « Plein écran » sur l’écran titre (orientation paysage verrouillée quand le navigateur le permet).
- **Publication automatique.** `publier-sur-github.bat` publie le dossier sur GitHub Pages en un double-clic (dépôt `azertyuser09876-spec/Archive-du-N-ant`) : installation de Git si besoin, connexion, création du dépôt, envoi, activation de Pages, ouverture du site.

**Changements de règles à noter.**
- Aucun changement de règles de jeu ni de format de sauvegarde. Les commandes tactiles et la manette pressent les mêmes touches logiques que le clavier : tout ce qui se fait au clavier se fait à l’identique.
- Le retour d’urgence n’a pas de bouton tactile dédié (on le trouve dans la pause), pour éviter de le déclencher par mégarde.

## 1.5.0 — Confort : plusieurs parties, reprise des expéditions, touches et accessibilité

- **Trois emplacements de partie.** L’écran titre présente trois archives, chacune avec son rang, ses territoires, ses créatures, ses mondes visités et l’heure de la dernière partie ; on y continue, commence, importe ou efface une partie. « Changer de partie » dans la pause ramène à cet écran.
- **Sauvegarde en pleine expédition.** L’expédition en cours est enregistrée toutes les dix secondes, à chaque changement de zone et quand on quitte la page. Au retour, le jeu propose de la **reprendre** (position, vigueur, sac, soute, consommables, compagnons, zones conquises, gisements épuisés, caveaux ouverts, œufs pris, structures fouillées ou démontées, balises posées, brouillard levé) ou de l’**abandonner**.
- **Touches reconfigurables.** Pause → Commandes : les 17 actions du jeu se réattribuent une à une (deux actions ne partagent jamais une touche : elles s’échangent). Les aides, invites et textes du tutoriel suivent les nouvelles touches.
- **Accessibilité.** Taille de l’interface (90 à 150 %), trois jeux de couleurs (standard, daltonisme rouge-vert, contraste élevé), texte plus grand dans les messages, effets réduits (moins de particules, ni flash ni tremblement, animations de l’interface coupées).
- **Pause automatique** quand la fenêtre perd le focus ou que l’onglet est caché (désactivable).
- La pause est réorganisée en onglets : Son et jeu, Accessibilité, Commandes, Partie.
- Nouveaux tests (59 au total) : touches reconfigurables, emplacements de partie, changements d’une zone pour la reprise.

**Changements de règles à noter.**
- **Fermer la page pendant une expédition ne la termine plus.** Jusqu’ici, c’était compté comme une extraction d’urgence sans butin. L’expédition reprend désormais là où on l’a laissée. L’abandonner garde l’ancienne règle : retour sans butin, équipement rendu, et seuls les consommables qui restaient sont rendus.
- **À la reprise, les créatures réapparaissent** (le monde a continué sans vous) ; le reste est conservé. Les situations en cours avec un peuple (rassemblement, défense d’une arche, départ) reprennent à leur début ; les habitants déjà embarqués restent dans la soute. Le temps de l’expédition reprend où il en était.
- Pas de point de reprise pendant le tutoriel, pendant le transfert final ni quand le personnage est tombé : on reprend au dernier point enregistré.
- Sauvegarde : le format reste le 5. La partie existante devient l’emplacement 1 ; le point de reprise vit dans `pendingExpedition.snap` (version 1). Les réglages de l’appareil (touches, accessibilité, commandes tactiles, manette, dernier emplacement utilisé) sont enregistrés à part et valent pour toutes les parties.

## 1.4.0 — Outils de préparation, structures et événements des mondes

Le reste du document de conception : de quoi se préparer, de quoi bâtir, et ce qu’on trouve dans les mondes.

- **Outils de préparation.** Quatre nouveaux emplacements dans la Préparation, fabriqués à l’Atelier (trois outils chacun) :
  - **Récolte** : Pic d’os, Faucille d’ambre, Foreuse résonante (récolte plus rapide, unités en plus, et la foreuse ouvre les **filons profonds**, une ou deux veines rares par zone, scellées dans la roche).
  - **Capture** : Lanterne apaisante (capturable plus tôt), Gantelet de stase (rayon plus rapide et plus long), Cage de stase (trois créatures mineures sans place de soute).
  - **Module d’extraction** : Ancre de stabilité (transfert plus court), Balise de rappel (une fois par expédition, pose une plaque d’extraction où l’on se trouve, loin de toute autre), Collecteur d’urgence (le sac entier survit à une extraction d’urgence, un tiers à une chute).
  - **Transport** : Kit de démontage, Plateforme flottante (+2 places de soute), Traîneau du néant (démontage, soute, sac).
  Comme l’équipement fabriqué, les outils emportés sont perdus si vous tombez.
- **Bâtiments de l’Archive** (nouvel onglet **Constructions** de la console) : Entrepôt, Collecteur, Forge, Couveuse, Infirmerie, Tour de guet, Sanctuaire, Relais de portail, chacun sur deux niveaux. Ils prennent place autour de l’Artefact (22 emplacements) et agissent sur tout le jeu : stock et production hors ligne, ramassage automatique, coûts de fabrication, reproduction, guérison, destinations et fiabilité du scanner, loyauté et expérience, durée du transfert, soute. On s’en approche et on appuie sur E pour leur fiche (améliorer, ranger).
- **Structures à découvrir dans les mondes.** Environ une zone sur trois abrite une structure liée à son biome (12 en tout : Puits des profondeurs, Serre de résine, Forge abandonnée, Totem des bêtes, Observatoire en ruine, Fontaine de sève, Autel du Néant, Ruche-mère, Phare englouti, Moulin à foudre, Statue du gardien, Horloge figée). On la **fouille** (ressources, parfois un fragment de récit), puis, avec un outil de transport, on la **démonte** et elle part dans la soute. Rapportée, elle se **reconstruit** autour de l’Artefact et donne un effet propre (un lien de compagnon en plus, une destination, de la régénération, des consommables, etc.). Le scanner les signale sur les fiches des destinations.
- **Événements des mondes.** Pendant l’exploration d’une zone, il peut se passer quelque chose : **Pluie de météores** (impacts annoncés, fragments précieux), **Floraison** (les gisements repoussent), **Migration** (un troupeau d’une espèce venue d’ailleurs traverse la zone), **Éclipse** (obscurité, créatures furieuses, butin accru), **Faille** (des créatures d’un autre monde en sortent ; refermée, elle laisse une essence), **Écho d’un monde** (le fantôme d’une structure, à fouiller ou à démonter avant qu’il ne s’efface). Le scanner les pressent ; l’affichage tête haute montre l’événement en cours et son temps restant.
- La recherche précise compte aussi les filons profonds. Les arches des peuples prennent désormais un emplacement autour de l’Artefact.
- Nouveaux tests (56 au total) : outils, bâtiments et structures, génération des structures et des événements, sauvegarde v5.

**Changements de règles à noter.**
- Sauvegarde : format 5 (emplacements d’outils, structures). Migration automatique ; les arches déjà emportées sont replacées sur un emplacement autour de l’Artefact.
- Chaque zone de région peut contenir une structure et un ou deux filons profonds : ces ajouts sont tirés à part, ils ne changent rien au reste de la génération.
- Le stock maximal par territoire (60) et la durée de production hors ligne (3 h) restent les valeurs de base ; seuls les bâtiments les augmentent.

## 1.3.0 — Nouvelle faune et tutoriel interactif

- **Le Seuil, un tutoriel dans un monde à part.** À la première partie, après l’introduction, le jeu propose le Seuil : un petit monde accroché à l’Artefact, construit à la main (une clairière, un bosquet, une prairie, une arène). Une carte d’objectifs guide pas à pas : se déplacer, récolter (E), tirer (clic gauche), frapper et esquiver (clic droit, Espace), capturer un Mousseron (affaiblir puis F), affronter le Veilleur du Seuil (l’épuiser, puis le capturer ou l’achever), extraire depuis la plaque blanche et tenir jusqu’au bout. Un cercle bleu marque l’objectif et une flèche tourne autour du personnage pour y mener. On ne peut pas tomber dans le Seuil. Ce qu’on en rapporte (territoire, créatures, ressources) devient le premier morceau de l’Archive.
- Le tutoriel peut être **passé** à tout moment (bouton sur la carte d’objectifs, ou dans la pause) et **rejoué** depuis la pause : la partie d’essai tourne alors sur un profil jetable, sans rien enregistrer.
- **19 nouvelles créatures** (102 en tout), surtout dans les biomes qui en avaient peu : 9 créatures mineures (Rainevolt, Plumeneige, Braisargot, Ossicrabe, Fourmiel, Raie des sables, Fil-blanc, Nuagelin, Horlogette), 6 prédateurs (Loup de givre, Héron-foudre, Crabe de lave, Limier de rouille, Scorpion de verre, Raie des nues), 3 gardiens (Grand-Duc d’orage, Crabe-Forteresse, Reine scorpionne) et le Veilleur du Seuil, qu’on ne rencontre que dans le tutoriel. Chacune a ses capacités prêtées, ses clés, sa monture le cas échéant, son régime et sa production ; deux nouvelles évolutions (Raie des sables → Raie des nues, Horlogette → Limier de rouille).
- **Six nouvelles formes dessinées** : grenouille, oiseau (avec variantes chouette, automate, huppe, long cou), escargot, crabe (jusqu’à la forteresse sur le dos), raie, scorpion ; les quadrupèdes peuvent avoir des oreilles.
- Chaque biome de région compte désormais au moins trois espèces communes.
- Nouveaux tests (52 au total) : faune, accessibilité de la zone du Seuil, partie d’essai sans écriture.

**Changements de règles à noter.**
- Les nouvelles espèces rejoignent la faune des biomes : à graine égale, un monde ne contient plus exactement les mêmes créatures qu’en 1.2 (les destinations déjà captées dans une sauvegarde peuvent montrer d’autres habitants que prévu).
- Une nouvelle partie commence par la proposition du Seuil, au lieu d’arriver directement dans l’Archive. Les sauvegardes existantes ne sont pas concernées (le tutoriel reste accessible depuis la pause, sans rien garder).
- Dans le Seuil seulement : la soute est portée à 9 places, un gardien épuisé ne se relève pas, et le joueur ne peut pas tomber.

## 1.2.0 — Carte des destinations et recherche précise

- **Choisir un monde sur une carte.** L’onglet Destinations s’ouvre sur une carte animée de l’Artefact : chaque destination captée y est une planète dont les secteurs sont ses zones et le centre son cœur. Plus elle est loin de l’Artefact, plus elle est dangereuse (anneaux numérotés de menace). Le survol montre un aperçu, le clic ouvre sa fiche à côté de la carte, les flèches du clavier passent d’un monde à l’autre. Pictogrammes : peuple, caveaux (couleur de la clé), mission de sauvetage. La vue Liste reste disponible.
- **Recherche précise, seulement quand on la demande.** « Je cherche » : une ressource, ou une créature déjà observée. L’Artefact indique alors exactement quels mondes la contiennent, dans quelles zones et en quelle quantité (y compris dans les caveaux scellés et parmi les gardiens). Les mondes concernés s’entourent de bleu sur la carte, les autres s’éteignent. Sans recherche, rien ne change : les fiches restent des estimations du scanner.
- **Balayage ciblé** (5 Étincelles, 3 Sables vitreux) : si aucune destination ne convient, l’Artefact cherche un monde qui contient la cible et l’ajoute en tête des destinations (marqué « Balayage »). Un seul monde balayé à la fois.
- **Guidage sur place.** La recherche reste active en expédition : en entrant dans une zone, un message dit combien de cibles s’y trouvent (ou dans quelle zone aller), une flèche bleue tourne autour du personnage vers la plus proche, avec sa distance, et la mini-carte les marque toutes.
- **Raccourcis.** Dans l’Atelier, une ressource manquante (en rouge) se clique pour lancer sa recherche ; dans le Bestiaire, chaque espèce observée a un bouton « Chercher ».
- Nouveaux tests (49 au total) : décompte exact par génération des zones, absence, balayage ciblé. Les tests n’écrivent plus jamais dans la sauvegarde du joueur.

**Changements de règles à noter.**
- Aucune règle existante ne change. La recherche est un ajout : elle ne modifie ni les mondes générés ni la fiabilité du scanner, elle ajoute une information exacte sur une seule cible choisie.

## 1.1.0 — Territoires à leur vraie taille, compagnons de toute taille

- **Les territoires ont la taille et la forme de ce que vous ramenez.** Le fragment reste une seule case hexagonale, comme avant. Un territoire conquis en occupe 7, un cœur de région 12, un continent 16, le cratère d’un Souverain 22. Leur forme vient de la zone d’origine : ses parties ouvertes sont reportées sur la grille, et la forme pousse vers elles. Deux zones différentes donnent deux formes différentes.
- **Agencement (V)** : on saisit un territoire par la case cliquée, on le tourne avec R, un fantôme montre où il se posera (bleu : possible, rouge : impossible, avec la raison). Deux fragments s’échangent toujours d’un clic. Les synergies se calculent entre territoires qui se touchent par au moins une case.
- Les créatures parcourent tout leur territoire, et les peuples s’installent sur l’une de ses cases. Les terrains lointains s’affichent en version légère, et le détail se calcule à l’approche.
- **Toutes les créatures peuvent vous accompagner.** Les ultra-boss et les êtres des échelles supérieures voyagent sous une forme réduite par l’Artefact : 3 liens pour un ultra-boss, 4 au-delà (un gardien en prend toujours 2). Ils peuvent tous vous porter (R), et un géant qui vous accompagne peut lancer lui-même son appel (G).
- **Une créature peut vous suivre dans l’Archive** : bouton « Me suivre dans l’Archive » sur sa fiche.
- Nouveaux tests (46 au total).

**Changements de règles à noter.**
- Les ultra-boss et les êtres cosmiques, auparavant interdits en expédition, peuvent accompagner le joueur (forme réduite : environ un tiers de leur vigueur).
- Sauvegarde : format 4. Les territoires des anciennes sauvegardes prennent leur nouvelle taille (avec une forme tirée de leur graine, la zone d’origine n’existant plus), puis l’Archive est réagencée au plus près de l’ancienne disposition. Vos synergies peuvent donc changer : un passage par l’agencement (V) permet de les retrouver.

## 1.0.0 — Échelles supérieures

L’Archive ne s’arrête plus au rang « Monde ». Au-delà, on part chercher des mondes entiers, puis ce qui tourne autour d’eux, puis ce qui les contient.

- **Quatre nouveaux échelons d’expédition**, choisis dans l’onglet Destinations dès que l’Archive en approche : **Mondes** (rang Monde), **Orbites** (rang Orbite), **Systèmes** (rang Système), **Galaxies** (rang Galaxie). Chacun apporte, comme le demande le document de conception, ses ressources, ses déplacements, sa forme de capture, sa menace, ses décisions et sa capacité d’extraction.
- **Déplacements.** Mondes : de grands continents. Orbites : l’apesanteur, on dérive sur son élan. Systèmes : l’apesanteur, et des planétoïdes dont la gravité vous attire (et vous lance). Galaxies : des îles de lumière séparées par le vide, qu’on franchit d’un saut (maintenir Espace, la trajectoire s’affiche ; trop court, le vide vous renvoie au bord).
- **Menaces.** Séismes sur les mondes, pluies de météores en orbite (qui laissent parfois du régolithe ou de l’éther), éruptions solaires dans les systèmes (il faut s’abriter derrière le relief, à l’opposé de l’étoile), dévoreurs qui sortent du vide dans les galaxies.
- **Quatre nouveaux rangs de créatures** et 31 nouvelles espèces (83 en tout) : 3 Souverains du monde, 3 Cataclysmes planétaires, 2 Entités stellaires, 2 Organismes galactiques, avec leurs gardiens, prédateurs et créatures mineures. Nouvelles formes dessinées : tortue-monde portant sa ville, astres vivants, comètes, nébuleuses, spirales.
- **Formes de capture.** Le rayon ne suffit plus : **Ancrage** (planter trois ancres autour du Souverain épuisé), **Scellement** (briser les noyaux qui gravitent autour du Cataclysme), **Encerclement** (faire le tour complet de l’Entité stellaire dans l’anneau), **Synchronisation** (ne tenir le rayon qu’au rythme des pulsations de l’Organisme : hors du rythme, il recule). Un nouveau motif d’attaque : l’attraction.
- **Ancrage.** Nouvelle amélioration de l’Artefact (4 niveaux). Elle retient les êtres trop grands pour la soute, puis des **astres** entiers : en orbite, en système et en galaxie, une zone conquise peut être emportée comme lune, anneau, station, étoile, géante gazeuse, comète, planète, nébuleuse, amas… Chaque astre donne un bonus permanent et prend place dans le ciel de l’Archive. Sur un monde, les zones conquises deviennent des **continents** (plus productifs que des territoires).
- **L’Archive dézoome jusqu’au bout.** La planète qu’elle est devenue, ses lunes et ses cataclysmes en orbite (la Baleine y nage), le système dont elle est le centre, la galaxie qui tourne autour d’elle… et, au rang Inconnue, ce qui la contient. Cette dernière échelle reste un mystère : on la voit, on ne l’explore pas.
- **Appels stratégiques** des dix géants cosmiques (séisme du monde, fleuves de magma, rempart, chant orbital, anneau de débris, chute de lune, éruption, envol du phénix, constellation, trou noir).
- 13 biomes de l’espace, 7 ressources (magma primordial, régolithe, éther, fer météorique, plasma, poussière d’étoiles, matière sombre), 9 objets d’équipement (dont la Combinaison du vide, qui améliore le contrôle en apesanteur, et l’Égide stellaire, qui protège des éruptions), 4 synergies, 6 fragments de récit, nouveaux niveaux pour la soute, les liens, le stabilisateur, le scanner et le rayon.
- Face à un être immense, la caméra recule. La cinématique de destruction montre l’échelle au-dessus de l’échelon visité (système, galaxie, puis… autre chose).
- Nouveaux tests (42 au total).

**Changements de règles à noter.**
- Le rang de l’Archive suppose désormais les rangs précédents (avant, seul comptait le plus haut rang dont les conditions étaient remplies ; en pratique, cela ne change rien pour les parties existantes).
- Les ressources laissées en quantité fractionnaire (par exemple 0,15 matière sombre) tombent désormais avec cette probabilité, au lieu d’être arrondies à 1. Aucune créature des versions précédentes n’est concernée.
- Le nom d’échelle affiché au dézoom correspond maintenant au seuil de l’échelle elle-même (avant, il était décalé d’un cran).

Sauvegarde : format 3. Les sauvegardes 0.10 sont migrées automatiquement (astres, destinations par échelon).

## 0.10.0 — Civilisations et morale

Certains mondes sont habités. Quand vous repartez, ils sont détruits avec leurs habitants, sauf si vous les emmenez.

- **Huit peuples.** Les Pâles, les Cendriers, les Rouages, les Mycéliens, les Nautes, les Chitinides, les Lithes et les Veilleurs du Seuil. Chacun a son apparence, son architecture, ses biomes, ses ressources préférées, ses noms et ses titres. Le scanner de l’Artefact signale les mondes habités (avec plus ou moins de précision).
- **Villages.** Une clairière, des maisons dans le style du peuple, des habitants qui vont et viennent, des gardes, et un chef à qui parler (E).
- **Huit attitudes.** Suppliants (ils demandent à partir), Fiers (ils refusent), Hostiles (ils attaquent ; vaincu, le chef se rend et l’on peut parlementer), Marchands (qui commercent… et dont certains sont des voleurs), Évadés (ils construisent une arche), Infiltrés (des saboteurs cachés parmi des suppliants), Dévots (ils vous prennent pour un dieu) et Iconoclastes (ils s’en prennent au portail pendant l’effondrement).
- **Choix.** Les rassembler près d’une plaque blanche et les protéger jusqu’au transfert, respecter leur refus, les convaincre avec des présents, les emmener de force (le rayon de capture fonctionne alors sur eux, et leur garde se bat), défendre leur arche jusqu’au décollage, ou la leur prendre. Emporter leur village coûte de la soute, mais ils seront plus heureux.
- **Soute.** Trois habitants par place, quatre places pour un village, six pour une arche.
- **Pendant l’effondrement.** Les habitants rassemblés courent vers le portail et embarquent en l’atteignant. Les marchands-voleurs se démasquent et plongent dans le portail avec une partie de la soute. Les iconoclastes attaquent le portail : son intégrité s’affiche, et à zéro le transfert devient une extraction d’urgence.
- **Peuples dans l’Archive.** Ils s’installent dans un territoire (de préférence un biome qu’ils connaissent), construisent leur village ou dressent des abris, et circulent. Leur humeur dépend du lieu, du voisinage (certains peuples ne se supportent pas), de leur village et de vos réponses. Heureux, ils travaillent (production du territoire), apportent un bonus propre (atelier, améliorations, soute, capture, points de vie, loyauté, production, savoir) et font des offrandes. Ils formulent des demandes ; on peut leur offrir des présents. Les emmenés de force font grève puis s’enfuient. Les infiltrés et les voleurs volent dans la réserve, jusqu’à ce qu’un éclaireur les démasque. Les dévots bâtissent un autel.
- **Mémoire des mondes.** Chaque choix compte : sauvés, partis par leurs propres moyens, emmenés de force, laissés dans un monde détruit, tués sans combattre, arches pillées. Votre réputation (L’Arche blanche, le Collecteur, le Fléau, le Dieu blanc, le Pilleur d’arches) modifie l’attitude des peuples que vous rencontrerez, et ce qu’ils vous disent. Un nouvel onglet **Peuples** de l’Artefact résume tout cela.
- Les compagnons ne s’en prennent plus aux habitants qui fuient. Un chef hostile affaibli se rend au lieu de fuir.
- Nouveaux tests (37 au total).

Sauvegarde : format 2, nouveaux champs ajoutés automatiquement.

## 0.9.0 — Créatures approfondies

Les créatures capturées ne sont plus de simples entrées de collection : elles grandissent, s’attachent, se reproduisent et servent concrètement en expédition.

- **Niveaux et expérience.** Les compagnons progressent en expédition (extraction, créatures vaincues) et, plus lentement, en vivant dans l’Archive. Chaque niveau augmente leur puissance et leur production.
- **Loyauté.** De « rebelle » à « dévouée ». Elle monte dans l’habitat d’origine, quand la créature est nourrie et quand l’expédition réussit. Elle baisse dans un habitat étranger, à côté d’un prédateur, ou après un échec. Une créature méfiante n’obéit pas toujours ; une rebelle refuse de partir.
- **Faim.** Prédateurs et gardiens mangent une ressource de la réserve (nourriture automatique, désactivable dans l’onglet Artefact). Affamé, un prédateur peut blesser une créature mineure de son territoire.
- **Évolution.** Douze évolutions d’espèce (par exemple Larvule → Ambrelle → Frelon d’ambre, Cendrin → Salamandre ardente) et deux stades pour toutes les autres (Aguerri, Ancien), visibles sur la créature.
- **Reproduction.** Deux adultes de la même espèce, fidèles et nourris, dans un territoire qui n’est pas plein, finissent par avoir un petit. Les variantes rares peuvent apparaître à la naissance.
- **Montures (R).** Les grands prédateurs et certains gardiens portent le joueur : plus rapides, ils encaissent les coups et chargent au clic droit. Les montures volantes ou résistantes ignorent les terrains dangereux. On peut aussi chevaucher dans l’Archive.
- **Capacités prêtées (Q, molette).** Chaque compagnon prête une capacité : arc électrique, soin, toile, ruée, séisme, carapace, entrave, regard, essaim… Dix-huit en tout.
- **Appels stratégiques (G).** Un ultra-boss resté dans l’Archive peut être appelé une fois par expédition.
- **Clés d’environnement et caveaux scellés.** Des poches fermées par des eaux profondes, des coulées ardentes, des gouffres, des ténèbres, des éboulis, des portes mortes, des sceaux cristallins ou des parois de chitine. Seul un compagnon possédant la bonne clé les ouvre. Ils cachent des ressources rares, des œufs, des créatures rares et des stèles. Le scanner les annonce.
- **Œufs.** Un œuf occupe une place de soute et éclot dans l’Archive, avec une créature très fidèle.
- **Compagnons perdus.** Quand le joueur tombe, les compagnons à terre ou éloignés restent dans le monde, qui n’est pas détruit : il est « en sursis » pendant trois expéditions. Une mission de sauvetage apparaît parmi les destinations. Sinon, il ne reste de la créature qu’une **essence**, qu’on peut réincarner ou absorber pour un bonus permanent.
- Fiche de créature refondue, journal de la vie de l’Archive, nouveaux tests (31).

**Changement de règle à noter.** En 0.8, après un échec, tous les compagnons revenaient blessés. Désormais, seuls ceux qui étaient à vos côtés reviennent (blessés) ; les autres restent dans le monde en sursis.

Sauvegarde : format 2. Les sauvegardes 0.8 sont migrées automatiquement.

## 0.8.0 — Première version

Boucle complète d’extraction (phases 1 à 8 du document de conception) : Archive, destinations procédurales, 20 biomes, 52 créatures, combat, capture, gardiens à phases, ultra-boss, effondrement, cinématique de destruction, territoires, production, synergies, atelier, améliorations, journal.
