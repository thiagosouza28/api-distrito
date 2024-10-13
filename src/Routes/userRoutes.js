const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const router = express.Router(); // Usando o Router do Express

const SECRET_KEY = process.env.SECRET_KEY;

// Middleware para verificar o token JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Extraindo o token do cabeçalho

    if (!token) return res.status(401).send({ error: 'Token não fornecido' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send({ error: 'Token inválido' });
        req.user = user; // Adiciona os dados do usuário à requisição
        next(); // Passa para o próximo middleware ou rota
    });
};

// Rota para criar um novo usuário
router.post('/users', async (request, response) => {
    const { fullName, email, birthDate, cpf, district, church, password, role } = request.body;

    try {
        // Verificar se o e-mail já está cadastrado
        const existingEmail = await prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            return response.status(400).send({ error: 'E-mail já cadastrado' });
        }

        // Verificar se o CPF já está cadastrado
        const existingCpf = await prisma.user.findUnique({
            where: { cpf },
        });
        if (existingCpf) {
            return response.status(400).send({ error: 'CPF já cadastrado' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // Criação do usuário
        const newUser = await prisma.user.create({
            data: {
                fullName,
                email,
                birthDate: new Date(birthDate),
                cpf,
                district,
                church,
                password: hashedPassword,
                role, // Adicionando o campo role
            },
        });

        // Retorna o novo usuário, excluindo a senha
        const { password: _, ...userData } = newUser;
        response.status(201).send(userData);
    } catch (error) {
        console.error('Erro ao criar usuário:', error);
        response.status(500).send({ error: 'Erro ao criar usuário' });
    }
});


router.get('/users', authenticateToken, async (request, response) => {
    try {
        // Verifica se o usuário autenticado é um administrador
        if (request.user.role !== 'administrador') {
            return response.status(403).send({ error: 'Acesso negado' });
        }

        const users = await prisma.user.findMany();

        // Exclui senhas antes de retornar
        const usersData = users.map(({ password, ...user }) => user);
        response.send(usersData);
    } catch (error) {
        console.error('Erro ao listar usuários:', error); // Loga a mensagem de erro
        response.status(500).send({ error: 'Erro ao listar usuários' });
    }
});


// Rota de login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                role: true,
                church: true,
                district: true,
                password: true, // Adicione 'password' se precisar para a comparação
            },
        });

        if (!user) {
            return res.status(401).send({ error: 'Usuário não encontrado' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).send({ error: 'Senha incorreta' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, {
            expiresIn: '1h',
        });

        // Retorna os dados do usuário, incluindo o token
        return res.send({ 
            userId: user.id, 
            email: user.email, 
            role: user.role, 
            church: user.church, 
            district: user.district, 
            token 
        });
    } catch (error) {
        console.error('Erro durante o login:', error);
        return res.status(500).send({ error: 'Erro interno do servidor' });
    }
});

// Rota para atualizar os dados do usuário pelo ID (apenas para usuários autenticados)
router.put('/users/:id', authenticateToken, async (request, response) => {
    const { id } = request.params;
    const { fullName, email, birthDate, cpf, district, church, role } = request.body;

    try {
        const userExists = await prisma.user.findUnique({
            where: { id: parseInt(id) },
        });

        if (!userExists) {
            return response.status(404).send({ error: 'Usuário não encontrado' });
        }

        // Verifica se o usuário autenticado tem permissão para atualizar
        if (request.user.role !== 'administrador' && request.user.id !== parseInt(id)) {
            return response.status(403).send({ error: 'Acesso negado' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                fullName,
                email,
                birthDate: new Date(birthDate),
                cpf,
                district,
                church,
                role, // Atualizando o campo role se necessário
            },
        });

        // Retorna o usuário atualizado, excluindo a senha
        const { password: _, ...userData } = updatedUser;
        response.send(userData);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        response.status(500).send({ error: 'Erro ao atualizar usuário' });
    }
});

// Rota para atualizar a senha do usuário (apenas para usuários autenticados)
router.put('/users/:id/password', authenticateToken, async (request, response) => {
    const { id } = request.params;
    const { currentPassword, newPassword } = request.body;

    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
        });

        if (!user) {
            return response.status(404).send({ error: 'Usuário não encontrado' });
        }

        // Verifica se o usuário autenticado está tentando atualizar sua própria senha
        if (request.user.id !== parseInt(id)) {
            return response.status(403).send({ error: 'Acesso negado' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return response.status(400).send({ error: 'Senha atual incorreta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: {
                password: hashedPassword,
            },
        });

        response.send({ message: 'Senha atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar a senha do usuário:', error);
        response.status(500).send({ error: 'Erro ao atualizar a senha do usuário' });
    }
});

module.exports = router; // Exportando o Router com as rotas
