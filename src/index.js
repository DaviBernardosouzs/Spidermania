import 'dotenv/config';
import { readdirSync } from 'fs';

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage
} from '@whiskeysockets/baileys';

import qrcode from 'qrcode-terminal';

import {
    perguntarIA,
    perguntarIAComAudio,
    analisarMemoria,
    salvarMemoria,
    salvarFeedbackEngenharia,
    esquecerMemoria
} from './service/ia.service.js';

import { gerarVoz } from './service/tts.service.js';

import {
    pcmParaWav,
    wavParaOggOpus
} from './utils/audio.utils.js';

import {
    buildHealthReport,
    createManagedTask,
    formatStatus,
    updateManagedTask
} from './mcp/orchestrator.service.js';

import { team } from './mcp/team.config.js';
import { sendDeliverableArtifact } from './service/whatsapp-artifact.service.js';


// Guarda os áudios enviados pela IA para evitar loop
const audiosEnviadosPeloBot = new Set();


// Pega um gif aleatório da pasta public
function obterGifAleatorio() {

    try {

        const arquivos = readdirSync('./public');

        const gifs = arquivos.filter((arquivo) => {

            const extensao =
                arquivo
                    .split('.')
                    .pop()
                    .toLowerCase();

            return [
                'mp4',
                'webm',
                'gif',
                'jpg',
                'jpeg',
                'png'
            ].includes(extensao);

        });


        if (gifs.length === 0) {
            return null;
        }


        const arquivoSorteado =
            gifs[
            Math.floor(
                Math.random() * gifs.length
            )
            ];


        return `./public/${arquivoSorteado}`;

    } catch (erro) {

        console.error(
            'ERRO AO BUSCAR GIF:',
            erro
        );

        return null;
    }
}


// Envia um gif aleatório da pasta public
async function enviarGifAleatorio(sock, jid) {

    const gif =
        obterGifAleatorio();


    if (!gif) {
        return;
    }


    try {

        await sock.sendMessage(
            jid,
            {
                video: {
                    url: gif
                },

                gifPlayback: true
            }
        );

    } catch (erro) {

        console.error(
            'ERRO AO ENVIAR GIF:',
            erro
        );
    }
}


