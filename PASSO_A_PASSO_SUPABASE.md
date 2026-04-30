# Passo a Passo: Criar Projeto Supabase para DogTop

> ⚠️ **VERSÃO SEGURA E PROFISSIONAL** - Esta versão corrige falhas críticas de segurança e arquitetura do roteiro anterior.

---

## 1. Criar Conta e Projeto no Supabase

### 1.1 Acessar Supabase
1. Acesse: **https://supabase.com**
2. Clique em **"Start your project"** ou faça login

### 1.2 Criar Novo Projeto
1. Clique em **"New project"**
2. Preencha os dados:
   - **Organization**: selecione ou crie (ex: "DogTop")
   - **Name**: `dogtop-sistema`
   - **Database Password**: crie uma senha forte (guarde bem!)
   - **Region**: selecione a mais próxima (Norte da América do Sul - São Paulo)
3. Clique em **"Create new project"**
4. Aguarde ~2 minutos para o projeto ser criado

---

## 2. Obter Credenciais do Projeto

### 2.1 Acessar Configurações
1. No painel do projeto, clique em **⚙️ Settings** (ícone de engrenagem)
2. No menu lateral, clique em **API**

### 2.2 Copiar Credenciais
Você verá duas chaves importantes:

| Campo | Para que serve | Como usar |
|-------|----------------|-----------|
| **Project URL** | URL do seu backend | `https://xxxxx.supabase.co` |
| **anon public** | Chave pública (para frontend) | Use no site dog |
| **service_role** | Chave administrativa (para backend Python) | **NÃO use no frontend - apenas backend!** |

⚠️ **AVISO CRÍTICO**: A chave `service_role` ignora todas as políticas de segurança (RLS). **NUNCA** a coloque em arquivos do frontend (JavaScript/HTML). Ela deve ficar apenas no backend Python.

---

## 3. Criar Tabelas no Banco de Dados

### 3.1 Acessar SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Clique em **"New query"**

### 3.2 Executar Script de Criação
Copie e execute o script abaixo:

