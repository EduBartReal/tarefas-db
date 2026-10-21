import "dotenv/config"

import { readFileSync } from 'fs';
import { createServer } from 'http';
import { createServer as _createServer } from 'https';
import { createHash, timingSafeEqual } from 'crypto';
import express, { json } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { verify, sign } from 'jsonwebtoken';
import { Pool } from 'pg';

// (1) Solved: informações importantes no .env
const obrigatorias = ['DB_PASSWORD', 'JWT_SECRET', 'API_USER', 'API_PASSWORD'];
for (const nome of obrigatorias) {
    if (!process.env[nome]) {
        console.error(`Variável de ambiente ausente: ${nome}`);
        process.exit(1);
    }
}

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tarefas_treino',
    port: Number(process.env.DB_PORT) || 5432,
});

const app = express();
app.disable('x-powered-by');
app.use(helmet());                                  // cabeçalhos seguros
app.use(json({ limit: '10kb' }));           // limite de corpo
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 200 })); // anti-abuso

// Limite mais rígido para o login (força bruta)
const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function iguais(a, b) {
    const ha = createHash('sha256').update(String(a)).digest();
    const hb = createHash('sha256').update(String(b)).digest();
    return timingSafeEqual(ha, hb);
}

function validarId(valor) {
    if (!/^\d+$/.test(valor)) return null;
    const n = Number(valor);
    return n > 0 && n <= 2147483647 ? n : null;      // cabe em INTEGER do PG
}

// (5) CORRIGIDO: autenticação via JWT
function autenticar(req, res, next) {
    const cabecalho = req.headers.authorization || '';
    const [tipo, token] = cabecalho.split(' ');
    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ erro: 'Token ausente' });
    }
    try {
        req.usuario = verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
        });
        next();
    } catch {
        res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
}

// ---------------------------------------------------------------------------
// POST /login — devolve um token JWT
// ---------------------------------------------------------------------------
app.post('/login', limiteLogin, (req, res) => {
    const { usuario, senha } = req.body || {};
    if (typeof usuario !== 'string' || typeof senha !== 'string') {
        return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
    }
    const ok =
        iguais(usuario, process.env.API_USER) &&
        iguais(senha, process.env.API_PASSWORD);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const token = sign({ sub: usuario }, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '1h',
    });
    res.json({ token });
});

// Todas as rotas abaixo exigem login
app.use('/tarefas', autenticar);

// ---------------------------------------------------------------------------
// GET /tarefas — lista (com paginação)
// ---------------------------------------------------------------------------
app.get('/tarefas', asyncHandler(async (req, res) => {
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 100);
    const pagina = Math.max(parseInt(req.query.pagina, 10) || 1, 1);
    const resultado = await pool.query(
        'SELECT * FROM tarefas ORDER BY id LIMIT $1 OFFSET $2',
        [limite, (pagina - 1) * limite]
    );
    res.json(resultado.rows);
}));

// ---------------------------------------------------------------------------
// GET /tarefas/buscar?termo=... (declarada antes de /:id)
// ---------------------------------------------------------------------------
app.get('/tarefas/buscar', asyncHandler(async (req, res) => {
    const { termo } = req.query;
    if (typeof termo !== 'string' || termo.trim() === '' || termo.length > 100) {
        return res.status(400).json({ erro: 'Termo inválido (1 a 100 caracteres)' });
    }
    // (3) CORRIGIDO: consulta parametrizada; escapa curingas do LIKE
    const padrao = '%' + termo.replace(/[\\%_]/g, '\\$&') + '%';
    const resultado = await pool.query(
        'SELECT * FROM tarefas WHERE titulo ILIKE $1 ORDER BY id LIMIT 100',
        [padrao]
    );
    res.json(resultado.rows);
}));

// ---------------------------------------------------------------------------
// POST /tarefas — cria
// ---------------------------------------------------------------------------
app.post('/tarefas', asyncHandler(async (req, res) => {
    const titulo = req.body && req.body.titulo;
    // (4) CORRIGIDO: validação de tipo e tamanho + parâmetros
    if (typeof titulo !== 'string' || titulo.trim() === '' || titulo.length > 100) {
        return res.status(400).json({ erro: 'Título deve ser texto de 1 a 100 caracteres' });
    }
    const resultado = await pool.query(
        'INSERT INTO tarefas (titulo, concluida) VALUES ($1, false) RETURNING *',
        [titulo.trim()]
    );
    res.status(201).json(resultado.rows[0]);
}));

// ---------------------------------------------------------------------------
// PUT /tarefas/:id — conclui
// ---------------------------------------------------------------------------
app.put('/tarefas/:id', asyncHandler(async (req, res) => {
    const id = validarId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });

    const resultado = await pool.query(
        'UPDATE tarefas SET concluida = true WHERE id = $1 RETURNING *',
        [id]
    );
    if (resultado.rowCount === 0) {
        return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }
    res.json(resultado.rows[0]);
}));

// ---------------------------------------------------------------------------
// DELETE /tarefas/:id — apaga (agora exige autenticação)
// ---------------------------------------------------------------------------
app.delete('/tarefas/:id', asyncHandler(async (req, res) => {
    const id = validarId(req.params.id);
    if (id === null) return res.status(400).json({ erro: 'ID inválido' });

    const resultado = await pool.query('DELETE FROM tarefas WHERE id = $1', [id]);
    if (resultado.rowCount === 0) {
        return res.status(404).json({ erro: 'Tarefa não encontrada' });
    }
    res.status(204).send();
}));

// ---------------------------------------------------------------------------
// 404 e tratador de erros global
// ---------------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// (2) CORRIGIDO: detalhes só no log do servidor; cliente recebe mensagem genérica
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ erro: 'Corpo muito grande' });
    }
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ erro: 'JSON inválido' });
    }
    console.error(err);
    res.status(500).json({ erro: 'Erro interno' });
});

// ---------------------------------------------------------------------------
// (6) CORRIGIDO: HTTPS quando houver certificado; local por padrão
// ---------------------------------------------------------------------------
const PORTA = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

let servidor;
if (process.env.TLS_KEY && process.env.TLS_CERT) {
    servidor = _createServer(
        { key: readFileSync(process.env.TLS_KEY), cert: readFileSync(process.env.TLS_CERT) },
        app
    );
} else {
    servidor = createServer(app);
    console.warn('Aviso: sem TLS_KEY/TLS_CERT, rodando em HTTP (use só em localhost).');
}

servidor.listen(PORTA, HOST, () => {
    const proto = process.env.TLS_KEY ? 'https' : 'http';
    console.log(`API de tarefas (TREINO) em ${proto}://${HOST}:${PORTA}`);
});