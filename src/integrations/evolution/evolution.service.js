import axios from 'axios';
import FormData from 'form-data';


const EVOLUTION_URL =
    process.env.EVOLUTION_URL;

const EVOLUTION_API_KEY =
    process.env.EVOLUTION_API_KEY;

const EVOLUTION_INSTANCE =
    process.env.EVOLUTION_INSTANCE;


// Envia mensagem de texto
export async function enviarTexto(
    numero,
    texto
) {

    const response =
        await axios.post(

            `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,

            {
                number: numero,

                textMessage: {
                    text: texto
                }
            },

            {
                headers: {

                    apikey:
                        EVOLUTION_API_KEY,

                    'Content-Type':
                        'application/json'
                }
            }
        );


    return response.data;
}


// Envia áudio OGG
export async function enviarAudio(
    numero,
    audioBuffer
) {

    const form =
        new FormData();


    form.append(
        'number',
        numero
    );


    form.append(
        'media',
        audioBuffer,
        {
            filename:
                'peter.ogg',

            contentType:
                'audio/ogg'
        }
    );


    form.append(
        'fileName',
        'peter.ogg'
    );


    const response =
        await axios.post(

            `${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`,

            form,

            {
                headers: {

                    ...form.getHeaders(),

                    apikey:
                        EVOLUTION_API_KEY
                }
            }
        );


    return response.data;
}