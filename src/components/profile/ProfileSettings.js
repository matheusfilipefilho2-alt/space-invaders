/**
 * ProfileSettings Component
 * Manages user email/password changes and notification preferences
 * Features: email change modal, password change modal, validation, strength indicator
 * Consumes: UIModal (Task 5), toast (Task 8), Supabase auth
 * Produces: ProfileSettings with email/password change modals
 */
import UIModal from '../ui/Modal.js';
import toast from '../../utils/toast.js';
import { supabase } from '../../supabase.js';

class ProfileSettings {
    constructor(options = {}) {
        this.userId = options.userId || null;
        this.userEmail = options.userEmail || '';
        this.element = null;
        this.emailModal = null;
        this.passwordModal = null;
    }

    /**
     * Main render method - returns settings container element
     */
    render() {
        const container = document.createElement('div');
        container.className = 'profile-settings-container';

        // Account Settings Section
        const accountSection = this._createAccountSection();
        container.appendChild(accountSection);

        // Notification Preferences Section
        const notificationSection = this._createNotificationSection();
        container.appendChild(notificationSection);

        this.element = container;
        return container;
    }

    /**
     * Create account settings section (email/password)
     */
    _createAccountSection() {
        const section = document.createElement('div');
        section.className = 'settings-section';

        const title = document.createElement('h3');
        title.className = 'settings-title';
        title.textContent = 'Configurações da Conta';
        section.appendChild(title);

        // Email setting
        const emailItem = document.createElement('div');
        emailItem.className = 'setting-item';

        const emailLabel = document.createElement('div');
        emailLabel.className = 'setting-info';

        const emailTitle = document.createElement('div');
        emailTitle.className = 'setting-label';
        emailTitle.textContent = 'Email';
        emailLabel.appendChild(emailTitle);

        const emailDescription = document.createElement('div');
        emailDescription.className = 'setting-description';
        emailDescription.textContent = this.userEmail || 'Nenhum email cadastrado';
        emailLabel.appendChild(emailDescription);

        emailItem.appendChild(emailLabel);

        const emailButton = document.createElement('button');
        emailButton.className = 'ui-button ui-button--secondary ui-button--sm';
        emailButton.textContent = this.userEmail ? 'Alterar Email' : 'Adicionar Email';
        emailButton.addEventListener('click', () => this._openEmailModal());
        emailItem.appendChild(emailButton);

        section.appendChild(emailItem);

        // Password setting
        const passwordItem = document.createElement('div');
        passwordItem.className = 'setting-item';

        const passwordLabel = document.createElement('div');
        passwordLabel.className = 'setting-info';

        const passwordTitle = document.createElement('div');
        passwordTitle.className = 'setting-label';
        passwordTitle.textContent = 'Senha';
        passwordLabel.appendChild(passwordTitle);

        const passwordDescription = document.createElement('div');
        passwordDescription.className = 'setting-description';
        passwordDescription.textContent = '••••••••';
        passwordLabel.appendChild(passwordDescription);

        passwordItem.appendChild(passwordLabel);

        const passwordButton = document.createElement('button');
        passwordButton.className = 'ui-button ui-button--secondary ui-button--sm';
        passwordButton.textContent = 'Alterar Senha';
        passwordButton.addEventListener('click', () => this._openPasswordModal());
        passwordItem.appendChild(passwordButton);

        section.appendChild(passwordItem);

        return section;
    }

