# API de Tarefas Segura — Guia de uso, correções e solução de problemas

API REST em Node.js + Express + PostgreSQL, feita no exercício de **Segurança em APIs REST**.
Ela tem login com JWT, consultas parametrizadas, validação de entrada, limite de requisições e tratamento seguro de erros.

---

## 1. O que você precisa

| Item | Versão / observação |
|---|---|
| Node.js | 20.6 ou mais novo (testado na LTS 22 e 24) |
| PostgreSQL | rodando em `localhost:5432` |
| Terminal | PowerShell ou o terminal do VS Code |

---

## 2. Passo a passo para rodar

### 2.1 Pasta e arquivos
Deixe na mesma pasta (exemplo: `Documents\correção`):
- o arquivo da API (aqui chamado `app.js`)
- o arquivo `.env`

### 2.2 Instalar as dependências
```powershell
npm init -y
npm install express pg helmet express-rate-limit jsonwebtoken dotenv
```
Se aparecer `found 0 vulnerabilities`, está tudo certo. Avisos `npm warn` podem ser ignorados.

### 2.3 Ativar o formato `import` (recomendado)
O código usa `import ... from ...` (módulos ES). Para o Node não ter dúvida, rode uma vez:
```powershell
npm pkg set type=module
```
Isso adiciona `"type": "module"` ao `package.json`.

### 2.4 Criar o banco e a tabela
No psql ou no pgAdmin:
```sql
CREATE DATABASE tarefas_db;
-- conecte no tarefas_db e rode:
CREATE TABLE IF NOT EXISTS tarefas (
  id        SERIAL PRIMARY KEY,
  titulo    VARCHAR(100) NOT NULL,
  concluida BOOLEAN NOT NULL DEFAULT false
);
```

### 2.5 Gerar os segredos
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Rode quantas vezes precisar. Cada valor aparece uma vez, então copie na hora.

### 2.6 Criar o `.env`
```properties
DB_HOST=localhost
DB_NAME=tarefas_db
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha_do_postgres

JWT_SECRET=cole_aqui_um_valor_gerado_no_passo_anterior
API_USER=admin
API_PASSWORD=uma_senha_forte_para_a_api
```
Regras:
- sem aspas e sem espaço em volta do `=`;
- o arquivo se chama exatamente `.env`. O Windows às vezes salva como `.env.txt` quando as extensões estão ocultas;
- `API_USER` e `API_PASSWORD` são o login da API, **não** o login do banco.

### 2.6.1 Proteger o `.env`
Crie um arquivo `.gitignore` com:
```
.env
node_modules
```

### 2.7 Rodar
```powershell
node app.js
```
Resultado esperado:
```
Aviso: sem TLS_KEY/TLS_CERT, rodando em HTTP (use só em localhost).
API de tarefas (TREINO) em http://127.0.0.1:3000
```
O aviso é normal em ambiente local. Para HTTPS, defina `TLS_KEY` e `TLS_CERT` no `.env` com o caminho do certificado.

---

## 3. Como usar a API

Todas as rotas `/tarefas` exigem o token. Primeiro faça login e guarde o token.

| Rota | O que faz | Exige token? |
|---|---|---|
| `POST /login` | Devolve o token (vale 1 hora) | Não |
| `GET /tarefas?pagina=1&limite=50` | Lista com paginação (limite máximo 100) | Sim |
| `GET /tarefas/buscar?termo=texto` | Busca pelo título | Sim |
| `POST /tarefas` | Cria tarefa (`{"titulo":"..."}`) | Sim |
| `PUT /tarefas/:id` | Marca como concluída | Sim |
| `DELETE /tarefas/:id` | Apaga | Sim |

### Exemplos no PowerShell
```powershell
$B = "http://localhost:3000"

# 1) login (use os valores do seu .env)
$r = Invoke-RestMethod -Method Post -Uri "$B/login" -ContentType "application/json" `
  -Body '{"usuario":"admin","senha":"uma_senha_forte_para_a_api"}'
$h = @{ Authorization = "Bearer $($r.token)" }

# 2) criar e listar
Invoke-RestMethod -Method Post -Uri "$B/tarefas" -Headers $h -ContentType "application/json" -Body '{"titulo":"estudar segurança"}'
Invoke-RestMethod -Uri "$B/tarefas" -Headers $h

