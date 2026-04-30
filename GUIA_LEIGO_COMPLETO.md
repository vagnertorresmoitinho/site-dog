# GUIA COMPLETO: Do Zero ao Sistema DogTop Online

> ⏱️ Tempo estimado: 30-40 min  
> 📋 Nível: Iniciante

---

## O que vamos fazer?

Ao final deste guia, você terá:

1. ✅ Uma conta no Supabase (banco de dados na nuvem)
2. ✅ Um banco de dados com todas as tabelas do sistema
3. ✅ Sistema de segurança configurado
4. ✅ Frontend (site dog) conectado no banco

---

## PARTE 1: Criar Conta no Supabase

### Passo 1: Acessar o site

1. Abra seu navegador (Chrome, Edge, Firefox).
2. Digite: <https://supabase.com>
3. Pressione **Enter**.

### Passo 2: Criar conta

1. Na página inicial, clique em **"Start your project"**.
2. Você pode entrar com:
    - **Google** (se tiver conta Gmail)
    - **GitHub** (se tiver conta)
    - **Email** (cadastre-se com seu email)
3. Escolha a opção mais fácil para você.

### Passo 3: Criar organização

> *Organização é como uma pasta que guarda seus projetos*

1. Quando pedir para criar organização, digite: **DogTop**
2. Clique em **"Continue"**.

### Passo 4: Criar projeto

1. Clique no botão **"+ New project"**.
2. Preencha os dados:

| Campo | O que digitar |
| :--- | :--- |
| **Organization** | DogTop (já selecionado) |
| **Name** | `dogtop-sistema` |
| **Database Password** | Uma senha forte (anote!) |
| **Region** | **São Paulo** |

1. Clique em **"Create new project"**.
2. **Aguarde 1-2 minutos** enquanto o projeto é criado.

---

## PARTE 2: Pegar as Chaves de Acesso

### Passo 1: Entrar nas configurações

1. No menu à esquerda, clique no ícone de **⚙️ engrenagem** (Settings).
2. No menu que abre, clique em **API**.

### Passo 2: Copiar as credenciais

Precisamos de 2 informações da página de API:

1. **Project URL:** No topo da página (ex: `https://abcd.supabase.co`).
2. **anon public key:** Na seção Project API keys (começa com `eyJ...`).

---

## PARTE 3: Criar o Banco de Dados

### Passo 1: Abrir o editor SQL

1. No menu à esquerda, clique em **SQL Editor** (ícone de terminal).
2. Clique em **"New query"** (botão verde).

### Passo 2: Criar as tabelas

Copie o código SQL fornecido anteriormente, cole na área branca e clique em **Run**.

### Passo 3: Ativar segurança (RLS)

1. Clique em **"New query"** novamente.
2. Cole o código de segurança (RLS) e clique em **Run**.

---

## PARTE 4: Conectar o Frontend

### Passo 1: Abrir o arquivo de configuração

1. Vá até a pasta: `c:\projetos\site dog\assets\js`.
2. Abra o arquivo **config.js**.

### Passo 2: Adicionar as credenciais

No início do arquivo, adicione:
```javascript
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_KEY_AQUI';