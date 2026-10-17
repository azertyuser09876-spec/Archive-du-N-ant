/* Ressources : données pures. La valeur dépend de la rareté. */
(function () {
  'use strict';
  const D = window.AN.Data;

  D.RARITY = [
    { id: 0, name: 'Commune', value: 4 },
    { id: 1, name: 'Rare', value: 18 },
    { id: 2, name: 'Exotique', value: 80 },
  ];

  // icon : forme dessinée par le moteur (voir render/icons.js)
  D.RESOURCES = {
    fibre:      { name: 'Fibre', rarity: 0, color: '#8a9a3c', icon: 'strand' },
    spore:      { name: 'Spores', rarity: 0, color: '#9b7fd4', icon: 'dots' },
    seve:       { name: 'Sève', rarity: 0, color: '#4fa864', icon: 'drop' },
    etincelle:  { name: 'Étincelle', rarity: 0, color: '#e2bf1e', icon: 'spark' },
    ferraille:  { name: 'Ferraille', rarity: 0, color: '#8b7d6b', icon: 'ingot' },
    rouage:     { name: 'Rouage ancien', rarity: 1, color: '#b8863b', icon: 'gear' },
    os:         { name: 'Os', rarity: 0, color: '#cfc4a6', icon: 'bone' },
    verre:      { name: 'Sable vitreux', rarity: 0, color: '#7fc2c6', icon: 'shard' },
    cristal:    { name: 'Cristal', rarity: 1, color: '#4fb6e8', icon: 'gem' },
    minerai:    { name: 'Minerai', rarity: 0, color: '#7c8691', icon: 'rock' },
    perle:      { name: 'Perle', rarity: 1, color: '#cfc6e8', icon: 'pearl' },
    corail:     { name: 'Corail', rarity: 0, color: '#e8796a', icon: 'branch' },
    braise:     { name: 'Braise', rarity: 0, color: '#e8582a', icon: 'flame' },
    obsidienne: { name: 'Obsidienne', rarity: 1, color: '#4a3b60', icon: 'shard' },
    givre:      { name: 'Givre éternel', rarity: 0, color: '#8cc6ea', icon: 'flake' },
    ambre:      { name: 'Ambre', rarity: 1, color: '#e0952a', icon: 'gem' },
    pollen:     { name: 'Pollen', rarity: 0, color: '#e6c23a', icon: 'dots' },
    acide:      { name: 'Acide', rarity: 0, color: '#a6cc2a', icon: 'drop' },
    chitine:    { name: 'Chitine', rarity: 0, color: '#7a6440', icon: 'scale' },
    membrane:   { name: 'Membrane', rarity: 0, color: '#d06a80', icon: 'cell' },
    encre:      { name: 'Encre abyssale', rarity: 1, color: '#2e3f86', icon: 'drop' },
    ecaille:    { name: 'Écaille', rarity: 0, color: '#4c8c7c', icon: 'scale' },
    neant:      { name: 'Éclat de néant', rarity: 2, color: '#b8bcc8', icon: 'void' },
    essence:    { name: 'Essence de gardien', rarity: 2, color: '#6a4cf0', icon: 'orb' },
    noyau:      { name: 'Noyau d’ultra', rarity: 2, color: '#e83a5c', icon: 'orb' },
  };

  D.resValue = (id) => {
    const r = D.RESOURCES[id];
    return r ? D.RARITY[r.rarity].value : 0;
  };
})();