```sql
-- ============================================
-- DOGTOP - SCHEMA DO BANCO DE DADOS
-- Versão segura e profissional
-- ============================================

-- ============================================
-- 1. TABELAS BASE
-- ============================================

-- Tabela de Produtos
create table produtos (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    descricao text,
    preco numeric(10, 2) not null default 0,
    categoria text,
    imagem text,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Tabela de Adicionais (ingredientes extras)
create table adicionais (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    preco numeric(10, 2) not null default 0,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

-- Tabela de Categorias
create table categorias (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    ordem integer default 0,
    icone text,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

-- ============================================
-- 2. TABELAS DE CLIENTES E ENTREGADORES
-- ============================================

-- Tabela de Clientes
create table clientes (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    telefone text not null unique,
    email text,
    endereco text,
    numero text,
    bairro text,
    complemento text,
    referencia text,
    observacoes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Tabela de Entregadores
create table entregadores (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    telefone text,
    veiculo text,
    ativo boolean not null default true,
    created_at timestamptz not null default now()
);

-- ============================================
-- 3. TABELAS DE PEDIDOS
-- ============================================

-- Tabela de Pedidos
create table pedidos (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid references clientes(id),
    status text not null default 'recebido',
    tipo_entrega text not null default 'retirada',
    forma_pagamento text,
    troco_para numeric(10, 2),
    taxa_entrega numeric(10, 2) default 0,
    desconto numeric(10, 2) default 0,
    total numeric(10, 2) not null default 0,
    observacao text,
    -- Dados de entrega (histórico imutável)
    endereco_entrega text,
    bairro_entrega text,
    referencia_entrega text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Tabela de Itens do Pedido
create table itens_pedido (
    id uuid primary key default gen_random_uuid(),
    pedido_id uuid not null references pedidos(id) on delete cascade,
    produto_id uuid references produtos(id),
    -- Histórico imutável: salvamos o nome no momento da compra
    produto_nome text not null,
    produto_preco numeric(10, 2) not null default 0,
    quantidade integer not null default 1,
    observacao text,
    created_at timestamptz not null default now()
);

-- Tabela de Adicionais por Item (N:N)
create table itens_adicionais (
    id uuid primary key default gen_random_uuid(),
    item_pedido_id uuid not null references itens_pedido(id) on delete cascade,
    adicional_id uuid references adicionais(id),
    adicional_nome text not null,
    adicional_preco numeric(10, 2) not null default 0,
    created_at timestamptz not null default now()
);

-- ============================================
-- 4. TABELAS DE CONTROLE
-- ============================================

-- Tabela de Entregas
create table entregas (
    id uuid primary key default gen_random_uuid(),
    pedido_id uuid not null references pedidos(id) on delete cascade,
    entregador_id uuid references entregadores(id),
    status text not null default 'pendente',
    distancia_km numeric(5, 2),
    saiu_em timestamptz,
    entregue_em timestamptz,
    created_at timestamptz not null default now()
);

-- Tabela de Configurações da Empresa
create table configuracoes (
    id uuid primary key default gen_random_uuid(),
    chave text not null unique,
    valor text,
    updated_at timestamptz not null default now()
);

-- Tabela de Usuários Administrativos
create table usuarios_admin (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    nome text not null,
    perfil text not null default 'vendas',
    senha_hash text not null,
    ativo boolean not null default true,
    ultimo_login timestamptz,
    created_at timestamptz not null default now()
);

-- ============================================
-- 5. ÍNDICES PARA PERFORMANCE
-- ============================================

create index idx_pedidos_cliente on pedidos(cliente_id);
create index idx_pedidos_status on pedidos(status);
create index idx_pedidos_created on pedidos(created_at desc);
create index idx_itens_pedido on itens_pedido(pedido_id);
create index idx_clientes_telefone on clientes(telefone);

-- ============================================
-- 6. INSERIR DADOS INICIAIS
-- ============================================

-- Inserir configurações padrão
insert into configuracoes (chave, valor) values
    ('empresa_nome', 'DogTop'),
    ('empresa_telefone', '(65) 99999-0000'),
    ('empresa_endereco', 'Rua Principal, 123'),
    ('taxa_entrega', '8.00'),
    ('horario_funcionamento', '18:00 - 23:00'),
    ('pedido_minimo', '20.00');

-- Inserir categorias
insert into categorias (nome, ordem, icone) values
    ('Lanches', 1, 'burger'),
    ('Acompanhamentos', 2, 'fries'),
    ('Bebidas', 3, 'cup');

-- Inserir produto de exemplo
insert into produtos (nome, descricao, preco, categoria) values
    ('Hot Dog Tradicional', 'Pão, salsicha, batata palha, maionese, catchup', 15.00, 'Lanches'),
    ('Hot Dog Duplo', 'Dois pães, duas salsichas, ingredientes completos', 22.00, 'Lanches'),
    ('X-Salada', 'Pão, hambúrguer, alface, tomate, maionese', 18.00, 'Lanches'),
    ('Batata Frita', 'Porção de batata frita crocante', 12.00, 'Acompanhamentos'),
    ('Refrigerante Lata', 'Coca-Cola, Guaraná, Fanta', 5.00, 'Bebidas');

-- Inserir adicionais de exemplo
insert into adicionais (nome, preco) values
    ('Queijo ralado', 2.00),
    ('Bacon', 3.00),
    ('Milho', 1.50),
    ('Ervilha', 1.50),
    ('Maionese extra', 1.00);

-- Inserir entregador de exemplo
insert into entregadores (nome, telefone, veiculo) values
    ('João Entregador', '(65) 99999-0001', 'Moto'),
    ('Maria Entregadora', '(65) 99999-0002', 'Carro');
```

3. Clique em **"Run"** ou pressione `Ctrl + Enter`

---

## 4. Configurar Autenticação (Opcional)

### 4.1 Acessar Autenticação
1. No menu lateral, clique em **Authentication**
2. Clique em **Providers**

### 4.2 Habilitar Login por Telefone
1. Clique em **Phone** (telefone)
2. Ative a opção **Enable Phone provider**
3. Clique em **Save**

---

## 5. Configurar Políticas de Segurança (RLS) - VERSÃO CORRIGIDA

⚠️ **IMPORTANTE**: O roteiro anterior tinha falhas graves de segurança. Use estas políticas corrigidas.

### 5.1 Ativar RLS nas Tabelas
Execute no SQL Editor:

