const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); // Importando jsonwebtoken
const express = require('express');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY; // Certifique-se de que a chave secreta está definida nas variáveis de ambiente

if (!SECRET_KEY) {
    console.error('A chave secreta não está definida. Verifique suas variáveis de ambiente.');
    process.exit(1); // Sai do processo se a chave não estiver definida
}

// Rota para login
router.post('/login', async (request, response) => {
    const { username, password } = request.body;

    try {
        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            return response.status(401).send({ error: 'Usuário não encontrado' });
        }

        // Verifica se a senha está correta
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return response.status(401).send({ error: 'Senha incorreta' });
        }

        // Gerar o token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            SECRET_KEY,
            { expiresIn: '1h' } // O token expira em 1 hora
        );

        // Retornar ID do usuário, nome e token para o front-end
        return response.send({ userId: user.id, username: user.username, token });
    } catch (error) {
        console.error('Erro durante o login:', error);
        return response.status(500).send({ error: 'Erro interno do servidor' });
    }
});

// Exportando o router
module.exports = router;
