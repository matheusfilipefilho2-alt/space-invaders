import UISearchBar from '../ui/SearchBar.js';

/**
 * ItemFilters - Shop item filtering component
 * Features: search bar, rarity filter dropdown, sort dropdown
 * Consumes: UISearchBar (Task 7)
 * Produces: ItemFilters class with filter state management and callbacks
 */
class ItemFilters {
    constructor(options = {}) {
        this.rarities = options.rarities || {
            common: { name: 'Comum', color: '#9E9E9E' },
            uncommon: { name: 'Incomum', color: '#4CAF50' },
            rare: { name: 'Raro', color: '#2196F3' },
            epic: { name: 'Épico', color: '#9C27B0' },
            legendary: { name: 'Lendário', color: '#FF9800' }
        };

        // Filter state
        this.searchQuery = '';
        this.selectedRarity = 'all';
        this.selectedSort = 'price'; // price, name, rarity

        // Callbacks
        this.onFiltersChange = options.onFiltersChange || (() => {});

        // UI components
        this.searchBar = null;
        this.rarityDropdown = null;
        this.sortDropdown = null;
        this.element = null;
    }

    /**
     * Main render method - returns filter container element
     */
    render() {
        const container = document.createElement('div');
        container.className = 'item-filters';
        container.style.marginBottom = '24px';
        container.style.display = 'flex';
        container.style.gap = '12px';
        container.style.flexWrap = 'wrap';
        container.style.alignItems = 'center';

        // Create search bar
        const searchBarContainer = this._createSearchBar();
        container.appendChild(searchBarContainer);

        // Create rarity filter dropdown
        const rarityContainer = this._createRarityDropdown();
        container.appendChild(rarityContainer);

        // Create sort dropdown
        const sortContainer = this._createSortDropdown();
        container.appendChild(sortContainer);

        this.element = container;
        return container;
    }

    /**
     * Create search bar component
     */
    _createSearchBar() {
        const wrapper = document.createElement('div');
        wrapper.className = 'item-filters__search';
        wrapper.style.flex = '1';
        wrapper.style.minWidth = '250px';

        this.searchBar = new UISearchBar({
            placeholder: 'Pesquisar itens...',
            debounceTime: 300,
            onSearch: (query) => this._handleSearchChange(query)
        });

        const searchElement = this.searchBar.render();
        wrapper.appendChild(searchElement);
        return wrapper;
    }

    /**
     * Create rarity filter dropdown
     */
    _createRarityDropdown() {
        const wrapper = document.createElement('div');
        wrapper.className = 'item-filters__rarity';
        wrapper.style.flex = '0 1 auto';

        // Label
        const label = document.createElement('label');
        label.className = 'item-filters__label';
        label.textContent = 'Raridade:';
        label.style.marginRight = '8px';
        label.style.fontSize = '14px';
        label.style.fontWeight = '500';
        label.style.color = '#fff';

        // Dropdown
        this.rarityDropdown = document.createElement('select');
        this.rarityDropdown.className = 'item-filters__dropdown item-filters__rarity-dropdown';
        this.rarityDropdown.style.padding = '8px 12px';
        this.rarityDropdown.style.borderRadius = '6px';
        this.rarityDropdown.style.border = '1px solid #4ECDC4';
        this.rarityDropdown.style.backgroundColor = '#1a1a1a';
        this.rarityDropdown.style.color = '#fff';
        this.rarityDropdown.style.cursor = 'pointer';
        this.rarityDropdown.style.fontSize = '14px';
        this.rarityDropdown.style.fontFamily = 'Courier New, monospace';

        // Add "All rarities" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Todas as raridades';
        this.rarityDropdown.appendChild(allOption);

        // Add rarity options
        Object.entries(this.rarities).forEach(([key, rarity]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = rarity.name;
            this.rarityDropdown.appendChild(option);
        });

        this.rarityDropdown.addEventListener('change', (e) => this._handleRarityChange(e));

        wrapper.appendChild(label);
        wrapper.appendChild(this.rarityDropdown);
        return wrapper;
    }

