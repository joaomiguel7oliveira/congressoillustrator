// --- Persistent State and Theme Initialization ---
const savedState = JSON.parse(localStorage.getItem('playerState')) || {};

function applyThemeFromState(state) {
    const theme = state.theme || 'light';
    const themeColorDark = state.themeColorDark || 'rgb(20 20 20)';
    const themeColorLight = state.themeColorLight || 'rgb(243 244 246)';
    document.documentElement.style.setProperty('--color-bg-dark', themeColorDark);
    document.documentElement.style.setProperty('--color-bg-light', themeColorLight);
    if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.style.setProperty('--color-bg', themeColorLight);
    } else {
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
        document.documentElement.style.setProperty('--color-bg', themeColorDark);
    }
}

applyThemeFromState(savedState);

if (savedState.blurEnabled !== true) {
    document.documentElement.classList.add('no-blur');
}

// Font initialization
const fontState = {
    currentCategory: savedState.fontStyle || 'sans',
    variants: savedState.fontVariants || { sans: 1, serif: 1, mono: 1, hand: 1, decor: 1 }
};

const applyFontClass = () => {
    // Remove todas as classes de fonte
    const classesToRemove = [];
    document.documentElement.classList.forEach(cls => {
        if (cls.startsWith('font-')) classesToRemove.push(cls);
    });
    document.documentElement.classList.remove(...classesToRemove);

    // Adiciona a classe atual
    const variant = fontState.variants[fontState.currentCategory] || 1;
    document.documentElement.classList.add(`font-${fontState.currentCategory}-${variant}`);
};
applyFontClass();

    let lastActiveCarouselId = savedState.lastActiveCarouselId || 'carousel-1';
    let fullscreenCarouselId = null;
    let scrollPositionBeforeFullscreen = { x: 0, y: 0 };
    let enableFullscreenDisplayModeToggle = true; // Nova variável para controlar o modo de exibição em tela cheia


// --- Utility: Convert RGB array to CSS string ---
function rgbArrayToString(rgbArr, alpha = 1) {
    if (!rgbArr) return 'rgba(0,0,0,0)';
    return `rgba(${rgbArr[0]},${rgbArr[1]},${rgbArr[2]},${alpha})`;
}

// --- Utility: Get average color from image or video element ---
async function getMediaAverageColor(media) {
    return new Promise((resolve) => {
        try {
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            if (media.tagName === 'IMG') {
                if (media.complete && media.naturalWidth > 0) {
                    canvas.width = media.naturalWidth > 64 ? 64 : media.naturalWidth;
                    canvas.height = media.naturalHeight > 64 ? 64 : media.naturalHeight;
                    ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
                    try {
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        let r = 0, g = 0, b = 0, count = 0;
                        for (let i = 0; i < imgData.data.length; i += 4) {
                            r += imgData.data[i];
                            g += imgData.data[i + 1];
                            b += imgData.data[i + 2];
                            count++;
                        }
                        resolve([Math.round(r / count), Math.round(g / count), Math.round(b / count)]);
                    } catch (e) {
                        resolve([34,34,34]);
                    }
                } else {
                    media.addEventListener('load', () => {
                        canvas.width = media.naturalWidth > 64 ? 64 : media.naturalWidth;
                        canvas.height = media.naturalHeight > 64 ? 64 : media.naturalHeight;
                        ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
                        try {
                            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            let r = 0, g = 0, b = 0, count = 0;
                            for (let i = 0; i < imgData.data.length; i += 4) {
                                r += imgData.data[i];
                                g += imgData.data[i + 1];
                                b += imgData.data[i + 2];
                                count++;
                            }
                            resolve([Math.round(r / count), Math.round(g / count), Math.round(b / count)]);
                        } catch (e) {
                            resolve([34,34,34]);
                        }
                    }, { once: true });
                }
            } else if (media.tagName === 'VIDEO') {
                canvas.width = media.videoWidth > 64 ? 64 : media.videoWidth || 32;
                canvas.height = media.videoHeight > 64 ? 64 : media.videoHeight || 32;
                ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
                try {
                    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    let r = 0, g = 0, b = 0, count = 0;
                    for (let i = 0; i < imgData.data.length; i += 4) {
                        r += imgData.data[i];
                        g += imgData.data[i + 1];
                        b += imgData.data[i + 2];
                        count++;
                    }
                    resolve([Math.round(r / count), Math.round(g / count), Math.round(b / count)]);
                } catch (e) {
                    resolve([34,34,34]);
                }
            } else {
                resolve([34,34,34]);
            }
        } catch (e) {
            resolve([34,34,34]);
        }
    });
}

// --- Utility: Apply average color and blur image to wrapper ---
async function applyMediaColorToWrapper(item) {
    const contentWrapper = item.querySelector('.content-wrapper');
    const mediaContainer = item.querySelector('.media-container');
    const media = mediaContainer ? mediaContainer.querySelector('img, video') : null;
    if (!contentWrapper || !mediaContainer || !media) return;

    // Check if color and blur image have already been applied for this item
    if (item.dataset.mediaColorApplied === 'true') {
        return; // Already processed, skip recalculation
    }

    const avgColor = await getMediaAverageColor(media);
    const colorStr = rgbArrayToString(avgColor, 1);
    contentWrapper.style.background = colorStr;
    if (media.tagName === 'IMG' && media.src) {
        contentWrapper.style.setProperty('--media-blur-img', `url('${media.src}')`);
    } else if (media.tagName === 'VIDEO') {
        contentWrapper.style.setProperty('--media-blur-img', 'none');
        const vidSrc = media.currentSrc || media.src;
        if (vidSrc && !contentWrapper.querySelector('.blur-video-bg')) {
            const blurVid = document.createElement('video');
            blurVid.className = 'blur-video-bg';
            blurVid.src = vidSrc;
            blurVid.muted = true;
            blurVid.preload = 'auto';
            blurVid.style.cssText = 'position: absolute; top: -20%; left: -20%; width: 140%; height: 140%; max-width: none; object-fit: cover; z-index: 0; pointer-events: none;';
            contentWrapper.insertBefore(blurVid, contentWrapper.firstChild);
            
            blurVid.addEventListener('loadeddata', () => { blurVid.currentTime = media.currentTime || 0.1; });

            media.addEventListener('play', () => {
                if (blurVid.playbackRate !== media.playbackRate) blurVid.playbackRate = media.playbackRate;
                blurVid.play().catch(() => {});
            });
            media.addEventListener('pause', () => blurVid.pause());
            media.addEventListener('seeking', () => blurVid.currentTime = media.currentTime);
            media.addEventListener('timeupdate', () => {
                // Lógica de sincronização direta, similar à versão antiga que funcionava bem.
                // Uma tolerância pequena (0.15s) previne saltos constantes por micro-dessincronias.
                if (Math.abs(blurVid.currentTime - media.currentTime) > 0.15) {
                    blurVid.currentTime = media.currentTime;
                }
            });
            media.addEventListener('ratechange', () => blurVid.playbackRate = media.playbackRate);
        }
    } else {
        contentWrapper.style.setProperty('--media-blur-img', 'none');
    }
    item.dataset.mediaColorApplied = 'true'; // Mark as processed
}

