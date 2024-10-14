const express = require('express');
const dotenv = require('dotenv');
const participantRoutes = require('./Routes/participantRoutes'); // Rotas de participantes
const userRoutes = require('./Routes/userRoutes'); // Rotas de usuários
const { connectToDatabase, disconnectFromDatabase } = require('./database/database.js'); // Funções de conexão

dotenv.config(); // Carrega as variáveis do .env

const app = express();
const port = process.env.PORT || 5000; // Usa a porta definida nas variáveis de ambiente

// Middleware para permitir o uso de JSON nas requisições
app.use(express.json());

// Registrando as rotas
app.use('/api/participants', participantRoutes); 
app.use('/api/users', userRoutes); // Registrar o router de usuários

// Função para iniciar o servidor
const startServer = async () => {
    try {
        await connectToDatabase(); // Conecta ao banco de dados
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`); // Log do servidor
        });
    } catch (error) {
        console.error('Error connecting to the database', error);
        process.exit(1); // Encerra o processo em caso de falha na conexão
    }
};

// Desconectar do banco de dados ao encerrar o processo
process.on('SIGINT', async () => {
    await disconnectFromDatabase(); // Desconecta do banco de dados
    process.exit(0); // Encerra o processo
});

// Iniciar o servidor
startServer();
