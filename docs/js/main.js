function detectLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.toLowerCase().startsWith('zh') ? 'cn' : 'en';
}

function detectDevice() {
    const width = window.innerWidth;
    return width >= 768;
}

function parseHashParams() {
    const hash = window.location.hash.slice(1);
    const params = {};
    if (hash) {
        hash.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key) {
                params[key] = value || true;
            }
        });
    }
    return params;
}

function buildHashString(params) {
    const parts = [];
    for (const [key, value] of Object.entries(params)) {
        if (value === true) {
            parts.push(key);
        } else if (value) {
            parts.push(`${key}=${value}`);
        }
    }
    return parts.length > 0 ? '#' + parts.join('&') : '';
}

function setHashParam(key, value) {
    const params = parseHashParams();
    if (value === null || value === undefined || value === '') {
        delete params[key];
    } else {
        params[key] = value;
    }
    const newHash = buildHashString(params);
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }
}

function getHashParam(key) {
    const params = parseHashParams();
    return params[key];
}

function hasHashParam(key) {
    return key in parseHashParams();
}

function initLayout() {
    const isDesktop = detectDevice();
    const sidebar = document.getElementById('sidebar');
    const bottomPanel = document.getElementById('bottomPanel');
    
    const isTinyMode = hasHashParam('tiny');

    if (isTinyMode) {
        if (sidebar) {
            sidebar.classList.remove('show');
            sidebar.style.display = 'none';
        }
        if (bottomPanel) {
            bottomPanel.classList.remove('show');
            bottomPanel.style.display = 'none';
        }
    } else {
        if (isDesktop) {
            if (sidebar) {
                sidebar.classList.add('show');
                sidebar.style.display = '';
            }
            if (bottomPanel) {
                bottomPanel.classList.remove('show');
                bottomPanel.style.display = '';
            }
        } else {
            if (sidebar) {
                sidebar.classList.remove('show');
                sidebar.style.display = '';
            }
            if (bottomPanel) {
                bottomPanel.classList.add('show');
                bottomPanel.style.display = '';
            }
        }
    }
}

function closeDrawer() {
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerPanel = document.getElementById('drawerPanel');
    const searchInputMobile = document.getElementById('searchInputMobile');
    const searchBoxMobile = document.getElementById('searchBoxMobile');
    
    if (drawerOverlay) {
        drawerOverlay.classList.remove('show');
    }
    if (drawerPanel) {
        drawerPanel.classList.remove('show');
    }
    document.body.style.overflow = '';
    
    if (searchInputMobile) {
        searchInputMobile.value = '';
        searchInputMobile.blur();
    }
    
    if (searchBoxMobile) {
        const searchResults = searchBoxMobile.querySelector('.search-results');
        if (searchResults) {
            searchResults.classList.remove('show');
        }
    }
    
    if (navManagerMobile && navManagerMobile.container) {
        navManagerMobile.container.classList.remove('search-overlay');
    }
    
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 300);
    });
}

function initDrawer() {
    const modelSelectorBtn = document.getElementById('modelSelectorBtn');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const drawerPanel = document.getElementById('drawerPanel');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const modelSelectorBtnText = document.getElementById('modelSelectorBtnText');

    if (!modelSelectorBtn || !drawerOverlay || !drawerPanel) return;

    const openDrawer = () => {
        drawerOverlay.classList.add('show');
        drawerPanel.classList.add('show');
        document.body.style.overflow = 'hidden';
    };

    modelSelectorBtn.addEventListener('click', openDrawer);
    if (drawerCloseBtn) {
        drawerCloseBtn.addEventListener('click', closeDrawer);
    }
    drawerOverlay.addEventListener('click', closeDrawer);

    if (modelSelectorBtnText) {
        modelSelectorBtnText.textContent = currentLang === 'cn' ? '选择模型' : 'Select Model';
    }
}

