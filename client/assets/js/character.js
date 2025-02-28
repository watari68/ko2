// character.js - Karakter yönetimi ve karakter ekranı işlemleri

const CHARACTER_API_URL = '/api/characters';
let characters = [];
let selectedCharacter = null;

// Karakter listesini yükler
async function loadCharacters() {
    try {
        const response = await fetch(CHARACTER_API_URL, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Karakterler yüklenemedi');
        }
        
        characters = await response.json();
        renderCharacterList();
    } catch (error) {
        console.error('Karakter yükleme hatası:', error);
    }
}

// Karakter listesini gösterir
function renderCharacterList() {
    const characterListElement = document.getElementById('character-list');
    characterListElement.innerHTML = '';
    
    if (characters.length === 0) {
        characterListElement.innerHTML = '<p class="no-characters">Henüz bir karakterin yok. Yeni bir karakter oluştur!</p>';
        return;
    }
    
    characters.forEach(character => {
        const characterElement = document.createElement('div');
        characterElement.classList.add('character-card');
        characterElement.innerHTML = `
            <div class="character-portrait ${character.class}"></div>
            <div class="character-info">
                <h3>${character.name}</h3>
                <div class="character-details">
                    <span class="char-class">${translateClass(character.class)}</span>
                    <span class="char-level">Seviye ${character.level}</span>
                </div>
                <div class="character-last-login">Son Giriş: ${formatDate(character.lastPlayed)}</div>
            </div>
        `;
        
        characterElement.addEventListener('click', () => selectCharacter(character));
        characterListElement.appendChild(characterElement);
    });
    
    // Karakter oluşturma butonunu ayarla
    document.getElementById('create-character-button').addEventListener('click', showCharacterCreation);
}

// Karakter sınıfının Türkçe karşılığını döndürür
function translateClass(characterClass) {
    const classTranslations = {
        'warrior': 'Savaşçı',
        'archer': 'Okçu',
        'mage': 'Büyücü',
        'priest': 'Rahip'
    };
    
    return classTranslations[characterClass] || characterClass;
}

// Tarihi formatlı gösterir
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR') + ' ' + date.toLocaleTimeString('tr-TR');
}

// Karakter seçildiğinde çağrılır
function selectCharacter(character) {
    selectedCharacter = character;
    
    // Oyun ekranını göster ve karakteri yükle
    document.getElementById('character-selection').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    
    // Oyun başlat
    startGame(character);
}

// Karakter oluşturma ekranını gösterir
function showCharacterCreation() {
    document.getElementById('character-selection').classList.add('hidden');
    document.getElementById('character-creation').classList.remove('hidden');
    
    // Sınıf seçimi için event listener ekle
    const classOptions = document.querySelectorAll('.class-option');
    classOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Önceki seçilmiş sınıfı temizle
            classOptions.forEach(o => o.classList.remove('selected'));
            // Yeni sınıfı seç
            option.classList.add('selected');
        });
    });
    
    // Geri butonunu ayarla
    document.getElementById('back-to-selection').addEventListener('click', () => {
        document.getElementById('character-creation').classList.add('hidden');
        document.getElementById('character-selection').classList.remove('hidden');
    });
    
    // Karakter oluşturma butonunu ayarla
    document.getElementById('create-character').addEventListener('click', createCharacter);
}

// Yeni karakter oluşturur
async function createCharacter() {
    const characterName = document.getElementById('character-name').value;
    const selectedClassElement = document.querySelector('.class-option.selected');
    
    if (!characterName) {
        alert('Lütfen bir karakter adı girin.');
        return;
    }
    
    if (!selectedClassElement) {
        alert('Lütfen bir sınıf seçin.');
        return;
    }
    
    const characterClass = selectedClassElement.getAttribute('data-class');
    
    try {
        const response = await fetch(CHARACTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                name: characterName,
                class: characterClass
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Karakter oluşturulurken bir hata oluştu');
        }
        
        const newCharacter = await response.json();
        characters.push(newCharacter);
        
        // Karakter seçim ekranına geri dön ve listeyi güncelle
        document.getElementById('character-creation').classList.add('hidden');
        showCharacterSelection();
    } catch (error) {
        alert(error.message);
    }
}

// Karakter detaylarını günceller
function updateCharacterUI(character) {
    // Karakter penceresi
    document.getElementById('char-name').textContent = character.name;
    document.getElementById('char-class').textContent = translateClass(character.class);
    document.getElementById('char-level').textContent = `Seviye ${character.level}`;
    
    // Statlar
    document.getElementById('stat-strength').textContent = character.stats.strength;
    document.getElementById('stat-dexterity').textContent = character.stats.dexterity;
    document.getElementById('stat-intelligence').textContent = character.stats.intelligence;
    
    const totalAttack = calculateTotalAttack(character);
    const totalDefense = calculateTotalDefense(character);
    
    document.getElementById('stat-attack').textContent = totalAttack;
    document.getElementById('stat-defense').textContent = totalDefense;
    
    // Statbar'lar
    updateStatBars(character);
}

// Karakter toplam saldırı değerini hesaplar
function calculateTotalAttack(character) {
    let base = character.stats.strength;
    
    // Sınıfa göre farklı stat katkısı
    switch (character.class) {
        case 'warrior':
            base += character.stats.strength * 1.5;
            break;
        case 'archer':
            base += character.stats.dexterity * 1.5;
            break;
        case 'mage':
            base += character.stats.intelligence * 1.5;
            break;
        case 'priest':
            base += character.stats.intelligence * 1.2;
            break;
    }
    
    // Ekipmanların katkısı
    // Not: Bu kısım, ekipmanlara sahip olduğumuzda genişletilebilir
    
    return Math.floor(base);
}

// Karakter toplam savunma değerini hesaplar
function calculateTotalDefense(character) {
    let base = 5; // Temel savunma
    
    // Sınıfa göre farklı stat katkısı
    switch (character.class) {
        case 'warrior':
            base += character.stats.strength * 0.5;
            break;
        case 'archer':
            base += character.stats.dexterity * 0.3;
            break;
        case 'mage':
            base += character.stats.intelligence * 0.2;
            break;
        case 'priest':
            base += character.stats.intelligence * 0.3;
            break;
    }
    
    // Ekipmanların katkısı
    // Not: Bu kısım, ekipmanlara sahip olduğumuzda genişletilebilir
    
    return Math.floor(base);
}

// Stat bar'ları günceller
function updateStatBars(character) {
    // Can barı
    const healthBar = document.querySelector('.health-bar .stat-fill');
    const healthText = document.querySelector('.health-bar .stat-text');
    const healthPercent = (character.stats.currentHealth / character.stats.health) * 100;
    healthBar.style.width = `${healthPercent}%`;
    healthText.textContent = `${character.stats.currentHealth}/${character.stats.health}`;
    
    // Mana barı
    const manaBar = document.querySelector('.mana-bar .stat-fill');
    const manaText = document.querySelector('.mana-bar .stat-text');
    const manaPercent = (character.stats.currentMana / character.stats.mana) * 