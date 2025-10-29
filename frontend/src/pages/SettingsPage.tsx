import React from 'react';
import { useNavigate } from 'react-router-dom';
import FeatureCard from '@/components/ui/FeatureCard';
import { Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SettingsPage: React.FC = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const isAdmin = user?.tenant_id === 1;

	return (
		<div className="p-6 space-y-8">
			<header className="space-y-2">
				<h1 className="text-3xl font-semibold text-text-primary">Configurações</h1>
				<p className="text-sm text-text-secondary max-w-2xl">
					Configure integrações, gerencie importações e administre funcionalidades do sistema.
				</p>
			</header>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{/* Card CanalPro - Navega para página dedicada */}
				<FeatureCard
					title="CanalPro"
					description="Gerencie destaques, configure plano e sincronize anúncios com o portal."
					icon={Sparkles}
					iconColor="purple"
					onClick={() => navigate('/canalpro')}
				/>

				{/* Gestão de Usuários - Apenas Admin */}
				{isAdmin && (
					<FeatureCard
						title="Gestão de Usuários"
						description="Acesse o módulo dedicado para administrar contas, corretores e permissões."
						icon={Users}
						iconColor="indigo"
						badge="Admin"
						onClick={() => navigate('/users')}
					/>
				)}
			</div>
		</div>
	);
};

export default SettingsPage;

