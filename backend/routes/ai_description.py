"""
Backend - Gerador de Descrições com IA (GPT-4 Turbo)
Endpoint: POST /api/ai/generate-description
"""
from flask import Blueprint, request, jsonify
from functools import wraps
import os
from typing import Optional, Dict, Any

# Criar blueprint
ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Verificar se OpenAI está instalada
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI não instalado. Execute: pip install openai")

# Cliente OpenAI
client = None
if OPENAI_AVAILABLE:
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        client = OpenAI(api_key=api_key)
    else:
        print("⚠️  OPENAI_API_KEY não configurada no .env")


def require_openai(f):
    """Decorator para verificar se OpenAI está disponível"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not OPENAI_AVAILABLE:
            return jsonify({
                'error': 'OpenAI não está instalada',
                'message': 'Execute: pip install openai',
                'fallback': True
            }), 503
        
        if not client:
            return jsonify({
                'error': 'OPENAI_API_KEY não configurada',
                'message': 'Configure a chave API no arquivo .env',
                'fallback': True
            }), 503
        
        return f(*args, **kwargs)
    return decorated_function


# Mapeamentos de tradução
PROPERTY_TYPE_MAP = {
    'APARTMENT': 'Apartamento',
    'HOUSE': 'Casa',
    'STUDIO': 'Studio',
    'PENTHOUSE': 'Cobertura',
    'COBERTURA': 'Cobertura',
    'LOFT': 'Loft',
    'LOJA': 'Loja',
    'SALA_COMERCIAL': 'Sala Comercial',
    'LOTE_TERRENO': 'Terreno',
    'CASA_CONDOMINIO': 'Casa em Condomínio',
    'FLAT': 'Flat',
    'KITNET_CONJUGADO': 'Kitnet',
}

PROPERTY_STANDARD_MAP = {
    'ECONOMIC': 'econômico',
    'MEDIUM': 'médio padrão',
    'MEDIUM_HIGH': 'médio-alto padrão',
    'HIGH': 'alto padrão',
    'LUXURY': 'luxo',
}


def build_ai_prompt(data: Dict[str, Any], section: str) -> str:
    """
    Constrói o prompt para o GPT-4 baseado na seção solicitada
    
    Args:
        data: Dados do imóvel (PropertyFormData)
        section: 'property' | 'condo' | 'location' | 'values' | 'full'
    
    Returns:
        Prompt formatado para a IA
    """
    # Extrair dados
    property_type = PROPERTY_TYPE_MAP.get(data.get('property_type', ''), 'Imóvel')
    standard = PROPERTY_STANDARD_MAP.get(data.get('property_standard', 'MEDIUM'), 'médio padrão')
    
    bedrooms = data.get('bedrooms', 0)
    bathrooms = data.get('bathrooms', 0)
    suites = data.get('suites', 0)
    parking_spaces = data.get('parking_spaces', 0)
    area = data.get('usable_areas') or data.get('total_areas', 0)
    
    neighborhood = data.get('bairro', '')
    city = data.get('cidade', '')
    
    features = data.get('features', [])
    features_text = ', '.join(features[:5]) if features else 'acabamentos de qualidade'
    
    building_name = data.get('building_name', '')
    condo_features = data.get('condo_features', [])
    condo_features_text = ', '.join(condo_features[:6]) if condo_features else 'infraestrutura completa'
    
    business_type = data.get('business_type', 'SALE')
    price_sale = data.get('price_sale', 0)
    price_rent = data.get('price_rent', 0)
    condo_fee = data.get('condo_fee', 0)
    condo_fee_exempt = data.get('condo_fee_exempt', False)
    iptu = data.get('iptu', 0)
    iptu_exempt = data.get('iptu_exempt', False)
    iptu_period = data.get('iptu_period', 'MONTHLY')
    
    accepts_financing = data.get('accepts_financing', False)
    financing_details = data.get('financing_details', '')
    accepts_exchange = data.get('accepts_exchange', False)
    exchange_details = data.get('exchange_details', '')
    
    # Prompts específicos por seção
    if section == 'property':
        return f"""Você é um corretor de imóveis profissional especializado em descrições persuasivas.

Crie APENAS a seção "Sobre o Imóvel" para este {property_type} de {standard}.

**Dados do Imóvel:**
- Tipo: {property_type}
- Padrão: {standard}
- Área: {area}m²
- Quartos: {bedrooms} (sendo {suites} suítes)
- Banheiros: {bathrooms}
- Vagas: {parking_spaces}
- Características: {features_text}

