#!/usr/bin/env python3
"""
Deployment Manager Script
Facilita o gerenciamento de deploy do Gandalf Backend
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime
import json


def _parse_env_file(env_path: Path) -> dict:
    values: dict[str, str] = {}
    if not env_path.exists():
        return values

    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, raw_value = line.split("=", 1)
        key = key.strip()
        value = raw_value.strip().strip('"').strip("'")
        values[key] = value
    return values


class DeployManager:
    """Gerenciador de deployment para facilitar operações"""

    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.backend_dir = self.project_root / "backend"
        self.deploy_dir = self.backend_dir / "scripts" / "deploy"
        self.compose_file = self.project_root / "docker-compose.prod.yml"
        self.env_file = self.project_root / ".env.production"
        self.compose_project = os.getenv("COMPOSE_PROJECT_NAME", "quadradois")
        self.compose_cmd = (
            f"docker compose --project-name {self.compose_project} -f {self.compose_file}"
        )
        self._env_cache: dict[str, str] | None = None

    def run_command(self, command, cwd=None, check=True):
        """Executa um comando no shell"""
        try:
            # No Windows, usar shell=True com mais cuidado
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd or self.backend_dir,
                capture_output=True,
                text=True,
                check=check
            )
            return result.stdout, result.stderr, result.returncode
        except subprocess.CalledProcessError as e:
            print(f"❌ Command failed: {command}")
            print(f"Error: {e.stderr}")
            return e.stdout, e.stderr, e.returncode
        except Exception as e:
            print(f"❌ Command execution error: {command}")
            print(f"Error: {e}")
            return "", str(e), 1

    def check_environment(self):
        """Verifica se o ambiente está pronto para deploy"""
        print("🔍 Checking deployment environment...")

        checks = {
            'docker': self._check_command('docker --version'),
            'docker_compose': self._check_command('docker compose version'),
            'env_file': self._check_env_file(),
            'dockerfile': self._check_dockerfile(),
            'compose_file': self._check_compose_file()
        }

        all_passed = all(check['status'] for check in checks.values())

        print("\n📋 Environment Check Results:")
        for check_name, result in checks.items():
            status = "✅" if result['status'] else "❌"
            print(f"  {status} {check_name}: {result['message']}")

        if not all_passed:
            print("\n❌ Environment check failed. Please fix the issues above.")
            return False

        print("\n✅ Environment is ready for deployment!")
        return True

    def _check_command(self, command):
        """Verifica se um comando está disponível"""
        stdout, stderr, code = self.run_command(command, check=False)
        if code == 0:
            return {'status': True, 'message': 'Available'}
        else:
            return {'status': False, 'message': 'Not found'}

    def _check_env_file(self):
        """Verifica se o arquivo .env existe"""
        if self.env_file.exists():
            return {'status': True, 'message': 'Found'}
        return {'status': False, 'message': 'Missing (.env.production not found)'}

    def _check_dockerfile(self):
        """Verifica se o Dockerfile existe"""
        dockerfile = self.backend_dir / 'Dockerfile.prod'
        if dockerfile.exists():
            return {'status': True, 'message': 'Found'}
        else:
            return {'status': False, 'message': 'Missing (Dockerfile.prod not found)'}

    def _check_compose_file(self):
        """Verifica se o docker-compose existe"""
        if self.compose_file.exists():
            return {'status': True, 'message': 'Found'}
        return {'status': False, 'message': 'Missing (docker-compose.prod.yml not found)'}

    def deploy(self, environment='staging', skip_checks=False):
        """Executa o deploy completo"""
        print(f"🚀 Starting deployment to {environment}...")

        if not skip_checks and not self.check_environment():
            return False

        # Executar script de deploy
        deploy_script = self.deploy_dir / 'deploy.sh'
        if not deploy_script.exists():
            print("❌ Deploy script not found!")
            return False

        print("📦 Running deployment script...")
        stdout, stderr, code = self.run_command(
            f"bash {deploy_script} {environment} deploy",
            cwd=self.project_root
        )

        if code == 0:
            print("✅ Deployment completed successfully!")
            print(stdout)
            return True
        else:
            print("❌ Deployment failed!")
            print(stderr)
            return False

    def health_check(self):
        """Verifica o health dos serviços"""
        print("🏥 Checking service health...")

        # Verificar containers
        stdout, stderr, code = self.run_command("docker ps --format 'table {{.Names}}\\t{{.Status}}'")
        if code == 0:
            print("📋 Running containers:")
            print(stdout)
        else:
            print("❌ Failed to check containers")
            return False

        # Verificar health endpoint
        print("🔍 Testing API health endpoint...")
        stdout, stderr, code = self.run_command("curl -s http://localhost/api/properties/health")

        if code == 0:
            try:
                health_data = json.loads(stdout)
                status = health_data.get('status', 'unknown')
                if status == 'healthy':
                    print("✅ API is healthy!")
                    return True
                else:
                    print(f"⚠️  API status: {status}")
                    return False
            except json.JSONDecodeError:
                print("❌ Invalid health response")
                return False
        else:
            print("❌ Health check failed")
            return False

    def logs(self, service=None, follow=False):
        """Mostra logs dos serviços"""
        if service:
            command = f"{self.compose_cmd} logs {'-f ' if follow else ''}{service}"
        else:
            command = f"{self.compose_cmd} logs {'-f' if follow else ''}"

        print(f"📜 Showing logs{' (following)' if follow else ''}...")
        os.system(command)

    def backup(self, environment='production'):
        """Cria backup do banco de dados"""
        print(f"💾 Creating database backup for {environment}...")

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"backup_{environment}_{timestamp}.sql"

        # Criar diretório de backups se não existir
        backup_dir = self.backend_dir / 'backups'
        backup_dir.mkdir(exist_ok=True)

        env_values = self._load_env()
        db_user = env_values.get("DATABASE_USER", "postgres")
        db_name = env_values.get("DATABASE_NAME", "postgres")
        db_password = env_values.get("DATABASE_PASSWORD", "")

        password_flag = f"-e PGPASSWORD={db_password} " if db_password else ""

        command = (
            f"{self.compose_cmd} exec -T {password_flag}postgres pg_dump -U {db_user} -d {db_name}"
            f" > {backup_dir / backup_file}"
        )

        stdout, stderr, code = self.run_command(command, cwd=self.project_root)

        if code == 0:
            print(f"✅ Backup created: {backup_file}")
            return True
        else:
            print("❌ Backup failed!")
            print(stderr)
            return False

    def cleanup(self):
        """Limpa recursos não utilizados"""
        print("🧹 Cleaning up unused resources...")

        commands = [
            "docker system prune -f",
            "docker volume prune -f",
            "docker image prune -f"
        ]

        for cmd in commands:
            print(f"Running: {cmd}")
            stdout, stderr, code = self.run_command(cmd)
            if code != 0:
                print(f"Warning: {cmd} failed")

        print("✅ Cleanup completed!")

    def status(self):
        """Mostra status dos serviços"""
        print("📊 Service Status:")

        # Status dos containers
        print("\n🐳 Docker Containers:")
        stdout, stderr, code = self.run_command(
            f"{self.compose_cmd} ps",
            cwd=self.project_root
        )
        print(stdout)

        # Uso de disco
        print("\n� Disk Usage:")
        stdout, stderr, code = self.run_command("docker system df")
        print(stdout)

    def _load_env(self) -> dict:
        if self._env_cache is None:
            self._env_cache = _parse_env_file(self.env_file)
        return self._env_cache


def main():
    parser = argparse.ArgumentParser(description='Gandalf Backend Deployment Manager')
    parser.add_argument('action', choices=['check', 'deploy', 'health', 'logs', 'backup', 'cleanup', 'status'],
                       help='Action to perform')
    parser.add_argument('--env', default='staging', choices=['staging', 'production'],
                       help='Target environment')
    parser.add_argument('--service', help='Specific service for logs')
    parser.add_argument('--follow', action='store_true', help='Follow logs')
    parser.add_argument('--skip-checks', action='store_true', help='Skip environment checks')

    args = parser.parse_args()

    manager = DeployManager()

    if args.action == 'check':
        success = manager.check_environment()
    elif args.action == 'deploy':
        success = manager.deploy(args.env, args.skip_checks)
    elif args.action == 'health':
        success = manager.health_check()
    elif args.action == 'logs':
        manager.logs(args.service, args.follow)
        return  # logs não retorna sucesso/falha
    elif args.action == 'backup':
        success = manager.backup(args.env)
    elif args.action == 'cleanup':
        manager.cleanup()
        return  # cleanup não retorna sucesso/falha
    elif args.action == 'status':
        manager.status()
        return  # status não retorna sucesso/falha

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
