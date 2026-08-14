import dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

const envPath = fileURLToPath(
    new URL('../../.env', import.meta.url)
);

console.log('Caminho do .env:', envPath);
console.log('Arquivo existe:', existsSync(envPath));

const conteudo = readFileSync(
    envPath,
    'utf-8'
);

const variaveisEncontradas =
    Object.keys(
        dotenv.parse(conteudo)
    );

console.log(
    'Variáveis encontradas:',
    variaveisEncontradas
);

dotenv.config({
    path: envPath
});

if (!process.env.IA_APIKEY) {
    throw new Error(
        'IA_APIKEY não encontrada no .env'
    );
}

if (!process.env.DATABASE_URL) {
    throw new Error(
        'DATABASE_URL não encontrada no .env'
    );
}

export const IA_APIKEY =
    process.env.IA_APIKEY;

export const DATABASE_URL =
    process.env.DATABASE_URL;