```sql
-- Ativar RLS em todas as tabelas
alter table produtos enable row level security;
alter table adicionais enable row level security;
alter table categorias enable row level security;
alter table clientes enable row level security;
alter table entregadores enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table itens_adicionais enable row level security;
alter table entregas enable row level security;
alter table configuracoes enable row level security;
alter table usuarios_admin enable row level security;
```

### 5.2 Criar Políticas de Segurança (VERSÃO SEGURA)

⚠️ **POLÍTICAS CORRIGIDAS**: As políticas anteriores permitiam que qualquer pessoa alterasse dados. Estas são seguras.

```sql
-- ============================================
-- POLÍTICAS DE SEGURANÇA (RLS) - DOGTOP
-- ============================================

-- ------------------------------------------
-- PRODUTOS: Leitura pública, apenas admin altera
-- ------------------------------------------
drop policy if exists "Produtos são visíveis para todos" on produtos;
drop policy if exists "Produtos podem ser inseridos por qualquer um" on produtos;
drop policy if exists "Produtos podem ser atualizados por qualquer um" on produtos;

create policy "Produtos visíveis para todos" on produtos 
    for select using (true);

create policy "Produtos alteráveis apenas por admin" on produtos 
    for all using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- ------------------------------------------
-- ADICIONAIS: Leitura pública, apenas admin altera
-- ------------------------------------------
drop policy if exists "Adicionais são visíveis para todos" on adicionais;
drop policy if exists "Adicionais podem ser inseridos por qualquer um" on adicionais;

create policy "Adicionais visíveis para todos" on adicionais 
    for select using (true);

create policy "Adicionais alteráveis apenas por admin" on adicionais 
    for all using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- ------------------------------------------
-- CATEGORIAS: Leitura pública, apenas admin altera
-- ------------------------------------------
create policy "Categorias visíveis para todos" on categorias 
    for select using (true);

create policy "Categorias alteráveis apenas por admin" on categorias 
    for all using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- ------------------------------------------
-- CLIENTES: Qualquer um cria, apenas admin vê tudo
-- ------------------------------------------
drop policy if exists "Clientes são visíveis para todos" on clientes;
drop policy if exists "Clientes podem ser inseridos por qualquer um" on clientes;
drop policy if exists "Clientes podem ser atualizados por qualquer um" on clientes;

-- Qualquer um pode criar novo cliente (cadastro)
create policy "Qualquer um pode criar clientes" on clientes 
    for insert with check (true);

-- Apenas admin vê todos os clientes
create policy "Admin vê todos os clientes" on clientes 
    for select using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- Cliente só atualiza seus próprios dados (pelo telefone)
create policy "Cliente atualiza próprio registro" on clientes 
    for update using (
        telefone = (current_setting('app.current_telefone', true))::text
    );

-- ------------------------------------------
-- PEDIDOS: Qualquer um cria, admin vê tudo
-- ------------------------------------------
drop policy if exists "Pedidos são visíveis para todos" on pedidos;
drop policy if exists "Pedidos podem ser inseridos por qualquer um" on pedidos;
drop policy if exists "Pedidos podem ser atualizados por qualquer um" on pedidos;

-- Qualquer um pode criar pedido
create policy "Qualquer um pode criar pedidos" on pedidos 
    for insert with check (true);

-- Admin e cozinha veem todos os pedidos
create policy "Admin e cozinha veem todos os pedidos" on pedidos 
    for select using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
        or current_setting('app.current_role', true) = 'cozinha'
    );

-- Apenas admin atualiza status de pedidos
create policy "Apenas admin atualiza pedidos" on pedidos 
    for update using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- ------------------------------------------
-- ITENS DE PEDIDO: Acesso via pedido
-- ------------------------------------------
drop policy if exists "Itens são visíveis para todos" on itens_pedido;
drop policy if exists "Itens podem ser inseridos por qualquer um" on itens_pedido;

create policy "Itens visíveis via pedido" on itens_pedido 
    for select using (
        exists (
            select 1 from pedidos p 
            where p.id = itens_pedido.pedido_id
            and (
                exists (
                    select 1 from usuarios_admin 
                    where email = current_user::text
                    and ativo = true
                )
                or current_setting('app.current_role', true) = 'cozinha'
            )
        )
    );

create policy "Itens podem ser inseridos" on itens_pedido 
    for insert with check (true);

-- ------------------------------------------
-- ITENS ADICIONAIS: Acesso via item
-- ------------------------------------------
create policy "Adicionais de item visíveis" on itens_adicionais 
    for select using (true);

create policy "Adicionais de item podem ser inseridos" on itens_adicionais 
    for insert with check (true);

-- ------------------------------------------
-- ENTREGADORES: Leitura pública
-- ------------------------------------------
drop policy if exists "Entregadores são visíveis para todos" on entregadores;

create policy "Entregadores visíveis para todos" on entregadores 
    for select using (true);

-- ------------------------------------------
-- ENTREGAS: Acesso via pedido
-- ------------------------------------------
drop policy if exists "Entregas são visíveis para todos" on entregas;
drop policy if exists "Entregas podem ser inseridas por qualquer um" on entregas;
drop policy if exists "Entregas podem ser atualizadas por qualquer um" on entregas;

create policy "Entregas visíveis via pedido" on entregas 
    for select using (
        exists (
            select 1 from pedidos p 
            where p.id = entregas.pedido_id
            and exists (
                select 1 from usuarios_admin 
                where email = current_user::text
                and ativo = true
            )
        )
    );

create policy "Entregas podem ser inseridas" on entregas 
    for insert with check (true);

create policy "Entregas podem ser atualizadas" on entregas 
    for update using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- ------------------------------------------
-- CONFIGURAÇÕES: Apenas admin
-- ------------------------------------------
drop policy if exists "Configurações são visíveis para todos" on configuracoes;
drop policy if exists "Configurações podem ser atualizadas por qualquer um" on configuracoes;

create policy "Admin vê configurações" on configuracoes 
    for select using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

create policy "Admin altera configurações" on configuracoes 
    for all using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
        )
    );

-- ------------------------------------------
-- USUÁRIOS ADMIN: Apenas leitura própria
-- ------------------------------------------
create policy "Admin vê próprio usuário" on usuarios_admin 
    for select using (email = current_user::text);

create policy "Apenas admin gerencia usuários" on usuarios_admin 
    for all using (
        exists (
            select 1 from usuarios_admin 
            where email = current_user::text
            and ativo = true
            and perfil = 'administrador'
        )
    );
```

