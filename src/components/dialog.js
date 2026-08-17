const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function createDialogController(root) {
  let opener = null;

  function close() {
    root.innerHTML = '';
    document.body.style.removeProperty('overflow');
    document.removeEventListener('keydown', onKeydown);
    opener?.focus();
    opener = null;
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...root.querySelectorAll(FOCUSABLE)];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open({ title, bodyHtml, trigger = document.activeElement }) {
    opener = trigger;
    root.innerHTML = `<div class="dialog-backdrop" data-dialog-backdrop>
      <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="button button-quiet" type="button" data-dialog-close aria-label="关闭对话框">关闭</button></div>
        <div class="dialog-copy">${bodyHtml}</div>
        <div class="dialog-actions"><button class="button button-primary" type="button" data-dialog-close>知道了</button></div>
      </section>
    </div>`;
    document.body.style.overflow = 'hidden';
    root.querySelectorAll('[data-dialog-close]').forEach((button) => button.addEventListener('click', close));
    root.querySelector('[data-dialog-backdrop]').addEventListener('mousedown', (event) => {
      if (event.target === event.currentTarget) close();
    });
    document.addEventListener('keydown', onKeydown);
    root.querySelector('[data-dialog-close]')?.focus();
  }

  return { open, close };
}
