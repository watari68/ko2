// server/models/Character.js - Karakter modeli

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Karakter şeması
const CharacterSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
        default: 0,
        min: 0
    },
    gold: {
        type: Number,
        default: 0,
        min: 0
    },
    stats: {
        strength: { type: Number, default: 5 },
        dexterity: { type: Number, default: 5 },
        intelligence: { type: Number, default: 5 },
        vitality: { type: Number, default: 5 },
        health: { type: Number, default: 100 },
        currentHealth: { type: Number, default: 100 },
        mana: { type: Number, default: 50 },
        currentMana: { type: Number, default: 50 }
    },
    position: {
        x: { type: Number, default: 300 },
        y: { type: Number, default: 300 },
        map: { type: String, default: 'world' }
    },
    inventory: [{
        item: {
            type: Schema.Types.ObjectId,
            ref: 'Item'
        },
        slot: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }],
    equipment: {
        weapon: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        helmet: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        armor: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        boots: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        gloves: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        shield: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        necklace: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        ring1: { type: Schema.Types.ObjectId, ref: 'Item', default: null },
        ring2: { type: Schema.Types.ObjectId, ref: 'Item', default: null }
    },
    skills: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        level: { type: Number, default: 1 },
        cooldown: { type: Number, required: true },
        cooldownRemaining: { type: Number, default: 0 },
        manaCost: { type: Number, required: true },
        damage: { type: Number, default: 0 },
        effectType: { type: String, default: null },
        duration: { type: Number, default: 0 },
        targetType: { type: String, required: true, enum: ['single', 'area', 'self'] },
        range: { type: Number, default: 0 },
        description: { type: String, required: true }
    }],
    quests: {
        active: [{
            type: Schema.Types.ObjectId,
            ref: 'Quest'
        }],
        completed: [{
            type: Schema.Types.ObjectId,
            ref: 'Quest',
            _id: false,
            completedAt: { type: Date, default: Date.now }
        }],
        available: [{
            type: Schema.Types.ObjectId,
            ref: 'Quest'
        }]
    },
    lastPlayed: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Level'a göre stat'ları güncelleme metodu
CharacterSchema.methods.updateStatsForLevel = function() {
    // Her sınıfın temel stat artışları
    const statIncreases = {
        warrior: {
            strength: 2.5,
            dexterity: 1.5,
            intelligence: 0.5,
            vitality: 2.5,
            health: 25,
            mana: 5
        },
        archer: {
            strength: 1.5,
            dexterity: 2.5,
            intelligence: 1.0,
            vitality: 1.5,
            health: 18,
            mana: 10
        },
        mage: {
            strength: 0.5,
            dexterity: 1.0,
            intelligence: 3.0,
            vitality: 1.0,
            health: 12,
            mana: 25
        },
        priest: {
            strength: 1.0,
            dexterity: 1.0,
            intelligence: 2.5,
            vitality: 1.5,
            health: 15,
            mana: 20
        }
    };
    
    // Temel statlar (seviye 1 için)
    const baseStats = {
        warrior: {
            strength: 8,
            dexterity: 5,
            intelligence: 3,
            vitality: 9,
            health: 150,
            mana: 50
        },
        archer: {
            strength: 5,
            dexterity: 8,
            intelligence: 4,
            vitality: 6,
            health: 120,
            mana: 70
        },
        mage: {
            strength: 3,
            dexterity: 4,
            intelligence: 9,
            vitality: 4,
            health: 100,
            mana: 150
        },
        priest: {
            strength: 4,
            dexterity: 5,
            intelligence: 7,
            vitality: 7,
            health: 110,
            mana: 120
        }
    };
    
    // Sınıfa göre değerleri hesapla
    const characterClass = this.class;
    const level = this.level - 1; // Seviye 1 için artış 0
    
    // Her özellik için temel değeri hesapla
    this.stats.strength = Math.floor(baseStats[characterClass].strength + (statIncreases[characterClass].strength * level));
    this.stats.dexterity = Math.floor(baseStats[characterClass].dexterity + (statIncreases[characterClass].dexterity * level));
    this.stats.intelligence = Math.floor(baseStats[characterClass].intelligence + (statIncreases[characterClass].intelligence * level));
    this.stats.vitality = Math.floor(baseStats[characterClass].vitality + (statIncreases[characterClass].vitality * level));
    
    // Can ve mana hesapla
    this.stats.health = Math.floor(baseStats[characterClass].health + (statIncreases[characterClass].health * level) + (this.stats.vitality * 5));
    this.stats.mana = Math.floor(baseStats[characterClass].mana + (statIncreases[characterClass].mana * level) + (this.stats.intelligence * 3));
    
    // Eğer mevcut can ve mana değerleri yoksa, maksimum değere ayarla
    if (!this.stats.currentHealth || this.stats.currentHealth > this.stats.health) {
        this.stats.currentHealth = this.stats.health;
    }
    
    if (!this.stats.currentMana || this.stats.currentMana > this.stats.mana) {
        this.stats.currentMana = this.stats.mana;
    }
};

