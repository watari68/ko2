const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    enum: ['kill', 'gather', 'escort', 'deliver'],
    required: true
  },
  objectives: [{
    type: { type: String, enum: ['kill', 'gather', 'talk', 'reach'] },
    targetId: { type: String },
    targetName: { type: String },
    count: { type: Number, default: 1 },
    zoneId: { type: String }
  }],
  rewards: {
    experience: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    items: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
      quantity: { type: Number, default: 1 }
    }]
  },
  prerequisite: {
    level: { type: Number, default: 1 },
    quests: [{ type: String, ref: 'Quest.id' }]
  },
  nextQuest: { type: String, ref: 'Quest.id', default: null }
});

const Quest = mongoose.model('Quest', questSchema);
module.exports = Quest;