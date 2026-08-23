/**
 * Modal Component Tests
 */

import UIModal from '../components/ui/Modal.js';

describe('UIModal Component', () => {
    let modal;
    let container;

    beforeEach(() => {
        // Create a container for testing
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Clean up
        if (modal && modal.isOpen) {
            modal.close();
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    // Test 1: Modal initialization
    test('Modal should initialize with correct properties', () => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content',
            size: 'md'
        });

        expect(modal.title).toBe('Test Modal');
        expect(modal.content).toBe('Test content');
        expect(modal.size).toBe('md');
        expect(modal.isOpen).toBe(false);
    });

    // Test 2: Modal open
    test('Modal should open and add to DOM', () => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content'
        });

        modal.open();
        expect(modal.isOpen).toBe(true);
        expect(document.querySelector('.ui-modal-backdrop')).toBeTruthy();
        expect(document.body.style.overflow).toBe('hidden');
    });

    // Test 3: Modal close
    test('Modal should close and remove from DOM', (done) => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content'
        });

        modal.open();
        expect(modal.isOpen).toBe(true);

        modal.close();
        expect(modal.isOpen).toBe(false);

        // Use setTimeout to ensure DOM update
        setTimeout(() => {
            expect(document.querySelector('.ui-modal-backdrop')).toBeFalsy();
            expect(document.body.style.overflow).toBe('');
            done();
        }, 100);
    });

    // Test 4: Modal size variants
    test('Modal should support different sizes', () => {
        const sizes = ['sm', 'md', 'lg'];

        sizes.forEach((size) => {
            const testModal = new UIModal({
                title: 'Test',
                content: 'Content',
                size: size
            });

            testModal.open();
            const modalElement = document.querySelector('.ui-modal');
            expect(modalElement.classList.contains(`ui-modal--${size}`)).toBe(true);
            testModal.close();
        });
    });

    // Test 5: ESC key closes modal
    test('Modal should close on ESC key', (done) => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content',
            closeOnEsc: true
        });

        modal.open();
        expect(modal.isOpen).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        setTimeout(() => {
            expect(modal.isOpen).toBe(false);
            done();
        }, 100);
    });

    // Test 6: Backdrop click closes modal
    test('Modal should close on backdrop click', (done) => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content',
            closeOnBackdrop: true
        });

        modal.open();
        expect(modal.isOpen).toBe(true);

        const backdrop = document.querySelector('.ui-modal-backdrop');
        backdrop.click();

        setTimeout(() => {
            expect(modal.isOpen).toBe(false);
            done();
        }, 100);
    });

    // Test 7: Close button works
    test('Close button should close modal', (done) => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content'
        });

        modal.open();
        expect(modal.isOpen).toBe(true);

        const closeBtn = document.querySelector('.ui-modal__close');
        closeBtn.click();

        setTimeout(() => {
            expect(modal.isOpen).toBe(false);
            done();
        }, 100);
    });

    // Test 8: HTML content rendering
    test('Modal should render HTML content as string', () => {
        const htmlContent = '<p>Test <strong>HTML</strong> content</p>';
        modal = new UIModal({
            title: 'Test Modal',
            content: htmlContent
        });

        modal.open();
        const contentDiv = document.querySelector('.ui-modal__content');
        expect(contentDiv.innerHTML).toContain('<strong>HTML</strong>');
        modal.close();
    });

    // Test 9: Element content rendering
    test('Modal should render DOM Element content', () => {
        const contentElement = document.createElement('p');
        contentElement.textContent = 'Element content';

        modal = new UIModal({
            title: 'Test Modal',
            content: contentElement
        });

        modal.open();
        const contentDiv = document.querySelector('.ui-modal__content');
        expect(contentDiv.textContent).toContain('Element content');
        modal.close();
    });

    // Test 10: onClose callback
    test('Modal should call onClose callback', (done) => {
        const onCloseMock = jest.fn();
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content',
            onClose: onCloseMock
        });

        modal.open();
        modal.close();

        setTimeout(() => {
            expect(onCloseMock).toHaveBeenCalled();
            done();
        }, 100);
    });

    // Test 11: Modal cannot be opened twice
    test('Modal cannot be opened twice', () => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content'
        });

        modal.open();
        const firstBackdrop = document.querySelector('.ui-modal-backdrop');

        modal.open(); // Try to open again
        const backdrops = document.querySelectorAll('.ui-modal-backdrop');

        expect(backdrops.length).toBe(1);
        expect(firstBackdrop).toBe(document.querySelector('.ui-modal-backdrop'));

        modal.close();
    });

    // Test 12: Modal cannot be closed twice
    test('Modal cannot be closed twice', () => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content'
        });

        const onCloseMock = jest.fn();
        modal.onClose = onCloseMock;

        modal.open();
        modal.close();
        modal.close(); // Try to close again

        expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    // Test 13: Backdrop does not close when closeOnBackdrop is false
    test('Modal should not close on backdrop click when disabled', (done) => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content',
            closeOnBackdrop: false
        });

        modal.open();
        expect(modal.isOpen).toBe(true);

        const backdrop = document.querySelector('.ui-modal-backdrop');
        backdrop.click();

        setTimeout(() => {
            expect(modal.isOpen).toBe(true);
            modal.close();
            done();
        }, 100);
    });

    // Test 14: ESC does not close when closeOnEsc is false
    test('Modal should not close on ESC when disabled', (done) => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content',
            closeOnEsc: false
        });

        modal.open();
        expect(modal.isOpen).toBe(true);

        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);

        setTimeout(() => {
            expect(modal.isOpen).toBe(true);
            modal.close();
            done();
        }, 100);
    });

    // Test 15: Modal accessibility attributes
    test('Modal should have correct accessibility attributes', () => {
        modal = new UIModal({
            title: 'Test Modal',
            content: 'Test content'
        });

        modal.open();
        const modalElement = document.querySelector('.ui-modal');
        const closeBtn = document.querySelector('.ui-modal__close');

        expect(modalElement.getAttribute('role')).toBe('dialog');
        expect(modalElement.getAttribute('aria-modal')).toBe('true');
        expect(closeBtn.getAttribute('aria-label')).toBe('Close modal');

        modal.close();
    });
});