**Instruções:**
1. Inicie com "**Sobre o Imóvel:**"
2. Descreva o imóvel destacando área, cômodos e características
3. Use linguagem adequada ao padrão "{standard}"
4. Máximo 200 palavras
5. Tom: {"Prático e direto" if standard == "econômico" else "Sofisticado e elegante" if standard in ["alto padrão", "luxo"] else "Equilibrado"}
6. Não mencione preços ou localização (outras seções)

Exemplo de tom para {standard}:
{get_tone_example(standard)}
"""

    elif section == 'condo':
        return f"""Você é um corretor de imóveis profissional.

Crie APENAS a seção "Empreendimento/Condomínio".

**Dados do Condomínio:**
- Nome: {building_name or "Condomínio"}
- Comodidades: {condo_features_text}
- Padrão: {standard}

**Instruções:**
1. Inicie com "**Empreendimento/Condomínio:**"
2. Descreva infraestrutura, lazer e segurança
3. Se não houver nome do condomínio, use "O condomínio"
4. Máximo 150 palavras
5. Destaque diferenciais de segurança e lazer

Se não houver dados suficientes, retorne:
"**Empreendimento/Condomínio:**\n\n(Adicione informações sobre o condomínio nas etapas anteriores)"
"""

    elif section == 'location':
        return f"""Você é um corretor de imóveis profissional.

Crie APENAS a seção "Localização e Região".

**Dados de Localização:**
- Bairro: {neighborhood or "região privilegiada"}
- Cidade: {city or ""}
- Padrão: {standard}

**Instruções:**
1. Inicie com "**Localização e Região:**"
2. Descreva o bairro, infraestrutura e acessibilidade
3. Mencione proximidade de comércio, serviços, transporte
4. Use linguagem adequada ao padrão "{standard}"
5. Máximo 150 palavras
6. Seja específico se tiver dados, genérico se não tiver

Exemplo: "Situado em {neighborhood or "excelente localização"}, {city or "região"} privilegiada..."
"""

    elif section == 'values':
        price_text = ""
        if business_type in ['SALE', 'SALE_RENTAL'] and price_sale:
            price_text = f"R$ {price_sale:,.2f}".replace(',', '_').replace('.', ',').replace('_', '.')
        elif business_type == 'RENTAL' and price_rent:
            price_text = f"R$ {price_rent:,.2f}/mês".replace(',', '_').replace('.', ',').replace('_', '.')
        
        return f"""Você é um corretor de imóveis profissional.

Crie APENAS a seção "Valores e Condições".

**Dados Financeiros:**
- Modalidade: {business_type}
- Preço: {price_text}
- Condomínio: {f"R$ {condo_fee:,.2f}/mês" if condo_fee and not condo_fee_exempt else "Isento" if condo_fee_exempt else "Não informado"}
- IPTU: {f"R$ {iptu:,.2f}/{'mês' if iptu_period == 'MONTHLY' else 'ano'}" if iptu and not iptu_exempt else "Isento" if iptu_exempt else "Não informado"}
- Aceita financiamento: {accepts_financing}
{f"- Detalhes financiamento: {financing_details}" if financing_details else ""}
- Aceita permuta: {accepts_exchange}
{f"- Detalhes permuta: {exchange_details}" if exchange_details else ""}

**Instruções:**
1. Inicie com "**Valores e Condições:**"
2. Liste valores de forma clara (use ** para destacar)
3. Se aceita financiamento, destaque com ✅ e explique facilidade
4. Se aceita permuta, destaque com ✅ e explique
5. Máximo 150 palavras
6. Seja persuasivo mas transparente

Formato esperado:
**Valores e Condições:**

**Valor de venda:** R$ X.XXX.XXX
**Condomínio:** R$ X.XXX/mês (inclui água, gás)
**IPTU:** R$ XXX/mês

✅ **Aceita financiamento bancário** - [explicação persuasiva]
✅ **Aceita permuta** - [explicação]
"""

    else:  # full description
        return f"""Você é um corretor de imóveis profissional especializado em descrições persuasivas e otimizadas para conversão.

Crie uma descrição COMPLETA E ESTRUTURADA em 4 seções para este imóvel.

