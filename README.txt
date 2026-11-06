NATUGESTÃO — CORREÇÃO DE SALVAMENTO E SINCRONIZAÇÃO

O QUE FOI CORRIGIDO
Produtos, entradas, vendas, despesas e categorias passam a ser salvos no Supabase,
na conta autenticada. Vários aparelhos com o MESMO login acessam a mesma base.
O cadastro só confirma sucesso depois da resposta do banco. Uma gravação baseada
em dados antigos é recusada para não apagar alterações feitas por outro aparelho.
O acesso em vários aparelhos continua permitido.

ATIVAÇÃO (NECESSÁRIA — ESTE ZIP AINDA NÃO ALTEROU O SITE PUBLICADO)
1. Antes de atualizar, abra o app antigo em CADA aparelho que tenha cadastros.
   Em Backup, clique em Baixar backup. Guarde os arquivos identificando o aparelho.
   Não limpe os dados do navegador e não desinstale o app.
2. No projeto natugestao do Supabase, abra SQL Editor > New query.
   Copie o conteúdo completo de CONFIGURAR_SUPABASE.sql, cole e clique em Run.
   O script cria uma tabela e uma função, com acesso limitado ao usuário autenticado.
   Não usa senha administrativa no site e não apaga as tabelas existentes.
3. No GitHub, abra o repositório kleyson111/natugestao.
   Extraia o ZIP e envie os arquivos do aplicativo para a RAIZ do repositório,
   substituindo os antigos: index.html, app.js, cloud-store.js (novo), styles.css,
   sw.js, manifest.webmanifest e a pasta icons. Não envie apenas o ZIP.
   Use Add file > Upload files e conclua o commit. Não crie uma subpasta com o app.
   SQL, README e tests são arquivos de suporte; não precisam ser publicados.
4. Aguarde a publicação do GitHub Pages. Feche o app e abra novamente.
   No computador, use Ctrl+Shift+R se ainda aparecer a versão antiga.
   No celular, feche e reabra o app mais uma vez depois da atualização.
   NÃO limpe armazenamento/cookies para forçar atualização.
5. Entre com o login existente. Confira se aparecem “Atualizar dados” e a
   mensagem “Dados carregados da nuvem”. Se aparecer erro de configuração,
   confira a execução do SQL e se ele foi executado no projeto correto.

RECUPERAR OS CADASTROS DOS APARELHOS
A nuvem começa vazia: isso não significa que os cadastros antigos foram apagados.
A cópia antiga do navegador é mantida na chave original, sem sobrescrita.
1. Comece pelo aparelho com os dados mais completos.
2. Em Backup, clique em Baixar dados antigos para guardar uma cópia extra.
3. Clique em Importar dados deste aparelho para enviar esses dados à nuvem.
   Também pode usar Importar backup e selecionar um JSON exportado pelo app antigo.
4. No outro aparelho, entre com o MESMO login e clique em Atualizar dados.
   Os dados da nuvem devem aparecer. Durante o uso, há consulta automática a cada
   15 segundos com a tela visível e sem formulários em edição.
5. Se o outro aparelho tiver registros exclusivos, baixe a cópia antiga dele
   antes de tentar importar. Registros idênticos são ignorados. Registros com
   mesmo ID e valores diferentes, ou produtos com mesmo nome e IDs diferentes,
   são bloqueados para conferência. O app não soma estoques possivelmente iguais.
   Guarde os backups dos aparelhos: essas divergências exigem conciliação manual.

SE HOUVER FALHA OU GRAVAÇÃO SIMULTÂNEA
A mensagem de sucesso só aparece após confirmação do servidor.
Se falhar, a tentativa fica preservada neste aparelho, separada da base antiga.
Use Backup > Baixar tentativa pendente antes de prosseguir.
Clique em Atualizar dados para consultar o que realmente foi salvo na nuvem.
Confira o histórico antes de repetir vendas/entradas: a conexão pode cair depois
que o servidor grava, mas antes de a confirmação chegar ao aparelho.
Atualizar dados pede confirmação caso haja um formulário em edição.
O arquivo de tentativa é um retrato para conferência, não uma fila automática.
Não importe uma tentativa com estoque divergente sem conciliar os registros.
Uma nova tentativa pode substituir o arquivo pendente local anterior; baixe-o antes.

CONEXÃO E CONTAS
É necessário estar conectado para cadastrar ou movimentar o estoque.
Sem conexão ou sem a configuração SQL, o app não confirma salvamento apenas local.
Contas distintas têm bases distintas. Para a Natushop, use a mesma conta nos aparelhos.
O projeto Supabase precisa permanecer ativo; esta atualização não muda as regras
de pausa do plano gratuito. Ela também não cria backup remoto automático por versão.
Continue exportando backups periódicos.

VERIFICAÇÃO APÓS PUBLICAR
1. Em um aparelho, cadastre um produto de teste identificável.
2. No segundo, entre na mesma conta e clique em Atualizar dados.
3. Confira nome, custo, preço e quantidade. Feche e abra novamente para conferir.
4. Teste uma entrada e uma venda e confira o estoque nos dois aparelhos.
5. Se dois aparelhos tentarem salvar sobre a mesma revisão, apenas um confirma;
   o outro recebe aviso e deve atualizar/conferir antes de repetir a operação.

TESTES ENTREGUES
Execute: node --test tests/sync.test.cjs
Os testes locais simulam o servidor e aparelhos independentes: persistência,
conflito, indisponibilidade, confirmação perdida, preservação dos dados antigos,
importação sem duplicidades e renovação de sessão.
A sintaxe JavaScript foi verificada. O SQL e o fluxo com o Supabase real precisam
ser executados e validados no projeto do proprietário, após a ativação acima.