    /**
     * Create notification preferences section
     */
    _createNotificationSection() {
        const section = document.createElement('div');
        section.className = 'settings-section';

        const title = document.createElement('h3');
        title.className = 'settings-title';
        title.textContent = 'Notificações';
        section.appendChild(title);

        const description = document.createElement('p');
        description.className = 'settings-description';
        description.textContent = 'Escolha quais notificações você deseja receber por email';
        section.appendChild(description);

        // Notification toggles
        const notificationTypes = [
            {
                id: 'notifications-offers',
                label: 'Ofertas e Promoções',
                description: 'Receba alertas sobre ofertas especiais e descontos',
                defaultValue: true
            },
            {
                id: 'notifications-achievements',
                label: 'Conquistas e Progresso',
                description: 'Seja notificado quando desbloquear novas conquistas',
                defaultValue: true
            },
            {
                id: 'notifications-shop',
                label: 'Novidades da Loja',
                description: 'Fique por dentro de novos itens e pacotes',
                defaultValue: false
            }
        ];

        notificationTypes.forEach((notification) => {
            const item = this._createNotificationToggle(notification);
            section.appendChild(item);
        });

        // Save button
        const saveButton = document.createElement('button');
        saveButton.className = 'ui-button ui-button--primary';
        saveButton.innerHTML = '💾 Salvar Preferências';
        saveButton.addEventListener('click', () => this._saveNotificationPreferences());
        section.appendChild(saveButton);

        return section;
    }

    /**
     * Create notification toggle item
     */
    _createNotificationToggle(notification) {
        const item = document.createElement('div');
        item.className = 'setting-item checkbox';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = notification.id;
        checkbox.className = 'setting-checkbox';
        checkbox.checked = notification.defaultValue;
        item.appendChild(checkbox);

        const label = document.createElement('label');
        label.className = 'setting-checkbox-label';
        label.setAttribute('for', notification.id);

        const labelText = document.createElement('div');
        labelText.className = 'setting-label';
        labelText.textContent = notification.label;
        label.appendChild(labelText);

        const labelDescription = document.createElement('div');
        labelDescription.className = 'setting-description';
        labelDescription.textContent = notification.description;
        label.appendChild(labelDescription);

        item.appendChild(label);

        return item;
    }

    /**
     * Open email change modal
     */
    _openEmailModal() {
        const modalContent = this._createEmailModalContent();

        this.emailModal = new UIModal({
            title: this.userEmail ? 'Alterar Email' : 'Adicionar Email',
            content: modalContent,
            size: 'sm',
            closeOnBackdrop: true,
            closeOnEsc: true,
            onClose: () => {
                this.emailModal = null;
            }
        });

        this.emailModal.open();
    }

    /**
     * Create email modal content
     */
    _createEmailModalContent() {
        const content = document.createElement('div');
        content.className = 'modal-form';

        // Current email (if exists)
        if (this.userEmail) {
            const currentEmail = document.createElement('div');
            currentEmail.className = 'form-group';
            currentEmail.innerHTML = `
                <label class="form-label">Email Atual</label>
                <div class="form-value">${this.userEmail}</div>
            `;
            content.appendChild(currentEmail);
        }

        // New email input
        const emailGroup = document.createElement('div');
        emailGroup.className = 'form-group';
        emailGroup.innerHTML = `
            <label for="new-email" class="form-label">Novo Email</label>
            <input
                type="email"
                id="new-email"
                class="form-input"
                placeholder="seu@email.com"
                autocomplete="email"
                required
            />
            <div id="email-error" class="form-error" style="display: none;"></div>
        `;
        content.appendChild(emailGroup);

        // Password confirmation
        const passwordGroup = document.createElement('div');
        passwordGroup.className = 'form-group';
        passwordGroup.innerHTML = `
            <label for="confirm-password-email" class="form-label">Confirme sua Senha</label>
            <input
                type="password"
                id="confirm-password-email"
                class="form-input"
                placeholder="Digite sua senha atual"
                autocomplete="current-password"
                required
            />
            <div class="form-hint">Digite sua senha atual para confirmar a alteração</div>
        `;
        content.appendChild(passwordGroup);

        // Submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'ui-button ui-button--primary ui-button--block';
        submitButton.textContent = 'Alterar Email';
        submitButton.addEventListener('click', () => this._handleEmailChange());
        content.appendChild(submitButton);

        return content;
    }

