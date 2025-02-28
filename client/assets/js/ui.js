// ui.js - Kullanıcı arayüzü kontrolü ve etkileşimleri

// UI Pencerelerinin kontrolü için değişkenler
const uiWindows = {
    inventory: document.getElementById('inventory-window'),
    character: document.getElementById('character-window'),
    quest: document.getElementById('quest-window'),
    map: document.getElementById('map-window')
};

// UI butonları için olay dinleyicileri
document.addEventListener('DOMContentLoaded', () => {
    initUIEvents();
    setupWindowControls();
    setupChatSystem();
    setupTooltips();
});

// UI olaylarını başlat
function initUIEvents() {
    // Ana UI butonlarını ayarla
    document.getElementById('inventory-button').addEventListener('click', () => toggleWindow('inventory'));
    document.getElementById('character-button').addEventListener('click', () => toggleWindow('character'));
    document.getElementById('quest-button').addEventListener('click', () => toggleWindow('quest'));
    document.getElementById('map-button').addEventListener('click', () => toggleWindow('map'));
    document.getElementById('settings-button').addEventListener('click', showSettings);
}

// Pencere kontrollerini ayarla (kapatma düğmeleri vb.)
function setupWindowControls() {
    // Tüm kapat düğmelerini ayarla
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', () => {
            // En yakın .game-window öğesini bul ve gizle
            const window = button.closest('.game-window');
            if (window) {
                window.classList.add('hidden');
            }
        });
    });

    // Görev sekme kontrolü
    const questTabs = document.querySelectorAll('.quest-tab');
    questTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Aktif sekme sınıfını değiştir
            questTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // İlgili görev listesini göster
            const tabName = tab.getAttribute('data-tab');
            document.querySelectorAll('.quest-list').forEach(list => {
                list.classList.add('hidden');
            });
            document.getElementById(`${tabName}-quests`).classList.remove('hidden');
        });
    });
}

// Sohbet sistemini ayarla
function setupChatSystem() {
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const message = chatInput.value.trim();
            if (message) {
                const channel = document.getElementById('chat-channel').value;
                sendChatMessage(message, channel);
                chatInput.value = '';
            }
        }
    });
}

// Sohbet mesajı gönder
function sendChatMessage(message, channel) {
    if (!selectedCharacter) return;
    
    // Sunucuya mesaj gönder
    if (socket) {
        socket.emit('chatMessage', {
            message,
            channel,
            characterId: selectedCharacter._id,
            characterName: selectedCharacter.name
        });
    }
    
    // Mesajı yerel olarak göster
    addChatMessage({
        sender: selectedCharacter.name,
        message,
        channel,
        timestamp: new Date()
    }, true);
}

