/**
 * UITabs - Reusable tabs component
 * Features: keyboard navigation (Arrow keys), animated underline, content fade transitions
 */
class UITabs {
    constructor(options = {}) {
        this.tabs = options.tabs || []; // Array of { label, content }
        this.activeIndex = options.activeIndex || 0;
        this.onChange = options.onChange || (() => {});
        this.element = null;
        this.tabButtons = [];
        this.contentPanes = [];
        this.underline = null;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'ui-tabs';

        // Tabs header
        const header = document.createElement('div');
        header.className = 'ui-tabs__header';
        header.setAttribute('role', 'tablist');

        // Create tab buttons
        this.tabs.forEach((tab, index) => {
            const button = document.createElement('button');
            button.className = 'ui-tabs__button';
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', index === this.activeIndex ? 'true' : 'false');
            button.setAttribute('aria-controls', `tab-panel-${index}`);
            button.textContent = tab.label;

            if (index === this.activeIndex) {
                button.classList.add('ui-tabs__button--active');
            }

            button.addEventListener('click', () => this.setActive(index));
            button.addEventListener('keydown', (e) => this._handleKeydown(e, index));

            this.tabButtons.push(button);
            header.appendChild(button);
        });

        // Animated underline
        this.underline = document.createElement('div');
        this.underline.className = 'ui-tabs__underline';
        header.appendChild(this.underline);

        container.appendChild(header);

        // Content panes
        const content = document.createElement('div');
        content.className = 'ui-tabs__content';

        this.tabs.forEach((tab, index) => {
            const pane = document.createElement('div');
            pane.className = 'ui-tabs__pane';
            pane.setAttribute('role', 'tabpanel');
            pane.setAttribute('id', `tab-panel-${index}`);
            pane.setAttribute('aria-labelledby', `tab-button-${index}`);

            if (index === this.activeIndex) {
                pane.classList.add('ui-tabs__pane--active');
            } else {
                pane.style.display = 'none';
            }

            if (typeof tab.content === 'string') {
                pane.innerHTML = tab.content;
            } else if (tab.content instanceof Element) {
                pane.appendChild(tab.content);
            }

            this.contentPanes.push(pane);
            content.appendChild(pane);
        });

        container.appendChild(content);

        this.element = container;

        // Update underline position on render
        requestAnimationFrame(() => this._updateUnderline());

        return container;
    }

    setActive(index) {
        if (index < 0 || index >= this.tabs.length || index === this.activeIndex) {
            return;
        }

        // Update active button
        this.tabButtons.forEach((btn, i) => {
            if (i === index) {
                btn.classList.add('ui-tabs__button--active');
                btn.setAttribute('aria-selected', 'true');
                btn.focus();
            } else {
                btn.classList.remove('ui-tabs__button--active');
                btn.setAttribute('aria-selected', 'false');
            }
        });

        // Update active pane with fade transition
        this.contentPanes.forEach((pane, i) => {
            if (i === index) {
                pane.style.display = 'block';
                pane.classList.add('ui-tabs__pane--active');
                pane.classList.add('fade-in');
            } else {
                pane.classList.remove('ui-tabs__pane--active');
                pane.classList.remove('fade-in');
                pane.style.display = 'none';
            }
        });

        this.activeIndex = index;
        this._updateUnderline();
        this.onChange(index);
    }

    _handleKeydown(event, currentIndex) {
        let newIndex = currentIndex;

        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                newIndex = currentIndex === 0 ? this.tabs.length - 1 : currentIndex - 1;
                this.setActive(newIndex);
                break;

            case 'ArrowRight':
                event.preventDefault();
                newIndex = currentIndex === this.tabs.length - 1 ? 0 : currentIndex + 1;
                this.setActive(newIndex);
                break;

            case 'Home':
                event.preventDefault();
                this.setActive(0);
                break;

            case 'End':
                event.preventDefault();
                this.setActive(this.tabs.length - 1);
                break;

            default:
                break;
        }
    }

    _updateUnderline() {
        if (!this.underline || !this.tabButtons[this.activeIndex]) {
            return;
        }

        const activeButton = this.tabButtons[this.activeIndex];
        const header = this.underline.parentElement;

        if (header) {
            this.underline.style.width = `${activeButton.offsetWidth}px`;
            this.underline.style.left = `${activeButton.offsetLeft}px`;
        }
    }

    // Public method to programmatically change tabs
    getActiveIndex() {
        return this.activeIndex;
    }

    // Update tabs dynamically
    setTabs(tabs) {
        this.tabs = tabs;
        this.activeIndex = 0;
        if (this.element && this.element.parentNode) {
            const parent = this.element.parentNode;
            const newElement = this.render();
            parent.replaceChild(newElement, this.element);
        }
    }
}

export default UITabs;