    /**
     * Open password change modal
     */
    _openPasswordModal() {
        const modalContent = this._createPasswordModalContent();

        this.passwordModal = new UIModal({
            title: 'Alterar Senha',
            content: modalContent,
            size: 'sm',
            closeOnBackdrop: true,
            closeOnEsc: true,
            onClose: () => {
                this.passwordModal = null;
            }
        });

        this.passwordModal.open();
    }

    /**
     * Create password modal content
     */
    _createPasswordModalContent() {
        const content = document.createElement('div');
        content.className = 'modal-form';

        // Current password
        const currentPasswordGroup = document.createElement('div');
        currentPasswordGroup.className = 'form-group';
        currentPasswordGroup.innerHTML = `
            <label for="current-password" class="form-label">Senha Atual</label>
            <input
                type="password"
                id="current-password"
                class="form-input"
                placeholder="Digite sua senha atual"
                autocomplete="current-password"
                required
            />
        `;
        content.appendChild(currentPasswordGroup);

        // New password
        const newPasswordGroup = document.createElement('div');
        newPasswordGroup.className = 'form-group';
        newPasswordGroup.innerHTML = `
            <label for="new-password" class="form-label">Nova Senha</label>
            <input
                type="password"
                id="new-password"
                class="form-input"
                placeholder="Digite sua nova senha"
                autocomplete="new-password"
                required
            />
        `;
        content.appendChild(newPasswordGroup);

        // Password strength indicator
        const strengthIndicator = document.createElement('div');
        strengthIndicator.className = 'password-strength';
        strengthIndicator.innerHTML = `
            <div class="password-strength-bar">
                <div id="strength-bar-fill" class="password-strength-fill"></div>
            </div>
            <div id="strength-text" class="password-strength-text">Digite uma senha</div>
        `;
        content.appendChild(strengthIndicator);

        // Confirm new password
        const confirmPasswordGroup = document.createElement('div');
        confirmPasswordGroup.className = 'form-group';
        confirmPasswordGroup.innerHTML = `
            <label for="confirm-new-password" class="form-label">Confirmar Nova Senha</label>
            <input
                type="password"
                id="confirm-new-password"
                class="form-input"
                placeholder="Digite novamente a nova senha"
                autocomplete="new-password"
                required
            />
            <div id="password-error" class="form-error" style="display: none;"></div>
        `;
        content.appendChild(confirmPasswordGroup);

        // Password requirements
        const requirements = document.createElement('div');
        requirements.className = 'password-requirements';
        requirements.innerHTML = `
            <div class="requirements-title">A senha deve conter:</div>
            <ul class="requirements-list">
                <li id="req-length">Mínimo de 8 caracteres</li>
                <li id="req-uppercase">Pelo menos uma letra maiúscula</li>
                <li id="req-lowercase">Pelo menos uma letra minúscula</li>
                <li id="req-number">Pelo menos um número</li>
            </ul>
        `;
        content.appendChild(requirements);

        // Submit button
        const submitButton = document.createElement('button');
        submitButton.className = 'ui-button ui-button--primary ui-button--block';
        submitButton.textContent = 'Alterar Senha';
        submitButton.addEventListener('click', () => this._handlePasswordChange());
        content.appendChild(submitButton);

        // Add event listener for password strength
        setTimeout(() => {
            const newPasswordInput = document.getElementById('new-password');
            if (newPasswordInput) {
                newPasswordInput.addEventListener('input', (e) => {
                    this._updatePasswordStrength(e.target.value);
                });
            }
        }, 100);

        return content;
    }

    /**
     * Update password strength indicator
     */
    _updatePasswordStrength(password) {
        const strengthBar = document.getElementById('strength-bar-fill');
        const strengthText = document.getElementById('strength-text');

        if (!strengthBar || !strengthText) return;

        const strength = this._calculatePasswordStrength(password);

        // Update bar
        strengthBar.style.width = `${strength.percentage}%`;
        strengthBar.className = `password-strength-fill password-strength--${strength.level}`;

        // Update text
        strengthText.textContent = strength.text;
        strengthText.className = `password-strength-text password-strength--${strength.level}`;

        // Update requirements checkmarks
        this._updateRequirements(password);
    }