# 3) concluir e apagar
Invoke-RestMethod -Method Put    -Uri "$B/tarefas/1" -Headers $h
Invoke-RestMethod -Method Delete -Uri "$B/tarefas/1" -Headers $h
```

> No PowerShell, `curl` é um apelido de outro comando e o JSON com aspas costuma quebrar. Use `Invoke-RestMethod`, como acima, ou `curl.exe`.

---

## 4. Como provar que as proteções funcionam

Cada teste mostra o que **deve** acontecer. Rodei o código e conferi os resultados abaixo (sem o banco ligado, então a listagem deu 500 genérico).

```powershell
# helper: mostra só o código HTTP
function Codigo($sb) { try { & $sb; 200 } catch { $_.Exception.Response.StatusCode.value__ } }

# 401: sem token
Codigo { Invoke-RestMethod "$B/tarefas" }

# 401: senha errada no login
Codigo { Invoke-RestMethod -Method Post "$B/login" -ContentType "application/json" -Body '{"usuario":"admin","senha":"errada"}' }

# 400: título que não é texto (validação)
Codigo { Invoke-RestMethod -Method Post "$B/tarefas" -Headers $h -ContentType "application/json" -Body '{"titulo":123}' }

# 400: id inválido
Codigo { Invoke-RestMethod -Method Delete "$B/tarefas/abc" -Headers $h }

# SQL Injection: vira texto de busca, não executa comando
$t = [uri]::EscapeDataString("' OR 1=1 --")
Invoke-RestMethod "$B/tarefas/buscar?termo=$t" -Headers $h      # retorna lista vazia