    /**
     * Create sort dropdown
     */
    _createSortDropdown() {
        const wrapper = document.createElement('div');
        wrapper.className = 'item-filters__sort';
        wrapper.style.flex = '0 1 auto';

        // Label
        const label = document.createElement('label');
        label.className = 'item-filters__label';
        label.textContent = 'Ordenar:';
        label.style.marginRight = '8px';
        label.style.fontSize = '14px';
        label.style.fontWeight = '500';
        label.style.color = '#fff';

        // Dropdown
        this.sortDropdown = document.createElement('select');
        this.sortDropdown.className = 'item-filters__dropdown item-filters__sort-dropdown';
        this.sortDropdown.style.padding = '8px 12px';
        this.sortDropdown.style.borderRadius = '6px';
        this.sortDropdown.style.border = '1px solid #4ECDC4';
        this.sortDropdown.style.backgroundColor = '#1a1a1a';
        this.sortDropdown.style.color = '#fff';
        this.sortDropdown.style.cursor = 'pointer';
        this.sortDropdown.style.fontSize = '14px';
        this.sortDropdown.style.fontFamily = 'Courier New, monospace';

        // Add sort options
        const sortOptions = [
            { value: 'price', label: 'Preço (menor)' },
            { value: 'price_desc', label: 'Preço (maior)' },
            { value: 'name', label: 'Nome (A-Z)' },
            { value: 'name_desc', label: 'Nome (Z-A)' },
            { value: 'rarity', label: 'Raridade' }
        ];

        sortOptions.forEach(({ value, label: optionLabel }) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = optionLabel;
            if (value === 'price') {
                option.selected = true; // Set default
            }
            this.sortDropdown.appendChild(option);
        });

        this.sortDropdown.addEventListener('change', (e) => this._handleSortChange(e));

        wrapper.appendChild(label);
        wrapper.appendChild(this.sortDropdown);
        return wrapper;
    }

    /**
     * Handle search query changes
     */
    _handleSearchChange(query) {
        this.searchQuery = query.toLowerCase();
        this.onFiltersChange(this.getFilterState());
    }

    /**
     * Handle rarity filter changes
     */
    _handleRarityChange(event) {
        this.selectedRarity = event.target.value;
        this.onFiltersChange(this.getFilterState());
    }

    /**
     * Handle sort option changes
     */
    _handleSortChange(event) {
        this.selectedSort = event.target.value;
        this.onFiltersChange(this.getFilterState());
    }

    /**
     * Get current filter state
     */
    getFilterState() {
        return {
            searchQuery: this.searchQuery,
            selectedRarity: this.selectedRarity,
            selectedSort: this.selectedSort
        };
    }

    /**
     * Filter items based on current filter state
     */
    filterItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }

        let filtered = [...items];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter((item) =>
                item.name.toLowerCase().includes(this.searchQuery) ||
                item.description.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply rarity filter
        if (this.selectedRarity !== 'all') {
            filtered = filtered.filter((item) => item.rarity === this.selectedRarity);
        }

        // Apply sort
        filtered = this._sortItems(filtered, this.selectedSort);

        return filtered;
    }

    /**
     * Sort items based on sort option
     */
    _sortItems(items, sortOption) {
        const sorted = [...items];

        switch (sortOption) {
            case 'price':
                sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
                break;
            case 'price_desc':
                sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'name_desc':
                sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
                break;
            case 'rarity':
                // Sort by rarity level (common -> uncommon -> rare -> epic -> legendary)
                const rarityOrder = {
                    common: 0,
                    uncommon: 1,
                    rare: 2,
                    epic: 3,
                    legendary: 4
                };
                sorted.sort(
                    (a, b) =>
                        (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0)
                );
                break;
            default:
                // Default to price ascending
                sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
        }

        return sorted;
    }

    /**
     * Reset all filters to default
     */
    reset() {
        this.searchQuery = '';
        this.selectedRarity = 'all';
        this.selectedSort = 'price';

        // Update UI
        if (this.searchBar) {
            this.searchBar.setValue('');
        }
        if (this.rarityDropdown) {
            this.rarityDropdown.value = 'all';
        }
        if (this.sortDropdown) {
            this.sortDropdown.value = 'price';
        }

        this.onFiltersChange(this.getFilterState());
    }

    /**
     * Set filters programmatically
     */
    setFilters(filters) {
        if (filters.searchQuery !== undefined) {
            this.searchQuery = filters.searchQuery;
            if (this.searchBar) {
                this.searchBar.setValue(filters.searchQuery);
            }
        }

        if (filters.selectedRarity !== undefined) {
            this.selectedRarity = filters.selectedRarity;
            if (this.rarityDropdown) {
                this.rarityDropdown.value = filters.selectedRarity;
            }
        }

        if (filters.selectedSort !== undefined) {
            this.selectedSort = filters.selectedSort;
            if (this.sortDropdown) {
                this.sortDropdown.value = filters.selectedSort;
            }
        }

        this.onFiltersChange(this.getFilterState());
    }

    /**
     * Get the filter element
     */
    getElement() {
        return this.element;
    }

    /**
     * Update rarities configuration
     */
    setRarities(rarities) {
        this.rarities = rarities;
        // Note: For full update, component would need to be re-rendered
    }
}

export default ItemFilters;
