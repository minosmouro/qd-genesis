"""
Canal Pro Authentication Manager
Gerenciador de autenticação para o Canal Pro com suporte a JWT Token
Baseado na análise do processo de geração de token realizada em 10/10/2025
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CanalProAuthManager:
    """
    Gerenciador de autenticação para o Canal Pro
    
    Características:
    - Autenticação em duas etapas (email/senha + OTP)
    - Gerenciamento automático de token JWT
    - Renovação automática de token
    - Headers customizados para requisições autenticadas
    """
    
    def __init__(self, email: str, password: str):
        """
        Inicializa o gerenciador de autenticação
        
        Args:
            email: Email de login
            password: Senha de acesso
        """
        self.email = email
        self.password = password
        
        # URLs base
        self.base_url = "https://canalpro.grupozap.com"
        self.api_url = "https://gandalf-api.grupozap.com"
        
        # Dados de autenticação
        self.token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.publisher_id: Optional[str] = None
        self.odin_id: Optional[str] = None
        self.contract_id: Optional[str] = None
        self.contract_type: Optional[str] = None
        
        # Session para manter cookies
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def login_step1(self) -> Dict[str, Any]:
        """
        Primeira etapa do login: envia credenciais e solicita OTP
        
        Returns:
            Dict com status da requisição
            
        Raises:
            Exception: Se houver erro na autenticação
        """
        logger.info(f"Iniciando login para {self.email}")
        
        try:
            # Endpoint de login (precisa ser identificado via DevTools)
            # Este é um exemplo - o endpoint real deve ser capturado
            login_url = f"{self.base_url}/api/auth/login"
            
            payload = {
                "email": self.email,
                "password": self.password
            }
            
            response = self.session.post(login_url, json=payload)
            response.raise_for_status()
            
            logger.info("Credenciais enviadas. Aguardando código OTP por e-mail.")
            
            return {
                "success": True,
                "message": "OTP enviado para o e-mail",
                "data": response.json()
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro no login step 1: {str(e)}")
            raise Exception(f"Falha na autenticação: {str(e)}")
    
    def login_step2(self, otp_code: str) -> Dict[str, Any]:
        """
        Segunda etapa do login: valida OTP e recebe token JWT
        
        Args:
            otp_code: Código OTP de 6 dígitos recebido por e-mail
            
        Returns:
            Dict com token e informações de autenticação
            
        Raises:
            Exception: Se o código OTP for inválido
        """
        logger.info(f"Validando código OTP: {otp_code}")
        
        try:
            # Endpoint de validação OTP (precisa ser identificado)
            otp_url = f"{self.base_url}/api/auth/verify-otp"
            
            payload = {
                "email": self.email,
                "otp": otp_code
            }
            
            response = self.session.post(otp_url, json=payload)
            response.raise_for_status()
            
            data = response.json()
            
            # Extrair token JWT e informações
            self.token = data.get('token') or data.get('access_token')
            
            # Decodificar payload do JWT para obter expiração
            if self.token:
                self._decode_token_info()
            
            # Extrair IDs necessários para headers
            self.publisher_id = data.get('publisherId', '119007')
            self.odin_id = data.get('odinId')
            self.contract_id = data.get('contractId')
            self.contract_type = data.get('contractType', 'IMC')
            
            logger.info("Autenticação concluída com sucesso!")
            logger.info(f"Token válido até: {self.token_expiry}")
            
            return {
                "success": True,
                "token": self.token,
                "expiry": self.token_expiry,
                "data": data
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro no login step 2: {str(e)}")
            raise Exception(f"Falha na validação OTP: {str(e)}")
    
    def _decode_token_info(self):
        """
        Decodifica informações básicas do JWT token
        Extrai a data de expiração do payload
        """
        try:
            import base64
            
            # JWT formato: header.payload.signature
            parts = self.token.split('.')
            if len(parts) != 3:
                logger.warning("Token JWT em formato inválido")
                return
            
            # Decodificar payload (adicionar padding se necessário)
            payload = parts[1]
            payload += '=' * (4 - len(payload) % 4)
            decoded = base64.urlsafe_b64decode(payload)
            payload_data = json.loads(decoded)
            
            # Extrair timestamp de expiração
            exp_timestamp = payload_data.get('exp')
            if exp_timestamp:
                self.token_expiry = datetime.fromtimestamp(exp_timestamp)
                logger.info(f"Token expira em: {self.token_expiry}")
            
            # Extrair outras informações úteis
            self.odin_id = self.odin_id or payload_data.get('odinId')
            
        except Exception as e:
            logger.warning(f"Não foi possível decodificar token: {str(e)}")
    
    def is_token_valid(self) -> bool:
        """
        Verifica se o token ainda é válido
        
        Returns:
            True se o token é válido, False caso contrário
        """
        if not self.token or not self.token_expiry:
            return False
        
        # Considerar token inválido 5 minutos antes da expiração
        buffer_time = timedelta(minutes=5)
        return datetime.now() < (self.token_expiry - buffer_time)
    
    def get_auth_headers(self) -> Dict[str, str]:
        """
        Retorna headers de autenticação para requisições à API
        
        Returns:
            Dict com headers necessários
            
        Raises:
            Exception: Se não houver token válido
        """
        if not self.is_token_valid():
            raise Exception("Token inválido ou expirado. Faça login novamente.")
        
        headers = {
            "authorization": self.token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Adicionar headers customizados se disponíveis
        if self.publisher_id:
            headers["x-publisherid"] = str(self.publisher_id)
        if self.odin_id:
            headers["x-odinId"] = self.odin_id
        if self.contract_id:
            headers["x-contractid"] = self.contract_id
        if self.contract_type:
            headers["x-publishercontracttype"] = self.contract_type
        
        return headers
    
    def make_api_request(
        self, 
        endpoint: str, 
        method: str = "GET", 
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Faz requisição autenticada à API do Canal Pro
        
        Args:
            endpoint: Endpoint da API (ex: /api/real-estate-service/v1/accounts/{id})
            method: Método HTTP (GET, POST, PUT, DELETE)
            data: Dados para enviar no body (para POST/PUT)
            params: Parâmetros de query string
            
        Returns:
            Dict com resposta da API
            
        Raises:
            Exception: Se houver erro na requisição
        """
        if not self.is_token_valid():
            raise Exception("Token expirado. Necessário fazer login novamente.")
        
        url = f"{self.api_url}{endpoint}"
        headers = self.get_auth_headers()
        
        logger.info(f"Fazendo requisição {method} para {url}")
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params
            )
            response.raise_for_status()
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro na requisição: {str(e)}")
            raise Exception(f"Falha na requisição à API: {str(e)}")
    
    def get_account_info(self, account_id: str) -> Dict[str, Any]:
        """
        Obtém informações da conta
        
        Args:
            account_id: ID da conta (odinId)
            
        Returns:
            Dict com informações da conta
        """
        endpoint = f"/api/real-estate-service/v1/accounts/{account_id}"
        return self.make_api_request(endpoint)
    
    def get_contract_info(self, contract_id: str) -> Dict[str, Any]:
        """
        Obtém informações do contrato
        
        Args:
            contract_id: ID do contrato
            
        Returns:
            Dict com informações do contrato
        """
        endpoint = f"/api/real-estate-service/v1/contracts/{contract_id}"
        return self.make_api_request(endpoint)
    
    def get_onboarding_events(self, event_id: str, account_id: str) -> Dict[str, Any]:
        """
        Obtém eventos de onboarding
        
        Args:
            event_id: ID do evento
            account_id: ID da conta
            
        Returns:
            Dict com eventos de onboarding
        """
        endpoint = f"/api/real-estate-service/v1/onboarding/events/{event_id}"
        params = {"accountId": account_id}
        return self.make_api_request(endpoint, params=params)
    
    def save_token_to_file(self, filepath: str = "canalpro_token.json"):
        """
        Salva token e informações de autenticação em arquivo
        
        Args:
            filepath: Caminho do arquivo para salvar
        """
        if not self.token:
            logger.warning("Nenhum token para salvar")
            return
        
        data = {
            "token": self.token,
            "expiry": self.token_expiry.isoformat() if self.token_expiry else None,
            "email": self.email,
            "publisher_id": self.publisher_id,
            "odin_id": self.odin_id,
            "contract_id": self.contract_id,
            "contract_type": self.contract_type,
            "saved_at": datetime.now().isoformat()
        }
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"Token salvo em {filepath}")
    
    def load_token_from_file(self, filepath: str = "canalpro_token.json") -> bool:
        """
        Carrega token e informações de autenticação de arquivo
        
        Args:
            filepath: Caminho do arquivo para carregar
            
        Returns:
            True se token foi carregado e ainda é válido, False caso contrário
        """
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            self.token = data.get('token')
            expiry_str = data.get('expiry')
            if expiry_str:
                self.token_expiry = datetime.fromisoformat(expiry_str)
            
            self.publisher_id = data.get('publisher_id')
            self.odin_id = data.get('odin_id')
            self.contract_id = data.get('contract_id')
            self.contract_type = data.get('contract_type')
            
            if self.is_token_valid():
                logger.info(f"Token carregado de {filepath} - válido até {self.token_expiry}")
                return True
            else:
                logger.warning("Token carregado está expirado")
                return False
                
        except FileNotFoundError:
            logger.info(f"Arquivo {filepath} não encontrado")
            return False
        except Exception as e:
            logger.error(f"Erro ao carregar token: {str(e)}")
            return False


# Exemplo de uso
if __name__ == "__main__":
    # Inicializar gerenciador
    auth = CanalProAuthManager(
        email="ricardo10corretor@gmail.com",
        password="26101982"
    )
    
    # Tentar carregar token salvo
    if not auth.load_token_from_file():
        print("Token não encontrado ou expirado. Iniciando novo login...")
        
        # Etapa 1: Enviar credenciais
        auth.login_step1()
        
        # Etapa 2: Aguardar usuário inserir código OTP
        otp_code = input("Digite o código OTP recebido por e-mail: ")
        result = auth.login_step2(otp_code)
        
        # Salvar token para uso futuro
        auth.save_token_to_file()
    
    # Usar token para fazer requisições
    try:
        if auth.odin_id:
            account_info = auth.get_account_info(auth.odin_id)
            print(f"Informações da conta: {json.dumps(account_info, indent=2)}")
        
        if auth.contract_id:
            contract_info = auth.get_contract_info(auth.contract_id)
            print(f"Informações do contrato: {json.dumps(contract_info, indent=2)}")
            
    except Exception as e:
        print(f"Erro ao fazer requisição: {str(e)}")