# 429: força bruta no login (rode 11 vezes)
1..11 | ForEach-Object { Codigo { Invoke-RestMethod -Method Post "$B/login" -ContentType "application/json" -Body '{"usuario":"admin","senha":"x"}' } }
```

---

## 5. O que foi corrigido (as 6 falhas do exercício)

| # | Falha original | Risco | OWASP | Correção neste código |
|---|---|---|---|---|
| 1 | Senha do banco escrita no código (`admin123`) | Quem vê o código acessa o banco | A05 Security Misconfiguration | Segredos no `.env`. A API recusa subir se faltar alguma variável obrigatória. |
| 2 | Resposta de erro com `error.message` e `stack` | Vaza estrutura interna do sistema | A05 Security Misconfiguration | Cliente recebe `Erro interno`. O detalhe vai só para o log do servidor. |
| 3 | `LIKE '%` + termo + `%'` montado com texto | **SQL Injection** | A03 Injection | Consulta parametrizada (`$1`) e curingas `%` `_` escapados. |
| 4 | `INSERT` com o título colado no SQL, sem validação | SQL Injection e lixo no banco | A03 Injection | Valida tipo e tamanho (1 a 100 caracteres) e usa parâmetros. |
| 5 | `DELETE` aberto a qualquer pessoa | Qualquer um apaga dados | A01 Broken Access Control | Login que devolve **JWT**. `/tarefas` inteiro exige `Authorization: Bearer`. |
| 6 | Servidor em HTTP, sem proteções, sem limite | Interceptação, força bruta, DoS | A05 / A04 | `helmet`, limite de requisições (200 por 15 min; **10 no login**), corpo de no máximo 10 kb, suporte a HTTPS e escuta só em `127.0.0.1`. |

### Outros problemas que também foram resolvidos
- **Erros dentro de rotas `async`** podiam derrubar o servidor: agora passam pelo `asyncHandler` e pelo tratador global.
- **`id` inválido** (`abc`, `-5`, número gigante) retorna 400. Id inexistente retorna 404 (antes devolvia `undefined`).
- **Comparação de usuário e senha** feita com hash e `timingSafeEqual`, que não vaza informação pelo tempo de resposta.
- **Rota `/tarefas/buscar`** declarada **antes** de `/tarefas/:id`, para não ser confundida com um id.
- **Paginação** com limite máximo, para ninguém puxar a tabela inteira de uma vez.
- **Erro de importação do `jsonwebtoken`** (veja a seção 6), que impedia a API de iniciar.

---

## 6. Solução de problemas

| Mensagem ou sintoma | Causa | Como resolver |
|---|---|---|
| `SyntaxError: Named export 'sign' not found. The requested module 'jsonwebtoken' is a CommonJS module` | O `jsonwebtoken` é um pacote antigo (CommonJS) e não aceita `import { verify, sign }` | Troque a linha `import { verify, sign } from 'jsonwebtoken';` por:<br>`import jwt from 'jsonwebtoken';`<br>`const { verify, sign } = jwt;` |
| `Cannot find package 'dotenv'` (ou `express`, `pg`...) | Pacote não instalado | `npm install express pg helmet express-rate-limit jsonwebtoken dotenv` na pasta do projeto |
| `Cannot use import statement outside a module` | Node antigo ou `package.json` sem `"type": "module"` | `npm pkg set type=module` e confira `node -v` (20.6 ou mais novo) |
| `Variável de ambiente ausente: JWT_SECRET` (ou `API_USER`, `API_PASSWORD`, `DB_PASSWORD`) | `.env` sem a variável, com nome errado, ou o arquivo não foi encontrado | Confira o `.env` (seção 2.6), o nome exato do arquivo (sem `.txt`) e se está na pasta de onde você roda `node app.js` |
| `node` ou `npm` não reconhecido | Node não instalado ou terminal aberto antes da instalação | Instale a LTS (`winget install OpenJS.NodeJS.LTS`), feche e abra o terminal |
| API sobe, mas as rotas respondem `500 Erro interno` | Problema no banco. O motivo aparece **no terminal onde a API roda**, não na resposta | Veja a linha de erro no terminal e use as três linhas abaixo |
| ...`ECONNREFUSED` (porta 5432) | PostgreSQL desligado ou porta errada | Inicie o serviço do PostgreSQL e confira `DB_HOST` e `DB_PORT` |
| ...`password authentication failed for user "postgres"` | `DB_PASSWORD` diferente da senha real | Corrija no `.env` e reinicie a API |
| ...`database "tarefas_db" does not exist` | Banco não criado | `CREATE DATABASE tarefas_db;` |
| ...`relation "tarefas" does not exist` | Tabela não criada | Rode o `CREATE TABLE` da seção 2.4 |
| `EADDRINUSE: address already in use :::3000` | Outra instância (ou programa) usa a porta 3000 | Feche a outra instância ou coloque `PORT=3001` no `.env` |
| `401 Token ausente` | Faltou o cabeçalho `Authorization` | Envie `Authorization: Bearer <token>` |
| `401 Token inválido ou expirado` | Token tem mais de 1 hora, ou o `JWT_SECRET` mudou depois do login | Faça login de novo |
| `401 Credenciais inválidas` no login | `usuario`/`senha` diferentes de `API_USER`/`API_PASSWORD` do `.env` | Confira os valores e reinicie a API se mudou o `.env` |
| `429 Too Many Requests` | Passou do limite (10 logins ou 200 requisições em 15 min) | Espere 15 minutos ou reinicie a API (o contador fica na memória) |
| `400 JSON inválido` | Corpo mal formado. No PowerShell, é comum com `curl` e aspas | Use `Invoke-RestMethod` ou `curl.exe` com o JSON entre aspas simples |
| Mudei o `.env` e nada mudou | O `.env` só é lido quando a API inicia | `Ctrl + C` e rode `node app.js` de novo |

---

## 7. Boas práticas e pontos para evoluir (opcional)

- **Nunca** coloque o `.env` no Git. Se isso já aconteceu, troque as senhas e os segredos, porque o valor continua no histórico.
- Não compartilhe segredos em prints, chats ou mensagens. Se algum vazou, gere outro.
- Em produção: use HTTPS (certificado ou proxy), senha de banco forte e um usuário do banco com poucas permissões (não o `postgres`).
- Hoje existe **um único usuário de API** (do `.env`). Para vários usuários, o próximo passo é uma tabela `usuarios` com senha em hash (bcrypt) e checagem de dono dos dados (autorização, que dá 403).
- O contador de limite fica na memória do processo. Com vários servidores, use um armazenamento compartilhado (Redis).vbh8