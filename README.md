# 🛡️ API de Tarefas — Validação e Segurança

Projeto desenvolvido para praticar a criação de APIs com **Node.js, Express e PostgreSQL**, explorando operações CRUD, validação de dados e prevenção contra SQL Injection.

O repositório reúne três versões do projeto, desenvolvidas durante as atividades propostas.

## 📂 Estrutura do repositório

```text
📦 Repositorio
 ┣ 📂 FORMA1
 ┃ ┣ 📄 index.js
 ┃ ┣ 📄 package.json
 ┃ ┗ 📄 package-lock.json
 ┣ 📂 FORMA2
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📄 index.js
 ┃ ┃ ┗ 📄 db.js
 ┃ ┣ 📄 .env
 ┃ ┗ 📄 package.json
 ┣ 📂 MODIFICADA
 ┃ ┗ 📄 Versão com melhorias de validação
 ┗ 📄 README.md
```

> **Observação:** a estrutura interna da pasta `MODIFICADA` pode ser ajustada conforme os arquivos existentes no projeto.

---

## 🚀 Tecnologias utilizadas

- **Node.js** — execução do JavaScript no servidor.
- **Express** — criação das rotas e da API REST.
- **PostgreSQL** — banco de dados relacional utilizado na versão conectada ao banco.
- **node-postgres (pg)** — comunicação entre Node.js e PostgreSQL.
- **dotenv** — gerenciamento de variáveis de ambiente.
- **Thunder Client** — testes das requisições HTTP.

---

## 📌 Atividade 1 — API de tarefas

Na primeira etapa, o objetivo foi compreender e executar uma API utilizando Express.

A aplicação trabalha com uma lista de tarefas armazenada em memória, permitindo realizar as principais operações de um CRUD.

### Rotas implementadas

| Método HTTP | Rota | Função |
|---|---|---|
| `GET` | `/tarefas` | Lista as tarefas cadastradas. |
| `GET` | `/tarefas?concluida=true` | Filtra tarefas concluídas. |
| `GET` | `/tarefas/:id` | Busca uma tarefa pelo ID. |
| `POST` | `/tarefas` | Cadastra uma nova tarefa. |
| `PUT` | `/tarefas/:id` | Atualiza uma tarefa existente. |
| `DELETE` | `/tarefas/:id` | Exclui uma tarefa. |

### O que foi desenvolvido?

- Configuração inicial do servidor Express.
- Leitura de dados enviados em JSON.
- Criação das rotas HTTP.
- Cadastro, consulta, atualização e exclusão de tarefas.
- Retorno de códigos HTTP, como `200`, `201`, `204` e `404`.

**Resultado:** uma API funcional com operações CRUD, utilizando armazenamento em memória.

---

## 🗄️ Atividade 2 — API com banco de dados

Na segunda etapa, o projeto foi direcionado à integração com um banco de dados PostgreSQL.

O objetivo foi trabalhar com a separação entre o servidor e a conexão com o banco, além de preparar a aplicação para armazenar e consultar dados de forma persistente.

### O que foi trabalhado?

- Organização do código em arquivos dentro da pasta `src`.
- Configuração da conexão com o PostgreSQL em `db.js`.
- Utilização de variáveis de ambiente por meio do `.env`.
- Execução de consultas SQL a partir do Node.js.
- Separação das responsabilidades entre conexão e rotas da API.

**Resultado:** uma estrutura de aplicação preparada para trabalhar com dados persistidos no PostgreSQL, em vez de depender exclusivamente de um array em memória.

> Importante: o arquivo `.env` deve conter as configurações locais de conexão e não deve ser publicado com senhas reais no GitHub.

---

## 🔎 Atividade 3 — Identificação e validação de entradas

Nesta etapa, o foco foi identificar pontos em que dados enviados pelo usuário poderiam entrar na aplicação sem validação adequada.

### Entradas analisadas

- Parâmetro `id` recebido pelas rotas.
- Parâmetro de consulta `concluida`.
- Campo `titulo` enviado no corpo da requisição.
- Campo `concluida` recebido durante a atualização.
- Estrutura e tipos dos dados enviados em JSON.

### Validação do título

O campo `titulo` precisa atender aos seguintes critérios:

