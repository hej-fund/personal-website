const EMAILJS_PUBLIC_KEY  = 'e7Ws71zKxfPCFZpX-';
const EMAILJS_SERVICE_ID  = 'service_sfe86tk';
const EMAILJS_TEMPLATE_ID = 'template_n9y4rip';

(function () {
    // Clear saved state on page refresh
    if (performance.getEntriesByType("navigation")[0]?.type === "reload") {
        sessionStorage.removeItem('bugPage');
        sessionStorage.removeItem('bugDesc');
    }

    const sdk = document.createElement('script');
    sdk.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    sdk.onload = () => emailjs.init(EMAILJS_PUBLIC_KEY);
    document.head.appendChild(sdk);

    const modal = document.createElement('div');
    modal.className = 'bug-modal-overlay';
    modal.id = 'bugModalOverlay';
    modal.innerHTML = `
        <div class="bug-modal">
            <button class="bug-modal-close" id="bugModalClose">&#x2715;</button>
            <p class="bug-modal-eyebrow">Feedback</p>
            <h2 class="bug-modal-title">Report a Bug</h2>
            <form class="bug-form" id="bugForm">
                <div class="bug-form-group">
                    <label for="bugPage">Page</label>
                    <select id="bugPage">
                        <option value="">Select a page…</option>
                        <option value="Home">Home</option>
                        <option value="Level 1">Level 1</option>
                        <option value="Level 2">Level 2</option>
                        <option value="Level 3">Level 3</option>
                        <option value="Level 4">Level 4</option>
                        <option value="Level 5">Level 5</option>
                        <option value="Level 6">Level 6</option>
                        <option value="Level 7">Level 7</option>
                        <option value="Level 8">Level 8</option>
                        <option value="Level 9">Level 9</option>
                    </select>
                </div>
                <div class="bug-form-group">
                    <label for="bugDescription">Description</label>
                    <textarea id="bugDescription" rows="5" placeholder="Describe the issue you encountered..." autocomplete="off"></textarea>
                </div>
                <div class="bug-form-status" id="bugFormStatus"></div>
                <div class="bug-form-actions">
                    <button type="submit" class="btn-submit-bug" id="bugSubmitBtn">Submit Report</button>
                    <button type="button" class="btn-clear-bug" id="bugClearBtn">Clear</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const overlay   = document.getElementById('bugModalOverlay');
    const closeBtn  = document.getElementById('bugModalClose');
    const form      = document.getElementById('bugForm');
    const submitBtn = document.getElementById('bugSubmitBtn');
    const clearBtn  = document.getElementById('bugClearBtn');
    const msgBox    = document.getElementById('bugFormStatus');
    const pageInput = document.getElementById('bugPage');
    const descInput = document.getElementById('bugDescription');

    function sanitize(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    function saveState() {
        sessionStorage.setItem('bugPage', pageInput.value);
        sessionStorage.setItem('bugDesc', descInput.value);
    }

    function resetForm() {
        form.reset();
        sessionStorage.removeItem('bugPage');
        sessionStorage.removeItem('bugDesc');
        pageInput.classList.remove('field-error');
        descInput.classList.remove('field-error');
        msgBox.className = 'bug-form-status';
        msgBox.textContent = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
        submitBtn.style.background = '';
        submitBtn.style.opacity = '';
    }

    function openModal() {
        const savedPage = sessionStorage.getItem('bugPage');
        const savedDesc = sessionStorage.getItem('bugDesc');
        if (savedPage) pageInput.value = savedPage;
        if (savedDesc) descInput.value = savedDesc;
        overlay.classList.add('active');
    }

    function closeModal() {
        overlay.classList.remove('active');
    }

    clearBtn.addEventListener('click', resetForm);

    pageInput.addEventListener('change', function () {
        if (this.value) this.classList.remove('field-error');
        saveState();
    });
    descInput.addEventListener('input', function () {
        if (this.value.trim()) this.classList.remove('field-error');
        saveState();
    });

    document.querySelector('.btn-report').addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const page        = pageInput.value;
        const description = descInput.value.trim();

        pageInput.classList.toggle('field-error', !page);
        descInput.classList.toggle('field-error', !description);

        if (!page || !description) {
            msgBox.className = 'bug-form-status error';
            msgBox.textContent = 'Please fill in both fields before submitting.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        msgBox.className = 'bug-form-status';
        msgBox.textContent = '';

        const submittedAt = new Date().toLocaleString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short',
            day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            page:         sanitize(page),
            description:  sanitize(description),
            submitted_at: submittedAt,
        }).then(() => {
            submitBtn.textContent = 'Thank You!';
            submitBtn.style.background = 'rgba(0,255,100,.15)';
            submitBtn.style.color = '#0f6';
            submitBtn.style.borderColor = 'rgba(0,255,100,.3)';
            sessionStorage.removeItem('bugPage');
            sessionStorage.removeItem('bugDesc');
            setTimeout(() => { closeModal(); resetForm(); }, 750);
        }).catch(() => {
            msgBox.className = 'bug-form-status error';
            msgBox.textContent = 'Failed to send. Please try again.';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Report';
        });
    });
})();
