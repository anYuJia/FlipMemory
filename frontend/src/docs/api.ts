/**
 * API 文档生成脚本
 * 生成 OpenAPI 3.0 规范的 API 文档
 */

export const apiDocumentation = {
    openapi: '3.0.0',
    info: {
        title: 'FlipMemory API',
        description: '翻转记忆 - 照片日记应用 API 文档',
        version: '1.0.0',
        contact: {
            name: 'FlipMemory Team',
        },
    },
    servers: [
        {
            url: 'http://localhost:3001/api',
            description: '本地开发服务器',
        },
        {
            url: 'https://api.flipmemory.com',
            description: '生产服务器',
        },
    ],
    paths: {
        '/auth/register': {
            post: {
                tags: ['认证'],
                summary: '用户注册',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    username: { type: 'string' },
                                    password: { type: 'string', format: 'password' },
                                    nickname: { type: 'string' },
                                },
                                required: ['email', 'username', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '注册成功',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        code: { type: 'number' },
                                        data: {
                                            type: 'object',
                                            properties: {
                                                user: { type: 'object' },
                                                accessToken: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: '请求参数错误',
                    },
                },
            },
        },
        '/auth/login': {
            post: {
                tags: ['认证'],
                summary: '用户登录',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    account: { type: 'string' },
                                    password: { type: 'string', format: 'password' },
                                },
                                required: ['account', 'password'],
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '登录成功',
                    },
                    401: {
                        description: '用户名或密码错误',
                    },
                },
            },
        },
        '/memories': {
            get: {
                tags: ['记忆'],
                summary: '获取记忆列表',
                parameters: [
                    {
                        name: 'limit',
                        in: 'query',
                        schema: { type: 'number' },
                    },
                    {
                        name: 'offset',
                        in: 'query',
                        schema: { type: 'number' },
                    },
                ],
                responses: {
                    200: {
                        description: '获取成功',
                    },
                },
            },
            post: {
                tags: ['记忆'],
                summary: '创建记忆',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    date: { type: 'string', format: 'date' },
                                    content: { type: 'string' },
                                    mood: { type: 'string' },
                                    photoKeys: { type: 'array', items: { type: 'string' } },
                                },
                                required: ['date'],
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: '创建成功',
                    },
                },
            },
        },
        '/memories/{date}': {
            get: {
                tags: ['记忆'],
                summary: '获取指定日期的记忆',
                parameters: [
                    {
                        name: 'date',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'date' },
                    },
                ],
                responses: {
                    200: {
                        description: '获取成功',
                    },
                    404: {
                        description: '记忆不存在',
                    },
                },
            },
            put: {
                tags: ['记忆'],
                summary: '更新记忆',
                parameters: [
                    {
                        name: 'date',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'date' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    content: { type: 'string' },
                                    mood: { type: 'string' },
                                    isPrivate: { type: 'boolean' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: '更新成功',
                    },
                },
            },
            delete: {
                tags: ['记忆'],
                summary: '删除记忆',
                parameters: [
                    {
                        name: 'date',
                        in: 'path',
                        required: true,
                        schema: { type: 'string', format: 'date' },
                    },
                ],
                responses: {
                    204: {
                        description: '删除成功',
                    },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
}

export default apiDocumentation
