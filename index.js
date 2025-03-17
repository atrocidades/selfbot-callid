const { Client } = require("discord.js-selfbot-v13");
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const readline = require('readline');
const fs = require('fs');
const { token } = require("./lofy.json");

const client = new Client();
let callId = ""; // ID do canal de voz
let connectedTime = 0; // Contador de tempo em segundos
let isConnected = false; // Verifica se o bot está conectado à call
let intervalId; // Variável para armazenar o intervalo do contador

// Função para perguntar ao usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function promptForCallId() {
  // Verifica se o callId já está no arquivo 'lofy.json'
  const lofyData = JSON.parse(fs.readFileSync('./lofy.json', 'utf8'));
  if (lofyData.callId) {
    callId = lofyData.callId; // Usa o callId já presente no arquivo
    console.log(`🔹 Call ID carregado: ${callId}`);
  } else {
    // Se não houver callId, solicita ao usuário
    callId = await askQuestion("Digite o ID da call que deseja entrar: ");
    lofyData.callId = callId; // Salva o novo callId no arquivo
    fs.writeFileSync('./lofy.json', JSON.stringify(lofyData, null, 2)); // Atualiza o arquivo
    console.log(`🔹 Call ID salvo: ${callId}`);
  }
  rl.close();
}

// Função para verificar as permissões de acesso do bot ao canal
async function checkPermissions(channel) {
  const permissions = channel.permissionsFor(client.user);
  return permissions.has("CONNECT") && permissions.has("SPEAK");
}

// Função para conectar à call
async function connectToCall() {
  try {
    const channel = await client.channels.fetch(callId);

    if (channel && channel.type === 'GUILD_VOICE') {
      const hasPermission = await checkPermissions(channel);

      if (!hasPermission) {
        console.log("❌ Permissões insuficientes para entrar na call.");
        return;
      }

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfMute: false,
        selfDeaf: false
      });

      // Limpa o console e exibe a mensagem de status
      console.clear();
      console.log(`✅ Conectado na call: ${channel.name}`);

      // Iniciar o contador de tempo
      isConnected = true;
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (isConnected) {
            connectedTime++;
            const hours = String(Math.floor(connectedTime / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((connectedTime % 3600) / 60)).padStart(2, '0');
            const seconds = String(connectedTime % 60).padStart(2, '0');
            console.clear(); // Limpa o console
            console.log(`🔹 Logado como ${client.user.tag}`);
            console.log(`🔹 Call ID: ${callId}`);
            console.log(`✅ Conectado na call: ${channel.name}`);
            console.log(`⏱️ Tempo conectado: ${hours}:${minutes}:${seconds}`);
          }
        }, 1000); // Atualiza a cada segundo
      }

    } else {
      console.log("❌ ID inválido ou não é um canal de voz.");
    }
  } catch (error) {
    console.error(`❌ Erro ao conectar na call: ${error.message}`);
  }
}

// Função para desconectar da call
function disconnectFromCall() {
  const connection = getVoiceConnection(callId);
  if (connection) {
    connection.destroy();
    console.clear(); // Limpa o console após desconectar
    console.log("⚠️ Bot desconectado da call.");
    isConnected = false;
  } else {
    console.log("❌ O bot não está conectado a nenhuma call.");
  }
}

// Função para monitorar a conexão e tentar reconectar
setInterval(() => {
  const connection = getVoiceConnection(callId);
  if (!connection) {
    if (isConnected) {
      console.clear(); // Limpa o console antes de exibir a mensagem
      console.log("⚠️ Bot desconectado! Tentando reconectar...");
      isConnected = false;
      connectToCall(); // Tentar reconectar automaticamente
    }
  } else {
    if (!isConnected) {
      console.clear(); // Limpa o console antes de exibir a mensagem
      console.log("✅ Bot reconectado! Continuando o contador.");
      isConnected = true; // Retomar o contador
    }
  }
}, 60000); // Verifica a cada 60 segundos

client.once("ready", async () => {
  console.log(`🔹 Logado como ${client.user.tag}`);
  
  // Se não houver token no arquivo, solicita ao usuário
  if (!token) {
    const inputToken = await askQuestion("Digite o token do Discord: ");
    fs.writeFileSync('./lofy.json', JSON.stringify({ token: inputToken }, null, 2)); // Salva o token no arquivo
    client.login(inputToken);
  } else {
    client.login(token); // Usa o token do arquivo
  }

  await promptForCallId(); // Solicita o ID da call
  connectToCall(); // Conecta assim que o bot inicia
});

client.on('message', async message => {
  if (message.content === "!desconectar") {
    disconnectFromCall();
  }
});

client.login(token);