// Sohbet mesajı ekle
function addChatMessage(messageData, isOwnMessage = false) {
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    if (isOwnMessage) {
        messageElement.classList.add('own-message');
    }
    
    // Kanal rengi
    const channelColors = {
        all: '#ffffff',
        party: '#55aaff',
        guild: '#55cc55',
        trade: '#ffcc33'
    };
    
    const channelColor = channelColors[messageData.channel] || '#ffffff';
    
    // Mesaj içeriğini oluştur
    const time = new Date(messageData.timestamp).toLocaleTimeString();
    messageElement.innerHTML = `
        <span class="message-time">[${time}]</span>
        <span class="message-sender" style="color: ${channelColor}">${messageData.sender}:</span>
        <span class="message-content">${escapeHTML(messageData.message)}</span>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// HTML özel karakterlerini kaçış
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Pencere göster/gizle
function toggleWindow(windowName) {
    // Tüm pencereleri kapat
    Object.values(uiWindows).forEach(window => window.classList.add('hidden'));
    
    // İstenen pencereyi aç
    uiWindows[windowName].classList.remove('hidden');
    
    // Pencere içeriğini güncelle
    switch(windowName) {
        case 'inventory':
            updateInventory();
            break;
        case 'character':
            updateCharacterUI(selectedCharacter);
            break;
        case 'quest':
            updateQuestWindow();
            break;
        case 'map':
            updateMapWindow();
            break;
    }
}

// Envanter UI'ını güncelle
function updateInventory() {
    if (!selectedCharacter) return;
    
    const inventoryGrid = document.getElementById('inventory-grid');
    inventoryGrid.innerHTML = '';
    
    // Gold miktarını ayarla
    document.getElementById('gold-amount').textContent = `Gold: ${selectedCharacter.gold}`;
    
    // Envanter ağırlığını ayarla (varsayılan)
    document.getElementById('inventory-weight').textContent = `Ağırlık: 0/100`;
    
    // Envanter slotlarını oluştur
    for (let i = 0; i < 24; i++) {
        const slot = document.createElement('div');
        slot.classList.add('inventory-slot');
        slot.setAttribute('data-slot', i);
        
        const item = selectedCharacter.inventory.find(item => item.slot === i);
        
        if (item) {
            // Item var, göster
            slot.classList.add('has-item');
            slot.style.backgroundImage = `url(${getItemImageUrl(item.item)})`;
            
            if (item.quantity > 1) {
                const quantity = document.createElement('div');
                quantity.classList.add('item-quantity');
                quantity.textContent = item.quantity;
                slot.appendChild(quantity);
            }
            
            // Item tooltip ve olayları ekle
            slot.addEventListener('click', () => handleItemClick(item, i));
        }
        
        inventoryGrid.appendChild(slot);
    }
    
    // Ekipmanları güncelle
    updateEquipmentSlots();
}

// Eşya tıklama işlemi
function handleItemClick(item, slotIndex) {
    // Eşya yönetim menüsünü göster
    showItemMenu(item, slotIndex);
}

// Eşya menüsü göster
function showItemMenu(item, slotIndex) {
    // Varolan menüyü kaldır
    const oldMenu = document.getElementById('item-context-menu');
    if (oldMenu) {
        oldMenu.remove();
    }
    
    // Yeni menü oluştur
    const menu = document.createElement('div');
    menu.id = 'item-context-menu';
    menu.className = 'context-menu';
    
    // Menü pozisyonu (fare pozisyonuna göre)
    const mousePos = game.input.activePointer;
    menu.style.left = mousePos.x + 'px';
    menu.style.top = mousePos.y + 'px';
    
    // Menü seçenekleri
    const actions = [
        { name: 'Kullan', action: () => useItem(item, slotIndex) },
        { name: 'Ekipmanla', action: () => equipItem(item, slotIndex) },
        { name: 'Düşür', action: () => dropItem(item, slotIndex) }
    ];
    
    // Eşya tipine göre seçenekleri filtrele
    let filteredActions = actions;
    if (item.item.type === 'weapon' || item.item.type === 'armor' || 
        item.item.type === 'helmet' || item.item.type === 'shield' || 
        item.item.type === 'boots' || item.item.type === 'gloves' || 
        item.item.type === 'ring' || item.item.type === 'necklace') {
        // Ekipman için "Kullan" seçeneğini kaldır
        filteredActions = actions.filter(a => a.name !== 'Kullan');
    } else if (item.item.type !== 'consumable') {
        // Tüketilebilir olmayan eşyalar için "Kullan" seçeneğini kaldır
        filteredActions = actions.filter(a => a.name !== 'Kullan' && a.name !== 'Ekipmanla');
    }
    
    // Menü seçeneklerini ekle
    filteredActions.forEach(actionItem => {
        const option = document.createElement('div');
        option.className = 'context-menu-item';
        option.textContent = actionItem.name;
        option.addEventListener('click', () => {
            actionItem.action();
            menu.remove();
        });
        menu.appendChild(option);
    });
    
    // Menüyü ekle
    document.body.appendChild(menu);
    
    // Menü dışına tıklandığında kapat
    document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        }
    });
}

// Eşyayı kullan
function useItem(item, slotIndex) {
    if (!socket) return;
    
    socket.emit('useItem', {
        characterId: selectedCharacter._id,
        itemId: item.item._id,
        slotIndex: slotIndex
    });
}

// Eşyayı ekipmanla
function equipItem(item, slotIndex) {
    if (!socket) return;
    
    socket.emit('equipItem', {
        characterId: selectedCharacter._id,
        itemId: item.item._id,
        slotIndex: slotIndex
    });
}

// Eşyayı düşür
function dropItem(item, slotIndex) {
    if (!socket) return;
    
    // Eşya düşürme onayı
    if (confirm(`${item.item.name} eşyasını düşürmek istediğinizden emin misiniz?`)) {
        socket.emit('dropItem', {
            characterId: selectedCharacter._id,
            itemId: item.item._id,
            slotIndex: slotIndex
        });
    }
}

// Item için görsel URL'si döndür
function getItemImageUrl(item) {
    if (!item || !item.iconUrl) {
        return 'assets/images/items/default.png';
    }
    return item.iconUrl;
}

// Ekipman slotlarını güncelle
function updateEquipmentSlots() {
    if (!selectedCharacter) return;
    
    const equipment = selectedCharacter.equipment;
    
    // Her ekipman slotunu kontrol et ve güncelle
    Object.keys(equipment).forEach(slotName => {
        const slotElement = document.querySelector(`.equipment-slot[data-slot="${slotName}"]`);
        if (!slotElement) return;
        
        const equippedItem = equipment[slotName];
        
        if (equippedItem) {
            // Ekipmanlı slot görünümü
            slotElement.classList.add('has-item');
            slotElement.style.backgroundImage = `url(${getItemImageUrl(equippedItem)})`;
            
            // Tooltip ve tıklama olayları
            setupItemTooltip(slotElement, equippedItem);
        } else {
            // Boş slot görünümü
            slotElement.classList.remove('has-item');
            slotElement.style.backgroundImage = '';
        }
    });
}

// Tooltip sistemi kurulumu
function setupTooltips() {
    // Tooltip konteynerini oluştur
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'tooltip-container';
    tooltipContainer.className = 'tooltip-container hidden';
    document.body.appendChild(tooltipContainer);
    
    // Mouse hareketi ile tooltip pozisyonunu güncelle
    document.addEventListener('mousemove', (e) => {
        tooltipContainer.style.left = (e.pageX + 15) + 'px';
        tooltipContainer.style.top = (e.pageY + 15) + 'px';
    });
}

// Eşya için tooltip ayarla
function setupItemTooltip(element, item) {
    const tooltipContainer = document.getElementById('tooltip-container');
    
    // Mouse üzerine gelince tooltip göster
    element.addEventListener('mouseenter', () => {
        // Tooltip içeriğini oluştur
        tooltipContainer.innerHTML = createItemTooltipContent(item);
        tooltipContainer.classList.remove('hidden');
    });
    
    // Mouse ayrılınca tooltip'i gizle
    element.addEventListener('mouseleave', () => {
        tooltipContainer.classList.add('hidden');
    });
}

// Eşya tooltip içeriğini oluştur
function createItemTooltipContent(item) {
    const rarityColors = {
        common: '#FFFFFF',
        uncommon: '#1EFF00',
        rare: '#0070DD',
        epic: '#A335EE',
        legendary: '#FF8000'
    };
    
    // Eşya adı ve temel bilgiler
    let content = `
        <div class="tooltip-title" style="color:${rarityColors[item.rarity] || '#FFFFFF'}">${item.name}</div>
        <div class="tooltip-binding">${item.binding || ''}</div>
        <div class="tooltip-type">${translateItemType(item.type)} ${item.subtype ? '- ' + translateItemSubtype(item.subtype) : ''}</div>
    `;
    
    // Statlar
    if (item.stats) {
        content += '<div class="tooltip-stats">';
        
        if (item.stats.attack > 0) content += `<div>Saldırı: +${item.stats.attack}</div>`;
        if (item.stats.defense > 0) content += `<div>Savunma: +${item.stats.defense}</div>`;
        if (item.stats.strength > 0) content += `<div>Güç: +${item.stats.strength}</div>`;
        if (item.stats.dexterity > 0) content += `<div>Çeviklik: +${item.stats.dexterity}</div>`;
        if (item.stats.intelligence > 0) content += `<div>Zeka: +${item.stats.intelligence}</div>`;
        if (item.stats.vitality > 0) content += `<div>Dayanıklılık: +${item.stats.vitality}</div>`;
        if (item.stats.critChance > 0) content += `<div>Kritik Şansı: +${item.stats.critChance}%</div>`;
        if (item.stats.critDamage > 0) content += `<div>Kritik Hasarı: +${item.stats.critDamage}%</div>`;
        
        content += '</div>';
    }
    
    // Özel efektler
    if (item.effects && item.effects.length > 0) {
        content += '<div class="tooltip-effects">';
        item.effects.forEach(effect => {
            content += `<div class="tooltip-effect">${effect.description}</div>`;
        });
        content += '</div>';
    }
    
    // Gereksinimler
    if (item.requirements) {
        content += '<div class="tooltip-requirements">';
        
        if (item.requirements.level) {
            const metClass = selectedCharacter.level >= item.requirements.level ? 'requirement-met' : 'requirement-not-met';
            content += `<div class="${metClass}">Seviye: ${item.requirements.level}</div>`;
        }
        
        if (item.requirements.class && item.requirements.class.length > 0) {
            const metClass = item.requirements.class.includes(selectedCharacter.class) ? 'requirement-met' : 'requirement-not-met';
            const classes = item.requirements.class.map(c => translateClass(c)).join(', ');
            content += `<div class="${metClass}">Sınıf: ${classes}</div>`;
        }
        
        content += '</div>';
    }
    
    // Açıklama
    if (item.description) {
        content += `<div class="tooltip-description">"${item.description}"</div>`;
    }
    
    // Fiyat
    if (item.value) {
        content += `<div class="tooltip-value">Değer: ${item.value} Gold</div>`;
    }
    
    return content;
}

// Item tipini çevir
function translateItemType(type) {
    const typeTranslations = {
        'weapon': 'Silah',
        'armor': 'Zırh',
        'helmet': 'Kask',
        'shield': 'Kalkan',
        'boots': 'Bot',
        'gloves': 'Eldiven',
        'ring': 'Yüzük',
        'necklace': 'Kolye',
        'consumable': 'Tüketilebilir',
        'material': 'Materyal',
        'quest': 'Görev Eşyası'
    };
    
    return typeTranslations[type] || type;
}

// Item alt tipini çevir
function translateItemSubtype(subtype) {
    const subtypeTranslations = {
        // Silahlar
        'sword': 'Kılıç',
        'axe': 'Balta',
        'mace': 'Topuz',
        'dagger': 'Hançer',
        'bow': 'Yay',
        'staff': 'Asa',
        'wand': 'Değnek',
        
        // Zırhlar
        'light': 'Hafif',
        'medium': 'Orta',
        'heavy': 'Ağır',
        'cloth': 'Kumaş',
        'leather': 'Deri',
        'plate': 'Plaka',
        
        // Tüketilebilirler
        'potion': 'İksir',
        'food': 'Yiyecek',
        'scroll': 'Parşömen'
    };
    
    return subtypeTranslations[subtype] || subtype;
}

// Görev penceresini güncelle
function updateQuestWindow() {
    if (!selectedCharacter || !selectedCharacter.quests) return;
    
    const activeQuestsContainer = document.getElementById('active-quests');
    const completedQuestsContainer = document.getElementById('completed-quests');
    const availableQuestsContainer = document.getElementById('available-quests');
    
    // Mevcut listeleri temizle
    activeQuestsContainer.innerHTML = '';
    completedQuestsContainer.innerHTML = '';
    availableQuestsContainer.innerHTML = '';
    
    // Aktif görevleri ekle
    if (selectedCharacter.quests.active.length === 0) {
        activeQuestsContainer.innerHTML = '<div class="no-quests">Aktif görev bulunmuyor.</div>';
    } else {
        selectedCharacter.quests.active.forEach(quest => {
            const questElement = createQuestElement(quest, 'active');
            activeQuestsContainer.appendChild(questElement);
        });
    }
    
    // Tamamlanmış görevleri ekle
    if (selectedCharacter.quests.completed.length === 0) {
        completedQuestsContainer.innerHTML = '<div class="no-quests">Tamamlanmış görev bulunmuyor.</div>';
    } else {
        selectedCharacter.quests.completed.forEach(quest => {
            const questElement = createQuestElement(quest, 'completed');
            completedQuestsContainer.appendChild(questElement);
        });
    }
    
    // Mevcut görevleri ekle (henüz kabul edilmemiş)
    if (selectedCharacter.quests.available.length === 0) {
        availableQuestsContainer.innerHTML = '<div class="no-quests">Mevcut görev bulunmuyor.</div>';
    } else {
        selectedCharacter.quests.available.forEach(quest => {
            const questElement = createQuestElement(quest, 'available');
            availableQuestsContainer.appendChild(questElement);
        });
    }
}

// Görev elementiUni oluştur
function createQuestElement(quest, status) {
    const element = document.createElement('div');
    element.className = `quest-item ${status}`;
    
    // Görev zorluğuna göre renk sınıfı ekle
    if (quest.difficulty) {
        element.classList.add(`difficulty-${quest.difficulty.toLowerCase()}`);
    }
    
    // Temel görev bilgileri
    let content = `
        <h4 class="quest-title">${quest.title}</h4>
        <div class="quest-level">Seviye: ${quest.level}</div>
    `;
    
    // Görev durumuna göre içerik ekle
    if (status === 'active') {
        content += `
            <div class="quest-objectives">
                <h5>Hedefler:</h5>
                <ul>
        `;
        
        quest.objectives.forEach(objective => {
            const completed = objective.current >= objective.required;
            const statusClass = completed ? 'completed' : 'in-progress';
            
            content += `
                <li class="${statusClass}">
                    ${objective.description}: ${objective.current}/${objective.required}
                </li>
            `;
        });
        
        content += `
                </ul>
            </div>
            <div class="quest-location">Konum: ${quest.location}</div>
        `;
    } else if (status === 'available') {
        content += `
            <div class="quest-description">${quest.description}</div>
            <div class="quest-location">Konum: ${quest.location}</div>
            <div class="quest-giver">Görev Veren: ${quest.giver}</div>
            <button class="accept-quest-button" data-quest-id="${quest.id}">Görevi Kabul Et</button>
        `;
    } else if (status === 'completed') {
        content += `
            <div class="quest-completion-date">Tamamlanma: ${formatDate(quest.completedAt)}</div>
            <div class="quest-rewards">
                <span>Ödüller:</span> ${formatQuestRewards(quest.rewards)}
            </div>
        `;
    }
    
    element.innerHTML = content;
    
    // Görev kabul etme butonları için olay ekle
    if (status === 'available') {
        element.querySelector('.accept-quest-button').addEventListener('click', () => {
            acceptQuest(quest.id);
        });
    }
    
    // Aktif görevlerin detaylarını göster/gizle için tıklama olayı
    if (status === 'active') {
        element.addEventListener('click', () => {
            showQuestDetails(quest);
        });
    }
    
    return element;
}

// Görev ödüllerini formatlı şekilde göster
function formatQuestRewards(rewards) {
    let rewardText = '';
    
    if (rewards.exp) rewardText += `<span class="reward-exp">${rewards.exp} EXP</span>`;
    if (rewards.gold) rewardText += `<span class="reward-gold">${rewards.gold} Gold</span>`;
    
    if (rewards.items && rewards.items.length > 0) {
        rewardText += '<span class="reward-items">Eşyalar: ';
        rewardText += rewards.items.map(item => item.name).join(', ');
        rewardText += '</span>';
    }
    
    return rewardText;
}

// Görev detaylarını göster
function showQuestDetails(quest) {
    // Varolan detay panelini kaldır
    const existingPanel = document.getElementById('quest-detail-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Detay paneli oluştur
    const panel = document.createElement('div');
    panel.id = 'quest-detail-panel';
    panel.className = 'game-window';
    
    panel.innerHTML = `
        <div class="window-header">
            <h3>${quest.title}</h3>
            <button class="close-button">&times;</button>
        </div>
        <div class="window-content quest-details">
            <div class="quest-description">${quest.description}</div>
            <div class="quest-level">Seviye: ${quest.level}</div>
            <div class="quest-location">Konum: ${quest.location}</div>
            <div class="quest-giver">Görev Veren: ${quest.giver}</div>
            
            <div class="quest-objectives">
                <h5>Hedefler:</h5>
                <ul>
                    ${quest.objectives.map(objective => {
                        const completed = objective.current >= objective.required;
                        const statusClass = completed ? 'completed' : 'in-progress';
                        return `<li class="${statusClass}">
                            ${objective.description}: ${objective.current}/${objective.required}
                        </li>`;
                    }).join('')}
                </ul>
            </div>
            
            <div class="quest-rewards">
                <h5>Ödüller:</h5>
                <div class="rewards-list">
                    ${formatQuestRewards(quest.rewards)}
                </div>
            </div>
            
            ${quest.hint ? `<div class="quest-hint"><strong>İpucu:</strong> ${quest.hint}</div>` : ''}
            
            <button id="abandon-quest-button" data-quest-id="${quest.id}">Görevi Bırak</button>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Kapat düğmesi olayı
    panel.querySelector('.close-button').addEventListener('click', () => {
        panel.remove();
    });
    
    // Görevi bırakma düğmesi olayı
    panel.querySelector('#abandon-quest-button').addEventListener('click', () => {
        if (confirm('Bu görevi bırakmak istediğinizden emin misiniz?')) {
            abandonQuest(quest.id);
            panel.remove();
        }
    });
}

