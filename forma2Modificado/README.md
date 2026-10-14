Como testar as validações no Thunder Client
Teste 1 — título vazio
POST · http://localhost:3000/tarefas
{
  "titulo": "   "
}


Resultado esperado: 400 Bad Request.

Teste 2 — título muito longo
POST · mesma URL
Envie um título com 101 caracteres ou mais. Resultado esperado: 400 Bad Request.

Teste 3 — tipo errado
{
  "titulo": 123
}


Resultado esperado: 400 Bad Request.

Teste 4 — conclusão inválida
PUT · http://localhost:3000/tarefas/1
{
  "concluida": "sim"
}


Resultado esperado: 400 Bad Request.

Teste 5 — ID inválido
GET · http://localhost:3000/tarefas/abc
Resultado esperado: 400 Bad Request.

Uma diferença importante: 400 significa que a entrada é inválida; 404 significa que a entrada é válida, mas a tarefa não foi encontrada.


Nota:Testei todos enquanto o Henrique e o Zhang botavam fogo na sala, funciona 👍
