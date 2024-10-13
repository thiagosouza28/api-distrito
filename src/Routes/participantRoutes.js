const { Router } = require('express'); // Importando Router
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken'); // Importando jsonwebtoken
const prisma = new PrismaClient();

const router = Router(); // Criando uma nova instância do Router

// Middleware para verificar o token JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Obtém o token do header Authorization
    if (!token) return res.status(401).send({ message: 'Token não fornecido' });

    jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
        if (err) return res.status(403).send({ message: 'Token inválido' });
        req.user = user; // Armazenar os dados do usuário na requisição
        next(); // Passar para o próximo middleware/rota
    });
};

// Função para calcular a idade com base na data de nascimento
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

// Verificar se o CPF já existe
async function cpfExists(cpf) {
    const participant = await prisma.participant.findUnique({
        where: { cpf }
    });
    return participant !== null;
}

// Rota para listar participantes
router.get('/', authenticateToken, async (req, res) => {
    try {
        let participants;

        if (req.user.role === 'diretorjovem') {
            // Se for diretor jovem, listar apenas os participantes que ele cadastrou
            participants = await prisma.participant.findMany({
                where: { createdByUserId: req.user.id }, // Filtra por ID do usuário
                select: {
                    id: true,
                    fullName: true,
                    birthDate: true,
                    age: true,
                    cpf: true,
                    district: true,
                    church: true,
                    createdByUserId: true,
                    paymentConfirmed: true,
                    paymentConfirmationDate: true,
                    confirmedByUserId: true
                }
            });
        } else if (req.user.role === 'administrador') {
            // Se for administrador, listar todos os participantes
            participants = await prisma.participant.findMany({
                select: {
                    id: true,
                    fullName: true,
                    birthDate: true,
                    age: true,
                    cpf: true,
                    district: true,
                    church: true,
                    createdByUserId: true,
                    paymentConfirmed: true,
                    paymentConfirmationDate: true,
                    confirmedByUserId: true
                }
            });
        } else {
            return res.status(403).send({ message: 'Acesso negado' });
        }

        res.send(participants);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Obter um participante por ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const participant = await prisma.participant.findUnique({
            where: { id: req.params.id },
            select: {
                id: true,
                fullName: true,
                birthDate: true,
                age: true,
                cpf: true,
                district: true,
                church: true,
                createdByUserId: true,
                paymentConfirmed: true,
                paymentConfirmationDate: true,
                confirmedByUserId: true
            }
        });
        if (!participant) {
            return res.status(404).send({ message: 'Participante não encontrado' });
        }
        res.send(participant);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Criar um novo participante
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { fullName, birthDate, cpf, district, church } = req.body;
        const age = calculateAge(birthDate);

        // Verificar se o CPF já existe
        if (await cpfExists(cpf)) {
            return res.status(400).send({ message: 'CPF já cadastrado' });
        }

        const newParticipant = await prisma.participant.create({
            data: {
                fullName,
                birthDate: new Date(birthDate),
                age,
                cpf,
                district,
                church,
                createdByUserId: req.user.id // Usar o ID do usuário que está autenticado
            }
        });

        res.status(201).send(newParticipant);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Confirmar ou cancelar pagamento de um participante
router.put('/payment/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params; // Obtém o ID do participante da URL
        const { confirm } = req.body; // Assume que 'confirm' é um booleano para confirmar ou cancelar o pagamento

        // Verifica se o ID é um ObjectID válido
        if (!id || typeof id !== 'string' || id.length !== 24) {
            return res.status(400).send({ error: 'ID do participante inválido' });
        }

        // Atualiza o participante para confirmar ou cancelar o pagamento
        const updatedParticipant = await prisma.participant.update({
            where: { id: id },
            data: {
                paymentConfirmed: confirm,
                paymentConfirmationDate: confirm ? new Date() : null,
                confirmedByUserId: confirm ? req.user.id : null
            }
        });

        res.send(updatedParticipant);
    } catch (err) {
        console.error('Erro ao atualizar pagamento:', err); // Log do erro
        if (err.code === 'P2023') {
            return res.status(400).send({ error: 'ID do participante malformado ou inválido.' });
        }
        res.status(500).send({ error: 'Erro ao atualizar pagamento' });
    }
});


// Deletar um participante por ID
router.delete('/:id', authenticateToken, async (req, res) => {
    // Verifica se o usuário autenticado é um administrador
    if (req.user.role !== 'administrador') {
        return res.status(403).send({ error: 'Acesso negado' });
    }

    try {
        await prisma.participant.delete({
            where: { id: req.params.id }
        });
        res.send({ message: 'Participante deletado' });
    } catch (err) {
        console.error('Erro ao deletar participante:', err);
        res.status(500).send({ error: 'Erro ao deletar participante' });
    }
});




module.exports = router; // Exportando a instância do Router
