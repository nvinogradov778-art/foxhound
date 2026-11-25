import { Utils } from '../core/utils.js';
import { Modal } from '../core/modal.js';

function init() {
    const modal = document.getElementById('recruit-modal');
    const btn = document.getElementById('btn-recruit');
    const close = document.getElementById('recruit-close');
    const form = document.getElementById('recruit-form');
    const submit = document.getElementById('rec-submit');

    if (!modal || !btn) return;

    btn.addEventListener('click', () => modal.classList.add('active'));

    close.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submit.disabled = true;
        const originalText = submit.textContent;
        submit.textContent = 'Отправка...';

        const data = {
            callsign: document.getElementById('rec-callsign').value.trim(),
            full_name: document.getElementById('rec-fullname').value.trim(),
            birth_date: document.getElementById('rec-birth').value,
            phone: document.getElementById('rec-phone').value.trim(),
            telegram: document.getElementById('rec-telegram').value.trim(),
            vk: document.getElementById('rec-vk').value.trim(),
            motivation: document.getElementById('rec-motivation').value.trim()
        };

        try {
            const res = await fetch('/api/recruitment.php?action=submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                form.reset();
                modal.classList.remove('active');
                Modal.alert({ title: 'Успех', message: result.message || 'Заявка отправлена!' });
            } else {
                Modal.alert({ title: 'Ошибка', message: result.error || 'Не удалось отправить', danger: true });
            }
        } catch (err) {
            Modal.alert({ title: 'Ошибка сети', message: err.message, danger: true });
        } finally {
            submit.disabled = false;
            submit.textContent = originalText;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}