// Görevi kabul et
function acceptQuest(questId) {
    if (socket) {
        socket.emit('acceptQuest', {
            characterId: selectedCharacter._id,
            questId: questId
        });
    }
}

// Görevi bırak
function abandonQuest(questId) {
    if (socket) {
        socket.emit('abandonQuest', {
            characterId: selectedCharacter._id,
            questId: questId
        });
    }
}

// Görev güncellemesini işle
function handleQuestUpdate(questUpdate) {
    // Karakter görevlerini güncelle
    if (questUpdate.quests) {
        selectedCharacter.quests = questUpdate.quests;
        updateQuestWindow();
    }
    
    // Görev tamamlama mesajı göster
    if (questUpdate.completedQuest) {
        showQuestCompletionMessage(questUpdate.completedQuest);
    }
    
    // Görev ilerleme mesajı göster
    if (questUpdate.progressUpdate) {
        showQuestProgressMessage(questUpdate.progressUpdate);
    }
}

// Görev tamamlama mesajı göster
function showQuestCompletionMessage(quest) {
    // Görev tamamlama bildirimi
    const notification = document.createElement('div');
    notification.className = 'quest-completion-notification';
    notification.innerHTML = `
        <div class="notification-header">Görev Tamamlandı!</div>
        <div class="notification-content">
            <div class="quest-title">${quest.title}</div>
            <div class="quest-rewards">
                <h5>Ödüller:</h5>
                ${formatQuestRewards(quest.rewards)}
            </div>
        </div>
        <button class="notification-close">Kapat</button>
    `;
    
    document.body.appendChild(notification);
    
    // Kapat düğmesi olayı
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // 10 saniye sonra otomatik kapat
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 10000);
}