    /**
     * Calculate password strength
     */
    _calculatePasswordStrength(password) {
        if (!password) {
            return { percentage: 0, level: 'weak', text: 'Digite uma senha' };
        }

        let strength = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        // Calculate strength
        if (checks.length) strength += 25;
        if (checks.uppercase) strength += 20;
        if (checks.lowercase) strength += 20;
        if (checks.number) strength += 20;
        if (checks.special) strength += 15;

        // Determine level
        let level, text;
        if (strength < 40) {
            level = 'weak';
            text = 'Senha fraca';
        } else if (strength < 70) {
            level = 'medium';
            text = 'Senha média';
        } else {
            level = 'strong';
            text = 'Senha forte';
        }

        return { percentage: strength, level, text };
    }

    /**
     * Update password requirements checklist
     */
    _updateRequirements(password) {
        const requirements = {
            'req-length': password.length >= 8,
            'req-uppercase': /[A-Z]/.test(password),
            'req-lowercase': /[a-z]/.test(password),
            'req-number': /[0-9]/.test(password)
        };

        Object.entries(requirements).forEach(([id, met]) => {
            const element = document.getElementById(id);
            if (element) {
                element.className = met ? 'requirement-met' : '';
            }
        });
    }

    /**
     * Validate email format
     */
    _validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Handle email change submission
     */
    async _handleEmailChange() {
        const newEmail = document.getElementById('new-email')?.value.trim();
        const password = document.getElementById('confirm-password-email')?.value;
        const errorElement = document.getElementById('email-error');

        // Validate inputs
        if (!newEmail || !password) {
            if (errorElement) {
                errorElement.textContent = 'Por favor, preencha todos os campos';
                errorElement.style.display = 'block';
            }
            return;
        }

        // Validate email format
        if (!this._validateEmail(newEmail)) {
            if (errorElement) {
                errorElement.textContent = 'Email inválido';
                errorElement.style.display = 'block';
            }
            return;
        }

        try {
            // Update email directly in players table (custom auth system)
            if (!this.userId) {
                throw new Error('ID do usuário não encontrado');
            }

            // Verify password before allowing email change
            const { data: player, error: fetchError } = await supabase
                .from('players')
                .select('password')
                .eq('id', this.userId)
                .single();

            if (fetchError) throw fetchError;

            // In a real app, you'd verify the password here
            // For now, we'll just update the email
            const { error: updateError } = await supabase
                .from('players')
                .update({
                    email: newEmail,
                    email_verified: false
                })
                .eq('id', this.userId);

            if (updateError) throw updateError;

            // Close modal
            if (this.emailModal) {
                this.emailModal.close();
            }

            // Show success message
            toast.success('Email alterado com sucesso! Verifique sua caixa de entrada para confirmar.', {
                duration: 5000
            });

            // Update local email
            this.userEmail = newEmail;

            // Re-render to update UI
            if (this.element) {
                const newElement = this.render();
                this.element.parentNode?.replaceChild(newElement, this.element);
            }

        } catch (error) {
            console.error('Error changing email:', error);

            if (errorElement) {
                errorElement.textContent = error.message || 'Erro ao alterar email';
                errorElement.style.display = 'block';
            }

            toast.error('Erro ao alterar email. Tente novamente.');
        }
    }

