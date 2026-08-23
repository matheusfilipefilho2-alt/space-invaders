/**
 * Toast - Notification component with progress bar and actions
 * Types: success, error, warning, info
 * Features: auto-dismiss, progress bar, close button, action button
 */
class Toast {
    constructor(options = {}) {
        this.type = options.type || 'info'; // success, error, warning, info
        this.message = options.message || 'Notification';
        this.duration = options.duration || 3000; // 0 for no auto-dismiss
        this.persistent = options.persistent || false;
        this.action = options.action || null; // { text, onClick }

        this.element = null;
        this.progressElement = null;
        this.timeoutId = null;
        this.animatingOut = false;
    }

    render() {
        const toast = document.createElement('div');
        toast.className = `toast toast--${this.type}`;

        const content = document.createElement('div');
        content.className = 'toast__content';

        // Icon based on type
        const icon = document.createElement('span');
        icon.className = 'toast__icon';
        icon.textContent = this._getIcon();

        // Message
        const message = document.createElement('div');
        message.className = 'toast__message';
        message.textContent = this.message;

        content.appendChild(icon);
        content.appendChild(message);

        // Actions container
        const actions = document.createElement('div');
        actions.className = 'toast__actions';

        // Action button (optional)
        if (this.action) {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'toast__action-btn';
            actionBtn.textContent = this.action.text || 'Action';
            actionBtn.addEventListener('click', () => {
                if (this.action.onClick) {
                    this.action.onClick();
                }
                this.remove();
            });
            actions.appendChild(actionBtn);
        }

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast__close';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.addEventListener('click', () => {
            this.remove();
        });
        actions.appendChild(closeBtn);

        toast.appendChild(content);
        toast.appendChild(actions);

        // Progress bar (only if not persistent and has duration)
        if (!this.persistent && this.duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'toast__progress';
            const progress = document.createElement('div');
            progress.className = 'toast__progress-fill';
            progressBar.appendChild(progress);
            toast.appendChild(progressBar);
            this.progressElement = progress;
        }

        this.element = toast;
        return toast;
    }

    show() {
        if (!this.element) return;

        // Trigger animation
        this.element.classList.add('slide-in-right');

        // Set up auto-dismiss
        if (!this.persistent && this.duration > 0) {
            this._startProgress();
            this.timeoutId = setTimeout(() => {
                this.remove();
            }, this.duration);
        }
    }

    _startProgress() {
        if (!this.progressElement || this.persistent) return;

        this.progressElement.style.animation = `progressFill ${this.duration}ms linear forwards`;
    }

    remove() {
        if (!this.element || this.animatingOut) return;

        this.animatingOut = true;

        // Clear timeout if still running
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        // Trigger exit animation
        this.element.classList.remove('slide-in-right');
        this.element.classList.add('fade-out');

        // Remove from DOM after animation
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300); // Match fadeOut animation duration
    }

    _getIcon() {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[this.type] || icons.info;
    }
}

export default Toast;