// XP ekle ve gerekirse level atla
CharacterSchema.methods.addExperience = function(exp) {
    this.experience += exp;
    
    let leveledUp = false;
    let newSkills = [];
    
    // Seviye atlama kontrolü
    while (this.experience >= this.getXPForNextLevel()) {
        this.level++;
        leveledUp = true;
        
        // Stats'ları güncelle
        this.updateStatsForLevel();
        
        // Yeni seviyede açılan yetenekleri kontrol et
        const unlockedSkills = this.getUnlockedSkillsForLevel();
        if (unlockedSkills.length > 0) {
            this.skills.push(...unlockedSkills);
            newSkills.push(...unlockedSkills);
        }
    }
    
    return {
        leveledUp,
        newLevel: this.level,
        newSkills
    };
};

// Sonraki seviye için gereken XP miktarı
CharacterSchema.methods.getXPForNextLevel = function() {
    // Basit üstel XP formülü
    return Math.floor(100 * Math.pow(1.5, this.level - 1));
};

// Belirli bir seviyede açılan yetenekler
CharacterSchema.methods.getUnlockedSkillsForLevel = function() {
    // Her sınıf için level bazlı yetenekler
    const skillsByClass = {
        warrior: [
            { level: 1, id: 'slash', name: 'Slash', cooldown: 3, manaCost: 5, damage: 15, targetType: 'single', range: 50, description: 'Basit bir kılıç saldırısı.' },
            { level: 5, id: 'charge', name: 'Charge', cooldown: 10, manaCost: 10, damage: 20, effectType: 'movement', targetType: 'single', range: 200, description: 'Hedefe doğru hızla ilerleyip vurur.' },
            { level: 10, id: 'whirlwind', name: 'Whirlwind', cooldown: 15, manaCost: 20, damage: 30, effectType: 'aoe', targetType: 'area', range: 100, description: 'Etrafındaki tüm düşmanlara hasar verir.' }
        ],
        archer: [
            { level: 1, id: 'quickshot', name: 'Quick Shot', cooldown: 2, manaCost: 5, damage: 12, targetType: 'single', range: 300, description: 'Hızlı bir ok atışı.' },
            { level: 5, id: 'poisonarrow', name: 'Poison Arrow', cooldown: 12, manaCost: 15, damage: 10, effectType: 'poison', duration: 5, targetType: 'single', range: 250, description: 'Zehirli ok ile sürekli hasar verir.' },
            { level: 10, id: 'volley', name: 'Arrow Volley', cooldown: 20, manaCost: 25, damage: 40, effectType: 'aoe', targetType: 'area', range: 200, description: 'Belirtilen alana ok yağmuru yağdırır.' }
        ],
        mage: [
            { level: 1, id: 'fireball', name: 'Fireball', cooldown: 3, manaCost: 10, damage: 18, targetType: 'single', range: 250, description: 'Ateş topu fırlatır.' },
            { level: 5, id: 'frostnova', name: 'Frost Nova', cooldown: 10, manaCost: 20, damage: 15, effectType: 'freeze', duration: 3, targetType: 'area', range: 150, description: 'Etrafındaki düşmanları dondurur.' },
            { level: 10, id: 'meteorstrike', name: 'Meteor Strike', cooldown: 30, manaCost: 40, damage: 60, effectType: 'aoe', targetType: 'area', range: 300, description: 'Belirtilen alana meteor düşürür.' }
        ],
        priest: [
            { level: 1, id: 'heal', name: 'Heal', cooldown: 5, manaCost: 15, damage: -20, effectType: 'heal', targetType: 'single', range: 200, description: 'Hedefi iyileştirir.' },
            { level: 5, id: 'smite', name: 'Smite', cooldown: 4, manaCost: 10, damage: 12, effectType: 'holy', targetType: 'single', range: 200, description: 'Kutsal ışıkla düşmana hasar verir.' },
            { level: 10, id: 'divineaura', name: 'Divine Aura', cooldown: 25, manaCost: 30, effectType: 'buff', duration: 10, targetType: 'self', description: 'Kutsal aura ile kendini korur ve hızlı iyileşme sağlar.' }
        ]
    };
    
    // Bu seviyede açılan yetenekleri bul
    const unlockedSkills = skillsByClass[this.class].filter(skill => skill.level === this.level);
    
    // Kullanıcının henüz sahip olmadığı yeni yetenekleri döndür
    const existingSkillIds = this.skills.map(s => s.id);
    return unlockedSkills.filter(skill => !existingSkillIds.includes(skill.id));
};

// Ekipman değiştirme metodu
CharacterSchema.methods.equipItem = function(itemId, slotIndex) {
    // Envanterden eşya bilgisini al
    const inventoryItem = this.inventory.find(item => 
        item.item.toString() === itemId && item.slot === slotIndex
    );
    
    if (!inventoryItem) {
        throw new Error('Eşya bulunamadı');
    }
    
    // Eşya bilgisini al (populate edilmiş olmalı)
    const item = inventoryItem.item;
    
    // Eşyanın tipine göre ekipman slotunu belirle
    let equipSlot = '';
    switch (item.type) {
        case 'weapon': equipSlot = 'weapon'; break;
        case 'helmet': equipSlot = 'helmet'; break;
        case 'armor': equipSlot = 'armor'; break;
        case 'boots': equipSlot = 'boots'; break;
        case 'gloves': equipSlot = 'gloves'; break;
        case 'shield': equipSlot = 'shield'; break;
        case 'necklace': equipSlot = 'necklace'; break;
        case 'ring':
           
