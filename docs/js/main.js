function detectLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    return lang.toLowerCase().startsWith('zh') ? 'cn' : 'en';
}

function detectDevice() {
    const width = window.innerWidth;
    return width >= 768;
}

function initLayout() {
    const isDesktop = detectDevice();
    const sidebar = document.getElementById('sidebar');
    const bottomPanel = document.getElementById('bottomPanel');

    if (isDesktop) {
        sidebar.classList.add('show');
        bottomPanel.classList.remove('show');
    } else {
        sidebar.classList.remove('show');
        bottomPanel.classList.add('show');
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
const infoTag = document.getElementById('infoTag');
const errorTag = document.getElementById('errorTag');
const brightnessControl = document.getElementById('brightnessControl');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessIcon = document.querySelector('.brightness-icon');
const resetViewIcon = document.getElementById('resetViewIcon');
const modelLoadingSpinner = document.getElementById('modelLoadingSpinner');

function loadModel(src, shipInfo = null, typeId = null) {
    if (!src) return;
    
    // 显示加载动画
    if (modelLoadingSpinner) {
        modelLoadingSpinner.classList.add('show');
    }
    
    modelViewer.src = src;
    modelViewer.classList.add('active');
    uploadUI.style.display = 'none';
    brightnessControl.classList.add('show');
    
    // 折叠版权说明
    const copyrightFooter = document.querySelector('.copyright-footer');
    if (copyrightFooter) {
        copyrightFooter.classList.add('collapsed');
    }
    
    // 更新 URL hash
    if (typeId) {
        const newHash = `typeid=${typeId}`;
        // 只有当 hash 不同时才更新，避免不必要的更新
        if (window.location.hash !== `#${newHash}`) {
            window.location.hash = newHash;
        }
    } else {
        // 如果没有 typeId，清除 hash
        if (window.location.hash) {
            window.location.hash = '';
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
            // 更新页面标题
            document.title = `${displayName} - EVE Model Viewer`;
        } else {
            shipNameDisplay.classList.remove('show');
            // 恢复默认标题
            document.title = 'EVE Model Viewer';
        }
    }
    
    modelViewer.addEventListener('load', () => {
        // 隐藏加载动画
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
    }, { once: true });
    
    const errorHandler = (event) => {
        // 隐藏加载动画
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
        
        // 恢复默认标题
        document.title = 'EVE Model Viewer';
        
        // 展开版权说明
        const copyrightFooter = document.querySelector('.copyright-footer');
        if (copyrightFooter) {
            copyrightFooter.classList.remove('collapsed');
        }
        
        setTimeout(() => {
            errorTag.classList.remove('show');
        }, 5000);
    };
    
    modelViewer.removeEventListener('error', errorHandler);
    modelViewer.addEventListener('error', errorHandler, { once: true });
}

let resourcesIndex = null;
const currentLang = detectLanguage();
const indexFile = `./statics/resources_index_${currentLang}.json`;

if (hintText) {
    hintText.textContent = currentLang === 'cn' ? '从目录中选择模型' : 'Select a model from the directory';
}

// 初始化加载文本
const loadingText = document.getElementById('loadingText');
if (loadingText) {
    loadingText.textContent = currentLang === 'cn' ? '加载中...' : 'Loading...';
}

function getIconPath(iconName) {
    if (!iconName) return '';
    const normalized = iconName.replace('\\', '/');
    return `./statics/icons/${normalized}`;
}

function getTypeIconUrl(typeId) {
    return `https://images.evetech.net/types/${typeId}/icon`;
}

class IconLoader {
    constructor(maxConcurrent = 5) {
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
            this.activeLoads--;
            this.processQueue();
            return;
        }

        try {
            await this.loadImage(img, src);
        } catch (error) {
            img.style.display = 'none';
        } finally {
            this.activeLoads--;
            this.processQueue();
        }
    }

    loadImage(img, src) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => {
                img.src = src;
                img.dataset.loaded = 'true';
                img.classList.add('loaded');
                resolve();
            };
            image.onerror = () => {
                img.style.display = 'none';
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
        // 遍历所有目录
        this.data.forEach(category => {
            // 计算每个组是否有模型
            if (category.groups) {
                category.groups.forEach(group => {
                    // 计算每个类型是否有模型
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
        // 先计算has_model
        this.calculateHasModel();
        
        // 排序：有模型的优先，然后按ID或名称排序
        this.data.sort((a, b) => {
            const aHasModel = a.has_model || false;
            const bHasModel = b.has_model || false;
            if (aHasModel !== bHasModel) {
                return bHasModel - aHasModel; // true在前
            }
            return (a.id || 0) - (b.id || 0);
        });
        
        this.data.forEach(category => {
            if (category.groups) {
                category.groups.sort((a, b) => {
                    const aHasModel = a.has_model || false;
                    const bHasModel = b.has_model || false;
                    if (aHasModel !== bHasModel) {
                        return bHasModel - aHasModel; // true在前
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
                                return bHasModel - aHasModel; // true在前
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

        // 清除所有可能的焦点状态
        const focusedElement = this.container.querySelector(':focus');
        if (focusedElement) {
            focusedElement.blur();
        }

        this.container.innerHTML = '';
        this.container.scrollTop = 0; // Reset scroll position

        let current = { children: this.data };
        this.path.forEach(item => {
            if (item.type === 'category') {
                current = current.children.find(c => c.id === item.id);
            } else if (item.type === 'group') {
                current = current.groups.find(g => g.id === item.id);
            }
        });

        if (this.path.length === 0) {
            // 确保数据已排序
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
            // 确保组已排序
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
            // 确保类型已排序
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

    renderCategories(categories) {
        const list = document.createElement('ul');
        list.className = 'category-tree';

        categories.forEach(category => {
            const item = document.createElement('li');
            item.className = 'category-item';

            const header = document.createElement('div');
            header.className = 'category-header';

            if (category.icon_name) {
                const icon = document.createElement('img');
                icon.className = 'category-icon';
                icon.dataset.src = getIconPath(category.icon_name);
                icon.alt = category.name;
                if (!category.has_model) {
                    icon.classList.add('no-model');
                }
                header.appendChild(icon);
                iconLoader.observe(icon);
            }

            const name = document.createElement('span');
            name.className = 'category-name';
            name.textContent = category.name;
            if (!category.has_model) {
                name.classList.add('no-model');
            }
            header.appendChild(name);

            if (category.groups && category.groups.length > 0) {
                const arrow = document.createElement('div');
                arrow.className = 'nav-arrow';
                arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
                header.appendChild(arrow);
            }

            header.addEventListener('click', (e) => {
                // 立即清除活动状态
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
                const icon = document.createElement('img');
                icon.className = 'group-icon';
                icon.dataset.src = getIconPath(group.icon_name);
                icon.alt = group.name;
                if (!group.has_model) {
                    icon.classList.add('no-model');
                }
                header.appendChild(icon);
                iconLoader.observe(icon);
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
                // 立即清除活动状态
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

            const icon = document.createElement('img');
            icon.className = 'type-icon';
            icon.dataset.src = getTypeIconUrl(type.id);
            icon.alt = type.name;
            if (!type.has_model) {
                icon.classList.add('no-model');
            }
            item.appendChild(icon);
            iconLoader.observe(icon);

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
    const hash = window.location.hash;
    if (!hash) return;
    
    // 解析 hash，格式: #typeid=123
    const match = hash.match(/typeid=(\d+)/);
    if (!match) return;
    
    const typeIdStr = match[1];
    const typeId = parseInt(typeIdStr, 10);
    
    // 验证是否为有效数字
    if (isNaN(typeId) || typeIdStr !== String(typeId)) {
        showModelNotFoundError();
        return;
    }
    
    // 检查资源索引是否已加载
    if (!resourcesIndex) {
        // 如果资源索引还未加载，等待加载完成后再尝试
        return;
    }
    
    // 查找对应的模型
    const result = findTypeById(resourcesIndex, typeId);
    if (!result || !result.type.model_path) {
        showModelNotFoundError();
        return;
    }
    
    // 加载模型
    loadModel(result.type.model_path, {
        name: result.type.name,
        name_en: result.type.name_en || '',
        name_zh: result.type.name_zh || ''
    }, result.type.id);
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
        
        const icon = document.createElement('img');
        icon.className = 'search-result-icon';
        icon.dataset.src = getTypeIconUrl(result.id);
        icon.alt = result.name;
        item.appendChild(icon);
        iconLoader.observe(icon);
        
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
    
    // 初始化布局和功能
    initLayout();
    initSidebarResizer();
    initDrawer();
    
    // 显示主要内容
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
        
        // 数据准备好后，显示主要内容
        setTimeout(() => {
            showMainContent();
            // 检查 hash 参数并加载模型
            loadModelFromHash();
        }, 100);
    })
    .catch(error => {
        const loadingText = document.getElementById('loadingText');
        if (loadingText) {
            loadingText.textContent = currentLang === 'cn' ? '加载失败' : 'Loading failed';
        }
        
        // 即使加载失败，也显示主要内容
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

const initialCameraOrbit = '45deg auto auto';
const initialExposure = 1;
let initialCameraTarget = null;

brightnessIcon.addEventListener('click', () => {
    const defaultValue = 1;

    modelViewer.exposure = defaultValue;

    brightnessSlider.value = defaultValue;

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

    if (navigator.vibrate) navigator.vibrate(10);
});

brightnessSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    modelViewer.exposure = value;
});

// 监听 hash 变化
window.addEventListener('hashchange', () => {
    loadModelFromHash();
});