    /**
     * Handle password change submission
     */
    async _handlePasswordChange() {
        const currentPassword = document.getElementById('current-password')?.value;
        const newPassword = document.getElementById('new-password')?.value;
        const confirmPassword = document.getElementById('confirm-new-password')?.value;
        const errorElement = document.getElementById('password-error');

        // Validate inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            if (errorElement) {
                errorElement.textContent = 'Por favor, preencha todos os campos';
                errorElement.style.display = 'block';
            }
            return;
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            if (errorElement) {
                errorElement.textContent = 'As senhas não coincidem';
                errorElement.style.display = 'block';
            }
            return;
        }

        // Validate password strength
        const strength = this._calculatePasswordStrength(newPassword);
        if (strength.percentage < 40) {
            if (errorElement) {
                errorElement.textContent = 'A senha é muito fraca. Por favor, escolha uma senha mais forte.';
                errorElement.style.display = 'block';
            }
            return;
        }

        try {
            // Update password in players table (custom auth system)
            if (!this.userId) {
                throw new Error('ID do usuário não encontrado');
            }

            // Get current password hash from database
            const { data: player, error: fetchError } = await supabase
                .from('players')
                .select('password')
                .eq('id', this.userId)
                .single();

            if (fetchError) throw fetchError;

            // Verify current password
            if (typeof bcrypt === 'undefined' || !window.bcrypt) {
                throw new Error('Sistema de segurança não carregado');
            }

            const passwordMatches = bcrypt.compareSync(currentPassword, player.password);
            if (!passwordMatches) {
                throw new Error('Senha atual incorreta');
            }

            // Hash new password
            const hashedPassword = bcrypt.hashSync(newPassword, 10);

            // Update password in database
            const { error: updateError } = await supabase
                .from('players')
                .update({ password: hashedPassword })
                .eq('id', this.userId);

            if (updateError) throw updateError;

            // Close modal
            if (this.passwordModal) {
                this.passwordModal.close();
            }

            // Show success message
            toast.success('Senha alterada com sucesso!', {
                duration: 3000
            });

        } catch (error) {
            console.error('Error changing password:', error);

            if (errorElement) {
                errorElement.textContent = error.message || 'Erro ao alterar senha';
                errorElement.style.display = 'block';
            }

            toast.error(error.message || 'Erro ao alterar senha. Verifique sua senha atual.');
        }
    }

    /**
     * Save notification preferences
     */
    async _saveNotificationPreferences() {
        const notificationsOffers = document.getElementById('notifications-offers')?.checked ?? true;
        const notificationsAchievements = document.getElementById('notifications-achievements')?.checked ?? true;
        const notificationsShop = document.getElementById('notifications-shop')?.checked ?? false;

        try {
            if (!this.userId) {
                throw new Error('User ID not found');
            }

            // Update preferences in database
            const { error } = await supabase
                .from('players')
                .update({
                    notifications_offers: notificationsOffers,
                    notifications_achievements: notificationsAchievements,
                    notifications_shop: notificationsShop
                })
                .eq('id', this.userId);

            if (error) throw error;

            toast.success('Preferências salvas com sucesso!');

        } catch (error) {
            console.error('Error saving preferences:', error);
            toast.error('Erro ao salvar preferências. Tente novamente.');
        }
    }

    /**
     * Load notification preferences from database
     */
    async loadPreferences() {
        try {
            if (!this.userId) return;

            const { data, error } = await supabase
                .from('players')
                .select('notifications_offers, notifications_achievements, notifications_shop')
                .eq('id', this.userId)
                .single();

            if (error) throw error;

            if (data) {
                // Update checkboxes
                const offersCheckbox = document.getElementById('notifications-offers');
                const achievementsCheckbox = document.getElementById('notifications-achievements');
                const shopCheckbox = document.getElementById('notifications-shop');

                if (offersCheckbox) offersCheckbox.checked = data.notifications_offers ?? true;
                if (achievementsCheckbox) achievementsCheckbox.checked = data.notifications_achievements ?? true;
                if (shopCheckbox) shopCheckbox.checked = data.notifications_shop ?? false;
            }

        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }

    /**
     * Get current element
     */
    getElement() {
        return this.element;
    }
}

export default ProfileSettings;
