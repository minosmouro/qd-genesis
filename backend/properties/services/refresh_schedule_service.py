"""
Refresh Schedule Service - Gerenciamento de listas de refresh automático
"""
import logging
from datetime import datetime, time
from typing import List, Dict, Any, Optional, Tuple
import pytz  # pylint: disable=import-error

from utils.schedule_utils import calculate_next_run
from models import RefreshSchedule, RefreshScheduleProperty, RefreshJob, Property
from extensions import db
from ..monitoring import monitor_operation, track_database_operation

logger = logging.getLogger(__name__)

# Função auxiliar para garantir que todos os datetimes sejam UTC offset-aware
def ensure_utc_dt(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=pytz.utc)
    return dt.astimezone(pytz.utc)

class RefreshScheduleService:
    """Serviço para gerenciar listas de refresh automático"""

    @staticmethod
    @monitor_operation("create_refresh_schedule")
    @track_database_operation()
    def create_schedule(
        tenant_id: int,
        name: str,
        time_slot: str,  # formato "HH:MM"
        frequency_days: int = 1,
        property_ids: Optional[List[int]] = None,
        days_of_week: Optional[List[int]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Cria uma nova lista de refresh schedule

        Args:
            tenant_id: ID do tenant
            name: Nome da lista (ex: "Lista 01", "Lista VIP")
            time_slot: Horário no formato "HH:MM" (ex: "09:30")
            frequency_days: Frequência em dias (1=diário, 7=semanal)
            property_ids: Lista OBRIGATÓRIA de IDs de imóveis
            days_of_week: Dias da semana em que o refresh deve ocorrer (1=segunda, 7=domingo)

        Returns:
            Tuple[bool, dict]: (sucesso, dados/erro)
        """
        try:
            # Validação obrigatória: property_ids não pode ser None ou vazio
            if not property_ids:
                return False, {'error': 'É necessário selecionar ao menos um imóvel para o agendamento'}
            
            if not isinstance(property_ids, list) or len(property_ids) == 0:
                return False, {'error': 'É necessário selecionar ao menos um imóvel para o agendamento'}

            # Validar horário
            try:
                hour, minute = map(int, time_slot.split(':'))
                time_obj = time(hour, minute)
            except (ValueError, TypeError):
                return False, {'error': 'Invalid time format. Use HH:MM'}

            # Verificar se já existe lista com mesmo nome para o tenant
            existing = RefreshSchedule.query.filter_by(
                tenant_id=tenant_id,
                name=name
            ).first()

            if existing:
                return False, {'error': f'Schedule with name "{name}" already exists'}

            # Criar schedule
            schedule = RefreshSchedule(
                name=name,
                tenant_id=tenant_id,
                time_slot=time_obj,
                frequency_days=frequency_days,
                is_active=True,
                days_of_week=days_of_week if days_of_week is not None else [1,2,3,4,5]
            )

            # Calcular e setar o próximo agendamento
            schedule.next_run = calculate_next_run(schedule)  # Já retorna UTC correto
            schedule.last_run = ensure_utc_dt(schedule.last_run)
            schedule.created_at = ensure_utc_dt(schedule.created_at)
            schedule.updated_at = ensure_utc_dt(schedule.updated_at)

            db.session.add(schedule)
            db.session.flush()  # Para ter o ID

            # Adicionar propriedades se fornecidas
            if property_ids:
                success, result = RefreshScheduleService.add_properties_to_schedule(
                    schedule.id, property_ids, tenant_id
                )
                if not success:
                    db.session.rollback()
                    return False, result

            db.session.commit()

            logger.info("Created refresh schedule: %s for tenant %d", name, tenant_id)
            schedule_dict = schedule.to_dict()
            return True, {
                **schedule_dict,  # Incluir todos os campos do schedule no resultado
                'message': f'Schedule "{name}" created successfully'
            }

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error("Failed to create refresh schedule: %s", str(e))
            return False, {'error': f'Failed to create schedule: {str(e)}'}

    @staticmethod
    @monitor_operation("add_properties_to_schedule")
    def add_properties_to_schedule(
        schedule_id: int,
        property_ids: List[int],
        tenant_id: int
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Adiciona propriedades a uma lista de refresh

        Args:
            schedule_id: ID da lista
            property_ids: IDs das propriedades
            tenant_id: ID do tenant (para validação)

        Returns:
            Tuple[bool, dict]: (sucesso, dados/erro)
        """
        try:
            # Verificar se schedule existe e pertence ao tenant
            schedule = RefreshSchedule.query.filter_by(
                id=schedule_id,
                tenant_id=tenant_id
            ).first()

            if not schedule:
                return False, {'error': 'Schedule not found'}

            # Verificar se propriedades existem e pertencem ao tenant
            properties = Property.query.filter(
                Property.id.in_(property_ids),
                Property.tenant_id == tenant_id
            ).all()

            if len(properties) != len(property_ids):
                found_ids = [p.id for p in properties]
                missing_ids = [pid for pid in property_ids if pid not in found_ids]
                return False, {
                    'error': f'Properties not found or not accessible: {missing_ids}'
                }

            # Adicionar propriedades (ignorar duplicatas)
            added_count = 0
            for prop in properties:
                # Verificar se já existe
                existing = RefreshScheduleProperty.query.filter_by(
                    refresh_schedule_id=schedule_id,
                    property_id=prop.id
                ).first()

                if not existing:
                    rel = RefreshScheduleProperty(
                        refresh_schedule_id=schedule_id,
                        property_id=prop.id
                    )
                    db.session.add(rel)
                    added_count += 1

            db.session.commit()

            logger.info("Added %d properties to schedule %d", added_count, schedule_id)
            return True, {
                'added_count': added_count,
                'total_properties': schedule.properties.count(),
                'message': f'Added {added_count} properties to schedule'
            }

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error("Failed to add properties to schedule: %s", str(e))
            return False, {'error': f'Failed to add properties: {str(e)}'}

    @staticmethod
    @monitor_operation("remove_properties_from_schedule")
    def remove_properties_from_schedule(
        schedule_id: int,
        property_ids: List[int],
        tenant_id: int
    ) -> Tuple[bool, Dict[str, Any]]:
        """Remove propriedades de uma lista de refresh"""
        try:
            # Verificar se schedule existe e pertence ao tenant
            schedule = RefreshSchedule.query.filter_by(
                id=schedule_id,
                tenant_id=tenant_id
            ).first()

            if not schedule:
                return False, {'error': 'Schedule not found'}

            # Remover relacionamentos
            removed_count = RefreshScheduleProperty.query.filter(
                RefreshScheduleProperty.refresh_schedule_id == schedule_id,
                RefreshScheduleProperty.property_id.in_(property_ids)
            ).delete(synchronize_session=False)

            db.session.commit()

            logger.info("Removed %d properties from schedule %d", removed_count, schedule_id)
            return True, {
                'removed_count': removed_count,
                'total_properties': schedule.properties.count(),
                'message': f'Removed {removed_count} properties from schedule'
            }

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error("Failed to remove properties from schedule: %s", str(e))
            return False, {'error': f'Failed to remove properties: {str(e)}'}

    @staticmethod
    @monitor_operation("list_schedules")
    def list_schedules(tenant_id: int) -> List[Dict[str, Any]]:
        """Lista todas as listas de refresh de um tenant"""
        try:
            schedules = RefreshSchedule.query.filter_by(tenant_id=tenant_id).all()
            return [schedule.to_dict() for schedule in schedules]

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Failed to list schedules: %s", str(e))
            return []

    @staticmethod
    @monitor_operation("get_schedule_details")
    def get_schedule_details(schedule_id: int, tenant_id: int) -> Optional[Dict[str, Any]]:
        """Obtém detalhes completos de uma lista de refresh"""
        try:
            schedule = RefreshSchedule.query.filter_by(
                id=schedule_id,
                tenant_id=tenant_id
            ).first()

            if not schedule:
                return None

            # Buscar propriedades da lista
            properties = schedule.properties.all()
            
            # Buscar próximos jobs agendados
            now_utc = datetime.now(pytz.utc)
            next_jobs = RefreshJob.query.filter(
                RefreshJob.refresh_schedule_id == schedule_id,
                RefreshJob.status == 'pending',
                RefreshJob.scheduled_at >= ensure_utc_dt(now_utc)
            ).order_by(RefreshJob.scheduled_at).limit(5).all()

            result = schedule.to_dict()
            result['properties'] = [
                {
                    'id': p.id,
                    'title': p.title,
                    'property_code': p.property_code,
                    'status': p.status
                }
                for p in properties
            ]
            result['next_jobs'] = [job.to_dict() for job in next_jobs]

            return result

        except Exception as e:  # pylint: disable=broad-except
            logger.error("Failed to get schedule details: %s", str(e))
            return None

    @staticmethod
    @monitor_operation("update_schedule")
    def update_schedule(
        schedule_id: int,
        tenant_id: int,
        name: Optional[str] = None,
        time_slot: Optional[str] = None,
        frequency_days: Optional[int] = None,
        is_active: Optional[bool] = None,
        days_of_week: Optional[List[int]] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """Atualiza uma lista de refresh"""
        try:
            schedule = RefreshSchedule.query.filter_by(
                id=schedule_id,
                tenant_id=tenant_id
            ).first()

            if not schedule:
                return False, {'error': 'Schedule not found'}

            # Atualizar campos fornecidos
            if name is not None:
                # Verificar se nome já existe (exceto para este registro)
                existing = RefreshSchedule.query.filter(
                    RefreshSchedule.name == name,
                    RefreshSchedule.tenant_id == tenant_id,
                    RefreshSchedule.id != schedule_id
                ).first()
                if existing:
                    return False, {'error': f'Schedule with name "{name}" already exists'}
                schedule.name = name
            if time_slot is not None:
                hour, minute = map(int, time_slot.split(':'))
                schedule.time_slot = time(hour, minute)
            if frequency_days is not None:
                schedule.frequency_days = frequency_days
            if is_active is not None:
                schedule.is_active = is_active
            if days_of_week is not None:
                schedule.days_of_week = days_of_week

            # Calcular e atualizar o próximo agendamento
            schedule.next_run = calculate_next_run(schedule)  # Já retorna UTC correto
            schedule.last_run = ensure_utc_dt(schedule.last_run)
            schedule.created_at = ensure_utc_dt(schedule.created_at)
            schedule.updated_at = ensure_utc_dt(schedule.updated_at)

            db.session.commit()

            logger.info("Updated refresh schedule: %d", schedule_id)
            return True, schedule.to_dict()

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error("Failed to update schedule: %s", str(e))
            return False, {'error': f'Failed to update schedule: {str(e)}'}

    @staticmethod
    @monitor_operation("delete_schedule")
    def delete_schedule(schedule_id: int, tenant_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Deleta uma lista de refresh"""
        try:
            schedule = RefreshSchedule.query.filter_by(
                id=schedule_id,
                tenant_id=tenant_id
            ).first()

            if not schedule:
                return False, {'error': 'Schedule not found'}

            schedule_name = schedule.name

            # Deletar relacionamentos e jobs pendentes
            RefreshScheduleProperty.query.filter_by(
                refresh_schedule_id=schedule_id
            ).delete()

            RefreshJob.query.filter(
                RefreshJob.refresh_schedule_id == schedule_id,
                RefreshJob.status == 'pending'
            ).delete()

            db.session.delete(schedule)
            db.session.commit()

            logger.info("Deleted refresh schedule %d (%s)", schedule_id, schedule_name)
            return True, {'message': f'Schedule "{schedule_name}" deleted successfully'}

        except Exception as e:  # pylint: disable=broad-except
            db.session.rollback()
            logger.error("Failed to delete schedule: %s", str(e))
            return False, {'error': f'Failed to delete schedule: {str(e)}'}
