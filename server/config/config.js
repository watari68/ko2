module.exports = {
  dbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/knight-web-rpg',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiration: 86400, // 24 hours
  initialPlayerStats: {
    health: 100,
    mana: 50,
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    experience: 0,
    level: 1
  },
  worldConfig: {
    width: 5000,
    height: 5000,
    zones: [
      { id: 'starter', name: 'Başlangıç Bölgesi', minLevel: 1, maxLevel: 10 },
      { id: 'forest', name: 'Mistik Orman', minLevel: 5, maxLevel: 15 },
      { id: 'desert', name: 'Çöl Toprakları', minLevel: 10, maxLevel: 25 },
      { id: 'mountain', name: 'Ejder Dağları', minLevel: 20, maxLevel: 35 },
      { id: 'castle', name: 'Karanlık Kale', minLevel: 30, maxLevel: 50 }
    ]
  }
};