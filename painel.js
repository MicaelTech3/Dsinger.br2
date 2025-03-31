// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAo12uC5EM7t4_nocYhfOdTY15men1Ping",
    authDomain: "dsigner-com-br.firebaseapp.com",
    databaseURL: "https://dsigner-com-br-default-rtdb.firebaseio.com",
    projectId: "dsigner-com-br",
    storageBucket: "dsigner-com-br.firebasestorage.app",
    messagingSenderId: "905799758619",
    appId: "1:905799758619:web:713beeced2de2cdd7f19be"
};

// Inicialização com tratamento de offline
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    
    const firestoreSettings = {
        cache: {
            sizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        },
        experimentalForceLongPolling: true
    };
    
    firebase.firestore().settings(firestoreSettings);
    
    // Ativa persistência
    firebase.firestore().enablePersistence()
        .catch(err => {
            console.error("Erro na persistência offline:", err);
        });
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

let categories = JSON.parse(localStorage.getItem('dsigner_categories')) || [];
let tvs = JSON.parse(localStorage.getItem('dsigner_tvs')) || [];
let selectedCategoryId = null;
let currentMediaTv = null;

const isOnline = () => navigator.onLine;

const saveLocalData = () => {
    localStorage.setItem('dsigner_categories', JSON.stringify(categories));
    localStorage.setItem('dsigner_tvs', JSON.stringify(tvs));
    console.log('Dados salvos localmente:', { categories, tvs });
};

const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2700);
};

const updateConnectionStatus = () => {
    let statusElement = document.getElementById('connection-status');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'connection-status';
        document.body.appendChild(statusElement);
    }
    statusElement.textContent = isOnline() ? '✔ Online' : '⚡ Offline - Modo Local';
    statusElement.style.backgroundColor = isOnline() ? '#4CAF50' : '#FF9800';
    statusElement.style.color = 'white';
};

