/**
 * 3D T-Shirt Studio - Importable Plugin & PromptVault Bridge SDK
 *
 * Usage as ES Module:
 *   import { TShirtStudio } from './tshirt-studio-sdk.js';
 *   TShirtStudio.openModal({ pvId: 42, piece: 'front' });
 *
 * Auto-inject "👕 3D T-Shirt'te Dene" buttons into PromptVault UI:
 *   TShirtStudio.enablePromptVaultAutoButtons();
 */

export const TShirtStudio = {
  defaultStudioUrl: 'http://localhost:5173',
  defaultPvUrl: 'http://127.0.0.1:7860',
  _modalEl: null,
  _iframeEl: null,

  buildUrl(options = {}) {
    const studioBase = (options.studioUrl || this.defaultStudioUrl).replace(/\/+$/, '');
    const params = new URLSearchParams();
    if (options.imageUrl) params.set('image', options.imageUrl);
    if (options.pvId) params.set('pv_id', String(options.pvId));
    if (options.pvUrl || this.defaultPvUrl) params.set('pv_url', options.pvUrl || this.defaultPvUrl);
    if (options.piece) params.set('piece', options.piece);
    if (options.model) params.set('model', options.model);
    if (options.name) params.set('name', options.name);
    const qs = params.toString();
    return qs ? `${studioBase}/?${qs}` : `${studioBase}/`;
  },

  openModal(options = {}) {
    const url = this.buildUrl(options);

    if (!this._modalEl) {
      const overlay = document.createElement('div');
      overlay.id = 'tshirt-studio-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(10, 12, 14, 0.82);
        backdrop-filter: blur(8px);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        padding: 18px;
      `;

      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #181b1a;
        border: 1px solid #2e3432;
        border-bottom: none;
        padding: 10px 16px;
        border-radius: 12px 12px 0 0;
        color: #ebefed;
        font-family: Inter, system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
      `;
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">👕</span>
          <span>3D T-Shirt Studio &amp; 2D Kalıp Editörü</span>
          <span style="font-size:11px;color:#38b27b;background:rgba(56,178,123,0.14);padding:2px 8px;border-radius:99px;">PromptVault Modülü</span>
        </div>
        <button id="tshirt-studio-close-btn" style="background:#272b2a;border:1px solid #383f3d;color:#ebefed;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;">✕ Kapat (ESC)</button>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.cssText = `
        flex: 1;
        width: 100%;
        border: 1px solid #2e3432;
        border-radius: 0 0 12px 12px;
        background: #151716;
      `;

      overlay.appendChild(header);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);

      header.querySelector('#tshirt-studio-close-btn').addEventListener('click', () => this.closeModal());
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this._modalEl && this._modalEl.style.display !== 'none') {
          this.closeModal();
        }
      });

      this._modalEl = overlay;
      this._iframeEl = iframe;
    }

    this._iframeEl.src = url;
    this._modalEl.style.display = 'flex';
  },

  closeModal() {
    if (this._modalEl) {
      this._modalEl.style.display = 'none';
      if (this._iframeEl) this._iframeEl.src = 'about:blank';
    }
  },

  mount(container, options = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) throw new Error('Container element not found');
    const iframe = document.createElement('iframe');
    iframe.src = this.buildUrl(options);
    iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:10px;background:#151716;';
    el.innerHTML = '';
    el.appendChild(iframe);
    return {
      iframe,
      loadDesign: (url, piece = 'front', name = 'Tasarım') => {
        iframe.contentWindow?.postMessage({ type: 'LOAD_TSHIRT_DESIGN', url, piece, name }, '*');
      },
      setModel: (model) => {
        iframe.contentWindow?.postMessage({ type: 'SET_TSHIRT_MODEL', model }, '*');
      },
      setColor: (color) => {
        iframe.contentWindow?.postMessage({ type: 'SET_TSHIRT_COLOR', color }, '*');
      }
    };
  },

  enablePromptVaultAutoButtons(config = {}) {
    if (config.studioUrl) this.defaultStudioUrl = config.studioUrl;
    if (config.pvUrl) this.defaultPvUrl = config.pvUrl;

    const injectIntoCards = () => {
      document.querySelectorAll('[data-id], .card[data-image-id], .thumb-card').forEach((card) => {
        if (card.querySelector('.pv-tshirt-try-btn')) return;
        const id = card.dataset.id || card.dataset.imageId;
        const img = card.querySelector('img');
        if (!id && !img) return;

        const btn = document.createElement('button');
        btn.className = 'pv-tshirt-try-btn';
        btn.type = 'button';
        btn.title = 'Bu görseli 3D T-Shirt üzerinde dene';
        btn.textContent = '👕 3D Dene';
        btn.style.cssText = `
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(24, 27, 26, 0.88);
          border: 1px solid #38b27b;
          color: #6ee7b7;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          z-index: 10;
        `;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (id) {
            this.openModal({ pvId: id, pvUrl: window.location.origin });
          } else if (img) {
            this.openModal({ imageUrl: img.src, pvUrl: window.location.origin });
          }
        });
        if (getComputedStyle(card).position === 'static') {
          card.style.position = 'relative';
        }
        card.appendChild(btn);
      });
    };

    injectIntoCards();
    const observer = new MutationObserver(() => injectIntoCards());
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  }
};

if (typeof window !== 'undefined') {
  window.TShirtStudio = TShirtStudio;
}