// Görev ilerleme mesajı göster
function showQuestProgressMessage(progress) {
    addSystemMessage(`
        <span style="color: #FFCC33">Görev İlerlemesi:</span> 
        ${progress.objectiveDescription} (${progress.current}/${progress.required})
    `);
}

// Harita penceresini güncelle
function updateMapWindow() {
    const mapContent = document.getElementById('map-content');
    
    // Harita bilgilerini göster
    if (gameScene && gameScene.currentMap) {
        const mapInfo = gameScene.currentMap;
        
        mapContent.innerHTML = `
            <div class="map-header">
                <h4>${mapInfo.name}</h4>
                <div class="map-level">Seviye: ${mapInfo.minLevel}-${mapInfo.maxLevel}</div>
            </div>
            <div class="map-description">${mapInfo.description}</div>
            <div class="map-canvas-container">
                <canvas id="mini-map" width="300" height="300"></canvas>
            </div>
            <div class="map-locations">
                <h5>Önemli Konumlar:</h5>
                <ul>
                    ${mapInfo.locations.map(loc => `
                        <li class="map-location" data-x="${loc.x}" data-y="${loc.y}">
                            <span class="location-name">${loc.name}</span>
                            <span class="location-type">${translateLocationType(loc.type)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        // Harita konumlarına tıklama olayı
        mapContent.querySelectorAll('.map-location').forEach(element => {
            element.addEventListener('click', () => {
                const x = parseInt(element.getAttribute('data-x'));
                const y = parseInt(element.getAttribute('data-y'));
                
                // Mini haritada konumu göster
                highlightLocationOnMap(x, y);
                
                // Konum bilgisi ekle
                const distanceInfo = calculateDistance(gameScene.player.x, gameScene.player.y, x, y);
                addSystemMessage(`Hedef: ${element.querySelector('.location-name').textContent} - Mesafe: ${distanceInfo.distance} birim, Yön: ${distanceInfo.direction}`);
            });
        });
        
        // Mini harita çiz
        drawMiniMap();
    } else {
        mapContent.innerHTML = '<div class="map-loading">Harita bilgileri yükleniyor...</div>';
    }
}

// Konum tipini Türkçeye çevir
function translateLocationType(type) {
    const typeTranslations = {
        'town': 'Şehir',
        'village': 'Köy',
        'dungeon': 'Zindan',
        'camp': 'Kamp',
        'quest': 'Görev',
        'vendor': 'Satıcı',
        'boss': 'Patron Canavar'
    };
    
    return typeTranslations[type] || type;
}

// Mini haritada konumu vurgula
function highlightLocationOnMap(x, y) {
    const canvas = document.getElementById('mini-map');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Haritayı tekrar çiz
    drawMiniMap();
    
    // Konumu vurgula
    ctx.beginPath();
    ctx.arc(x / gameScene.map.widthInPixels * canvas.width, y / gameScene.map.heightInPixels * canvas.height, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFCC33';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();
}

// İki nokta arası mesafe hesapla
function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Yön belirleme (8 yön)
    let direction = '';
    
    if (Math.abs(dx) > Math.abs(dy) * 2) {
        // Yatay
        direction = dx > 0 ? 'Doğu' : 'Batı';
    } else if (Math.abs(dy) > Math.abs(dx) * 2) {
        // Dikey
        direction = dy > 0 ? 'Güney' : 'Kuzey';
    } else {
        // Çapraz
        if (dx > 0 && dy > 0) direction = 'Güneydoğu';
        else if (dx > 0 && dy < 0) direction = 'Kuzeydoğu';
        else if (dx < 0 && dy > 0) direction = 'Güneybatı';
        else direction = 'Kuzeybatı';
    }
    
    return {
        distance: Math.round(distance),
        direction
    };
}

// Mini harita çiz
function drawMiniMap() {
    const canvas = document.getElementById('mini-map');
    if (!canvas || !gameScene || !gameScene.map) return;
    
    const ctx = canvas.getContext('2d');
    const mapWidth = gameScene.map.widthInPixels;
    const mapHeight = gameScene.map.heightInPixels;
    
    // Arkaplanı temizle
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Harita alanını çiz
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Duvarlar ve nesneleri çiz
    if (gameScene.objectsLayer && gameScene.objectsLayer.layer && gameScene.objectsLayer.layer.data) {
        const tileData = gameScene.objectsLayer.layer.data;
        const tileWidth = gameScene.map.tileWidth;
        const tileHeight = gameScene.map.tileHeight;
        
        for (let y = 0; y < tileData.length; y++) {
            for (let x = 0; x < tileData[y].length; x++) {
                const tile = tileData[y][x];
                if (tile && tile.collides) {
                    ctx.fillStyle = '#666666';
                    ctx.fillRect(
                        (x * tileWidth) / mapWidth * canvas.width, 
                        (y * tileHeight) / mapHeight * canvas.height, 
                        canvas.width / (mapWidth / tileWidth), 
                        canvas.height / (mapHeight / tileHeight)
                    );
                }
            }
        }
    }
    
    // Önemli konumları çiz
    if (gameScene.currentMap && gameScene.currentMap.locations) {
        gameScene.currentMap.locations.forEach(loc => {
            ctx.beginPath();
            ctx.arc(
                loc.x / mapWidth * canvas.width, 
                loc.y / mapHeight * canvas.height, 
                3, 0, 2 * Math.PI
            );
            
            // Konum tipine göre renk
            switch (loc.type) {
                case 'town':
                case 'village':
                    ctx.fillStyle = '#55cc55'; // Yeşil
                    break;
                case 'dungeon':
                case 'boss':
                    ctx.fillStyle = '#cc5555'; // Kırmızı
                    break;
                case 'quest':
                    ctx.fillStyle = '#cccc55'; // Sarı
                    break;
                default:
                    ctx.fillStyle = '#cccccc'; // Gri
            }
            
            ctx.fill();
        });
    }
    
    // Diğer oyuncuları çiz
    Object.values(gameState.players).forEach(player => {
        if (player.id !== selectedCharacter._id) {
            ctx.beginPath();
            ctx.arc(
                player.position.x / mapWidth * canvas.width, 
                player.position.y / mapHeight * canvas.height, 
                2, 0, 2 * Math.PI
            );
            ctx.fillStyle = '#55aaff'; // Mavi
            ctx.fill();
        }
    });
    
    // NPC'leri çiz
    Object.values(gameState.npcs).forEach(npc => {
        ctx.beginPath();
        ctx.arc(
            npc.position.x / mapWidth * canvas.width, 
            npc.position.y / mapHeight * canvas.height, 
            2, 0, 2 * Math.PI
        );
        ctx.fillStyle = '#ffaa55'; // Turuncu
        ctx.fill();
    });
    
    // Düşmanları çiz
    Object.values(gameState.mobs).forEach(mob => {
        ctx.beginPath();
        ctx.arc(
            mob.position.x / mapWidth * canvas.width, 
            mob.position.y / mapHeight * canvas.height, 
            2, 0, 2 * Math.PI
        );
        ctx.fillStyle = '#ff5555'; // Kırmızı
        ctx.fill();
    });
    
    // Oyuncuyu çiz
    if (gameScene.player) {
        ctx.beginPath();
        ctx.arc(
            gameScene.player.x / mapWidth * canvas.width, 
            gameScene.player.y / mapHeight * canvas.height, 
            4, 0, 2 * Math.PI
        );
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    }
}

// Ayarlar penceresini göster
function showSettings() {
    // Varolan pencereyi kaldır
    const existingPanel = document.getElementById('settings-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Ayarlar paneli oluştur
    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.className = 'game-window';
    
    panel.innerHTML = `
        <div class="window-header">
            <h3>Ayarlar</h3>
            <button class="close-button">&times;</button>
        </div>
        <div class="window-content settings-content">
            <div class="settings-section">
                <h4>Görsel</h4>
                <div class="setting-item">
                    <label for="quality-setting">Kalite:</label>
                    <select id="quality-setting">
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high" selected>Yüksek</option>
                    </select>
                </div>
                <div class="setting-item">
                    <label for="particles-setting">Efekt Parçacıkları:</label>
                    <select id="particles-setting">
                        <option value="off">Kapalı</option>
                        <option value="minimal">Az</option>
                        <option value="full" selected>Tam</option>
                    </select>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>Ses</h4>
                <div class="setting-item">
                    <label for="master-volume">Ana Ses:</label>
                    <input type="range" id="master-volume" min="0" max="100" value="100">
                    <span class="volume-value">100%</span>
                </div>
                <div class="setting-item">
                    <label for="music-volume">Müzik Sesi:</label>
                    <input type="range" id="music-volume" min="0" max="100" value="80">
                    <span class="volume-value">80%</span>
                </div>
                <div class="setting-item">
                    <label for="effects-volume">Efekt Sesi:</label>
                    <input type="range" id="effects-volume" min="0" max="100" value="90">
                    <span class="volume-value">90%</span>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>Oynanış</h4>
                <div class="setting-item">
                    <label for="camera-setting">Kamera Stili:</label>
                    <select id="camera-setting">
                        <option value="center" selected>Merkezde</option>
                        <option value="follow">Takip Et</option>
                        <option value="extended">Geniş Görüş</option>
                    </select>
                </div>
                <div class="setting-item checkbox">
                    <input type="checkbox" id="auto-attack-setting" checked>
                    <label for="auto-attack-setting">Otomatik Saldırı</label>
                </div>
                <div class="setting-item checkbox">
                    <input type="checkbox" id="show-damage-setting" checked>
                    <label for="show-damage-setting">Hasar Numaralarını Göster</label>
                </div>
                <div class="setting-item checkbox">
                    <input type="checkbox" id="show-names-setting" checked>
                    <label for="show-names-setting">İsimleri Göster</label>
                </div>
            </div>
            
            <div class="settings-section">
                <button id="save-settings" class="primary-button">Kaydet</button>
                <button id="default-settings" class="secondary-button">Varsayılana Sıfırla</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Ses ayarları değiştiğinde değer göster
    panel.querySelectorAll('input[type="range"]').forEach(input => {
        const valueDisplay = input.nextElementSibling;
        input.addEventListener('input', () => {
            valueDisplay.textContent = `${input.value}%`;
        });
    });
    
    // Kapat düğmesi olayı
    panel.querySelector('.close-button').addEventListener('click', () => {
        panel.remove();
    });
    
    // Ayarları kaydet düğmesi
    panel.querySelector('#save-settings').addEventListener('click', () => {
        saveGameSettings();
        panel.remove();
        addSystemMessage('Ayarlar kaydedildi.');
    });
    
    // Varsayılan ayarlar düğmesi
    panel.querySelector('#default-settings').addEventListener('click', () => {
        if (confirm('Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?')) {
            resetGameSettings();
            panel.remove();
            addSystemMessage('Ayarlar varsayılan değerlere sıfırlandı.');
        }
    });
}

// Oyun ayarlarını kaydet
function saveGameSettings() {
    const settings = {
        quality: document.getElementById('quality-setting').value,
        particles: document.getElementById('particles-setting').value,
        masterVolume: document.getElementById('master-volume').value,
        musicVolume: document.getElementById('music-volume').value,
        effectsVolume: document.getElementById('effects-volume').value,
        camera: document.getElementById('camera-setting').value,
        autoAttack: document.getElementById('auto-attack-setting').checked,
        showDamage: document.getElementById('show-damage-setting').checked,
        showNames: document.getElementById('show-names-setting').checked
    };
    
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // Oyun içinde ayarları uygula
    applyGameSettings(settings);
}

// Oyun ayarlarını varsayılana sıfırla
function resetGameSettings() {
    const defaultSettings = {
        quality: 'high',
        particles: 'full',
        masterVolume: 100,
        musicVolume: 80,
        effectsVolume: 90,
        camera: 'center',
        autoAttack: true,
        showDamage: true,
        showNames: true
    };
    
    localStorage.setItem('gameSettings', JSON.stringify(defaultSettings));
    
    // Oyun içinde ayarları uygula
    applyGameSettings(defaultSettings);
}

// Oyun ayarlarını uygula
function applyGameSettings(settings) {
    // Görsel ayarlar
    if (game) {
        // Kalite ayarları
        switch (settings.quality) {
            case 'low':
                game.scale.setGameSize(window.innerWidth / 2, window.innerHeight / 2);
                game.scale.setZoom(2);
                break;
            case 'medium':
                game.scale.setGameSize(window.innerWidth * 0.75, window.innerHeight * 0.75);
                game.scale.setZoom(1.33);
                break;
            case 'high':
                game.scale.setGameSize(window.innerWidth, window.innerHeight);
                game.scale.setZoom(1);
                break;
        }
        
        // Efekt parçacıkları
        if (gameScene) {
            gameScene.particleEffectsLevel = settings.particles;
        }
        
        // Kamera ayarları
        if (gameScene && gameScene.cameras.main) {
            switch (settings.camera) {
                case 'center':
                    gameScene.cameras.main.setFollowOffset(0, 0);
                    break;
                case 'follow':
                    gameScene.cameras.main.setFollowOffset(0, -50);
                    break;
                case 'extended':
                    gameScene.cameras.main.setZoom(0.8);
                    break;
            }
        }
    }
    
    // Ses ayarları
    if (game && game.sound) {
        game.sound.volume = settings.masterVolume / 100;
        
        // Müzik ve efektler için özel ses seviyesi ayarları
        // Not: Bunlar Phaser'ın ses gruplarını kullandığı varsayılarak yazılmıştır
        if (game.sound.musicSound) {
            game.sound.musicSound.volume = settings.musicVolume / 100;
        }
        
        if (game.sound.effectsSound) {
            game.sound.effectsSound.volume = settings.effectsVolume / 100;
        }
    }
    
    // Oynanış ayarları
    if (gameScene) {
        gameScene.autoAttack = settings.autoAttack;
        gameScene.showDamage = settings.showDamage;
        gameScene.showNames = settings.showNames;
    }
}

// Savaş efektini göster
function showCombatEffect(event) {
    if (!gameScene) return;
    
    // Efekt konumu
    let target;
    
    // Hedef tipine göre sprite bul
    if (event.targetType === 'player') {
        if (event.targetId === selectedCharacter._id) {
            target = gameScene.player;
        } else {
            target = gameScene.players.getChildren().find(p => p.id === event.targetId);
        }
    } else if (event.targetType === 'mob') {
        target = gameScene.monsters.getChildren().find(m => m.id === event.targetId);
    } else if (event.targetType === 'npc') {
        target = gameScene.npcs.getChildren().find(n => n.id === event.targetId);
    }
    
    if (!target) return;
    
    // Efekt tipine göre animasyon
    switch (event.type) {
        case 'damage':
            // Hasar efekti
            if (event.damageType === 'physical') {
                gameScene.addEffect('slash', target.x, target.y);
            } else {
                gameScene.addEffect('magic', target.x, target.y);
            }
            
            // Hedef flash efekti
            target.setTint(0xff0000);
            gameScene.time.delayedCall(100, () => {
                if (target.active) target.clearTint();
            });
            break;
        
        case 'heal':
            gameScene.addEffect('heal', target.x, target.y);
            target.setTint(0x00ff00);
            gameScene.time.delayedCall(100, () => {
                if (target.active) target.clearTint();
            });
            break;
        
        case 'buff':
            gameScene.addEffect('buff', target.x, target.y);
            target.setTint(0xffff00);
            gameScene.time.delayedCall(100, () => {
                if (target.active) target.clearTint();
            });
            break;
        
        case 'debuff':
            gameScene.addEffect('debuff', target.x, target.y);
            target.setTint(0x800080);
            gameScene.time.delayedCall(100, () => {
                if (target.active) target.clearTint();
            });
            break;
            
        case 'death':
            gameScene.addEffect('death', target.x, target.y);
            break;
    }
}

// Hasar numaralarını göster
function showDamageNumber(targetId, damage, isCritical = false) {
    if (!gameScene || !gameScene.showDamage) return;
    
    // Hedefi bul
    let target;
    
    // Oyuncular içinde ara
    if (targetId === selectedCharacter._id) {
        target = gameScene.player;
    } else {
        target = gameScene.players.getChildren().find(p => p.id === targetId);
    }
    
    // Bulunamazsa canavarlar içinde ara
    if (!target) {
        target = gameScene.monsters.getChildren().find(m => m.id === targetId);
    }
    
    // Bulunamazsa NPC'ler içinde ara
    if (!target) {
        target = gameScene.npcs.getChildren().find(n => n.id === targetId);
    }
    
    if (!target) return;
    
    // Hasar numarası oluştur
    const x = target.x;
    const y = target.y - 20; // Biraz yukarıda göster
    
    const style = {
        fontSize: isCritical ? '24px' : '16px',
        fontWeight: isCritical ? 'bold' : 'normal',
        fill: isCritical ? '#ff0000' : '#ffffff',
        stroke: '#000000',
        strokeThickness: 3
    };
    
    const damageText = gameScene.add.text(x, y, damage.toString(), style);
    damageText.setOrigin(0.5);
    
    // Animasyon: Yukarı doğru hareket ve kaybolma
    gameScene.tweens.add({
        targets: damageText,
        y: y - 30,
        alpha: 0,
        duration: 1500,
        ease: 'Power2',
        onComplete: function() {
            damageText.destroy();
        }
    });
}

// Varlığın ölümünü işle
function handleEntityDeath(entityId, entityType) {
    if (!gameScene) return;
    
    // Ölen varlığı bul
    let entity;
    
    switch (entityType) {
        case 'player':
            if (entityId === selectedCharacter._id) {
                entity = gameScene.player;
                handlePlayerDeath();
            } else {
                entity = gameScene.players.getChildren().find(p => p.id === entityId);
            }
            break;
        
        case 'mob':
            entity = gameScene.monsters.getChildren().find(m => m.id === entityId);
            break;
    }
    
    if (!entity) return;
    
    // Ölüm animasyonu ve efekti
    gameScene.addEffect('death', entity.x, entity.y);
    
    // Oyuncu değilse varlığı yok et
    if (entityType !== 'player' || entityId !== selectedCharacter._id) {
        entity.destroy();
    }
}

// Oyuncu ölümünü işle
function handlePlayerDeath() {
    // Oyuncu hareket ve etkileşimlerini devre dışı bırak
    gameScene.player.setTint(0x666666);
    gameScene.playerCanMove = false;
    
    // Ölüm panelini göster
    const deathPanel = document.createElement('div');
    deathPanel.className = 'death-panel';
    deathPanel.innerHTML = `
        <div class="death-message">Öldünüz!</div>
        <div class="respawn-info">Canlanmak için aşağıdaki seçeneklerden birini seçin:</div>
        <div class="respawn-options">
            <button id="respawn-town">Şehirde Canlan</button>
            <button id="respawn-spot">Öldüğün Yerde Canlan</button>
        </div>
        <div class="respawn-penalty">Şehirde canlanmak güvenlidir ancak ekipmanlarınız %10 hasar alır.</div>
        <div class="respawn-penalty">Öldüğün yerde canlanmak tehlikelidir ve %20 XP kaybına neden olur.</div>
    `;
    
    document.body.appendChild(deathPanel);
    
    // Canlanma seçenekleri için olaylar ekle
    document.getElementById('respawn-town').addEventListener('click', () => {
        socket.emit('respawn', { location: 'town' });
        deathPanel.remove();
    });
    
    document.getElementById('respawn-spot').addEventListener('click', () => {
        socket.emit('respawn', { location: 'spot' });
        deathPanel.remove();
    });
}

// NPC diyalog penceresini göster
function showNPCDialog(npcId, dialog) {
    // Varolan diyalog penceresini kaldır
    const existingDialog = document.getElementById('npc-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    const dialogPanel = document.createElement('div');
    dialogPanel.id = 'npc-dialog';
    dialogPanel.className = 'game-window';
    
    // NPC adı ve ilk mesajı
    dialogPanel.innerHTML = `
        <div class="window-header">
            <h3>${dialog.npcName}</h3>
            <button class="close-button">&times;</button>
        </div>
        <div class="window-content dialog-content">
            <div class="npc-portrait" style="background-image: url(${dialog.portrait || 'assets/images/npc/default.png'})"></div>
            <div class="dialog-text">${dialog.text}</div>
            <div class="dialog-options"></div>
        </div>
    `;
    
    document.body.appendChild(dialogPanel);
    
    // Dialog seçenekleri
    const optionsContainer = dialogPanel.querySelector('.dialog-options');
    
    dialog.options.forEach(option => {
        const optionButton = document.createElement('button');
        optionButton.className = 'dialog-option';
        optionButton.textContent = option.text;
        
        // Seçenek tıklama olayı
        optionButton.addEventListener('click', () => {
            if (option.action === 'close') {
                dialogPanel.remove();
            } else {
                // Sunucuya seçilen seçeneği bildir
                socket.emit('dialogOption', {
                    npcId,
                    optionId: option.id
                });
            }
        });
        
        optionsContainer.appendChild(optionButton);
    });
    
    // Kapat düğmesi olayı
    dialogPanel.querySelector('.close-button').addEventListener('click', () => {
        dialogPanel.remove();
    });
}

// Ticaret penceresini göster
function showTradeWindow(npcId, tradeData) {
    // Varolan ticaret penceresini kaldır
    const existingTradeWindow = document.getElementById('trade-window');
    if (existingTradeWindow) {
        existingTradeWindow.remove();
    }
    
    const tradePanel = document.createElement('div');
    tradePanel.id = 'trade-window';
    tradePanel.className = 'game-window';
    
    tradePanel.innerHTML = `
        <div class="window-header">
            <h3>${tradeData.npcName} - Ticaret</h3>
            <button class="close-button">&times;</button>
        </div>
        <div class="window-content trade-content">
            <div class="trade-tabs">
                <button class="trade-tab active" data-tab="buy">Satın Al</button>
                <button class="trade-tab" data-tab="sell">Sat</button>
            </div>
            <div class="trade-sections">
                <div id="buy-section" class="trade-section">
                    <div class="item-list">
                        <!-- Satın alınabilecek eşyalar buraya gelecek -->
                    </div>
                    <div class="item-details">
                        <div class="selected-item-info">
                            <p>Lütfen bir eşya seçin...</p>
                        </div>
                        <div class="purchase-controls hidden">
                            <div class="quantity-control">
                                <button class="dec-quantity">-</button>
                                <input type="number" id="buy-quantity" value="1" min="1" max="99">
                                <button class="inc-quantity">+</button>
                            </div>
                            <div class="total-cost">Toplam: <span id="total-cost">0</span> gold</div>
                            <button id="buy-button" class="trade-action-button">Satın Al</button>
                        </div>
                    </div>
                </div>
                <div id="sell-section" class="trade-section hidden">
                    <div class="item-list" id="sell-item-list">
                        <!-- Satılabilecek eşyalar buraya gelecek -->
                    </div>
                    <div class="item-details">
                        <div class="selected-item-info">
                            <p>Lütfen bir eşya seçin...</p>
                        </div>
                        <div class="sell-controls hidden">
                            <div class="quantity-control">
                                <button class="dec-quantity">-</button>
                                <input type="number" id="sell-quantity" value="1" min="1" max="1">
                                <button class="inc-quantity">+</button>
                            </div>
                            <div class="total-value">Toplam: <span id="total-value">0</span> gold</div>
                            <button id="sell-button" class="trade-action-button">Sat</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="player-gold">
                Altın: <span id="player-gold-amount">${selectedCharacter.gold || 0}</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(tradePanel);
    
    // Sekme değiştirme
    const tradeTabs = tradePanel.querySelectorAll('.trade-tab');
    tradeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Aktif sekme sınıfını değiştir
            tradeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // İlgili içeriği göster
            const tabName = tab.getAttribute('data-tab');
            const sections = tradePanel.querySelectorAll('.trade-section');
            sections.forEach(section => section.classList.add('hidden'));
            document.getElementById(`${tabName}-section`).classList.remove('hidden');
        });
    });
    
    // Satın alınabilecek eşyaları listele
    const buyItemList = tradePanel.querySelector('#buy-section .item-list');
    tradeData.items.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.setAttribute('data-item-id', item.id);
        
        itemElement.innerHTML = `
            <div class="item-icon" style="background-image: url(${getItemImageUrl(item)})"></div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">${item.price} gold</div>
        `;
        
        // Eşyaya tıklama olayı
        itemElement.addEventListener('click', () => {
            // Önceki seçili eşyaları temizle
            buyItemList.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
            // Bu eşyayı seç
            itemElement.classList.add('selected');
            
            // Eşya detaylarını göster
            showSelectedBuyItemDetails(item);
        });
        
        buyItemList.appendChild(itemElement);
    });
    
    // Satılabilecek eşyaları listele
    updateSellItemList(tradePanel, tradeData.buyRates);
    
    // Miktar kontrolleri
    setupQuantityControls(tradePanel);
    
    // Kapat düğmesi olayı
    tradePanel.querySelector('.close-button').addEventListener('click', () => {
        tradePanel.remove();
    });
}