const syncWithFirebase = async () => {
    if (!isOnline()) return;

    try {
        console.log('Iniciando sincronização...');
        const [categoriesSnapshot, tvsSnapshot] = await Promise.all([
            db.collection('categories').get(),
            db.collection('tvs').get()
        ]);

        const remoteCategories = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const remoteTvs = tvsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        categories = [...new Set([...remoteCategories, ...categories].map(c => JSON.stringify(c)))].map(c => JSON.parse(c));
        for (const cat of categories) {
            if (!remoteCategories.some(rc => rc.id === cat.id)) {
                await db.collection('categories').doc(cat.id).set(cat);
            }
        }

        tvs = [...new Set([...remoteTvs, ...tvs].map(t => JSON.stringify(t)))].map(t => JSON.parse(t));
        for (const tv of tvs) {
            if (!remoteTvs.some(rt => rt.id === tv.id)) {
                await db.collection('tvs').doc(tv.id).set(tv);
            }
        }
        async function sendTextMessage(tvId, messageData) {
            const tv = tvs.find(t => t.id === tvId);
            if (!tv) return;
        
            tv.media = {
                type: 'text',
                content: messageData.text,
                color: messageData.color,
                bgColor: messageData.bgColor,
                fontSize: messageData.fontSize,
                timestamp: new Date()
            };
        
            saveLocalData();
        
            if (isOnline()) {
                try {
                    await db.collection('tvs').doc(tvId).update({
                        media: tv.media
                    });
                    showToast('Mensagem enviada com sucesso!', 'success');
                    return true;
                } catch (error) {
                    console.error("Erro ao enviar mensagem:", error);
                    showToast('Erro ao enviar. Mensagem salva localmente.', 'error');
                    return false;
                }
            } else {
                showToast('Mensagem salva localmente (offline)', 'info');
                return false;
            }
        }
        
        // Event Listeners para texto
        document.addEventListener('click', e => {
            const textBtn = e.target.closest('.send-text-btn');
            if (textBtn) {
                const tvId = textBtn.dataset.id;
                document.getElementById('text-message-modal').style.display = 'block';
                document.getElementById('send-text-btn').dataset.tvId = tvId;
                document.getElementById('text-message-content').value = '';
            }
        });
        
        document.getElementById('send-text-btn').addEventListener('click', async function() {
            const tvId = this.dataset.tvId;
            const message = document.getElementById('text-message-content').value.trim();
            
            if (!message) {
                showToast('Digite uma mensagem!', 'error');
                return;
            }
        
            const messageData = {
                text: message,
                color: document.getElementById('text-color').value,
                bgColor: document.getElementById('bg-color').value,
                fontSize: document.getElementById('text-size').value
            };
        
            await sendTextMessage(tvId, messageData);
            document.getElementById('text-message-modal').style.display = 'none';
        });
        
        // Modifique a função de visualização para texto
        function displayMediaContent(tv) {
            const container = document.getElementById('media-container');
            container.innerHTML = '';
        
            if (!tv.media) return;
        
            if (tv.media.type === 'text') {
                container.innerHTML = `
                    <div class="text-display" style="
                        color: ${tv.media.color || '#ffffff'};
                        background: ${tv.media.bgColor || '#1a1f3b'};
                        font-size: ${tv.media.fontSize || 24}px;
                        padding: 20px;
                        border-radius: 10px;
                        width: 80%;
                        margin: 0 auto;
                        text-align: center;
                    ">
                        ${tv.media.content}
                    </div>
                    <div class="text-info" style="
                        font-size: 12px;
                        color: #ccc;
                        text-align: right;
                        margin-top: 10px;
                    ">
                        Enviado em: ${new Date(tv.media.timestamp).toLocaleString()}
                    </div>
                `;
            } else if (tv.media.type === 'image') {
                // ... (código existente para imagens)
            } else if (tv.media.type === 'video') {
                // ... (código existente para vídeos)
            }
        }async function sendContentToTV(tvId, content) {
            const tvRef = db.collection('tvs').doc(tvId);
            
            try {
                await tvRef.update({
                    media: content,
                    lastUpdate: new Date()
                });
                showToast('Conteúdo enviado com sucesso!', 'success');
                return true;
            } catch (error) {
                console.error("Erro ao enviar conteúdo:", error);
                
                // Fallback offline
                const tv = tvs.find(t => t.id === tvId);
                if (tv) {
                    tv.media = content;
                    saveLocalData();
                    showToast('Conteúdo salvo localmente (offline)', 'info');
                }
                return false;
            }
        }
        saveLocalData();
        updateCategoryList();
        updateTvGrid();
        showToast('Sincronização concluída', 'success');
    } catch (error) {
        console.error('Erro na sincronização:', error);
        showToast('Erro na sincronização. Usando dados locais.', 'error');
    }
};

const updateCategoryList = () => {
    const floorList = document.querySelector('.floor-list');
    if (!floorList) return console.error('floor-list não encontrado');

    const button = floorList.querySelector('.select-categories-btn');
    floorList.innerHTML = '';
    if (button) floorList.appendChild(button);

    categories.forEach(category => {
        const floorItem = document.createElement('div');
        floorItem.className = 'floor-item';
        floorItem.dataset.categoryId = category.id;
        floorItem.innerHTML = `
            <button class="floor-btn ${selectedCategoryId === category.id ? 'active' : ''}" data-id="${category.id}">
                <span>${category.name}</span>
                <div class="floor-actions">
                    <button class="action-btn edit-floor-btn" data-id="${category.id}" title="Editar">
                        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTMgMTcuMjVWMjFoMy43NUwxNy44MSA5Ljk0bC0zLjc1LTMuNzVMMyAxNy4yNXpNMjAuNzEgNy4wNGMuMzktLjM5LjM5LTEuMDIgMC0xLjQxbC0yLjM0LTIuMzRjLS4zOS0uMzktMS4wMi0uMzktMS40MSAwbC0xLjgzIDEuODMgMy43NSAzLjc1IDEuODMtMS44M3oiLz48L3N2Zz4=" width="14" height="14" alt="Editar">
                    </button>
                    <button class="action-btn delete-btn delete-floor-btn" data-id="${category.id}" title="Excluir">
                        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTYgMTlhMiAyIDAgMCAwIDIgMmg4YTIgMiAwIDAgMCAyLTJWN0g2djEyTTE5IDRIMTUuNWwtMS0xaC05bC0xIDFINHYyaDE2VjR6Ii8+PC9zdmc+" width="14" height="14" alt="Excluir">
                    </button>
                </div>
            </button>
        `;
        floorList.insertBefore(floorItem, button);
    });

    const tvCategorySelect = document.getElementById('tv-category');
    if (tvCategorySelect) {
        tvCategorySelect.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    }
    console.log('Lista de categorias atualizada:', categories);
};

