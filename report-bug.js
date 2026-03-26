(function () {
    const modal = document.createElement('div');
    modal.className = 'bug-modal-overlay';
    modal.id = 'bugModalOverlay';
    modal.innerHTML = `
        <div class="bug-modal">
            <button class="bug-modal-close" id="bugModalClose">&#x2715;</button>
            <p class="bug-modal-eyebrow">Feedback</p>
            <h2 class="bug-modal-title">Report a Bug</h2>
            <form class="bug-form" onsubmit="return false;">
                <div class="bug-form-group">
                    <label for="bugPage">Page</label>
                    <input type="text" id="bugPage" placeholder="e.g. Projects, Photography...">
                </div>
                <div class="bug-form-group">
                    <label for="bugDescription">Description</label>
                    <textarea id="bugDescription" rows="5" placeholder="Describe the issue you encountered..."></textarea>
                </div>
                <button type="submit" class="btn-submit-bug">Submit Report</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const overlay = document.getElementById('bugModalOverlay');
    const closeBtn = document.getElementById('bugModalClose');

    document.querySelector('.btn-report').addEventListener('click', () => {
        overlay.classList.add('active');
    });

    closeBtn.addEventListener('click', () => {
        overlay.classList.remove('active');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') overlay.classList.remove('active');
    });
})();
