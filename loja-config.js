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
    instagramHandle: '@evaleiteaatelier',
    instagramUrl: 'https://www.instagram.com/evaleiteaatelier?knvt=MXc3aThjeXlhNndtdA==',
    dominioPublico: 'https://evaleiteatelier.com',
    // Configuração predefinida do WhatsApp (sincronizada também com o painel interno Gestão do Site).
    // O canal já está ativo; assim que um número válido for guardado no painel, os botões ficam funcionais de imediato.
    whatsapp: {
      ativo: true,
      numero: '',
      mensagemPadrao: 'Olá! Vi esta peça na loja do Eva Leite Atelier e gostaria de finalizar a compra por WhatsApp:'
    },
    atelierInfo: {
      email: 'evaleiteatelier@gmail.com',
      telefone: '',
      morada: 'Praça de Mouzinho de Albuquerque 113, Loja 126',
      codigoPostal: '4100-359',
      localidade: 'Porto',
      mapsUrl: '',
      horario: 'Segunda a Sexta, 09h00 – 18h00',
      notaAtendimento: 'Atendimento presencial e levantamento de encomendas diretamente no atelier, sem necessidade de marcação prévia.',
      entidadeLegal: 'Eva Leite Atelier',
      nif: ''
    }
  };

  const FAVORITOS_STORAGE_KEY = 'eva_atelier_favoritos_v1';
  const COOKIES_STORAGE_KEY = 'eva_atelier_cookies_v1';
  let _supabaseClient = null;
  let _categoriasDinamicas = CATEGORIAS_PADRAO.map(c => ({ ...c }));
  let _whatsappRemoto = null;
  let _atelierInfoRemoto = null;

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
    let digits = String(raw ?? '').replace(/\D+/g, '');
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    if (digits.length === 9 && /^[29]/.test(digits)) {
      digits = '351' + digits;
    }
    return digits;
  }

  function formatarNumeroWhatsApp(raw) {
    const digits = normalizarNumeroWhatsApp(raw);
    if (!digits) return '';
    if (digits.startsWith('351') && digits.length === 12) {
      const local = digits.slice(3);
      return `+351 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return `+${digits}`;
  }

  function obterConfigWhatsApp() {
    const base = ATELIER_CONFIG.whatsapp || {};
    if (!_whatsappRemoto || typeof _whatsappRemoto !== 'object') {
      return {
        ...base,
        numeroFormatado: formatarNumeroWhatsApp(base.numero)
      };
    }
    const numeroFinal = String(_whatsappRemoto.numero || base.numero || '');
    const desativadoManual = Boolean(_whatsappRemoto.desativadoManual);
    const ativoResolvido = numeroFinal
      ? Boolean(_whatsappRemoto.ativo)
      : (desativadoManual ? false : true);
    return {
      ativo: ativoResolvido,
      numero: numeroFinal,
      numeroFormatado: formatarNumeroWhatsApp(numeroFinal),
      mensagemPadrao: String(_whatsappRemoto.mensagemPadrao || base.mensagemPadrao || '')
    };
  }

  function isWhatsAppDisponivel() {
    const cfg = obterConfigWhatsApp();
    const digits = normalizarNumeroWhatsApp(cfg.numero);
    return Boolean(cfg.ativo && digits.length >= 9);
  }

  function isWhatsAppConfiguradoPendente() {
    const cfg = obterConfigWhatsApp();
    const digits = normalizarNumeroWhatsApp(cfg.numero);
    return Boolean(cfg.ativo && digits.length < 9);
  }

  function obterInfoAtelier() {
    const base = ATELIER_CONFIG.atelierInfo || {};
    const rem = _atelierInfoRemoto && typeof _atelierInfoRemoto === 'object' ? _atelierInfoRemoto : {};
    const pick = (k, fallback = '') => String(rem[k] !== undefined && rem[k] !== null ? rem[k] : (base[k] || fallback)).trim();

    const email = pick('email', 'evaleiteatelier@gmail.com');
    const telefoneManual = pick('telefone');
    const zapCfg = obterConfigWhatsApp();
    const zapFormatado = zapCfg.ativo && normalizarNumeroWhatsApp(zapCfg.numero).length >= 9 ? zapCfg.numeroFormatado : '';
    const telefoneExibicao = zapFormatado || telefoneManual;

    const morada = pick('morada');
    const codigoPostal = pick('codigoPostal');
    const localidade = pick('localidade', 'Portugal');
    const partesMorada = [morada, [codigoPostal, localidade].filter(Boolean).join(' ')].filter(Boolean);
    const moradaCompleta = partesMorada.join(' • ');

    const mapsUrlRaw = pick('mapsUrl');
    let mapsLink = validarUrlHttp(mapsUrlRaw);
    if (!mapsLink && morada) {
      mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partesMorada.join(', '))}`;
    }

    return {
      email,
      telefone: telefoneManual,
      telefoneExibicao,
      morada,
      codigoPostal,
      localidade,
      moradaCompleta,
      mapsUrl: validarUrlHttp(mapsUrlRaw),
      mapsLink,
      horario: pick('horario', 'Segunda a Sexta, 09h00 – 18h00'),
      notaAtendimento: pick('notaAtendimento', 'Atendimento presencial e levantamento de encomendas diretamente no atelier, sem necessidade de marcação prévia.'),
      entidadeLegal: pick('entidadeLegal', 'Eva Leite Atelier'),
      nif: pick('nif')
    };
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
    const infoPreco = obterPrecosProduto(produto);
    const preco = infoPreco.emPromo
      ? `${infoPreco.precoAtualFormatado} (em promoção; antes ${infoPreco.precoOriginalFormatado})`
      : infoPreco.precoAtualFormatado;
    const linkPeca = urlCustom || getUrlAbsolutaProduto(produto);
    const linhas = [
      cfg.mensagemPadrao,
      `• Peça: ${nome}`,
      preco ? `• Valor: ${preco}` : '',
      linkPeca ? `• Ligação: ${linkPeca}` : ''
    ].filter(Boolean);
    return `https://wa.me/${digits}?text=${encodeURIComponent(linhas.join('\n'))}`;
  }

  function gerarLinkWhatsAppGeral(mensagemCustom) {
    if (!isWhatsAppDisponivel()) return '';
    const cfg = obterConfigWhatsApp();
    const digits = normalizarNumeroWhatsApp(cfg.numero);
    const texto = String(mensagemCustom || 'Olá! Gostaria de falar com o Eva Leite Atelier sobre uma peça.').trim();
    return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
  }

  function gerarLinkWhatsAppFavoritos(produtos) {
    if (!isWhatsAppDisponivel()) return '';
    const lista = Array.isArray(produtos) ? produtos.filter(Boolean) : [];
    if (lista.length === 0) return gerarLinkWhatsAppGeral();
    if (lista.length === 1) return gerarLinkWhatsApp(lista[0]);
    const cfg = obterConfigWhatsApp();
    const digits = normalizarNumeroWhatsApp(cfg.numero);
    let total = 0;
    const itensTexto = lista.map((p, i) => {
      const info = obterPrecosProduto(p);
      if (Number.isFinite(Number(info.precoAtual))) total += Number(info.precoAtual);
      const precoTxt = info.precoAtualFormatado ? ` (${info.precoAtualFormatado})` : '';
      return `${i + 1}. ${String(p.nome || 'Peça').trim()}${precoTxt} — ${getUrlAbsolutaProduto(p)}`;
    });
    const linhas = [
      'Olá! Gostaria de saber mais ou finalizar os seguintes favoritos no Eva Leite Atelier:',
      ...itensTexto,
      total > 0 ? `Total estimado: ${formatarPreco(total)}` : ''
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
    const produtoImagensExtras =
      parsed && parsed.produtoImagensExtras && typeof parsed.produtoImagensExtras === 'object'
        ? parsed.produtoImagensExtras
        : {};
    const produtoAcessorios =
      parsed && parsed.produtoAcessorios && typeof parsed.produtoAcessorios === 'object'
        ? parsed.produtoAcessorios
        : {};
    const produtoPromos =
      parsed && parsed.produtoPromos && typeof parsed.produtoPromos === 'object'
        ? parsed.produtoPromos
        : {};

    if (parsed && parsed.whatsapp && typeof parsed.whatsapp === 'object') {
      _whatsappRemoto = parsed.whatsapp;
    } else {
      _whatsappRemoto = null;
    }
    if (parsed && parsed.atelierInfo && typeof parsed.atelierInfo === 'object') {
      _atelierInfoRemoto = parsed.atelierInfo;
    } else {
      _atelierInfoRemoto = null;
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
        const rawExtras = Array.isArray(produtoImagensExtras[String(row.id)])
          ? produtoImagensExtras[String(row.id)]
          : [];
        const capaNorm = normalizarUrlImagem(row.imagem_url);
        const galeria = [];
        if (capaNorm) galeria.push(capaNorm);
        rawExtras.forEach(u => {
          const norm = normalizarUrlImagem(u);
          if (norm && !galeria.includes(norm)) galeria.push(norm);
        });
        const rawPromo = produtoPromos[String(row.id)];
        const promoResolvida =
          rawPromo && typeof rawPromo === 'object' && rawPromo.ativo
            ? { ativo: true, precoPromo: Number(rawPromo.precoPromo) }
            : { ativo: false, precoPromo: null };
        return {
          ...row,
          _categoriaResolvida: categoriaResolvida,
          _bloqueado: bloqueadosSet.has(String(row.id)),
          _imagens: galeria,
          _promo: promoResolvida
        };
      });

    const produtosVisiveis = produtosReais.filter(p => !p._bloqueado);
    const visiveisPorId = new Map(produtosVisiveis.map(p => [String(p.id), p]));

    produtosReais.forEach(p => {
      const listaRaw = Array.isArray(produtoAcessorios[String(p.id)])
        ? produtoAcessorios[String(p.id)]
        : [];
      const resolvidos = [];
      listaRaw.forEach(item => {
        if (!item || typeof item !== 'object') return;
        if (item.tipo === 'interno') {
          const alvo = visiveisPorId.get(String(item.produtoId));
          if (alvo && String(alvo.id) !== String(p.id)) {
            const pAlvo = obterPrecosProduto(alvo);
            resolvidos.push({
              tipo: 'interno',
              produtoId: String(alvo.id),
              nome: alvo.nome || 'Peça do Atelier',
              preco: pAlvo.precoAtual,
              precoOriginal: pAlvo.emPromo ? pAlvo.precoOriginal : null,
              emPromo: pAlvo.emPromo,
              imagemUrl: normalizarUrlImagem(alvo.imagem_url),
              linkUrl: getUrlProduto(alvo)
            });
          }
        } else if (item.tipo === 'externo') {
          const nome = String(item.nome || '').trim();
          const imgUrl = normalizarUrlImagem(item.imagemUrl || item.imagem_url);
          const linkUrl = validarUrlHttp(item.linkUrl || item.link_url || item.url);
          if (nome && imgUrl && linkUrl) {
            resolvidos.push({
              tipo: 'externo',
              nome,
              preco: item.preco,
              precoOriginal: null,
              emPromo: false,
              imagemUrl: imgUrl,
              linkUrl
            });
          }
        }
      });
      p._acessorios = resolvidos;
    });

    return {
      produtosReais,
      produtosVisiveis,
      categorias,
      bloqueadosSet,
      produtoCategorias,
      produtoImagensExtras,
      produtoAcessorios,
      produtoPromos,
      whatsapp: obterConfigWhatsApp(),
      atelierInfo: obterInfoAtelier()
    };
  }

  function obterPrecosProduto(produto) {
    const precoOrig =
      produto && produto.preco !== null && produto.preco !== undefined && produto.preco !== ''
        ? Number(produto.preco)
        : NaN;
    const origValido = Number.isFinite(precoOrig) ? precoOrig : null;
    const promo = produto && produto._promo && typeof produto._promo === 'object' ? produto._promo : null;
    const promoNum =
      promo && promo.ativo && promo.precoPromo !== null && promo.precoPromo !== undefined && promo.precoPromo !== ''
        ? Number(promo.precoPromo)
        : NaN;
    const emPromo = Boolean(
      promo &&
      promo.ativo &&
      Number.isFinite(promoNum) &&
      promoNum >= 0 &&
      (origValido === null || promoNum < origValido)
    );
    const precoAtual = emPromo ? promoNum : origValido;
    let descontoPct = null;
    if (emPromo && origValido && origValido > 0) {
      descontoPct = Math.round(((origValido - promoNum) / origValido) * 100);
    }
    return {
      emPromo,
      precoOriginal: origValido,
      precoAtual,
      precoOriginalFormatado: origValido !== null ? formatarPreco(origValido) : '',
      precoAtualFormatado: precoAtual !== null ? formatarPreco(precoAtual) : '',
      descontoPercentagem: descontoPct && descontoPct > 0 ? descontoPct : null
    };
  }

  function obterGaleriaProduto(produto) {
    if (!produto) return [];
    if (Array.isArray(produto._imagens) && produto._imagens.length > 0) {
      return produto._imagens;
    }
    const capa = normalizarUrlImagem(produto.imagem_url);
    return capa ? [capa] : [];
  }

  function obterAcessoriosProduto(produto) {
    if (!produto || !Array.isArray(produto._acessorios)) return [];
    return produto._acessorios;
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

  function getConsentimentoCookies() {
    try {
      const raw = global.localStorage.getItem(COOKIES_STORAGE_KEY);
      if (!raw) return { decidido: false, essenciais: true, preferencias: false, data: null };
      const parsed = JSON.parse(raw);
      return {
        decidido: Boolean(parsed && parsed.decidido),
        essenciais: true,
        preferencias: Boolean(parsed && parsed.preferencias),
        data: parsed && parsed.data ? String(parsed.data) : null
      };
    } catch (_) {
      return { decidido: false, essenciais: true, preferencias: false, data: null };
    }
  }

  function salvarConsentimentoCookies(preferenciasAtivas) {
    const payload = {
      decidido: true,
      essenciais: true,
      preferencias: Boolean(preferenciasAtivas),
      data: new Date().toISOString()
    };
    try {
      global.localStorage.setItem(COOKIES_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
      // Ignora erro de quota ou modo privado restrito
    }
    return payload;
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
    formatarNumeroWhatsApp,
    obterConfigWhatsApp,
    isWhatsAppDisponivel,
    isWhatsAppConfiguradoPendente,
    obterInfoAtelier,
    isVintedDisponivel,
    formatarPreco,
    slugify,
    getUrlProduto,
    getUrlAbsolutaProduto,
    gerarLinkWhatsApp,
    gerarLinkWhatsAppGeral,
    gerarLinkWhatsAppFavoritos,
    classificarCategoriaAutomatica,
    classificarCategoria,
    getCategoriasComTodas,
    ehRegistoConfig,
    extrairConfigDeLinhas,
    obterGaleriaProduto,
    obterAcessoriosProduto,
    obterPrecosProduto,
    carregarEstadoLoja,
    getFavoritos,
    isFavorito,
    toggleFavorito,
    removerFavorito,
    getConsentimentoCookies,
    salvarConsentimentoCookies
  };
})(window);
