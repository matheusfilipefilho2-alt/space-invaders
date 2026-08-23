/**
 * UISkeleton - Loading placeholder component with shimmer animation
 * Shapes: text, circle, rectangle
 * Features: Multiple shape variants, customizable dimensions, shimmer animation
 */
class UISkeleton {
    constructor(options = {}) {
        this.shape = options.shape || 'text'; // text, circle, rectangle
        this.width = options.width || '100%';
        this.height = options.height || '20px';
        this.count = options.count || 1; // For multiple lines of text
        this.radius = options.radius || '4px';
        this.className = options.className || '';
        this.element = null;
    }

    render() {
        const container = document.createElement('div');
        container.className = `ui-skeleton-container ${this.className}`;

        if (this.shape === 'text') {
            container.appendChild(this._renderTextSkeleton());
        } else if (this.shape === 'circle') {
            container.appendChild(this._renderCircleSkeleton());
        } else if (this.shape === 'rectangle') {
            container.appendChild(this._renderRectangleSkeleton());
        }

        this.element = container;
        return container;
    }

    _renderTextSkeleton() {
        const wrapper = document.createElement('div');
        wrapper.className = 'ui-skeleton-text-wrapper';

        for (let i = 0; i < this.count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'ui-skeleton ui-skeleton--text skeleton';

            // Last line can be shorter
            if (i === this.count - 1 && this.count > 1) {
                skeleton.style.width = '70%';
            } else {
                skeleton.style.width = this.width;
            }

            skeleton.style.height = this.height;
            skeleton.style.borderRadius = this.radius;

            if (i < this.count - 1) {
                skeleton.style.marginBottom = '8px';
            }

            wrapper.appendChild(skeleton);
        }

        return wrapper;
    }

    _renderCircleSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'ui-skeleton ui-skeleton--circle skeleton';

        const size = this.width === '100%' ? this.height : this.width;
        skeleton.style.width = size;
        skeleton.style.height = size;
        skeleton.style.borderRadius = '50%';

        return skeleton;
    }

    _renderRectangleSkeleton() {
        const skeleton = document.createElement('div');
        skeleton.className = 'ui-skeleton ui-skeleton--rectangle skeleton';

        skeleton.style.width = this.width;
        skeleton.style.height = this.height;
        skeleton.style.borderRadius = this.radius;

        return skeleton;
    }

    /**
     * Update the skeleton dimensions
     */
    setDimensions(width, height) {
        this.width = width;
        this.height = height;

        if (this.element) {
            const skeletons = this.element.querySelectorAll('.ui-skeleton');
            skeletons.forEach((skeleton, index) => {
                if (index === skeletons.length - 1 && this.count > 1) {
                    skeleton.style.width = '70%';
                } else {
                    skeleton.style.width = width;
                }
                skeleton.style.height = height;
            });
        }
    }

    /**
     * Replace skeleton with actual content
     */
    replace(content) {
        if (!this.element) return;

        if (typeof content === 'string') {
            this.element.textContent = content;
        } else if (content instanceof HTMLElement) {
            while (this.element.firstChild) {
                this.element.removeChild(this.element.firstChild);
            }
            this.element.appendChild(content);
        }

        // Remove skeleton class for fade-out effect
        this.element.classList.remove('skeleton');
    }

    /**
     * Remove the skeleton element from DOM
     */
    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

export default UISkeleton;
