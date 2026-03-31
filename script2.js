document.addEventListener('DOMContentLoaded', () => {
    // TEMPLATES HTML (sem alterações)
    const FULL_CAROUSEL_TEMPLATE = `
    <!-- ===== CARROSSEL GERADO: {gallery_title} ===== -->
    <div id="{carousel_id}">
        <h2 class="text-2xl md:text-3xl font-bold text-center mb-4">{gallery_title}</h2>
        <div class="carousel-container w-full cursor-grab">
            <div class="carousel-slides flex">
{items_html}
            </div>
            <button class="prev-button absolute top-1/2 left-4 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-3 text-white focus:outline-none transition-all duration-300 ease-in-out hover:bg-opacity-70 hover:scale-110 z-30" title="Anterior (←)"></button>
            <button class="next-button absolute top-1/2 right-4 transform -translate-y-1/2 bg-black bg-opacity-50 rounded-full p-3 text-white focus:outline-none transition-all duration-300 ease-in-out hover:bg-opacity-70 hover:scale-110 z-30" title="Próximo (→)"></button>
        </div>
        <div class="mt-3 h-10 flex items-center">
            <div class="carousel-summary-container">
                <div class="summary-inner-wrapper"></div>
            </div>
        </div>
    </div>`;
    const VIDEO_ITEM_TEMPLATE = `
                <div class="carousel-item w-full flex-shrink-0" data-type="video" data-title="{title}">
                    <div class="content-wrapper">
                        <div class="theme-overlay"></div>
                        <div class="video-title p-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent control-shadow"></div>
                        <div class="carousel-pagination control-shadow"></div>
                        {comment_html}
                        <div class="media-container">
                        <video preload="auto" playsinline><source src="{media_path}" type="video/mp4"></video></div>
                        <div class="custom-controls p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                            <div style="display: flex; justify-content: flex-end; gap: 8px; width: 100%;">
                            {download_button_html}
                            {comment_icon_html}
                            </div>
                            <div class="progress-bar-container relative mb-2"><input type="range" class="progress-bar w-full" value="0" min="0" max="100" step="0.1"><div class="timeline-thumbnail"><canvas></canvas></div></div>
                            <div class="controles flex items-center justify-between">
                                <div class="flex items-center gap-2"><button class="play-pause-btn control-shadow" title="Play/Pause (Espaço, K)"></button><div class="volume-control flex items-center gap-2"><button class="volume-btn control-shadow" title="Mute/Unmute (M)"></button><input type="range" class="volume-slider" min="0" max="1" step="0.01" value="1"></div><span class="time-display text-sm control-shadow">00:00 / 00:00</span></div><div class="fit-mode-toggle flex-grow mx-2"></div>
                                <div class="r-controls flex items-center gap-2"><button class="speed-btn font-bold text-center control-shadow" title="Velocidade (V)"></button><button class="playback-mode-btn control-shadow"></button><div class="relative flex items-center ml-[-4px]"><button class="share-btn control-shadow" title="Compartilhar Slide"></button><span class="share-tooltip">Link copiado!</span></div><button class="fullscreen-btn control-shadow" title="Tela Cheia (F)"></button></div>
                            </div>
                        </div>
                    </div>
                </div>`;
    const IMAGE_ITEM_TEMPLATE = `
                <div class="carousel-item w-full flex-shrink-0" data-type="image" data-title="{title}">
                    <div class="content-wrapper">
                        <div class="theme-overlay"></div>
                        <div class="video-title p-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent control-shadow"></div>
                        <div class="carousel-pagination control-shadow"></div>
                        {comment_html}
                        <div class="media-container">
                        <img src="{media_path}" alt="{title}" decoding="async"></div>
                        <div class="custom-controls p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                            {comment_icon_html}
                            <div class="flex items-center justify-end w-full gap-2">{download_button_html}<div class="relative flex items-center"><button class="share-btn control-shadow" title="Compartilhar Slide"></button><span class="share-tooltip">Link copiado!</span></div><button class="fullscreen-btn control-shadow" title="Tela Cheia (F)"></button></div>
                        </div>
                    </div>
                </div>`;
    const COMMENT_ICON_HTML = `<button class="comment-icon control-shadow" title="Ver comentário"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 12H5v-2h14v2zm0-3H5V9h14v2zm0-3H5V6h14v2z"></path></svg></button>`;
    const COMMENT_BOX_HTML = `<div class="comment-box text-sm"><button class="close-comment-btn"title="Fechar comentário" style="position:absolute;top:8px;right:8px;font-size:1.2em;background:none;border:none;color:#fff;z-index:10;cursor:pointer;">&times;</button><h5 class="font-bold mb-2">Nota</h5><p>{comment_text}</p></div>`;
    const DOWNLOAD_BUTTON_HTML = `<a href="{download_path}" download class="download-btn control-shadow" title="Baixar anexo"><span class="download-btn-label" style="vertical-align:middle;">Baixar anexo</span></a>`;
    
    const galleriesContainer = document.getElementById('galleries-container');
    const addGalleryBtn = document.getElementById('add-gallery-btn');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadJsBtn = document.getElementById('download-js-btn');
    const outputCode = document.getElementById('output-code');
    const luquinhasTipsContainer = document.getElementById('luquinhas-tips-container');
    const addLuquinhasTipBtn = document.getElementById('add-luquinhas-tip-btn');
    let galleryCounter = 0;

    // --- UTILITIES ---
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    // Centralized generator used manually or automatically
    function generateAll() {
        let finalHtml = "";
        let carouselIndex = 1;
        galleriesContainer.querySelectorAll('section').forEach(gallery => {
            const galleryTitle = gallery.dataset.galleryTitle;
            let itemsHtml = "";
            const cards = gallery.querySelectorAll('.file-card');
            if (cards.length === 0) return;
            cards.forEach(card => {
                if (card.classList.contains('add-media-card') || !card.dataset.mediaName) return;
                const titleEl = card.querySelector('.data-title');
                const commentEl = card.querySelector('.data-comment');
                const title = titleEl ? titleEl.value : '';
                const commentText = commentEl ? commentEl.value : '';
                const mediaName = card.dataset.mediaName;
                const downloadName = card.dataset.downloadName;
                const mediaPath = `media/${encodeURIComponent(mediaName)}`;
                let comment_html = "", comment_icon_html = "", download_button_html = "";
                if (commentText.trim()) {
                    comment_html = COMMENT_BOX_HTML.replace('{comment_text}', commentText);
                    comment_icon_html = COMMENT_ICON_HTML;
                }
                if (downloadName) {
                    const downloadPath = `media/${encodeURIComponent(downloadName)}`;
                    download_button_html = DOWNLOAD_BUTTON_HTML.replace('{download_path}', downloadPath);
                }
                const template = mediaName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? IMAGE_ITEM_TEMPLATE : VIDEO_ITEM_TEMPLATE;
                itemsHtml += `\n` + template.replace(/{title}/g, title).replace(/{media_path}/g, mediaPath).replace('{comment_html}', comment_html).replace('{comment_icon_html}', comment_icon_html).replace('{download_button_html}', download_button_html).trim();
            });
            finalHtml += FULL_CAROUSEL_TEMPLATE.replace(/{gallery_title}/g, galleryTitle).replace('{carousel_id}', `carousel-${carouselIndex}`).replace('{items_html}', itemsHtml) + "\n\n";
            carouselIndex++;
        });

        const luquinhasTips = [];
        document.querySelectorAll('.luquinhas-tip-input').forEach(input => {
            if (input.value.trim()) {
                luquinhasTips.push(input.value.trim());
            }
        });

        if (luquinhasTips.length > 0) {
            const tipsJson = JSON.stringify(luquinhasTips).replace(/"/g, '&quot;');
            const luquinhasSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><circle cx="50" cy="50" r="45" fill="white" stroke="black" stroke-width="3"/><circle cx="35" cy="40" r="5" fill="black"/><circle cx="65" cy="40" r="5" fill="black"/><path d="M30 65 Q 50 80 70 65" stroke="black" stroke-width="3" fill="none"/></svg>`;
            const mascotHtml = `
    <!-- Mascot Luquinhas (Coloque este bloco fora do container principal, diretamente no body) -->
    <div id="luquinhas-mascot" data-tips='${tipsJson}' title="Prof. Luquinhas">
        <div class="luquinhas-body">
            ${luquinhasSvg}
            <div class="luquinhas-counter"></div>
        </div>
        <div class="luquinhas-bubble">
            <button class="close-bubble-btn" title="Fechar">&times;</button>
            <p class="bubble-text"></p>
        </div>
    </div>`;
            finalHtml = mascotHtml + '\n\n' + finalHtml;
        }

        outputCode.value = finalHtml.trim();
    }

    function createEmptyGallery() {
        galleryCounter++;
        const defaultName = `Galeria: Nova ${galleryCounter}`;
        galleriesContainer.insertAdjacentHTML('beforeend', renderGallerySection({id: galleryCounter, title: defaultName}, galleryCounter));
        const section = galleriesContainer.lastElementChild;
        // adiciona o card de adicionar mídia vazio
        const previewContainer = section.querySelector('.items-preview');
        const addCard = document.createElement('div');
        addCard.className = 'file-card add-media-card';
        addCard.style.minHeight = '180px';
        addCard.innerHTML = `
            <div class="add-card-inner">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <div class="add-text">Adicionar mídia</div>
                <input type="file" multiple class="hidden add-card-input" accept="image/*,video/*,.zip,.txt">
            </div>
        `;
        addCard.addEventListener('click', function(e) { if (e.target.tagName !== 'INPUT') addCard.querySelector('input').click(); });
        addCard.querySelector('input').addEventListener('change', function(e) { processFiles(e.target.files, section); e.target.value = ''; saveProgress(); });
        previewContainer.appendChild(addCard);
        section.scrollIntoView({behavior:'smooth', block:'center'});
        saveProgress();
    }

    const debouncedSaveProgress = debounce(saveProgress, 400);

    if (addGalleryBtn) addGalleryBtn.addEventListener('click', createEmptyGallery);

    function addTipInput(text = '') {
        const wrapper = document.createElement('div');
        wrapper.className = 'tip-input-wrapper';
        wrapper.innerHTML = `
            <input type="text" class="luquinhas-tip-input" placeholder="Digite a dica aqui..." value="${text}">
            <button class="remove-tip-btn" title="Remover dica">&times;</button>
        `;
        wrapper.querySelector('.remove-tip-btn').addEventListener('click', () => {
            wrapper.remove();
            debouncedSaveProgress();
        });
        luquinhasTipsContainer.appendChild(wrapper);
        // Foca no campo de texto recém-criado
        wrapper.querySelector('.luquinhas-tip-input').focus();
    }
    if (addLuquinhasTipBtn) addLuquinhasTipBtn.addEventListener('click', () => {
        addTipInput();
        debouncedSaveProgress();
    });

    function renderGallerySection(gallery, idx) {
        return `<section id="gallery-wrapper-${gallery.id}" class="gallery-card" data-gallery-title="${gallery.title}">
            <div class="gallery-header">
                <input type="text" value="${gallery.title}" class="gallery-title-input" style="font-size:1.3rem;font-weight:700;" />
                <div class="gallery-actions">
                    <button class="gallery-move-up" title="Mover galeria para cima" aria-label="Mover galeria para cima">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button class="gallery-move-down" title="Mover galeria para baixo" aria-label="Mover galeria para baixo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button class="delete-gallery-btn" title="Excluir galeria" aria-label="Excluir galeria"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>
            <div class="items-preview"></div>
        </section>`;
    }

    function saveProgress() {
        const galleries = [];
        galleriesContainer.querySelectorAll('section').forEach(section => {
            const gallery = {
                id: section.id.replace('gallery-wrapper-', ''),
                title: section.querySelector('.gallery-title-input').value,
                items: []
            };
            section.querySelectorAll('.file-card').forEach(card => {
                // Não salva o card de adicionar mídia
                if (card.classList.contains('add-media-card')) return;
                gallery.items.push({
                    mediaName: card.dataset.mediaName,
                    downloadName: card.dataset.downloadName || '',
                    title: card.querySelector('.data-title').value,
                    comment: card.querySelector('.data-comment').value
                });
            });
            galleries.push(gallery);
        });

        const luquinhasTips = [];
        document.querySelectorAll('.luquinhas-tip-input').forEach(input => {
            if (input.value.trim()) {
                luquinhasTips.push(input.value.trim());
            }
        });

        const progressData = { galleries, luquinhasTips };
        localStorage.setItem('galleriesProgress', JSON.stringify(progressData));
    // update generated code automatically after saving state
    generateAll();
    }

    function loadProgress() {
        const data = localStorage.getItem('galleriesProgress');
        if (!data) return;
        const progressData = JSON.parse(data);
        const galleries = Array.isArray(progressData) ? progressData : (progressData.galleries || []);
        const luquinhasTips = progressData.luquinhasTips || [];

        galleriesContainer.innerHTML = '';
        galleryCounter = 0;
        galleries.forEach((gallery, idx) => {
            galleryCounter = Math.max(galleryCounter, parseInt(gallery.id));
            galleriesContainer.insertAdjacentHTML('beforeend', renderGallerySection(gallery, idx));
            const section = galleriesContainer.lastElementChild;
            const previewContainer = section.querySelector('.items-preview');
            gallery.items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'file-card';
                card.dataset.mediaName = item.mediaName;
                if (item.downloadName) card.dataset.downloadName = item.downloadName;
                const mediaType = item.mediaName.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video';
                const mediaPath = `media/${encodeURIComponent(item.mediaName)}`;
                card.innerHTML = `
                <div class="media-preview">
                    ${mediaType === 'image' ? `<img src="${mediaPath}" alt="${item.title || ''}">` : `<video src="${mediaPath}" muted autoplay loop playsinline></video>`}
                </div>
                <div class="card-body">
                    <label>Título</label>
                    <input type="text" value="${item.title}" class="data-title">
                    <label style="margin-top:8px;">Comentário</label>
                    <textarea class="data-comment" rows="3" placeholder="Opcional...">${item.comment || ''}</textarea>
                    <div class="file-meta"><strong>Arquivo:</strong> <span class="media-filename">${item.mediaName}</span>
                        <div class="download-info">${item.downloadName ? `<div><strong>Download:</strong> ${item.downloadName}</div>` : ''}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="left-actions">
                        <label class="add-download-btn" title="Anexar arquivo de download (.zip)" aria-label="Anexar .zip">
                            <!-- clip icon (stroke only) -->
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-8.49 8.49a5 5 0 01-7.07-7.07l8.49-8.49a3.5 3.5 0 014.95 4.95l-7.07 7.07a2 2 0 01-2.83-2.83l6.36-6.36" /></svg>
                            <span class="download-btn-text">${item.downloadName ? 'Alterar .zip' : 'Anexar'}</span>
                            <span class="sr-only">Anexar arquivo .zip</span>
                            <input type="file" class="hidden download-input" accept=".zip">
                        </label>
                        <button class="remove-card-btn" title="Remover Card" aria-label="Remover item">
                            <!-- trash icon (stroke) -->
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                    <div class="right-actions">
                        <button class="move-btn move-up" title="Mover para Cima" aria-label="Mover item para cima">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button class="move-btn move-down" title="Mover para Baixo" aria-label="Mover item para baixo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>
                </div>
            `;
            previewContainer.appendChild(card);
        });
        // Adiciona o card de adicionar mídia ao final de cada galeria
        const addCard = document.createElement('div');
        addCard.className = 'file-card add-media-card';
        addCard.style.minHeight = '180px';
        addCard.innerHTML = `
            <div class="add-card-inner">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <div class="add-text">Adicionar mídia</div>
                <input type="file" multiple class="hidden add-card-input" accept="image/*,video/*,.zip,.txt">
            </div>
        `;
        addCard.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') addCard.querySelector('input').click();
        });
        addCard.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            addCard.classList.add('dragover');
            addCard.style.borderColor = '#3b82f6';
            addCard.style.background = '#e0edff';
        });
        addCard.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            addCard.classList.remove('dragover');
            addCard.style.borderColor = '';
            addCard.style.background = '';
        });
        addCard.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            addCard.classList.remove('dragover');
            addCard.style.borderColor = '';
            addCard.style.background = '';
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
                processFiles(e.dataTransfer.files, section);
                saveProgress();
            }
        });
        addCard.querySelector('input').addEventListener('change', function(e) {
            processFiles(e.target.files, section);
            e.target.value = '';
            saveProgress();
        });
        previewContainer.appendChild(addCard);
    });

    // Load Luquinhas' tips
    if (luquinhasTipsContainer) {
        luquinhasTipsContainer.innerHTML = '';
        luquinhasTips.forEach(tip => addTipInput(tip));
    }
}


    // --- Campo global de upload ---
    const globalUploadZone = document.getElementById('global-upload-zone');
    const globalFileInput = globalUploadZone.querySelector('.global-file-input');

    function createGalleryWithFiles(files) {
        galleryCounter++;
        const defaultName = `Galeria: Nova ${galleryCounter}`;
        galleriesContainer.insertAdjacentHTML('beforeend', renderGallerySection({id: galleryCounter, title: defaultName, items: []}, galleryCounter));
        const newSection = galleriesContainer.lastElementChild;
        processFiles(files, newSection);
        saveProgress();
        // Scroll até a nova galeria
        setTimeout(() => newSection.scrollIntoView({behavior: 'smooth', block: 'center'}), 200);
    }

    let globalFileInputClicking = false;
    globalUploadZone.addEventListener('mousedown', e => {
        // Flag para evitar duplo clique
        globalFileInputClicking = (e.target === globalFileInput);
    });
    globalUploadZone.addEventListener('click', e => {
        if (globalFileInputClicking) {
            globalFileInputClicking = false;
            return;
        }
        globalFileInput.click();
    });
    globalFileInput.addEventListener('click', e => {
        e.stopPropagation();
    });
    globalFileInput.addEventListener('change', function(e) {
        if (e.target.files.length) createGalleryWithFiles(e.target.files);
        e.target.value = '';
    });
    globalUploadZone.addEventListener('dragover', e => { e.preventDefault(); globalUploadZone.classList.add('dragover'); });
    globalUploadZone.addEventListener('dragleave', e => globalUploadZone.classList.remove('dragover'));
    globalUploadZone.addEventListener('drop', e => {
        e.preventDefault();
        globalUploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) createGalleryWithFiles(e.dataTransfer.files);
    });

    // Excluir galeria
    galleriesContainer.addEventListener('click', e => {
        if (e.target.closest('.delete-gallery-btn')) {
            const section = e.target.closest('section');
            if (section && confirm('Deseja excluir esta galeria?')) {
                section.remove();
                saveProgress();
            }
        }
    });

    // Resetar progresso
    document.getElementById('reset-progress-btn').addEventListener('click', () => {
        if (confirm('Deseja realmente apagar todo o progresso?')) {
            localStorage.removeItem('galleriesProgress');
            galleriesContainer.innerHTML = '';
            galleryCounter = 0;
        }
    });
    // Permite renomear a galeria a qualquer momento
    galleriesContainer.addEventListener('input', e => {
        if (e.target.classList.contains('gallery-title-input')) {
            const section = e.target.closest('section');
            if (section) {
                section.setAttribute('data-gallery-title', e.target.value);
                debouncedSaveProgress();
            }
        }
        if (e.target.classList.contains('data-title') || e.target.classList.contains('data-comment')) {
            debouncedSaveProgress();
        }
    });

        // Salva progresso ao digitar nas dicas do mascote
    const mascotSection = document.getElementById('mascot-section');
    if (mascotSection) {
        mascotSection.addEventListener('input', e => {
            if (e.target.classList.contains('luquinhas-tip-input')) {
                debouncedSaveProgress();
            }
        });
    }


    // Remove drag-and-drop e file-input dos carrosseis individuais
    
    function getBaseName(filename) { return filename.replace(/_comment|_download/i, '').replace(/\.[^/.]+$/, ""); }
    function generateTitle(filename) {
        // 1. Limpa o nome base, remove números iniciais, substitui hífens por espaços.
        const cleaned = getBaseName(filename)
            .replace(/^\d+[_ ]*/, '')
            .replace(/[_-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase(); // 2. Converte tudo para minúsculo primeiro para garantir consistência.

        // 3. Capitaliza a primeira letra e qualquer letra que siga um espaço.
        return cleaned.replace(/(^|\s)\w/g, l => l.toUpperCase());
    }

    async function processFiles(files, gallerySection) {
        const previewContainer = gallerySection.querySelector('.items-preview');
        const fileMap = new Map();
        for (const file of files) {
            const baseName = getBaseName(file.name);
            if (!fileMap.has(baseName)) fileMap.set(baseName, {});
            const group = fileMap.get(baseName);
            if (file.name.toLowerCase().includes('_comment.txt')) group.comment = await file.text();
            else if (file.name.toLowerCase().endsWith('_download.zip')) group.download = file;
            else group.media = file;
        }

        // Remove o card de adicionar mídia antes de inserir novos cards
        previewContainer.querySelectorAll('.add-media-card').forEach(el => el.remove());

        for (const [baseName, fileGroup] of fileMap.entries()) {
            if (!fileGroup.media) continue;
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.mediaName = fileGroup.media.name;
            if (fileGroup.download) card.dataset.downloadName = fileGroup.download.name;

            const mediaType = fileGroup.media.type.startsWith('image') ? 'image' : 'video';
            const mediaUrl = URL.createObjectURL(fileGroup.media);

            card.innerHTML = `
                <div class="media-preview">
                    ${mediaType === 'image' ? `<img src="${mediaUrl}" alt="${generateTitle(fileGroup.media.name)}">` : `<video src="${mediaUrl}" muted autoplay loop playsinline></video>`}
                </div>
                <div class="card-body">
                    <label>Título</label>
                    <input type="text" value="${generateTitle(fileGroup.media.name)}" class="data-title">
                    <label style="margin-top:8px;">Comentário</label>
                    <textarea class="data-comment" rows="3" placeholder="Opcional...">${fileGroup.comment || ''}</textarea>
                    <div class="file-meta"><strong>Arquivo:</strong> <span class="media-filename">${fileGroup.media.name}</span>
                        <div class="download-info">${fileGroup.download ? `<div><strong>Download:</strong> ${fileGroup.download.name}</div>` : ''}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="left-actions">
                        <label class="add-download-btn" title="Anexar arquivo de download (.zip)" aria-label="Anexar .zip">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-8.49 8.49a5 5 0 01-7.07-7.07l8.49-8.49a3.5 3.5 0 014.95 4.95l-7.07 7.07a2 2 0 01-2.83-2.83l6.36-6.36" /></svg>
                            <span class="download-btn-text">${fileGroup.download ? 'Alterar .zip' : 'Anexar'}</span>
                            <span class="sr-only">Anexar arquivo .zip</span>
                            <input type="file" class="hidden download-input" accept=".zip">
                        </label>
                        <button class="remove-card-btn" title="Remover Card" aria-label="Remover item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                    <div class="right-actions">
                        <button class="move-btn move-up" title="Mover para Cima" aria-label="Mover item para cima">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button class="move-btn move-down" title="Mover para Baixo" aria-label="Mover item para baixo">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                    </div>
                </div>
            `;
            // Armazena a URL do objeto no dataset para poder limpá-la depois
            card.dataset.mediaUrl = mediaUrl;

            previewContainer.appendChild(card);
        }
        // Sempre adiciona o card de adicionar mídia no final
        const addCard = document.createElement('div');
        addCard.className = 'file-card add-media-card';
        addCard.style.minHeight = '180px';
        addCard.innerHTML = `
            <div class="add-card-inner">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <div class="add-text">Adicionar mídia</div>
                <input type="file" multiple class="hidden add-card-input" accept="image/*,video/*,.zip,.txt">
            </div>
        `;
        addCard.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') addCard.querySelector('input').click();
        });
        addCard.querySelector('input').addEventListener('change', function(e) {
            processFiles(e.target.files, gallerySection);
            e.target.value = '';
            saveProgress();
        });
        previewContainer.appendChild(addCard);
        updateMoveButtons(previewContainer);
    }

    galleriesContainer.addEventListener('click', e => {
        // Delegação explícita: suporte para botões de mover, remover, anexar e mover galerias
        const moveUpBtn = e.target.closest('.move-up');
        const moveDownBtn = e.target.closest('.move-down');
        const removeBtn = e.target.closest('.remove-card-btn');
        const galleryMoveUpBtn = e.target.closest('.gallery-move-up');
        const galleryMoveDownBtn = e.target.closest('.gallery-move-down');

        if (moveUpBtn) {
            const card = moveUpBtn.closest('.file-card');
            const container = card?.parentNode;
            if (card && card.previousElementSibling) container.insertBefore(card, card.previousElementSibling);
            saveProgress();
            updateMoveButtons(container);
            return;
        }
        if (moveDownBtn) {
            const card = moveDownBtn.closest('.file-card');
            const container = card?.parentNode;
            if (card && card.nextElementSibling) container.insertBefore(card.nextElementSibling, card);
            saveProgress();
            updateMoveButtons(container);
            return;
        }
        if (removeBtn) {
            const card = removeBtn.closest('.file-card');
            if (card && confirm('Tem certeza que deseja remover este item?')) {
                // Revoga a URL do objeto para liberar memória
                if (card.dataset.mediaUrl) {
                    URL.revokeObjectURL(card.dataset.mediaUrl);
                }
                card.remove();
                saveProgress();
            }
            return;
        }
        // Mover GALERIA para cima/baixo
        if (galleryMoveUpBtn || galleryMoveDownBtn) {
            const galleryBtn = galleryMoveUpBtn || galleryMoveDownBtn;
            const section = galleryBtn.closest('section');
            if (!section) return;
            if (galleryMoveUpBtn) {
                const prev = section.previousElementSibling;
                if (prev) section.parentNode.insertBefore(section, prev);
            } else if (galleryMoveDownBtn) {
                const next = section.nextElementSibling;
                if (next) section.parentNode.insertBefore(next, section);
            }
            saveProgress();
            return;
        }
    });

    galleriesContainer.addEventListener('change', e => {
        if (e.target.classList.contains('download-input')) {
            const file = e.target.files[0];
            if (file) {
                const card = e.target.closest('.file-card');
                card.dataset.downloadName = file.name;
                card.querySelector('.download-info').innerHTML = `<p><strong>Download:</strong> ${file.name}</p>`;
                card.querySelector('.download-btn-text').textContent = 'Alterar .zip';
                saveProgress();
            }
        }
    });

    function updateMoveButtons(container) {
        if (!container) return;
        const cards = container.querySelectorAll('.file-card');
        cards.forEach((card, index) => {
            const up = card.querySelector('.move-up');
            const down = card.querySelector('.move-down');
            if (up) up.disabled = (index === 0);
            if (down) down.disabled = (index === cards.length - 1);
        });
    }

    // Carregar progresso ao iniciar
    loadProgress();

    generateBtn.addEventListener('click', () => {
        generateAll();
        if (outputCode.value) window.scrollTo(0, document.getElementById('generation-section').offsetTop);
    });

    copyBtn.addEventListener('click', () => {
        if(!outputCode.value) return;
        outputCode.select();
        document.execCommand('copy');
        copyBtn.textContent = "Copiado!";
        copyBtn.classList.add('copy-success');
        setTimeout(() => { copyBtn.textContent = "Copiar"; copyBtn.classList.remove('copy-success'); }, 2000);
    });

    // Nova função: Baixar arquivo HTML completo
    if (downloadJsBtn) {
        downloadJsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!outputCode.value) {
                alert("Gere o código primeiro!");
                return;
            }
            try {
                const galleryHtml = outputCode.value;
                const pageTitle = document.getElementById('page-title-input').value || 'Galeria Gerada';
                let filename = document.getElementById('filename-input').value || 'galeria_gerada.html';
                if (!filename.toLowerCase().endsWith('.html')) {
                    filename += '.html';
                }

                // Template da página HTML completa, baseado no index4.html
                const fullHtmlTemplate = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageTitle}</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Cinzel:wght@400;700&family=Courier+Prime:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Dancing+Script:wght@400;700&family=Fira+Code:wght@400;700&family=Inconsolata:wght@400;700&family=Inter:wght@400;500;700&family=Lobster&family=Merriweather:wght@400;700&family=Mountains+of+Christmas:wght@400;700&family=Open+Sans:wght@400;700&family=Patrick+Hand&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.3.0/color-thief.umd.js"><\/script>
    <script src="script.js" defer><\/script>
</head>
<body class="flex flex-col items-center py-8">
    <div class="container mx-auto px-4 max-w-4xl space-y-16">
        ${galleryHtml}
    </div>

    <!-- Botão e Modal de Configurações -->
    <div class="fixed bottom-4 left-4 z-50">
    <button id="settings-btn">
            <svg class="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.096 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
        </button>
    </div>
    <div id="settings-modal" class="hidden fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div class="settings-panel w-full max-w-lg rounded-xl shadow-2xl p-6 sm:p-8 space-y-6">
            <div class="cons flex items-center justify-between"><h3 class="text-2xl font-bold">Configurações e Atalhos</h3><button id="close-modal-btn" class="p-1 rounded-full hover:bg-white/10"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
            <div>
                <h4 class="text-lg font-semibold mb-3 border-b border-white/20 pb-2">Aparência</h4>
                <div class="conts flex items-center justify-between"><label for="theme-toggle">Tema Claro / Escuro</label><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="theme-toggle" class="sr-only peer"><div class="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
                <div class="conts flex items-center justify-between mt-3"><label for="blur-toggle">Efeitos de Blur / Máscaras</label><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="blur-toggle" class="sr-only peer"><div class="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
                <div class="mt-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm opacity-80">Estilo de Fonte</span>
                        <div class="flex items-center gap-2">
                            <span class="text-xs opacity-70">(Fonte atual: <span id="current-font-name" class="font-bold"></span>)</span>
                            <button id="cycle-font-btn" class="p-1 rounded hover:bg-white/20 transition-colors" title="Alternar variação da fonte"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-4 text-sm" id="font-selector">
                        <button class="font-btn opacity-50 hover:opacity-100 transition-opacity" data-font="sans">Sans</button>
                        <button class="font-btn opacity-50 hover:opacity-100 transition-opacity" data-font="serif">Serifada</button>
                        <button class="font-btn opacity-50 hover:opacity-100 transition-opacity" data-font="mono">Monoespaçada</button>
                        <button class="font-btn opacity-50 hover:opacity-100 transition-opacity" data-font="hand">Manuscrita</button>
                        <button class="font-btn opacity-50 hover:opacity-100 transition-opacity" data-font="decor">Decorativa</button>
                    </div>
                </div>
                <div id="dark-theme-colors" class="mt-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm opacity-80">Cor do tema</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs opacity-70">Matiz</span>
                        <input type="range" id="hue-slider-dark" min="0" max="360" class="hue-slider flex-1 h-3 rounded-lg appearance-none cursor-pointer">
                        <button id="reset-dark-theme" class="px-3 py-1 rounded text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors text-white" title="Redefinir para padrão">Redefinir</button>
                    </div>
                </div>
                <div id="light-theme-colors" class="hidden mt-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm opacity-80">Cor do tema</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs opacity-70">Matiz</span>
                        <input type="range" id="hue-slider-light" min="0" max="360" class="hue-slider flex-1 h-3 rounded-lg appearance-none cursor-pointer">
                        <button id="reset-light-theme" class="px-3 py-1 rounded text-xs font-medium bg-black/5 hover:bg-black/10 transition-colors text-black" title="Redefinir para padrão">Redefinir</button>
                    </div>
                </div>
            </div>
            <div>
                <h4 class="text-lg font-semibold mb-3 border-b border-white/20 pb-2">Atalhos do Teclado</h4>
                <ul class="space-y-2 text-sm">
                    <li class="flex justify-between"><span>Play / Pause</span><div><code class="bg-white/10 px-2 py-1 rounded">Espaço</code> <code class="bg-white/10 px-2 py-1 rounded">K</code></div></li>
                    <li class="flex justify-between"><span>Mute / Unmute</span><code class="bg-white/10 px-2 py-1 rounded">M</code></li>
                    <li class="flex justify-between"><span>Tela Cheia</span><code class="bg-white/10 px-2 py-1 rounded">F</code></li>
                    <li class="flex justify-between"><span>Alterar Velocidade</span><code class="bg-white/10 px-2 py-1 rounded">V</code></li>
                    <li class="flex justify-between"><span>Alterar Modo de Reprodução</span><code class="bg-white/10 px-2 py-1 rounded">P</code></li>
                    <li class="flex justify-between"><span>Próximo / Anterior</span><div><code class="bg-white/10 px-2 py-1 rounded">→</code> <code class="bg-white/10 px-2 py-1 rounded">←</code></div></li>
                    <li class="flex justify-between"><span>Avançar/Retroceder (5s ou frame)</span><div><code class="bg-white/10 px-2 py-1 rounded">↑</code> <code class="bg-white/10 px-2 py-1 rounded">↓</code></div></li>
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
                
                const blob = new Blob([fullHtmlTemplate], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Erro ao baixar HTML:", err);
                alert("Erro ao iniciar o download. Verifique o console para mais detalhes.");
            }
        });
    }

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const currentTheme = localStorage.getItem('theme') || 'theme-light';

    // Apply theme class to both html and body for consistent styling
    document.documentElement.classList.add(currentTheme);
    document.body.classList.add(currentTheme);

    // Adicionar logs para depuração
    console.log('Tema atual ao carregar:', currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('theme-dark');
        const newTheme = isDark ? 'theme-light' : 'theme-dark';

        // Atualizar o evento de clique para incluir logs
        console.log('Botão de alternância de tema configurado.');
        console.log('Alternando tema. Tema atual:', isDark ? 'dark' : 'light');

        // Remove a classe antiga e adiciona a nova
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.body.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(newTheme);
    document.body.classList.add(newTheme);

        console.log('Novo tema aplicado:', newTheme);

        // Salvar o tema no localStorage
        localStorage.setItem('theme', newTheme);
    });
    // Attempt to load an external mascot SVG from links/clippy.svg and replace the inline mascot if present
    (async function tryLoadMascot() {
        try {
            const res = await fetch('links/clippy.svg', {cache: 'no-store'});
            if (!res.ok) return;
            const svgText = await res.text();
            const instr = document.querySelector('.instructions');
            if (!instr) return;
            const existing = instr.querySelector('svg');
            if (existing) existing.remove();
            const wrapper = document.createElement('div');
            wrapper.innerHTML = svgText;
            const svgEl = wrapper.querySelector('svg');
            if (svgEl) {
                svgEl.setAttribute('width', '54');
                svgEl.setAttribute('height', '54');
                svgEl.setAttribute('aria-hidden', 'true');
                instr.insertBefore(svgEl, instr.firstChild);
            }
        } catch (err) {
            // silently ignore: external mascot optional
            console.log('Mascot not loaded (links/clippy.svg not found).');
        }
    })();
    // Info modal behavior
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    if (infoBtn && infoModal) {
        const closeBtn = infoModal.querySelector('.modal-close');
        // ensure hidden by default
        infoModal.classList.remove('show');
        infoModal.hidden = true;
        infoBtn.addEventListener('click', () => { infoModal.classList.add('show'); infoModal.hidden = false; document.body.style.overflow = 'hidden'; });
        closeBtn.addEventListener('click', () => { infoModal.classList.remove('show'); infoModal.hidden = true; document.body.style.overflow = ''; });
        infoModal.addEventListener('click', (e) => { if (e.target === infoModal) { infoModal.classList.remove('show'); infoModal.hidden = true; document.body.style.overflow = ''; } });
    }
});