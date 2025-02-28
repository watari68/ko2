// network.js - Sunucu ile iletişim yönetimi

let socket;
let gameState = {
    players: {},
    npcs: {},
    mobs: {},
    items: {}
};

// Sunucu bağlantısını kurma
function initializeNetwork() {
    return new Promise((resolve, reject) => {
        // Socket.io bağlantısı kurulumu
        socket = io(window.location.origin, {
            auth: {
                token: authToken
            }
        });

        // Bağlantı olayları
        socket.on('connect', () => {
            console.log('Sunucuya bağlanıldı');
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            console.error('Sunucu bağlantı hatası:', error);
            reject(error);
        });

        // Oyun olaylarını tanımla
        setupGameEvents();
    });
}

// Oyun olaylarını tanımlama
function setupGameEvents() {
    // Oyuncu giriş onayı
    socket.on('playerJoined', (data) => {
        console.log('Oyuncu girişi onaylandı:', data);
        
        // Diğer oyuncuların durumunu al
        socket.emit('requestWorldState');
    });

    // Dünya durumu güncelleme
    socket.on('worldUpdate', (data) => {
        updateGameState(data);
    });

    // Yeni oyuncu geldiğinde
    socket.on('playerConnected', (player) => {
        console.log('Yeni oyuncu bağlandı:', player);
        gameState.players[player.id] = player;
        
        // UI güncelleme
        if (gameUI) {
            gameUI.showPlayerJoinMessage(player);
        }
    });

    // Oyuncu ayrıldığında
    socket.on('playerLeft', (playerId) => {
        console.log('Oyuncu ayrıldı:', playerId);
        if (gameState.players[playerId]) {
            delete gameState.players[playerId];
        }
    });

    // Oyuncu hareket güncelleme
    socket.on('playerMove', (data) => {
        if (gameState.players[data.id]) {
            gameState.players[data.id].position = data.position;
            gameState.players[data.id].direction = data.direction;
            gameState.players[data.id].isMoving = data.isMoving;
        }
    });

    // Savaş olayları
    socket.on('combatEvent', handleCombatEvent);
    
    // NPC etkileşimi
    socket.on('npcInteraction', handleNPCInteraction);
    
    // Item olayları
    socket.on('itemDrop', handleItemDrop);
    socket.on('itemPickup', handleItemPickup);
    
    // Sohbet mesajları
    socket.on('chatMessage', (message) => {
        addChatMessage(message);
    });

    // Sistem mesajları
    socket.on('systemMessage', (message) => {
        addSystemMessage(message);
    });

    // Karakter değişiklikleri (level atlama vb.)
    socket.on('characterUpdate', (characterData) => {
        // Karakter bilgilerini güncelle
        Object.assign(selectedCharacter, characterData);
        updateCharacterUI(selectedCharacter);
        
        // Level atladıysa bildir
        if (characterData.levelUp) {
            showLevelUpNotification(characterData.level);
        }
    });
    
    // Hata mesajları
    socket.on('errorMessage', (error) => {
        showErrorMessage(error.message);
    });
}

// Oyun durumunu güncelleme
function updateGameState(newState) {
    // En son sunucu durumunu entegre et
    Object.keys(newState).forEach(key => {
        if (gameState[key]) {
            gameState[key] = newState[key];
        }
    });
    
    // Oyun dünyasını güncelle
    if (gameScene) {
        gameScene.updateFromState(gameState);
    }
}

// Oyuncu hareketi gönderme
function sendPlayerMovement(position, direction, isMoving) {
    if (!socket || !socket.connected) return;
    
    socket.emit('playerMove', {
        position,
        direction,
        isMoving
    });
}

// Savaş eylemi gönderme
function sendCombatAction(actionType, targetId, skillId = null) {
    if (!socket || !socket.connected) return;
    
    socket.emit('combatAction', {
        type: actionType,
        targetId,
        skillId
    });
}

// Savaş olayını işle
function handleCombatEvent(event) {
    console.log('Savaş olayı:', event);
    
    // Görsel efektleri göster
    showCombatEffect(event);
    
    // Hasar popuplarını göster
    if (event.damage) {
        showDamageNumber(event.targetId, event.damage, event.isCritical);
    }
    
    // Karakter öldüyse
    if (event.type === 'death') {
        handleEntityDeath(event.targetId, event.targetType);
    }
    
    // Kendi karakterimiz etkilendiyse UI'ları güncelle
    if (event.targetId === selectedCharacter._id && event.targetType === 'player') {
        selectedCharacter.stats.currentHealth = event.currentHealth;
        updateStatBars(selectedCharacter);
    }
}

// NPC etkileşimini işle
function handleNPCInteraction(data) {
    console.log('NPC etkileşimi:', data);
    
    // Dialog penceresini göster
    if (data.dialog) {
        showNPCDialog(data.npcId, data.dialog);
    }
    
    // Görev güncellemesini göster
    if (data.questUpdate) {
        handleQuestUpdate(data.questUpdate);
    }
    
    // Ticaret penceresini göster
    if (data.trade) {
        showTradeWindow(data.npcId, data.trade);
    }
}

// Eşya düşme olayını işle
function handleItemDrop(data) {
    console.log('Eşya düştü:', data);
    
    // Düşen eşyayı oyun dünyasına ekle
    gameState.items[data.itemId] = {
        id: data.itemId,
        itemData: data.itemData,
        position: data.position,
        droppedAt: Date.now()
    };
    
    // Görsel efekt göster
    showItemDropEffect(data.position);
}

// Eşya toplama olayını işle
function handleItemPickup(data) {
    console.log('Eşya toplandı:', data);
    
    // Toplanan eşyayı dünya durumundan kaldır
    if (gameState.items[data.itemId]) {
        delete gameState.items[data.itemId];
    }
    
    // Bir oyuncu topladıysa
    if (data.playerId) {
        // Biz topladıysak
        if (data.playerId === selectedCharacter._id) {
            // Envantere ekle
            addItemToInventory(data.itemData);
            // Bildirim göster
            showItemPickupNotification(data.itemData);
        } else if (gameState.players[data.playerId]) {
            // Başka bir oyuncu topladı, gösterge ekle
            showPlayerPickupIndicator(data.playerId, data.itemData.name);
        }
    }
}

// Sistem mesajı ekle
function addSystemMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message', 'system-message');
    
    messageElement.innerHTML = `
        <span class="message-content">${message}</span>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hata mesajı göster
function showErrorMessage(message) {
    addSystemMessage(`<span style="color: #ff5555">Hata: ${message}</span>`);
}

// Sunucuya etkileşim gönder
function sendInteraction(type, targetId, data = {}) {
    if (!socket || !socket.connected) return;
    
    socket.emit('interaction', {
        type,
        targetId,
        ...data
    });
}

// Karakteri sunucuya gönder
function joinGame(character) {
    if (!socket || !socket.connected || !character) return;
    
    socket.emit('joinGame', {
        characterId: character._id
    });
}

// Karakter değişikliklerini kaydet
function saveCharacterChanges() {
    if (!socket || !socket.connected || !selectedCharacter) return;
    
    socket.emit('saveCharacter', {
        characterId: selectedCharacter._id,
        stats: selectedCharacter.stats,
        position: selectedCharacter.position,
        equipment: selectedCharacter.equipment
    });
}

// Sunucudan çıkış
function leaveGame() {
    if (socket) {
        socket.emit('leaveGame');
        socket.disconnect();
    }
}