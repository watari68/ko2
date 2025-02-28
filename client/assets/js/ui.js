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
        
        if (item.stats.attack > 0) content += `<div>Saldırı: ${item.stats.attack