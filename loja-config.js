/**
 * Configuração central e utilitários partilhados da loja Eva Leite Atelier (pt-PT).
 * ATENÇÃO: Utilizar exclusivamente a chave pública (anon) do Supabase no frontend.
 * Nunca inserir chaves service_role em ficheiros públicos.
 */
(function (global) {
  'use strict';

  const SUPABASE_URL = 'https://bqjqwuphjvbmxjfcezos.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxanF3dXBoanZibXhqZmNlem9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTI1NjQsImV4cCI6MjA4OTU4ODU2NH0.manlyhsYXxUTK-llwa174wmhQ0HSVtuHTK387jiEMNk';
  const CONFIG_ROW_MARKER = '__ATELIER_SITE_CONFIG__';

  const CATEGORIAS_PADRAO = [
    { id: 'vestidos', label: 'Vestidos & Túnicas' },
    { id: 'alfaiataria', label: 'Blazers & Peças' },
    { id: 'acessorios', label: 'Malas & Acessórios' }
  ];

  const ATELIER_CONFIG = {
    nome: 'Eva Leite Atelier',
    tagline: 'Moda Autoral & Peças Únicas',
    instagramHandle: '@eva_leite_atelier',
    instagramUrl: 'https://www.instagram.com/eva_leite_atelier/',
    dominioPublico: 'https://evaleiteatelier.com',
    // Configuração predefinida do WhatsApp (sincronizada também com o painel interno Gestão do Site).
    // Quando ativo: false ou sem número válido, o canal surge como "Indisponível de momento".
    whatsapp: {
      ativo: false,
      numero: '',
      mensagemPadrao: 'Olá! Vi esta peça na loja do Eva Leite Atelier e gostaria de finalizar a compra por WhatsApp:'
    }
  };

  const FAVORITOS_STORAGE_KEY = 'eva_atelier_favoritos_v1';
  let _supabaseClient = null;
  let _categoriasDinamicas = CATEGORIAS_PADRAO.map(c => ({ ...c }));
  let _whatsappRemoto = null;

  function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof global.supabase !== 'undefined' && typeof global.supabase.createClient === 'function') {
      _supabaseClient = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return _supabaseClient;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function validarUrlHttp(url) {
    const clean = String(url ?? '').trim();
    if (!clean) return '';
    try {
      const parsed = new URL(clean);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed.href;
      }
    } catch (_) {
      return '';
    }
    return '';
  }

  function normalizarUrlImagem(urlBruta) {
    const raw = String(urlBruta ?? '').trim();
    if (!raw || raw === '__config__') return '';
    if (/^data:image\/(png|jpeg|jpg|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i.test(raw)) {
      return raw.replace(/\s+/g, '');
    }
    const driveMatch =
      raw.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
      raw.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1200`;
    }
    return validarUrlHttp(raw);
  }

  function normalizarNumeroWhatsApp(raw) {
    return String(raw ?? '').replace(/\D+/g, '');
  }

  function obterConfigWhatsApp() {
    const base = ATELIER_CONFIG.whatsapp || {};
    if (!_whatsappRemoto || typeof _whatsappRemoto !== 'object') return { ...base };
    return {
      ativo: Boolean(_whatsappRemoto.ativo),
      numero: String(_whatsappRemoto.numero || base.numero || ''),
      mensagemPadrao: String(_whatsappRemoto.mensagemPadrao || base.mensagemPadrao || '')
    };
  }

  function isWhatsAppDisponivel() {
    const cfg = obterConfigWhatsApp();
    const digits = normalizarNumeroWhatsApp(cfg.numero);
    return Boolean(cfg.ativo && digits.length >= 9);
  }

  function isVintedDisponivel(produto) {
    return Boolean(validarUrlHttp(produto && produto.vinted_url));
  }

  function formatarPreco(preco) {
    if (preco === null || preco === undefined || preco === '') return '';
    const numero = Number(preco);
    if (!Number.isFinite(numero)) return '';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR'
    }).format(numero);
  }

  function slugify(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72);
  }

  function getUrlProduto(produto) {
    if (!produto || produto.id === undefined || produto.id === null) return 'index.html';
    const slug = slugify(produto.nome);
    return slug
      ? `produto.html?id=${encodeURIComponent(produto.id)}&peca=${encodeURIComponent(slug)}`
      : `produto.html?id=${encodeURIComponent(produto.id)}`;
  }

  function getUrlAbsolutaProduto(produto) {
    const rel = getUrlProduto(produto);
    try {
      if (global.location && /^https?:/i.test(global.location.protocol)) {
        const base = global.location.href.split('?')[0].split('#')[0].replace(/[^/]*$/, '');
        return base + rel;
      }
    } catch (_) {
      // Fallback para domínio público configurado
    }
    return `${ATELIER_CONFIG.dominioPublico.replace(/\/+$/, '')}/${rel}`;
  }

  function gerarLinkWhatsApp(produto, urlCustom) {
    if (!isWhatsAppDisponivel()) return '';
    const cfg = obterConfigWhatsApp();
    const digits = normalizarNumeroWhatsApp(cfg.numero);
    const nome = String(produto && produto.nome ? produto.nome : 'Peça do Atelier').trim();
    const preco = formatarPreco(produto && produto.preco);
    const linkPeca = urlCustom || getUrlAbsolutaProduto(produto);
    const linhas = [
      cfg.mensagemPadrao,
      `• Peça: ${nome}`,
      preco ? `• Valor: ${preco}` : '',
      linkPeca ? `• Ligação: ${linkPeca}` : ''
    ].filter(Boolean);
    return `https://wa.me/${digits}?text=${encodeURIComponent(linhas.join('\n'))}`;
  }

  function classificarCategoriaAutomatica(produto) {
    const texto = `${produto && produto.nome ? produto.nome : ''} ${produto && produto.descricao ? produto.descricao : ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (/\b(mala|bolsa|carteira|necessaire|clutch|mochila|cinto|chapeu|lenco|acessorio|brinco|colar)\b/.test(texto)) {
      return { id: 'acessorios', label: 'Malas & Acessórios' };
    }
    if (/\b(vestido|tunica)\b/.test(texto)) {
      return { id: 'vestidos', label: 'Vestidos & Túnicas' };
    }
    if (/\b(blazer|casaco|poncho|calca|culotte|saia|blusa|camisa|fato|conjunto|kimono|colete|top)\b/.test(texto)) {
      return { id: 'alfaiataria', label: 'Blazers & Peças' };
    }
    return { id: 'alfaiataria', label: 'Blazers & Peças' };
  }

  function classificarCategoria(produto) {
    if (produto && produto._categoriaResolvida) {
      return produto._categoriaResolvida;
    }
    return classificarCategoriaAutomatica(produto);
  }

  function getCategoriasComTodas() {
    return [{ id: 'todas', label: 'Toda a Coleção' }, ..._categoriasDinamicas];
  }

  function ehRegistoConfig(row) {
    if (!row) return false;
    return row.vinted_url === CONFIG_ROW_MARKER || row.nome === CONFIG_ROW_MARKER;
  }

  function extrairConfigDeLinhas(rows) {
    const lista = Array.isArray(rows) ? rows : [];
    const cfgRow = lista.find(ehRegistoConfig);
    let parsed = null;
    if (cfgRow && cfgRow.descricao) {
      try {
        parsed = JSON.parse(cfgRow.descricao);
      } catch (_) {
        parsed = null;
      }
    }

    const categorias =
      parsed && Array.isArray(parsed.categorias) && parsed.categorias.length > 0
        ? parsed.categorias
            .filter(c => c && c.id && c.label)
            .map(c => ({ id: String(c.id), label: String(c.label) }))
        : CATEGORIAS_PADRAO.map(c => ({ ...c }));

    _categoriasDinamicas = categorias;

    const bloqueadosArr =
      parsed && Array.isArray(parsed.bloqueados) ? parsed.bloqueados.map(String) : [];
    const bloqueadosSet = new Set(bloqueadosArr);
    const produtoCategorias =
      parsed && parsed.produtoCategorias && typeof parsed.produtoCategorias === 'object'
        ? parsed.produtoCategorias
        : {};

    if (parsed && parsed.whatsapp && typeof parsed.whatsapp === 'object') {
      _whatsappRemoto = parsed.whatsapp;
    } else {
      _whatsappRemoto = null;
    }

    const catById = new Map(categorias.map(c => [c.id, c]));
    const produtosReais = lista
      .filter(row => !ehRegistoConfig(row))
      .map(row => {
        const overrideId = produtoCategorias[String(row.id)];
        let categoriaResolvida = null;
        if (overrideId && catById.has(String(overrideId))) {
          categoriaResolvida = catById.get(String(overrideId));
        } else {
          const auto = classificarCategoriaAutomatica(row);
          categoriaResolvida = catById.get(auto.id) || auto;
        }
        return {
          ...row,
          _categoriaResolvida: categoriaResolvida,
          _bloqueado: bloqueadosSet.has(String(row.id))
        };
      });

    const produtosVisiveis = produtosReais.filter(p => !p._bloqueado);

    return {
      produtosReais,
      produtosVisiveis,
      categorias,
      bloqueadosSet,
      produtoCategorias,
      whatsapp: obterConfigWhatsApp()
    };
  }

  async function carregarEstadoLoja(dbClient) {
    const db = dbClient || getSupabase();
    if (!db) throw new Error('Ligação ao servidor indisponível.');
    const { data, error } = await db
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return extrairConfigDeLinhas(data || []);
  }

  function getFavoritos() {
    try {
      const raw = global.localStorage.getItem(FAVORITOS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function salvarFavoritos(ids) {
    try {
      global.localStorage.setItem(FAVORITOS_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids.map(String)))));
    } catch (_) {
      // Ignora erro de quota ou modo privado restrito
    }
  }

  function isFavorito(id) {
    return getFavoritos().includes(String(id));
  }

  function toggleFavorito(id) {
    const key = String(id);
    const atuais = getFavoritos();
    const existe = atuais.includes(key);
    const proximos = existe ? atuais.filter(x => x !== key) : [...atuais, key];
    salvarFavoritos(proximos);
    return !existe;
  }

  function removerFavorito(id) {
    const key = String(id);
    salvarFavoritos(getFavoritos().filter(x => x !== key));
  }

  global.AtelierLoja = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    CONFIG_ROW_MARKER,
    CATEGORIAS_PADRAO,
    CONFIG: ATELIER_CONFIG,
    getSupabase,
    escapeHtml,
    validarUrlHttp,
    normalizarUrlImagem,
    normalizarNumeroWhatsApp,
    obterConfigWhatsApp,
    isWhatsAppDisponivel,
    isVintedDisponivel,
    formatarPreco,
    slugify,
    getUrlProduto,
    getUrlAbsolutaProduto,
    gerarLinkWhatsApp,
    classificarCategoriaAutomatica,
    classificarCategoria,
    getCategoriasComTodas,
    ehRegistoConfig,
    extrairConfigDeLinhas,
    carregarEstadoLoja,
    getFavoritos,
    isFavorito,
    toggleFavorito,
    removerFavorito
  };
})(window);
