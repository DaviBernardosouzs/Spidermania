import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';


// Converte PCM para WAV
export function pcmParaWav(
    pcm,
    sampleRate = 24000,
    channels = 1,
    bitsPerSample = 16
) {

    const header = Buffer.alloc(44);

    const byteRate =
        sampleRate *
        channels *
        bitsPerSample / 8;

    const blockAlign =
        channels *
        bitsPerSample / 8;


    header.write(
        'RIFF',
        0
    );

    header.writeUInt32LE(
        36 + pcm.length,
        4
    );

    header.write(
        'WAVE',
        8
    );

    header.write(
        'fmt ',
        12
    );

    header.writeUInt32LE(
        16,
        16
    );

    header.writeUInt16LE(
        1,
        20
    );

    header.writeUInt16LE(
        channels,
        22
    );

    header.writeUInt32LE(
        sampleRate,
        24
    );

    header.writeUInt32LE(
        byteRate,
        28
    );

    header.writeUInt16LE(
        blockAlign,
        32
    );

    header.writeUInt16LE(
        bitsPerSample,
        34
    );

    header.write(
        'data',
        36
    );

    header.writeUInt32LE(
        pcm.length,
        40
    );


    return Buffer.concat([
        header,
        pcm
    ]);
}


// Converte WAV para OGG OPUS
export function wavParaOggOpus(wavBuffer) {

    return new Promise(
        (resolve, reject) => {

            const ffmpeg =
                spawn(
                    ffmpegPath,
                    [
                        '-i',
                        'pipe:0',

                        '-c:a',
                        'libopus',

                        '-b:a',
                        '48k',

                        '-vbr',
                        'on',

                        '-f',
                        'ogg',

                        'pipe:1'
                    ]
                );


            const partes = [];


            ffmpeg.stdout.on(
                'data',
                (data) => {

                    partes.push(
                        data
                    );
                }
            );


            ffmpeg.stderr.on(
                'data',
                () => {
                    // Ignora logs normais do FFmpeg
                }
            );


            ffmpeg.on(
                'error',
                (erro) => {

                    reject(
                        erro
                    );
                }
            );


            ffmpeg.on(
                'close',
                (codigo) => {

                    if (
                        codigo !== 0
                    ) {

                        reject(
                            new Error(
                                `FFmpeg terminou com código ${codigo}`
                            )
                        );

                        return;
                    }


                    resolve(
                        Buffer.concat(
                            partes
                        )
                    );
                }
            );


            ffmpeg.stdin.write(
                wavBuffer
            );

            ffmpeg.stdin.end();
        }
    );
}