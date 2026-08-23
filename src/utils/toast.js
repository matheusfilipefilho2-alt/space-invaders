/**
 * Toast Manager - Global singleton for toast notifications
 */
import Toast from '../components/ui/Toast.js';

class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.maxToasts = 3;
    }

    _getContainer() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
        return this.container;
    }

    _show(type, message, options = {}) {
        const toast = new Toast({
            type,
            message,
            duration: options.duration || 3000,
            persistent: options.persistent || false,
            action: options.action || null
        });

        const container = this._getContainer();
        const element = toast.render();
        container.appendChild(element);

        this.toasts.push(toast);

        // Remove oldest if exceeds max
        if (this.toasts.length > this.maxToasts) {
            const oldest = this.toasts.shift();
            oldest.remove();
        }

        toast.show();

        return toast;
    }

    success(message, options) {
        return this._show('success', message, options);
    }

    error(message, options) {
        return this._show('error', message, options);
    }

    warning(message, options) {
        return this._show('warning', message, options);
    }

    info(message, options) {
        return this._show('info', message, options);
    }
}

// Export singleton
const toast = new ToastManager();
export default toast;