function initSidebarResizer() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebarResizer');
    
    if (!sidebar || !resizer) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const diff = e.clientX - startX;
        const newWidth = startWidth + diff;
        const minWidth = 200;
        const maxWidth = window.innerWidth * 0.5;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
            sidebar.style.width = `${newWidth}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

const modelViewer = document.getElementById('modelViewer');
const uploadUI = document.getElementById('uploadUI');
const hintText = document.getElementById('hintText');
const errorTag = document.getElementById('errorTag');
const actionToast = document.getElementById('actionToast');
const brightnessControl = document.getElementById('brightnessControl');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessIcon = document.querySelector('.brightness-icon');
const resetViewIcon = document.getElementById('resetViewIcon');
const shadowToggleIcon = document.getElementById('shadowToggleIcon');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleBtnHome = document.getElementById('themeToggleBtnHome');
const modelLoadingSpinner = document.getElementById('modelLoadingSpinner');
const modelLoadingProgress = document.getElementById('modelLoadingProgress');

function getManualTheme() {
    return localStorage.getItem('manualTheme');
}

function setManualTheme(theme) {
    if (theme) {
        localStorage.setItem('manualTheme', theme);
    } else {
        localStorage.removeItem('manualTheme');
    }
}

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
    const manualTheme = getManualTheme();
    const root = document.documentElement;
    
    if (manualTheme) {
        root.setAttribute('data-theme', manualTheme);
    } else {
        root.removeAttribute('data-theme');
        const systemTheme = getSystemTheme();
        if (systemTheme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    }
}

function toggleTheme() {
    const manualTheme = getManualTheme();
    const systemTheme = getSystemTheme();
    
    let newTheme;
    if (!manualTheme) {
        newTheme = systemTheme === 'dark' ? 'light' : 'dark';
    } else {
        newTheme = manualTheme === 'dark' ? 'light' : 'dark';
    }
    
    setManualTheme(newTheme);
    applyTheme();
    
    if (getShadowEnabled()) {
        applyShadowState(true);
    }
    
    const message = newTheme === 'dark' 
        ? (currentLang === 'cn' ? '已切换到深色模式' : 'Switched to dark mode')
        : (currentLang === 'cn' ? '已切换到浅色模式' : 'Switched to light mode');
    showActionToast(message);
    
    if (navigator.vibrate) navigator.vibrate(10);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        applyTheme();
    });
} else {
    applyTheme();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!getManualTheme()) {
        applyTheme();
        if (getShadowEnabled()) {
            applyShadowState(true);
        }
    }
});

if (themeToggleBtnHome) {
    themeToggleBtnHome.addEventListener('click', toggleTheme);
}

if (themeToggleIcon) {
    themeToggleIcon.addEventListener('click', toggleTheme);
}

function loadModel(src, shipInfo = null, typeId = null, updateHash = true) {
    if (!src) return;
    
    if (modelLoadingSpinner) {
        modelLoadingSpinner.classList.add('show');
    }
    if (modelLoadingProgress) {
        modelLoadingProgress.textContent = '0%';
    }
    
    modelViewer.classList.add('active');
    uploadUI.style.display = 'none';
    brightnessControl.classList.add('show');
    
    const copyrightFooter = document.querySelector('.copyright-footer');
    if (copyrightFooter) {
        copyrightFooter.classList.add('collapsed');
    }
    
    if (updateHash) {
        if (typeId) {
            setHashParam('typeid', typeId);
        } else {
            setHashParam('typeid', null);
        }
    }
    
    const shipNameDisplay = document.getElementById('shipNameDisplay');
    if (shipNameDisplay) {
        if (shipInfo) {
            let displayName = shipInfo.name;
            if (currentLang === 'cn' && shipInfo.name_zh) {
                displayName = shipInfo.name_zh;
            } else if (currentLang === 'en' && shipInfo.name_en) {
                displayName = shipInfo.name_en;
            }
            shipNameDisplay.textContent = displayName;
            shipNameDisplay.classList.add('show');
            document.title = `${displayName} - EVE Model Viewer`;
            
            // 添加点击事件来复制模型URL
            const getModelUrl = () => {
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    return src;
                }
                try {
                    return new URL(src, window.location.href).href;
                } catch (e) {
                    // fallback: 手动构建URL
                    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
                    return baseUrl + '/' + src.replace(/^\.\//, '');
                }
            };
            
            // 移除旧的点击事件监听器（通过保存的引用）
            if (shipNameDisplay._copyHandler) {
                shipNameDisplay.removeEventListener('click', shipNameDisplay._copyHandler);
            }
            
            // 创建新的点击事件处理函数
            shipNameDisplay._copyHandler = async () => {
                const modelUrl = getModelUrl();
                try {
                    await navigator.clipboard.writeText(modelUrl);
                } catch (err) {
                    // 如果clipboard API失败，使用fallback方法
                    const textArea = document.createElement('textarea');
                    textArea.value = modelUrl;
                    textArea.style.position = 'fixed';
                    textArea.style.opacity = '0';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                    } catch (e) {
                        // 忽略错误
                    }
                    document.body.removeChild(textArea);
                }
            };
            
            shipNameDisplay.addEventListener('click', shipNameDisplay._copyHandler);
        } else {
            shipNameDisplay.classList.remove('show');
            document.title = 'EVE Model Viewer';
        }
    }
    
    const errorHandler = (event) => {
        if (modelLoadingSpinner) {
            modelLoadingSpinner.classList.remove('show');
        }
        
        let errorMessage = 'Failed to load model';
        
        if (event.detail && event.detail.type) {
            errorMessage = `${event.detail.type}`;
        } else if (event.message) {
            errorMessage = `${event.message}`;
        } else if (event.target && event.target.error) {
            errorMessage = `${event.target.error.message || 'Unknown error'}`;
        }
        
        errorTag.textContent = errorMessage;
        errorTag.classList.add('show');
        
        const shipNameDisplay = document.getElementById('shipNameDisplay');
        if (shipNameDisplay) {
            shipNameDisplay.classList.remove('show');
        }
        
        document.title = 'EVE Model Viewer';
        
        const copyrightFooter = document.querySelector('.copyright-footer');
        if (copyrightFooter) {
            copyrightFooter.classList.remove('collapsed');
        }
        
        setTimeout(() => {
            errorTag.classList.remove('show');
        }, 5000);
    };
    
    const progressHandler = (e) => {
        if (e.detail && e.detail.totalProgress !== undefined && modelLoadingProgress) {
            const progress01 = e.detail.totalProgress;
            const progress100 = Math.round(progress01 * 100);
            modelLoadingProgress.textContent = `${progress100}%`;
        }
    };
    
    const loadHandler = () => {
        if (modelLoadingProgress) {
            modelLoadingProgress.textContent = '100%';
        }
        if (modelLoadingSpinner) {
            modelLoadingSpinner.classList.remove('show');
        }
        
        modelViewer.cameraOrbit = '45deg auto auto';
        if (modelViewer.cameraTarget) {
            initialCameraTarget = {
                x: modelViewer.cameraTarget.x,
                y: modelViewer.cameraTarget.y,
                z: modelViewer.cameraTarget.z
            };
        }
        
        applyShadowState(getShadowEnabled());
    };
    
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    if (modelViewer._loadAbortController) {
        modelViewer._loadAbortController.abort();
    }
    modelViewer._loadAbortController = abortController;
    
    modelViewer.addEventListener('load', loadHandler, { once: true, signal });
    modelViewer.addEventListener('error', errorHandler, { once: true, signal });
    modelViewer.addEventListener('progress', progressHandler, { signal });
    
    modelViewer.src = src;
}

let resourcesIndex = null;
const currentLang = detectLanguage();
const indexFile = `./statics/resources_index_${currentLang}.json`;

function getShadowEnabled() {
    const saved = localStorage.getItem('shadowEnabled');
    return saved !== null ? saved === 'true' : true;
}

function setShadowEnabled(enabled) {
    localStorage.setItem('shadowEnabled', enabled.toString());
}

function toggleShadow() {
    const currentEnabled = getShadowEnabled();
    const newEnabled = !currentEnabled;
    setShadowEnabled(newEnabled);
    applyShadowState(newEnabled);
    
    const message = newEnabled 
        ? (currentLang === 'cn' ? '阴影已开启' : 'Shadows enabled')
        : (currentLang === 'cn' ? '阴影已关闭' : 'Shadows disabled');
    showActionToast(message);
    
    if (navigator.vibrate) navigator.vibrate(10);
}

function applyShadowState(enabled) {
    if (shadowToggleIcon) {
        if (enabled) {
            shadowToggleIcon.classList.add('active');
        } else {
            shadowToggleIcon.classList.remove('active');
        }
    }
    
    if (modelViewer) {
        if (enabled) {
            const currentTheme = document.documentElement.getAttribute('data-theme') || getSystemTheme();
            if (currentTheme === 'dark') {
                modelViewer.shadowIntensity = '1.5';
            } else {
                modelViewer.shadowIntensity = '1';
            }
        } else {
            modelViewer.shadowIntensity = '0';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const initialShadowEnabled = getShadowEnabled();
        applyShadowState(initialShadowEnabled);
    });
} else {
    const initialShadowEnabled = getShadowEnabled();
    applyShadowState(initialShadowEnabled);
}

if (hintText) {
    hintText.textContent = currentLang === 'cn' ? '从目录中选择模型' : 'Select a model from the directory';
}

const modelSelectorBtnText = document.getElementById('modelSelectorBtnText');
if (modelSelectorBtnText) {
    modelSelectorBtnText.textContent = currentLang === 'cn' ? '选择模型' : 'Select Model';
}

const loadingText = document.getElementById('loadingText');
if (loadingText) {
    loadingText.textContent = currentLang === 'cn' ? '加载中...' : 'Loading...';
}

function getIconPath(iconName) {
    if (!iconName) return '';
    const normalized = iconName.replace('\\', '/');
    return `./statics/icons/${normalized}`;
}

function getTypeIconUrl(iconName, typeId) {
    if (iconName) {
        // 如果有图标名称，使用本地图标文件
        return getIconPath(iconName);
    }
    // 如果没有图标名称，使用 API 作为兜底
    if (typeId) {
        return `https://images.evetech.net/types/${typeId}/icon`;
    }
    // 如果既没有图标名称也没有 typeId，返回默认
    return './type_default.png';
}

