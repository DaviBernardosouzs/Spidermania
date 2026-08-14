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
    esquecerMemoria
} from './service/ia.service.js';

import { gerarVoz } from './service/tts.service.js';

import {
    pcmParaWav,
    wavParaOggOpus
} from './utils/audio.utils.js';


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


                    // ===== CAMINHO 4: mensagem de TEXTO normal =====

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

                            await salvarMemoria({

                                userKey,

                                categoria:
                                    aprendizado.categoria ||
                                    'aprendizado',

                                contexto:
                                    aprendizado.memoria,

                                confiabilidade:
                                    aprendizado.confiabilidade ||
                                    0.8,

                                explicitamenteSolicitada:
                                    false

                            });


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