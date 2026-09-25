NATUGESTÃO — NATUSHOP
Versão 1.1 — PWA gratuita, mobile-first e com autenticação

O QUE JÁ FAZ
- Cadastro e edição de produtos
- Estoque atual e alerta de estoque mínimo
- Entradas de mercadoria
- Cálculo automático de custo médio ponderado
- Registro de vendas e baixa automática do estoque
- CMV registrado no momento da venda
- Despesas com categorias iniciais Aluguel e Energia
- Inclusão de novas categorias de despesa
- Painel mensal: faturamento, CMV, lucro bruto, despesas e resultado
- Relatórios por mês
- Ranking de produtos vendidos
- Backup completo em JSON
- Restauração de backup
- Exportação CSV de vendas, despesas e estoque
- Funcionamento offline após a primeira abertura em hospedagem HTTPS
- Instalação na tela inicial como PWA

ARMAZENAMENTO DESTA PRIMEIRA VERSÃO
Os dados ficam no navegador do smartphone (localStorage). Isso não tem mensalidade e permite uso sem servidor.
É obrigatório fazer backup periódico pelo menu Backup.

PUBLICAÇÃO GRATUITA
Hospede a pasta inteira em um serviço HTTPS gratuito (ex.: GitHub Pages, Cloudflare Pages ou Netlify, observando os limites e termos vigentes do serviço escolhido).
A PWA não precisa ser publicada na Play Store para ser instalada na tela inicial.

PRÓXIMO PASSO RECOMENDADO
Depois que a Sra. Rita validar o uso real, migrar o armazenamento para banco de dados gratuito em nuvem para ter sincronização/recuperação sem depender apenas do aparelho.


AUTENTICAÇÃO
- Acesso por usuário e senha validado pelo Supabase Auth.
- Usuário visível no aplicativo: natushop.
- A senha não fica salva no código do GitHub.
- A sessão é renovada com token de autenticação.
- Botão Sair encerra a sessão.

OBSERVAÇÃO DE SEGURANÇA
Nesta versão, os dados operacionais ainda ficam no localStorage do smartphone. O login protege o acesso normal à interface, mas a proteção completa dos dados exige a próxima etapa: migrar estoque, vendas e despesas para o banco Supabase com Row Level Security (RLS).
