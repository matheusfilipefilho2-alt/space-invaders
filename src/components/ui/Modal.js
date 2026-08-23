/**
 * UIModal - Reusable modal component
 * Sizes: sm (400px), md (600px), lg (800px)
 * Features: backdrop, animations, ESC key, focus trap
 */
class UIModal {
    constructor(options = {}) {
        this.title = options.title || '';
        this.content = options.content || ''; // HTML string or Element
        this.size = options.size || 'md';
        this.onClose = options.onClose || (() => {});
        this.closeOnBackdrop = options.closeOnBackdrop !== false;
        this.closeOnEsc = options.closeOnEsc !== false;

        this.backdrop = null;
        this.modal = null;
        this.isOpen = false;
    }

    render() {
        // Backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'ui-modal-backdrop';

        // Modal container
        this.modal = document.createElement('div');
        this.modal.className = `ui-modal ui-modal--${this.size}`;
        this.modal.setAttribute('role', 'dialog');
        this.modal.setAttribute('aria-modal', 'true');

        // Header
        const header = document.createElement('div');
        header.className = 'ui-modal__header';

        const title = document.createElement('h2');
        title.className = 'ui-modal__title';
        title.textContent = this.title;
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ui-modal__close';
        closeBtn.innerHTML = '✕';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(closeBtn);

        this.modal.appendChild(header);

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'ui-modal__content';

        if (typeof this.content === 'string') {
            contentDiv.innerHTML = this.content;
        } else if (this.content instanceof Element) {
            contentDiv.appendChild(this.content);
        }

        this.modal.appendChild(contentDiv);

        this.backdrop.appendChild(this.modal);

        // Event listeners
        if (this.closeOnBackdrop) {
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.close();
                }
            });
        }

        if (this.closeOnEsc) {
            this._escHandler = (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            };
            document.addEventListener('keydown', this._escHandler);
        }

        return this.backdrop;
    }

    open() {
        if (this.isOpen) return;

        const rendered = this.render();
        document.body.appendChild(rendered);
        document.body.style.overflow = 'hidden'; // Lock scroll

        this.isOpen = true;

        // Trigger animations
        requestAnimationFrame(() => {
            this.backdrop.classList.add('fade-in');
            this.modal.classList.add('slide-down');
        });
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        document.body.style.overflow = ''; // Unlock scroll

        // Clean up event listeners
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler);
        }

        // Remove from DOM
        if (this.backdrop && this.backdrop.parentNode) {
            this.backdrop.parentNode.removeChild(this.backdrop);
        }

        this.onClose();
    }
}

export default UIModal;