const updateTvGrid = () => {
    const tvGrid = document.getElementById('tv-grid');
    if (!tvGrid) return console.error('tv-grid não encontrado');

    tvGrid.innerHTML = '';
    const filteredTvs = selectedCategoryId ? tvs.filter(tv => tv.categoryId === selectedCategoryId) : tvs;

    if (filteredTvs.length === 0) {
        tvGrid.innerHTML = '<div class="no-items">Nenhuma TV encontrada</div>';
        return;
    }

    filteredTvs.forEach(tv => {
        const category = categories.find(c => c.id === tv.categoryId);
        const gridItem = document.createElement('div');
        gridItem.className = `grid-item ${tv.status === 'off' ? 'offline' : ''}`;
        gridItem.dataset.tvId = tv.id;
        gridItem.innerHTML = `
            <div class="tv-status">${tv.status === 'off' ? 'OFF' : 'ON'}</div>
            <span>${tv.name}</span>
            <small>${category?.name || 'Sem categoria'}</small>
            ${tv.activationKey ? '<div class="activation-badge">Ativada</div>' : ''}
            <div class="tv-actions">
                <button class="tv-action-btn toggle-tv-btn" data-id="${tv.id}" title="${tv.status === 'off' ? 'Ligar' : 'Desligar'}">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEzIDNoLTJ2MTBoMlYzem03IDhoLTRjLTEuMS0yLjQtMi41LTQuOC00LTYgMS4zLTEuMyAyLjYtMi4yIDQtMyAyLjIgMS4zIDMuNSAzIDQgNXoiLz48L3N2Zz4=" width="14" height="14">
                </button>
                <button class="tv-action-btn view-tv-btn" data-id="${tv.id}" title="Ver Mídia">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDQuNUM2LjUgNC41IDIgNy41IDIgMTJzNC41IDcuNSAxMCA3LjVjNS41IDAgMTAtMyAxMC03LjUtNC41LTcuNS0xMC03LjUtMTAuNXptMCAxMi41Yy0zLjggMC03LjItMi42LTguOS01LjUgMS43LTIuOSA1LjEtNS41IDguOS01LjVzNy4yIDIuNiA4LjkgNS41LTEuNyAyLjktNS4xIDUuNS04LjkuNXptMC0xMC41YzIuNSAwIDQuNSAyIDQuNSA0LjVzLTIgNC41LTQuNSA0LjUtNC41LTItNC41LTQuNSAyLTQuNSA0LjUtNC41eiIvPjwvc3ZnPg==" width="14" height="14">
                </button>
                <button class="tv-action-btn upload-tv-btn" data-id="${tv.id}" title="Enviar mídia">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTkgMTZoNnYtNmg0bC03LTctNyA3aDR6bS00IDJoMTR2Mkg1eiIvPjwvc3ZnPg==" width="14" height="14">
                </button>
                <button class="tv-action-btn info-tv-btn" data-id="${tv.id}" title="Informações">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTExIDE3aDJ2LTZoLTJ2NnptMS0xNUM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bTAtMTRjLTIuMjEgMC00IDEuNzktNCA0aDJjMC0xLjEuOS0yIDItMnMyIC45IDIgMmMwIDItMyAxLjc1LTMgNWgyYzAtMi4yNSAzLTIuNSAzLTUgMC0yLjIxLTEuNzktNC00LTR6Ii8+PC9zdmc+" width="14" height="14">
                </button>
                <button class="tv-action-btn delete-tv-btn" data-id="${tv.id}" title="Excluir">
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTYgMTlhMiAyIDAgMCAwIDIgMmg4YTIgMiAwIDAgMCAyLTJWN0g2djEyTTE5IDRIMTUuNWwtMS0xaC05bC0xIDFINHYyaDE2VjR6Ii8+PC9zdmc+" width="14" height="14">
                </button>
            </div>
        `;
        tvGrid.appendChild(gridItem);
    });
};

