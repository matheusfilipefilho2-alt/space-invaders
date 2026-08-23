/**
 * UIButton - Reusable button component
 * Variants: primary, secondary, danger, success
 * Sizes: sm, md, lg
 * States: normal, loading, disabled
 */
class UIButton {
    constructor(options = {}) {
        this.text = options.text || 'Button';
        this.variant = options.variant || 'primary'; // primary, secondary, danger, success
        this.size = options.size || 'md'; // sm, md, lg
        this.onClick = options.onClick || (() => {});
        this.disabled = options.disabled || false;
        this.loading = false;
        this.element = null;
    }

    render() {
        const button = document.createElement('button');
        button.className = `ui-button ui-button--${this.variant} ui-button--${this.size}`;
        button.textContent = this.text;

        if (this.disabled) {
            button.disabled = true;
            button.classList.add('ui-button--disabled');
        }

        button.addEventListener('click', (e) => {
            if (!this.loading && !this.disabled) {
                this.onClick(e);
            }
        });

        this.element = button;
        return button;
    }

    setLoading(loading) {
        this.loading = loading;

        if (!this.element) return;

        if (loading) {
            this.element.disabled = true;
            this.element.classList.add('ui-button--loading');
            this.element.innerHTML = '<span class="ui-button__spinner spin"></span> Processando...';
        } else {
            this.element.disabled = this.disabled;
            this.element.classList.remove('ui-button--loading');
            this.element.textContent = this.text;
        }
    }

    setDisabled(disabled) {
        this.disabled = disabled;
        if (this.element) {
            this.element.disabled = disabled;
            if (disabled) {
                this.element.classList.add('ui-button--disabled');
            } else {
                this.element.classList.remove('ui-button--disabled');
            }
        }
    }
}

export default UIButton;
