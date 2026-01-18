// ========================================
// NERDFLIX - Main Application
// ========================================

class NerdflixApp {
    constructor() {
        // M3U8 Playlist URL
        this.playlistUrl = 'https://pub-f8e264b0f9ce4788ba346df77c54fef5.r2.dev/2024/ListaVip.m3u8';
        
        // Data storage
        this.allItems = [];
        this.categories = {};
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.featuredItem = null;
        
        // HLS Player instance
        this.hls = null;
        
        // DOM Elements
        this.elements = {
            loadingScreen: document.getElementById('loadingScreen'),
            loadingText: document.getElementById('loadingText'),
            mainContent: document.getElementById('mainContent'),
            contentContainer: document.getElementById('contentContainer'),
            categoryDropdown: document.getElementById('categoryDropdown'),
            searchInput: document.getElementById('searchInput'),
            playerModal: document.getElementById('playerModal'),
            videoPlayer: document.getElementById('videoPlayer'),
            playerTitle: document.getElementById('playerTitle'),
            playerCategory: document.getElementById('playerCategory'),
            closePlayer: document.getElementById('closePlayer'),
            detailsModal: document.getElementById('detailsModal'),
            detailsTitle: document.getElementById('detailsTitle'),
            detailsCategory: document.getElementById('detailsCategory'),
            detailsDescription: document.getElementById('detailsDescription'),
            detailsBanner: document.getElementById('detailsBanner'),
            detailsPlayBtn: document.getElementById('detailsPlayBtn'),
            closeDetails: document.getElementById('closeDetails'),
            featuredBanner: document.getElementById('featuredBanner'),
            featuredTitle: document.getElementById('featuredTitle'),
            featuredDescription: document.getElementById('featuredDescription'),
            featuredPlayBtn: document.getElementById('featuredPlayBtn'),
            featuredInfoBtn: document.getElementById('featuredInfoBtn')
        };
        
        // Initialize
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadPlaylist();
        this.hideLoading();
    }
    
    // ========================================
    // Event Bindings
    // ========================================
    
