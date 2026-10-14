const express = require('express');
const app = express();

app.use(express.json());

// Banco de dados em memoria
let tarefas = [
    { id: 1, titulo: 'Aprender Express', concluida: false },
    { id: 2, titulo: 'Criar minha primeira API', concluida: false }
];

let proximoId = 3;

// VALIDAR ID
function validarId(id) {
    return /^[1-9]\d*$/.test(id);
}

// VALIDAR TITULO
function validarTitulo(titulo) {
    if (typeof titulo !== 'string') {
        return 'O titulo deve ser um texto';
    }

    const tituloLimpo = titulo.trim();

    if (tituloLimpo.length === 0) {
        return 'O titulo nao pode estar vazio';
    }

    if (tituloLimpo.length > 100) {
        return 'O titulo deve ter no maximo 100 caracteres';
    }

    return null;
}

// LISTAR TAREFAS
app.get('/tarefas', (req, res) => {
    const { concluida } = req.query;
    let resultado = tarefas;

    if (concluida !== undefined) {
        if (concluida !== 'true' && concluida !== 'false') {
            return res.status(400).json({
                erro: 'O filtro concluida deve ser true ou false'
            });
        }

        resultado = tarefas.filter(
            tarefa => tarefa.concluida === (concluida === 'true')
        );
    }

    res.json(resultado);
});

// BUSCAR UMA TAREFA
app.get('/tarefas/:id', (req, res) => {
    const { id } = req.params;

    if (!validarId(id)) {
        return res.status(400).json({
            erro: 'O ID deve ser um numero inteiro positivo'
        });
    }

    const tarefa = tarefas.find(t => t.id === Number(id));

    if (!tarefa) {
        return res.status(404).json({
            erro: 'Tarefa nao encontrada'
        });
    }

    res.json(tarefa);
});

// CRIAR UMA TAREFA
app.post('/tarefas', (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({
            erro: 'Envie um objeto JSON valido'
        });
    }

    const { titulo } = req.body;
    const erroTitulo = validarTitulo(titulo);

    if (erroTitulo) {
        return res.status(400).json({ erro: erroTitulo });
    }

    const novaTarefa = {
        id: proximoId++,
        titulo: titulo.trim(),
        concluida: false
    };

    tarefas.push(novaTarefa);

    res.status(201).json(novaTarefa);
});

// ATUALIZAR UMA TAREFA
app.put('/tarefas/:id', (req, res) => {
    const { id } = req.params;

    if (!validarId(id)) {
        return res.status(400).json({
            erro: 'O ID deve ser um numero inteiro positivo'
        });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({
            erro: 'Envie um objeto JSON valido'
        });
    }

    const tarefa = tarefas.find(t => t.id === Number(id));

    if (!tarefa) {
        return res.status(404).json({
            erro: 'Tarefa nao encontrada'
        });
    }

    const { titulo, concluida } = req.body;

    if (titulo === undefined && concluida === undefined) {
        return res.status(400).json({
            erro: 'Informe titulo ou concluida para atualizar'
        });
    }

    if (titulo !== undefined) {
        const erroTitulo = validarTitulo(titulo);

        if (erroTitulo) {
            return res.status(400).json({ erro: erroTitulo });
        }
    }

    if (
        concluida !== undefined &&
        typeof concluida !== 'boolean'
    ) {
        return res.status(400).json({
            erro: 'O campo concluida deve ser true ou false'
        });
    }

    if (titulo !== undefined) {
        tarefa.titulo = titulo.trim();
    }

    if (concluida !== undefined) {
        tarefa.concluida = concluida;
    }

    res.json(tarefa);
});

// DELETAR UMA TAREFA
app.delete('/tarefas/:id', (req, res) => {
    const { id } = req.params;

    if (!validarId(id)) {
        return res.status(400).json({
            erro: 'O ID deve ser um numero inteiro positivo'
        });
    }

    const index = tarefas.findIndex(t => t.id === Number(id));

    if (index === -1) {
        return res.status(404).json({
            erro: 'Tarefa nao encontrada'
        });
    }

    tarefas.splice(index, 1);

    res.status(204).send();
});

// INICIAR API
app.listen(3000, () => {
    console.log('API de tarefas rodando na porta 3000');
});