**Contexto do Imóvel:**
- Tipo: {property_type}
- Padrão: {standard}
- Área: {area}m²
- Quartos: {bedrooms} | Banheiros: {bathrooms} | Vagas: {parking_spaces}
- Características: {features_text}
- Condomínio: {building_name or "N/A"}
- Comodidades: {condo_features_text}
- Localização: {neighborhood}, {city}
- Valor: {price_text if business_type == 'SALE' else f"R$ {price_rent:,.2f}/mês"}

**Instruções:**
1. Crie 4 seções claramente separadas por \\n\\n
2. Use ** para títulos de seção e destaques
3. Adapte linguagem ao padrão "{standard}"
4. Total: 400-600 palavras
5. SEO-friendly com palavras-chave naturais
6. Inclua call-to-action ao final

**Estrutura Obrigatória:**

**Sobre o Imóvel:**
[Descrição do imóvel]

**Empreendimento/Condomínio:**
[Descrição do condomínio]

**Localização e Região:**
[Descrição da localização]

**Valores e Condições:**
[Valores e facilidades]

**Tom para {standard}:**
{get_tone_example(standard)}
"""


def get_tone_example(standard: str) -> str:
    """Retorna exemplo de tom para cada padrão"""
    tones = {
        'econômico': 'Prático, direto, focado em custo-benefício e acessibilidade',
        'médio padrão': 'Equilibrado, destaca conforto e qualidade de vida',
        'médio-alto padrão': 'Sofisticado, menciona qualidade e exclusividade',
        'alto padrão': 'Elegante, usa palavras como "requinte", "sofisticação", "premium"',
        'luxo': 'Ultra sofisticado, palavras como "exclusividade", "obra-prima", "incomparável"',
    }
    return tones.get(standard, tones['médio padrão'])


@ai_bp.route('/generate-description', methods=['POST'])
@require_openai
def generate_description():
    """
    Endpoint para gerar descrições com IA
    
    POST /api/ai/generate-description
    Body: {
        "data": { PropertyFormData },
        "section": "property" | "condo" | "location" | "values" | "full"
    }
    
    Returns: {
        "content": "Descrição gerada...",
        "section": "property",
        "model": "gpt-4-turbo-preview",
        "tokens": 350
    }
    """
    try:
        body = request.get_json()
        
        if not body:
            return jsonify({'error': 'Body vazio'}), 400
        
        data = body.get('data', {})
        section = body.get('section', 'full')
        
        if not data:
            return jsonify({'error': 'Campo "data" obrigatório'}), 400
        
        # Validar seção
        valid_sections = ['property', 'condo', 'location', 'values', 'full']
        if section not in valid_sections:
            return jsonify({'error': f'Seção inválida. Use: {", ".join(valid_sections)}'}), 400
        
        # Construir prompt
        prompt = build_ai_prompt(data, section)
        
        # Chamar GPT-4 Turbo
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",  # ou "gpt-4o" para mais barato
            messages=[
                {
                    "role": "system",
                    "content": "Você é um corretor de imóveis profissional especializado em descrições persuasivas, otimizadas para SEO e que convertem. Escreva em português brasileiro com linguagem natural e envolvente."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=800,
            temperature=0.7,  # Criatividade moderada
            top_p=0.9,
        )
        
        # Extrair resposta
        content = response.choices[0].message.content.strip()
        tokens_used = response.usage.total_tokens
        
        return jsonify({
            'content': content,
            'section': section,
            'model': response.model,
            'tokens': tokens_used,
            'cost_estimate': f"R$ {(tokens_used / 1000) * 0.01:.4f}",  # GPT-4 Turbo: ~$0.01/1K tokens
        }), 200
        
    except Exception as e:
        print(f"❌ Erro ao gerar descrição: {e}")
        return jsonify({
            'error': 'Erro ao processar requisição',
            'message': str(e),
            'fallback': True
        }), 500


@ai_bp.route('/health', methods=['GET'])
def health_check():
    """Verifica se o serviço de IA está disponível"""
    return jsonify({
        'status': 'healthy' if OPENAI_AVAILABLE and client else 'unavailable',
        'openai_installed': OPENAI_AVAILABLE,
        'api_key_configured': client is not None,
        'model': 'gpt-4-turbo-preview',
    }), 200 if (OPENAI_AVAILABLE and client) else 503


# Registrar blueprint no app principal
def register_ai_routes(app):
    """Registra as rotas de IA no app Flask"""
    app.register_blueprint(ai_bp)
    print("✅ Rotas de IA registradas em /api/ai")