async function startSock() {

    const {
        state,
        saveCreds
    } = await useMultiFileAuthState(
        'auth_info_baileys'
    );


    const sock = makeWASocket({

        auth: state,

        markOnlineOnConnect: false,

        emitOwnEvents: true

    });


    sock.ev.on(
        'creds.update',
        saveCreds
    );


    sock.ev.on(
        'connection.update',
        (update) => {

            const {
                connection,
                lastDisconnect,
                qr
            } = update;


            if (qr) {

                qrcode.generate(
                    qr,
                    {
                        small: true
                    }
                );
            }


            if (connection === 'open') {

                console.log(
                    '✅ Conectado! Seu LID:',
                    sock.user.lid
                );
            }


            if (connection === 'close') {

                const motivo =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode;


                console.log(
                    'MOTIVO DA DESCONEXÃO:',
                    motivo
                );


                if (
                    motivo !==
                    DisconnectReason.loggedOut
                ) {

                    startSock();

                } else {

                    console.log(
                        'Deslogado. Apague a pasta auth_info_baileys e escaneie de novo.'
                    );
                }
            }
        }
    );


    sock.ev.on(
        'messages.upsert',
        async (event) => {


            // ignora sincronização e histórico
            if (
                event.type !== 'notify'
            ) {
                return;
            }


            const meuLid =
                sock.user.lid
                    .split(':')[0];


            for (
                const msg
                of event.messages
            ) {


                if (
                    !msg.key.remoteJid
                ) {
                    continue;
                }


                // evita loop dos áudios enviados pela própria IA
                if (
                    audiosEnviadosPeloBot.has(
                        msg.key.id
                    )
                ) {

                    audiosEnviadosPeloBot.delete(
                        msg.key.id
                    );

                    continue;
                }


                // aceita somente a conversa comigo mesmo
                const ehConversaComigoMesmo =
                    msg.key.remoteJid
                        .startsWith(
                            meuLid
                        );


                if (
                    !ehConversaComigoMesmo
                ) {
                    continue;
                }


                if (
                    !msg.key.fromMe
                ) {
                    continue;
                }


                const texto =
                    msg.message?.conversation ||

                    msg.message
                        ?.extendedTextMessage
                        ?.text;


                const ehAudio =
                    !!msg.message
                        ?.audioMessage;


                // ignora mensagens que não são nem texto nem áudio
                if (
                    !texto &&
                    !ehAudio
                ) {
                    continue;
                }


                // ignora as próprias respostas em texto da IA
                if (
                    texto?.startsWith(
                        '🕷'
                    )
                ) {
                    continue;
                }


                // mostra somente minhas mensagens no terminal
                console.log(
                    'MENSAGEM RECEBIDA:',
                    texto || '[ÁUDIO]'
                );


                try {

                    const userKey =
                        msg.key.remoteJid;


                    // ===== CAMINHO 1: mensagem de ÁUDIO =====

                    if (ehAudio) {

                        console.log(
                            'ÁUDIO RECEBIDO, baixando...'
                        );


                        const audioBuffer =
                            await downloadMediaMessage(
                                msg,
                                'buffer',
                                {}
                            );


                        const resposta =
                            await perguntarIAComAudio(
                                audioBuffer,
                                userKey
                            );


                        console.log(
                            'RESPOSTA DA IA (áudio):',
                            resposta
                        );


                        const pcmAudio =
                            await gerarVoz(
                                resposta
                            );


                        // Converte PCM para WAV
                        const wavAudio =
                            pcmParaWav(
                                pcmAudio
                            );


                        // Converte WAV para OGG OPUS
                        const oggAudio =
                            await wavParaOggOpus(
                                wavAudio
                            );


                        console.log(
                            'ÁUDIO CONVERTIDO PARA OGG OPUS'
                        );


                        // Envia como mensagem de voz
                        const mensagemEnviada =
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    audio:
                                        oggAudio,

                                    mimetype:
                                        'audio/ogg; codecs=opus',

                                    ptt:
                                        true
                                }
                            );


                        console.log(
                            'RESPOSTA EM ÁUDIO ENVIADA'
                        );


                        // salva o ID para a IA não responder o próprio áudio
                        if (
                            mensagemEnviada
                                ?.key
                                ?.id
                        ) {

                            audiosEnviadosPeloBot.add(
                                mensagemEnviada
                                    .key
                                    .id
                            );
                        }


                        console.log(
                            'RESPOSTA EM ÁUDIO ENVIADA'
                        );


                        // Envia um gif aleatório
                        await enviarGifAleatorio(
                            sock,
                            msg.key.remoteJid
                        );


                        continue;
                    }


                    // ===== CAMINHO 2: comando /lembrar =====

                    if (
                        texto.startsWith(
                            '/lembrar'
                        )
                    ) {

                        const novaInfo =
                            texto
                                .replace(
                                    '/lembrar',
                                    ''
                                )
                                .trim();


                        if (!novaInfo) {

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Escreve algo depois do /lembrar, tipo: /lembrar eu treino à noite'
                                }
                            );

                            continue;
                        }


                        await salvarMemoria({

                            userKey,

                            categoria:
                                'instrucao',

                            contexto:
                                novaInfo,

                            confiabilidade:
                                1.0,

                            explicitamenteSolicitada:
                                true

                        });


                        await sock.sendMessage(
                            msg.key.remoteJid,
                            {
                                text:
                                    `🕷🕸️📸 Anotado: "${novaInfo}"`
                            }
                        );


                        continue;
                    }


                    // ===== CAMINHO 3: comando /esquecer =====

                    if (
                        texto.startsWith(
                            '/esquecer'
                        )
                    ) {

                        const info =
                            texto
                                .replace(
                                    '/esquecer',
                                    ''
                                )
                                .trim();


                        if (!info) {

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Me diz o que devo esquecer.'
                                }
                            );

                            continue;
                        }


                        const esquecida =
                            await esquecerMemoria(
                                userKey,
                                info
                            );


                        if (esquecida) {

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        `🕷🕸️📸 Beleza. Esqueci: "${esquecida.context}"`
                                }
                            );

                        } else {

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Não encontrei uma memória parecida para esquecer.'
                                }
                            );
                        }


                        continue;
                    }


                    // ===== CAMINHO: feedback de engenharia =====

                    if (
                        texto.startsWith(
                            '/feedback'
                        )
                    ) {

                        const feedback =
                            texto
                                .replace(
                                    '/feedback',
                                    ''
                                )
                                .trim();

                        if (!feedback) {
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Use: /feedback sua preferência ou algo que deve ser evitado no código'
                                }
                            );

                            continue;
                        }

                        try {
                            await salvarFeedbackEngenharia(
                                feedback
                            );

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Feedback registrado. Vou levar essa orientação ao Miguel nas próximas delegações.'
                                }
                            );
                        } catch (erro) {
                            console.error(
                                'ERRO AO SALVAR FEEDBACK DE ENGENHARIA:',
                                erro
                            );

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Não consegui registrar o feedback agora. O banco de memória precisa estar disponível.'
                                }
                            );
                        }

                        continue;
                    }


                    if (
                        texto.startsWith(
                            '/enviar-arquivo'
                        )
                    ) {

                        const partes =
                            texto
                                .replace(
                                    '/enviar-arquivo',
                                    ''
                                )
                                .trim()
                                .split('|')
                                .map((parte) => parte.trim());

                        if (!partes[0]) {
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        '🕷 Use: /enviar-arquivo caminho-do-artefato | legenda opcional'
                                }
                            );

                            continue;
                        }

                        try {
                            const enviado =
                                await sendDeliverableArtifact(
                                    sock,
                                    msg.key.remoteJid,
                                    partes[0],
                                    partes[1] || 'Artefato revisado pelo Spider-Team'
                                );

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        `🕷 Arquivo enviado: ${enviado.fileName} (${enviado.size} bytes)`
                                }
                            );
                        } catch (erro) {
                            console.error(
                                'ERRO AO ENVIAR ARTEFATO:',
                                erro
                            );

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                {
                                    text:
                                        `🕷 Não consegui enviar esse artefato: ${erro.message}`
                                }
                            );
                        }

                        continue;
                    }


                    // ===== CAMINHO 4: gestão do time =====

                    if (
                        texto === '/equipe'
                    ) {

                        const equipe =
                            team
                                .map((membro) => `- ${membro.id}: ${membro.name}\n  ${membro.scope}`)
                                .join('\n');

                        await sock.sendMessage(
                            msg.key.remoteJid,
                            { text: `🕷 Time do PeterPark:\n${equipe}` }
                        );

                        continue;
                    }


                    if (
                        texto === '/status'
                    ) {

                        await sock.sendMessage(
                            msg.key.remoteJid,
                            { text: `🕷 Status do projeto:\n${formatStatus()}` }
                        );

                        continue;
                    }


                    if (
                        texto === '/relatorio'
                    ) {

                        await sock.sendMessage(
                            msg.key.remoteJid,
                            { text: `🕷 Relatório de saúde:\n\n${buildHealthReport()}` }
                        );

                        continue;
                    }


                    if (
                        texto.startsWith('/tarefa')
                    ) {

                        const partes =
                            texto
                                .replace('/tarefa', '')
                                .trim()
                                .split('|')
                                .map((parte) => parte.trim());

                        if (partes.length < 2 || !partes[0] || !partes[1]) {
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: '🕷 Use: /tarefa responsável | título | descrição opcional' }
                            );
                            continue;
                        }

                        try {
                            const tarefa = await createManagedTask({
                                owner: partes[0],
                                title: partes[1],
                                description: partes[2] || ''
                            });

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: `🕷 Tarefa criada para ${tarefa.owner}: ${tarefa.title}\nID: ${tarefa.id}` }
                            );
                        } catch (erro) {
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: `🕷 Não consegui criar a tarefa: ${erro.message}` }
                            );
                        }

                        continue;
                    }


                    if (
                        texto.startsWith('/atualizar')
                    ) {

                        const partes =
                            texto
                                .replace('/atualizar', '')
                                .trim()
                                .split('|')
                                .map((parte) => parte.trim());

                        if (partes.length < 2 || !partes[0] || !partes[1]) {
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: '🕷 Use: /atualizar ID | status | nota opcional' }
                            );
                            continue;
                        }

                        try {
                            const tarefa = await updateManagedTask(
                                partes[0],
                                partes[1],
                                partes[2] || ''
                            );

                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: `🕷 Atualizado: [${tarefa.status}] ${tarefa.title}` }
                            );
                        } catch (erro) {
                            await sock.sendMessage(
                                msg.key.remoteJid,
                                { text: `🕷 Não consegui atualizar: ${erro.message}` }
                            );
                        }

                        continue;
                    }


                    // ===== CAMINHO 5: mensagem de TEXTO normal =====

                    console.log(
                        'MENSAGEM DE TEXTO RECEBIDA:',
                        texto
                    );


                    const resposta =
                        await perguntarIA(
                            texto,
                            userKey
                        );


                    console.log(
                        'RESPOSTA DA IA:',
                        resposta
                    );


                    // Envia resposta em texto
                    await sock.sendMessage(
                        msg.key.remoteJid,
                        {
                            text:
                                `🕷🕸️📸 ${resposta}`
                        }
                    );


                    // Envia um gif aleatório
                    await enviarGifAleatorio(
                        sock,
                        msg.key.remoteJid
                    );


                    // ===== AUTO APRENDIZADO =====

                    try {

                        const aprendizado =
                            await analisarMemoria(
                                texto,
                                resposta
                            );


                        if (
                            aprendizado.deveSalvar &&
                            aprendizado.memoria
                        ) {

                            if (aprendizado.escopo === 'team') {
                                await salvarFeedbackEngenharia(
                                    aprendizado.memoria,
                                    aprendizado.targetAgentId || null
                                );
                            } else {
                                await salvarMemoria({
                                    userKey,
                                    categoria: aprendizado.categoria || 'aprendizado',
                                    contexto: aprendizado.memoria,
                                    confiabilidade: aprendizado.confiabilidade || 0.8,
                                    explicitamenteSolicitada: false
                                });
                            }


                            console.log(
                                '🧠 AUTO-APRENDIZADO:',
                                aprendizado.memoria
                            );
                        }


                    } catch (erro) {

                        console.error(
                            'ERRO NO AUTO-APRENDIZADO:',
                            erro
                        );
                    }


                } catch (erro) {

                    console.error(
                        'ERRO ao processar mensagem:',
                        erro
                    );
                }
            }
        }
    );
}


startSock();