    bindEvents() {
        // Search
        this.elements.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderContent();
        });
        
        // Nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                this.currentFilter = link.dataset.filter;
                this.renderContent();
            });
        });
        
        // Category dropdown
        document.querySelector('.dropdown-btn').addEventListener('click', () => {
            this.elements.categoryDropdown.classList.toggle('show');
        });
        
        // Close dropdown on click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.category-dropdown')) {
                this.elements.categoryDropdown.classList.remove('show');
            }
        });
        
        // Close player
        this.elements.closePlayer.addEventListener('click', () => {
            this.closePlayer();
        });
        
        // Close details modal
        this.elements.closeDetails.addEventListener('click', () => {
            this.elements.detailsModal.classList.remove('active');
        });
        
        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closePlayer();
                this.elements.detailsModal.classList.remove('active');
            }
        });
        
        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.querySelector('.header');
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
        
        // Featured buttons
        this.elements.featuredPlayBtn.addEventListener('click', () => {
            if (this.featuredItem) {
                this.playVideo(this.featuredItem);
            }
        });
        
        this.elements.featuredInfoBtn.addEventListener('click', () => {
            if (this.featuredItem) {
                this.showDetails(this.featuredItem);
            }
        });
    }
    
    // ========================================
    // M3U8 Parser
    // ========================================
    
    async loadPlaylist() {
        try {
            this.elements.loadingText.textContent = 'Baixando lista...';
            
            let text = null;
            
            // Try direct fetch first
            try {
                const response = await fetch(this.playlistUrl);
                if (response.ok) {
                    text = await response.text();
                }
            } catch (e) {
                console.log('Direct fetch failed, trying CORS proxy...');
            }
            
            // If direct fetch failed, try CORS proxies
            if (!text) {
                const corsProxies = [
                    'https://api.allorigins.win/raw?url=',
                    'https://corsproxy.io/?',
                    'https://cors-anywhere.herokuapp.com/'
                ];
                
                for (const proxy of corsProxies) {
                    try {
                        this.elements.loadingText.textContent = 'Tentando proxy alternativo...';
                        const response = await fetch(proxy + encodeURIComponent(this.playlistUrl));
                        if (response.ok) {
                            text = await response.text();
                            break;
                        }
                    } catch (e) {
                        console.log(`Proxy ${proxy} failed`);
                    }
                }
            }
            
            if (!text) {
                throw new Error('Não foi possível carregar a playlist');
            }
            
            this.elements.loadingText.textContent = 'Processando conteúdo...';
            
            this.parseM3U8(text);
            
            this.elements.loadingText.textContent = 'Renderizando interface...';
            
            this.renderCategoryDropdown();
            this.renderContent();
            this.setFeaturedItem();
            
        } catch (error) {
            console.error('Erro ao carregar playlist:', error);
            this.elements.loadingText.textContent = 'Erro ao carregar: ' + error.message;
        }
    }
    
    parseM3U8(content) {
        const lines = content.split('\n');
        let currentItem = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Parse EXTINF line
                currentItem = this.parseExtInf(line);
            } else if (line && !line.startsWith('#') && currentItem) {
                // This is the URL
                currentItem.url = line;
                currentItem.id = this.allItems.length;
                
                // Determine type based on group or URL
                currentItem.type = this.determineType(currentItem);
                
                // Add to items array
                this.allItems.push(currentItem);
                
                // Add to category
                const category = currentItem.group || 'Outros';
                if (!this.categories[category]) {
                    this.categories[category] = [];
                }
                this.categories[category].push(currentItem);
                
                currentItem = null;
            }
        }
        
        console.log(`Carregados ${this.allItems.length} itens em ${Object.keys(this.categories).length} categorias`);
    }
    
    parseExtInf(line) {
        const item = {
            name: '',
            group: '',
            logo: '',
            tvgId: '',
            tvgName: '',
            duration: -1
        };
        
        // Extract duration
        const durationMatch = line.match(/#EXTINF:([-\d]+)/);
        if (durationMatch) {
            item.duration = parseInt(durationMatch[1]);
        }
        
        // Extract attributes
        const groupMatch = line.match(/group-title="([^"]*)"/);
        if (groupMatch) {
            item.group = groupMatch[1];
        }
        
        const logoMatch = line.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) {
            item.logo = logoMatch[1];
        }
        
        const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
        if (tvgIdMatch) {
            item.tvgId = tvgIdMatch[1];
        }
        
        const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
        if (tvgNameMatch) {
            item.tvgName = tvgNameMatch[1];
        }
        
        // Extract name (last part after the comma)
        const nameParts = line.split(',');
        if (nameParts.length > 1) {
            item.name = nameParts[nameParts.length - 1].trim();
        }
        
        // If no name, use tvg-name
        if (!item.name && item.tvgName) {
            item.name = item.tvgName;
        }
        
        return item;
    }
    
    determineType(item) {
        const groupLower = (item.group || '').toLowerCase();
        const nameLower = (item.name || '').toLowerCase();
        const urlLower = (item.url || '').toLowerCase();
        
        // Check for movies
        const movieKeywords = ['filme', 'filmes', 'movie', 'movies', 'cinema', 'lançamento', 'dublado', 'legendado'];
        if (movieKeywords.some(k => groupLower.includes(k) || nameLower.includes(k))) {
            return 'movies';
        }
        
        // Check for series
        const seriesKeywords = ['série', 'series', 'temporada', 'episódio', 'episode', 'season', 's0', 'e0'];
        if (seriesKeywords.some(k => groupLower.includes(k) || nameLower.includes(k))) {
            return 'series';
        }
        
        // Check for channels (live TV)
        const channelKeywords = ['tv', 'canal', 'channel', 'ao vivo', 'live', 'hd', 'fhd', 'sd', '24h', 'aberto'];
        if (channelKeywords.some(k => groupLower.includes(k) || nameLower.includes(k))) {
            return 'channels';
        }
        
        // Check URL patterns
        if (urlLower.includes('.m3u8') || urlLower.includes('/live/')) {
            return 'channels';
        }
        
        return 'other';
    }
    
    // ========================================
    // Rendering
    // ========================================
    
    renderCategoryDropdown() {
        const sortedCategories = Object.keys(this.categories).sort();
        
        this.elements.categoryDropdown.innerHTML = `
            <div class="dropdown-item" data-category="all">
                <i class="fas fa-globe"></i>
                <span>Todas as Categorias</span>
                <span class="count">${this.allItems.length}</span>
            </div>
        ` + sortedCategories.map(category => `
            <div class="dropdown-item" data-category="${this.escapeHtml(category)}">
                <i class="fas fa-folder"></i>
                <span>${this.escapeHtml(category)}</span>
                <span class="count">${this.categories[category].length}</span>
            </div>
        `).join('');
        
        // Add click events
        this.elements.categoryDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                this.filterByCategory(category);
                this.elements.categoryDropdown.classList.remove('show');
            });
        });
    }
    
    filterByCategory(category) {
        if (category === 'all') {
            this.currentFilter = 'all';
            document.querySelectorAll('.nav-link').forEach(l => {
                l.classList.toggle('active', l.dataset.filter === 'all');
            });
        } else {
            this.currentFilter = 'category:' + category;
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        }
        this.renderContent();
    }
    
    renderContent() {
        let itemsToShow = this.getFilteredItems();
        
        // Group by category
        const grouped = {};
        itemsToShow.forEach(item => {
            const category = item.group || 'Outros';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });
        
        // Sort categories
        const sortedCategories = Object.keys(grouped).sort();
        
        if (sortedCategories.length === 0) {
            this.elements.contentContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum resultado encontrado</h3>
                    <p>Tente buscar com outros termos</p>
                </div>
            `;
            return;
        }
        
        // Stats bar
        let html = `
            <div class="stats-bar">
                <div class="stat-item">
                    <div class="stat-number">${this.allItems.length}</div>
                    <div class="stat-label">Total de Itens</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${Object.keys(this.categories).length}</div>
                    <div class="stat-label">Categorias</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${itemsToShow.length}</div>
                    <div class="stat-label">Exibindo</div>
                </div>
            </div>
        `;
        
        // Render each category row
        sortedCategories.forEach(category => {
            const items = grouped[category];
            const icon = this.getCategoryIcon(category);
            
            html += `
                <div class="content-row" data-category="${this.escapeHtml(category)}">
                    <div class="row-header">
                        <h3 class="row-title">
                            <i class="${icon}"></i>
                            ${this.escapeHtml(category)}
                        </h3>
                        <span class="row-count">${items.length} itens</span>
                    </div>
                    <div class="row-slider">
                        ${items.map(item => this.renderCard(item)).join('')}
                    </div>
                </div>
            `;
        });
        
        this.elements.contentContainer.innerHTML = html;
        
        // Bind card events
        this.bindCardEvents();
    }
    
    renderCard(item) {
        const hasLogo = item.logo && item.logo.trim() !== '';
        const icon = this.getItemIcon(item);
        const logoUrl = this.forceHttps(item.logo);
        
        return `
            <div class="content-card" data-id="${item.id}">
                <div class="card-image">
                    ${hasLogo 
                        ? `<img src="${this.escapeHtml(logoUrl)}" alt="${this.escapeHtml(item.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-placeholder\\'><i class=\\'${icon}\\'></i><span>${this.escapeHtml(item.name)}</span></div>'">`
                        : `<div class="card-placeholder">
                            <i class="${icon}"></i>
                            <span>${this.escapeHtml(item.name)}</span>
                           </div>`
                    }
                    <div class="card-overlay">
                        <div class="card-title">${this.escapeHtml(item.name)}</div>
                        <div class="card-buttons">
                            <button class="card-btn play-btn" data-action="play" title="Assistir">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="card-btn" data-action="info" title="Mais informações">
                                <i class="fas fa-info"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindCardEvents() {
        document.querySelectorAll('.content-card').forEach(card => {
            const itemId = parseInt(card.dataset.id);
            const item = this.allItems[itemId];
            
            card.querySelector('.play-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.playVideo(item);
            });
            
            card.querySelector('[data-action="info"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showDetails(item);
            });
            
            card.addEventListener('click', () => {
                this.playVideo(item);
            });
        });
    }
    
    getFilteredItems() {
        let items = [...this.allItems];
        
        // Apply type filter
        if (this.currentFilter === 'channels') {
            items = items.filter(i => i.type === 'channels');
        } else if (this.currentFilter === 'movies') {
            items = items.filter(i => i.type === 'movies');
        } else if (this.currentFilter === 'series') {
            items = items.filter(i => i.type === 'series');
        } else if (this.currentFilter.startsWith('category:')) {
            const category = this.currentFilter.replace('category:', '');
            items = items.filter(i => i.group === category);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            items = items.filter(item => 
                (item.name && item.name.toLowerCase().includes(this.searchQuery)) ||
                (item.group && item.group.toLowerCase().includes(this.searchQuery)) ||
                (item.tvgName && item.tvgName.toLowerCase().includes(this.searchQuery))
            );
        }
        
        return items;
    }
    
    setFeaturedItem() {
        // Pick a random item with a logo for featured
        const itemsWithLogo = this.allItems.filter(i => i.logo && i.logo.trim() !== '');
        
        if (itemsWithLogo.length > 0) {
            this.featuredItem = itemsWithLogo[Math.floor(Math.random() * itemsWithLogo.length)];
            
            this.elements.featuredBanner.style.backgroundImage = `url(${this.forceHttps(this.featuredItem.logo)})`;
            this.elements.featuredTitle.textContent = this.featuredItem.name;
            this.elements.featuredDescription.textContent = `Categoria: ${this.featuredItem.group || 'Geral'}`;
        } else if (this.allItems.length > 0) {
            this.featuredItem = this.allItems[0];
            this.elements.featuredTitle.textContent = this.featuredItem.name;
            this.elements.featuredDescription.textContent = `Categoria: ${this.featuredItem.group || 'Geral'}`;
        }
    }
    
    // ========================================
    // Video Player
    // ========================================
    
    playVideo(item) {
        this.elements.playerModal.classList.add('active');
        this.elements.playerTitle.textContent = item.name;
        this.elements.playerCategory.textContent = `Categoria: ${item.group || 'Geral'}`;
        
        const video = this.elements.videoPlayer;
        const url = item.url;
        
        // Destroy previous HLS instance
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        // Check if HLS is needed
        if (url.includes('.m3u8')) {
            if (Hls.isSupported()) {
                this.hls = new Hls({
                    debug: false,
                    enableWorker: true,
                    lowLatencyMode: true
                });
                this.hls.loadSource(url);
                this.hls.attachMedia(video);
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(e => console.log('Autoplay prevented:', e));
                });
                this.hls.on(Hls.Events.ERROR, (event, data) => {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch (data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                console.log('Network error, trying to recover...');
                                this.hls.startLoad();
                                break;
                            case Hls.ErrorTypes.MEDIA_ERROR:
                                console.log('Media error, trying to recover...');
                                this.hls.recoverMediaError();
                                break;
                            default:
                                this.hls.destroy();
                                break;
                        }
                    }
                });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = url;
                video.addEventListener('loadedmetadata', () => {
                    video.play().catch(e => console.log('Autoplay prevented:', e));
                });
            }
        } else {
            // Direct video URL
            video.src = url;
            video.play().catch(e => console.log('Autoplay prevented:', e));
        }
    }
    
    closePlayer() {
        this.elements.playerModal.classList.remove('active');
        
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        
        this.elements.videoPlayer.pause();
        this.elements.videoPlayer.src = '';
    }
    
    // ========================================
    // Details Modal
    // ========================================
    
    showDetails(item) {
        this.elements.detailsModal.classList.add('active');
        this.elements.detailsTitle.textContent = item.name;
        this.elements.detailsCategory.textContent = item.group || 'Geral';
        this.elements.detailsDescription.textContent = `
            Tipo: ${this.getTypeLabel(item.type)}
            ${item.tvgId ? `\nID: ${item.tvgId}` : ''}
        `;
        
        if (item.logo) {
            this.elements.detailsBanner.style.backgroundImage = `url(${this.forceHttps(item.logo)})`;
        } else {
            this.elements.detailsBanner.style.backgroundImage = 'none';
            this.elements.detailsBanner.style.backgroundColor = '#333';
        }
        
        // Play button in details
        this.elements.detailsPlayBtn.onclick = () => {
            this.elements.detailsModal.classList.remove('active');
            this.playVideo(item);
        };
    }
    
    // ========================================
    // Helpers
    // ========================================
    
    getCategoryIcon(category) {
        const categoryLower = category.toLowerCase();
        
        if (categoryLower.includes('filme') || categoryLower.includes('movie')) return 'fas fa-film';
        if (categoryLower.includes('série') || categoryLower.includes('series')) return 'fas fa-tv';
        if (categoryLower.includes('esporte') || categoryLower.includes('sport')) return 'fas fa-futbol';
        if (categoryLower.includes('notícia') || categoryLower.includes('news')) return 'fas fa-newspaper';
        if (categoryLower.includes('infantil') || categoryLower.includes('kids')) return 'fas fa-child';
        if (categoryLower.includes('música') || categoryLower.includes('music')) return 'fas fa-music';
        if (categoryLower.includes('documentário') || categoryLower.includes('doc')) return 'fas fa-book';
        if (categoryLower.includes('adulto') || categoryLower.includes('adult')) return 'fas fa-user-lock';
        if (categoryLower.includes('religioso') || categoryLower.includes('gospel')) return 'fas fa-cross';
        if (categoryLower.includes('variedade') || categoryLower.includes('variety')) return 'fas fa-star';
        if (categoryLower.includes('24h') || categoryLower.includes('ao vivo')) return 'fas fa-broadcast-tower';
        
        return 'fas fa-folder';
    }
    
    getItemIcon(item) {
        switch (item.type) {
            case 'movies': return 'fas fa-film';
            case 'series': return 'fas fa-tv';
            case 'channels': return 'fas fa-broadcast-tower';
            default: return 'fas fa-play-circle';
        }
    }
    
    getTypeLabel(type) {
        switch (type) {
            case 'movies': return 'Filme';
            case 'series': return 'Série';
            case 'channels': return 'Canal';
            default: return 'Conteúdo';
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Force HTTPS on image URLs to avoid mixed content warnings
    forceHttps(url) {
        if (!url) return '';
        return url.replace(/^http:\/\//i, 'https://');
    }
    
    hideLoading() {
        setTimeout(() => {
            this.elements.loadingScreen.classList.add('hidden');
        }, 500);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.nerdflix = new NerdflixApp();
});
