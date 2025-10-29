"""Property status catalog and helpers for user-facing labels."""
from __future__ import annotations

from typing import Any, Dict, List


STATUS_CATEGORY_ORDER = {
    "published": 0,
    "pipeline": 1,
    "problem": 2,
    "other": 99,
}


STATUS_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "active": {
        "label": "Ativo no CanalPro",
        "description": "Imóvel publicado e visível nos portais integrados.",
        "category": "published",
        "category_label": "Publicados",
        "category_order": STATUS_CATEGORY_ORDER["published"],
        "is_active": True,
        "order": 0,
    },
    "exported": {
        "label": "Exportado (aguardando retorno)",
        "description": "Exportação enviada com sucesso, aguardando confirmação do portal.",
        "category": "published",
        "category_label": "Publicados",
        "category_order": STATUS_CATEGORY_ORDER["published"],
        "is_active": True,
        "order": 5,
    },
    "refreshing": {
        "label": "Atualizando no CanalPro",
        "description": "Refresh em andamento para atualizar as informações do anúncio.",
        "category": "pipeline",
        "category_label": "Em processamento",
        "category_order": STATUS_CATEGORY_ORDER["pipeline"],
        "is_active": True,
        "order": 8,
    },
    "synced": {
        "label": "Sincronizado",
        "description": "Dados conferidos e prontos para exportação.",
        "category": "pipeline",
        "category_label": "Em processamento",
        "category_order": STATUS_CATEGORY_ORDER["pipeline"],
        "is_active": False,
        "order": 15,
    },
    "created": {
        "label": "Cadastrado no CRM",
        "description": "Cadastro concluído no CRM, aguardando exportação.",
        "category": "pipeline",
        "category_label": "Em processamento",
        "category_order": STATUS_CATEGORY_ORDER["pipeline"],
        "is_active": False,
        "order": 20,
    },
    "imported": {
        "label": "Importado",
        "description": "Imóvel importado do CanalPro ou outra fonte, aguardando revisão.",
        "category": "pipeline",
        "category_label": "Em processamento",
        "category_order": STATUS_CATEGORY_ORDER["pipeline"],
        "is_active": False,
        "order": 25,
    },
    "pending": {
        "label": "Aguardando processamento",
        "description": "Pipeline ainda não executado para este imóvel.",
        "category": "pipeline",
        "category_label": "Em processamento",
        "category_order": STATUS_CATEGORY_ORDER["pipeline"],
        "is_active": False,
        "order": 30,
    },
    "queued_failed": {
        "label": "Fila com falha",
        "description": "Fila de reprocessamento excedeu o número máximo de tentativas.",
        "category": "problem",
        "category_label": "Com problemas",
        "category_order": STATUS_CATEGORY_ORDER["problem"],
        "is_active": False,
        "order": 40,
    },
    "failed": {
        "label": "Falha definitiva",
        "description": "Pipeline tentou processar e encerrou com erro irreversível.",
        "category": "problem",
        "category_label": "Com problemas",
        "category_order": STATUS_CATEGORY_ORDER["problem"],
        "is_active": False,
        "order": 45,
    },
    "error": {
        "label": "Erro ao processar",
        "description": "O pipeline encontrou um erro. Verifique os logs antes de tentar novamente.",
        "category": "problem",
        "category_label": "Com problemas",
        "category_order": STATUS_CATEGORY_ORDER["problem"],
        "is_active": False,
        "order": 50,
    },
    "unknown": {
        "label": "Status desconhecido",
        "description": "Status não catalogado. Verifique o cadastro do imóvel.",
        "category": "other",
        "category_label": "Outros",
        "category_order": STATUS_CATEGORY_ORDER["other"],
        "is_active": False,
        "order": 90,
    },
}


STATUS_ALIASES = {
    "active": "active",
    "ativo": "active",
    "active_sync": "active",
    "active-refresh": "refreshing",
    "active_refresh": "refreshing",
    "refreshing": "refreshing",
    "refresh": "refreshing",
    "refresh_pending": "refreshing",
    "refresh_in_progress": "refreshing",
    "refresh_failed": "refreshing",
    "synced": "synced",
    "created": "created",
    "imported": "imported",
    "pending": "pending",
    "queued_failed": "queued_failed",
    "failed": "failed",
    "error": "error",
    "exported": "exported",
    "exporting": "exported",
}


STATUS_DEFAULT = STATUS_DEFINITIONS["unknown"]


def normalize_status(status: Any) -> str:
    """Normalize raw status into a catalog key."""

    if status is None:
        return "unknown"

    status_text = str(status).strip()
    if not status_text:
        return "unknown"

    lowered = status_text.lower()
    if "refresh" in lowered:
        return "refreshing"

    return STATUS_ALIASES.get(lowered, lowered)


def get_status_definition(status_key: str) -> Dict[str, Any]:
    """Return catalog definition for the provided status key."""

    return STATUS_DEFINITIONS.get(status_key, STATUS_DEFAULT)


def aggregate_status_counts(status_counts: Dict[Any, int]) -> Dict[str, Any]:
    """Aggregate raw status counts into a normalized summary."""

    normalized_totals: Dict[str, int] = {}
    raw_sources: Dict[str, List[Dict[str, Any]]] = {}
    total_properties = 0

    for raw_status, count in status_counts.items():
        canonical = normalize_status(raw_status)
        normalized_totals[canonical] = normalized_totals.get(canonical, 0) + count
        total_properties += count
        raw_sources.setdefault(canonical, []).append(
            {
                "status": raw_status,
                "count": count,
            }
        )

    by_status: List[Dict[str, Any]] = []
    category_totals: Dict[str, Dict[str, Any]] = {}

    for key, count in normalized_totals.items():
        definition = get_status_definition(key)
        category_key = definition["category"]
        category_entry = category_totals.setdefault(
            category_key,
            {
                "key": category_key,
                "label": definition["category_label"],
                "order": definition["category_order"],
                "count": 0,
            },
        )
        category_entry["count"] += count

        by_status.append(
            {
                "key": key,
                "label": definition["label"],
                "description": definition["description"],
                "category": category_key,
                "category_label": definition["category_label"],
                "category_order": definition["category_order"],
                "is_active": definition["is_active"],
                "order": definition["order"],
                "count": count,
                "sources": raw_sources.get(key, []),
            }
        )

    by_status.sort(key=lambda item: (item["order"], item["label"]))
    by_category = sorted(
        category_totals.values(),
        key=lambda item: (item["order"], item["label"]),
    )

    active_total = sum(item["count"] for item in by_status if item["is_active"])
    inactive_total = total_properties - active_total

    return {
        "total": total_properties,
        "active_total": active_total,
        "inactive_total": inactive_total,
        "by_status": by_status,
        "by_category": by_category,
        "counts_by_key": normalized_totals,
        "raw_statuses": raw_sources,
    }