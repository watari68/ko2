const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['weapon', 'armor', 'helmet', 'shield', 'boots', 'gloves', 'ring', 'necklace', 'consumable', 'material'],
    required: true
  },
  subtype: {
    type: String,
    enum: ['sword', 'bow', 'staff', 'hammer', 'cloth', 'leather', 'mail', 'plate', 'potion', 'scroll', 'quest', 'misc']
  },
  requiredLevel: {
    type: Number,
    default: 1
  },
  requiredClass: [{
    type: String,
    enum: ['warrior', 'archer', 'mage', 'priest', 'all']
  }],
  stats: {
    attack: { type: Number, default: 0 },
    defense: { type: Number, default: 0 },
    health: { type: Number, default: 0 },
    mana: { type: Number, default: 0 },
    strength: { type: Number, default: 0 },
    dexterity: { type: Number, default: 0 },
    intelligence: { type: Number, default: 0 }
  },
  effects: [{
    type: { type: String },
    value: { type: Number },
    duration: { type: Number }
  }],
  value: {
    type: Number,
    default: 0
  },
  dropRate: {
    type: Number,
    default: 0.01,
    min: 0,
    max: 1
  },
  stackable: {
    type: Boolean,
    default: false
  },
  maxStack: {
    type: Number,
    default: 1
  },
  description: {
    type: String,
    default: ''
  },
  iconUrl: {
    type: String,
    default: ''
  },
  modelUrl: {
    type: String,
    default: ''
  }
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;