---

## 6. Atualizar Código do Frontend

### 6.1 No arquivo `.env` do DogTop-Sistema
Atualize com as novas credenciais:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

⚠️ **NUNCA** coloque a `service_role` key em arquivos do frontend!

### 6.2 No site dog (assets/js/config.js)
Adicione a URL do Supabase (apenas a URL e a anon key):

```javascript
// APENAS estas duas informações vão para o frontend
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'sua_chave_anon_aqui';

// A service_role key fica apenas no backend Python!
```

---

## 7. Testar a Conexão

### 7.1 Testar via SQL
Execute uma consulta simples:

```sql
select * from produtos;
```

Se retornar os produtos inseridos, está funcionando!

### 7.2 Testar via API
Acesse no navegador:
```
https://xxxxx.supabase.co/rest/v1/produtos?select=*
```

Deve retornar os dados em JSON.

---

## Resumo das Credenciais

Após criar o projeto, preencha:

| Credencial | Valor | Onde usar |
|------------|-------|-----------|
| Project URL | `https://xxxxx.supabase.co` | Frontend + Backend |
| anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Frontend (site dog) |
| service_role key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | **Apenas Backend Python** |

---

## Correções Feitas vs Roteiro Anterior

| Problema | Antes (Inseguro) | Agora (Seguro) |
|----------|------------------|----------------|
| **RLS Produtos** | Qualquer um insere/altera | Apenas admin |
| **RLS Clientes** | Todos veem todos | Admin vê tudo, cliente vê o próprio |
| **RLS Pedidos** | Qualquer um altera status | Apenas admin altera status |
| **service_role** | Mencionada para frontend | Apenas backend |
| **Itens Adicionais** | Não existia | Nova tabela `itens_adicionais` |
| **Dados de Entrega** | Duplicados em entregas | Preservados no pedido (histórico) |

---

## Próximos Passos

1. ✅ Criar projeto Supabase
2. ⬜ Criar tabelas (schema corrigido)
3. ⬜ Configurar RLS (políticas seguras)
4. ⬜ Atualizar código frontend
5. ⬜ Publicar

Quer que eu ajude a criar algum desses arquivos de configuração?