function createIconWithSpinner(iconClass, iconSrc, iconAlt, hasModel = true) {
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'icon-wrapper';
    
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'icon-loading-spinner';
    iconWrapper.appendChild(loadingSpinner);
    
    const icon = document.createElement('img');
    icon.className = iconClass;
    icon.dataset.src = iconSrc;
    icon.alt = iconAlt;
    icon.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"%3E%3C/svg%3E';
    if (!hasModel) {
        icon.classList.add('no-model');
    }
    iconWrapper.appendChild(icon);
    
    iconLoader.observe(icon);
    
    return iconWrapper;
}

class IconLoader {
    constructor(maxConcurrent = 10) {
        this.maxConcurrent = maxConcurrent;
        this.loadingQueue = [];
        this.activeLoads = 0;
        this.observer = null;
        this.initObserver();
    }

    initObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadIcon(img);
                    this.observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });
    }

    loadIcon(img) {
        if (img.dataset.loaded === 'true') return;
        if (img.dataset.queued === 'true') return;

        img.dataset.queued = 'true';
        this.loadingQueue.push(img);
        this.processQueue();
    }

    async processQueue() {
        if (this.activeLoads >= this.maxConcurrent || this.loadingQueue.length === 0) {
            return;
        }

        const img = this.loadingQueue.shift();
        this.activeLoads++;

        const src = img.dataset.src;
        if (!src) {
            const iconWrapper = img.parentElement;
            if (iconWrapper && iconWrapper.classList.contains('icon-wrapper')) {
                const spinner = iconWrapper.querySelector('.icon-loading-spinner');
                if (spinner) {
                    spinner.remove();
                }
            }
            this.activeLoads--;
            this.processQueue();
            return;
        }

        try {
            await this.loadImage(img, src);
        } catch (error) {
            const iconWrapper = img.parentElement;
            if (iconWrapper && iconWrapper.classList.contains('icon-wrapper')) {
                const spinner = iconWrapper.querySelector('.icon-loading-spinner');
                if (spinner) {
                    spinner.remove();
                }
            }
            img.style.display = 'none';
        } finally {
            this.activeLoads--;
            this.processQueue();
        }
    }

    loadImage(img, src) {
        return new Promise((resolve, reject) => {
            const iconWrapper = img.parentElement;
            if (!iconWrapper || !iconWrapper.classList.contains('icon-wrapper')) {
                reject(new Error('Invalid icon wrapper'));
                return;
            }
            
            const spinner = iconWrapper.querySelector('.icon-loading-spinner');
            
            const removeSpinner = () => {
                if (spinner && spinner.parentNode) {
                    spinner.remove();
                }
            };
            
            const image = new Image();
            image.onload = () => {
                img.src = src;
                img.dataset.loaded = 'true';
                img.classList.add('loaded');
                img.style.display = 'block';
                removeSpinner();
                resolve();
            };
            image.onerror = () => {
                img.style.display = 'none';
                removeSpinner();
                reject(new Error('Failed to load image'));
            };
            
            image.src = src;
        });
    }

    observe(img) {
        if (img.dataset.src) {
            this.observer.observe(img);
        }
    }
}