1. Deve ser uma string.
2. Não pode estar vazio ou conter somente espaços.
3. Deve respeitar o limite máximo de 100 caracteres.
4. Deve ter os espaços desnecessários removidos nas extremidades.

Também foram consideradas validações para garantir que os IDs sejam inteiros positivos e que o campo `concluida` receba somente valores booleanos (`true` ou `false`).

### Tratamento de erros

A validação permite retornar respostas adequadas para diferentes situações:

- `400 Bad Request` — dados inválidos ou ausentes.
- `404 Not Found` — tarefa inexistente.
- `201 Created` — tarefa cadastrada com sucesso.

**Resultado:** uma API mais previsível, com validação dos dados recebidos e melhor tratamento de erros.

---

## 🔐 Atividade 4 — SQL Injection e prevenção

A última etapa abordou a segurança das consultas SQL e os riscos de inserir diretamente dados fornecidos pelo usuário em comandos SQL.

### O que é SQL Injection?

SQL Injection é uma vulnerabilidade que pode ocorrer quando dados externos são incorporados de maneira insegura a uma consulta SQL. Um invasor pode tentar modificar a lógica do comando e acessar ou alterar informações indevidamente.

### Concatenação versus consultas parametrizadas

**Forma insegura — concatenação:**

```js
const sql =
  "SELECT * FROM tarefas WHERE titulo = '" + titulo + "'";
```

Nesse exemplo, o conteúdo de `titulo` é inserido diretamente no comando SQL, podendo alterar sua estrutura.

**Forma recomendada — parâmetros:**

```js
const sql = 'SELECT * FROM tarefas WHERE titulo = $1';

const resultado = await pool.query(sql, [titulo]);
```

O marcador `$1` representa um valor enviado separadamente da instrução SQL. Assim, o conteúdo recebido é tratado como dado, e não como parte do comando.

Para consultas com mais valores, podem ser utilizados `$2`, `$3` e assim por diante.

**Importante:** os parâmetros protegem os valores das consultas, mas não substituem a validação de entradas nem dispensam o uso de permissões adequadas no banco.

### Estudo de caso real — Heartland Payment Systems (2008)

Em 2008, a empresa de processamento de pagamentos Heartland Payment Systems sofreu uma grande violação de segurança, associada a um ataque que envolveu SQL Injection. O caso ficou conhecido pela exposição de aproximadamente 130 milhões de números de cartões.

O episódio demonstra como uma vulnerabilidade em uma aplicação pode contribuir para um incidente de grandes proporções.

**Lição aprendida:** validar entradas, utilizar consultas parametrizadas e aplicar boas práticas de segurança são medidas essenciais para reduzir riscos.

Fonte de pesquisa: [Federal Reserve Bank of Philadelphia — Heartland Payment Systems: Lessons Learned from a Data Breach](https://www.philadelphiafed.org/consumer-finance/payment-systems/heartland-payment-systems-lessons-learned-from-a-data-breach).

---

## ▶️ Como executar os projetos

### FORMA1

Entre na pasta do projeto e instale as dependências:

```bash
cd FORMA1
npm install
node index.js
```

O servidor será iniciado na porta `3000`.

A API poderá ser acessada em:

```text
http://localhost:3000/tarefas
```

### FORMA2

Entre na pasta correspondente:

```bash
cd FORMA2
npm install
```

Configure o arquivo `.env` com os dados de conexão do PostgreSQL e verifique se o banco está disponível.

Em seguida, execute o arquivo principal:

```bash
node src/index.js
```

A execução depende de as configurações do banco e as tabelas necessárias estarem corretas.

### MODIFICADA

Entre na pasta da versão modificada, instale as dependências e execute o arquivo principal correspondente à estrutura dessa versão.

Consulte os arquivos do projeto para confirmar o comando de inicialização.

---

## 🎯 Conclusão

O desenvolvimento das atividades permitiu praticar a criação de APIs REST, a implementação de operações CRUD, a integração com bancos de dados relacionais e a validação de entradas.

Também foi possível compreender a importância das consultas parametrizadas para reduzir o risco de SQL Injection.

O projeto demonstra a evolução de uma API simples para uma aplicação com maior preocupação com persistência de dados, tratamento de erros e segurança.

---

**Projeto acadêmico — Desenvolvimento de Sistemas**

Tecnologias: Node.js • Express • PostgreSQL • JavaScript

