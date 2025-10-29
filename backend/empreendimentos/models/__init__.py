"""
Models for Empreendimentos module (lazy export)
"""

__all__ = ["Empreendimento", "EmpreendimentoEditSuggestion"]

def __getattr__(name):
    if name == "Empreendimento":
        from .empreendimento import Empreendimento  # local import evita ImportError em carregamento parcial
        return Empreendimento
    if name == "EmpreendimentoEditSuggestion":
        from .edit_suggestion import EmpreendimentoEditSuggestion
        return EmpreendimentoEditSuggestion
    raise AttributeError(name)
