import express from 'express';

import {
    perguntarIA,
    perguntarIAComAudio,
    analisarMemoria,
    salvarMemoria,
    salvarFeedbackEngenharia,
    esquecerMemoria
} from '../../service/ia.service.js';

import {
    gerarVoz
} from '../../service/tts.service.js';

import {
    pcmParaWav,
    wavParaOggOpus
} from '../../utils/audio.utils.js';

import {
    enviarTexto,
    enviarAudio
} from './evolution.service.js';
const app =
    express();


app.use(
    express.json({
        limit: '50mb'
    })
);


// Remove @s.whatsapp.net do JID
function extrairNumero(data) {

    const jid =
        data?.key?.remoteJid;


    if (!jid) {
        return null;
    }


    return jid
        .replace(
            '@s.whatsapp.net',
            ''
        )
        .replace(
            '@lid',
            ''
        );
}


// Remove prefixo data:audio/...;base64,
function limparBase64(base64) {

    if (!base64) {
        return null;
    }


    const indice =
        base64.indexOf(
            'base64,'
        );


    if (indice !== -1) {

        return base64.slice(
            indice + 7
        );
    }


    return base64;
}


// Tenta localizar o base64 enviado pela Evolution
function pegarBase64(payload) {

    return (

        payload?.data?.message?.base64 ||

        payload?.data?.base64 ||

        payload?.base64 ||

        null
    );
}


// Processa mensagem recebida
async function processarMensagem(
    payload
) {

    const evento =
        String(
            payload?.event || ''
        )
            .toLowerCase();


    if (
        evento !==
        'messages.upsert'
    ) {
        return;
    }


    const data =
        payload?.data;


    if (!data) {
        return;
    }


    // Ignora mensagens enviadas pelo próprio Peter
    if (
        data?.key?.fromMe
    ) {
        return;
    }


    const numero =
        extrairNumero(
            data
        );


    if (!numero) {
        return;
    }


    const message =
        data?.message || {};


    const texto =
        message?.conversation ||

        message
            ?.extendedTextMessage
            ?.text;


    const ehAudio =
        !!message?.audioMessage;


    if (
        !texto &&
        !ehAudio
    ) {
        return;
    }


    const userKey =
        numero;


    console.log(
        'MENSAGEM RECEBIDA:',
        texto || '[ÁUDIO]'
    );


    try {

        // ===== CAMINHO 1: ÁUDIO =====

        if (ehAudio) {

            console.log(
                'ÁUDIO RECEBIDO'
            );


            const base64 =
                pegarBase64(
                    payload
                );


            if (!base64) {

                console.log(
                    'PAYLOAD RECEBIDO:'
                );


                console.log(
                    JSON.stringify(
                        payload,
                        null,
                        2
                    )
                );


                throw new Error(
                    'Evolution não enviou o áudio em base64.'
                );
            }


            const audioBuffer =
                Buffer.from(

                    limparBase64(
                        base64
                    ),

                    'base64'
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


            const wavAudio =
                pcmParaWav(
                    pcmAudio
                );


            const oggAudio =
                await wavParaOggOpus(
                    wavAudio
                );


            console.log(
                'ÁUDIO CONVERTIDO PARA OGG OPUS'
            );


            await enviarAudio(
                numero,
                oggAudio
            );


            console.log(
                'RESPOSTA EM ÁUDIO ENVIADA'
            );


            return;
        }


        // ===== CAMINHO 2: /LEMBRAR =====

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

                await enviarTexto(
                    numero,
                    '🕷 Escreve algo depois do /lembrar, tipo: /lembrar eu treino à noite'
                );


                return;
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


            await enviarTexto(
                numero,
                `🕷🕸️📸 Anotado: "${novaInfo}"`
            );


            return;
        }


        // ===== CAMINHO 3: /ESQUECER =====

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

                await enviarTexto(
                    numero,
                    '🕷 Me diz o que devo esquecer.'
                );


                return;
            }


            const esquecida =
                await esquecerMemoria(
                    userKey,
                    info
                );


            if (esquecida) {

                await enviarTexto(
                    numero,
                    `🕷🕸️📸 Beleza. Esqueci: "${esquecida.context}"`
                );

            } else {

                await enviarTexto(
                    numero,
                    '🕷 Não encontrei uma memória parecida para esquecer.'
                );
            }


            return;
        }


        // ===== CAMINHO 4: TEXTO =====

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


        await enviarTexto(
            numero,
            `🕷🕸️📸 ${resposta}`
        );


        // ===== AUTO APRENDIZADO =====

        try {

            const aprendizado =
                await analisarMemoria(
                    texto,
                    resposta
                );


            if (
                aprendizado?.deveSalvar &&
                aprendizado?.memoria
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
            'ERRO AO PROCESSAR MENSAGEM:',
            erro
        );
    }
}


// Recebe eventos da Evolution
app.post(
    '/webhook/evolution',

    (req, res) => {

        // Responde rápido para a Evolution
        res.sendStatus(200);


        processarMensagem(
            req.body
        ).catch(
            console.error
        );
    }
);


export function iniciarWebhook() {

    const porta =
        process.env.PORT ||
        3000;


    app.listen(
        porta,

        () => {

            console.log(
                `🕷 PeterPark ouvindo na porta ${porta}`
            );

            console.log(
                'Webhook: /webhook/evolution'
            );
        }
    );
}