// Satın alınacak eşya detaylarını göster
function showSelectedBuyItemDetails(item) {
    const detailsContainer = document.querySelector('.selected-item-info');
    const purchaseControls = document.querySelector('.purchase-controls');
    
    // Detayları doldur
    detailsContainer.innerHTML = createItemTooltipContent(item);
    
    // Satın alma kontrollerini göster
    purchaseControls.classList.remove('hidden');
    
    // Miktar ve toplam fiyatı ayarla
    document.getElementById('buy-quantity').value = 1;
    document.getElementById('total-cost').textContent = item.price;
    
    // Satın alma düğmesi olayı
    document.getElementById('buy-button').onclick = () => {
        const quantity = parseInt(document.getElementById('buy-quantity').value);
        buyItem(item.id, quantity);
    };
    
    // Miktar değiştiğinde fiyatı güncelle
    document.getElementById('buy-quantity').addEventListener('change', () => {
        const quantity = parseInt(document.getElementById('buy-quantity').value);
        document.getElementById('total-cost').textContent = item.price * quantity;
    });
}

// Satılabilecek eşya listesini güncelle
function updateSellItemList(tradePanel, buyRates) {
    const sellItemList = tradePanel.querySelector('#sell-item-list');
    sellItemList.innerHTML = '';
    
    // Envanterdeki satılabilir eşyaları listele
    const sellableItems = selectedCharacter.inventory.filter(item => !item.item.binding || item.item.binding !== 'soulbound');
    
    if (sellableItems.length === 0) {
        sellItemList.innerHTML = '<div class="no-items">Satılabilecek eşyan yok.</div>';
        return;
    }
    
    sellableItems.forEach(inventoryItem => {
        const item = inventoryItem.item;
        const sellValue = calculateSellValue(item, buyRates);
        
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.setAttribute('data-item-id', item._id);
        itemElement.setAttribute('data-slot', inventoryItem.slot);
        
        itemElement.innerHTML = `
            <div class="item-icon" style="background-image: url(${getItemImageUrl(item)})"></div>
            <div class="item-name">${item.name}</div>
            <div class="item-price">${sellValue} gold</div>
        `;
        
        if (inventoryItem.quantity > 1) {
            const quantity = document.createElement('div');
            quantity.className = 'item-quantity';
            quantity.textContent = inventoryItem.quantity;
            itemElement.appendChild(quantity);
        }
        
        // Eşyaya tıklama olayı
        itemElement.addEventListener('click', () => {
            // Önceki seçili eşyaları temizle
            sellItemList.querySelectorAll('.shop-item').forEach(el => el.classList.remove('selected'));
            // Bu eşyayı seç
            itemElement.classList.add('selected');
            
            // Eşya detaylarını göster
            showSelectedSellItemDetails(item, inventoryItem, sellValue);
        });
        
        sellItemList.appendChild(itemElement);
    });
}

