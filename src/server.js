const express = require('express');
const dotenv = require('dotenv');
const participantRoutes = require('./Routes/participantRoutes');
const userRoutes = require('./Routes/userRoutes'); // Certifique-se de que isso está correto
const { connectToDatabase, disconnectFromDatabase } = require('./database/database.js'); // Importa funções de conexão

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
    await connectToDatabase(); // Conecta ao banco de dados
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`); // Log do servidor
    });
};

// Desconectar do banco de dados ao encerrar o processo
process.on('SIGINT', async () => {
    await disconnectFromDatabase(); // Desconecta do banco de dados
    process.exit(0); // Encerra o processo
});

// Iniciar o servidor
startServer();
