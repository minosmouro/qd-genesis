"""
API Documentation - OpenAPI/Swagger Specification
Documentação completa da API Properties usando OpenAPI 3.0
"""
from flask import Blueprint, jsonify, request, current_app
import json
from datetime import datetime

# Blueprint para documentação da API
api_docs_bp = Blueprint('api_docs', __name__, url_prefix='/api/docs')

# Configuração do Swagger UI (simplificada)
SWAGGER_URL = '/api/docs'
API_URL = '/api/docs/swagger.json'

# Especificação OpenAPI completa
OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "Gandalf Properties API",
        "description": """
# Gandalf Properties API

API RESTful para gerenciamento de propriedades imobiliárias do sistema Gandalf.

## Funcionalidades

- ✅ **CRUD de Propriedades**: Criar, ler, atualizar e deletar propriedades
- ✅ **Importação em Massa**: Importar propriedades de fontes externas
- ✅ **Operações em Lote**: Deletar múltiplas propriedades simultaneamente
- ✅ **Upload de Imagens**: Gerenciar imagens das propriedades
- ✅ **Monitoramento**: Health checks e métricas do sistema
- ✅ **Autenticação**: Controle de acesso baseado em tenant

## Autenticação

A API utiliza autenticação baseada em JWT tokens. Inclua o token no header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- **100 requests/minuto** por IP
- **1000 requests/hora** por tenant

## Formatos de Resposta

Todas as respostas seguem o formato JSON padrão:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso",
  "timestamp": "2025-09-09T16:30:00Z"
}
```

## Códigos de Status HTTP

- **200**: Sucesso
- **201**: Criado
- **400**: Requisição inválida
- **401**: Não autorizado
- **403**: Proibido
- **404**: Não encontrado
- **422**: Dados inválidos
- **500**: Erro interno do servidor
        """,
        "version": "1.0.0",
        "contact": {
            "name": "Gandalf Development Team",
            "email": "dev@gandalf.com",
            "url": "https://gandalf.com"
        },
        "license": {
            "name": "Proprietary",
            "url": "https://gandalf.com/license"
        }
    },
    "servers": [
        {
            "url": "http://localhost:5000",
            "description": "Development server"
        },
        {
            "url": "https://api-staging.gandalf.com",
            "description": "Staging server"
        },
        {
            "url": "https://api.gandalf.com",
            "description": "Production server"
        }
    ],
    "security": [
        {
            "bearerAuth": []
        }
    ],
    "tags": [
        {
            "name": "Properties",
            "description": "Operações CRUD de propriedades"
        },
        {
            "name": "Bulk Operations",
            "description": "Operações em lote"
        },
        {
            "name": "Import",
            "description": "Importação de dados externos"
        },
        {
            "name": "Upload",
            "description": "Upload de arquivos"
        },
        {
            "name": "Health",
            "description": "Monitoramento e health checks"
        }
    ],
    "paths": {
        # Properties CRUD
        "/properties": {
            "get": {
                "tags": ["Properties"],
                "summary": "Listar propriedades",
                "description": "Retorna uma lista paginada de propriedades do tenant",
                "parameters": [
                    {
                        "name": "page",
                        "in": "query",
                        "schema": {"type": "integer", "default": 1},
                        "description": "Número da página"
                    },
                    {
                        "name": "per_page",
                        "in": "query",
                        "schema": {"type": "integer", "default": 20},
                        "description": "Itens por página"
                    },
                    {
                        "name": "status",
                        "in": "query",
                        "schema": {"type": "string", "enum": ["active", "inactive", "sold"]},
                        "description": "Filtrar por status"
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Lista de propriedades",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "success": {"type": "boolean"},
                                        "data": {
                                            "type": "object",
                                            "properties": {
                                                "properties": {
                                                    "type": "array",
                                                    "items": {"$ref": "#/components/schemas/Property"}
                                                },
                                                "pagination": {"$ref": "#/components/schemas/Pagination"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "post": {
                "tags": ["Properties"],
                "summary": "Criar propriedade",
                "description": "Cria uma nova propriedade",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/PropertyInput"}
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Propriedade criada",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "success": {"type": "boolean"},
                                        "data": {"$ref": "#/components/schemas/Property"}
                                    }
                                }
                            }
                        }
                    },
                    "422": {"$ref": "#/components/responses/ValidationError"}
                }
            }
        },
        "/properties/{id}": {
            "get": {
                "tags": ["Properties"],
                "summary": "Obter propriedade",
                "description": "Retorna uma propriedade específica",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "integer"},
                        "description": "ID da propriedade"
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Propriedade encontrada",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "success": {"type": "boolean"},
                                        "data": {"$ref": "#/components/schemas/Property"}
                                    }
                                }
                            }
                        }
                    },
                    "404": {"$ref": "#/components/responses/NotFound"}
                }
            },
            "put": {
                "tags": ["Properties"],
                "summary": "Atualizar propriedade",
                "description": "Atualiza uma propriedade existente",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "integer"},
                        "description": "ID da propriedade"
                    }
                ],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/PropertyUpdate"}
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Propriedade atualizada",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "success": {"type": "boolean"},
                                        "data": {"$ref": "#/components/schemas/Property"}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "delete": {
                "tags": ["Properties"],
                "summary": "Deletar propriedade",
                "description": "Remove uma propriedade",
                "parameters": [
                    {
                        "name": "id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "integer"},
                        "description": "ID da propriedade"
                    }
                ],
                "responses": {
                    "204": {"description": "Propriedade deletada"},
                    "404": {"$ref": "#/components/responses/NotFound"}
                }
            }
        },

        # Bulk Operations
        "/properties/bulk/delete": {
            "post": {
                "tags": ["Bulk Operations"],
                "summary": "Deletar múltiplas propriedades (exclusão inteligente)",
                "description": "Remove várias propriedades em lote com controle de tipo de exclusão (soft, local, CanalPro, ambos).",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "property_ids": {
                                        "type": "array",
                                        "items": {"type": "integer"},
                                        "description": "Lista de IDs das propriedades"
                                    },
                                    "deletion_type": {
                                        "type": "string",
                                        "enum": ["soft", "local", "canalpro", "both"],
                                        "description": "Tipo de exclusão. Padrão: soft"
                                    },
                                    "reason": {"type": "string", "nullable": True},
                                    "notes": {"type": "string", "nullable": True},
                                    "confirmed": {"type": "boolean", "description": "Obrigatório quando deletion_type=both"}
                                },
                                "required": ["property_ids"]
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Operação em lote realizada",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {"type": "string"},
                                        "deleted": {"type": "integer"},
                                        "refresh_jobs_deleted": {"type": "integer"},
                                        "total_processed": {"type": "integer"},
                                        "success_count": {"type": "integer"},
                                        "failure_count": {"type": "integer"},
                                        "deletion_type": {"type": "string"},
                                        "results": {
                                            "type": "array",
                                            "items": {
                                                "type": "object",
                                                "properties": {
                                                    "property_id": {"type": "integer"},
                                                    "success": {"type": "boolean"},
                                                    "message": {"type": "string"},
                                                    "status": {"type": "integer"},
                                                    "canalpro_status": {"type": "string"},
                                                    "local_status": {"type": "string"},
                                                    "deletion_type": {"type": "string"}
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "500": {"$ref": "#/components/responses/InternalServerError"}
                }
            }
        },

        # Alias legado para compatibilidade
        "/properties/bulk-delete": {
            "post": {
                "tags": ["Bulk Operations"],
                "summary": "Alias de /properties/bulk/delete (legado)",
                "description": "Compatível com clientes antigos que utilizam /properties/bulk-delete.",
                "requestBody": {"$ref": "#/paths/~1properties~1bulk~1delete/post/requestBody"},
                "responses": {"$ref": "#/paths/~1properties~1bulk~1delete/post/responses"}
            }
        },

        # Import Operations
        "/properties/import/gandalf": {
            "post": {
                "tags": ["Import"],
                "summary": "Importar do Gandalf",
                "description": "Importa propriedades da API externa do Gandalf",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "options": {
                                        "type": "object",
                                        "properties": {
                                            "page_size": {"type": "integer", "default": 50},
                                            "status_filter": {"type": "string"},
                                            "force_update": {"type": "boolean", "default": False}
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Importação realizada",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "success": {"type": "boolean"},
                                        "data": {
                                            "type": "object",
                                            "properties": {
                                                "imported_count": {"type": "integer"},
                                                "updated_count": {"type": "integer"},
                                                "errors": {"type": "array", "items": {"type": "string"}},
                                                "duration": {"type": "number"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        # Health Checks
        "/properties/health": {
            "get": {
                "tags": ["Health"],
                "summary": "Health check básico",
                "description": "Verifica se a API está funcionando",
                "responses": {
                    "200": {
                        "description": "API saudável",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "status": {"type": "string", "enum": ["healthy", "warning", "unhealthy"]},
                                        "timestamp": {"type": "number"},
                                        "version": {"type": "string"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/properties/health/detailed": {
            "get": {
                "tags": ["Health"],
                "summary": "Health check detalhado",
                "description": "Verificação completa de todos os componentes",
                "security": [{"apiKey": []}],
                "responses": {
                    "200": {
                        "description": "Status detalhado",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "status": {"type": "string"},
                                        "timestamp": {"type": "number"},
                                        "checks": {
                                            "type": "object",
                                            "properties": {
                                                "database": {"$ref": "#/components/schemas/HealthCheck"},
                                                "external_apis": {"$ref": "#/components/schemas/HealthCheck"},
                                                "system": {"$ref": "#/components/schemas/HealthCheck"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "/properties/health/metrics": {
            "get": {
                "tags": ["Health"],
                "summary": "Métricas do sistema",
                "description": "Retorna métricas de performance e uso",
                "security": [{"apiKey": []}],
                "responses": {
                    "200": {
                        "description": "Métricas do sistema",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/Metrics"}
                            }
                        }
                    }
                }
            }
        }
    },
    "components": {
        "securitySchemes": {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT"
            },
            "apiKey": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key"
            }
        },
        "schemas": {
            "Property": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer", "description": "ID único da propriedade"},
                    "external_id": {"type": "string", "description": "ID externo da propriedade"},
                    "title": {"type": "string", "description": "Título da propriedade"},
                    "description": {"type": "string", "description": "Descrição detalhada"},
                    "price": {"type": "number", "description": "Preço da propriedade"},
                    "status": {"type": "string", "enum": ["active", "inactive", "sold"]},
                    "property_type": {"type": "string", "description": "Tipo da propriedade"},
                    "bedrooms": {"type": "integer", "description": "Número de quartos"},
                    "bathrooms": {"type": "integer", "description": "Número de banheiros"},
                    "area": {"type": "number", "description": "Área em metros quadrados"},
                    "address": {"$ref": "#/components/schemas/Address"},
                    "images": {"type": "array", "items": {"$ref": "#/components/schemas/Image"}},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                }
            },
            "PropertyInput": {
                "type": "object",
                "required": ["title", "price", "property_type"],
                "properties": {
                    "external_id": {"type": "string"},
                    "title": {"type": "string", "minLength": 1, "maxLength": 200},
                    "description": {"type": "string"},
                    "price": {"type": "number", "minimum": 0},
                    "status": {"type": "string", "enum": ["active", "inactive", "sold"], "default": "active"},
                    "property_type": {"type": "string"},
                    "bedrooms": {"type": "integer", "minimum": 0},
                    "bathrooms": {"type": "integer", "minimum": 0},
                    "area": {"type": "number", "minimum": 0},
                    "address": {"$ref": "#/components/schemas/AddressInput"}
                }
            },
            "PropertyUpdate": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "minLength": 1, "maxLength": 200},
                    "description": {"type": "string"},
                    "price": {"type": "number", "minimum": 0},
                    "status": {"type": "string", "enum": ["active", "inactive", "sold"]},
                    "bedrooms": {"type": "integer", "minimum": 0},
                    "bathrooms": {"type": "integer", "minimum": 0},
                    "area": {"type": "number", "minimum": 0}
                }
            },
            "Address": {
                "type": "object",
                "properties": {
                    "street": {"type": "string"},
                    "number": {"type": "string"},
                    "complement": {"type": "string"},
                    "neighborhood": {"type": "string"},
                    "city": {"type": "string"},
                    "state": {"type": "string"},
                    "zip_code": {"type": "string"},
                    "country": {"type": "string"}
                }
            },
            "AddressInput": {
                "type": "object",
                "properties": {
                    "street": {"type": "string"},
                    "number": {"type": "string"},
                    "complement": {"type": "string"},
                    "neighborhood": {"type": "string"},
                    "city": {"type": "string"},
                    "state": {"type": "string"},
                    "zip_code": {"type": "string"},
                    "country": {"type": "string", "default": "Brazil"}
                }
            },
            "Image": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "url": {"type": "string", "format": "uri"},
                    "filename": {"type": "string"},
                    "size": {"type": "integer"},
                    "mime_type": {"type": "string"},
                    "is_main": {"type": "boolean"},
                    "order": {"type": "integer"}
                }
            },
            "Pagination": {
                "type": "object",
                "properties": {
                    "page": {"type": "integer"},
                    "per_page": {"type": "integer"},
                    "total": {"type": "integer"},
                    "pages": {"type": "integer"},
                    "has_next": {"type": "boolean"},
                    "has_prev": {"type": "boolean"}
                }
            },
            "HealthCheck": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["healthy", "warning", "unhealthy"]},
                    "message": {"type": "string"},
                    "response_time": {"type": "number"}
                }
            },
            "Metrics": {
                "type": "object",
                "properties": {
                    "total_requests": {"type": "integer"},
                    "total_errors": {"type": "integer"},
                    "error_rate": {"type": "number"},
                    "avg_response_time": {"type": "number"},
                    "max_response_time": {"type": "number"},
                    "min_response_time": {"type": "number"},
                    "requests_by_endpoint": {"type": "object"},
                    "errors_by_type": {"type": "object"},
                    "operations_count": {"type": "object"},
                    "database_operations": {"type": "integer"},
                    "external_api_calls": {"type": "integer"},
                    "timestamp": {"type": "number"}
                }
            },
            "Error": {
                "type": "object",
                "properties": {
                    "success": {"type": "boolean", "example": False},
                    "error": {
                        "type": "object",
                        "properties": {
                            "code": {"type": "string"},
                            "message": {"type": "string"},
                            "details": {"type": "object"}
                        }
                    },
                    "timestamp": {"type": "string", "format": "date-time"}
                }
            }
        },
        "responses": {
            "ValidationError": {
                "description": "Dados de entrada inválidos",
                "content": {
                    "application/json": {
                        "schema": {"$ref": "#/components/schemas/Error"},
                        "example": {
                            "success": False,
                            "error": {
                                "code": "VALIDATION_ERROR",
                                "message": "Dados inválidos",
                                "details": {
                                    "price": ["Preço deve ser maior que zero"],
                                    "title": ["Título é obrigatório"]
                                }
                            },
                            "timestamp": "2025-09-09T16:30:00Z"
                        }
                    }
                },
                "NotFound": {
                    "description": "Recurso não encontrado",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/Error"},
                            "example": {
                                "success": False,
                                "error": {
                                    "code": "NOT_FOUND",
                                    "message": "Propriedade não encontrada"
                                },
                                "timestamp": "2025-09-09T16:30:00Z"
                            }
                        }
                    }
                },
                "Unauthorized": {
                    "description": "Não autorizado",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/Error"},
                            "example": {
                                "success": False,
                                "error": {
                                    "code": "UNAUTHORIZED",
                                    "message": "Token JWT inválido ou expirado"
                                },
                                "timestamp": "2025-09-09T16:30:00Z"
                            }
                        }
                    }
                }
            }
        }
    }
}


@api_docs_bp.route('/swagger.json')
def swagger_json():
    """Retorna a especificação OpenAPI em JSON"""
    return jsonify(OPENAPI_SPEC)


@api_docs_bp.route('/')
def api_docs():
    """Página inicial da documentação da API"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Gandalf Properties API Documentation</title>
        <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui.css" />
        <style>
            html {{
                box-sizing: border-box;
                overflow: -moz-scrollbars-vertical;
                overflow-y: scroll;
            }}
            *, *:before, *:after {{
                box-sizing: inherit;
            }}
            body {{
                margin:0;
                background: #fafafa;
            }}
        </style>
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui-bundle.js"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5.7.2/swagger-ui-standalone-preset.js"></script>
        <script>
        window.onload = function() {{
            const ui = SwaggerUIBundle({{
                url: '/api/docs/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: true,
                requestInterceptor: (req) => {{
                    // Adicionar token de exemplo para testes
                    if (!req.headers.Authorization) {{
                        req.headers.Authorization = 'Bearer your-jwt-token-here';
                    }}
                    return req;
                }}
            }});
        }};
        </script>
    </body>
    </html>
    """


def init_api_docs(app):
    """Inicializa a documentação da API"""
    app.register_blueprint(api_docs_bp)
