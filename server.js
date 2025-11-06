const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🟢 Substitua aqui pelos seus dados reais da Z-API:
const INSTANCE_ID = '3E9C80F95B7C5131AAD8EE0670334E24';
const TOKEN = 'E3E511D3DCD7B5E1BA6AEC54'; // token da instância
const CLIENT_TOKEN = 'F5049aae91fce47898ddf111a97d0d590S'; // token da aba "Segurança"

// 🧠 Armazena os códigos OTP temporariamente (em memória)
const otps = {};

// 🔹 Rota principal
app.get('/', (req, res) => {
  res.send('Servidor FlashNet conectado à Z-API!');
});

// 🔹 Rota para envio do OTP via WhatsApp
app.post('/enviar-otp', async (req, res) => {
  const numero = req.body.numero;

  if (!numero) {
    return res.status(400).json({ erro: 'Número do WhatsApp é obrigatório!' });
  }

  // Gera código OTP de 6 dígitos
  const codigoOTP = Math.floor(100000 + Math.random() * 900000);
  const mensagem = `Seu código de verificação FlashNet é: ${codigoOTP}`;

  try {
    const response = await axios.post(
      `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}/send-text`,
      {
        phone: numero,
        message: mensagem,
      },
      {
        headers: {
          'Client-Token': CLIENT_TOKEN,
        },
      }
    );

    console.log('✅ Mensagem enviada com sucesso:', response.data);

    // Armazena o código e define validade de 5 minutos
    otps[numero] = { codigo: codigoOTP, expira: Date.now() + 5 * 60 * 1000 };

    res.json({
      sucesso: true,
      numero,
      mensagem: 'Código enviado com sucesso!',
    });
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.response?.data || error.message);
    res.status(500).json({
      erro: 'Falha ao enviar mensagem pelo WhatsApp',
      detalhes: error.response?.data || error.message,
    });
  }
});

// 🔹 Nova rota: Verificar o código OTP
app.post('/verificar-otp', (req, res) => {
  const { numero, codigo } = req.body;

  if (!numero || !codigo) {
    return res.status(400).json({ erro: 'Número e código são obrigatórios!' });
  }

  const registro = otps[numero];
  if (!registro) {
    return res.status(400).json({ sucesso: false, erro: 'Código não encontrado. Peça um novo.' });
  }

  if (Date.now() > registro.expira) {
    delete otps[numero];
    return res.status(400).json({ sucesso: false, erro: 'Código expirado. Envie novamente.' });
  }

  if (parseInt(codigo) === registro.codigo) {
    delete otps[numero];
    return res.json({ sucesso: true, mensagem: 'Código válido!' });
  } else {
    return res.status(400).json({ sucesso: false, erro: 'Código incorreto.' });
  }
});

// 🔹 Iniciar servidor
const port = 3000;
app.listen(port, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
