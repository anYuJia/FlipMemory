import { FastifyReply, FastifyRequest } from 'fastify'

export interface ApiResponse<T = unknown> {
    code: number
    message?: string
    data?: T
}

export function success<T>(reply: FastifyReply, data: T, statusCode = 200) {
    return reply.status(statusCode).send({
        code: 0,
        data,
    } as ApiResponse<T>)
}

export function error(reply: FastifyReply, message: string, statusCode = 400, code = -1) {
    return reply.status(statusCode).send({
        code,
        message,
    } as ApiResponse)
}

export function notFound(reply: FastifyReply, message = 'Not found') {
    return error(reply, message, 404, 404)
}

export function unauthorized(reply: FastifyReply, message = 'Unauthorized') {
    return error(reply, message, 401, 401)
}

export function forbidden(reply: FastifyReply, message = 'Forbidden') {
    return error(reply, message, 403, 403)
}

export function serverError(reply: FastifyReply, message = 'Internal server error') {
    return error(reply, message, 500, 500)
}
