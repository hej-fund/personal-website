// ─── EmailJS config ────────────────────────────────────────────────────────
// 1. Sign up at https://www.emailjs.com (free tier: 200 emails/month)
// 2. Add an Email Service (Gmail, Outlook, etc.) and note the Service ID
// 3. Create an Email Template with these variables:
//      {{page}}          – page where the bug was reported
//      {{description}}   – bug description
//      {{submitted_at}}  – date and time of submission
//    Set "To Email" in the template to your address.
// 4. Copy your Public Key from Account → API Keys
// 5. Fill in the three constants below
const EMAILJS_PUBLIC_KEY  = 'e7Ws71zKxfPCFZpX-';
const EMAILJS_SERVICE_ID  = 'service_sfe86tk';
const EMAILJS_TEMPLATE_ID = 'template_n9y4rip';
// ───────────────────────────────────────────────────────────────────────────

(function () {
    // Load EmailJS SDK
    const sdk = document.createElement('script');
    sdk.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    sdk.onload = () => emailjs.init(EMAILJS_PUBLIC_KEY);
    document.head.appendChild(sdk);

    // Inject modal
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
                    <input type="text" id="bugPage" placeholder="e.g. Projects, Photography...">
                </div>
                <div class="bug-form-group">
                    <label for="bugDescription">Description</label>
                    <textarea id="bugDescription" rows="5" placeholder="Describe the issue you encountered..."></textarea>
                </div>
                <div class="bug-form-status" id="bugFormStatus"></div>
                <button type="submit" class="btn-submit-bug" id="bugSubmitBtn">Submit Report</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const overlay   = document.getElementById('bugModalOverlay');
    const closeBtn  = document.getElementById('bugModalClose');
    const form      = document.getElementById('bugForm');
    const submitBtn = document.getElementById('bugSubmitBtn');
    const msgBox    = document.getElementById('bugFormStatus');

    // function sanitize(str) {
    //     return str
    //         .replace(/&/g, '&amp;')
    //         .replace(/</g, '&lt;')
    //         .replace(/>/g, '&gt;')
    //         .replace(/"/g, '&quot;')
    //         .replace(/'/g, '&#x27;');
    // }

    function openModal() {
        overlay.classList.add('active');
        msgBox.className = 'bug-form-status';
        msgBox.textContent = '';
        form.reset();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
        submitBtn.style.background = '';
        submitBtn.style.opacity = '';
    }

    function closeModal() {
        overlay.classList.remove('active');
    }

    document.querySelector('.btn-report').addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const page        = document.getElementById('bugPage').value.trim();
        const description = document.getElementById('bugDescription').value.trim();

        if (!page || !description) {
            msgBox.className = 'bug-form-status error';
            msgBox.textContent = 'Please fill in both fields before submitting.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        msgBox.className = 'bug-form-status';
        msgBox.textContent = '';

        submitBtn.textContent = 'Thank You!';
        submitBtn.style.background = '#2ecc71';
        submitBtn.style.opacity = '1';
        setTimeout(closeModal, 750);

        // EMAILJS DISABLED — re-enable by uncommenting the block below
        // const submittedAt = new Date().toLocaleString('en-US', {
        //     weekday: 'short', year: 'numeric', month: 'short',
        //     day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        // });
        // emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        //     page:         sanitize(page),
        //     description:  sanitize(description),
        //     submitted_at: submittedAt,
        // }).then(() => {
        //     submitBtn.textContent = 'Thank You!';
        //     submitBtn.style.background = '#2ecc71';
        //     submitBtn.style.opacity = '1';
        //     setTimeout(closeModal, 750);
        // }).catch(() => {
        //     msgBox.className = 'bug-form-status error';
        //     msgBox.textContent = 'Failed to send. Please try again.';
        //     submitBtn.disabled = false;
        //     submitBtn.textContent = 'Submit Report';
        // });
    });
})();
