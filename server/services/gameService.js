const Character = require('../models/character.model');
const Item = require('../models/item.model');
const Quest = require('../models/quest.model');
const combatSystem = require('./combatSystem');

// Cache for frequent data lookups
const itemCache = {};
const questCache = {};

// Load data to cache on server start
async function loadGameData() {
  try {
    const items = await Item.find({});
    items.forEach(item => {