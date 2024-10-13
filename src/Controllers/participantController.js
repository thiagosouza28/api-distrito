const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

// Obter todos os participantes
exports.getParticipants = async (request, response) => {
    try {
        const participants = await prisma.participant.findMany({
            select: {
                id: true,
                fullName: true,
                birthDate: true,
                age: true,
                cpf: true,
                district: true,
                church: true,
                createdByUserId: true,
                paymentConfirmed: true, // Para incluir a confirmação de pagamento
                paymentConfirmationDate: true, // Para incluir a data de confirmação de pagamento
                confirmedByUserId: true // Para incluir o ID do usuário que confirmou o pagamento
            }
        });
        response.send(participants);
    } catch (err) {
        response.status(500).send(err);
    }
};

// Obter todos os participantes de um usuário específico
exports.getParticipantsByUser = async (request, response) => {
    const { createdByUserId } = request.query; // Obtém o ID do usuário da query string

    try {
        const participants = await prisma.participant.findMany({
            where: { createdByUserId }, // Filtra os participantes pelo ID do usuário
        });
        response.send(participants);
    } catch (error) {
        response.status(500).send({ error: 'Erro ao buscar participantes' });
    }
};

// Obter um participante por ID
exports.getParticipantById = async (request, response) => {
    try {
        const participant = await prisma.participant.findUnique({
            where: { id: request.params.id },
            select: {
                id: true,
                fullName: true,
                birthDate: true,
                age: true,
                cpf: true,
                district: true,
                church: true,
                createdByUserId: true,
                paymentConfirmed: true, // Para incluir a confirmação de pagamento
                paymentConfirmationDate: true, // Para incluir a data de confirmação de pagamento
                confirmedByUserId: true // Para incluir o ID do usuário que confirmou o pagamento
            }
        });
        if (!participant) {
            return response.status(404).send({ message: 'Participante não encontrado' });
        }
        response.send(participant);
    } catch (err) {
        response.status(500).send(err);
    }
};

// Criar um novo participante
exports.createParticipant = async (request, response) => {
    try {
        const { fullName, birthDate, cpf, district, church, createdByUserId } = request.body;
        const age = calculateAge(birthDate);

        // Verificar se o CPF já existe
        if (await cpfExists(cpf)) {
            return response.status(400).send({ message: 'CPF já cadastrado' });
        }

        const newParticipant = await prisma.participant.create({
            data: { 
                fullName, 
                birthDate: new Date(birthDate), 
                age, 
                cpf, 
                district, 
                church, 
                createdByUserId // Adicionando o ID do usuário que criou
            }
        });

        response.status(201).send(newParticipant);
    } catch (err) {
        response.status(500).send(err);
    }
};

// Atualizar um participante por ID
exports.updateParticipant = async (request, response) => {
    try {
        const { fullName, birthDate, cpf, district, church } = request.body;
        const age = calculateAge(birthDate);

        // Verificar se o CPF já existe para outro participante
        const participant = await prisma.participant.findUnique({
            where: { id: request.params.id }
        });
        if (!participant) {
            return response.status(404).send({ message: 'Participante não encontrado' });
        }

        if (participant.cpf !== cpf && await cpfExists(cpf)) {
            return response.status(400).send({ message: 'CPF já cadastrado' });
        }

        const updatedParticipant = await prisma.participant.update({
            where: { id: request.params.id },
            data: { 
                fullName, 
                birthDate: new Date(birthDate), 
                age, 
                cpf, 
                district, 
                church 
            }
        });

        response.send(updatedParticipant);
    } catch (err) {
        response.status(500).send(err);
    }
};

// Deletar um participante por ID
exports.deleteParticipant = async (request, response) => {
    try {
        await prisma.participant.delete({
            where: { id: request.params.id }
        });

        response.send({ message: 'Participante deletado' });
    } catch (err) {
        response.status(500).send(err);
    }
};

// Confirmar pagamento de um participante
exports.confirmPayment = async (request, response) => {
    try {
        const { participantId, confirmedByUserId } = request.body;

        const updatedParticipant = await prisma.participant.update({
            where: { id: participantId },
            data: { 
                paymentConfirmed: true, 
                paymentConfirmationDate: new Date(), 
                confirmedByUserId // ID do usuário que confirmou o pagamento
            }
        });

        response.send(updatedParticipant);
    } catch (err) {
        response.status(500).send(err);
    }
};
