const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  class: {
    type: String,
    enum: ['warrior', 'archer', 'mage', 'priest'],
    required: true
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  stats: {
    health: { type: Number, default: 100 },
    mana: { type: Number, default: 50 },
    strength: { type: Number, default: 10 },
    dexterity: { type: Number, default: 10 },
    intelligence: { type: Number, default: 10 }
  },
  position: {
    x: { type: Number, default: 500 },
    y: { type: Number, default: 500 },
    zone: { type: String, default: 'starter' }
  },
  equipment: {
    weapon: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    armor: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    helmet: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    shield: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    boots: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    gloves: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    ring: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    necklace: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null }
  },
  inventory: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, default: 1 },
    slot: { type: Number, required: true }
  }],
  skills: [{
    id: { type: String, required: true },
    level: { type: Number, default: 1 },
    cooldown: { type: Number, default: 0 }
  }],
  gold: {
    type: Number,
    default: 100
  },
  quests: [{
    questId: { type: String, required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    progress: { type: Object, default: {} }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastPlayed: {
    type: Date,
    default: Date.now
  }
});

// Calculate experience needed for next level
characterSchema.methods.experienceToNextLevel = function() {
  return Math.floor(100 * Math.pow(1.5, this.level - 1));
};

// Level up method
characterSchema.methods.levelUp = function() {
  const expNeeded = this.experienceToNextLevel();
  
  if (this.experience >= expNeeded) {
    this.experience -= expNeeded;
    this.level += 1;
    
    // Increase stats based on character class
    switch (this.class) {
      case 'warrior':
        this.stats.strength += 3;
        this.stats.health += 15;
        this.stats.dexterity += 1;
        break;
      case 'archer':
        this.stats.dexterity += 3;
        this.stats.health += 10;
        this.stats.strength += 1;
        break;
      case 'mage':
        this.stats.intelligence += 3;
        this.stats.mana += 15;
        this.stats.health += 5;
        break;
      case 'priest':
        this.stats.intelligence += 2;
        this.stats.health += 8;
        this.stats.mana += 10;
        break;
    }
    
    return true;
  }
  
  return false;
};

const Character = mongoose.model('Character', characterSchema);
module.exports = Character;