const iconLoader = new IconLoader(5);

class NavigationManager {
    constructor(data, containerId, breadcrumbId) {
        this.data = data;
        this.container = document.getElementById(containerId);
        this.breadcrumb = document.getElementById(breadcrumbId);
        this.path = [];
        this.init();
    }

    init() {
        this.sortData();
        this.navigateTo([]);
    }

    calculateHasModel() {
        this.data.forEach(category => {
            if (category.groups) {
                category.groups.forEach(group => {
                    if (group.types) {
                        group.types.forEach(type => {
                            type.has_model = !!(type.model_path && type.model_path.trim());
                        });
                        group.has_model = group.types.some(type => type.has_model);
                    } else {
                        group.has_model = false;
                    }
                });
                category.has_model = category.groups.some(group => group.has_model);
            } else {
                category.has_model = false;
            }
        });
    }

    sortData() {
        this.calculateHasModel();
        
        this.data.sort((a, b) => {
            const aHasModel = a.has_model || false;
            const bHasModel = b.has_model || false;
            if (aHasModel !== bHasModel) {
                return bHasModel - aHasModel;
            }
            return (a.id || 0) - (b.id || 0);
        });
        
        this.data.forEach(category => {
            if (category.groups) {
                category.groups.sort((a, b) => {
                    const aHasModel = a.has_model || false;
                    const bHasModel = b.has_model || false;
                    if (aHasModel !== bHasModel) {
                        return bHasModel - aHasModel;
                    }
                    const nameA = (a.name || '').toLowerCase();
                    const nameB = (b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
                category.groups.forEach(group => {
                    if (group.types) {
                        group.types.sort((a, b) => {
                            const aHasModel = a.has_model || false;
                            const bHasModel = b.has_model || false;
                            if (aHasModel !== bHasModel) {
                                return bHasModel - aHasModel;
                            }
                            const nameA = (a.name || '').toLowerCase();
                            const nameB = (b.name || '').toLowerCase();
                            return nameA.localeCompare(nameB);
                        });
                    }
                });
            }
        });
    }

    navigateTo(path) {
        this.path = path;
        this.updateBreadcrumb();
        this.renderContent();
        if (this.container) {
            this.container.scrollTop = 0;
        }
    }

    updateBreadcrumb() {
        if (!this.breadcrumb) return;

        this.breadcrumb.innerHTML = '';

        const homeItem = document.createElement('span');
        homeItem.className = 'breadcrumb-item';
        homeItem.textContent = 'Home';
        homeItem.addEventListener('click', () => this.navigateTo([]));
        this.breadcrumb.appendChild(homeItem);

        let current = { children: this.data };
        this.path.forEach((item, index) => {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '›';
            this.breadcrumb.appendChild(separator);

            const breadcrumbItem = document.createElement('span');
            breadcrumbItem.className = 'breadcrumb-item';
            breadcrumbItem.textContent = item.name;
            if (index === this.path.length - 1) {
                breadcrumbItem.classList.add('active');
            } else {
                breadcrumbItem.addEventListener('click', () => {
                    this.navigateTo(this.path.slice(0, index + 1));
                });
            }
            this.breadcrumb.appendChild(breadcrumbItem);

            if (item.type === 'category') {
                current = current.children.find(c => c.id === item.id);
            } else if (item.type === 'group') {
                current = current.groups.find(g => g.id === item.id);
            }
        });
    }

    renderContent() {
        if (!this.container) return;

        const focusedElement = this.container.querySelector(':focus');
        if (focusedElement) {
            focusedElement.blur();
        }

        this.container.innerHTML = '';
        this.container.scrollTop = 0;

        let current = { children: this.data };
        this.path.forEach(item => {
            if (item.type === 'category') {
                current = current.children.find(c => c.id === item.id);
            } else if (item.type === 'group') {
                current = current.groups.find(g => g.id === item.id);
            }
        });

        if (this.path.length === 0) {
            const sortedCategories = [...this.data].sort((a, b) => {
                const aHasModel = a.has_model || false;
                const bHasModel = b.has_model || false;
                if (aHasModel !== bHasModel) {
                    return bHasModel - aHasModel;
                }
                return (a.id || 0) - (b.id || 0);
            });
            this.renderCategories(sortedCategories);
        } else if (this.path[this.path.length - 1].type === 'category') {
            const sortedGroups = [...(current.groups || [])].sort((a, b) => {
                const aHasModel = a.has_model || false;
                const bHasModel = b.has_model || false;
                if (aHasModel !== bHasModel) {
                    return bHasModel - aHasModel;
                }
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            this.renderGroups(sortedGroups);
        } else if (this.path[this.path.length - 1].type === 'group') {
            const sortedTypes = [...(current.types || [])].sort((a, b) => {
                const aHasModel = a.has_model || false;
                const bHasModel = b.has_model || false;
                if (aHasModel !== bHasModel) {
                    return bHasModel - aHasModel;
                }
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            this.renderTypes(sortedTypes);
        }
    }

    countModelsInCategory(category) {
        let count = 0;
        if (category.groups) {
            category.groups.forEach(group => {
                if (group.types) {
                    group.types.forEach(type => {
                        if (type.has_model || (type.model_path && type.model_path.trim())) {
                            count++;
                        }
                    });
                }
            });
        }
        return count;
    }

    renderCategories(categories) {
        const list = document.createElement('ul');
        list.className = 'category-tree';

        categories.forEach(category => {
            const item = document.createElement('li');
            item.className = 'category-item';

            const header = document.createElement('div');
            header.className = 'category-header';

            if (category.icon_name) {
                const iconWrapper = createIconWithSpinner(
                    'category-icon',
                    getIconPath(category.icon_name),
                    category.name,
                    category.has_model
                );
                header.appendChild(iconWrapper);
            }

            const name = document.createElement('span');
            name.className = 'category-name';
            name.textContent = category.name;
            if (!category.has_model) {
                name.classList.add('no-model');
            }
            header.appendChild(name);
            
            const modelCount = this.countModelsInCategory(category);
            if (modelCount > 0) {
                const countSpan = document.createElement('span');
                countSpan.className = 'category-count';
                countSpan.textContent = ` (${modelCount})`;
                header.appendChild(countSpan);
            }

            if (category.groups && category.groups.length > 0) {
                const arrow = document.createElement('div');
                arrow.className = 'nav-arrow';
                arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
                header.appendChild(arrow);
            }

            header.addEventListener('click', (e) => {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
                this.navigateTo([{ type: 'category', id: category.id, name: category.name }]);
            });

            item.appendChild(header);
            list.appendChild(item);
        });

        this.container.appendChild(list);
    }

    renderGroups(groups) {
        const list = document.createElement('ul');
        list.className = 'category-tree';

        groups.forEach(group => {
            const item = document.createElement('li');
            item.className = 'group-item';

            const header = document.createElement('div');
            header.className = 'group-header';

            if (group.icon_name) {
                const iconWrapper = createIconWithSpinner(
                    'group-icon',
                    getIconPath(group.icon_name),
                    group.name,
                    group.has_model
                );
                header.appendChild(iconWrapper);
            }

            const name = document.createElement('span');
            name.className = 'group-name';
            name.textContent = group.name;
            if (!group.has_model) {
                name.classList.add('no-model');
            }
            header.appendChild(name);

            if (group.types && group.types.length > 0) {
                const arrow = document.createElement('div');
                arrow.className = 'nav-arrow';
                arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
                header.appendChild(arrow);
            }

            header.addEventListener('click', (e) => {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
                const newPath = [...this.path, { type: 'group', id: group.id, name: group.name }];
                this.navigateTo(newPath);
            });

            item.appendChild(header);
            list.appendChild(item);
        });

        this.container.appendChild(list);
    }

    renderTypes(types) {
        const list = document.createElement('ul');
        list.className = 'category-tree';

        types.forEach(type => {
            const item = document.createElement('li');
            item.className = 'type-item';
            item.dataset.typeId = type.id;

            const iconWrapper = createIconWithSpinner(
                'type-icon',
                getTypeIconUrl(type.icon_name, type.id),
                type.name,
                type.has_model
            );
            item.appendChild(iconWrapper);

            const name = document.createElement('span');
            name.className = 'type-name';
            name.textContent = type.name;
            if (!type.has_model) {
                name.classList.add('no-model');
            }
            item.appendChild(name);

            item.addEventListener('click', () => {
                document.querySelectorAll('.type-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                if (type.model_path) {
                    loadModel(type.model_path, {
                        name: type.name,
                        name_en: type.name_en || '',
                        name_zh: type.name_zh || ''
                    }, type.id);
                }
                
                if (this.container && this.container.id === 'navContentMobile') {
                    closeDrawer();
                }
            });

            list.appendChild(item);
        });

        this.container.appendChild(list);
    }
}

let navManager = null;
let navManagerMobile = null;

function buildSearchIndex(data) {
    const index = [];
    data.forEach(category => {
        if (category.groups) {
            category.groups.forEach(group => {
                if (group.types) {
                    group.types.forEach(type => {
                        index.push({
                            id: type.id,
                            name: type.name,
                            name_en: type.name_en || '',
                            name_zh: type.name_zh || '',
                            icon_name: type.icon_name || '',
                            model_path: type.model_path || '',
                            categoryId: category.id,
                            categoryName: category.name,
                            groupId: group.id,
                            groupName: group.name
                        });
                    });
                }
            });
        }
    });
    return index;
}

function findTypeById(data, typeId) {
    for (const category of data) {
        if (category.groups) {
            for (const group of category.groups) {
                if (group.types) {
                    for (const type of group.types) {
                        if (type.id === typeId) {
                            return {
                                type: type,
                                category: category,
                                group: group
                            };
                        }
                    }
                }
            }
        }
    }
    return null;
}

function loadModelFromHash() {
    const typeIdParam = getHashParam('typeid');
    if (!typeIdParam) return;
    
    const typeId = parseInt(typeIdParam, 10);
    
    if (isNaN(typeId) || String(typeId) !== String(typeIdParam)) {
        showModelNotFoundError();
        return;
    }
    
    if (!resourcesIndex) {
        return;
    }
    
    const result = findTypeById(resourcesIndex, typeId);
    if (!result || !result.type.model_path) {
        showModelNotFoundError();
        return;
    }
    
    loadModel(result.type.model_path, {
        name: result.type.name,
        name_en: result.type.name_en || '',
        name_zh: result.type.name_zh || ''
    }, result.type.id, false);
}

function showModelNotFoundError() {
    const errorMessage = currentLang === 'cn' ? '模型不存在' : 'Model not found';
    errorTag.textContent = errorMessage;
    errorTag.classList.add('show');
    setTimeout(() => {
        errorTag.classList.remove('show');
    }, 3000);
}

function searchShips(query, searchIndex) {
    if (!query || !searchIndex) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    
    return searchIndex.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(lowerQuery);
        const nameEnMatch = item.name_en.toLowerCase().includes(lowerQuery);
        const nameZhMatch = item.name_zh.toLowerCase().includes(lowerQuery);
        const idMatch = String(item.id).includes(lowerQuery);
        return nameMatch || nameEnMatch || nameZhMatch || idMatch;
    });
}

function renderSearchResults(results, searchResultsContainer, navManager) {
    searchResultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'search-result-item';
        noResults.style.cursor = 'default';
        noResults.textContent = currentLang === 'cn' ? '未找到结果' : 'No results found';
        searchResultsContainer.appendChild(noResults);
        return;
    }
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        
        const iconWrapper = createIconWithSpinner(
            'search-result-icon',
            getTypeIconUrl(result.icon_name, result.id),
            result.name,
            true
        );
        item.appendChild(iconWrapper);
        
        const info = document.createElement('div');
        info.className = 'search-result-info';
        
        const name = document.createElement('div');
        name.className = 'search-result-name';
        name.textContent = result.name;
        info.appendChild(name);
        
        const path = document.createElement('div');
        path.className = 'search-result-path';
        path.textContent = `${result.categoryName} › ${result.groupName}`;
        info.appendChild(path);
        
        item.appendChild(info);
        
        item.addEventListener('click', () => {
            const path = [
                { type: 'category', id: result.categoryId, name: result.categoryName },
                { type: 'group', id: result.groupId, name: result.groupName }
            ];
            
            const isMobile = !detectDevice();
            const targetNavManager = isMobile && navManagerMobile ? navManagerMobile : navManager;
            
            if (targetNavManager.container) {
                targetNavManager.container.classList.remove('search-overlay');
            }
            
            searchResultsContainer.classList.remove('show');
            const searchInput = document.getElementById('searchInput');
            const searchInputMobile = document.getElementById('searchInputMobile');
            if (searchInput) searchInput.value = '';
            if (searchInputMobile) searchInputMobile.value = '';
            
            if (isMobile) {
                closeDrawer().then(() => {
                    if (result.model_path) {
                        loadModel(result.model_path, {
                            name: result.name,
                            name_en: result.name_en || '',
                            name_zh: result.name_zh || ''
                        }, result.id);
                    }
                });
            } else {
                targetNavManager.navigateTo(path);
                setTimeout(() => {
                    const typeItem = document.querySelector(`.type-item[data-type-id="${result.id}"]`);
                    if (typeItem) {
                        typeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        typeItem.classList.add('active');
                        if (result.model_path) {
                            loadModel(result.model_path, {
                                name: result.name,
                                name_en: result.name_en || '',
                                name_zh: result.name_zh || ''
                            }, result.id);
                        }
                    }
                }, 100);
            }
        });
        
        searchResultsContainer.appendChild(item);
    });
}

let searchIndex = null;

function initSearchBox(searchInputId, searchBoxId, navManager) {
    const searchInput = document.getElementById(searchInputId);
    const searchBox = document.getElementById(searchBoxId);
    
    if (!searchInput || !searchBox || !navManager) return;
    
    const navContent = navManager.container;
    if (!navContent) return;
    
    searchInput.placeholder = currentLang === 'cn' ? '搜索飞船名称或ID...' : 'Search ship name or ID...';
    
    let searchResultsContainer = searchBox.querySelector('.search-results');
    if (!searchResultsContainer) {
        searchResultsContainer = document.createElement('div');
        searchResultsContainer.className = 'search-results';
        searchBox.style.position = 'relative';
        searchBox.appendChild(searchResultsContainer);
    }
    
    const toggleOverlay = (show) => {
        if (show) {
            navContent.classList.add('search-overlay');
        } else {
            navContent.classList.remove('search-overlay');
        }
    };
    
    let searchTimeout = null;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (query.trim()) {
                const results = searchShips(query, searchIndex);
                renderSearchResults(results, searchResultsContainer, navManager);
                searchResultsContainer.classList.add('show');
                toggleOverlay(true);
            } else {
                searchResultsContainer.classList.remove('show');
                toggleOverlay(false);
            }
        }, 300);
    });
    
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
            const results = searchShips(searchInput.value, searchIndex);
            renderSearchResults(results, searchResultsContainer, navManager);
            searchResultsContainer.classList.add('show');
            toggleOverlay(true);
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target)) {
            searchResultsContainer.classList.remove('show');
            toggleOverlay(false);
        }
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResultsContainer.classList.remove('show');
            toggleOverlay(false);
            searchInput.blur();
        }
    });
}

