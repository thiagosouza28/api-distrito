const jwt = require('jsonwebtoken');
require('dotenv').config(); // Carregar variáveis de ambiente do .env

const authenticateToken = (request, response, next) => {
    const token = request.headers['authorization'];

    if (!token) {
        console.error('Token não fornecido'); // Log do erro
        return response.status(401).send({ error: 'Token não fornecido' });
    }

    // Verifica se o token tem o prefixo 'Bearer'
    const tokenWithoutBearer = token.split(' ')[1];
    if (!tokenWithoutBearer) {
        console.error('Formato do token inválido'); // Log do erro
        return response.status(401).send({ error: 'Formato do token inválido' });
    }

    jwt.verify(tokenWithoutBearer, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            console.error('Token inválido:', err.message); // Log do erro de token
            return response.status(403).send({ error: 'Token inválido' });
        }

        // Adiciona os dados do usuário ao objeto de solicitação
        request.user = decoded;
        console.log('Dados decodificados do token:', decoded); // Log dos dados decodificados
        next(); // Chama o próximo middleware
    });
};

module.exports = { authenticateToken }; // Exportando a função de autenticação
