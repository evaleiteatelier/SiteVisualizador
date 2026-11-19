/**
 * Componentes de interface partilhados da loja Eva Leite Atelier (pt-PT):
 * Barra de anúncios, Cabeçalho sticky, Pesquisa rápida, Drawer de Favoritos,
 * Rodapé editorial, Cartões de produto e Notificações toast.
 */
(function (global) {
  'use strict';

  const _produtosMap = new Map();
  let _opcoesShell = { pagina: 'home', onPesquisa: null, onCategoria: null };
  let _toastTimer = null;

  function registrarProdutos(lista) {
    _produtosMap.clear();
    if (Array.isArray(lista)) {
      lista.forEach(p => {
        if (p && p.id !== undefined && p.id !== null) {
          _produtosMap.set(String(p.id), p);
        }
      });
    }
    atualizarBadgeFavoritos();
    renderListaFavoritos();
  }

  function obterProdutoMemoria(id) {
    return _produtosMap.get(String(id)) || null;
  }

  function svgInstagram(cls = 'w-5 h-5') {
    return `
      <svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>`;
  }

  function svgWhatsApp(cls = 'w-5 h-5') {
    return `
      <svg class="${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.03 2C6.5 2 2 6.48 2 12c0 1.94.55 3.79 1.59 5.39L2.04 22l4.75-1.51A10.02 10.02 0 0 0 12.03 22C17.55 22 22 17.52 22 12S17.55 2 12.03 2zm5.82 14.12c-.24.68-1.41 1.3-1.95 1.38-.51.07-1.15.1-1.85-.12-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.76-2.18 1.03-2.48.27-.3.59-.37.79-.37.2 0 .39 0 .56.01.18.01.42-.07.66.51.24.59.83 2.04.9 2.19.07.15.12.33.02.53-.1.2-.15.33-.3.5-.15.18-.31.39-.44.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.13 1.01 2.09 1.32 2.39 1.47.3.15.47.12.65-.07.17-.2.74-.86.94-1.16.2-.3.4-.25.66-.15.27.1 1.71.81 2 .95.3.15.49.22.56.34.08.13.08.73-.16 1.41z"/>
      </svg>`;
  }

  function svgHeart(preenchido, cls = 'w-4 h-4') {
    return `
      <svg class="${cls}" viewBox="0 0 24 24" fill="${preenchido ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>`;
  }

  function mostrarToast(mensagem) {
    const toast = document.getElementById('atelier-toast');
    const textEl = document.getElementById('atelier-toast-text');
    if (!toast || !textEl) return;
    textEl.textContent = mensagem;
    toast.classList.add('visivel');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      toast.classList.remove('visivel');
    }, 2800);
  }

  async function copiarTextoComFeedback(texto, msgSucesso = 'Ligação copiada para partilhar!') {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = texto;
        tmp.style.position = 'fixed';
        tmp.style.opacity = '0';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        tmp.remove();
      }
      mostrarToast(msgSucesso);
      return true;
    } catch (_) {
      mostrarToast('Não foi possível copiar automaticamente.');
      return false;
    }
  }

  function atualizarBadgeFavoritos() {
    const count = AtelierLoja.getFavoritos().length;
    const badge = document.getElementById('fav-badge-count');
    if (!badge) return;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', count === 0);
  }

  function atualizarBotoesFavoritoNaPagina() {
    document.querySelectorAll('[data-fav-btn]').forEach(btn => {
      const id = btn.getAttribute('data-fav-btn');
      const ativo = AtelierLoja.isFavorito(id);
      const iconCls = btn.getAttribute('data-icon-cls') || 'w-4 h-4';
      const comTexto = btn.getAttribute('data-fav-with-label') === '1';

      btn.setAttribute('aria-pressed', ativo ? 'true' : 'false');
      btn.classList.toggle('text-rose-600', ativo);

      if (comTexto) {
        btn.classList.toggle('border-rose-300', ativo);
        btn.classList.toggle('border-stone-300', !ativo);
        btn.classList.toggle('text-stone-800', !ativo);
        btn.innerHTML = `${svgHeart(ativo, iconCls)}<span>${ativo ? 'Nos Meus Favoritos' : 'Guardar nos Favoritos'}</span>`;
      } else {
        btn.classList.toggle('bg-white', true);
        btn.classList.toggle('text-stone-700', !ativo);
        btn.innerHTML = svgHeart(ativo, iconCls);
      }
    });
  }

  function aoClicarFavorito(event, id) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const adicionado = AtelierLoja.toggleFavorito(id);
    atualizarBadgeFavoritos();
    atualizarBotoesFavoritoNaPagina();
    renderListaFavoritos();
    mostrarToast(adicionado ? 'Peça guardada nos seus favoritos.' : 'Peça removida dos favoritos.');
  }

  function renderListaFavoritos() {
    const container = document.getElementById('drawer-fav-lista');
    const totalEl = document.getElementById('drawer-fav-total');
    const resumoEl = document.getElementById('drawer-fav-resumo');
    if (!container) return;

    const ids = AtelierLoja.getFavoritos();
    if (ids.length === 0) {
      container.innerHTML = `
        <div class="text-center py-14 px-4">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
            ${svgHeart(false, 'w-5 h-5')}
          </div>
          <p class="font-semibold text-stone-800 mb-1">A sua seleção está vazia</p>
          <p class="text-sm text-stone-500 mb-5">Toque no coração em qualquer peça para a guardar e comparar antes de concluir.</p>
          <a href="index.html#colecao" onclick="AtelierUI.fecharDrawerFavoritos()" class="inline-flex items-center px-5 py-2.5 rounded-full bg-[#171614] text-white text-xs font-medium tracking-wider uppercase hover:bg-stone-800 transition-colors">
            Explorar Coleção
          </a>
        </div>`;
      if (resumoEl) resumoEl.classList.add('hidden');
      return;
    }

    let soma = 0;
    let html = '';

    ids.forEach(id => {
      const p = obterProdutoMemoria(id);
      if (!p) {
        html += `
          <div class="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white">
            <a href="produto.html?id=${encodeURIComponent(id)}" class="text-sm font-medium text-stone-800 hover:underline">Peça #${AtelierLoja.escapeHtml(id)}</a>
            <button type="button" onclick="AtelierUI.removerFavoritoDrawer('${AtelierLoja.escapeHtml(id)}')" class="text-xs text-stone-400 hover:text-rose-600">Remover</button>
          </div>`;
        return;
      }

      if (Number.isFinite(Number(p.preco))) soma += Number(p.preco);
      const nome = AtelierLoja.escapeHtml(p.nome);
      const preco = AtelierLoja.escapeHtml(AtelierLoja.formatarPreco(p.preco));
      const imgUrl = AtelierLoja.normalizarUrlImagem(p.imagem_url);
      const urlPeca = AtelierLoja.getUrlProduto(p);

      html += `
        <div class="flex gap-3.5 p-3 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 transition-colors">
          <a href="${urlPeca}" class="w-20 h-24 rounded-lg overflow-hidden bg-stone-100 shrink-0 block">
            ${imgUrl ? `<img src="${AtelierLoja.escapeHtml(imgUrl)}" alt="${nome}" class="w-full h-full object-cover">` : ''}
          </a>
          <div class="flex-1 min-w-0 flex flex-col">
            <a href="${urlPeca}" class="text-sm font-medium text-stone-900 hover:text-[#b8933a] transition-colors line-clamp-2">${nome}</a>
            <span class="text-sm font-semibold text-stone-800 mt-1">${preco}</span>
            <div class="mt-auto pt-2 flex items-center justify-between gap-2">
              <a href="${urlPeca}" class="text-xs font-medium text-[#171614] underline underline-offset-4 hover:text-[#b8933a]">
                Escolher como comprar
              </a>
              <button type="button" onclick="AtelierUI.removerFavoritoDrawer('${AtelierLoja.escapeHtml(id)}')" class="text-xs text-stone-400 hover:text-rose-600 transition-colors">
                Remover
              </button>
            </div>
          </div>
        </div>`;
    });

    container.innerHTML = html;
    if (totalEl) totalEl.textContent = AtelierLoja.formatarPreco(soma);
    if (resumoEl) resumoEl.classList.remove('hidden');
  }

  function removerFavoritoDrawer(id) {
    AtelierLoja.removerFavorito(id);
    atualizarBadgeFavoritos();
    atualizarBotoesFavoritoNaPagina();
    renderListaFavoritos();
    mostrarToast('Peça removida dos favoritos.');
  }

  function abrirDrawerFavoritos() {
    renderListaFavoritos();
    const el = document.getElementById('drawer-favoritos');
    if (el) el.classList.add('aberto');
  }

  function fecharDrawerFavoritos() {
    const el = document.getElementById('drawer-favoritos');
    if (el) el.classList.remove('aberto');
  }

  function abrirMenuMobile() {
    const el = document.getElementById('drawer-menu-mobile');
    if (el) el.classList.add('aberto');
  }

  function fecharMenuMobile() {
    const el = document.getElementById('drawer-menu-mobile');
    if (el) el.classList.remove('aberto');
  }

  function togglePesquisaHeader() {
    const bar = document.getElementById('header-search-bar');
    const input = document.getElementById('header-search-input');
    if (!bar) return;
    const ficouOculto = bar.classList.toggle('hidden');
    if (!ficouOculto && input) {
      setTimeout(() => input.focus(), 60);
    }
  }

  function submeterPesquisaHeader(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('header-search-input');
    const termo = input ? input.value.trim() : '';

    if (_opcoesShell.pagina === 'home' && typeof _opcoesShell.onPesquisa === 'function') {
      _opcoesShell.onPesquisa(termo);
      const sec = document.getElementById('colecao');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      const target = termo ? `index.html?q=${encodeURIComponent(termo)}#colecao` : 'index.html#colecao';
      global.location.href = target;
    }
  }

  function aoClicarCategoriaHeader(catId) {
    fecharMenuMobile();
    if (_opcoesShell.pagina === 'home' && typeof _opcoesShell.onCategoria === 'function') {
      _opcoesShell.onCategoria(catId);
      const sec = document.getElementById('colecao');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      global.location.href = `index.html?categoria=${encodeURIComponent(catId)}#colecao`;
    }
  }

  function atualizarEstadoCanaisShell() {
    const whatsappAtivo = AtelierLoja.isWhatsAppDisponivel();
    const avisoTopo = whatsappAtivo
      ? 'Peças Únicas de Atelier &nbsp;•&nbsp; Finalize na Vinted ou diretamente por WhatsApp'
      : 'Peças Únicas de Atelier &nbsp;•&nbsp; Compra Segura na Vinted &nbsp;•&nbsp; Atendimento por WhatsApp brevemente';

    const ann = document.getElementById('loja-announcement-bar');
    if (ann) ann.innerHTML = avisoTopo;

    const zapFooterEl = document.getElementById('footer-status-whatsapp');
    if (zapFooterEl) {
      zapFooterEl.innerHTML = whatsappAtivo
        ? '<span class="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Disponível</span>'
        : '<span class="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-800">Indisponível de momento</span>';
    }
  }

  function atualizarCategoriasNavegacao() {
    const cats = AtelierLoja.getCategoriasComTodas();
    const footerList = document.getElementById('footer-links-categorias');
    if (footerList) {
      footerList.innerHTML =
        cats
          .map(
            c =>
              `<li><button type="button" onclick="AtelierUI.aoClicarCategoriaHeader('${AtelierLoja.escapeHtml(c.id)}')" class="hover:text-stone-950 transition-colors text-left">${AtelierLoja.escapeHtml(c.label)}</button></li>`
          )
          .join('') +
        '<li><button type="button" onclick="AtelierUI.abrirDrawerFavoritos()" class="hover:text-stone-950 transition-colors text-left">Os Meus Favoritos</button></li>';
    }

    const mobileCats = document.getElementById('mobile-nav-categorias');
    if (mobileCats) {
      mobileCats.innerHTML = cats
        .map(
          c =>
            `<button type="button" onclick="AtelierUI.aoClicarCategoriaHeader('${AtelierLoja.escapeHtml(c.id)}')" class="text-left py-1.5 hover:text-[#b8933a]">${AtelierLoja.escapeHtml(c.label)}</button>`
        )
        .join('');
    }
  }

  function montarShell(opcoes = {}) {
    _opcoesShell = Object.assign({ pagina: 'home', onPesquisa: null, onCategoria: null }, opcoes);

    const headerMount = document.getElementById('loja-header-mount');
    if (headerMount) {
      headerMount.innerHTML = `
        <div id="loja-announcement-bar" class="bg-[#171614] text-[#f5f0e6] text-[11px] sm:text-xs tracking-[0.14em] uppercase text-center py-2 px-4"></div>
        <header class="w-full bg-[#faf8f4]/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-40">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 grid grid-cols-3 items-center">
            <div class="flex items-center gap-4">
              <button type="button" onclick="AtelierUI.abrirMenuMobile()" aria-label="Abrir menu" class="md:hidden p-2 -ml-2 text-stone-800 hover:text-[#b8933a] transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
              <nav class="hidden md:flex items-center gap-6 text-xs font-medium tracking-[0.14em] uppercase text-stone-700">
                <a href="index.html#colecao" class="hover:text-[#b8933a] transition-colors whitespace-nowrap">Coleção</a>
                <a href="index.html#como-comprar" class="hover:text-[#b8933a] transition-colors whitespace-nowrap">Como Comprar</a>
                <a href="index.html#atelier" class="hover:text-[#b8933a] transition-colors whitespace-nowrap">O Atelier</a>
              </nav>
            </div>

            <div class="flex justify-center">
              <a href="index.html" class="inline-flex items-center py-1" title="Eva Leite Atelier — Página Inicial">
                <img src="logo.png" alt="Eva Leite Atelier" class="h-10 sm:h-12 md:h-14 object-contain mix-blend-multiply">
              </a>
            </div>

            <div class="flex items-center justify-end gap-1 sm:gap-2.5">
              <button type="button" onclick="AtelierUI.togglePesquisaHeader()" aria-label="Pesquisar peças" title="Pesquisar peças"
                class="p-2 rounded-full text-stone-700 hover:bg-stone-200/60 hover:text-stone-950 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path stroke-linecap="round" stroke-linejoin="round" d="m20 20-3.5-3.5"></path>
                </svg>
              </button>

              <button type="button" onclick="AtelierUI.abrirDrawerFavoritos()" aria-label="Abrir favoritos" title="Os Meus Favoritos"
                class="relative p-2 rounded-full text-stone-700 hover:bg-stone-200/60 hover:text-stone-950 transition-colors">
                ${svgHeart(false, 'w-5 h-5')}
                <span id="fav-badge-count" class="hidden absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#171614] text-white text-[10px] font-semibold flex items-center justify-center">0</span>
              </button>

              <a href="${AtelierLoja.CONFIG.instagramUrl}" target="_blank" rel="noopener noreferrer" aria-label="Instagram Eva Leite Atelier" title="Siga-nos no Instagram"
                class="p-2 rounded-full text-stone-700 hover:bg-stone-200/60 hover:text-[#b8933a] transition-colors">
                ${svgInstagram('w-5 h-5')}
              </a>
            </div>
          </div>

          <div id="header-search-bar" class="hidden border-t border-stone-200/80 bg-white/95 px-4 py-3">
            <form onsubmit="AtelierUI.submeterPesquisaHeader(event)" class="max-w-2xl mx-auto flex items-center gap-2">
              <div class="relative flex-1">
                <input type="search" id="header-search-input" placeholder="Pesquisar por vestido, blazer, mala..."
                  class="w-full pl-4 pr-10 py-2.5 rounded-full border border-stone-300 bg-[#faf8f4] text-sm text-stone-900 focus:outline-none focus:border-[#171614]">
              </div>
              <button type="submit" class="px-5 py-2.5 rounded-full bg-[#171614] text-white text-xs font-medium uppercase tracking-wider hover:bg-stone-800 transition-colors">
                Pesquisar
              </button>
            </form>
          </div>
        </header>`;
    }

    const footerMount = document.getElementById('loja-footer-mount');
    if (footerMount) {
      const anoAtual = new Date().getFullYear();
      footerMount.innerHTML = `
        <footer class="bg-[#f3efe7] border-t border-stone-200/90 mt-auto text-stone-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <img src="logo.png" alt="Eva Leite Atelier" class="h-11 object-contain mix-blend-multiply mb-4">
              <p class="text-sm text-stone-600 leading-relaxed max-w-sm">
                Curadoria de moda autoral e peças exclusivas confecionadas com identidade, cor e acabamento artesanal.
              </p>
              <a href="${AtelierLoja.CONFIG.instagramUrl}" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-2 mt-4 text-xs font-semibold tracking-wider uppercase text-stone-900 hover:text-[#b8933a] transition-colors">
                ${svgInstagram('w-4 h-4')}
                <span>${AtelierLoja.CONFIG.instagramHandle}</span>
              </a>
            </div>

            <div>
              <h3 class="text-xs font-semibold tracking-[0.16em] uppercase text-stone-900 mb-4">Coleções</h3>
              <ul id="footer-links-categorias" class="space-y-2.5 text-sm text-stone-600"></ul>
            </div>

            <div>
              <h3 class="text-xs font-semibold tracking-[0.16em] uppercase text-stone-900 mb-4">Canais de Compra</h3>
              <div class="space-y-3 text-sm">
                <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/80 border border-stone-200/80">
                  <span class="font-medium text-stone-800">Compra pela Vinted</span>
                  <span class="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Ativo</span>
                </div>
                <div class="flex items-center justify-between gap-2 p-3 rounded-xl bg-white/80 border border-stone-200/80">
                  <span class="font-medium text-stone-800">Atendimento WhatsApp</span>
                  <span id="footer-status-whatsapp"></span>
                </div>
              </div>
            </div>
          </div>

          <div class="border-t border-stone-200/80 py-5 px-4 text-center text-xs text-stone-500">
            <p>&copy; <span id="ano-atual">${anoAtual}</span> Eva Leite Atelier. Todos os direitos reservados.</p>
          </div>
        </footer>`;
    }

    const overlaysMount = document.getElementById('loja-overlays-mount');
    if (overlaysMount) {
      overlaysMount.innerHTML = `
        <div id="drawer-menu-mobile" class="drawer-root fixed inset-0 z-50 flex">
          <div onclick="AtelierUI.fecharMenuMobile()" class="fixed inset-0 bg-black/45 backdrop-blur-[2px]"></div>
          <aside class="drawer-panel-left relative w-80 max-w-[85vw] bg-[#faf8f4] h-full shadow-2xl flex flex-col z-10 p-6">
            <div class="flex items-center justify-between pb-4 border-b border-stone-200">
              <img src="logo.png" alt="Eva Leite Atelier" class="h-10 object-contain mix-blend-multiply">
              <button type="button" onclick="AtelierUI.fecharMenuMobile()" aria-label="Fechar menu" class="p-2 text-stone-500 hover:text-stone-900">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div class="py-6 flex flex-col gap-3 text-sm font-medium text-stone-800">
              <span class="text-[11px] uppercase tracking-[0.16em] text-stone-400">Catálogo</span>
              <div id="mobile-nav-categorias" class="flex flex-col gap-1.5"></div>
              <hr class="my-2 border-stone-200">
              <a href="index.html#como-comprar" onclick="AtelierUI.fecharMenuMobile()" class="py-1.5 hover:text-[#b8933a]">Como Comprar</a>
              <a href="index.html#atelier" onclick="AtelierUI.fecharMenuMobile()" class="py-1.5 hover:text-[#b8933a]">Sobre o Atelier</a>
              <button type="button" onclick="AtelierUI.fecharMenuMobile(); AtelierUI.abrirDrawerFavoritos()" class="text-left py-1.5 hover:text-[#b8933a]">Os Meus Favoritos</button>
            </div>
            <div class="mt-auto pt-4 border-t border-stone-200">
              <a href="${AtelierLoja.CONFIG.instagramUrl}" target="_blank" rel="noopener noreferrer"
                class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-800 hover:text-[#b8933a]">
                ${svgInstagram('w-4 h-4')}
                <span>${AtelierLoja.CONFIG.instagramHandle}</span>
              </a>
            </div>
          </aside>
        </div>

        <div id="drawer-favoritos" class="drawer-root fixed inset-0 z-50 flex justify-end">
          <div onclick="AtelierUI.fecharDrawerFavoritos()" class="fixed inset-0 bg-black/45 backdrop-blur-[2px]"></div>
          <aside class="drawer-panel-right relative w-full max-w-md bg-[#faf8f4] h-full shadow-2xl flex flex-col z-10">
            <div class="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-white">
              <div>
                <h2 class="text-lg font-semibold text-stone-900">Os Meus Favoritos</h2>
                <p class="text-xs text-stone-500">Peças guardadas para ver ou concluir mais tarde</p>
              </div>
              <button type="button" onclick="AtelierUI.fecharDrawerFavoritos()" aria-label="Fechar favoritos" class="p-2 rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div id="drawer-fav-lista" class="flex-1 overflow-y-auto p-5 space-y-3"></div>

            <div id="drawer-fav-resumo" class="hidden border-t border-stone-200 bg-white p-5 space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-stone-600">Valor total estimado</span>
                <span id="drawer-fav-total" class="text-lg font-semibold text-stone-900">0,00 €</span>
              </div>
              <p class="text-xs text-stone-500">Abra cada peça para escolher entre finalizar pela Vinted ou pelo WhatsApp.</p>
            </div>
          </aside>
        </div>

        <div id="atelier-toast" role="status" aria-live="polite"
          class="fixed bottom-6 left-1/2 z-[70] px-5 py-3 rounded-full bg-[#171614] text-white text-xs sm:text-sm font-medium shadow-xl flex items-center gap-2 whitespace-nowrap">
          <span class="w-2 h-2 rounded-full bg-[#b8933a]"></span>
          <span id="atelier-toast-text"></span>
        </div>`;
    }

    atualizarEstadoCanaisShell();
    atualizarCategoriasNavegacao();
    atualizarBadgeFavoritos();
    renderListaFavoritos();
  }

  function renderCardProduto(produto, idx, opcoes = {}) {
    const mostrarNovo = opcoes.mostrarBadgeNovo !== false && idx < 3;
    const cat = AtelierLoja.classificarCategoria(produto);
    const idStr = AtelierLoja.escapeHtml(produto.id);
    const nome = AtelierLoja.escapeHtml(produto.nome);
    const desc = AtelierLoja.escapeHtml(String(produto.descricao || '').trim());
    const preco = AtelierLoja.escapeHtml(AtelierLoja.formatarPreco(produto.preco));
    const urlProduto = AtelierLoja.getUrlProduto(produto);
    const imgUrl = AtelierLoja.normalizarUrlImagem(produto.imagem_url);
    const temVinted = AtelierLoja.isVintedDisponivel(produto);
    const temZap = AtelierLoja.isWhatsAppDisponivel();
    const favorito = AtelierLoja.isFavorito(produto.id);

    const badgeEsquerda = mostrarNovo
      ? '<span class="px-2.5 py-1 rounded-full bg-[#171614]/90 text-white text-[10px] font-semibold tracking-wider uppercase backdrop-blur-sm">Novidade</span>'
      : `<span class="px-2.5 py-1 rounded-full bg-white/90 text-stone-800 text-[10px] font-medium tracking-wider uppercase backdrop-blur-sm">${AtelierLoja.escapeHtml(cat.label)}</span>`;

    const chipCanais = `
      <div class="flex items-center gap-1.5 flex-wrap justify-end">
        ${temVinted ? '<span class="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-medium border border-stone-200/80">Vinted</span>' : ''}
        ${temZap
          ? '<span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200/80">WhatsApp</span>'
          : '<span class="px-2 py-0.5 rounded-full bg-stone-50 text-stone-400 text-[10px] border border-stone-200/60" title="Atendimento por WhatsApp disponível brevemente">WhatsApp brevemente</span>'
        }
      </div>`;

    return `
      <article class="produto-card flex flex-col h-full overflow-hidden group">
        <a href="${urlProduto}" class="produto-card-media relative block aspect-[3/4] bg-[#efebe3] overflow-hidden">
          ${imgUrl
            ? `<img src="${AtelierLoja.escapeHtml(imgUrl)}" alt="${nome}" loading="lazy" class="w-full h-full object-cover" onerror="this.style.opacity='0.25'">`
            : `<div class="w-full h-full flex items-center justify-center text-stone-400 text-xs">Sem fotografia</div>`
          }

          <div class="absolute top-3 left-3 z-10 pointer-events-none">
            ${badgeEsquerda}
          </div>

          <button type="button"
            data-fav-btn="${idStr}"
            aria-label="Guardar ${nome} nos favoritos"
            aria-pressed="${favorito ? 'true' : 'false'}"
            onclick="AtelierUI.aoClicarFavorito(event, '${idStr}')"
            class="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center transition-all hover:scale-105 ${favorito ? 'text-rose-600' : 'text-stone-700'}">
            ${svgHeart(favorito, 'w-4 h-4')}
          </button>

          <div class="quick-cta hidden sm:flex absolute inset-x-3 bottom-3 justify-center pointer-events-none">
            <span class="w-full py-2.5 px-4 rounded-xl bg-white/95 backdrop-blur-md text-[#171614] text-xs font-semibold uppercase tracking-wider text-center shadow-lg">
              Ver Página da Peça →
            </span>
          </div>
        </a>

        <div class="p-3.5 sm:p-4 flex flex-col flex-grow">
          <span class="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-stone-400 font-medium">${AtelierLoja.escapeHtml(cat.label)}</span>
          <a href="${urlProduto}" class="mt-1 block group-hover:text-[#b8933a] transition-colors">
            <h3 class="text-sm sm:text-base font-semibold text-stone-900 line-clamp-2 leading-snug" title="${nome}">${nome}</h3>
          </a>
          ${desc ? `<p class="hidden sm:line-clamp-2 text-xs text-stone-500 mt-1.5 leading-relaxed">${desc}</p>` : ''}

          <div class="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-stone-100">
            <span class="text-base sm:text-lg font-semibold text-stone-950 whitespace-nowrap">${preco || 'Sob consulta'}</span>
            ${chipCanais}
          </div>
        </div>
      </article>`;
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      fecharMenuMobile();
      fecharDrawerFavoritos();
    }
  });

  global.AtelierUI = {
    svgInstagram,
    svgWhatsApp,
    svgHeart,
    montarShell,
    atualizarEstadoCanaisShell,
    atualizarCategoriasNavegacao,
    registrarProdutos,
    obterProdutoMemoria,
    mostrarToast,
    copiarTextoComFeedback,
    atualizarBadgeFavoritos,
    atualizarBotoesFavoritoNaPagina,
    aoClicarFavorito,
    removerFavoritoDrawer,
    abrirDrawerFavoritos,
    fecharDrawerFavoritos,
    abrirMenuMobile,
    fecharMenuMobile,
    togglePesquisaHeader,
    submeterPesquisaHeader,
    aoClicarCategoriaHeader,
    renderCardProduto
  };
})(window);