// Satış değerini hesapla
function calculateSellValue(item, buyRates) {
    // Varsayılan oran %25
    let rate = 0.25;
    
    // Eşya tipine özel oran varsa kullan
    if (buyRates && buyRates[item.type]) {
        rate = buyRates[item.type];
    }
    
    // Nadir eşyalar için bonus oran
    if (item.rarity === 'rare') rate += 0.05;
    if (item.rarity === 'epic') rate += 0.1;
    if (item.rarity === 'legendary') rate += 0.15;
    
    return Math.floor(item.value * rate);
}

// Satılacak eşya detaylarını göster
function showSelectedSellItemDetails(item, inventoryItem, sellValue) {
    const detailsContainer = document.querySelector('.selected-item-info');
    const sellControls = document.querySelector('.sell-controls');
    
    // Detayları doldur
    detailsContainer.innerHTML = createItemTooltipContent(item);
    
    // Satış kontrollerini göster
    sellControls.classList.remove('hidden');
    
    // Miktar kontrolü
    const quantityInput = document.getElementById('sell-quantity');
    quantityInput.value = 1;
    quantityInput.max = inventoryItem.quantity;
    
    // Toplam değeri güncelle
    document.getElementById('total-value').textContent = sellValue;
    
    // Satış düğmesi olayı
    document.getElementById('sell-button').onclick = () => {
        const quantity = parseInt(quantityInput.value);
        sellItem(item._id, inventoryItem.slot, quantity);
    };
    
    // Miktar değiştiğinde değeri güncelle
    quantityInput.addEventListener('change', () => {
        const quantity = parseInt(quantityInput.value);
        document.getElementById('total-value').textContent = sellValue * quantity;
    });
}

