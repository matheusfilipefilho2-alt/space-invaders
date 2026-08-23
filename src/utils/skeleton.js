/**
 * Skeleton Utilities - Helper functions for common skeleton patterns
 * Creates pre-built skeleton loaders for common UI components
 */

// Handle both CommonJS and ES modules
let UISkeleton;
try {
    const skeletonModule = require('../components/ui/Skeleton.js');
    UISkeleton = skeletonModule.default || skeletonModule;
} catch (e) {
    // If require fails, try ES import (this won't work in Node but might be used in browser)
    UISkeleton = null;
}

/**
 * Create a card skeleton (image + title + description)
 */
export function createCardSkeleton(options = {}) {
    const {
        imageHeight = '200px',
        hasImage = true,
        hasTitle = true,
        hasDescription = true,
        className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-card ${className}`;

    // Image skeleton
    if (hasImage) {
        const imageSkeleton = new UISkeleton({
            shape: 'rectangle',
            width: '100%',
            height: imageHeight,
            radius: '6px'
        });
        container.appendChild(imageSkeleton.render());
    }

    // Content wrapper
    const content = document.createElement('div');
    content.style.padding = '16px';

    // Title skeleton
    if (hasTitle) {
        const titleSkeleton = new UISkeleton({
            shape: 'text',
            width: '80%',
            height: '20px',
            count: 1,
            radius: '4px'
        });
        content.appendChild(titleSkeleton.render());
    }

    // Description skeleton
    if (hasDescription) {
        const descSkeleton = new UISkeleton({
            shape: 'text',
            width: '100%',
            height: '14px',
            count: 2,
            radius: '4px'
        });
        if (hasTitle) {
            descSkeleton.render().style.marginTop = '12px';
        }
        content.appendChild(descSkeleton.render());
    }

    container.appendChild(content);
    return container;
}

/**
 * Create a list skeleton (multiple items)
 */
export function createListSkeleton(options = {}) {
    const {
        itemCount = 5,
        hasAvatar = true,
        hasTitle = true,
        hasDescription = true,
        className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-list ${className}`;

    for (let i = 0; i < itemCount; i++) {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '12px';
        item.style.marginBottom = '16px';
        item.style.padding = '12px';
        item.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
        item.style.borderRadius = '8px';

        // Avatar skeleton
        if (hasAvatar) {
            const avatarSkeleton = new UISkeleton({
                shape: 'circle',
                width: '48px',
                height: '48px'
            });
            item.appendChild(avatarSkeleton.render());
        }

        // Content wrapper
        const content = document.createElement('div');
        content.style.flex = '1';

        // Title skeleton
        if (hasTitle) {
            const titleSkeleton = new UISkeleton({
                shape: 'text',
                width: '60%',
                height: '16px',
                count: 1,
                radius: '4px'
            });
            content.appendChild(titleSkeleton.render());
        }

        // Description skeleton
        if (hasDescription) {
            const descSkeleton = new UISkeleton({
                shape: 'text',
                width: '80%',
                height: '12px',
                count: 1,
                radius: '4px'
            });
            if (hasTitle) {
                descSkeleton.render().style.marginTop = '8px';
            }
            content.appendChild(descSkeleton.render());
        }

        item.appendChild(content);
        container.appendChild(item);
    }

    return container;
}

/**
 * Create a grid skeleton (multiple cards)
 */
export function createGridSkeleton(options = {}) {
    const {
        columns = 3,
        itemCount = 6,
        hasImage = true,
        imageHeight = '180px',
        className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-grid ${className}`;
    container.style.display = 'grid';
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    container.style.gap = '16px';

    for (let i = 0; i < itemCount; i++) {
        const card = createCardSkeleton({
            imageHeight,
            hasImage,
            hasTitle: true,
            hasDescription: true,
            className: 'skeleton-grid-item'
        });
        container.appendChild(card);
    }

    return container;
}

/**
 * Create a header skeleton (profile-like)
 */
export function createHeaderSkeleton(options = {}) {
    const {
        hasAvatar = true,
        hasTitle = true,
        hasSubtitle = true,
        className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-header ${className}`;
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '16px';
    container.style.padding = '20px';

    // Avatar skeleton
    if (hasAvatar) {
        const avatarSkeleton = new UISkeleton({
            shape: 'circle',
            width: '80px',
            height: '80px'
        });
        container.appendChild(avatarSkeleton.render());
    }

    // Content wrapper
    const content = document.createElement('div');
    content.style.flex = '1';

    // Title skeleton
    if (hasTitle) {
        const titleSkeleton = new UISkeleton({
            shape: 'text',
            width: '50%',
            height: '24px',
            count: 1,
            radius: '4px'
        });
        content.appendChild(titleSkeleton.render());
    }

    // Subtitle skeleton
    if (hasSubtitle) {
        const subtitleSkeleton = new UISkeleton({
            shape: 'text',
            width: '40%',
            height: '16px',
            count: 1,
            radius: '4px'
        });
        if (hasTitle) {
            subtitleSkeleton.render().style.marginTop = '8px';
        }
        content.appendChild(subtitleSkeleton.render());
    }

    container.appendChild(content);
    return container;
}

/**
 * Create a table row skeleton
 */
export function createTableRowSkeleton(options = {}) {
    const {
        columnCount = 4,
        className = ''
    } = options;

    const row = document.createElement('div');
    row.className = `skeleton-table-row ${className}`;
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.padding = '12px';
    row.style.marginBottom = '8px';
    row.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
    row.style.borderRadius = '6px';

    for (let i = 0; i < columnCount; i++) {
        const cell = new UISkeleton({
            shape: 'text',
            width: '100%',
            height: '16px',
            count: 1,
            radius: '4px'
        });
        const cellElement = cell.render();
        cellElement.style.flex = '1';
        row.appendChild(cellElement);
    }

    return row;
}

/**
 * Create a table skeleton
 */
export function createTableSkeleton(options = {}) {
    const {
        rowCount = 5,
        columnCount = 4,
        className = ''
    } = options;

    const container = document.createElement('div');
    container.className = `skeleton-table ${className}`;

    for (let i = 0; i < rowCount; i++) {
        const row = createTableRowSkeleton({ columnCount });
        container.appendChild(row);
    }

    return container;
}

/**
 * Utility to replace skeleton with content
 */
export function replaceSkeleton(skeletonElement, content) {
    if (!skeletonElement) return;

    // Fade out skeleton
    skeletonElement.style.opacity = '0';
    skeletonElement.style.transition = 'opacity 300ms ease-out';

    setTimeout(() => {
        if (skeletonElement.parentNode) {
            if (typeof content === 'string') {
                skeletonElement.parentNode.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                skeletonElement.parentNode.replaceChild(content, skeletonElement);
            }
        }
    }, 300);
}

/**
 * Remove skeleton element
 */
export function removeSkeleton(skeletonElement) {
    if (!skeletonElement) return;

    skeletonElement.style.opacity = '0';
    skeletonElement.style.transition = 'opacity 300ms ease-out';

    setTimeout(() => {
        if (skeletonElement.parentNode) {
            skeletonElement.parentNode.removeChild(skeletonElement);
        }
    }, 300);
}

// Support CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createCardSkeleton,
        createListSkeleton,
        createGridSkeleton,
        createHeaderSkeleton,
        createTableRowSkeleton,
        createTableSkeleton,
        replaceSkeleton,
        removeSkeleton
    };
}
