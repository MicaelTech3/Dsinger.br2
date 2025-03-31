// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAo12uC5EM7t4_nocYhfOdTY15men1Ping",
    authDomain: "dsigner-com-br.firebaseapp.com",
    databaseURL: "https://dsigner-com-br-default-rtdb.firebaseio.com",
    projectId: "dsigner-com-br",
    storageBucket: "dsigner-com-br.appspot.com",
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
                    <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDQuNUM2LjUgNC41IDIgNy41IDIgMTJzNC41IDcuPSAxMCA3LjVjNS41IDAgMTAtMyAxMC03LjUtNC41LTcuNS0xMC03LjUtMTAuNXptMCAxMi41Yy0zLjggMC03LjItMi42LTguOS01LjUgMS43LTIuOSA1LjEtNS41IDguOS01LjVzNy4yIDIuNiA4LjkgNS41LTEuNyAyLjktNS4xIDUuNS04LjkuNXptMC0xMC41YzIuNSAwIDQuNSAyIDQuNSA0LjVzLTIgNC41LTQuNSA0LjUtNC41LTItNC41LTQuNSAyLTQuNSA0LjUtNC41eiIvPjwvc3ZnPg==" width="14" height="14">
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

const uploadMediaToStorage = async (file, tvId) => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const storageRef = storage.ref(`tv_media/${tvId}/${fileName}`);
        
        const progressBar = document.querySelector('.progress-bar');
        progressBar.style.width = '0%';
        showToast(`Enviando: 0%`, 'info');
        
        const uploadTask = storageRef.put(file);
        
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
        
        await uploadTask;
        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
        return downloadURL;
    } catch (error) {
        console.error("Erro no upload:", error);
        throw error;
    }
};

