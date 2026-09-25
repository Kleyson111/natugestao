(() => {
  'use strict';

  const STORAGE_KEY = 'natugestao-v1';
  const VERSION = 1;
  const SUPABASE_URL = 'https://uspgsnexykcgsaofriig.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_TNmpZs3weKA_2K7a9DrXhQ_tAoKkSX-';
  const AUTH_USERNAME = 'natushop';
  const AUTH_EMAIL = '23014490@uniniltonlins.edu.br';
  const AUTH_STORAGE_KEY = 'natugestao-auth-v1';
  const now = new Date();
  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const monthISO = () => `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const defaultState = () => ({
    version: VERSION,
    business: { name: 'Natushop Produtos Naturais', owner: 'Rita' },
    products: [],
    entries: [],
    sales: [],
    expenses: [],
    expenseCategories: ['Aluguel', 'Energia'],
    updatedAt: new Date().toISOString()
  });

  let state = loadState();
  let deferredInstallPrompt = null;
  let appInitialized = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const qty = (value) => `${Number(value || 0).toLocaleString('pt-BR')} un.`;
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const newId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  function loadAuthSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null'); }
    catch { return null; }
  }
  function saveAuthSession(data) {
    const expiresIn = Math.max(60, Number(data.expires_in || 3600));
    const current = loadAuthSession() || {};
    const session = {
      accessToken: data.access_token || current.accessToken || '',
      refreshToken: data.refresh_token || current.refreshToken || '',
      expiresAt: Date.now() + expiresIn * 1000,
      userId: data.user?.id || current.userId || '',
      email: data.user?.email || current.email || AUTH_EMAIL
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return session;
  }
  function clearAuthSession() { localStorage.removeItem(AUTH_STORAGE_KEY); }
  function authHeaders(token='') {
    const headers = { 'apikey': SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }
  async function refreshAuthSession(refreshToken) {
    if (!refreshToken) return null;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!response.ok) return null;
      return saveAuthSession(await response.json());
    } catch { return null; }
  }
  async function verifyAuthSession() {
    let session = loadAuthSession();
    if (!session) return false;
    if (!session.accessToken || Number(session.expiresAt || 0) < Date.now() + 60000) {
      session = await refreshAuthSession(session.refreshToken);
      if (!session) { clearAuthSession(); return false; }
    }
    try {
      let response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(session.accessToken) });
      if (response.ok) return true;
      session = await refreshAuthSession(session.refreshToken);
      if (!session) { clearAuthSession(); return false; }
      response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: authHeaders(session.accessToken) });
      if (response.ok) return true;
    } catch {
      // Sem internet: só libera se a sessão local ainda estiver dentro da validade.
      if (session.accessToken && Number(session.expiresAt || 0) > Date.now()) return true;
    }
    clearAuthSession();
    return false;
  }
  async function signIn(username, password) {
    if (String(username || '').trim().toLowerCase() !== AUTH_USERNAME) {
      throw new Error('Usuário ou senha incorretos.');
    }
    if (!password) throw new Error('Informe a senha.');
    let response;
    try {
      response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ email: AUTH_EMAIL, password })
      });
    } catch {
      throw new Error('Sem conexão com a internet. Tente novamente.');
    }
    if (!response.ok) {
      let detail = {};
      try { detail = await response.json(); } catch {}
      if (response.status === 400 || response.status === 401) throw new Error('Usuário ou senha incorretos.');
      throw new Error(detail?.msg || detail?.message || 'Não foi possível entrar. Tente novamente.');
    }
    saveAuthSession(await response.json());
    return true;
  }
  async function signOut() {
    const session = loadAuthSession();
    clearAuthSession();
    if (session?.accessToken) {
      try { await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method:'POST', headers: authHeaders(session.accessToken) }); } catch {}
    }
    showLogin();
  }
  function showLogin(message='') {
    document.body.classList.remove('auth-ready');
    document.body.classList.add('auth-locked');
    const msg = $('#loginMsg');
    if (msg) msg.textContent = message;
    const pwd = $('#loginPassword');
    if (pwd) pwd.value = '';
    setTimeout(() => $('#loginUsername')?.focus(), 50);
  }
  function showApp() {
    document.body.classList.remove('auth-locked');
    document.body.classList.add('auth-ready');
    initializeAppOnce();
  }
  function setupAuthEvents() {
    const form = $('#loginForm');
    const button = $('#loginBtn');
    const msg = $('#loginMsg');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      msg.textContent = '';
      button.disabled = true;
      button.textContent = 'Entrando...';
      try {
        await signIn($('#loginUsername').value, $('#loginPassword').value);
        showApp();
      } catch (err) {
        msg.textContent = err?.message || 'Não foi possível entrar.';
      } finally {
        button.disabled = false;
        button.textContent = 'Entrar';
      }
    });
    $('#togglePassword').addEventListener('click', () => {
      const input = $('#loginPassword');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      $('#togglePassword').textContent = showing ? 'Mostrar' : 'Ocultar';
      $('#togglePassword').setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
    });
    $('#logoutBtn').addEventListener('click', signOut);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (err) {
      console.error(err);
      return defaultState();
    }
  }

  function normalizeState(data) {
    const base = defaultState();
    const clean = {
      ...base,
      ...data,
      business: { ...base.business, ...(data?.business || {}) },
      products: Array.isArray(data?.products) ? data.products : [],
      entries: Array.isArray(data?.entries) ? data.entries : [],
      sales: Array.isArray(data?.sales) ? data.sales : [],
      expenses: Array.isArray(data?.expenses) ? data.expenses : [],
      expenseCategories: Array.isArray(data?.expenseCategories) && data.expenseCategories.length ? data.expenseCategories : ['Aluguel','Energia']
    };
    ['Aluguel','Energia'].forEach(c => { if (!clean.expenseCategories.some(x => x.toLowerCase() === c.toLowerCase())) clean.expenseCategories.unshift(c); });
    return clean;
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
  }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function feedback(el, message, type = '') {
    el.textContent = message;
    el.className = `feedback ${type}`.trim();
  }

  function setView(name) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'reports') renderReports();
  }

  function moneyInput(el) { return Math.max(0, Number(el.value || 0)); }
  function intInput(el) { return Math.max(0, Math.floor(Number(el.value || 0))); }

  function productById(id) { return state.products.find(p => p.id === id); }
  function currentStockValue() { return state.products.reduce((sum, p) => sum + Number(p.qty || 0) * Number(p.avgCost || 0), 0); }
  function currentStockQty() { return state.products.reduce((sum, p) => sum + Number(p.qty || 0), 0); }

  function inMonth(date, month) { return typeof date === 'string' && date.slice(0,7) === month; }
  function monthData(month) {
    const sales = state.sales.filter(s => inMonth(s.date, month));
    const expenses = state.expenses.filter(e => inMonth(e.date, month));
    const revenue = sales.reduce((a,s) => a + s.total, 0);
    const cogs = sales.reduce((a,s) => a + s.cogs, 0);
    const expenseTotal = expenses.reduce((a,e) => a + e.value, 0);
    return { sales, expenses, revenue, cogs, gross: revenue - cogs, expenseTotal, result: revenue - cogs - expenseTotal };
  }

  function formatMonth(month) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return '';
    const [y,m] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(y, m-1, 1));
  }

  function renderDashboard() {
    const month = $('#homeMonth').value || monthISO();
    const d = monthData(month);
    $('#monthLabel').textContent = formatMonth(month);
    $('#mRevenue').textContent = brl(d.revenue);
    $('#mCogs').textContent = brl(d.cogs);
    $('#mGross').textContent = brl(d.gross);
    $('#mExpenses').textContent = brl(d.expenseTotal);
    $('#mResult').textContent = brl(d.result);
    $('#mResult').classList.toggle('negative', d.result < 0);
    $('#mStockQty').textContent = qty(currentStockQty());
    $('#mStockValue').textContent = `${brl(currentStockValue())} em custo`;

    const low = state.products.filter(p => Number(p.qty) <= Number(p.minStock));
    $('#lowStockBadge').textContent = low.length;
    $('#lowStockList').classList.toggle('empty', !low.length);
    $('#lowStockList').innerHTML = low.length ? low.map(p => `
      <div class="list-row"><div class="list-main"><strong>${esc(p.name)}</strong><small>mínimo: ${p.minStock} un.</small></div><div class="list-value">${p.qty} un.</div></div>`).join('') : 'Nenhum alerta de estoque.';
  }

  function renderProductSelects() {
    const options = ['<option value="">Selecione</option>', ...state.products.filter(p => p.active !== false).sort((a,b) => a.name.localeCompare(b.name,'pt-BR')).map(p => `<option value="${esc(p.id)}">${esc(p.name)} — ${p.qty} un.</option>`)].join('');
    ['#entryProduct','#saleProduct'].forEach(sel => {
      const el = $(sel); const old = el.value; el.innerHTML = options; if (state.products.some(p => p.id === old && p.active !== false)) el.value = old;
    });
  }

  function renderProducts() {
    const term = ($('#productSearch').value || '').trim().toLowerCase();
    const products = state.products
      .filter(p => p.active !== false)
      .filter(p => !term || `${p.name} ${p.category || ''}`.toLowerCase().includes(term))
      .sort((a,b) => a.name.localeCompare(b.name,'pt-BR'));
    $('#productCount').textContent = `${state.products.filter(p => p.active !== false).length} produto(s)`;
    $('#productList').innerHTML = products.length ? products.map(p => `
      <div class="list-row">
        <div class="list-main">
          <strong>${esc(p.name)}</strong>
          <small>${esc(p.category || 'Sem categoria')} · custo médio ${brl(p.avgCost)} · venda ${brl(p.salePrice)}</small>
          <small>Estoque mínimo: ${p.minStock} un.${p.note ? ` · ${esc(p.note)}` : ''}</small>
          <div class="row-actions">
            <button class="icon-btn" type="button" data-edit-product="${esc(p.id)}">Editar</button>
            <button class="icon-btn danger" type="button" data-deactivate-product="${esc(p.id)}">Desativar</button>
          </div>
        </div>
        <div class="list-value ${Number(p.qty) <= Number(p.minStock) ? 'negative' : ''}">${p.qty} un.</div>
      </div>`).join('') : '<div class="list empty">Nenhum produto encontrado.</div>';
  }

  function renderEntries() {
    const rows = [...state.entries].sort((a,b) => `${b.date}${b.createdAt||''}`.localeCompare(`${a.date}${a.createdAt||''}`)).slice(0,30);
    $('#entryList').innerHTML = rows.length ? rows.map(e => `
      <div class="list-row"><div class="list-main"><strong>${esc(e.productName)}</strong><small>${e.date.split('-').reverse().join('/')} · ${e.qty} un. × ${brl(e.unitCost)}${e.supplier ? ` · ${esc(e.supplier)}` : ''}</small></div><div class="list-value">${brl(e.qty * e.unitCost)}</div></div>`).join('') : '<div class="list empty">Nenhuma entrada registrada.</div>';
  }

  function renderSales() {
    const rows = [...state.sales].sort((a,b) => `${b.date}${b.createdAt||''}`.localeCompare(`${a.date}${a.createdAt||''}`)).slice(0,30);
    $('#saleList').innerHTML = rows.length ? rows.map(s => `
      <div class="list-row"><div class="list-main"><strong>${esc(s.productName)}</strong><small>${s.date.split('-').reverse().join('/')} · ${s.qty} un. · ${esc(s.payment)}${s.note ? ` · ${esc(s.note)}` : ''}</small></div><div class="list-value">${brl(s.total)}</div></div>`).join('') : '<div class="list empty">Nenhuma venda registrada.</div>';
  }

  function renderExpenseCategories() {
    const cat = $('#expenseCategory');
    const old = cat.value;
    cat.innerHTML = state.expenseCategories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if (state.expenseCategories.includes(old)) cat.value = old;
    $('#categoryChips').innerHTML = state.expenseCategories.map(c => {
      const locked = ['aluguel','energia'].includes(c.toLowerCase());
      return `<span class="chip">${esc(c)}${locked ? '' : `<button type="button" title="Remover categoria" aria-label="Remover ${esc(c)}" data-remove-category="${esc(c)}">×</button>`}</span>`;
    }).join('');
  }

  function renderExpenses() {
    const rows = [...state.expenses].sort((a,b) => `${b.date}${b.createdAt||''}`.localeCompare(`${a.date}${a.createdAt||''}`)).slice(0,40);
    $('#expenseTotalShown').textContent = brl(rows.reduce((a,e)=>a+e.value,0));
    $('#expenseList').innerHTML = rows.length ? rows.map(e => `
      <div class="list-row"><div class="list-main"><strong>${esc(e.category)}</strong><small>${e.date.split('-').reverse().join('/')} · ${esc(e.description || 'Sem descrição')} · ${esc(e.payment)}</small></div><div class="list-value">${brl(e.value)}</div></div>`).join('') : '<div class="list empty">Nenhuma despesa registrada.</div>';
  }

  function renderReports() {
    const month = $('#reportMonth').value || monthISO();
    const d = monthData(month);
    const margin = d.revenue ? (d.result / d.revenue) * 100 : 0;
    $('#rRevenue').textContent = brl(d.revenue);
    $('#rCogs').textContent = brl(d.cogs);
    $('#rGross').textContent = brl(d.gross);
    $('#rExpenses').textContent = brl(d.expenseTotal);
    $('#rResult').textContent = brl(d.result);
    $('#rResult').classList.toggle('negative', d.result < 0);
    $('#rMargin').textContent = `${margin.toFixed(1).replace('.',',')}%`;
    $('#rMargin').classList.toggle('negative', margin < 0);
    $('#rStockQty').textContent = qty(currentStockQty());
    $('#rStockValue').textContent = brl(currentStockValue());

    const catTotals = {};
    d.expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.value; });
    const cats = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    $('#expenseByCategory').innerHTML = cats.length ? cats.map(([c,v]) => `<div class="summary-row"><span>${esc(c)}</span><strong>${brl(v)}</strong></div>`).join('') : '<div class="list empty">Nenhuma despesa neste mês.</div>';

    const top = {};
    d.sales.forEach(s => {
      if (!top[s.productName]) top[s.productName] = { qty:0, revenue:0 };
      top[s.productName].qty += s.qty;
      top[s.productName].revenue += s.total;
    });
    const ranking = Object.entries(top).sort((a,b)=>b[1].qty-a[1].qty).slice(0,10);
    $('#topProducts').innerHTML = ranking.length ? ranking.map(([name,x],i) => `<div class="summary-row"><span>${i+1}. ${esc(name)} <small class="muted">(${x.qty} un.)</small></span><strong>${brl(x.revenue)}</strong></div>`).join('') : '<div class="list empty">Nenhuma venda neste mês.</div>';
  }

  function renderAll() {
    renderProductSelects();
    renderExpenseCategories();
    renderDashboard();
    renderProducts();
    renderEntries();
    renderSales();
    renderExpenses();
    renderReports();
  }

  function clearProductForm() {
    $('#productForm').reset();
    $('#productId').value = '';
    $('#productQty').value = '0';
    $('#productMin').value = '3';
    $('#cancelProductEdit').classList.add('hidden');
    feedback($('#productMsg'),'');
  }

  function editProduct(id) {
    const p = productById(id); if (!p) return;
    $('#productId').value = p.id;
    $('#productName').value = p.name;
    $('#productCategory').value = p.category || '';
    $('#productCost').value = Number(p.avgCost || 0).toFixed(2);
    $('#productPrice').value = Number(p.salePrice || 0).toFixed(2);
    $('#productQty').value = p.qty;
    $('#productMin').value = p.minStock;
    $('#productNote').value = p.note || '';
    $('#cancelProductEdit').classList.remove('hidden');
    setView('products');
    $('#productName').focus();
  }

  function deactivateProduct(id) {
    const p = productById(id); if (!p) return;
    if (!confirm(`Desativar o produto “${p.name}”? O histórico de entradas e vendas será mantido.`)) return;
    p.active = false;
    saveState();
    toast('Produto desativado.');
  }

  function setupForms() {
    $('#productForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const id = $('#productId').value;
      const name = $('#productName').value.trim();
      const category = $('#productCategory').value.trim();
      const avgCost = moneyInput($('#productCost'));
      const salePrice = moneyInput($('#productPrice'));
      const enteredQty = intInput($('#productQty'));
      const minStock = intInput($('#productMin'));
      const note = $('#productNote').value.trim();
      if (!name) return feedback($('#productMsg'),'Informe o nome do produto.','error');
      if (state.products.some(p => p.active !== false && p.id !== id && p.name.toLowerCase() === name.toLowerCase())) return feedback($('#productMsg'),'Já existe um produto com esse nome.','error');

      if (id) {
        const p = productById(id); if (!p) return;
        // A edição cadastral não altera estoque por acidente. Quantidade só é aceita se não houver histórico.
        const hasHistory = state.entries.some(e=>e.productId===id) || state.sales.some(s=>s.productId===id);
        p.name = name; p.category = category; p.salePrice = salePrice; p.minStock = minStock; p.note = note;
        if (!hasHistory) { p.avgCost = avgCost; p.qty = enteredQty; }
        else if (Math.abs(avgCost - p.avgCost) > 0.0001 || enteredQty !== p.qty) {
          feedback($('#productMsg'),'Nome/preço foram atualizados. Estoque e custo médio não foram alterados porque já existe movimentação; use Entradas para ajustar o estoque.','ok');
          saveState(); clearProductForm(); return;
        }
        saveState(); clearProductForm(); toast('Produto atualizado.');
      } else {
        const p = { id:newId('prd'), name, category, avgCost, salePrice, qty:enteredQty, minStock, note, active:true, createdAt:new Date().toISOString() };
        state.products.push(p);
        if (enteredQty > 0) state.entries.push({ id:newId('ent'), date:todayISO(), productId:p.id, productName:p.name, qty:enteredQty, unitCost:avgCost, supplier:'Estoque inicial', note:'Cadastro inicial', createdAt:new Date().toISOString() });
        saveState(); clearProductForm(); toast('Produto cadastrado.');
      }
    });
    $('#cancelProductEdit').addEventListener('click', clearProductForm);

    $('#entryForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const product = productById($('#entryProduct').value);
      const date = $('#entryDate').value;
      const q = intInput($('#entryQty'));
      const unitCost = moneyInput($('#entryUnitCost'));
      if (!product || !date || q < 1) return feedback($('#entryMsg'),'Selecione o produto e informe uma quantidade válida.','error');
      const oldQty = Number(product.qty || 0);
      const oldValue = oldQty * Number(product.avgCost || 0);
      const newQty = oldQty + q;
      product.avgCost = newQty ? (oldValue + q * unitCost) / newQty : unitCost;
      product.qty = newQty;
      state.entries.push({ id:newId('ent'), date, productId:product.id, productName:product.name, qty:q, unitCost, supplier:$('#entrySupplier').value.trim(), note:$('#entryNote').value.trim(), createdAt:new Date().toISOString() });
      saveState();
      $('#entryForm').reset(); $('#entryDate').value=todayISO(); $('#entryQty').value='1';
      feedback($('#entryMsg'),'Entrada registrada e custo médio atualizado.','ok'); toast('Entrada registrada.');
    });

    $('#saleForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const product = productById($('#saleProduct').value);
      const date = $('#saleDate').value;
      const q = intInput($('#saleQty'));
      const unitPrice = moneyInput($('#saleUnitPrice'));
      if (!product || !date || q < 1) return feedback($('#saleMsg'),'Selecione o produto e informe uma quantidade válida.','error');
      if (q > Number(product.qty)) return feedback($('#saleMsg'),`Estoque insuficiente. Disponível: ${product.qty} un.`, 'error');
      const costSnapshot = Number(product.avgCost || 0);
      product.qty -= q;
      state.sales.push({ id:newId('ven'), date, productId:product.id, productName:product.name, qty:q, unitPrice, total:q*unitPrice, unitCost:costSnapshot, cogs:q*costSnapshot, payment:$('#salePayment').value, note:$('#saleNote').value.trim(), createdAt:new Date().toISOString() });
      saveState();
      $('#saleForm').reset(); $('#saleDate').value=todayISO(); $('#saleQty').value='1'; updateSalePreview();
      feedback($('#saleMsg'),'Venda registrada e estoque baixado.','ok'); toast('Venda finalizada.');
    });

    $('#expenseForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const date = $('#expenseDate').value;
      const category = $('#expenseCategory').value;
      const value = moneyInput($('#expenseValue'));
      if (!date || !category || value <= 0) return feedback($('#expenseMsg'),'Informe data, categoria e valor da despesa.','error');
      state.expenses.push({ id:newId('des'), date, category, description:$('#expenseDescription').value.trim(), value, payment:$('#expensePayment').value, createdAt:new Date().toISOString() });
      saveState();
      $('#expenseForm').reset(); $('#expenseDate').value=todayISO();
      feedback($('#expenseMsg'),'Despesa registrada.','ok'); toast('Despesa salva.');
    });

    $('#categoryForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const name = $('#newCategory').value.trim();
      if (!name) return;
      if (state.expenseCategories.some(c => c.toLowerCase() === name.toLowerCase())) return feedback($('#categoryMsg'),'Essa categoria já existe.','error');
      state.expenseCategories.push(name);
      $('#newCategory').value='';
      saveState(); feedback($('#categoryMsg'),'Categoria adicionada.','ok');
    });
  }

  function updateSalePreview() {
    const q = intInput($('#saleQty'));
    const p = moneyInput($('#saleUnitPrice'));
    $('#salePreview').innerHTML = `Total da venda: <strong>${brl(q*p)}</strong>`;
  }

  function setupEvents() {
    $$('.nav-item').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    $$('[data-open]').forEach(b => b.addEventListener('click', () => setView(b.dataset.open)));
    $('#homeMonth').addEventListener('change', renderDashboard);
    $('#reportMonth').addEventListener('change', renderReports);
    $('#productSearch').addEventListener('input', renderProducts);
    $('#saleQty').addEventListener('input', updateSalePreview);
    $('#saleUnitPrice').addEventListener('input', updateSalePreview);
    $('#saleProduct').addEventListener('change', () => {
      const p = productById($('#saleProduct').value);
      $('#saleUnitPrice').value = p ? Number(p.salePrice || 0).toFixed(2) : '';
      updateSalePreview();
    });

    document.addEventListener('click', (ev) => {
      const edit = ev.target.closest('[data-edit-product]');
      if (edit) return editProduct(edit.dataset.editProduct);
      const deact = ev.target.closest('[data-deactivate-product]');
      if (deact) return deactivateProduct(deact.dataset.deactivateProduct);
      const rm = ev.target.closest('[data-remove-category]');
      if (rm) {
        const name = rm.dataset.removeCategory;
        if (state.expenses.some(e => e.category === name)) return toast('Categoria já usada em despesas e não pode ser removida.');
        state.expenseCategories = state.expenseCategories.filter(c => c !== name);
        saveState(); toast('Categoria removida.');
      }
    });

    $('#exportBackup').addEventListener('click', () => downloadText(`natugestao-backup-${todayISO()}.json`, JSON.stringify(state,null,2), 'application/json'));
    $('#importBackup').addEventListener('change', importBackup);
    $('#exportSalesCsv').addEventListener('click', exportSalesCsv);
    $('#exportExpensesCsv').addEventListener('click', exportExpensesCsv);
    $('#exportProductsCsv').addEventListener('click', exportProductsCsv);
  }

  function downloadText(filename, text, type='text/plain;charset=utf-8') {
    const blob = new Blob([text], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }

  function csvCell(v) { return `"${String(v ?? '').replace(/"/g,'""')}"`; }
  function csvDownload(filename, headers, rows) {
    const content = '\ufeff' + [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\n');
    downloadText(filename, content, 'text/csv;charset=utf-8');
  }
  function exportSalesCsv() {
    csvDownload(`natugestao-vendas-${todayISO()}.csv`, ['Data','Produto','Quantidade','Valor unitário','Total','CMV','Pagamento','Observação'], state.sales.map(s => [s.date,s.productName,s.qty,s.unitPrice,s.total,s.cogs,s.payment,s.note]));
  }
  function exportExpensesCsv() {
    csvDownload(`natugestao-despesas-${todayISO()}.csv`, ['Data','Categoria','Descrição','Valor','Pagamento'], state.expenses.map(e => [e.date,e.category,e.description,e.value,e.payment]));
  }
  function exportProductsCsv() {
    csvDownload(`natugestao-estoque-${todayISO()}.csv`, ['Produto','Categoria','Quantidade','Estoque mínimo','Custo médio','Preço de venda','Valor em estoque'], state.products.filter(p=>p.active!==false).map(p => [p.name,p.category,p.qty,p.minStock,p.avgCost,p.salePrice,p.qty*p.avgCost]));
  }

  function importBackup(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const imported = normalizeState(parsed);
        if (!confirm('Restaurar este backup? Os dados atuais serão substituídos.')) return;
        state = imported; saveState(); toast('Backup restaurado.'); feedback($('#backupMsg'),'Backup restaurado com sucesso.','ok');
      } catch { feedback($('#backupMsg'),'Arquivo de backup inválido.','error'); }
      ev.target.value='';
    };
    reader.readAsText(file);
  }

  function setupPwa() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(console.error);
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); deferredInstallPrompt = e; $('#installBtn').classList.remove('hidden');
    });
    $('#installBtn').addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; $('#installBtn').classList.add('hidden');
    });
  }

  function initializeAppOnce() {
    if (appInitialized) return;
    appInitialized = true;
    $('#homeMonth').value = monthISO();
    $('#reportMonth').value = monthISO();
    ['#entryDate','#saleDate','#expenseDate'].forEach(s => $(s).value = todayISO());
    setupForms(); setupEvents(); renderAll(); updateSalePreview();
  }
  async function bootstrap() {
    setupAuthEvents();
    setupPwa();
    const authenticated = await verifyAuthSession();
    if (authenticated) showApp();
    else showLogin();
  }

  bootstrap();
})();