// --- Atualiza cor média e blur de todos os itens do carrossel ---
const updateAllMediaFades = () => {
    document.querySelectorAll('.carousel-item').forEach(item => {
        const contentWrapper = item.querySelector('.content-wrapper');
        const mediaContainer = item.querySelector('.media-container');
        const media = mediaContainer ? (mediaContainer.querySelector('img') || mediaContainer.querySelector('video')) : null;
        if (!contentWrapper || !mediaContainer || !media) return;

        // Only apply media color if not already applied
        if (item.dataset.mediaColorApplied !== 'true') {
            applyMediaColorToWrapper(item);
        }

        if (mediaContainer.classList.contains('fit-mode')) {
            const wrapperRect = contentWrapper.getBoundingClientRect();
            if (wrapperRect.height === 0 || wrapperRect.width === 0) return;
            const wrapperAspectRatio = wrapperRect.width / wrapperRect.height;
            const mediaWidth = media.naturalWidth || media.videoWidth;
            const mediaHeight = media.naturalHeight || media.videoHeight;
            if (!mediaWidth || !mediaHeight) return;
            const mediaAspectRatio = mediaWidth / mediaHeight;
            mediaContainer.classList.remove('apply-vertical-fade', 'apply-horizontal-fade');
            const tolerance = 0.01;
            if (mediaAspectRatio > wrapperAspectRatio + tolerance) mediaContainer.classList.add('apply-vertical-fade');
            else if (mediaAspectRatio < wrapperAspectRatio - tolerance) mediaContainer.classList.add('apply-horizontal-fade');
        } else {
            mediaContainer.classList.remove('apply-vertical-fade', 'apply-horizontal-fade');
        }
    });
};
    
    // Ajusta size da mídia dentro do content-wrapper, preservando proporção
        const updateMediaElementSizes = () => {
            document.querySelectorAll('.carousel-item').forEach(item => {
                const wrapper = item.querySelector('.content-wrapper');
                const mediaContainer = item.querySelector('.media-container');
                const media = mediaContainer ? mediaContainer.querySelector('img, video') : null;
                if (!wrapper || !mediaContainer || !media) return;

                const maxW = wrapper.offsetWidth;
                const maxH = wrapper.offsetHeight;
                if (!maxW || !maxH) return;

                const naturalW = media.naturalWidth || media.videoWidth || 0;
                const naturalH = media.naturalHeight || media.videoHeight || 0;
                if (!naturalW || !naturalH) return; // mídia ainda não carregada

                const aspect = naturalW / naturalH;
                const wrapperAspect = maxW / maxH;
                let boxW, boxH;
                // Se o item estiver em modo fill (preenchido) - ocupar todo o wrapper
                if (mediaContainer.classList.contains('fill-mode')) {
                    // AGRESSIVO: Removemos tamanhos fixos em pixels para deixar o CSS (calc) agir
                    mediaContainer.style.width = '';
                    mediaContainer.style.height = '';
                    mediaContainer.style.marginLeft = '';
                    mediaContainer.style.marginTop = '';
                    media.style.width = '';
                    media.style.height = '';
                } else { // fit-mode
                    mediaContainer.style.marginLeft = '';
                    mediaContainer.style.marginTop = '';
                    if (document.fullscreenElement) {
                        // Fullscreen fit-mode: scale up to fit the screen
                        if (wrapperAspect > aspect) {
                            boxH = maxH;
                            boxW = boxH * aspect;
                        } else {
                            boxW = maxW;
                            boxH = boxW / aspect;
                        }
                    } else {
                        // Non-fullscreen fit-mode: limit to natural size
                        if (wrapperAspect > aspect) {
                            boxH = Math.min(maxH, naturalH);
                            boxW = boxH * aspect;
                        } else {
                            boxW = Math.min(maxW, naturalW);
                            boxH = boxW / aspect;
                        }
                    }
                    mediaContainer.style.width = boxW + 'px';
                    mediaContainer.style.height = boxH + 'px';
                    media.style.width = '100%';
                    media.style.height = '100%';
                }
            });
        };

        // Helpers para alternar entre modos fill/fit e garantir que o media-container
        // seja redimensionado corretamente para manter o blur e gradientes funcionando.
        // Novo controle centralizado de modo de exibição
        window.carouselDisplayModes = window.carouselDisplayModes || {};
        window.carouselFullscreenDisplayModes = window.carouselFullscreenDisplayModes || {};

        function applyDisplayMode(item, mode, forceFullscreen) {
            const mediaContainer = item.querySelector('.media-container');
            const wrapper = item.querySelector('.content-wrapper');
            const media = mediaContainer?.querySelector('img, video');
            if (!mediaContainer || !media) return;
            
            const mediaDimensionsAvailable = (media.naturalWidth || media.videoWidth) > 0;

            if ((document.fullscreenElement || forceFullscreen) && !mediaDimensionsAvailable) {
                const onMediaReady = () => applyDisplayMode(item, mode, forceFullscreen);
                if (media.tagName === 'VIDEO') {
                    media.addEventListener('loadeddata', onMediaReady, { once: true });
                } else {
                    media.addEventListener('load', onMediaReady, { once: true });
                }
                return;
            }

            let effectiveMode = mode;
            const isVideo = media.tagName === 'VIDEO';

            mediaContainer.classList.remove('fill-mode', 'fit-mode');
            mediaContainer.classList.add(effectiveMode + '-mode');
            mediaContainer.dataset.displayMode = effectiveMode;

            if (effectiveMode === 'fit') {
                if (wrapper) wrapper.classList.remove('is-filled');
                media.style.filter = 'blur(0.3px)';
                media.style.backdropFilter = '';
                media.style.objectFit = 'contain';
            } else {
                if (wrapper) wrapper.classList.add('is-filled');
                media.style.filter = 'blur(0.3px)';
                media.style.objectFit = 'cover';
            }

            if (document.fullscreenElement || forceFullscreen) {
                if (!isVideo && effectiveMode !== 'fit') {
                    mediaContainer.style.width = '100vw';
                    mediaContainer.style.height = '100vh';
                }
                media.style.width = '100%';
                media.style.height = '100%';
            } else {
                mediaContainer.style.width = '';
                mediaContainer.style.height = '';
                mediaContainer.style.marginLeft = '';
                mediaContainer.style.marginTop = '';
                media.style.width = '';
                media.style.height = '';
            }
            updateMediaElementSizes();
            updateAllMediaFades();
        }

        function setDisplayMode(carouselId, itemIndex, mode, forceFullscreen) {
            if (document.fullscreenElement || forceFullscreen) {
                window.carouselFullscreenDisplayModes[carouselId] = window.carouselFullscreenDisplayModes[carouselId] || {};
                window.carouselFullscreenDisplayModes[carouselId][itemIndex] = mode;
            } else {
                window.carouselDisplayModes[carouselId] = window.carouselDisplayModes[carouselId] || {};
                window.carouselDisplayModes[carouselId][itemIndex] = mode;
            }
            const carousel = document.getElementById(carouselId);
            if (!carousel) return;
            const item = carousel.querySelectorAll('.carousel-item')[itemIndex];
            applyDisplayMode(item, mode, forceFullscreen);
        }

        function getDisplayMode(carouselId, itemIndex, forceFullscreenContext = false) {
            if (document.fullscreenElement || forceFullscreenContext) {
                return window.carouselFullscreenDisplayModes?.[carouselId]?.[itemIndex] || 'fit';
            }
            return window.carouselDisplayModes[carouselId]?.[itemIndex] || 'fill';
        }
        
        const persistDisplayMode = (carouselIdLocal, itemIndex, mode) => {
            if (!carouselIdLocal) return;
            try {
                savedState[carouselIdLocal] = savedState[carouselIdLocal] || {};
                savedState[carouselIdLocal].displayModes = savedState[carouselIdLocal].displayModes || {};
                savedState[carouselIdLocal].displayModes[itemIndex] = mode;
                localStorage.setItem('playerState', JSON.stringify(savedState));
            } catch (e) { /* silent */ }
        };

    // Debounce utilitário para evitar execuções excessivas no resize
    const debounce = (fn, wait = 120) => {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    };

    // Centraliza o título ativo na barra de sumário (tenta novamente se elementos ainda não medem)
    // Movido para escopo global para ser acessível no resizeFinalize
    const centerSummary = (summaryContainer, summaryInnerWrapper, summaryTitles, currentIndex, attempt = 0) => {
        if (!summaryContainer || !summaryInnerWrapper || !summaryTitles || summaryTitles.length === 0) return false;
        const containerWidth = summaryContainer.offsetWidth;
        const activeTitle = summaryTitles[currentIndex];
        if (containerWidth === 0 || !activeTitle || activeTitle.offsetWidth === 0) {
            if (attempt < 8) setTimeout(() => centerSummary(summaryContainer, summaryInnerWrapper, summaryTitles, currentIndex, attempt + 1), 40);
            return false;
        }
        summaryTitles.forEach((span, index) => span.classList.toggle('active-summary', index === currentIndex));
        const contentWidth = summaryInnerWrapper.scrollWidth;
        let transformX;
        if (contentWidth <= containerWidth) transformX = (containerWidth - contentWidth) / 2;
        else {
            const containerCenter = containerWidth / 2;
            const titleCenter = activeTitle.offsetLeft + activeTitle.offsetWidth / 2;
            transformX = containerCenter - titleCenter;
        }
        summaryInnerWrapper.style.transform = `translateX(${transformX}px)`;
        return true;
    };

    // Nota: imagem vertical agora usa max-width/max-height para encolher dentro do carrossel

    // Inicialização do carrossel (lógica central)
    const initCarousel = (carouselId, savedIndex = 0) => {
        const carouselWrapper = document.getElementById(carouselId);
        if (!carouselWrapper) return null;

        carouselWrapper.addEventListener('click', () => { lastActiveCarouselId = carouselId; });

        const container = carouselWrapper.querySelector('.carousel-container');
        const slidesContainer = carouselWrapper.querySelector('.carousel-slides');
        const prevButton = carouselWrapper.querySelector('.prev-button');
        const nextButton = carouselWrapper.querySelector('.next-button');
        const carouselItems = carouselWrapper.querySelectorAll('.carousel-item');
        const summaryContainer = carouselWrapper.querySelector('.carousel-summary-container');
        const summaryInnerWrapper = summaryContainer.querySelector('.summary-inner-wrapper');

        if (carouselItems.length === 0) return null;

        let justSwiped = false;

        const updateSummaryMasks = () => {
            if (!summaryContainer) return;
            summaryContainer.classList.toggle('hide-mask-left', currentIndex === 0);
            summaryContainer.classList.toggle('hide-mask-right', currentIndex === totalItems - 1);
        };
        if(summaryInnerWrapper) summaryInnerWrapper.addEventListener('transitionend', updateSummaryMasks);

        let currentIndex = savedIndex;
        const totalItems = carouselItems.length;
        const summaryTitles = [];

        const iconPlay = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        const iconPause = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        const iconVolumeHigh = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        const iconVolumeMuted = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
        const iconPlayback = {
            pause_on_end: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><title>Parar no final (P)</title><path d="M8 8h8v8H8z"/></svg>`,
            repeat: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><title>Repetir vídeo (P)</title><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>`,
            next: `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><title>Tocar próximo (P)</title><path d="M16 6h2v12h-2zm-4.5 6L4 6v12l7.5-6z"/></svg>`
        };
        const iconFullscreen = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>`;
        const iconPrev = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>`;
        const iconNext = `<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>`;
        const iconShare = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>`;
        const iconCheck = `<svg class="w-6 h-6" fill="none" stroke="#4ade80" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        const iconPip = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;

        prevButton.innerHTML = iconPrev;
        nextButton.innerHTML = iconNext;
        let playerState = { currentSpeed: 1.0, playbackModeIndex: 2, playbackModes: ['pause_on_end', 'repeat', 'next'], isGloballyPlaying: false };
    // Tenta reproduzir o vídeo protegendo contra exceções de autoplay
    const safePlay = (videoElement) => { if (videoElement?.play) videoElement.play().catch(e => { if (e.name !== 'AbortError') console.error("Erro ao tentar reproduzir vídeo:", e); }); };
    const formatTime = (time) => { const m = Math.floor(time / 60), s = Math.floor(time % 60); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };

        let isSwitchingMode = false;

            const updateCarousel = (shouldAutoplay = false, isFade = false, prevIndex = null) => {
            // Fecha qualquer popup de sumário aberto ao mudar de slide
            carouselWrapper.querySelectorAll('.summary-popup.visible').forEach(p => p.classList.remove('visible'));

            const actualAutoplay = shouldAutoplay && (carouselId === lastActiveCarouselId);
            const slideWidth = container.offsetWidth;
            if (slideWidth === 0) return;

            carouselItems.forEach((item, index) => {
                item.classList.toggle('active-slide', index === currentIndex);
                
                // Injeta o overlay de tema se não existir (para colorir vizinhos e fundo blur)
                const contentWrapper = item.querySelector('.content-wrapper');
                if (contentWrapper && !contentWrapper.querySelector('.theme-overlay')) {
                    const overlay = document.createElement('div');
                    overlay.className = 'theme-overlay';
                    contentWrapper.appendChild(overlay);
                }

                if (index !== currentIndex) item.querySelector('.media-container video')?.pause();
                item.querySelector('.video-title')?.classList.remove('title-hidden-by-user');
                // Força o preenchimento do título para slides de imagem
                if (item.dataset.type === 'image') {
                    const titleDiv = item.querySelector('.video-title');
                    if (titleDiv && item.dataset.title) {
                        titleDiv.textContent = item.dataset.title;
                    }
                }
            });
            if (document.fullscreenElement) {
                const currentItem = carouselItems[currentIndex];
                applyDisplayMode(currentItem, getDisplayMode(carouselId, currentIndex), true);
            }
            
            if (isFade && document.fullscreenElement) {
                // Fade transition for fullscreen
                if (!container.classList.contains('fade-mode')) {
                    // Primeira vez no modo fade: preparar estado inicial para um crossfade suave
                    isSwitchingMode = true;
                    slidesContainer.style.transition = 'none';
                    slidesContainer.style.transform = 'translateX(0)';
                    // Define estado inicial: anterior visível (1), atual oculto (0), demais 0
                    carouselItems.forEach((item, index) => {
                        const isPrev = typeof prevIndex === 'number' && index === prevIndex;
                        const isCurr = index === currentIndex;
                        item.style.transition = 'none';
                        if (isPrev) {
                            item.style.opacity = '1';
                            item.style.zIndex = '9';
                        } else if (isCurr) {
                            // Se não houver prevIndex (navegação direta), evita tela preta
                            item.style.opacity = (typeof prevIndex === 'number') ? '0' : '1';
                            item.style.zIndex = '10';
                        } else {
                            item.style.opacity = '0';
                            item.style.zIndex = '1';
                        }
                    });
                    container.classList.add('fade-mode');
                    // Força o layout antes de animar
                    void slidesContainer.offsetWidth;
                    setTimeout(() => {
                        carouselItems.forEach((item, index) => {
                            item.style.transition = 'opacity 0.5s ease-in-out';
                            const isPrev = typeof prevIndex === 'number' && index === prevIndex;
                            const isCurr = index === currentIndex;
                            if (isCurr) { item.style.opacity = '1'; item.style.zIndex = '10'; }
                            else if (isPrev) { item.style.opacity = '0'; item.style.zIndex = '9'; }
                            else { item.style.opacity = '0'; item.style.zIndex = '1'; }
                        });
                        isSwitchingMode = false;
                    }, 20);
                } else {
                    container.classList.add('fade-mode');
                    carouselItems.forEach((item, index) => {
                        item.style.transition = 'opacity 0.5s ease-in-out';
                        if (index === currentIndex) {
                            item.style.opacity = '1';
                            item.style.zIndex = '10';
                        } else {
                            item.style.opacity = '0';
                            item.style.zIndex = '1';
                        }
                    });
                }
                slidesContainer.style.transform = 'translateX(0)';
            } else {
                // Slide mode
                const wasFade = container.classList.contains('fade-mode');
                if (wasFade) {
                    // Remove fade-mode so items become part of normal flow
                    container.classList.remove('fade-mode');
                    // Ensure items have visible opacity
                    carouselItems.forEach(item => {
                        item.style.opacity = '';
                        item.style.zIndex = '';
                        item.style.transition = '';
                    });
                    // If we have a previous index, position at prevIndex then animate to currentIndex
                    const fromIndex = (typeof prevIndex === 'number' && prevIndex >= 0) ? prevIndex : currentIndex;
                    slidesContainer.style.transition = 'none';
                    slidesContainer.style.transform = `translateX(${-fromIndex * slideWidth}px)`;
                    // Small timeout to ensure immediate transform applied, then animate to currentIndex
                    setTimeout(() => {
                        slidesContainer.style.transition = 'transform 0.5s ease-in-out';
                        slidesContainer.style.transform = `translateX(${-currentIndex * slideWidth}px)`;
                    }, 20);
                } else {
                    // Normal slide navigation: animate to the target page
                    slidesContainer.style.transition = 'transform 0.5s ease-in-out';
                    slidesContainer.style.transform = `translateX(${-currentIndex * slideWidth}px)`;
                }
            }

            const currentItem = carouselItems[currentIndex];
            if (actualAutoplay) { setTimeout(() => { const v = currentItem.querySelector('.media-container video'); if (v) safePlay(v); }, 500); }

            // Deep Linking: Atualiza a URL para refletir o slide atual
            if (carouselId === lastActiveCarouselId) {
                history.replaceState(null, null, `#${carouselId}/${currentIndex + 1}`);
            }

            prevButton.style.display = currentIndex === 0 ? 'none' : 'block';
            nextButton.style.display = currentIndex === totalItems - 1 ? 'none' : 'block';
            const paginationEl = currentItem.querySelector('.carousel-pagination');
            if (paginationEl) paginationEl.textContent = `${currentIndex + 1} / ${totalItems}`;
            
            // Otimização: Adia o cálculo de layout do sumário para o próximo frame para evitar travamentos na transição
            requestAnimationFrame(() => {
                centerSummary(summaryContainer, summaryInnerWrapper, summaryTitles, currentIndex);
                updateSummaryMasks();
            });
        };

        // Monitora mudanças de tamanho no container (ex: scrollbar aparecendo) para corrigir alinhamento
        new ResizeObserver(() => {
            requestAnimationFrame(() => updateCarousel(playerState.isGloballyPlaying));
        }).observe(container);


        const navigateTo = (direction, isFade = false) => {
            const originalIndex = currentIndex;
            let shouldAutoplay = playerState.isGloballyPlaying;
            if (direction === 'next' && currentIndex < totalItems - 1) currentIndex++;
            else if (direction === 'prev' && currentIndex > 0) currentIndex--;
            if (originalIndex !== currentIndex) {
                updateCarousel(shouldAutoplay, isFade, originalIndex);
                carouselItems[originalIndex].querySelector('.comment-box')?.classList.remove('visible');
            }
        };
        
        const initialLoad = () => {
            requestAnimationFrame(() => {
                summaryInnerWrapper.classList.remove('animated');
                setTimeout(() => { updateCarousel(false); summaryInnerWrapper.classList.add('animated'); }, 40);
            });
        };

        // Drag / swipe handling - Optimized for performance
        let isDragging = false, isSwipe = false, startX, startY, currentTranslate, prevTranslate, animationFrame;
    let isSnapping = false, snapStart = 0, snapEnd = 0, snapStartTime = 0, snapDuration = 400;
    let velocity = 0, lastDragX = 0, lastDragTime = 0;

        const updateSlideVisuals = (translate) => {
            const slideWidth = container.offsetWidth;
            const isDark = document.documentElement.classList.contains('theme-dark');

            carouselItems.forEach((item, index) => {
                const wrapper = item.querySelector('.content-wrapper');
                const mediaContainer = item.querySelector('.media-container');
                const dist = Math.abs((translate + index * slideWidth) / slideWidth);
                
                if (dist < 1) {
                    const t = dist;
                    const opacity = 1 - (0.78 * t); 
                    const scale = 1 - (0.1 * t);   
                    const z = -400 * t;            
                    const saturate = Math.max(0, 1 - t);
                    
                    let brightness = 1;
                    let contrast = 1;
                    if (isDark) {
                        brightness = 1 + (0.5 * t); 
                        contrast = 1 - (0.6 * t);   
                    } else {
                        brightness = 1 - (0.2 * t); 
                    }

                    item.style.opacity = opacity;
                    item.style.setProperty('--blur-sat', saturate);
                    item.style.setProperty('--overlay-opacity', 1 - saturate); // Controla a opacidade da cor do tema (0 = ativo, 1 = inativo)
                    if (mediaContainer) {
                        // OTIMIZAÇÃO: Removemos o blur dinâmico durante o arrasto para evitar travamentos em imagens grandes.
                        // Aplicamos apenas brilho/contraste que são leves para a GPU.
                        let filterVal = `blur(0px) brightness(${brightness})`;
                        if (isDark) filterVal += ` contrast(${contrast})`;
                        mediaContainer.style.filter = filterVal;
                    }
                    if (wrapper) wrapper.style.transform = `translateZ(${z}px) scale(${scale})`;
                } else {
                    const opacity = 0.22;
                    const scale = 0.9;
                    const z = -400;
                    const blur = 1;
                    let brightness = isDark ? 1.5 : 0.8;
                    let contrast = isDark ? 0.4 : 1;

                    item.style.opacity = opacity;
                    item.style.setProperty('--blur-sat', 0);
                    item.style.setProperty('--overlay-opacity', 1);
                    if (mediaContainer) {
                        let filterVal = `blur(${blur}px) brightness(${brightness})`;
                        if (isDark) filterVal += ` contrast(${contrast})`;
                        mediaContainer.style.filter = filterVal;
                    }
                    if (wrapper) wrapper.style.transform = `translateZ(${z}px) scale(${scale})`;
                }
            });
        };

        const resetItemStyles = () => {
            carouselItems.forEach(item => {
                item.style.transition = '';
                item.style.opacity = '';
                item.style.removeProperty('--blur-sat');
                item.style.removeProperty('--overlay-opacity');
                const wrapper = item.querySelector('.content-wrapper');
                const mediaContainer = item.querySelector('.media-container');
                if (mediaContainer) {
                    mediaContainer.style.filter = '';
                    mediaContainer.style.transition = '';
                }
                if (wrapper) {
                    wrapper.style.transition = '';
                    wrapper.style.transform = '';
                    const overlay = wrapper.querySelector('.theme-overlay');
                    if (overlay) overlay.style.transition = '';
                    const blurVideo = wrapper.querySelector('.blur-video-bg');
                    if (blurVideo) blurVideo.style.transition = '';
                }
            });
        };

        const dragStart = (e) => {
            // Ignore clicks on specific interactive elements, but allow dragging on the container/overlays
            if (e.target.closest('.comment-box, .summary-popup, .carousel-pagination')) return;
            // Bloqueia inputs e botões internos dos controles, mas permite arrastar no fundo (degradê)
            if (e.target.closest('.custom-controls') && e.target.closest('button, input, a, .fit-mode-toggle')) return;
            if (e.target.tagName === 'INPUT') return;

            // Se estiver animando snap, interrompe imediatamente
            if (isSnapping) {
                isSnapping = false;
                cancelAnimationFrame(animationFrame);
                // Usa a posição atual do snap como ponto de partida
                prevTranslate = getCurrentSlidesTranslate();
            } else {
                prevTranslate = -currentIndex * container.offsetWidth;
            }

            isDragging = true;
            isSwipe = false;

            const isTouch = e.type.startsWith('touch');
            startX = isTouch ? e.touches[0].clientX : e.pageX;
            startY = isTouch ? e.touches[0].clientY : e.pageY;
            
            lastDragX = startX;
            lastDragTime = Date.now();
            velocity = 0;

            // Disable transitions for instant feedback and hint browser for performance
            slidesContainer.style.transition = 'none';
            slidesContainer.style.willChange = 'transform';
            container.classList.add('cursor-grabbing');
            
            // Desabilita transições dos itens para atualização em tempo real
            carouselItems.forEach(item => {
                item.style.transition = 'none';
                const wrapper = item.querySelector('.content-wrapper');
                const mediaContainer = item.querySelector('.media-container');
                if (wrapper) {
                    wrapper.style.transition = 'none';
                    wrapper.style.willChange = 'transform'; // Otimiza a performance da GPU para o wrapper
                    const overlay = wrapper.querySelector('.theme-overlay');
                    if (overlay) overlay.style.transition = 'none';
                    const blurVideo = wrapper.querySelector('.blur-video-bg');
                    if (blurVideo) blurVideo.style.transition = 'none';
                }
                if (mediaContainer) mediaContainer.style.transition = 'none';
            });

            // Add move and end listeners to the window to allow dragging outside the container bounds
            window.addEventListener(isTouch ? 'touchmove' : 'mousemove', dragMove, { passive: false });
            window.addEventListener(isTouch ? 'touchend' : 'mouseup', dragEnd);

            // Helper para pegar a posição atual do transform
            function getCurrentSlidesTranslate() {
                const style = window.getComputedStyle(slidesContainer);
                const matrix = new DOMMatrixReadOnly(style.transform);
                return matrix.m41;
            }
        };

        const dragMove = (e) => {
            if (!isDragging) return;

            const isTouch = e.type.startsWith('touch');
            const currentX = isTouch ? e.touches[0].clientX : e.pageX;
            const currentY = isTouch ? e.touches[0].clientY : e.pageY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            // Distinguish between a vertical page scroll and a horizontal carousel swipe
            if (!isSwipe && Math.abs(deltaY) > Math.abs(deltaX) + 5) {
                dragEnd(e); // It's a vertical scroll, so cancel the drag
                return;
            }

            // A swipe is confirmed after a small horizontal movement
            if (Math.abs(deltaX) > 5) {
                isSwipe = true;
            }

            if (isSwipe) {
                e.preventDefault(); // Prevent default actions like text selection
                
                const now = Date.now();
                const dt = now - lastDragTime;
                if (dt > 0) {
                    const v = (currentX - lastDragX) / dt;
                    velocity = 0.6 * v + 0.4 * velocity; // Suavização simples da velocidade
                    lastDragX = currentX;
                    lastDragTime = now;
                }
                currentTranslate = prevTranslate + (deltaX * 0.85);
                
                // Schedule the transform update with requestAnimationFrame for smoother rendering
                cancelAnimationFrame(animationFrame);
                animationFrame = requestAnimationFrame(() => {
                    slidesContainer.style.transform = `translateX(${currentTranslate}px)`;
                    
                    updateSlideVisuals(currentTranslate);
                });
            }
        };

        const dragEnd = (e) => {
            if (!isDragging) return;

            const isTouch = e.type.startsWith('touch');
            // Clean up global listeners
            window.removeEventListener(isTouch ? 'touchmove' : 'mousemove', dragMove);
            window.removeEventListener(isTouch ? 'touchend' : 'mouseup', dragEnd);

            cancelAnimationFrame(animationFrame);

            // Reset styles and classes
            container.classList.remove('cursor-grabbing');
            slidesContainer.style.willChange = 'auto';
            carouselItems.forEach(item => { const w = item.querySelector('.content-wrapper'); if(w) w.style.willChange = 'auto'; });
            
            if (isSwipe) {
                justSwiped = true;
                setTimeout(() => { justSwiped = false; }, 0);

                const slideWidth = container.offsetWidth;
                const movedBy = currentTranslate - prevTranslate;
                const threshold = slideWidth * 0.15; // Swipe threshold: 15% of container width
                
                // Momentum: zera se o usuário segurou por mais de 100ms antes de soltar
                if (Date.now() - lastDragTime > 100) velocity = 0;
                const momentum = velocity * 125; // Fator de projeção
                const projectedTranslate = currentTranslate + momentum;

                const oldIndex = currentIndex;
                
                // Calcula o índice baseado na posição final (permite pular múltiplos slides)
                let newIndex = Math.round(-projectedTranslate / slideWidth);

                // Se o movimento foi pequeno (<50%) mas maior que o threshold (15%), força mover 1
                if (newIndex === oldIndex) {
                    if (movedBy < -threshold) newIndex = oldIndex + 1;
                    else if (movedBy > threshold) newIndex = oldIndex - 1;
                }

                // Garante limites
                currentIndex = Math.max(0, Math.min(newIndex, totalItems - 1));
                
                // Duração dinâmica baseada na distância (mais slides = mais tempo, até um limite)
                const distSlides = Math.abs(currentIndex - oldIndex);
                const duration = 400 + Math.min(600, distSlides * 100);

                if (oldIndex !== currentIndex) {
                    centerSummary(summaryContainer, summaryInnerWrapper, summaryTitles, currentIndex);
                    updateSummaryMasks();
                    carouselItems.forEach((item, index) => {
                        item.classList.toggle('active-slide', index === currentIndex);
                    });
                }

                // Snap animado para a posição final
                const start = currentTranslate;
                const end = -currentIndex * container.offsetWidth;
                let startTime = null;
                isSnapping = true;
                function animateSnap(ts) {
                    if (!isSnapping) return;
                    if (!startTime) startTime = ts;
                    const elapsed = ts - startTime;
                    const t = Math.min(1, elapsed / duration);
                    // EaseOutCubic
                    const ease = 1 - Math.pow(1 - t, 3);
                    const value = start + (end - start) * ease;
                    slidesContainer.style.transform = `translateX(${value}px)`;
                    updateSlideVisuals(value);

                    if (t < 1 && isSnapping) {
                        animationFrame = requestAnimationFrame(animateSnap);
                    } else {
                        slidesContainer.style.transform = `translateX(${end}px)`;
                        
                        updateCarousel(playerState.isGloballyPlaying);

                        // Garante estado final exato e limpa estilos inline sem animar (enquanto transition: none)
                        updateSlideVisuals(end);
                        carouselItems.forEach(item => {
                            item.style.opacity = '';
                            item.style.filter = '';
                            const wrapper = item.querySelector('.content-wrapper');
                            const mediaContainer = item.querySelector('.media-container');
                            if (mediaContainer) mediaContainer.style.filter = '';
                            if (wrapper) wrapper.style.transform = '';
                        });
                        void slidesContainer.offsetWidth; // Força reflow para aplicar mudanças instantaneamente

                        isSnapping = false;
                        resetItemStyles();
                    }
                }
                animationFrame = requestAnimationFrame(animateSnap);
            } else {
                // This was a "click" or "tap" since no significant swipe occurred
                resetItemStyles();
                // Permite click em botões (ex: prev/next) mas previne em outros elementos para evitar duplicidade com a lógica abaixo
                if (e.type === 'touchend' && !e.target.closest('button, a, input')) e.preventDefault();

                // Só interage se o clique for no slide ativo
                const activeItem = carouselItems[currentIndex];
                if (!activeItem.contains(e.target)) return;

                const video = activeItem.querySelector('.media-container video');
                const commentBox = carouselItems[currentIndex].querySelector('.comment-box');
                const commentIcon = carouselItems[currentIndex].querySelector('.comment-icon');
                const summaryPopup = carouselItems[currentIndex].querySelector('.summary-popup');
                const paginationEl = carouselItems[currentIndex].querySelector('.carousel-pagination');

                if (commentBox && commentBox.classList.contains('visible') && !commentBox.contains(e.target) && !commentIcon?.contains(e.target)) {
                    commentBox.classList.remove('visible');
                } else if (summaryPopup && summaryPopup.classList.contains('visible') && !summaryPopup.contains(e.target) && !paginationEl?.contains(e.target)) {
                    summaryPopup.classList.remove('visible');
                }
                else if (video && !e.target.closest('.comment-box, .comment-icon, .summary-popup, .carousel-pagination')) {
                    video.paused ? safePlay(video) : video.pause();
                }
            }

            // Reset state for the next interaction
            isDragging = false;
            isSwipe = false;
        };

        // Attach only the 'start' event listeners to the container
        container.addEventListener('mousedown', dragStart);
        container.addEventListener('touchstart', dragStart, { passive: false });

        carouselItems.forEach((item, index) => {
            item.classList.toggle('active-slide', index === currentIndex);
            const titleSpan = document.createElement('span');
            const rawTitle = item.dataset.title || '';
            titleSpan.textContent = '';
            titleSpan.className = 'summary-title';
            const inner = document.createElement('span');
            inner.className = 'summary-title-inner';
            inner.textContent = rawTitle;
            titleSpan.appendChild(inner);
            titleSpan.addEventListener('click', () => { if (index !== currentIndex) { currentIndex = index; updateCarousel(playerState.isGloballyPlaying); }});
            summaryInnerWrapper.appendChild(titleSpan);
            summaryTitles.push(titleSpan);
            const titleElement = item.querySelector('.video-title');
            if(titleElement && item.dataset.title) titleElement.textContent = item.dataset.title;
            const contentWrapper = item.querySelector('.content-wrapper');

            // --- Lógica do Sumário Interativo (Popup) ---
            const paginationEl = item.querySelector('.carousel-pagination');
            if (paginationEl) {
                paginationEl.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // Verifica se foi acionado pelo título (flag definida no evento do título)
                    const isTitleTrigger = carouselWrapper.dataset.lastTrigger === 'title';
                    carouselWrapper.dataset.lastTrigger = ''; // Reseta a flag
                    
                    // Fecha outros popups abertos neste carrossel
                    carouselWrapper.querySelectorAll('.summary-popup.visible').forEach(p => {
                        if (p.parentElement !== contentWrapper) p.classList.remove('visible');
                    });

                    let popup = item.querySelector('.summary-popup');
                    if (!popup) {
                        // Cria o popup se não existir
                        popup = document.createElement('div');
                        popup.className = 'summary-popup custom-scrollbar';
                        popup.addEventListener('click', (e) => e.stopPropagation());
                        
                        const header = document.createElement('div');
                        header.className = 'summary-popup-header';
                        header.innerHTML = '<h5 class="font-bold">Sumário</h5><button class="close-summary-btn" title="Fechar">&times;</button>';
                        popup.appendChild(header);

                        const list = document.createElement('ul');
                        list.className = 'summary-popup-list';
                        
                        carouselItems.forEach((it, idx) => {
                            const li = document.createElement('li');
                            li.textContent = `${idx + 1}. ${it.dataset.title || 'Sem título'}`;
                            li.addEventListener('click', (ev) => {
                                ev.stopPropagation();
                                if (idx !== currentIndex) {
                                    currentIndex = idx;
                                    updateCarousel(playerState.isGloballyPlaying);
                                }
                                popup.classList.remove('visible');
                            });
                            list.appendChild(li);
                        });
                        popup.appendChild(list);
                        
                        header.querySelector('.close-summary-btn').addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            popup.classList.remove('visible');
                        });
                        contentWrapper.appendChild(popup);
                    }

                    // Atualiza estado ativo
                    popup.querySelectorAll('li').forEach((li, idx) => li.classList.toggle('active', idx === currentIndex));
                    
                    if (popup.classList.contains('visible')) {
                        popup.classList.remove('visible');
                    } else {
                        if (isTitleTrigger) popup.classList.add('center-aligned');
                        else popup.classList.remove('center-aligned');
                        void popup.offsetWidth; // Força reflow para evitar animação de posição cruzada
                        popup.classList.add('visible');
                    }
                });
            }

            // --- Ocultação automática dos controles customizados ---
            let state = { hideControlsTimeout: null, lastPointerTime: Date.now() };
            
            const video = item.querySelector('.media-container video');
            // Função para mostrar controles e resetar timer
            const showControls = (evt, force = false) => {
                if (force || item.classList.contains('active-slide')) {
                    container.classList.add('controls-visible');
                }
                contentWrapper.classList.remove('hide-cursor');
                clearTimeout(state.hideControlsTimeout);
                state.lastPointerTime = Date.now();
                // Inicia timer se mouse está sobre o wrapper OU se for forçado (ex: fullscreen)
                // MODIFICADO: Sempre inicia timer, mesmo se não estiver hover, para garantir sumiço após pause/play por atalho
                state.hideControlsTimeout = setTimeout(() => {
                    // Só oculta se mouse está parado e não há interação
                    if (Date.now() - state.lastPointerTime >= 2800) hideControls();
                }, 3000);
            };
            // Permite acesso externo para fullscreen
            contentWrapper._showControls = showControls;
            // Função para ocultar controles
            const hideControls = (e) => {
                // Se estiver indo para os botões de navegação, não oculta e limpa o timer
                if (e && e.relatedTarget && (
                    e.relatedTarget.closest('.prev-button') || 
                    e.relatedTarget.closest('.next-button')
                )) {
                    clearTimeout(state.hideControlsTimeout);
                    return;
                }
                container.classList.remove('controls-visible');
                contentWrapper.classList.add('hide-cursor');
            };
            // Sempre que mousemove, reseta timer e mostra controles
            contentWrapper.addEventListener('mousemove', (e) => {
                state.lastPointerTime = Date.now();
                showControls(e);
            });
            // Mouse entra: mostra controles e inicia timer
            contentWrapper.addEventListener('mouseenter', (e) => {
                state.lastPointerTime = Date.now();
                showControls(e);
            });
            // Mouse sai: oculta imediatamente
            contentWrapper.addEventListener('mouseleave', hideControls);
            // Touch: mostra controles e inicia timer
            contentWrapper.addEventListener('touchstart', (e) => {
                state.lastPointerTime = Date.now();
                showControls(e);
            }, {passive:true});
            // Se clicar em qualquer controle, mostra e reseta timer
            contentWrapper.addEventListener('click', (e) => {
                state.lastPointerTime = Date.now();
                showControls(e);
            });
            // Quando vídeo começa a tocar, mostra controles e inicia timer
            if (video) {
                video.addEventListener('play', () => {
                    state.lastPointerTime = Date.now();
                    showControls(undefined, true); // MODIFICADO: força mostrar e iniciar timer ao dar play
                });
                video.addEventListener('pause', () => {
                    showControls(undefined, true); // MODIFICADO: força mostrar e iniciar timer ao pausar
                });
            }
            // Inicializa controles visíveis ao carregar
            showControls();
            
            const mediaContainer = item.querySelector('.media-container');
            if (mediaContainer) {
                // Garante modo padrão se nenhum estiver definido
                if (!mediaContainer.classList.contains('fill-mode') && !mediaContainer.classList.contains('fit-mode')) {
                    mediaContainer.classList.add('fill-mode');
                }
                
                // AGRESSIVO: Sincroniza is-filled para TODOS os itens fill-mode na inicialização
                if (mediaContainer.classList.contains('fill-mode') && contentWrapper) contentWrapper.classList.add('is-filled');
                
                try {
                    const savedModes = savedState[carouselId]?.displayModes || {};
                    const sv = savedModes[index];
                    if (sv === 'fit') setDisplayMode(carouselId, index, 'fit', false);
                    else if (sv === 'fill') setDisplayMode(carouselId, index, 'fill', false);

                } catch (err) { /* silent */ }
            }
            const commentIcon = item.querySelector('.comment-icon');
            const commentBox = item.querySelector('.comment-box');
            if (commentIcon && commentBox) {
                const commentId = `${carouselId}-item-${index}`;
                if (!localStorage.getItem(`commentSeen-${commentId}`)) commentIcon.classList.add('glowing');
                commentIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    commentBox.classList.toggle('visible');
                    commentIcon.classList.remove('glowing');
                    localStorage.setItem(`commentSeen-${commentId}`, 'true');
                });
                // Botão de fechar comentário
                const closeBtn = commentBox.querySelector('.close-comment-btn');
                if (closeBtn) {
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        commentBox.classList.remove('visible');
                    });
                }

                // Tornar a caixa de comentários móvel (Item 10)
                const commentTitle = commentBox.querySelector('h5');
                if (commentTitle) {
                    let isDraggingBox = false, startX, startY, startLeft, startTop;
                    
                    commentTitle.addEventListener('mousedown', (e) => {
                        e.stopPropagation(); // Impede arrastar o carrossel
                        e.preventDefault();  // Impede seleção de texto no título
                        isDraggingBox = true;
                        startX = e.clientX;
                        startY = e.clientY;
                        
                        // Usa offsetLeft/Top para obter a posição local correta e inicializar o drag
                        startLeft = commentBox.offsetLeft;
                        startTop = commentBox.offsetTop;
                        
                        commentBox.style.bottom = 'auto';
                        commentBox.style.right = 'auto';
                        commentBox.style.left = `${startLeft}px`;
                        commentBox.style.top = `${startTop}px`;
                        commentBox.style.margin = '0';
                        
                        const onMouseMove = (e) => {
                            if (!isDraggingBox) return;
                            const dx = e.clientX - startX;
                            const dy = e.clientY - startY;
                            
                            let newLeft = startLeft + dx;
                            let newTop = startTop + dy;

                            // Restrições para manter a caixa dentro do slide
                            const maxW = contentWrapper.offsetWidth - commentBox.offsetWidth;
                            const maxH = contentWrapper.offsetHeight - commentBox.offsetHeight;

                            newLeft = Math.max(0, Math.min(newLeft, maxW));
                            newTop = Math.max(0, Math.min(newTop, maxH));

                            commentBox.style.left = `${newLeft}px`;
                            commentBox.style.top = `${newTop}px`;
                        };
                        
                        const onMouseUp = () => {
                            isDraggingBox = false;
                            window.removeEventListener('mousemove', onMouseMove);
                            window.removeEventListener('mouseup', onMouseUp);
                        };
                        
                        window.addEventListener('mousemove', onMouseMove);
                        window.addEventListener('mouseup', onMouseUp);
                    });
                }
            }

            const handleFullscreen = (e) => {
                e.stopPropagation();
                if (!document.fullscreenElement) {
                    const currentMode = getDisplayMode(carouselId, index);
                    item.dataset.modeBeforeFullscreen = currentMode;
                    
                    let fsMode = getDisplayMode(carouselId, index, true);
                    if (!enableFullscreenDisplayModeToggle) {
                        fsMode = 'fit';
                    }
                    try { setDisplayMode(carouselId, index, fsMode, true); } catch (err) { }
                    fullscreenCarouselId = carouselId;
                    scrollPositionBeforeFullscreen = { x: window.scrollX, y: window.scrollY };
                    container.classList.add('fullscreen-transition-active');
                    container.requestFullscreen();
                } else {
                    container.classList.add('fullscreen-transition-active');
                    document.exitFullscreen();
                }
            };

            if (item.dataset.type === 'image') {
                if (titleElement) {
                    // Exibe o título em fullscreen
                    document.addEventListener('fullscreenchange', () => {
                        if (document.fullscreenElement) {
                            titleElement.classList.add('show-title-fullscreen');
                            titleElement.classList.remove('title-hidden-by-user');
                        } else {
                            titleElement.classList.remove('show-title-fullscreen');
                               // Resetar o modo de exibição fullscreen ao sair do fullscreen
                               fullscreenDisplayMode = 'fit';
                        }
                    });
                    // Não oculta mais o título ao clicar na imagem
                }
                item.querySelector('img').draggable = false;
                
                const imgEl = item.querySelector('img');
                if (imgEl) {
                    const clickHandler = (e) => {
                        e.stopPropagation(); 
                        if (justSwiped) return;
                        if (!item.classList.contains('active-slide')) return;
                        if (document.fullscreenElement) {
                            if (enableFullscreenDisplayModeToggle) { 
                                const currentFs = getDisplayMode(carouselId, index);
                                setDisplayMode(carouselId, index, currentFs === 'fill' ? 'fit' : 'fill', true); 
                            }
                        } else {
                            const currentMode = getDisplayMode(carouselId, index);
                            const newMode = currentMode === 'fill' ? 'fit' : 'fill';
                            setDisplayMode(carouselId, index, newMode, false);
                        }
                    };
                    imgEl.addEventListener('click', clickHandler);
                    contentWrapper.addEventListener('click', clickHandler);
                }
                const fullscreenBtn = item.querySelector('.fullscreen-btn');
                if (fullscreenBtn) { fullscreenBtn.innerHTML = iconFullscreen; fullscreenBtn.addEventListener('click', handleFullscreen); }
                return;
            }

            if (!video) return;
            // Exibe o título do vídeo em fullscreen apenas quando pausado
            if (titleElement) {
                function updateVideoTitleVisibility() {
                    if (document.fullscreenElement && video.paused) {
                        titleElement.classList.add('show-title-fullscreen');
                    } else {
                        titleElement.classList.remove('show-title-fullscreen');
                    }
                }
                video.addEventListener('pause', updateVideoTitleVisibility);
                video.addEventListener('play', updateVideoTitleVisibility);
                document.addEventListener('fullscreenchange', updateVideoTitleVisibility);
            }
            const playPauseBtn = item.querySelector('.play-pause-btn'), progressBar = item.querySelector('.progress-bar'), timeDisplay = item.querySelector('.time-display'), speedBtn = item.querySelector('.speed-btn'), fullscreenBtn = item.querySelector('.fullscreen-btn'), shareBtn = item.querySelector('.share-btn'), volumeBtn = item.querySelector('.volume-btn'), volumeSlider = item.querySelector('.volume-slider'), playbackModeBtn = item.querySelector('.playback-mode-btn'), thumbnailContainer = item.querySelector('.timeline-thumbnail'), thumbnailCanvas = thumbnailContainer?.querySelector('canvas'), thumbnailCtx = thumbnailCanvas?.getContext('2d'), thumbnailVideo = document.createElement('video'), fitModeToggle = item.querySelector('.fit-mode-toggle');

            // Cria/exibe o elemento de tempo acima da miniatura (garante que thumbnailContainer exista)
            let previewTimeEl = null;
            if (thumbnailContainer) {
                previewTimeEl = thumbnailContainer.querySelector('.preview-time');
                if (!previewTimeEl) {
                    previewTimeEl = document.createElement('div');
                    previewTimeEl.className = 'preview-time';
                    previewTimeEl.style.display = 'none';
                    thumbnailContainer.appendChild(previewTimeEl);
                }
            }
            playPauseBtn.innerHTML = iconPlay; volumeBtn.innerHTML = iconVolumeHigh; fullscreenBtn.innerHTML = iconFullscreen; if(shareBtn) shareBtn.innerHTML = iconShare; speedBtn.textContent = `${playerState.currentSpeed}x`;
            // === PROGRESS BAR COLOR ===
            // Função para atualizar o background da barra de progresso (vídeo)
            function updateProgressBarColor() {
                const percent = parseFloat(progressBar.value);
                progressBar.style.background = `linear-gradient(to right, #fff 0%, #fff ${percent}%, rgba(255,255,255,0.2) ${percent}%, rgba(255,255,255,0.2) 100%)`;
            }
            // Função para atualizar o background da barra de volume
            function updateVolumeBarColor() {
                const percent = parseFloat(volumeSlider.value) * 100;
                volumeSlider.style.background = `linear-gradient(to right, #fff 0%, #fff ${percent}%, rgba(255,255,255,0.2) ${percent}%, rgba(255,255,255,0.2) 100%)`;
            }
            // Inicializa cor ao carregar
            updateProgressBarColor();
            updateVolumeBarColor();
            video.addEventListener('loadedmetadata', () => { 
                if (isFinite(video.duration)) { 
                    timeDisplay.textContent = `00:00 / ${formatTime(video.duration)}`; 
                    video.playbackRate = playerState.currentSpeed; 
                }
                updateProgressBarColor();
            });
            if (video.currentSrc || video.src) { thumbnailVideo.src = video.currentSrc || video.src; thumbnailVideo.muted = true; thumbnailVideo.preload = 'metadata'; }
            
            thumbnailVideo.addEventListener('seeked', () => {
                if (thumbnailCtx && thumbnailVideo.videoWidth > 0) {
                    const maxThumbnailWidth = 150; 
                    const aspectRatio = thumbnailVideo.videoWidth / thumbnailVideo.videoHeight;
                    let thumbnailWidth = maxThumbnailWidth;
                    let thumbnailHeight = thumbnailWidth / aspectRatio;

                    thumbnailContainer.style.aspectRatio = `${thumbnailWidth}/${thumbnailHeight}`;
                    thumbnailCanvas.width = thumbnailWidth;
                    thumbnailCanvas.height = thumbnailHeight;

                    thumbnailCtx.clearRect(0, 0, thumbnailCanvas.width, thumbnailCanvas.height);
                    thumbnailCtx.drawImage(thumbnailVideo, 0, 0, thumbnailWidth, thumbnailHeight);

                    // Garante que o previewTimeEl exista e esteja acima da miniatura
                    let previewTimeEl = thumbnailContainer.querySelector('.preview-time');
                    if (!previewTimeEl) {
                        previewTimeEl = document.createElement('div');
                        previewTimeEl.className = 'preview-time';
                        previewTimeEl.style.display = 'none';
                        thumbnailContainer.appendChild(previewTimeEl);
                    }
                }
            });
            let pendingSeekTime = null;
            thumbnailVideo.addEventListener('seeked', () => {
                if (pendingSeekTime !== null) {
                    const t = pendingSeekTime;
                    pendingSeekTime = null;
                    if (Math.abs(t - thumbnailVideo.currentTime) > 0.05) thumbnailVideo.currentTime = t;
                }
            });

            thumbnailContainer.style.display = 'none';
            thumbnailVideo.addEventListener('loadeddata', () => { thumbnailContainer.style.display = 'none'; });

            let lastPreviewUpdate = 0;
            item.querySelector('.progress-bar-container')?.addEventListener('mousemove', (e) => {
                if (!isFinite(video.duration) || !thumbnailContainer || thumbnailVideo.readyState < 2) return;
                
                // Atualização visual da posição (sem throttle para fluidez total)
                thumbnailContainer.style.display = 'block';
                const rect = progressBar.getBoundingClientRect();
                const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const thumbWidth = thumbnailContainer.offsetWidth;
                const progressBarWidth = progressBar.offsetWidth;
                const thumbHalfWidth = thumbWidth / 2;
                const cursorPosition = percent * progressBarWidth;
                // Garante que a miniatura nunca ultrapasse os limites da barra
                let leftPx = cursorPosition - thumbHalfWidth;
                const minPx = 0;
                const maxPx = progressBarWidth - thumbWidth;
                if (leftPx < minPx) leftPx = minPx;
                if (leftPx > maxPx) leftPx = maxPx;
                thumbnailContainer.style.left = `${leftPx}px`;
                thumbnailContainer.style.transform = `translateY(-8px)`;
                // Atualiza o tempo de pré-visualização
                if (thumbnailContainer) {
                    previewTimeEl = thumbnailContainer.querySelector('.preview-time');
                    if (!previewTimeEl) {
                        previewTimeEl = document.createElement('div');
                        previewTimeEl.className = 'preview-time';
                        thumbnailContainer.appendChild(previewTimeEl);
                    }
                    const previewTime = percent * video.duration;
                    previewTimeEl.textContent = formatTime(previewTime);
                    previewTimeEl.style.display = 'block';
                    previewTimeEl.style.visibility = 'visible';
                    previewTimeEl.style.opacity = '1';
                }

                // Atualização do frame de vídeo (com throttle para reduzir carga na GPU)
                const now = Date.now();
                if (now - lastPreviewUpdate > 100) { // ~10fps para o seek do vídeo
                    lastPreviewUpdate = now;
                    const targetTime = video.duration * percent;
                    if (!thumbnailVideo.seeking) {
                        thumbnailVideo.currentTime = targetTime;
                    } else {
                        pendingSeekTime = targetTime;
                    }
                }
            });

            item.querySelector('.progress-bar-container')?.addEventListener('mouseleave', () => {
                if (thumbnailContainer) thumbnailContainer.style.display = 'none';
                if (!previewTimeEl && thumbnailContainer) previewTimeEl = thumbnailContainer.querySelector('.preview-time');
                if (previewTimeEl) previewTimeEl.style.display = 'none';
            });
            playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); video.paused ? safePlay(video) : video.pause(); });
            video.addEventListener('play', () => { playPauseBtn.innerHTML = iconPause; playerState.isGloballyPlaying = true; showControls(); });
            video.addEventListener('pause', () => { playPauseBtn.innerHTML = iconPlay; if(!video.ended) playerState.isGloballyPlaying = false; showControls(); });
            video.addEventListener('timeupdate', () => { 
                if (isFinite(video.duration)) { 
                    progressBar.value = (video.currentTime / video.duration) * 100; 
                    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`; 
                    updateProgressBarColor();
                }
            });
            progressBar.addEventListener('input', () => { 
                if (isFinite(video.duration)) video.currentTime = (progressBar.value / 100) * video.duration; 
                updateProgressBarColor();
            });
            speedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speeds = [1, 2, 3];
                const currentIndex = speeds.indexOf(playerState.currentSpeed);
                const nextIndex = (currentIndex + 1) % speeds.length;
                playerState.currentSpeed = speeds[nextIndex];
                carouselWrapper.querySelectorAll('.media-container video').forEach(v => v.playbackRate = playerState.currentSpeed);
                carouselWrapper.querySelectorAll('.speed-btn').forEach(btn => btn.textContent = `${playerState.currentSpeed}x`);
            });
            fullscreenBtn.addEventListener('click', handleFullscreen);
            
            if (shareBtn) {
                const wrapper = shareBtn.parentElement;
                const tooltip = wrapper?.querySelector('.share-tooltip');

                shareBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const url = window.location.origin + window.location.pathname + '#' + carouselId + '/' + (index + 1);
                    navigator.clipboard.writeText(url).then(() => {
                        shareBtn.innerHTML = iconCheck;
                        if (tooltip) tooltip.classList.add('visible');

                        setTimeout(() => {
                            shareBtn.innerHTML = iconShare;
                            if (tooltip) tooltip.classList.remove('visible');
                        }, 2000);
                    });
                });
            }

            // Implementação Picture-in-Picture (PiP)
            if (document.pictureInPictureEnabled) {
                const rControls = item.querySelector('.r-controls');
                if (rControls) {
                    const pipBtn = document.createElement('button');
                    pipBtn.className = 'pip-btn control-shadow text-white hover:text-blue-400 transition-colors';
                    pipBtn.title = 'Picture-in-Picture';
                    pipBtn.innerHTML = iconPip;
                    
                    // Insere antes do botão de fullscreen
                    if (fullscreenBtn) rControls.insertBefore(pipBtn, fullscreenBtn);
                    else rControls.appendChild(pipBtn);

                    pipBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        try {
                            if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
                            else await video.requestPictureInPicture();
                        } catch (err) { console.error('Erro PiP:', err); }
                    });
                    video.addEventListener('enterpictureinpicture', () => pipBtn.classList.add('text-blue-500'));
                    video.addEventListener('leavepictureinpicture', () => pipBtn.classList.remove('text-blue-500'));
                }
            }

            const updateVolumeUI = () => { 
                const isMuted = video.muted || video.volume === 0; 
                volumeBtn.innerHTML = isMuted ? iconVolumeMuted : iconVolumeHigh; 
                volumeSlider.value = isMuted ? 0 : video.volume; 
                updateVolumeBarColor();
            };
            volumeBtn.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                video.muted = !video.muted; 
                updateVolumeUI(); 
            });
            volumeSlider.addEventListener('input', (e) => { 
                e.stopPropagation(); 
                const newVolume = parseFloat(e.target.value); 
                video.volume = newVolume; 
                video.muted = newVolume === 0; 
                updateVolumeUI(); 
            });
            video.addEventListener('volumechange', updateVolumeUI);
            
            fitModeToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (justSwiped) return;
                
                if (document.fullscreenElement) {
                    if (enableFullscreenDisplayModeToggle) {
                        const currentFs = getDisplayMode(carouselId, index);
                        setDisplayMode(carouselId, index, currentFs === 'fill' ? 'fit' : 'fill', true);
                    }
                } else {
                    const currentMode = getDisplayMode(carouselId, index);
                    const newMode = currentMode === 'fill' ? 'fit' : 'fill';
                    setDisplayMode(carouselId, index, newMode, false);
                }
            });

            if (playbackModeBtn) {
                const updateAllPlaybackModeIcons = () => { const currentMode = playerState.playbackModes[playerState.playbackModeIndex], iconSVG = iconPlayback[currentMode]; carouselWrapper.querySelectorAll('.playback-mode-btn').forEach(btn => { btn.innerHTML = iconSVG; btn.title = iconSVG.match(/<title>(.*?)<\/title>/)?.[1] || ''; }); };
                updateAllPlaybackModeIcons();
                playbackModeBtn.addEventListener('click', (e) => { e.stopPropagation(); playerState.playbackModeIndex = (playerState.playbackModeIndex + 1) % playerState.playbackModes.length; updateAllPlaybackModeIcons(); });
                video.addEventListener('ended', () => {
                    const mode = playerState.playbackModes[playerState.playbackModeIndex];
                    
                    // Se PiP estiver ativo, evita navegação automática para não interromper a experiência
                    if (document.pictureInPictureElement === video && mode === 'next') {
                        playerState.isGloballyPlaying = false;
                        return;
                    }

                    if (mode === 'repeat') { video.currentTime = 0; safePlay(video); }
                    else if (mode === 'next') { playerState.isGloballyPlaying = true; navigateTo('next'); }
                    else { playerState.isGloballyPlaying = false; }
                });
            }
        });

        // Item 5: Oculta o sumário se não houver títulos definidos
        const hasAnyTitle = summaryTitles.some(t => t.textContent.trim().length > 0);
        if (!hasAnyTitle && summaryContainer && summaryContainer.parentElement) {
            summaryContainer.parentElement.style.display = 'none';
        }

        // Listeners para evitar flicker nos botões de navegação
        const keepControlsVisible = () => container.classList.add('controls-visible');
        const handleButtonLeave = (e) => {
            if (e.relatedTarget && e.relatedTarget.closest('.content-wrapper')) return;
            container.classList.remove('controls-visible');
        };
        [prevButton, nextButton].forEach(btn => {
            btn.addEventListener('mouseenter', keepControlsVisible);
            btn.addEventListener('mouseleave', handleButtonLeave);
        });

        nextButton.addEventListener('click', () => navigateTo('next'));
        prevButton.addEventListener('click', () => navigateTo('prev'));
        carouselWrapper.getCurrentIndex = () => currentIndex;
        carouselWrapper.navigate = navigateTo;

        // Item 9: Abrir sumário ao clicar no título da galeria
        const galleryTitle = carouselWrapper.querySelector('h2');
        if (galleryTitle) {
            galleryTitle.style.cursor = 'pointer';
            galleryTitle.title = 'Abrir Sumário';
            galleryTitle.addEventListener('click', (e) => {
                e.stopPropagation();
                const activePagination = carouselItems[currentIndex].querySelector('.carousel-pagination');
                if (activePagination) {
                    carouselWrapper.dataset.lastTrigger = 'title'; // Define flag para indicar origem
                    activePagination.click();
                }
            });
        }

        return initialLoad;
    };

    // ===== BLOCO DE EXECUÇÃO E LISTENERS GLOBAIS =====
    document.addEventListener('DOMContentLoaded', () => {
        // Deep Linking: Verifica se há um link específico na URL (ex: #carousel-1/3)
        const hash = window.location.hash;
        let deepLinkCarouselId = null;
        let deepLinkIndex = null;
        if (hash) {
            const parts = hash.substring(1).split('/');
            if (parts.length === 2) {
                deepLinkCarouselId = parts[0];
                deepLinkIndex = parseInt(parts[1]) - 1;
            }
        }

        const carousels = {};
        document.querySelectorAll('div[id^="carousel-"]').forEach(carouselWrapper => {
            const id = carouselWrapper.id;
            if (id) {
                let initialIndex = savedState[id]?.index || 0;
                
                // Se houver deep link para este carrossel, usa o índice do link e rola até ele
                if (id === deepLinkCarouselId && !isNaN(deepLinkIndex)) {
                    initialIndex = Math.max(0, deepLinkIndex);
                    lastActiveCarouselId = id;
                    setTimeout(() => carouselWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);
                }

                carousels[id] = {
                    init: initCarousel(id, initialIndex),
                    wrapper: carouselWrapper
                };
                carouselWrapper.addEventListener('mouseenter', () => {
                    if (!document.fullscreenElement) {
                       lastActiveCarouselId = id;
                    }
                });
            }
        });

        for (const id in carousels) {
            if (carousels[id]?.init) {
                carousels[id].init();
            }
        }

        document.querySelectorAll('.carousel-item img').forEach(img => {
            if (img.complete) { updateAllMediaFades(); updateMediaElementSizes(); } else { img.addEventListener('load', () => { updateAllMediaFades(); updateMediaElementSizes(); }); }
        });
        document.querySelectorAll('.carousel-item video').forEach(video => {
            if (video.readyState >= 1) { updateAllMediaFades(); updateMediaElementSizes(); } else { video.addEventListener('loadedmetadata', () => { updateAllMediaFades(); updateMediaElementSizes(); }); }
        });

        const updateActiveCarouselLayout = (carouselIdToUpdate) => {
            const targetCarouselId = carouselIdToUpdate || lastActiveCarouselId;
            const activeCarousel = carousels[targetCarouselId];
            if (!activeCarousel || !activeCarousel.wrapper) return;
            const container = activeCarousel.wrapper.querySelector('.carousel-container');
            const slidesContainer = activeCarousel.wrapper.querySelector('.carousel-slides');
            const currentIndex = activeCarousel.wrapper.getCurrentIndex();
            if (!container || !slidesContainer || container.offsetWidth === 0) return;
            const slideWidth = container.offsetWidth;

                    
                    setTimeout(() => { updateMediaElementSizes(); updateAllMediaFades(); }, 60);
            slidesContainer.style.transition = 'none';
            slidesContainer.style.transform = `translateX(${-currentIndex * slideWidth}px)`;
            setTimeout(() => { if (slidesContainer) slidesContainer.style.transition = 'transform 0.5s ease-in-out'; }, 50);
        };
        
        // New resize strategy (throttle + finalizer)
        // - Throttled incremental updates keep slides aligned during resize
        // - Finalizer reapplies precise layout, re-centers summary and re-enables transitions
        const throttle = (fn, limit = 50) => {
            let waiting = false;
            return (...args) => {
                if (!waiting) {
                    waiting = true;
                    requestAnimationFrame(() => {
                        try { fn(...args); } finally { setTimeout(() => { waiting = false; }, limit); }
                    });
                }
            };
        };

        const centerSummaryImmediate = (summaryContainer, summaryInnerWrapper, summaryTitles, currentIndex) => {
            if (!summaryContainer || !summaryInnerWrapper || !summaryTitles || summaryTitles.length === 0) return false;
            const containerWidth = summaryContainer.offsetWidth;
            const activeTitle = summaryTitles[currentIndex];
            if (!containerWidth || !activeTitle || activeTitle.offsetWidth === 0) return false;
            const contentWidth = summaryInnerWrapper.scrollWidth;
            let transformX;
            if (contentWidth <= containerWidth) transformX = (containerWidth - contentWidth) / 2;
            else {
                const containerCenter = containerWidth / 2;
                const titleCenter = activeTitle.offsetLeft + activeTitle.offsetWidth / 2;
                transformX = containerCenter - titleCenter;
                // clamp to prevent overscroll
                const maxTranslate = 0;
                const minTranslate = containerWidth - contentWidth;
                if (transformX > maxTranslate) transformX = maxTranslate;
                if (transformX < minTranslate) transformX = minTranslate;
            }
            summaryInnerWrapper.style.transform = `translateX(${transformX}px)`;
            return true;
        };

        let resizeEndTimer = null;
        let isResizing = false;

        const onResizeThrottled = throttle(() => {
            // Apply a fast, conservative layout to ALL carousels so none of them jitter
            for (const id in carousels) {
                const wrapper = carousels[id]?.wrapper;
                if (!wrapper) continue;
                const container = wrapper.querySelector('.carousel-container');
                const slidesContainer = wrapper.querySelector('.carousel-slides');
                const items = wrapper.querySelectorAll('.carousel-item');
                if (!container || !slidesContainer || !items) continue;
                const currentIndex = wrapper.getCurrentIndex ? wrapper.getCurrentIndex() : 0;
                const slideWidth = container.offsetWidth || 0;
                const total = items.length || 1;

                // Fix explicit pixel widths to avoid flex reflow jitter during resize
                slidesContainer.style.transition = 'none';
                slidesContainer.style.willChange = 'transform';
                slidesContainer.style.width = `${slideWidth * total}px`;
                items.forEach(it => { it.style.width = `${slideWidth}px`; it.style.flex = '0 0 auto'; });

                // Immediate alignment without transitions
                slidesContainer.style.transform = `translate3d(${-currentIndex * slideWidth}px,0,0)`;

                // Update media sizing and fades so media doesn't jump
                updateMediaElementSizes();
                updateAllMediaFades();

                // Reposition summary inner wrapper quickly for this carousel
                const summaryContainer = wrapper.querySelector('.carousel-summary-container');
                const summaryInnerWrapper = summaryContainer?.querySelector('.summary-inner-wrapper');
                const spans = summaryInnerWrapper ? Array.from(summaryInnerWrapper.querySelectorAll('.summary-title')) : [];
                centerSummaryImmediate(summaryContainer, summaryInnerWrapper, spans, currentIndex);
            }
        }, 40);

        const resizeFinalize = () => {
            const targetId = document.fullscreenElement ? fullscreenCarouselId : lastActiveCarouselId;
            isResizing = false;
            document.body.classList.remove('is-resizing');

            // Restore natural responsive layout for all carousels
            for (const id in carousels) {
                const wrapper = carousels[id]?.wrapper;
                if (!wrapper) continue;
                const slidesContainer = wrapper.querySelector('.carousel-slides');
                const items = wrapper.querySelectorAll('.carousel-item');
                if (!slidesContainer || !items) continue;

                // Remove the explicit pixel widths so CSS can resume control
                slidesContainer.style.width = '';
                slidesContainer.style.willChange = '';
                items.forEach(it => { it.style.width = ''; it.style.flex = ''; });

                // Garante centralização do sumário para TODOS os carrosséis
                const summaryContainer = wrapper.querySelector('.carousel-summary-container');
                const summaryInnerWrapper = summaryContainer?.querySelector('.summary-inner-wrapper');
                const spans = summaryInnerWrapper ? Array.from(summaryInnerWrapper.querySelectorAll('.summary-title')) : [];
                const currentIndex = wrapper.getCurrentIndex ? wrapper.getCurrentIndex() : 0;
                centerSummary(summaryContainer, summaryInnerWrapper, spans, currentIndex);
            }

            // final precise layout (align focused carousel)
            updateActiveCarouselLayout(targetId);

            if (targetId) {
                const wrapper = carousels[targetId]?.wrapper;

                if (wrapper && wrapper.getCurrentIndex) {
                    const idx = wrapper.getCurrentIndex();
                    const item = wrapper.querySelectorAll('.carousel-item')[idx];
                    const mode = getDisplayMode(targetId, idx);
                    if (item) applyDisplayMode(item, mode, document.fullscreenElement);
                }
            }

            // restore transitions
            document.querySelectorAll('.carousel-slides').forEach(sc => { if (sc) sc.style.transition = 'transform 0.5s ease-in-out'; });
            document.querySelectorAll('.summary-inner-wrapper').forEach(sw => { if (sw) sw.style.transition = ''; });
        };

        window.addEventListener('resize', () => {
            if (!isResizing) {
                isResizing = true;
                document.body.classList.add('is-resizing');
                // Disable transitions immediately for all slides to avoid flicker
                document.querySelectorAll('.carousel-slides').forEach(sc => { if (sc) sc.style.transition = 'none'; });
            }
            onResizeThrottled();
            clearTimeout(resizeEndTimer);
            resizeEndTimer = setTimeout(() => { resizeFinalize(); }, 180);
        });

        document.addEventListener('fullscreenchange', () => {
            const fullscreenElement = document.fullscreenElement;
            const targetCarouselId = fullscreenCarouselId || lastActiveCarouselId;
            const carouselData = carousels[targetCarouselId];

            if (carouselData && carouselData.wrapper) {
                const carousel = carouselData.wrapper;
                const container = carousel.querySelector('.carousel-container');
                if(container) container.classList.remove('fullscreen-transition-active');

                const currentIndex = carousel.getCurrentIndex();
                const currentItem = carousel.querySelectorAll('.carousel-item')[currentIndex];

                let mode;
                if (fullscreenElement) {
                    mode = getDisplayMode(targetCarouselId, currentIndex);
                    // Detectar o carousel correto no fullscreen
                    const fullscreenContainer = fullscreenElement;
                    const wrapper = fullscreenContainer.closest('div[id^="carousel-"]');
                    if (wrapper) {
                        fullscreenCarouselId = wrapper.id;
                    }
                } else {
                    mode = currentItem.dataset.modeBeforeFullscreen || 'fill';
                }

                setDisplayMode(targetCarouselId, currentIndex, mode, !!fullscreenElement);

                // Se entrou em fullscreen, força mostrar controles e iniciar timer de ocultação
                if (fullscreenElement && currentItem) {
                    const contentWrapper = currentItem.querySelector('.content-wrapper');
                    if (contentWrapper && typeof contentWrapper._showControls === 'function') {
                        contentWrapper._showControls(undefined, true);
                    }
                }
            }

            if (!fullscreenElement) {
                window.scrollTo(scrollPositionBeforeFullscreen.x, scrollPositionBeforeFullscreen.y);
                if (window.carouselFullscreenDisplayModes) {
                    delete window.carouselFullscreenDisplayModes[targetCarouselId];
                }
                fullscreenCarouselId = null;
                // Reset fade styles when exiting fullscreen
                const carousel = carouselData.wrapper;
                const container = carousel.querySelector('.carousel-container');
                if (container) {
                    container.style.transition = 'none';
                    container.classList.remove('fade-mode');
                    setTimeout(() => { container.style.transition = ''; }, 100);
                }
                const items = carousel.querySelectorAll('.carousel-item');
                items.forEach(item => {
                    item.style.opacity = '';
                    item.style.zIndex = '';
                    item.style.transition = '';
                });
            }

            updateActiveCarouselLayout(targetCarouselId);
            updateAllMediaFades();
            updateMediaElementSizes();
        });

        const settingsBtn = document.getElementById('settings-btn'), settingsModal = document.getElementById('settings-modal'), closeModalBtn = document.getElementById('close-modal-btn'), themeToggle = document.getElementById('theme-toggle'), blurToggle = document.getElementById('blur-toggle');
        settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        closeModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
        settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });
        const updateThemeUI = (isLight) => {
            const activeElement = document.activeElement;
            const isInteractingWithDark = activeElement && activeElement.id === 'custom-color-dark';
            const isInteractingWithLight = activeElement && activeElement.id === 'custom-color-light';

            const darkSection = document.getElementById('dark-theme-colors');
            const lightSection = document.getElementById('light-theme-colors');

            let showDark = !isLight;
            let showLight = isLight;

            // Mantém o seletor visível se estiver em uso, mesmo que o tema mude
            if (isInteractingWithDark) {
                showDark = true;
                showLight = false;
            } else if (isInteractingWithLight) {
                showLight = true;
                showDark = false;
            }

            if (darkSection) darkSection.classList.toggle('hidden', !showDark);
            if (lightSection) lightSection.classList.toggle('hidden', !showLight);

            document.documentElement.classList.toggle('theme-light', isLight);
            document.documentElement.classList.toggle('theme-dark', !isLight);
        };
        const isLightInitial = document.documentElement.classList.contains('theme-light');
        themeToggle.checked = !isLightInitial;
        updateThemeUI(isLightInitial);
        
        if (blurToggle) {
            blurToggle.checked = savedState.blurEnabled === true;
            blurToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                document.documentElement.classList.toggle('no-blur', !enabled);
                savedState.blurEnabled = enabled;
                localStorage.setItem('playerState', JSON.stringify(savedState));
            });
        }

        // Font Selector Logic
        const fontBtns = document.querySelectorAll('.font-btn');
        const cycleFontBtn = document.getElementById('cycle-font-btn');
        const fontNameDisplay = document.getElementById('current-font-name');
        const fontNames = {
            sans: ['Inter', 'Roboto', 'Open Sans'],
            serif: ['Crimson Text', 'Merriweather', 'Playfair Display'],
            mono: ['Courier Prime', 'Fira Code', 'Inconsolata'],
            hand: ['Dancing Script', 'Patrick Hand', 'Caveat'],
            decor: ['Cinzel', 'Mountains of Christmas', 'Lobster']
        };

        const updateFontUI = (selectedFont) => {
            fontBtns.forEach(btn => {
                if (btn.dataset.font === selectedFont) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            const variant = fontState.variants[selectedFont] || 1;
            if (fontNameDisplay) {
                fontNameDisplay.textContent = fontNames[selectedFont][variant - 1] || '';
            }
        };
        // Initialize UI
        updateFontUI(fontState.currentCategory);

        fontBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const font = btn.dataset.font;
                fontState.currentCategory = font;
                
                applyFontClass();
                updateFontUI(font);
                
                savedState.fontStyle = fontState.currentCategory;
                localStorage.setItem('playerState', JSON.stringify(savedState));
            });
        });

        if (cycleFontBtn) {
            cycleFontBtn.addEventListener('click', () => {
                const currentCat = fontState.currentCategory;
                fontState.variants[currentCat] = (fontState.variants[currentCat] % 3) + 1;
                applyFontClass();
                updateFontUI(currentCat);
                savedState.fontVariants = fontState.variants;
                localStorage.setItem('playerState', JSON.stringify(savedState));
            });
        }

        // Helper para converter cores (RGB/Nome) para Hex, necessário para input[type=color]
        const ensureHex = (color) => {
            if (!color) return '#000000';
            if (color.startsWith('#')) return color;
            const rgb = color.match(/\d+/g);
            if (rgb && rgb.length >= 3) return "#" + ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1);
            return '#000000';
        };

        const getLuminance = (hex) => {
            const c = ensureHex(hex);
            const rgb = parseInt(c.slice(1), 16);
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >>  8) & 0xff;
            const b = (rgb >>  0) & 0xff;
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        };

        // Helper: Hex to HSL
        const hexToHSL = (hex) => {
            const c = ensureHex(hex);
            let r = parseInt(c.slice(1, 3), 16) / 255;
            let g = parseInt(c.slice(3, 5), 16) / 255;
            let b = parseInt(c.slice(5, 7), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, l = (max + min) / 2;
            if (max === min) h = s = 0;
            else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
        };

        // Helper: HSL to Hex
        const hslToHex = (h, s, l) => {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = n => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        };

        themeToggle.addEventListener('change', (e) => {
            const isLight = !e.target.checked;
            updateThemeUI(isLight);
            const newBg = isLight ? (savedState.themeColorLight || 'rgb(243 244 246)') : (savedState.themeColorDark || 'rgb(17 24 39)');
            document.documentElement.style.setProperty('--color-bg', newBg);
            
            savedState.theme = isLight ? 'light' : 'dark';
            localStorage.setItem('playerState', JSON.stringify(savedState));
        });

        // --- NEW COLOR PICKER LOGIC ---
        const setupColorPicker = (theme) => {
            const hueSlider = document.getElementById(`hue-slider-${theme}`);
            const preview = document.getElementById(`preview-${theme}`);
            const resetBtn = document.getElementById(`reset-${theme}-theme`);

            if (!hueSlider) return;

            const updateColor = () => {
                hueSlider.classList.remove('thumb-hidden'); // Mostra a bolinha ao interagir
                const h = parseInt(hueSlider.value);
                // Ajuste: Saturação reduzida para a cor real (mais sóbria)
                const s = theme === 'dark' ? 40 : 50; 
                const l = theme === 'dark' ? 12 : 93; 
                const color = hslToHex(h, s, l);

                // Define a cor de destaque (Accent) baseada no Hue escolhido
                // Se a bolinha estiver oculta (padrão), usa o azul original (#3b82f6)
                if (hueSlider.classList.contains('thumb-hidden')) {
                    document.documentElement.style.removeProperty('--color-accent');
                    document.documentElement.style.removeProperty('--color-accent-overlay');
                    document.documentElement.classList.remove('has-custom-color');
                } else {
                    const accentColor = hslToHex(h, 70, 75); // Saturação alta (70%) para elementos de interface
                    const overlayColor = hslToHex(h, 25, 75); // Saturação baixa (25%) apenas para os vizinhos
                    document.documentElement.style.setProperty('--color-accent', accentColor);
                    document.documentElement.style.setProperty('--color-accent-overlay', overlayColor);
                    document.documentElement.classList.add('has-custom-color');
                }

                if (preview) preview.style.backgroundColor = color; 

                if (theme === 'dark') {
                    document.documentElement.style.setProperty('--color-bg-dark', color);
                    savedState.themeColorDark = color;
                    if (themeToggle.checked) document.documentElement.style.setProperty('--color-bg', color);
                } else {
                    document.documentElement.style.setProperty('--color-bg-light', color);
                    savedState.themeColorLight = color;
                    if (!themeToggle.checked) document.documentElement.style.setProperty('--color-bg', color);
                }

                // Sincronização Global do Matiz
                const otherTheme = theme === 'dark' ? 'light' : 'dark';
                const otherSlider = document.getElementById(`hue-slider-${otherTheme}`);
                const otherPreview = document.getElementById(`reset-${otherTheme}-theme`); // O botão de reset atua como preview
                
                if (otherSlider) {
                    otherSlider.value = h;
                    otherSlider.classList.remove('thumb-hidden');
                    
                    const sOther = otherTheme === 'dark' ? 40 : 50;
                    const lOther = otherTheme === 'dark' ? 12 : 93;
                    const colorOther = hslToHex(h, sOther, lOther);

                    
                    if (otherTheme === 'dark') {
                        document.documentElement.style.setProperty('--color-bg-dark', colorOther);
                        savedState.themeColorDark = colorOther;
                    } else {
                        document.documentElement.style.setProperty('--color-bg-light', colorOther);
                        savedState.themeColorLight = colorOther;
                    }
                }
                localStorage.setItem('playerState', JSON.stringify(savedState));
            };

            const initSliders = () => {
                const defaultColor = theme === 'dark' ? '#1a1a1a' : '#f3f4f6';
                const currentColor = theme === 'dark'  
                    ? (savedState.themeColorDark || '#1a1a1a')
                    : (savedState.themeColorLight || '#f3f4f6');
                
                const isDefault = currentColor.toLowerCase() === defaultColor.toLowerCase();
                if (isDefault) {
                    hueSlider.classList.add('thumb-hidden');
                } else {
                    hueSlider.classList.remove('thumb-hidden');
                }

                const hsl = hexToHSL(currentColor);
                hueSlider.value = hsl.h;
                if (preview) preview.style.backgroundColor = currentColor;

                // Aplica a cor de destaque se este for o tema ativo
                const activeTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
                if (theme === activeTheme) {
                    if (isDefault) {
                        document.documentElement.style.removeProperty('--color-accent');
                        document.documentElement.style.removeProperty('--color-accent-overlay');
                        document.documentElement.classList.remove('has-custom-color');
                    } else {
                        const accentColor = hslToHex(hsl.h, 70, 75);
                        const overlayColor = hslToHex(hsl.h, 25, 75);
                        document.documentElement.style.setProperty('--color-accent', accentColor);
                        document.documentElement.style.setProperty('--color-accent-overlay', overlayColor);
                        document.documentElement.classList.add('has-custom-color');
                    }
                }
            };

            hueSlider.addEventListener('input', updateColor);
            
            // Prevent closing modal when interacting with sliders
            hueSlider.addEventListener('click', e => e.stopPropagation());

            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                     // Reseta AMBOS os temas para neutro
                    const defaultDark = '#1a1a1a';
                    const defaultLight = '#f3f4f6';
                    
                    // Reseta slider atual
                    const defaultColor = theme === 'dark' ? defaultDark : defaultLight;
                    const hsl = hexToHSL(defaultColor); // h=0, s=0
                    hueSlider.value = hsl.h;
                    hueSlider.classList.add('thumb-hidden'); // Oculta a bolinha ao resetar
                    
                    if (preview) preview.style.backgroundColor = defaultColor;

                    // Reseta o outro slider também
                    const otherTheme = theme === 'dark' ? 'light' : 'dark';
                    const otherSlider = document.getElementById(`hue-slider-${otherTheme}`);
                    const otherPreview = document.getElementById(`reset-${otherTheme}-theme`);
                    const otherDefault = theme === 'dark' ? defaultLight : defaultDark;
                    
                    if (otherSlider) {
                        otherSlider.value = hsl.h;
                        otherSlider.classList.add('thumb-hidden');
                        // Oculta o botão de reset do outro tema também se existir
                    }

                    // Aplica cores
                    document.documentElement.style.setProperty('--color-bg-dark', defaultDark);
                    savedState.themeColorDark = defaultDark;
                    
                    document.documentElement.style.setProperty('--color-bg-light', defaultLight);
                    savedState.themeColorLight = defaultLight;

                    // Atualiza cor atual visível
                    const newCurrentBg = themeToggle.checked ? defaultDark : defaultLight;
                    document.documentElement.style.setProperty('--color-bg', newCurrentBg);

                    // Reseta a cor de destaque para o padrão
                    document.documentElement.style.removeProperty('--color-accent');
                    document.documentElement.style.removeProperty('--color-accent-overlay');
                    document.documentElement.classList.remove('has-custom-color');

                    localStorage.setItem('playerState', JSON.stringify(savedState));
                });
            }

            initSliders();
        };

        setupColorPicker('dark');
        setupColorPicker('light');

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
            let targetCarouselId;
            if (document.fullscreenElement) {
                const fullscreenContainer = document.fullscreenElement;
                const wrapper = fullscreenContainer.closest('div[id^="carousel-"]');
                if (wrapper) {
                    targetCarouselId = wrapper.id;
                } else {
                    targetCarouselId = lastActiveCarouselId;
                }
            } else {
                targetCarouselId = lastActiveCarouselId;
            }
            const activeCarouselData = carousels[targetCarouselId];
            if (!activeCarouselData || !activeCarouselData.wrapper) return;
            const activeWrapper = activeCarouselData.wrapper, activeSlide = activeWrapper.querySelector('.active-slide'), key = e.key.toLowerCase();
            const isFade = activeWrapper.querySelector('.carousel-container').classList.contains('fade-mode');
            if (key === 'arrowright') { e.preventDefault(); activeWrapper.navigate('next', false); return; } // sempre slide
            if (key === 'arrowleft') { e.preventDefault(); activeWrapper.navigate('prev', false); return; } // sempre slide
            if (key === 'arrowup' && document.fullscreenElement) { e.preventDefault(); activeWrapper.navigate('prev', true); return; } // fade prev
            if (key === 'arrowdown' && document.fullscreenElement) { e.preventDefault(); activeWrapper.navigate('next', true); return; } // fade next
            if (key === 'pageup') { e.preventDefault(); activeWrapper.navigate('prev', document.fullscreenElement); return; } // passador: prev com fade em fullscreen
            if (key === 'pagedown') { e.preventDefault(); activeWrapper.navigate('next', document.fullscreenElement); return; } // passador: next com fade em fullscreen
            if (key === 'escape') {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else settingsModal.classList.add('hidden');
                return;
            }
            const video = activeSlide?.querySelector('.media-container video');
            const img = activeSlide?.querySelector('.media-container img');
            const actionMap = { ' ': '.play-pause-btn', 'k': '.play-pause-btn', 'f': '.fullscreen-btn', 'm': '.volume-btn', 'v': '.speed-btn', 'p': '.playback-mode-btn' };
            if (key === 'f' && (video || img)) {
                e.preventDefault();
                activeSlide.querySelector('.fullscreen-btn')?.click();
                return;
            }
            if (video && actionMap[key]) {
                e.preventDefault();
                activeSlide.querySelector(actionMap[key])?.click();
            } else if (video && (key === 'arrowup' || key === 'arrowdown')) {
                e.preventDefault();
                const step = (key === 'arrowup') ? 5 : -5, frameTime = 1 / 30 * (step > 0 ? 1 : -1);
                video.currentTime += video.paused ? frameTime : step;
            }
        });

        document.querySelectorAll('.summary-title').forEach(item => {
            if (item.offsetWidth > 300) {
                item.setAttribute('data-width', 'large');
            }
        });
        window.addEventListener('beforeunload', () => {
            
            savedState.theme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
            savedState.themeColorDark = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-dark').trim();
            savedState.themeColorLight = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-light').trim();
            savedState.lastActiveCarouselId = lastActiveCarouselId;
            document.querySelectorAll('div[id^="carousel-"]').forEach(cw => { if (cw.getCurrentIndex) savedState[cw.id] = { index: cw.getCurrentIndex() }; });
            localStorage.setItem('playerState', JSON.stringify(savedState));
        });

        // Garante recálculo do layout após carregamento total (corrige bug de alinhamento com scrollbar)
        window.addEventListener('load', () => {
            onResizeThrottled();
            setTimeout(resizeFinalize, 200);
        });
    });

    // --- Mascot Luquinhas Logic ---
    const mascotContainer = document.getElementById('luquinhas-mascot');
    if (mascotContainer) {
        // --- Draggable Mascot Logic ---
        let resetTipsTimer = null; // Timer para resetar as dicas
        let isDraggingMascot = false;
        let hasDragged = false;
        let offsetX, offsetY;

        const startDrag = (e) => {
            clearTimeout(resetTipsTimer); // Cancela o reset se começar a arrastar
            if (e.target.closest('.luquinhas-bubble')) return;
            isDraggingMascot = true;
            hasDragged = false;
            mascotContainer.style.transition = 'none';
            const isTouch = e.type === 'touchstart';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;
            const rect = mascotContainer.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            window.addEventListener(isTouch ? 'touchmove' : 'mousemove', dragMove, { passive: false });
            window.addEventListener(isTouch ? 'touchend' : 'mouseup', stopDrag);
        };

        const dragMove = (e) => {
            if (!isDraggingMascot) return;
            e.preventDefault();
            hasDragged = true;
            const isTouch = e.type === 'touchmove';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;
            let newX = clientX - offsetX;
            let newY = clientY - offsetY;
            const mascotWidth = mascotContainer.offsetWidth;
            const mascotHeight = mascotContainer.offsetHeight;
            newX = Math.max(0, Math.min(newX, window.innerWidth - mascotWidth));
            newY = Math.max(0, Math.min(newY, window.innerHeight - mascotHeight));
            mascotContainer.style.left = `${newX}px`;
            mascotContainer.style.top = `${newY}px`;
            mascotContainer.style.bottom = 'auto';
            mascotContainer.style.right = 'auto';
        };

        const stopDrag = () => {
            if (!isDraggingMascot) return;
            isDraggingMascot = false;
            mascotContainer.style.transition = '';
            window.removeEventListener('mousemove', dragMove);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', dragMove);
            window.removeEventListener('touchend', stopDrag);
        };

        mascotContainer.addEventListener('mousedown', startDrag);
        mascotContainer.addEventListener('touchstart', startDrag, { passive: false });
        // --- End Draggable Mascot Logic ---

        const bubble = mascotContainer.querySelector('.luquinhas-bubble');
        const bubbleText = mascotContainer.querySelector('.bubble-text');
        const closeBubbleBtn = mascotContainer.querySelector('.close-bubble-btn');
        let bodyEl = mascotContainer.querySelector('.luquinhas-body');
        
        // Ensure body wrapper and counter exist for animations
        if (!bodyEl) {
            bodyEl = document.createElement('div');
            bodyEl.className = 'luquinhas-body';
            const svg = mascotContainer.querySelector('svg');
            if (svg) bodyEl.appendChild(svg);
            mascotContainer.insertBefore(bodyEl, bubble);
        }
        let counterEl = mascotContainer.querySelector('.luquinhas-counter');
        if (!counterEl) {
            counterEl = document.createElement('div');
            counterEl.className = 'luquinhas-counter';
            bodyEl.appendChild(counterEl);
        }
        
        let tips = [];
        try {
            tips = JSON.parse(mascotContainer.dataset.tips.replace(/&quot;/g, '"'));
        } catch (e) {
            console.error("Erro ao ler as dicas do mascote:", e);
        }

        if (tips.length > 0 && bubble && bubbleText && closeBubbleBtn) {
            // State management for daily reset and counting
            const today = new Date().toISOString().split('T')[0];
            let state = JSON.parse(localStorage.getItem('luquinhasState') || '{}');
            
            if (state.date !== today) {
                state = { date: today, seenCount: 0, lastIndex: 0 };
                localStorage.setItem('luquinhasState', JSON.stringify(state));
            }

            let currentTipIndex = state.lastIndex || 0;

            const updateCounter = () => {
                const remaining = Math.max(0, tips.length - state.seenCount);
                if (remaining > 0) {
                    counterEl.textContent = remaining;
                    counterEl.style.display = 'flex';
                    counterEl.style.transform = 'scale(1)';
                } else {
                    counterEl.style.transform = 'scale(0)';
                    setTimeout(() => { if(remaining === 0) counterEl.style.display = 'none'; }, 200);
                }
            };
            updateCounter();

            // --- Reset on hover logic ---
            mascotContainer.addEventListener('mouseenter', () => {
                if (isDraggingMascot) return; // Não inicia se estiver arrastando
                resetTipsTimer = setTimeout(() => {
                    state.seenCount = 0;
                    localStorage.setItem('luquinhasState', JSON.stringify(state));
                    updateCounter();
                }, 10000); // 10 segundos
            });

            mascotContainer.addEventListener('mouseleave', () => {
                clearTimeout(resetTipsTimer);
            });
            // --- End Reset on hover logic ---

            mascotContainer.addEventListener('click', (e) => {
                if (hasDragged) {
                    hasDragged = false;
                    return;
                }
                if (e.target.closest('.close-bubble-btn')) return;

                bubbleText.textContent = tips[currentTipIndex];
                bubble.classList.add('visible');
                
                if (state.seenCount < tips.length) {
                    state.seenCount++;
                    updateCounter();
                }
                
                currentTipIndex = (currentTipIndex + 1) % tips.length;
                state.lastIndex = currentTipIndex;
                localStorage.setItem('luquinhasState', JSON.stringify(state));
            });

            closeBubbleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                bubble.classList.remove('visible');
            });
        } else if (tips.length === 0) {
            mascotContainer.style.display = 'none';
        }
    }

window.toggleFullscreenDisplayMode = (enable) => {
    if (typeof enable === 'boolean') {
        enableFullscreenDisplayModeToggle = enable;
    } else {
        enableFullscreenDisplayModeToggle = !enableFullscreenDisplayModeToggle;
    }
    console.log(`Fullscreen display mode toggling is now: ${enableFullscreenDisplayModeToggle ? 'ENABLED' : 'DISABLED'}`);
    // Optionally, re-apply display mode if currently in fullscreen to reflect the change immediately
    if (document.fullscreenElement) {
        const currentCarousel = document.getElementById(fullscreenCarouselId || lastActiveCarouselId);
        if (currentCarousel) {
            const currentIndex = currentCarousel.getCurrentIndex();
            const currentItem = currentCarousel.querySelectorAll('.carousel-item')[currentIndex];
            // No need to re-apply global var, just re-apply current item state
            // applyDisplayMode(currentItem, getDisplayMode(currentCarousel.id, currentIndex), true);
        }
    }
};