/* Persistência autenticada com controle de revisão. */
(function(root) {
  'use strict';
  root.createNatuStore = function({url, key, getSession, refreshSession, fetchImpl = fetch}) {
    async function request(path, options = {}, retried = false) {
      let session = getSession();
      if (!session?.accessToken || !session.userId) throw new Error('Entre novamente para sincronizar.');
      if (Number(session.expiresAt) < Date.now() + 60000) {
        session = await refreshSession(session.refreshToken);
        if (!session) throw new Error('Sua sessão expirou. Entre novamente.');
      }
      let response;
      try {
        response = await fetchImpl(url + '/rest/v1/' + path, {
          ...options, cache: 'no-store', signal: AbortSignal.timeout(20000),
          headers: {apikey:key, Authorization:'Bearer ' + session.accessToken,
            'Content-Type':'application/json', ...options.headers}
        });
      } catch { throw new Error('Não foi possível confirmar a sincronização. Verifique a conexão.'); }
      if (response.status === 401 && !retried) {
        const renewed = await refreshSession(session.refreshToken);
        if (renewed) return request(path, options, true);
      }
      if (!response.ok) {
        let detail = {}; try { detail = await response.json(); } catch {}
        if (detail.code === '40001') throw new Error('Outro aparelho alterou os dados. Baixe a tentativa pendente e clique em Atualizar dados antes de repetir a operação.');
        if (response.status === 404 || detail.code === '42P01' || detail.code === 'PGRST202' || detail.code === 'PGRST205')
          throw new Error('Sincronização ainda não configurada. Execute o arquivo CONFIGURAR_SUPABASE.sql no Supabase.');
        throw new Error('Falha ao sincronizar (' + response.status + '). Entre novamente ou confira a configuração do Supabase.');
      }
      return response.json();
    }
    return {
      async load() {
        const id = getSession()?.userId;
        if (!id) throw new Error('Entre novamente.');
        const rows = await request('natugestao_state?user_id=eq.' + encodeURIComponent(id) + '&select=data,revision');
        if (!Array.isArray(rows)) throw new Error('Resposta inválida ao carregar os dados.');
        return rows[0] || null;
      },
      async save(data, revision) {
        const rows = await request('rpc/natugestao_save', {
          method:'POST', body:JSON.stringify({p_data:data, p_expected_revision:revision})
        });
        if (!Array.isArray(rows) || !rows[0] || !Number.isSafeInteger(Number(rows[0].revision)))
          throw new Error('O servidor não confirmou o salvamento. Atualize os dados antes de continuar.');
        return rows[0];
      }
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
