// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config(); // opcional: permite usar um .env local para testes

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Variáveis vindas do ambiente (Render)
const INSTANCE_ID = process.env.INSTANCE_ID;
const TOKEN = process.env.TOKEN;
const CLIENT_TOKEN = process.env.CLIENT_TOKEN;

// Armazenamento temporário de OTPs (em memória)
const otps = {};

// Rota principal
app.get('/', (req, res) => {
  res.send('🚀 Servidor FlashNet conectado à Z-API!');
});

// Rota enviar OTP
app.post('/enviar-otp', async (req, res) => {
  const numero = req.body.numero;
  if (!numero) return res.status(400).json({ erro: 'Número do WhatsApp é obrigatório!' });

  const codigoOTP = Math.floor(100000 + Math.random() * 900000);
  const mensagem = `Seu código de verificação FlashNet é: ${codigoOTP}`;

  try {
    const response = await axios.post(
      `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`,
      { phone: numero, message: mensagem },
      { headers: { 'Client-Token': CLIENT_TOKEN } }
    );

    console.log('✅ Mensagem enviada:', response.data);

    // guarda por 5 minutos
    otps[numero] = { codigo: codigoOTP, expira: Date.now() + 5 * 60 * 1000 };

    return res.json({ sucesso: true, numero, mensagem: 'Código enviado com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao enviar:', error.response?.data || error.message);
    return res.status(500).json({
      erro: 'Falha ao enviar mensagem pelo WhatsApp',
      detalhes: error.response?.data || error.message
    });
  }
});

// Rota verificar OTP
app.post('/verificar-otp', (req, res) => {
  const { numero, codigo } = req.body;
  if (!numero || !codigo) return res.status(400).json({ erro: 'Número e código são obrigatórios!' });

  const registro = otps[numero];
  if (!registro) return res.status(400).json({ sucesso: false, erro: 'Código não encontrado. Peça um novo.' });

  if (Date.now() > registro.expira) {
    delete otps[numero];
    return res.status(400).json({ sucesso: false, erro: 'Código expirado. Envie novamente.' });
  }

  if (parseInt(codigo, 10) === registro.codigo) {
    delete otps[numero];
    return res.json({ sucesso: true, mensagem: 'Código válido!' });
  } else {
    return res.status(400).json({ sucesso: false, erro: 'Código incorreto.' });
  }
});

// Porta (Render fornece process.env.PORT; fallback para 3000 para testes locais)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor FlashNet rodando na porta ${PORT}`);
});