async function sendTextMessage(tvId, messageData) {
    const tv = tvs.find(t => t.id === tvId);
    if (!tv) return false;

    const mediaData = {
        type: 'text',
        content: messageData.text,
        color: messageData.color,
        bgColor: messageData.bgColor,
        fontSize: messageData.fontSize,
        timestamp: new Date()
    };

    tv.media = mediaData;
    saveLocalData();

    if (isOnline()) {
        try {
            await db.collection('tvs').doc(tvId).update({
                media: mediaData,
                lastUpdate: new Date()
            });

            if (tv.activationKey) {
                await db.collection('notifications').add({
                    tvId: tvId,
                    activationKey: tv.activationKey,
                    type: 'media',
                    mediaData: mediaData,
                    timestamp: new Date()
                });
            }

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

function displayTextMessage(content, color, bgColor, fontSize) {
    const modal = document.getElementById('view-media-modal');
    const container = document.getElementById('media-container');
    
    container.innerHTML = `
        <div class="text-message" style="
            padding: 20px;
            background: ${bgColor || '#2a2f5b'};
            border-radius: 10px;
            color: ${color || 'white'};
            font-size: ${fontSize || 24}px;
            max-width: 80%;
            margin: 0 auto;
            text-align: center;
        ">
            ${content}
        </div>
    `;
    
    modal.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando configuração...');
    updateConnectionStatus();
    window.addEventListener('online', () => {
        updateConnectionStatus();
        syncWithFirebase();
    });
    window.addEventListener('offline', updateConnectionStatus);

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

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
            document.getElementById(link.dataset.section).classList.add('active');
        });
    });

    document.getElementById('dskey-btn-header').addEventListener('click', () => {
        window.location.href = 'Dskey.html';
    });

    const categoryModal = document.getElementById('category-modal');
    document.querySelector('.select-categories-btn').addEventListener('click', () => {
        console.log('Abrindo modal de categorias');
        categoryModal.style.display = 'block';
        updateCategoryList();
    });
    document.querySelector('#category-modal .close-btn').addEventListener('click', () => {
        categoryModal.style.display = 'none';
    });

    document.getElementById('add-category-btn').addEventListener('click', async () => {
        const name = document.getElementById('new-category-name').value.trim();
        if (!name) {
            showToast('Digite um nome para o andar', 'error');
            return;
        }

        const newId = (categories.length ? Math.max(...categories.map(c => parseInt(c.id))) + 1 : 1).toString();
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

    document.addEventListener('click', e => {
        const uploadBtn = e.target.closest('.upload-tv-btn');
        if (uploadBtn) {
            const tvId = uploadBtn.dataset.id;
            currentMediaTv = tvs.find(t => t.id === tvId);
            const modal = document.getElementById('upload-media-modal');
            modal.style.display = 'block';
            document.getElementById('upload-media-btn').dataset.tvId = tvId;

            document.getElementById('media-file').value = '';
            document.getElementById('media-link').value = '';
            document.getElementById('text-content').value = '';
            document.getElementById('image-duration').value = '10';
            document.getElementById('video-loop').checked = false;
            document.getElementById('text-color').value = '#ffffff';
            document.getElementById('text-bg-color').value = '#1a1f3b';
            document.getElementById('text-size').value = '24';
            document.querySelector('.progress-bar').style.width = '0%';
            document.getElementById('media-preview').style.display = 'none';

            const mediaTypeSelect = document.getElementById('media-type');
            const fileGroup = document.getElementById('file-upload-group');
            const linkGroup = document.getElementById('link-upload-group');
            const textGroup = document.getElementById('text-options');
            const imageOptions = document.getElementById('image-options');
            const videoOptions = document.getElementById('video-options');

            mediaTypeSelect.addEventListener('change', () => {
                const type = mediaTypeSelect.value;
                fileGroup.style.display = type === 'image' || type === 'video' ? 'block' : 'none';
                linkGroup.style.display = type === 'link' ? 'block' : 'none';
                textGroup.style.display = type === 'text' ? 'block' : 'none';
                imageOptions.style.display = type === 'image' ? 'block' : 'none';
                videoOptions.style.display = type === 'video' ? 'block' : 'none';
            });

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

    document.querySelector('#upload-media-modal .close-btn').addEventListener('click', () => {
        document.getElementById('upload-media-modal').style.display = 'none';
    });

    document.getElementById('upload-media-btn').addEventListener('click', async () => {
        const tvId = document.getElementById('upload-media-btn').dataset.tvId;
        const mediaType = document.getElementById('media-type').value;
        const tv = tvs.find(t => t.id === tvId);
        
        let mediaData = {};
        
        try {
            if (mediaType === 'text') {
                const content = document.getElementById('text-content').value.trim();
                if (!content) {
                    showToast('Digite o conteúdo do texto!', 'error');
                    return;
                }
                
                mediaData = {
                    type: 'text',
                    content: content,
                    color: document.getElementById('text-color').value,
                    bgColor: document.getElementById('text-bg-color').value,
                    fontSize: document.getElementById('text-size').value,
                    timestamp: new Date()
                };
            } 
            else if (mediaType === 'image' || mediaType === 'video') {
                const file = document.getElementById('media-file').files[0];
                if (!file) {
                    showToast('Selecione um arquivo', 'error');
                    return;
                }
                
                if (file.size > 10 * 1024 * 1024) {
                    showToast('Arquivo muito grande (máx. 10MB)', 'error');
                    return;
                }
                
                showToast('Iniciando upload...', 'info');
                const mediaUrl = await uploadMediaToStorage(file, tvId);
                
                mediaData = {
                    type: mediaType,
                    url: mediaUrl,
                    timestamp: new Date()
                };
                
                if (mediaType === 'image') {
                    mediaData.duration = parseInt(document.getElementById('image-duration').value) || 10;
                } else if (mediaType === 'video') {
                    mediaData.loop = document.getElementById('video-loop').checked;
                }
            }
            else if (mediaType === 'link') {
                const mediaUrl = document.getElementById('media-link').value.trim();
                if (!mediaUrl) {
                    showToast('Digite uma URL válida', 'error');
                    return;
                }
                
                const isVideo = mediaUrl.match(/\.(mp4|webm|ogg)$/i);
                
                mediaData = {
                    type: isVideo ? 'video' : 'image',
                    url: mediaUrl,
                    timestamp: new Date()
                };
            }

            tv.media = mediaData;
            saveLocalData();
            
            if (isOnline()) {
                await db.collection('tvs').doc(tvId).update({ 
                    media: mediaData,
                    lastUpdate: new Date()
                });
                
                if (tv.activationKey) {
                    await db.collection('notifications').add({
                        tvId: tvId,
                        activationKey: tv.activationKey,
                        type: 'media',
                        mediaData: mediaData,
                        timestamp: new Date()
                    });
                }
            }
            
            showToast('Conteúdo enviado com sucesso!', 'success');
            document.getElementById('upload-media-modal').style.display = 'none';
            document.getElementById('media-file').value = '';
            
        } catch (error) {
            console.error("Erro no envio:", error);
            showToast('Falha no envio do conteúdo', 'error');
        }
    });

    document.addEventListener('click', e => {
        const viewBtn = e.target.closest('.view-tv-btn');
        if (viewBtn) {
            const tvId = viewBtn.dataset.id;
            const tv = tvs.find(t => t.id === tvId);
            if (!tv.media) {
                showToast('Nenhuma mídia enviada para esta TV', 'info');
                return;
            }
            if (!isOnline() && !tv.media.url && !tv.media.content) {
                showToast('Conecte-se para visualizar a mídia', 'error');
                return;
            }

            const modal = document.getElementById('view-media-modal');
            const container = document.getElementById('media-container');
            container.innerHTML = '';

            if (tv.media.type === 'text') {
                displayTextMessage(
                    tv.media.content,
                    tv.media.color,
                    tv.media.bgColor,
                    tv.media.fontSize
                );
            } else if (tv.media.type === 'image') {
                const img = document.createElement('img');
                img.src = tv.media.url;
                img.style.maxWidth = '100%';
                container.appendChild(img);
                
                const info = document.createElement('div');
                info.className = 'media-info';
                info.innerHTML = `
                    <p>Duração: ${tv.media.duration || 10} segundos</p>
                    <p>Enviado em: ${new Date(tv.media.timestamp).toLocaleString()}</p>
                `;
                container.appendChild(info);
            } else if (tv.media.type === 'video') {
                const video = document.createElement('video');
                video.src = tv.media.url;
                video.controls = true;
                video.loop = tv.media.loop || false;
                video.style.maxWidth = '100%';
                video.autoplay = true;
                container.appendChild(video);
                
                const info = document.createElement('div');
                info.className = 'media-info';
                info.innerHTML = `
                    <p>Loop: ${tv.media.loop ? 'Sim' : 'Não'}</p>
                    <p>Enviado em: ${new Date(tv.media.timestamp).toLocaleString()}</p>
                `;
                container.appendChild(info);
            }

            modal.style.display = 'block';
        }
    });
    document.querySelector('#view-media-modal .close-btn').addEventListener('click', () => {
        document.getElementById('view-media-modal').style.display = 'none';
    });

    // MODAL DE INFORMAÇÕES COM EDIÇÃO MANUAL DA CHAVE
    document.addEventListener('click', e => {
        const infoBtn = e.target.closest('.info-tv-btn');
        if (infoBtn) {
            console.log('Botão de informações clicado');
            const tvId = infoBtn.dataset.id;
            const tv = tvs.find(t => t.id === tvId);
            
            if (!tv) {
                console.error('TV não encontrada com ID:', tvId);
                showToast('TV não encontrada', 'error');
                return;
            }
            
            const modal = document.getElementById('activation-info-modal');
            if (!modal) {
                console.error('Modal de informações não encontrado no DOM');
                return;
            }
            
            // Preenche as informações
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
            
            // Limpa e adiciona os elementos de edição
            const keyContainer = document.getElementById('activation-key-container');
            keyContainer.innerHTML = '';
            
            // Cria input para edição da chave
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.id = 'activation-key-input';
            keyInput.value = tv.activationKey || '';
            keyInput.placeholder = 'Cole a nova chave aqui';
            keyInput.className = 'key-input';
            
            // Cria botão para salvar
            const saveKeyBtn = document.createElement('button');
            saveKeyBtn.className = 'btn save-key-btn';
            saveKeyBtn.textContent = 'Salvar Chave';
            
            saveKeyBtn.onclick = async () => {
                const newKey = keyInput.value.trim();
                
                if (!newKey) {
                    showToast('Digite ou cole uma chave válida', 'error');
                    return;
                }
                
                if (!confirm('Tem certeza que deseja atualizar a chave de ativação?')) {
                    return;
                }
                
                tv.activationKey = newKey;
                tv.lastActivation = new Date();
                tv.deviceName = `Dispositivo ${tv.id}`;
                
                saveLocalData();
                
                if (isOnline()) {
                    try {
                        await db.collection('tvs').doc(tvId).update({
                            activationKey: newKey,
                            lastActivation: new Date(),
                            deviceName: `Dispositivo ${tv.id}`
                        });
                        
                        if (newKey) {
                            await db.collection('notifications').add({
                                tvId: tvId,
                                activationKey: newKey,
                                type: 'activation',
                                tvData: tv,
                                timestamp: new Date()
                            });
                        }
                        
                        showToast('Chave atualizada com sucesso!', 'success');
                        document.getElementById('activation-key-info').textContent = newKey;
                        document.getElementById('activation-device-info').textContent = `Dispositivo ${tv.id}`;
                        document.getElementById('activation-last-info').textContent = new Date().toLocaleString();
                    } catch (error) {
                        console.error("Erro ao atualizar chave:", error);
                        showToast('Chave atualizada localmente', 'info');
                    }
                } else {
                    showToast('Chave atualizada localmente (offline)', 'info');
                }
            };
            
            keyContainer.appendChild(keyInput);
            keyContainer.appendChild(saveKeyBtn);
            
            modal.style.display = 'block';
        }
    });
    
    document.querySelector('#activation-info-modal .close-btn').addEventListener('click', () => {
        document.getElementById('activation-info-modal').style.display = 'none';
    });

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

    document.getElementById('logout-link').addEventListener('click', e => {
        e.preventDefault();
        auth.signOut().then(() => window.location.href = 'index.html');
    });

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

    document.addEventListener('click', e => {
        const floorBtn = e.target.closest('.floor-btn');
        if (floorBtn && !e.target.closest('.action-btn')) {
            selectedCategoryId = floorBtn.dataset.id;
            console.log('Categoria selecionada:', selectedCategoryId);
            updateCategoryList();
            updateTvGrid();
        }
    });

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
    
    document.querySelector('#text-message-modal .close-btn').addEventListener('click', () => {
        document.getElementById('text-message-modal').style.display = 'none';
    });
});