// game.js - Ana oyun motoru ve başlangıç noktası

// Oyun konfigürasyonu
const gameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [BootScene, WorldScene, UIScene],
    pixelArt: true,
    roundPixels: true
};

let game;
let gameScene;
let gameUI;

// Oyunu başlat
function startGame(character) {
    // Oyun yüklendiyse yeniden başlat
    if (game) {
        game.destroy(true);
    }
    
    // Seçilen karakter bilgisi
    selectedCharacter = character;
    
    // Oyun başlatma öncesi hazırlık
    prepareGameStart().then(() => {
        // Phaser oyun örneği oluştur
        game = new Phaser.Game(gameConfig);
        
        // Pencere yeniden boyutlandırma olayı
        window.addEventListener('resize', () => {
            if (game) {
                game.scale.resize(window.innerWidth, window.innerHeight);
            }
        });
        
        // Oyundan çıkış olayları
        window.addEventListener('beforeunload', () => {
            leaveGame();
        });
    });
}

// Oyun başlatmadan önce hazırlık
async function prepareGameStart() {
    try {
        // Ağ bağlantısını başlat
        await initializeNetwork();
        
        // Karakterin sunucuda aktifleştirilmesi
        joinGame(selectedCharacter);
        
        // İlk durum güncelleme
        updateCharacterUI(selectedCharacter);
        
        return true;
    } catch (error) {
        console.error('Oyun başlatma hatası:', error);
        showErrorMessage('Sunucuya bağlanırken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.');
        return false;
    }
}

// Açılış ekranı - Kaynakları yükler
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Yükleme ekranı
        const loadingText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            'Yükleniyor...',
            { font: '20px Arial', fill: '#ffffff' }
        ).setOrigin(0.5);

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(
            this.cameras.main.width / 2 - 160,
            this.cameras.main.height / 2,
            320, 30
        );

        // Yükleme olayları
        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(
                this.cameras.main.width / 2 - 150,
                this.cameras.main.height / 2 + 5,
                300 * value, 20
            );
        }, this);

        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Oyun varlıklarını yükle

        // Tileset - Harita için
        this.load.image('tiles', 'assets/images/tilesets/terrain.png');
        
        // Karakter görünümleri
        this.load.spritesheet('warrior', 'assets/images/characters/warrior.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('archer', 'assets/images/characters/archer.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('mage', 'assets/images/characters/mage.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('priest', 'assets/images/characters/priest.png', { frameWidth: 64, frameHeight: 64 });
        
        // NPC'ler
        this.load.spritesheet('npcs', 'assets/images/characters/npcs.png', { frameWidth: 64, frameHeight: 64 });
        
        // Düşmanlar
        this.load.spritesheet('monsters', 'assets/images/characters/monsters.png', { frameWidth: 96, frameHeight: 96 });
        
        // Eşyalar
        this.load.spritesheet('items', 'assets/images/items/items.png', { frameWidth: 32, frameHeight: 32 });
        
        // Efektler
        this.load.spritesheet('effects', 'assets/images/effects/effects.png', { frameWidth: 128, frameHeight: 128 });
        
        // Arayüz
        this.load.image('ui-panel', 'assets/images/ui/panel.png');
        this.load.image('ui-button', 'assets/images/ui/button.png');
        this.load.image('ui-health', 'assets/images/ui/health_bar.png');
        this.load.image('ui-mana', 'assets/images/ui/mana_bar.png');
        
        // Harita
        this.load.tilemapTiledJSON('map', 'assets/maps/world.json');
    }

    create() {
        // Animasyonları oluştur
        this.createAnimations();
        
        // Bir sonraki sahneye geç
        this.scene.start('WorldScene');
    }
    
    createAnimations() {
        // Karakter animasyonları
        const characterTypes = ['warrior', 'archer', 'mage', 'priest'];
        const directions = ['down', 'left', 'right', 'up'];
        const actions = ['idle', 'walk', 'attack', 'hit'];
        
        characterTypes.forEach(type => {
            directions.forEach((direction, dirIndex) => {
                // Boşta durma animasyonu
                this.anims.create({
                    key: `${type}-idle-${direction}`,
                    frames: this.anims.generateFrameNumbers(type, { start: dirIndex * 4, end: dirIndex * 4 + 1 }),
                    frameRate: 2,
                    repeat: -1
                });
                
                // Yürüme animasyonu
                this.anims.create({
                    key: `${type}-walk-${direction}`,
                    frames: this.anims.generateFrameNumbers(type, { start: 16 + dirIndex * 4, end: 16 + dirIndex * 4 + 3 }),
                    frameRate: 8,
                    repeat: -1
                });
                
                // Saldırı animasyonu
                this.anims.create({
                    key: `${type}-attack-${direction}`,
                    frames: this.anims.generateFrameNumbers(type, { start: 32 + dirIndex * 4, end: 32 + dirIndex * 4 + 3 }),
                    frameRate: 12,
                    repeat: 0
                });
            });
        });
        
        // Efekt animasyonları
        this.anims.create({
            key: 'explosion',
            frames: this.anims.generateFrameNumbers('effects', { start: 0, end: 5 }),
            frameRate: 12,
            repeat: 0
        });
        
        this.anims.create({
            key: 'heal',
            frames: this.anims.generateFrameNumbers('effects', { start: 8, end: 13 }),
            frameRate: 12,
            repeat: 0
        });
    }
}

