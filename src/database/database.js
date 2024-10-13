// src/database.js
const { PrismaClient } = require('@prisma/client');

// Cria uma instância do PrismaClient
const prisma = new PrismaClient();

// Função para conectar ao banco de dados
const connectToDatabase = async () => {
    try {
        await prisma.$connect();
        console.log('Conectado ao banco de dados com sucesso');
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        process.exit(1); // Encerra o processo se a conexão falhar
    }
};

// Função para desconectar do banco de dados
const disconnectFromDatabase = async () => {
    await prisma.$disconnect();
    console.log('Desconectado do banco de dados');
};

// Exportando o PrismaClient e as funções de conexão
module.exports = {
    prisma,
    connectToDatabase,
    disconnectFromDatabase,
};
