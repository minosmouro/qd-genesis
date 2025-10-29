import React from 'react';
import { ArrowLeft, Settings as SettingsIcon, Sparkles, Download, FileBarChart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FeatureCard from '@/components/ui/FeatureCard';
import Modal from '@/components/ui/Modal';
import PlanConfigModal from '@/features/canalpro/modals/PlanConfigModal';
import HighlightsManagerModal from '@/features/canalpro/modals/HighlightsManagerModal';
import ImportPropertiesModal from '@/features/canalpro/modals/ImportPropertiesModal';
import IntegrationSettingsModal from '@/features/canalpro/modals/IntegrationSettingsModal';

type ModalType = 'plan-config' | 'highlights' | 'import' | 'settings' | null;

const CanalProHubPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const activeModal = searchParams.get('modal') as ModalType;

	const openModal = (modal: Exclude<ModalType, null>) => {
		setSearchParams({ modal });
	};

	const closeModal = () => {
		setSearchParams({});
	};

	const modalTitles: Record<Exclude<ModalType, null>, string> = {
		'plan-config': 'Configurar Plano',
		'highlights': 'Gerenciar Destaques',
		'import': 'Importar Imóveis',
		'settings': 'Configurações da Integração'
	};

	return (
		<div className="p-6 space-y-8">
			{/* Header com navegação */}
			<header className="space-y-4">
				<button
					onClick={() => navigate('/settings')}
					className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Voltar para Configurações
				</button>

				<div className="space-y-2">
					<h1 className="text-3xl font-semibold text-text-primary">CanalPro</h1>
					<p className="text-sm text-text-secondary max-w-2xl">
						Gerencie destaques, importe anúncios e configure a integração com o portal CanalPro.
					</p>
				</div>
			</header>

			{/* Grid de Cards - 4 funcionalidades independentes */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Card 1: Configurar Plano (roxo) */}
				<FeatureCard
					title="Configurar Plano"
					description="Configure limites contratuais e cotas de destaques do plano CanalPro."
					icon={FileBarChart}
					iconColor="purple"
					onClick={() => openModal('plan-config')}
				/>

				{/* Card 2: Gerenciar Destaques (dourado/amarelo) */}
				<FeatureCard
					title="Gerenciar Destaques"
					description="Acompanhe KPIs e gerencie destaques premium em massa."
					icon={Sparkles}
					iconColor="orange"
					badge="Principal"
					onClick={() => openModal('highlights')}
				/>

				{/* Card 3: Importar Imóveis (azul) */}
				<FeatureCard
					title="Importar Imóveis"
					description="Sincronize imóveis em massa do CanalPro para o sistema."
					icon={Download}
					iconColor="blue"
					onClick={() => openModal('import')}
				/>

				{/* Card 4: Configurações (indigo) */}
				<FeatureCard
					title="Configurações"
					description="Vincule sua conta CanalPro e gerencie credenciais."
					icon={SettingsIcon}
					iconColor="indigo"
					onClick={() => openModal('settings')}
				/>
			</div>

			{/* Modais especializados */}
			{activeModal === 'plan-config' && (
				<Modal
					isOpen={true}
					onClose={closeModal}
					size="2xl"
					title={modalTitles['plan-config']}
				>
					<PlanConfigModal />
				</Modal>
			)}

			{activeModal === 'highlights' && (
				<Modal
					isOpen={true}
					onClose={closeModal}
					size="2xl"
					title={modalTitles.highlights}
				>
					<HighlightsManagerModal />
				</Modal>
			)}

			{activeModal === 'import' && (
				<Modal
					isOpen={true}
					onClose={closeModal}
					size="2xl"
					title={modalTitles.import}
				>
					<ImportPropertiesModal />
				</Modal>
			)}

			{activeModal === 'settings' && (
				<Modal
					isOpen={true}
					onClose={closeModal}
					size="2xl"
					title={modalTitles.settings}
				>
					<IntegrationSettingsModal
						onNavigateToImport={() => {
							closeModal();
							setTimeout(() => openModal('import'), 100);
						}}
					/>
				</Modal>
			)}
		</div>
	);
};

export default CanalProHubPage;
