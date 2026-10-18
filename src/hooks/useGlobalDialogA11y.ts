import { useEffect } from 'react';

/**
 * Aksesibilitas semua jendela modal, dipasang SEKALI di App (WCAG 2.1.2, 2.4.3, 4.1.2).
 * Modal dikenali dari lapisan latar `fixed inset-0` berwarna gelap/blur yang berisi kontrol.
 * Untuk setiap modal yang muncul:
 *  - role="dialog" + aria-modal, dinamai dari judul (h1-h3) di dalamnya
 *  - fokus dipindah ke dalam modal, Tab berputar di dalam, fokus kembali ke pembuka saat ditutup
 *  - Escape menutup modal PALING ATAS dengan menekan tombol tutupnya sendiri
 *    (aria-label "Tutup..." atau tombol berteks Tutup/Batal), sehingga logika penutupan tiap
 *    modal tidak diubah. Modal yang tidak boleh ditutup Escape diberi data-no-escape.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (n) => n.offsetParent !== null || n.getClientRects().length > 0
  );
}

function isOverlay(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (!el.classList.contains('fixed') || !el.classList.contains('inset-0')) return false;
  if (el.closest('[data-dialog-ignore]')) return false;
  if (!/(bg-black|bg-slate-(8|9)\d\d|bg-gray-(8|9)\d\d|backdrop-blur|bg-slate-100|bg-slate-950)/.test(el.className)) return false;
  return Boolean(el.querySelector('button, input, select, textarea, a[href]'));
}

function findCloseButton(dialog: HTMLElement): HTMLElement | null {
  const byLabel = dialog.querySelector<HTMLElement>('button[aria-label^="Tutup"], button[aria-label="Close"]');
  if (byLabel) return byLabel;
  const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('button'));
  return buttons.find((b) => /^(tutup|batal|kembali)\b/i.test((b.textContent || '').trim())) || null;
}

export function useGlobalDialogA11y(): void {
  useEffect(() => {
    const stack: HTMLElement[] = [];
    const openers = new Map<HTMLElement, HTMLElement | null>();
    let scheduled = false;

    const setup = (el: HTMLElement) => {
      if (stack.includes(el)) return;
      el.setAttribute('role', el.getAttribute('role') || 'dialog');
      el.setAttribute('aria-modal', 'true');
      if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
        const heading = el.querySelector<HTMLElement>('h1, h2, h3');
        if (heading) {
          if (!heading.id) heading.id = `dialog-title-${Math.random().toString(36).slice(2, 8)}`;
          el.setAttribute('aria-labelledby', heading.id);
        }
      }
      openers.set(el, document.activeElement as HTMLElement | null);
      stack.push(el);
      requestAnimationFrame(() => {
        if (!document.contains(el) || el.contains(document.activeElement)) return;
        const first = focusables(el)[0];
        if (first) first.focus();
        else {
          el.tabIndex = -1;
          el.focus();
        }
      });
    };

    const teardown = (el: HTMLElement) => {
      const i = stack.indexOf(el);
      if (i === -1) return;
      stack.splice(i, 1);
      const opener = openers.get(el);
      openers.delete(el);
      if (opener && document.contains(opener) && !stack.some((d) => d.contains(document.activeElement))) {
        opener.focus();
      }
    };

    const scan = () => {
      scheduled = false;
      for (const el of [...stack]) if (!document.contains(el)) teardown(el);
      document.querySelectorAll('div.fixed.inset-0').forEach((el) => {
        if (isOverlay(el)) setup(el);
      });
    };

    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(scan);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    scan();

    const onKeyDown = (e: KeyboardEvent) => {
      const top = stack[stack.length - 1];
      if (!top || !document.contains(top)) return;
      if (e.key === 'Escape') {
        if (top.hasAttribute('data-no-escape')) return;
        const close = findCloseButton(top);
        e.preventDefault();
        if (close) close.click();
        else top.dispatchEvent(new MouseEvent('click', { bubbles: true })); // klik latar (bila latar menutup modal)
        return;
      }
      if (e.key === 'Tab') {
        const items = focusables(top);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!active || !top.contains(active)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);
}