// Ana oyun dünyası
class WorldScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WorldScene' });
    }
    
    create() {
        // Referansı kaydet
        gameScene = this;
        
        // Haritayı oluştur
        this.createMap();
        
        // Oyuncuyu oluştur
        this.createPlayer();
        
        // Kamera ayarları
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        
        // UI sahnesini başlat
        this.scene.launch('UIScene');
        
        // Input olaylarını oluştur
        this.createInputEvents();
        
        // Canavarları ve NPC'leri oluştur
        this.createEntities();
        
        // Çarpışma grupları
        this.createColliders();
        
        // Dünya hazır sinyali gönder
        if (socket) {
            socket.emit('worldReady');
        }
    }
    
    createMap() {
        // Tilemap oluştur
        this.map = this.make.tilemap({ key: 'map' });
        
        // Tileset ekle
        const tileset = this.map.addTilesetImage('terrain', 'tiles');
        
        // Katmanları oluştur
        this.groundLayer = this.map.createLayer('Ground', tileset, 0, 0);
        this.objectsLayer = this.map.createLayer('Objects', tileset, 0, 0);
        this.aboveLayer = this.map.createLayer('Above', tileset, 0, 0);
        
        // Collision ayarları
        this.objectsLayer.setCollisionByProperty({ collides: true });
        this.aboveLayer.setDepth(10);
    }
    
    createPlayer() {
        // Oyuncu pozisyonu
        const playerPos = selectedCharacter.position;
        
        // Oyuncu sprite'ını oluştur
        this.player = this.physics.add.sprite(playerPos.x, playerPos.y, selectedCharacter.class);
        this.player.setSize(32, 32);
        this.player.setOffset(16, 32);
        this.player.direction = 'down';
        this.player.isAttacking = false;
        
        // Animasyonu başlat
        this.player.anims.play(`${selectedCharacter.class}-idle-down`);
    }
    
    createInputEvents() {
        // Yön tuşları
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Saldırı tuşu
        this.input.keyboard.on('keydown-SPACE', () => {
            this.playerAttack();
        });
        
        // Skill kullanma tuşları (1-8)
        for(let i = 1; i <= 8; i++) {
            this.input.keyboard.on(`keydown-${i}`, () => {
                this.useSkill(i);
            });
        }
        
        // Sağ tık ile hareket
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                this.moveToPoint(worldPoint.x, worldPoint.y);
            }
        });
    }
    
    createEntities() {
        // Düşman ve NPC grupları
        this.npcs = this.physics.add.group();
        this.monsters = this.physics.add.group();
        this.items = this.physics.add.group();
        this.players = this.physics.add.group();
        
        // Dünya durumuna göre oluştur
        this.updateFromState(gameState);
    }
    
    createColliders() {
        // Oyuncu ile harita çarpışmaları
        this.physics.add.collider(this.player, this.objectsLayer);
        
        // Oyuncu ile NPC çarpışmaları
        this.physics.add.collider(this.player, this.npcs);
        
        // Oyuncu ile düşman çarpışmaları
        this.physics.add.collider(this.player, this.monsters);
        
        // Oyuncu ile diğer oyuncular
        this.physics.add.collider(this.player, this.players);
        
        // Eşya toplama için overlap
        this.physics.add.overlap(this.player, this.items, this.collectItem, null, this);
        
        // NPC etkileşimi için overlap
        this.physics.add.overlap(this.player, this.npcs, this.interactWithNPC, null, this);
    }
    
    update(time, delta) {
        // Oyuncu hareketi
        this.handlePlayerMovement();
        
        // Karakter pozisyonunu güncelle
        this.updatePlayerPosition();
        
        // Dünya nesnelerini güncelle
        this.updateEntities();
    }
    
    handlePlayerMovement() {
        // Saldırı sırasında hareket etme
        if (this.player.isAttacking) return;
        
        // Yön belirleme
        let moving = false;
        let dirX = 0;
        let dirY = 0;
        
        if (this.cursors.left.isDown) {
            dirX = -1;
            this.player.direction = 'left';
            moving = true;
        } else if (this.cursors.right.isDown) {
            dirX = 1;
            this.player.direction = 'right';
            moving = true;
        }
        
        if (this.cursors.up.isDown) {
            dirY = -1;
            this.player.direction = 'up';
            moving = true;
        } else if (this.cursors.down.isDown) {
            dirY = 1;
            this.player.direction = 'down';
            moving = true;
        }
        
        // Çapraz hareket için normalize etme
        if (dirX !== 0 && dirY !== 0) {
            dirX *= 0.7071;
            dirY *= 0.7071;
        }
        
        // Oyuncu hızı
        const speed = 160;
        this.player.setVelocity(dirX * speed, dirY * speed);
        
        // Animasyon güncelleme
        if (moving) {
            this.player.anims.play(`${selectedCharacter.class}-walk-${this.player.direction}`, true);
        } else {
            this.player.anims.play(`${selectedCharacter.class}-idle-${this.player.direction}`, true);
            this.player.setVelocity(0, 0);
        }
    }
    
    updatePlayerPosition() {
        // Pozisyon değişti mi kontrol et ve sunucuya bildir
        if (this.lastX !== this.player.x || this.lastY !== this.player.y) {
            this.lastX = this.player.x;
            this.lastY = this.player.y;
            
            //