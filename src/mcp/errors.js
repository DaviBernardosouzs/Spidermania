export class McpDomainError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'McpDomainError';
        this.code = code;
        this.details = details;
    }
}

export function asToolError(error) {
    if (error instanceof McpDomainError) {
        return {
            code: error.code,
            message: error.message,
            details: error.details
        };
    }

    return {
        code: 'INTERNAL_ERROR',
        message: 'A operação não pôde ser concluída.'
    };
}
