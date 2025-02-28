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
            
            // Karakter pozisyonunu güncelle
            selectedCharacter.position = {
                x: this.player.x,
                y: this.player.y
            };
            
            // Hareket bilgisini sunucuya gönder
            sendPlayerMovement(
                { x: this.player.x, y: this.player.y },
                this.player.direction,
                this.player.anims.isPlaying && this.player.anims.currentAnim.key.includes('walk')
            );
        }
    }
    
    playerAttack() {
        if (this.player.isAttacking) return;
        
        // Saldırı animasyonu başlat
        this.player.isAttacking = true;
        this.player.anims.play(`${selectedCharacter.class}-attack-${this.player.direction}`, true);
        
        // Saldırı alanı
        const attackRange = 50;
        let targetX = this.player.x;
        let targetY = this.player.y;
        
        // Saldırı yönüne göre hedef bölgeyi belirle
        switch (this.player.direction) {
            case 'left': targetX -= attackRange; break;
            case 'right': targetX += attackRange; break;
            case 'up': targetY -= attackRange; break;
            case 'down': targetY += attackRange; break;
        }
        
        // Saldırı efektini göster
        this.addEffect('slash', targetX, targetY);
        
        // Yakındaki düşmanları bul
        let nearestTarget = null;
        let shortestDistance = attackRange;
        
        this.monsters.getChildren().forEach(monster => {
            const distance = Phaser.Math.Distance.Between(
                targetX, targetY, monster.x, monster.y
            );
            
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestTarget = monster;
            }
        });
        
        // Hedef varsa saldır
        if (nearestTarget) {
            sendCombatAction('attack', nearestTarget.id);
        }
        
        // Animasyon bittiğinde saldırı durumunu sıfırla
        this.time.delayedCall(400, () => {
            this.player.isAttacking = false;
        });
    }
    
    useSkill(skillIndex) {
        // Yetenek kullanımı için hazır değilse
        if (this.player.isAttacking) return;
        
        // Karakter yeteneklerini kontrol et
        if (!selectedCharacter.skills || !selectedCharacter.skills[skillIndex - 1]) {
            addSystemMessage('Bu yetenek slotu boş.');
            return;
        }
        
        const skill = selectedCharacter.skills[skillIndex - 1];
        
        // Yetenek cooldown kontrolü
        if (skill.cooldownRemaining > 0) {
            addSystemMessage(`${skill.name} henüz hazır değil. (${skill.cooldownRemaining} saniye kaldı)`);
            return;
        }
        
        // Yetenek mana kontrolü
        if (selectedCharacter.stats.currentMana < skill.manaCost) {
            addSystemMessage('Yeterli manan yok!');
            return;
        }
        
        // Yetenek tipine göre hedefleme
        if (skill.targetType === 'single') {
            // Fare ile seçilen hedef
            const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);

            // Yakındaki hedefi bul (oyuncu, NPC veya düşman)
            let targetId = null;
            let targetType = null;
            let shortestDistance = 100; // Maksimum mesafe
            
            // Düşmanları kontrol et
            this.monsters.getChildren().forEach(monster => {
                const distance = Phaser.Math.Distance.Between(
                    worldPoint.x, worldPoint.y, monster.x, monster.y
                );
                
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    targetId = monster.id;
                    targetType = 'mob';
                }
            });
            
            // NPC'leri kontrol et
            this.npcs.getChildren().forEach(npc => {
                const distance = Phaser.Math.Distance.Between(
                    worldPoint.x, worldPoint.y, npc.x, npc.y
                );
                
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    targetId = npc.id;
                    targetType = 'npc';
                }
            });
            
            // Diğer oyuncuları kontrol et
            this.players.getChildren().forEach(player => {
                const distance = Phaser.Math.Distance.Between(
                    worldPoint.x, worldPoint.y, player.x, player.y
                );
                
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    targetId = player.id;
                    targetType = 'player';
                }
            });
            
            // Hedef bulunduysa yeteneği kullan
            if (targetId) {
                sendCombatAction('useSkill', targetId, skill.id);
                
                // Yetenek animasyonu
                this.player.anims.play(`${selectedCharacter.class}-attack-${this.player.direction}`, true);
                this.player.isAttacking = true;
                
                // Yetenek efektini göster
                this.addEffect(skill.effectType || 'magic', worldPoint.x, worldPoint.y);
                
                // Animasyon bittiğinde saldırı durumunu sıfırla
                this.time.delayedCall(400, () => {
                    this.player.isAttacking = false;
                });
            } else {
                addSystemMessage('Geçerli bir hedef seçmelisin.');
            }
        } else if (skill.targetType === 'area') {
            // Alan hedefli yetenek
            const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);
            
            // Yeteneği kullan
            sendCombatAction('useAreaSkill', null, skill.id, {
                x: worldPoint.x,
                y: worldPoint.y
            });
            
            // Yetenek animasyonu
            this.player.anims.play(`${selectedCharacter.class}-attack-${this.player.direction}`, true);
            this.player.isAttacking = true;
            
            // Yetenek efektini göster
            this.addEffect(skill.effectType || 'aoe', worldPoint.x, worldPoint.y);
            
            // Animasyon bittiğinde saldırı durumunu sıfırla
            this.time.delayedCall(400, () => {
                this.player.isAttacking = false;
            });
        } else if (skill.targetType === 'self') {
            // Kendine kullanılan yetenek
            sendCombatAction('useSelfSkill', null, skill.id);
            
            // Yetenek animasyonu
            this.player.anims.play(`${selectedCharacter.class}-attack-${this.player.direction}`, true);
            this.player.isAttacking = true;
            
            // Yetenek efektini göster
            this.addEffect(skill.effectType || 'buff', this.player.x, this.player.y);
            
            // Animasyon bittiğinde saldırı durumunu sıfırla
            this.time.delayedCall(400, () => {
                this.player.isAttacking = false;
            });
        }
    }
    
    moveToPoint(x, y) {
        // Hareket edebiliyorsa
        if (this.player.isAttacking) return;
        
        // A* path bulma
        const fromX = Math.floor(this.player.x / 32);
        const fromY = Math.floor(this.player.y / 32);
        const toX = Math.floor(x / 32);
        const toY = Math.floor(y / 32);
        
        // Eğer A* path bulma aktifse kullan
        if (this.pathfinding) {
            this.findPath(fromX, fromY, toX, toY).then(path => {
                if (path && path.length > 0) {
                    this.followPath(path);
                }
            });
        } else {
            // Basit doğrudan hareket
            this.physics.moveTo(this.player, x, y, 160);
            
            // Hareket yönünü belirle
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
            
            if (Math.abs(angle) < 0.8) {
                this.player.direction = 'right';
            } else if (Math.abs(angle) > 2.4) {
                this.player.direction = 'left';
            } else if (angle > 0) {
                this.player.direction = 'down';
            } else {
                this.player.direction = 'up';
            }
            
            // Animasyon
            this.player.anims.play(`${selectedCharacter.class}-walk-${this.player.direction}`, true);
            
            // Hedefe ulaşınca dur
            this.time.addEvent({
                delay: 100,
                callback: () => {
                    const distance = Phaser.Math.Distance.Between(
                        this.player.x, this.player.y, x, y
                    );
                    
                    if (distance < 5) {
                        this.player.setVelocity(0, 0);
                        this.player.anims.play(`${selectedCharacter.class}-idle-${this.player.direction}`, true);
                    }
                },
                loop: true
            });
        }
    }
    
    async findPath(fromX, fromY, toX, toY) {
        // Basit grid-tabanlı A* path bulma
        // Not: Gerçek projede daha gelişmiş bir A* veya Navmesh kullanabilirsiniz
        const grid = [];
        
        // Harita grid'ini oluştur
        for (let y = 0; y < this.map.height; y++) {
            grid[y] = [];
            for (let x = 0; x < this.map.width; x++) {
                grid[y][x] = this.objectsLayer.getTileAt(x, y) ? 1 : 0;
            }
        }
        
        // Easystar.js, Pathfinding.js gibi bir kütüphane kullanılabilir
        // Burada varsayımsal bir API kullanıyoruz
        return new Promise(resolve => {
            // Gerçek implementasyon burada olacak
            resolve([{x: toX, y: toY}]);
        });
    }
    
    followPath(path) {
        // Path üzerindeki her noktaya hareket et
        let currentIndex = 0;
        
        const moveNext = () => {
            if (currentIndex >= path.length) {
                return;
            }
            
            const point = path[currentIndex];
            const x = point.x * 32 + 16;
            const y = point.y * 32 + 16;
            
            this.physics.moveTo(this.player, x, y, 160);
            
            // Hareket yönünü belirle
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
            
            if (Math.abs(angle) < 0.8) {
                this.player.direction = 'right';
            } else if (Math.abs(angle) > 2.4) {
                this.player.direction = 'left';
            } else if (angle > 0) {
                this.player.direction = 'down';
            } else {
                this.player.direction = 'up';
            }
            
            // Animasyon
            this.player.anims.play(`${selectedCharacter.class}-walk-${this.player.direction}`, true);
            
            // Sonraki noktaya ulaşınca kontrol et
            this.time.addEvent({
                delay: 100,
                callback: () => {
                    const distance = Phaser.Math.Distance.Between(
                        this.player.x, this.player.y, x, y
                    );
                    
                    if (distance < 5) {
                        currentIndex++;
                        
                        if (currentIndex >= path.length) {
                            this.player.setVelocity(0, 0);
                            this.player.anims.play(`${selectedCharacter.class}-idle-${this.player.direction}`, true);
                        } else {
                            moveNext();
                        }
                    }
                },
                loop: true
            });
        };
        
        moveNext();
    }
    
    collectItem(player, item) {
        // Eşya toplama etkileşimi
        if (item.canCollect) {
            sendInteraction('collectItem', item.id);
        }
    }
    
    interactWithNPC(player, npc) {
        // NPC etkileşimi
        if (npc.canInteract && !this.player.isAttacking) {
            // E tuşuyla etkileşime geç
            this.input.keyboard.once('keydown-E', () => {
                sendInteraction('talkToNPC', npc.id);
            });
            
            // Etkileşim göstergesini göster
            if (!npc.interactIndicator) {
                npc.interactIndicator = this.add.sprite(npc.x, npc.y - 50, 'ui-button');
                npc.interactIndicator.setScale(0.5);
                npc.interactIndicator.setAlpha(0.8);
                
                // E harfi ekle
                const style = { fontSize: '20px', fill: '#fff' };
                npc.interactText = this.add.text(npc.x, npc.y - 50, 'E', style);
                npc.interactText.setOrigin(0.5);
            }
        }
    }
    
    updateEntities() {
        // Diğer oyuncuları güncelle
        Object.values(gameState.players).forEach(playerData => {
            if (playerData.id === selectedCharacter._id) return; // Kendimizi atlıyoruz
            
            // Bu oyuncu için sprite var mı?
            let playerSprite = this.players.getChildren().find(p => p.id === playerData.id);
            
            if (!playerSprite) {
                // Yeni oyuncu sprite'ı oluştur
                playerSprite = this.physics.add.sprite(playerData.position.x, playerData.position.y, playerData.class);
                playerSprite.id = playerData.id;
                playerSprite.setSize(32, 32);
                playerSprite.setOffset(16, 32);
                this.players.add(playerSprite);
                
                 // İsim etiketi oluştur
                const nameText = this.add.text(playerData.position.x, playerData.position.y - 40, playerData.name, { 
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    fill: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 3
                });
                nameText.setOrigin(0.5);
                playerSprite.nameText = nameText;
            }
            
            // Oyuncu pozisyonunu güncelle
            playerSprite.x = playerData.position.x;
            playerSprite.y = playerData.position.y;
            playerSprite.nameText.x = playerData.position.x;
            playerSprite.nameText.y = playerData.position.y - 40;
            
            // Animasyonu güncelle
            if (playerData.isMoving) {
                playerSprite.anims.play(`${playerData.class}-walk-${playerData.direction}`, true);
            } else {
                playerSprite.anims.play(`${playerData.class}-idle-${playerData.direction}`, true);
            }
        });
        
        // Canavarları güncelle
        Object.values(gameState.mobs).forEach(mobData => {
            let mobSprite = this.monsters.getChildren().find(m => m.id === mobData.id);
            
            if (!mobSprite) {
                // Yeni canavar sprite'ı oluştur
                mobSprite = this.physics.add.sprite(mobData.position.x, mobData.position.y, 'monsters');
                mobSprite.id = mobData.id;
                mobSprite.setSize(48, 48);
                mobSprite.setOffset(24, 48);
                this.monsters.add(mobSprite);
                
                // Canavar frame'ini ayarla
                mobSprite.setFrame(mobData.spriteIndex);
                
                // Sağlık çubuğu oluştur
                const healthBarBg = this.add.rectangle(mobData.position.x, mobData.position.y - 30, 60, 8, 0x000000);
                healthBarBg.setAlpha(0.7);
                const healthBar = this.add.rectangle(mobData.position.x - 30, mobData.position.y - 30, 60, 8, 0xff0000);
                healthBar.setOrigin(0, 0.5);
                
                mobSprite.healthBarBg = healthBarBg;
                mobSprite.healthBar = healthBar;
                
                // İsim etiketi
                if (mobData.name) {
                    const nameText = this.add.text(mobData.position.x, mobData.position.y - 45, mobData.name, { 
                        fontFamily: 'Arial',
                        fontSize: '12px',
                        fill: '#ff9999',
                        stroke: '#000000',
                        strokeThickness: 3
                    });
                    nameText.setOrigin(0.5);
                    mobSprite.nameText = nameText;
                }
            }
            
            // Canavar pozisyonunu güncelle
            mobSprite.x = mobData.position.x;
            mobSprite.y = mobData.position.y;
            
            // Sağlık çubuğunu güncelle
            mobSprite.healthBarBg.x = mobData.position.x;
            mobSprite.healthBarBg.y = mobData.position.y - 30;
            mobSprite.healthBar.x = mobData.position.x - 30;
            mobSprite.healthBar.y = mobData.position.y - 30;
            
            // Sağlık durumunu güncelle
            const healthPercent = mobData.stats.currentHealth / mobData.stats.health;
            mobSprite.healthBar.width = 60 * healthPercent;
            
            // İsim etiketini güncelle
            if (mobSprite.nameText) {
                mobSprite.nameText.x = mobData.position.x;
                mobSprite.nameText.y = mobData.position.y - 45;
            }
            
            // Animasyonu güncelle
            if (mobData.isMoving) {
                // Yürüme animasyonu (eğer varsa)
                mobSprite.setFrame(mobData.spriteIndex + 1);
            } else {
                mobSprite.setFrame(mobData.spriteIndex);
            }
            
            // Canavar agresif olduğunda gösterge
            if (mobData.isAggressive && !mobSprite.aggroIndicator) {
                mobSprite.aggroIndicator = this.add.image(mobData.position.x, mobData.position.y - 60, 'effects');
                mobSprite.aggroIndicator.setFrame(16); // Kırmızı ünlem işareti
                mobSprite.aggroIndicator.setScale(0.5);
            } else if (!mobData.isAggressive && mobSprite.aggroIndicator) {
                mobSprite.aggroIndicator.destroy();
                mobSprite.aggroIndicator = null;
            }
            
            if (mobSprite.aggroIndicator) {
                mobSprite.aggroIndicator.x = mobData.position.x;
                mobSprite.aggroIndicator.y = mobData.position.y - 60;
            }
        });
        
        // NPC'leri güncelle
        Object.values(gameState.npcs).forEach(npcData => {
            let npcSprite = this.npcs.getChildren().find(n => n.id === npcData.id);
            
            if (!npcSprite) {
                // Yeni NPC sprite'ı oluştur
                npcSprite = this.physics.add.sprite(npcData.position.x, npcData.position.y, 'npcs');
                npcSprite.id = npcData.id;
                npcSprite.setSize(32, 32);
                npcSprite.setOffset(16, 32);
                npcSprite.canInteract = true;
                this.npcs.add(npcSprite);
                
                // NPC frame'ini ayarla
                npcSprite.setFrame(npcData.spriteIndex);
                
                // İsim etiketi
                const nameText = this.add.text(npcData.position.x, npcData.position.y - 40, npcData.name, { 
                    fontFamily: 'Arial',
                    fontSize: '12px',
                    fill: '#ffff99',
                    stroke: '#000000',
                    strokeThickness: 3
                });
                nameText.setOrigin(0.5);
                npcSprite.nameText = nameText;
                
                // Görev göstergesi (varsa)
                if (npcData.hasQuest) {
                    const questIcon = this.add.image(npcData.position.x, npcData.position.y - 60, 'ui-button');
                    questIcon.setScale(0.5);
                    questIcon.setFrame(1); // Sarı ünlem işareti
                    npcSprite.questIcon = questIcon;
                }
            }
            
            // NPC pozisyonunu güncelle
            npcSprite.x = npcData.position.x;
            npcSprite.y = npcData.position.y;
            
            // İsim etiketini güncelle
            npcSprite.nameText.x = npcData.position.x;
            npcSprite.nameText.y = npcData.position.y - 40;
            
            // Görev göstergesini güncelle
            if (npcSprite.questIcon) {
                npcSprite.questIcon.x = npcData.position.x;
                npcSprite.questIcon.y = npcData.position.y - 60;
            }
            
            // Etkileşim göstergesini yenile
            if (npcSprite.interactIndicator) {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y, npcSprite.x, npcSprite.y
                );
                
                if (distance > 100) {
                    npcSprite.interactIndicator.destroy();
                    npcSprite.interactText.destroy();
                    npcSprite.interactIndicator = null;
                    npcSprite.interactText = null;
                } else {
                    npcSprite.interactIndicator.x = npcData.position.x;
                    npcSprite.interactIndicator.y = npcData.position.y - 50;
                    npcSprite.interactText.x = npcData.position.x;
                    npcSprite.interactText.y = npcData.position.y - 50;
                }
            }
        });
        
        // Düşen eşyaları güncelle
        Object.values(gameState.items).forEach(itemData => {
            let itemSprite = this.items.getChildren().find(i => i.id === itemData.id);
            
            if (!itemSprite) {
                // Yeni eşya sprite'ı oluştur
                itemSprite = this.physics.add.sprite(itemData.position.x, itemData.position.y, 'items');
                itemSprite.id = itemData.id;
                itemSprite.canCollect = true;
                this.items.add(itemSprite);
                
                // Eşya frame'ini ayarla
                itemSprite.setFrame(itemData.itemData.iconIndex || 0);
                
                // Eşya ışık efekti
                const rarityColors = {
                    common: 0xffffff,
                    uncommon: 0x1eff00,
                    rare: 0x0070dd,
                    epic: 0xa335ee,
                    legendary: 0xff8000
                };
                
                const color = rarityColors[itemData.itemData.rarity] || 0xffffff;
                itemSprite.light = this.add.pointlight(itemData.position.x, itemData.position.y, color, 30, 0.5);
                
                // Işık animasyonu
                this.tweens.add({
                    targets: itemSprite.light,
                    radius: 40,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Havada süzülme animasyonu
                this.tweens.add({
                    targets: itemSprite,
                    y: itemData.position.y - 5,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Artık olmayan varlıkları temizle
        cleanupEntities(this);
    }
    
    updateFromState(state) {
        // Dünya durumundaki değişiklikleri oyuna entegre et
        gameState = state;
        
        // Bir sonraki frame'de tüm entityleri güncelle
        if (this.scene && this.scene.isActive()) {
            this.updateEntities();
        }
    }
    
    addEffect(effectType, x, y) {
        // Efekt tiplerine göre görsel efektler ekle
        switch (effectType) {
            case 'slash':
                // Kesme efekti
                const slash = this.add.sprite(x, y, 'effects');
                slash.setFrame(0);
                slash.anims.play('slash');
                slash.once('animationcomplete', () => {
                    slash.destroy();
                });
                break;
                
            case 'magic':
                // Büyü efekti
                const magic = this.add.sprite(x, y, 'effects');
                magic.setFrame(8);
                magic.anims.play('magic');
                magic.once('animationcomplete', () => {
                    magic.destroy();
                });
                break;
                
            case 'heal':
                // İyileştirme efekti
                const heal = this.add.sprite(x, y, 'effects');
                heal.setFrame(16);
                heal.anims.play('heal');
                heal.once('animationcomplete', () => {
                    heal.destroy();
                });
                
                // Parçacık efekti
                const emitter = this.add.particles(0, 0, 'effects', {
                    frame: 17,
                    x: x,
                    y: y,
                    lifespan: 800,
                    speed: { min: 50, max: 100 },
                    scale: { start: 0.5, end: 0 },
                    quantity: 10,
                    blendMode: 'ADD'
                });
                
                this.time.delayedCall(800, () => {
                    emitter.destroy();
                });
                break;
                
            case 'death':
                // Ölüm efekti
                const death = this.add.sprite(x, y, 'effects');
                death.setFrame(24);
                death.anims.play('death');
                death.once('animationcomplete', () => {
                    death.destroy();
                });
                
                // Karanlık parçacıklar
                const deathEmitter = this.add.particles(0, 0, 'effects', {
                    frame: 25,
                    x: x,
                    y: y,
                    lifespan: 1000,
                    speed: { min: 20, max: 70 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.5, end: 0 },
                    quantity: 20,
                    blendMode: 'NORMAL'
                });
                
                this.time.delayedCall(1000, () => {
                    deathEmitter.destroy();
                });
                break;
                
            case 'levelUp':
                // Level atlama efekti
                const levelUp = this.add.sprite(x, y, 'effects');
                levelUp.setFrame(32);
                levelUp.anims.play('levelUp');
                levelUp.once('animationcomplete', () => {
                    levelUp.destroy();
                });
                
                // Parıltı efekti
                const sparkleEmitter = this.add.particles(0, 0, 'effects', {
                    frame: 33,
                    x: x,
                    y: y,
                    lifespan: 2000,
                    speed: { min: 30, max: 120 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.7, end: 0 },
                    quantity: 30,
                    blendMode: 'ADD'
                });
                
                this.time.delayedCall(2000, () => {
                    sparkleEmitter.destroy();
                });
                break;
                
            case 'itemDrop':
                // Eşya düşme efekti
                const itemEffect = this.add.sprite(x, y, 'effects');
                itemEffect.setFrame(40);
                itemEffect.setScale(0.7);
                itemEffect.anims.play('itemDrop');
                itemEffect.once('animationcomplete', () => {
                    itemEffect.destroy();
                });
                break;
                
            case 'buff':
                // Güçlendirme efekti
                const buff = this.add.sprite(x, y, 'effects');
                buff.setFrame(48);
                buff.anims.play('buff');
                buff.once('animationcomplete', () => {
                    buff.destroy();
                });
                
                // Parıltı
                const buffEmitter = this.add.particles(0, 0, 'effects', {
                    frame: 49,
                    x: x,
                    y: y - 30,
                    lifespan: 1000,
                    speed: { min: 10, max: 50 },
                    gravityY: 30,
                    scale: { start: 0.5, end: 0 },
                    quantity: 15,
                    blendMode: 'ADD'
                });
                
                this.time.delayedCall(1000, () => {
                    buffEmitter.destroy();
                });
                break;
                
            case 'debuff':
                // Zayıflatma efekti
                const debuff = this.add.sprite(x, y, 'effects');
                debuff.setFrame(56);
                debuff.anims.play('debuff');
                debuff.once('animationcomplete', () => {
                    debuff.destroy();
                });
                
                // Zehir parçacık
                const debuffEmitter = this.add.particles(0, 0, 'effects', {
                    frame: 57,
                    x: x,
                    y: y - 30,
                    lifespan: 1000,
                    speed: { min: 10, max: 50 },
                    gravityY: 30,
                    scale: { start: 0.5, end: 0 },
                    quantity: 15,
                    blendMode: 'NORMAL',
                    tint: 0x800080
                });
                
                this.time.delayedCall(1000, () => {
                    debuffEmitter.destroy();
                });
                break;
                
            case 'aoe':
                // AOE (Area of Effect) büyü efekti
                const aoeCircle = this.add.circle(x, y, 80, 0xffff00, 0.3);
                
                // Büyüme animasyonu
                this.tweens.add({
                    targets: aoeCircle,
                    radius: 100,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => {
                        aoeCircle.destroy();
                    }
                });
                
                // Patlama efekti
                const aoeEffect = this.add.sprite(x, y, 'effects');
                aoeEffect.setFrame(64);
                aoeEffect.anims.play('explosion');
                aoeEffect.once('animationcomplete', () => {
                    aoeEffect.destroy();
                });
                break;
        }
    }
}

// UI Sahnesi
class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        // UI referansını kaydet
        gameUI = this;
        
        // UI elemanları
        this.createUI();
    }
    
    createUI() {
        // Oyuncu statları
        this.playerStats = this.add.container(20, 20);
        this.healthBar = this.add.image(0, 0, 'ui-health').setOrigin(0, 0);
        this.manaBar = this.add.image(0, 30, 'ui-mana').setOrigin(0, 0);
        this.playerStats.add([this.healthBar, this.manaBar]);
        
        // Skill barları
        this.skillBar = this.add.container(this.game.config.width / 2, this.game.config.height - 100);
        this.skillBar.setScrollFactor(0);
        
        // Skill slots oluştur
        for (let i = 0; i < 8; i++) {
            const slot = this.add.image(i * 55, 0, 'ui-button');
            
            // Skill numarası
            const keyText = this.add.text(i * 55, 25, (i + 1).toString(), {
                fontSize: '16px',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            
            this.skillBar.add([slot, keyText]);
        }
        
        // Oyuncu isim ve level
        this.playerName = this.add.text(20, 70, selectedCharacter.name, {
            fontSize: '18px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        this.playerLevel = this.add.text(20, 95, `Seviye: ${selectedCharacter.level}`, {
            fontSize: '16px',
            fill: '#ffcc33',
            stroke: '#000000',
            strokeThickness: 3
        });
        
        // Minimap
        this.createMinimap();
        
        // Target bilgisi
        this.targetInfo = this.add.container(this.game.config.width - 200, 20);
        this.targetInfo.visible = false;
        
        // UI butonlarını ayarla
        this.setupUIButtons();
    }
    
    createMinimap() {
        // Minimap arkaplanı
        this.minimapBg = this.add.rectangle(this.game.config.width - 120, 120, 200, 200, 0x000000, 0.7);
        this.minimapBg.setStrokeStyle(2, 0x8f5922);
        
        // Minimap canvası
        this.minimap = this.add.graphics();
        this.minimap.x = this.game.config.width - 220;
        this.minimap.y = 20;
        
        // Minimap güncelleme aralığı
        this.time.addEvent({
            delay: 1000,  // 1 saniyede bir güncelle
            callback: this.updateMinimap,
            callbackScope: this,
            loop: true
        });
        
        // İlk güncelleme
        this.updateMinimap();
    }
    
    updateMinimap() {
        // Minimap çizimini temizle
        this.minimap.clear();
        
        // Harita yoksa çiz
        if (!gameScene || !gameScene.map) return;
        
        // Haritanın boyutları
        const mapWidth = gameScene.map.widthInPixels;
        const mapHeight = gameScene.map.heightInPixels;
        
        // Minimap boyutları
        const minimapWidth = 200;
        const minimapHeight = 200;
        
        // Oran hesapla
        const scaleX = minimapWidth / mapWidth;
        const scaleY = minimapHeight / mapHeight;
        
        // Arkaplan
        this.minimap.fillStyle(0x222222, 0.7);
        this.minimap.fillRect(0, 0, minimapWidth, minimapHeight);
        
        // Duvarları çiz (kolizyon alanları)
        if (gameScene.objectsLayer && gameScene.objectsLayer.layer && gameScene.objectsLayer.layer.data) {
            this.minimap.fillStyle(0x444444, 1);
            
            for (let y = 0; y < gameScene.objectsLayer.layer.data.length; y += 5) {
                for (let x = 0; x < gameScene.objectsLayer.layer.data[y].length; x += 5) {
                    const tile = gameScene.objectsLayer.layer.data[y][x];
                    if (tile && tile.collides) {
                        this.minimap.fillRect(
                            x * scaleX,
                            y * scaleY,
                            5 * scaleX,
                            5 * scaleY
                        );
                    }
                }
            }
        }
        
        // NPC'leri çiz
        this.minimap.fillStyle(0xffaa00, 1);
        Object.values(gameState.npcs).forEach(npc => {
            this.minimap.fillCircle(
                npc.position.x * scaleX,
                npc.position.y * scaleY,
                2
            );
        });
        
        // Düşmanları çiz
        this.minimap.fillStyle(0xff0000, 1);
        Object.values(gameState.mobs).forEach(mob => {
            this.minimap.fillCircle(
                mob.position.x * scaleX,
                mob.position.y * scaleY,
                2
            );
        });
        
        // Diğer oyuncuları çiz
        this.minimap.fillStyle(0x00aaff, 1);
        Object.values(gameState.players).forEach(player => {
            if (player.id !== selectedCharacter._id) {
                this.minimap.fillCircle(
                    player.position.x * scaleX,
                    player.position.y * scaleY,
                    2
                );
            }
        });
        
        // Kendimizi çiz (son olarak en üstte görünmesi için)
        if (gameScene.player) {
            this.minimap.fillStyle(0xffffff, 1);
            this.minimap.fillCircle(
                gameScene.player.x * scaleX,
                gameScene.player.y * scaleY,
                3
            );
            
            // Görüş açısını belirt
            this.minimap.lineStyle(1, 0xffffff, 0.5);
            this.minimap.beginPath();
            this.minimap.moveTo(
                gameScene.player.x * scaleX,
                gameScene.player.y * scaleY
            );
            
            // Kamera görüş alanı (yaklaşık olarak)
            const camWidth = gameScene.cameras.main.width / 2;
            const camHeight = gameScene.cameras.main.height / 2;
            
            // Kamera yönüne göre görüş alanını çiz
            let viewX = gameScene.player.x;
            let viewY = gameScene.player.y;
            
            switch (gameScene.player.direction) {
                case 'down':
                    viewY += camHeight / 2;
                    break;
                case 'up':
                    viewY -= camHeight / 2;
                    break;
                case 'left':
                    viewX -= camWidth / 2;
                    break;
                case 'right':
                    viewX += camWidth / 2;
                    break;
            }
            
            this.minimap.lineTo(
                viewX * scaleX,
                viewY * scaleY
            );
            this.minimap.stroke();
        }
    }
    
    setupUIButtons() {
        // Ana menü butonları
        const buttonY = this.game.config.height - 50;
        const buttonSpacing = 60;
        
        // Butonlar: Envanter, Karakter, Görevler, Harita, Ayarlar
        const buttonData = [
            { key: 'inventory', x: this.game.config.width - buttonSpacing * 5, y: buttonY },
            { key: 'character', x: this.game.config.width - buttonSpacing * 4, y: buttonY },
            { key: 'quest', x: this.game.config.width - buttonSpacing * 3, y: buttonY },
            { key: 'map', x: this.game.config.width - buttonSpacing * 2, y: buttonY },
            { key: 'settings', x: this.game.config.width - buttonSpacing, y: buttonY }
        ];
        
        buttonData.forEach(button => {
            const btn = this.add.image(button.x, button.y, 'ui-button');
            btn.setInteractive();
            
            // Buton metni (ilk harf)
            const text = this.add.text(button.x, button.y, button.key.charAt(0).toUpperCase(), {
                fontSize: '24px',
                fill: '#ffffff'
            }).setOrigin(0.5);
            
            // Buton olayı
            btn.on('pointerdown', () => {
                const buttonElement = document.getElementById(`${button.key}-button`);
                if (buttonElement) {
                    buttonElement.click();
                }
            });
            
            // Hover efektleri
            btn.on('pointerover', () => {
                btn.setTint(0xffcc33);
            });
            
            btn.on('pointerout', () => {
                btn.clearTint();
            });
        });
    }
    
    showTargetInfo(target) {
        // Hedef bilgi panelini güncelle
        this.targetInfo.visible = true;
        
        // Önceki içeriği temizle
        this.targetInfo.removeAll(true);
        
        // Arkaplan
        const bg = this.add.rectangle(0, 0, 180, 80, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0x8f5922);
        bg.setOrigin(0, 0);
        this.targetInfo.add(bg);
        
        // Hedef adı
        const nameText = this.add.text(10, 10, target.name, {
            fontSize: '16px',
            fill: target.type === 'mob' ? '#ff9999' : '#ffffff'
        });
        
        // Hedef tipi ve seviyesi
        const typeText = this.add.text(10, 30, `${translateTargetType(target.type)} - Seviye ${target.level || '?'}`, {
            fontSize: '14px',
            fill: '#cccccc'
        });
        
        // Sağlık barı
        const healthBarBg = this.add.rectangle(10, 50, 160, 15, 0x333333);
        healthBarBg.setOrigin(0, 0);
        const healthBarFill = this.add.rectangle(10, 50, 160 * (target.stats.currentHealth / target.stats.health), 15, 0xe74c3c);
        healthBarFill.setOrigin(0, 0);
        const healthText = this.add.text(15, 51, `${target.stats.currentHealth}/${target.stats.health} HP`, {
            fontSize: '12px',
            fill: '#ffffff'
        });
        
        this.targetInfo.add([nameText, typeText, healthBarBg, healthBarFill, healthText]);
    }
    
    hideTargetInfo() {
        this.targetInfo.visible = false;
    }
    
    updatePlayerStats() {
        if (!selectedCharacter) return;
        
        // Can ve mana barlarını güncelle
        const healthPercent = selectedCharacter.stats.currentHealth / selectedCharacter.stats.health;
        const manaPercent = selectedCharacter.stats.currentMana / selectedCharacter.stats.mana;
        
        this.healthBar.scaleX = healthPercent;
        this.manaBar.scaleX = manaPercent;
        
        // İsim ve level bilgisini güncelle
        this.playerName.setText(selectedCharacter.name);
        this.playerLevel.setText(`Seviye: ${selectedCharacter.level}`);
    }
    
    showPlayerJoinMessage(player) {
        addSystemMessage(`<span style="color: #55aaff">${player.name}</span> oyuna katıldı.`);
    }
}

// Varlıkları temizleme işlemi
function cleanupEntities(scene) {
    // Artık gameState'de olmayan varlıkları temizle
    
    // Diğer oyuncuları temizle
    const currentPlayerIds = Object.keys(gameState.players);
    scene.players.getChildren().forEach(player => {
        if (!currentPlayerIds.includes(player.id)) {
            if (player.nameText) player.nameText.destroy();
            player.destroy();
        }
    });
    
    // Canavarları temizle
    const currentMobIds = Object.keys(gameState.mobs);
    scene.monsters.getChildren().forEach(mob => {
        if (!currentMobIds.includes(mob.id)) {
            if (mob.nameText) mob.nameText.destroy();
            if (mob.healthBarBg) mob.healthBarBg.destroy();
            if (mob.healthBar) mob.healthBar.destroy();
            if (mob.aggroIndicator) mob.aggroIndicator.destroy();
            mob.destroy();
        }
    });
    
    // Eşyaları temizle
    const currentItemIds = Object.keys(gameState.items);
    scene.items.getChildren().forEach(item => {
        if (!currentItemIds.includes(item.id)) {
            if (item.light) item.light.destroy();
            item.destroy();
        }
    });
}

// Hedef tipini Türkçe'ye çevir
function translateTargetType(type) {
    const typeTranslations = {
        'player': 'Oyuncu',
        'mob': 'Canavar',
        'npc': 'NPC',
        'boss': 'Patron'
    };
    
    return typeTranslations[type] || type;
}
