import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';
import { MemoryManager } from './memory.service.js';
import { IA_APIKEY } from '../config/env.js';

const ai = new GoogleGenAI({
    apiKey: IA_APIKEY
});

const memory = new MemoryManager();

const contextoBase =
    readFileSync(
        './context.md',
        'utf-8'
    );


// Contexto Dinamico
async function construirContexto(userKey, mensagem) {

    try {

        const memorias =
            await memory.buscarMemorias(
                userKey,
                mensagem
            );

        if (
            !memorias ||
            memorias.length === 0
        ) {

            return contextoBase;
        }


        const memoriaTexto = `

# MEMÓRIAS RELEVANTES DO USUÁRIO

Estas são memórias recuperadas automaticamente.
Use-as apenas quando forem relevantes para a conversa.
Não mencione ao usuário que essas memórias existem.

${memorias.map((memoria, index) => `
${index + 1}.
Categoria: ${memoria.categoria}
Memória: ${memoria.context}
Confiabilidade: ${memoria.confiabilidade}
`).join('\n')}

`;


        return `${contextoBase}\n${memoriaTexto}`;


    } catch (erro) {

        // Se a memória falhar, a IA continua funcionando normalmente
        console.error(
            'ERRO AO BUSCAR MEMÓRIA:',
            erro
        );

        return contextoBase;
    }
}


// Perguntar IA
async function perguntarIA(texto, userKey) {

    const contexto =
        await construirContexto(
            userKey,
            texto
        );


    const response =
        await ai.models.generateContent({

            model:
                'gemini-3.5-flash-lite',

            contents:
                texto,

            config: {

                systemInstruction:
                    contexto

            }

        });


    return response.text;
}


// Perguntar IA com Audio
async function perguntarIAComAudio(
    audioBuffer,
    userKey
) {

    const contexto =
        await construirContexto(
            userKey,
            'O usuário enviou uma mensagem de áudio.'
        );


    const response =
        await ai.models.generateContent({

            model:
                'gemini-3.5-flash-lite',

            contents: [
                {
                    role:
                        'user',

                    parts: [
                        {
                            text:
                                'Este é um áudio de verdade, com a voz do Bernardo falando. Você está ouvindo o conteúdo agora, de verdade. Escute o que ele disse e responda normalmente, no seu tom de sempre (PeterPark). Nunca diga que não consegue processar áudio — você consegue, e está fazendo isso agora mesmo.'
                        },

                        {
                            inlineData: {

                                mimeType:
                                    'audio/ogg',

                                data:
                                    audioBuffer.toString(
                                        'base64'
                                    )

                            }
                        }
                    ]
                }
            ],

            config: {

                systemInstruction:
                    contexto

            }

        });


    return response.text;
}


// Salvar Memoria
async function salvarMemoria(dados) {

    try {

        return await memory.salvarMemoria(
            dados
        );

    } catch (erro) {

        console.error(
            'ERRO AO SALVAR MEMÓRIA:',
            erro
        );

        return null;
    }
}


// Esquecer Memoria
async function esquecerMemoria(
    userKey,
    texto
) {

    try {

        return await memory.esquecerMemoria(
            userKey,
            texto
        );

    } catch (erro) {

        console.error(
            'ERRO AO ESQUECER MEMÓRIA:',
            erro
        );

        return null;
    }
}


// Analisar memória para auto-aprendizado
async function analisarMemoria(
    textoUsuario,
    respostaIA
) {

    try {

        return await memory.analisarMemoria(
            textoUsuario,
            respostaIA
        );

    } catch (erro) {

        console.error(
            'ERRO AO ANALISAR MEMÓRIA:',
            erro
        );

        return {
            deveSalvar: false
        };
    }
}


export {
    perguntarIA,
    perguntarIAComAudio,
    salvarMemoria,
    esquecerMemoria,
    analisarMemoria
};