function initSearch() {
    initSearchBox('searchInput', 'searchBox', navManager);
    if (navManagerMobile) {
        initSearchBox('searchInputMobile', 'searchBoxMobile', navManagerMobile);
    }
}

function showMainContent() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const dropZone = document.getElementById('dropZone');
    
    initLayout();
    initSidebarResizer();
    initDrawer();
    
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
    if (dropZone) {
        dropZone.style.display = 'flex';
    }
}

function updateLoadingText(text) {
    const loadingText = document.getElementById('loadingText');
    if (loadingText) {
        loadingText.textContent = text;
    }
}

fetch(indexFile)
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load index file: ${response.statusText}`);
        }
        updateLoadingText(currentLang === 'cn' ? '加载数据中...' : 'Loading data...');
        return response.json();
    })
    .then(data => {
        updateLoadingText(currentLang === 'cn' ? '准备目录...' : 'Preparing directory...');
        resourcesIndex = data;
        navManager = new NavigationManager(data, 'navContent', 'breadcrumb');
        const breadcrumbMobile = document.getElementById('breadcrumbMobile');
        const navContentMobile = document.getElementById('navContentMobile');
        if (breadcrumbMobile && navContentMobile) {
            navManagerMobile = new NavigationManager(data, 'navContentMobile', 'breadcrumbMobile');
        }
        
        searchIndex = buildSearchIndex(data);
        initSearch();
        
        setTimeout(() => {
            showMainContent();
            loadModelFromHash();
        }, 100);
    })
    .catch(error => {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = currentLang === 'cn' ? '加载失败' : 'Loading failed';
        }
        
        setTimeout(() => {
            showMainContent();
        }, 2000);
        
        errorTag.textContent = `Failed to load resources index: ${error.message}`;
        errorTag.classList.add('show');
        setTimeout(() => {
            errorTag.classList.remove('show');
        }, 5000);
    });

window.addEventListener('resize', initLayout);
window.addEventListener('hashchange', initLayout);

const initialCameraOrbit = '45deg auto auto';
const initialExposure = 1;
let initialCameraTarget = null;

function showActionToast(message) {
    if (!actionToast) return;
    
    actionToast.textContent = message;
    actionToast.classList.remove('hide');
    actionToast.classList.add('show');
    
    setTimeout(() => {
        actionToast.classList.remove('show');
        actionToast.classList.add('hide');
        setTimeout(() => {
            actionToast.classList.remove('hide');
        }, 300);
    }, 2000);
}

brightnessIcon.addEventListener('click', () => {
    const defaultValue = 1;

    modelViewer.exposure = defaultValue;

    brightnessSlider.value = defaultValue;

    showActionToast(currentLang === 'cn' ? '已重置亮度' : 'Brightness reset');
    
    if (navigator.vibrate) navigator.vibrate(10);
});

resetViewIcon.addEventListener('click', () => {
    modelViewer.cameraOrbit = initialCameraOrbit;
    modelViewer.fieldOfView = 'auto';
    
    if (initialCameraTarget && modelViewer.loaded) {
        modelViewer.cameraTarget = initialCameraTarget;
    }
    
    if (modelViewer.loaded) {
        if (typeof modelViewer.resetTurntableRotation === 'function') {
            modelViewer.resetTurntableRotation();
        }
    }
    
    modelViewer.exposure = initialExposure;
    brightnessSlider.value = initialExposure;

    showActionToast(currentLang === 'cn' ? '已重置视角' : 'View reset');
    
    if (navigator.vibrate) navigator.vibrate(10);
});

brightnessSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    modelViewer.exposure = value;
});

if (shadowToggleIcon) {
    shadowToggleIcon.addEventListener('click', () => {
        toggleShadow();
    });
}

window.addEventListener('hashchange', () => {
    loadModelFromHash();
});