// Miktar kontrollerini ayarla
function setupQuantityControls(panel) {
    // Azalt butonları
    panel.querySelectorAll('.dec-quantity').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.nextElementSibling;
            let value = parseInt(input.value) - 1;
            if (value < 1) value = 1;
            input.value = value;
            
            // Değişiklik olayını tetikle
            const event = new Event('change');
            input.dispatchEvent(event);
        });
    });
    
    // Artır butonları
    panel.querySelectorAll('.inc-quantity').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            let value = parseInt(input.value) + 1;
            if (value > parseInt(input.max)) value = parseInt(input.max);
            input.value = value;
            
            // Değişiklik olayını tetikle
            const event = new Event('change');
            input.dispatchEvent(event);
        });
    });
}

// Eşya satın al
function buyItem(itemId, quantity) {
    if (!socket) return;
    
    socket.emit('buyItem', {
        characterId: selectedCharacter._id,
        itemId: itemId,
        quantity: quantity
    });
}

// Eşya sat
function sellItem(itemId, slot, quantity) {
    if (!socket) return;
    
    socket.emit('sellItem', {
        characterId: selectedCharacter._id,
        itemId: itemId,
        slot: slot,
        quantity: quantity
    });
}

// Eşya alındı bildirimini göster
function showItemPickupNotification(item) {
    // Bildirim öğesi
    const notification = document.createElement('div');
    notification.className = 'item-pickup-notification';
    
    notification.innerHTML = `
        <div class="item-icon" style="background-image: url(${getItemImageUrl(item)})"></div>
        <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-pickup-text">Eşya toplandı</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animasyon: Yavaşça belir ve kaybol
    setTimeout(() => {
        notification.classList.add('show');
        
        // 3 saniye sonra kaldır
        setTimeout(() => {
            notification.classList.remove('show');
            
            // Animasyon bittikten sonra DOM'dan kaldır
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
            }, 500);
        }, 3000);
    }, 10);
}

// Başka oyuncunun eşya toplamasını göster
function showPlayerPickupIndicator(playerId, itemName) {
    // Oyuncuyu bul
    const playerEntity = gameScene.players.getChildren().find(p => p.id === playerId);
    if (!playerEntity) return;
    
    // Metin oluştur
    const style = { 
        fontSize: '14px', 
        fill: '#FFCC33', 
        stroke: '#000000',
        strokeThickness: 3
    };
    const text = gameScene.add.text(playerEntity.x, playerEntity.y - 40, `${itemName} topladı`, style);
    text.setOrigin(0.5);
    
    // Animasyon
    gameScene.tweens.add({
        targets: text,
        y: text.y - 30,
        alpha: 0,
        duration: 2000,
        ease: 'Power2',
        onComplete: function() {
            text.destroy();
        }
    });
}

// Eşya envantere ekle
function addItemToInventory(itemData) {
    // Envanterde boş slot bul veya aynı eşya varsa stack ekle
    let added = false;
    
    // Stacklanabilir eşya ise mevcut yığınları kontrol et
    if (itemData.stackable) {
        for (let i = 0; i < selectedCharacter.inventory.length; i++) {
            if (selectedCharacter.inventory[i].item._id === itemData._id) {
                // Aynı eşya bulundu, stack ekle
                selectedCharacter.inventory[i].quantity += 1;
                added = true;
                break;
            }
        }
    }
    
    // Eğer eşya eklenmediyse, boş slot bul
    if (!added) {
        // Boş slot bul
        let emptySlot = 0;
        while (selectedCharacter.inventory.some(item => item.slot === emptySlot)) {
            emptySlot++;
        }
        
        // Envantere ekle
        selectedCharacter.inventory.push({
            item: itemData,
            slot: emptySlot,
            quantity: 1
        });
    }
    
    // Envanter açıksa güncelle
    if (!uiWindows.inventory.classList.contains('hidden')) {
        updateInventory();
    }
}

// Eşya düşürme efektini göster
function showItemDropEffect(position) {
    if (!gameScene) return;
    
    // Efekt oluştur
    gameScene.addEffect('itemDrop', position.x, position.y);
    
    // Işık efekti
    const light = gameScene.add.pointlight(position.x, position.y, 0xffcc33, 50, 0.8);
    
    // Işık animasyonu
    gameScene.tweens.add({
        targets: light,
        radius: 70,
        duration: 300,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: () => {
            light.destroy();
        }
    });
}

// Level atlama bildirim penceresi göster
function showLevelUpNotification(level) {
    // Level atlama efekti (eğer karakter görünürse)
    if (gameScene && gameScene.player) {
        gameScene.addEffect('levelUp', gameScene.player.x, gameScene.player.y);
    }
    
    // Level atlama bildirimi
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    
    notification.innerHTML = `
        <div class="level-up-header">
            <div class="level-up-icon"></div>
            <div class="level-up-title">Seviye Atladın!</div>
        </div>
        <div class="level-up-content">
            <div class="new-level">Seviye ${level}</div>
            <div class="level-up-rewards">
                <p>Kazanımlar:</p>
                <ul>
                    <li>Sağlık ve Mana yenilendi</li>
                    <li>5 yeni stat puanı</li>
                    <li>Yeni yetenek puanları</li>
                </ul>
            </div>
        </div>
        <button class="level-up-close">Tamam</button>
    `;
    
    document.body.appendChild(notification);
    
    // Kapat düğmesi olayı
    notification.querySelector('.level-up-close').addEventListener('click', () => {
        notification.remove();
    });
    
    // 10 saniye sonra otomatik kapat
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.remove();
        }
    }, 10000);
}
