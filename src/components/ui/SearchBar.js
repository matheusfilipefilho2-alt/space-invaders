/**
 * UISearchBar - Reusable search bar component
 * Features: debounce (300ms), clear button, loading state, search icon
 */
class UISearchBar {
    constructor(options = {}) {
        this.placeholder = options.placeholder || 'Search...';
        this.onSearch = options.onSearch || (() => {});
        this.debounceTime = options.debounceTime || 300;
        this.loading = false;
        this.element = null;
        this.inputElement = null;
        this.clearButton = null;
        this.loadingIndicator = null;
        this.debounceTimer = null;
        this.currentValue = '';
    }

    render() {
        const container = document.createElement('div');
        container.className = 'ui-searchbar';

        // Search icon
        const searchIcon = document.createElement('span');
        searchIcon.className = 'ui-searchbar__icon ui-searchbar__icon--search';
        searchIcon.textContent = '🔍';

        // Input field
        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.className = 'ui-searchbar__input';
        this.inputElement.placeholder = this.placeholder;

        this.inputElement.addEventListener('input', (e) => {
            this.currentValue = e.target.value;
            this.updateClearButton();
            this.debouncedSearch();
        });

        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.triggerSearch();
            }
        });

        // Clear button
        this.clearButton = document.createElement('button');
        this.clearButton.className = 'ui-searchbar__clear';
        this.clearButton.textContent = '✕';
        this.clearButton.style.display = 'none';

        this.clearButton.addEventListener('click', () => {
            this.clear();
        });

        // Loading indicator
        this.loadingIndicator = document.createElement('span');
        this.loadingIndicator.className = 'ui-searchbar__loading spin';
        this.loadingIndicator.style.display = 'none';

        // Assemble container
        container.appendChild(searchIcon);
        container.appendChild(this.inputElement);
        container.appendChild(this.loadingIndicator);
        container.appendChild(this.clearButton);

        this.element = container;
        return container;
    }

    debouncedSearch() {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new timer
        this.debounceTimer = setTimeout(() => {
            this.triggerSearch();
        }, this.debounceTime);
    }

    triggerSearch() {
        if (!this.loading) {
            this.onSearch(this.currentValue);
        }
    }

    clear() {
        this.currentValue = '';
        if (this.inputElement) {
            this.inputElement.value = '';
        }
        this.updateClearButton();
        this.triggerSearch();
    }

    updateClearButton() {
        if (this.clearButton) {
            this.clearButton.style.display = this.currentValue ? 'block' : 'none';
        }
    }

    setLoading(loading) {
        this.loading = loading;

        if (!this.element) return;

        if (loading) {
            if (this.inputElement) {
                this.inputElement.disabled = true;
            }
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'inline-block';
            }
            if (this.clearButton) {
                this.clearButton.style.display = 'none';
            }
        } else {
            if (this.inputElement) {
                this.inputElement.disabled = false;
            }
            if (this.loadingIndicator) {
                this.loadingIndicator.style.display = 'none';
            }
            this.updateClearButton();
        }
    }

    getValue() {
        return this.currentValue;
    }

    setValue(value) {
        this.currentValue = value;
        if (this.inputElement) {
            this.inputElement.value = value;
        }
        this.updateClearButton();
    }

    focus() {
        if (this.inputElement) {
            this.inputElement.focus();
        }
    }
}

export default UISearchBar;
