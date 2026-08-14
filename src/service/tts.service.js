import { GoogleGenAI } from '@google/genai';
import { IA_APIKEY } from '../config/env.js';

const ai = new GoogleGenAI({
    apiKey: IA_APIKEY
});


// Gera a voz da IA
export async function gerarVoz(texto) {

    const prompt = `
Gere somente a fala do texto abaixo.

Fale em português brasileiro.

Estilo da voz:
- homem jovem;
- voz suave e natural;
- tom amigável;
- levemente tímido;
- descontraído;
- inteligente e nerd;
- humor seco e sarcástico de vez em quando;
- fale como se estivesse conversando com um amigo próximo;
- não fale como narrador;
- não fale como locutor;
- não fale como atendente virtual;
- não exagere nas emoções;
- ritmo natural, não muito rápido;
- faça pequenas pausas naturais entre ideias;
- quando houver uma piada, deixe um leve sorriso na voz;
- quando o assunto for sério, fale de forma mais baixa e calma;
- mantenha uma energia de jovem herói dos anos 2000;
- não imite nenhuma pessoa real específica;
- não leia emojis;
- não leia Markdown;
- não leia símbolos desnecessários.

TEXTO A SER FALADO:

${texto}
`;


    const response =
        await ai.models.generateContent({

            model:
                'gemini-3.1-flash-tts-preview',

            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],

            config: {

                responseModalities: [
                    'AUDIO'
                ],

                speechConfig: {

                    voiceConfig: {

                        prebuiltVoiceConfig: {

                            voiceName:
                                'Achird'

                        }

                    }

                }

            }

        });


    const base64 =
        response
            .candidates?.[0]
            ?.content
            ?.parts?.[0]
            ?.inlineData
            ?.data;


    if (!base64) {

        throw new Error(
            'Gemini não retornou áudio.'
        );

    }


    return Buffer.from(
        base64,
        'base64'
    );
}