// Função para upload de mídia com Firebase Storage
const uploadMediaToStorage = async (file, tvId) => {
    try {
        // Cria referência no Storage com nome único
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const storageRef = storage.ref(`tv_media/${tvId}/${fileName}`);
        
        // Mostra progresso
        const progressBar = document.querySelector('.progress-bar');
        progressBar.style.width = '0%';
        showToast(`Enviando: 0%`, 'info');
        
        // Faz upload
        const uploadTask = storageRef.put(file);
        
        // Monitora progresso
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.style.width = `${progress}%`;
                showToast(`Enviando: ${Math.round(progress)}%`, 'info');
            },
            (error) => {
                console.error("Erro no upload:", error);
                showToast('Falha no upload', 'error');
            }
        );
        
        // Aguarda conclusão
        await uploadTask;
        
        // Obtém URL de download
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        return downloadURL;
    } catch (error) {
        console.error("Erro no upload:", error);
        throw error;
    }
};

// Evento quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando configuração...');
    updateConnectionStatus();
    window.addEventListener('online', () => {
        updateConnectionStatus();
        syncWithFirebase();
    });
    window.addEventListener('offline', updateConnectionStatus);

    // Verifica autenticação
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('support-email').value = user.email;
        if (isOnline()) syncWithFirebase();
        else showToast('Modo offline ativado', 'info');
        updateCategoryList();
        updateTvGrid();
    });

    // Navegação entre seções
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            document.getElementById(link.dataset.section).classList.add('active');
        });
    });

    // Botão DSKey
    document.getElementById('dskey-btn-header').addEventListener('click', () => {
        window.location.href = 'Dskey.html';
    });

    // Modal de categorias
    const categoryModal = document.getElementById('category-modal');
    document.querySelector('.select-categories-btn').addEventListener('click', () => {
        console.log('Abrindo modal de categorias');
        categoryModal.style.display = 'block';
        updateCategoryList();
    });
    document.querySelector('#category-modal .close-btn').addEventListener('click', () => {
        categoryModal.style.display = 'none';
    });

    // Adicionar categoria
    document.getElementById('add-category-btn').addEventListener('click', async () => {
        const name = document.getElementById('new-category-name').value.trim();
        if (!name) {
            showToast('Digite um nome para o andar', 'error');
            return;
        }

        
        const newCategory = { id: newId, name, status: 'active' };
        console.log('Adicionando categoria:', newCategory);

        categories.push(newCategory);
        saveLocalData();

        if (isOnline()) {
            try {
                await db.collection('categories').doc(newId).set(newCategory);
                showToast('Andar adicionado!', 'success');
            } catch (err) {
                console.error('Erro ao adicionar categoria no Firebase:', err);
                showToast('Salvo localmente', 'info');
            }
        } else {
            showToast('Salvo localmente', 'info');
        }

        document.getElementById('new-category-name').value = '';
        updateCategoryList();
        categoryModal.style.display = 'none';
    });

    // Editar categoria
    document.addEventListener('click', e => {
        const editBtn = e.target.closest('.edit-floor-btn');
        if (editBtn) {
            const catId = editBtn.dataset.id;
            const category = categories.find(c => c.id === catId);
            const modal = document.getElementById('edit-floor-modal');
            document.getElementById('edit-floor-name').value = category.name;
            document.getElementById('save-floor-btn').dataset.id = catId;
            modal.style.display = 'block';
            console.log('Abrindo modal de edição para categoria:', catId);
        }
    });
    document.querySelector('#edit-floor-modal .close-btn').addEventListener('click', () => {
        document.getElementById('edit-floor-modal').style.display = 'none';
    });
    document.getElementById('save-floor-btn').addEventListener('click', async () => {
        const catId = document.getElementById('save-floor-btn').dataset.id;
        const newName = document.getElementById('edit-floor-name').value.trim();
        if (!newName) {
            showToast('Digite um nome válido', 'error');
            return;
        }

        const categoryIndex = categories.findIndex(c => c.id === catId);
        categories[categoryIndex].name = newName;
        saveLocalData();

        if (isOnline()) {
            try {
                await db.collection('categories').doc(catId).update({ name: newName });
                showToast('Andar atualizado', 'success');
            } catch (err) {
                console.error('Erro ao atualizar categoria:', err);
                showToast('Atualizado localmente', 'info');
            }
        } else {
            showToast('Atualizado localmente', 'info');
        }

        updateCategoryList();
        document.getElementById('edit-floor-modal').style.display = 'none';
    });

    // Excluir categoria
    document.addEventListener('click', async e => {
        const deleteBtn = e.target.closest('.delete-floor-btn');
        if (deleteBtn) {
            if (!confirm('Tem certeza que deseja excluir este andar? Todas as TVs serão removidas.')) return;
            const catId = deleteBtn.dataset.id;
            console.log('Deletando categoria:', catId);

            categories = categories.filter(c => c.id !== catId);
            tvs = tvs.filter(tv => tv.categoryId !== catId);
            saveLocalData();

            if (isOnline()) {
                const batch = db.batch();
                batch.delete(db.collection('categories').doc(catId));
                tvs.filter(tv => tv.categoryId === catId).forEach(tv => batch.delete(db.collection('tvs').doc(tv.id)));
                try {
                    await batch.commit();
                    showToast('Andar e TVs removidos', 'success');
                } catch (err) {
                    console.error('Erro ao remover no Firebase:', err);
                    showToast('Removido localmente', 'info');
                }
            } else {
                showToast('Removido localmente', 'info');
            }

            updateCategoryList();
            updateTvGrid();
        }
    });

    // Adicionar TV
    const addTvModal = document.getElementById('add-tv-modal');
    document.querySelector('.add-tv-btn').addEventListener('click', () => {
        console.log('Abrindo modal de adicionar TV');
        addTvModal.style.display = 'block';
        updateCategoryList();
    });
    document.querySelector('#add-tv-modal .close-btn').addEventListener('click', () => {
        addTvModal.style.display = 'none';
    });
    document.getElementById('add-tv-submit-btn').addEventListener('click', async () => {
        const name = document.getElementById('tv-name').value.trim();
        const categoryId = document.getElementById('tv-category').value;
        const activationKey = document.getElementById('tv-activation-key').value.trim();
        
        if (!name || !categoryId) {
            showToast('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        const newId = (tvs.length ? Math.max(...tvs.map(t => parseInt(t.id))) + 1 : 1).toString();
        const newTv = { 
            id: newId, 
            name, 
            categoryId, 
            status: 'on',
            activationKey: activationKey || null,
            deviceName: activationKey ? `Dispositivo ${newId}` : null,
            lastActivation: activationKey ? new Date() : null
        };
        console.log('Adicionando TV:', newTv);

        tvs.push(newTv);
        saveLocalData();

        if (isOnline()) {
            try {
                await db.collection('tvs').doc(newId).set(newTv);
                showToast('TV adicionada!', 'success');
                
                if (activationKey) {
                    await db.collection('notifications').add({
                        tvId: newId,
                        activationKey: activationKey,
                        type: 'activation',
                        tvData: newTv,
                        timestamp: new Date()
                    });
                }
            } catch (err) {
                console.error('Erro ao adicionar TV no Firebase:', err);
                showToast('Salva localmente', 'info');
            }
        } else {
            showToast('Salva localmente', 'info');
        }

        document.getElementById('tv-name').value = '';
        document.getElementById('tv-activation-key').value = '';
        addTvModal.style.display = 'none';
        updateTvGrid();
    });

    // Alternar status da TV
    document.addEventListener('click', async e => {
        const toggleBtn = e.target.closest('.toggle-tv-btn');
        if (toggleBtn) {
            const tvId = toggleBtn.dataset.id;
            const tv = tvs.find(t => t.id === tvId);
            tv.status = tv.status === 'off' ? 'on' : 'off';
            saveLocalData();

            if (isOnline()) {
                try {
                    await db.collection('tvs').doc(tvId).update({ status: tv.status });
                    showToast(`TV ${tv.status === 'off' ? 'desligada' : 'ligada'}`, 'success');
                    
                    if (tv.activationKey) {
                        await db.collection('notifications').add({
                            tvId: tvId,
                            activationKey: tv.activationKey,
                            type: 'status',
                            value: tv.status,
                            timestamp: new Date()
                        });
                    }
                } catch (err) {
                    console.error('Erro ao atualizar status:', err);
                    showToast('Alteração salva localmente', 'info');
                }
            }

            updateTvGrid();
        }
    });

    // Upload de mídia
    document.addEventListener('click', e => {
        const uploadBtn = e.target.closest('.upload-tv-btn');
        if (uploadBtn) {
            const tvId = uploadBtn.dataset.id;
            currentMediaTv = tvs.find(t => t.id === tvId);
            const modal = document.getElementById('upload-media-modal');
            modal.style.display = 'block';
            document.getElementById('upload-media-btn').dataset.tvId = tvId;

            // Reset do formulário
            document.getElementById('media-file').value = '';
            document.getElementById('media-link').value = '';
            document.getElementById('image-duration').value = '10';
            document.getElementById('video-loop').checked = false;
            document.querySelector('.progress-bar').style.width = '0%';
            document.getElementById('media-preview').style.display = 'none';

            // Mostra/oculta campos conforme tipo de mídia
            const mediaTypeSelect = document.getElementById('media-type');
            const fileGroup = document.getElementById('file-upload-group');
            const linkGroup = document.getElementById('link-upload-group');
            const imageOptions = document.getElementById('image-options');
            const videoOptions = document.getElementById('video-options');

            mediaTypeSelect.addEventListener('change', () => {
                const type = mediaTypeSelect.value;
                fileGroup.style.display = type === 'link' ? 'none' : 'block';
                linkGroup.style.display = type === 'link' ? 'block' : 'none';
                imageOptions.style.display = type === 'image' ? 'block' : 'none';
                videoOptions.style.display = type === 'video' ? 'block' : 'none';
            });

            // Pré-visualização de imagem
            document.getElementById('media-file').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const preview = document.getElementById('media-preview');
                        preview.src = event.target.result;
                        preview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                } else {
                    document.getElementById('media-preview').style.display = 'none';
                }
            });
        }
    });

    // Fechar modal de upload
    document.querySelector('#upload-media-modal .close-btn').addEventListener('click', () => {
        document.getElementById('upload-media-modal').style.display = 'none';
    });

    // Enviar mídia
    document.getElementById('upload-media-btn').addEventListener('click', async () => {
        const tvId = document.getElementById('upload-media-btn').dataset.tvId;
        const mediaType = document.getElementById('media-type').value;
        const tv = tvs.find(t => t.id === tvId);
        
        let mediaUrl, mediaConfig = {};
        
        try {
            if (mediaType === 'link') {
                // Lógica para links externos
                mediaUrl = document.getElementById('media-link').value.trim();
                if (!mediaUrl) {
                    showToast('Digite uma URL válida', 'error');
                    return;
                }
                mediaConfig.type = mediaUrl.includes('.mp4') ? 'video' : 'image';
            } else {
                // Upload para Firebase Storage
                const file = document.getElementById('media-file').files[0];
                if (!file) {
                    showToast('Selecione um arquivo', 'error');
                    return;
                }
                
                // Verifica tamanho máximo (10MB)
                if (file.size > 10 * 1024 * 1024) {
                    showToast('Arquivo muito grande (máx. 10MB)', 'error');
                    return;
                }
                
                showToast('Iniciando upload...', 'info');
                mediaUrl = await uploadMediaToStorage(file, tvId);
                mediaConfig.type = mediaType;
            }
            
            // Configurações específicas
            if (mediaConfig.type === 'image') {
                mediaConfig.duration = parseInt(document.getElementById('image-duration').value) || 10;
            } else if (mediaConfig.type === 'video') {
                mediaConfig.loop = document.getElementById('video-loop').checked;
            }
            
            // Atualiza dados da TV
            tv.media = { url: mediaUrl, ...mediaConfig };
            saveLocalData();
            
            // Sincroniza com Firestore
            if (isOnline()) {
                await db.collection('tvs').doc(tvId).update({ media: tv.media });
                
                // Envia notificação para dispositivo
                if (tv.activationKey) {
                    await db.collection('notifications').add({
                        tvId: tvId,
                        activationKey: tv.activationKey,
                        type: 'media',
                        mediaUrl: mediaUrl,
                        mediaConfig: mediaConfig,
                        timestamp: new Date()
                    });
                }
            }
            
            showToast('Mídia enviada com sucesso!', 'success');
            document.getElementById('upload-media-modal').style.display = 'none';
            document.getElementById('media-file').value = '';
            
        } catch (error) {
            console.error("Erro no upload:", error);
            showToast('Falha no envio da mídia', 'error');
        }
    });

    // Controle de imagem existente
    document.addEventListener('click', e => {
        if (e.target.closest('.upload-tv-btn')) {
            const tvId = e.target.closest('.upload-tv-btn').dataset.id;
            currentMediaTv = tvs.find(t => t.id === tvId);
            
            if (currentMediaTv.media?.url) {
                document.getElementById('current-image-preview').src = currentMediaTv.media.url;
                document.getElementById('image-duration-control').value = currentMediaTv.media.duration || 10;
                document.getElementById('image-control-modal').style.display = 'block';
            }
        }
    });

    // Atualizar duração da imagem
    document.getElementById('update-image-btn').addEventListener('click', async () => {
        if (!currentMediaTv) return;
        
        const duration = parseInt(document.getElementById('image-duration-control').value) || 10;
        
        // Atualiza localmente
        currentMediaTv.media.duration = duration;
        saveLocalData();
        
        // Sincroniza com Firebase se online
        if (isOnline()) {
            try {
                await db.collection('tvs').doc(currentMediaTv.id).update({
                    'media.duration': duration
                });
                showToast('Duração atualizada!', 'success');
            } catch (error) {
                console.error("Erro ao atualizar duração:", error);
                showToast('Atualizado localmente', 'info');
            }
        }
        
        document.getElementById('image-control-modal').style.display = 'none';
    });

    // Alterar imagem existente
    document.getElementById('change-image-btn').addEventListener('click', () => {
        document.getElementById('image-control-modal').style.display = 'none';
        document.getElementById('upload-media-modal').style.display = 'block';
        document.getElementById('upload-media-btn').dataset.tvId = currentMediaTv.id;
    });

    // Fechar modal de controle de imagem
    document.querySelector('#image-control-modal .close-btn').addEventListener('click', () => {
        document.getElementById('image-control-modal').style.display = 'none';
    });

    // Ver mídia
    document.addEventListener('click', e => {
        const viewBtn = e.target.closest('.view-tv-btn');
        if (viewBtn) {
            const tvId = viewBtn.dataset.id;
            const tv = tvs.find(t => t.id === tvId);
            if (!tv.media || !tv.media.url) {
                showToast('Nenhuma mídia enviada para esta TV', 'info');
                return;
            }
            if (!isOnline() && !tv.media.url.startsWith('data:')) {
                showToast('Conecte-se para visualizar a mídia', 'error');
                return;
            }

            const modal = document.getElementById('view-media-modal');
            const container = document.getElementById('media-container');
            container.innerHTML = '';

            if (tv.media.type === 'image') {
                const img = document.createElement('img');
                img.src = tv.media.url;
                img.style.maxWidth = '100%';
                container.appendChild(img);
            } else if (tv.media.type === 'video') {
                const video = document.createElement('video');
                video.src = tv.media.url;
                video.controls = true;
                video.loop = tv.media.loop || false;
                video.style.maxWidth = '100%';
                video.autoplay = true;
                container.appendChild(video);
            }

            modal.style.display = 'block';
        }
    });
    document.querySelector('#view-media-modal .close-btn').addEventListener('click', () => {
        document.getElementById('view-media-modal').style.display = 'none';
    });

    // Informações de ativação
    document.addEventListener('click', e => {
        const infoBtn = e.target.closest('.info-tv-btn');
        if (infoBtn) {
            const tvId = infoBtn.dataset.id;
            const tv = tvs.find(t => t.id === tvId);
            
            const modal = document.getElementById('activation-info-modal');
            document.getElementById('activation-key-info').textContent = tv.activationKey || 'Não ativada';
            document.getElementById('activation-device-info').textContent = tv.deviceName || 'Desconhecido';
            
            if (tv.lastActivation) {
                const lastActivation = tv.lastActivation.seconds ? 
                    new Date(tv.lastActivation.seconds * 1000) : 
                    new Date(tv.lastActivation);
                document.getElementById('activation-last-info').textContent = lastActivation.toLocaleString();
            } else {
                document.getElementById('activation-last-info').textContent = 'Nunca';
            }
            
            modal.style.display = 'block';
        }
    });
    document.querySelector('#activation-info-modal .close-btn').addEventListener('click', () => {
        document.getElementById('activation-info-modal').style.display = 'none';
    });

    // Excluir TV
    document.addEventListener('click', async e => {
        const deleteBtn = e.target.closest('.delete-tv-btn');
        if (deleteBtn) {
            if (!confirm('Tem certeza que deseja excluir esta TV?')) return;
            const tvId = deleteBtn.dataset.id;
            console.log('Deletando TV:', tvId);

            tvs = tvs.filter(t => t.id !== tvId);
            saveLocalData();

            if (isOnline()) {
                try {
                    await db.collection('tvs').doc(tvId).delete();
                    showToast('TV removida', 'success');
                } catch (err) {
                    console.error('Erro ao remover TV no Firebase:', err);
                    showToast('Removida localmente', 'info');
                }
            } else {
                showToast('Removida localmente', 'info');
            }

            updateTvGrid();
        }
    });

    // Logout
    document.getElementById('logout-link').addEventListener('click', e => {
        e.preventDefault();
        auth.signOut().then(() => window.location.href = 'index.html');
    });

    // Formulário de suporte
    document.getElementById('support-form').addEventListener('submit', async e => {
        e.preventDefault();
        if (!isOnline()) {
            showToast('Conecte-se para enviar o chamado', 'error');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const formData = new FormData(e.target);
        try {
            const response = await fetch('https://formspree.io/f/xyzedylg', {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) throw new Error('Erro no servidor');
            document.getElementById('support-message').textContent = 'Chamado enviado com sucesso!';
            document.getElementById('support-message').className = 'message success';
            e.target.reset();
            showToast('Chamado enviado!', 'success');
        } catch (error) {
            document.getElementById('support-message').textContent = `Erro ao enviar: ${error.message}`;
            document.getElementById('support-message').className = 'message error';
            showToast('Falha ao enviar chamado', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Enviar Chamado';
        }
    });

    // Selecionar categoria
    document.addEventListener('click', e => {
        const floorBtn = e.target.closest('.floor-btn');
        if (floorBtn && !e.target.closest('.action-btn')) {
            selectedCategoryId = floorBtn.dataset.id;
            console.log('Categoria selecionada:', selectedCategoryId);
            updateCategoryList();
            updateTvGrid();
        }
    });

    // Adicione esta função ao seu painel.js para lidar com mensagens de texto
function displayTextMessage(content) {
    const modal = document.getElementById('view-media-modal');
    const container = document.getElementById('media-container');
    
    container.innerHTML = `
        <div class="text-message" style="
            padding: 20px;
            background: #2a2f5b;
            border-radius: 10px;
            color: white;
            font-size: 24px;
            max-width: 80%;
            margin: 0 auto;
            text-align: center;
        ">
            ${content}
        </div>
    `;
    
    modal.style.display = 'block';
}

// Modifique a função de visualização de mídia no painel.js
document.addEventListener('click', e => {
    const viewBtn = e.target.closest('.view-tv-btn');
    if (viewBtn) {
        const tvId = viewBtn.dataset.id;
        const tv = tvs.find(t => t.id === tvId);
        
        if (!tv.media) {
            showToast('Nenhuma mídia enviada para esta TV', 'info');
            return;
        }

        const modal = document.getElementById('view-media-modal');
        const container = document.getElementById('media-container');
        container.innerHTML = '';

        if (tv.media.type === 'text') {
            displayTextMessage(tv.media.content);
        } else if (tv.media.type === 'image') {
            // Código existente para imagens...
        } else if (tv.media.type === 'video') {
            // Código existente para vídeos...
        }

        modal.style.display = 'block';
    }
});
});