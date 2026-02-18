"""
Motor de diccionario jurídico para corrección automática de transcripciones.
Usa Levenshtein + Soundex adaptado para español para detección rápida (<50ms por segmento).
"""
import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)


def _soundex_es(word: str) -> str:
    """
    Soundex adaptado para español.
    Agrupa consonantes por sonido similar en español latinoamericano.
    """
    if not word:
        return ""
    
    word = word.lower().strip()
    if not word:
        return ""
    
    # Mapeo de letras a códigos por sonido en español
    mapping = {
        'b': '1', 'v': '1', 'f': '1', 'p': '1',
        'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2',
        'd': '3', 't': '3',
        'l': '4',
        'm': '5', 'n': '5', 'ñ': '5',
        'r': '6',
    }
    
    # Primera letra se mantiene
    result = word[0].upper()
    prev_code = mapping.get(word[0], '0')
    
    for char in word[1:]:
        code = mapping.get(char, '0')
        if code != '0' and code != prev_code:
            result += code
            if len(result) >= 5:
                break
        prev_code = code if code != '0' else prev_code
    
    # Pad con zeros
    return result.ljust(5, '0')


def _levenshtein(a: str, b: str) -> int:
    """Distancia de Levenshtein optimizada."""
    if len(a) < len(b):
        return _levenshtein(b, a)
    
    if len(b) == 0:
        return len(a)
    
    prev_row = list(range(len(b) + 1))
    
    for i, ca in enumerate(a):
        curr_row = [i + 1]
        for j, cb in enumerate(b):
            cost = 0 if ca.lower() == cb.lower() else 1
            curr_row.append(min(
                curr_row[j] + 1,       # inserción
                prev_row[j + 1] + 1,   # eliminación
                prev_row[j] + cost     # sustitución
            ))
        prev_row = curr_row
    
    return prev_row[-1]


class Correction:
    """Resultado de una corrección sugerida."""
    __slots__ = ('original', 'suggested', 'confidence', 'category', 'context', 'position_start', 'position_end')
    
    def __init__(self, original: str, suggested: str, confidence: float,
                 category: str, context: str, position_start: int = 0, position_end: int = 0):
        self.original = original
        self.suggested = suggested
        self.confidence = confidence
        self.category = category
        self.context = context
        self.position_start = position_start
        self.position_end = position_end
    
    def to_dict(self) -> dict:
        return {
            "original_word": self.original,
            "suggested_word": self.suggested,
            "confidence": round(self.confidence, 3),
            "category": self.category,
            "context": self.context,
            "position": {"start": self.position_start, "end": self.position_end},
        }


class LegalDictionary:
    """
    Diccionario jurídico con fuzzy matching.
    Carga términos de legal_terms.json y ofrece correcciones en <50ms.
    """
    
    def __init__(self):
        self._terms: list[dict] = []
        self._variant_map: dict[str, dict] = {}  # variante_lower → {correcto, categoria, contexto}
        self._correct_set: set[str] = set()        # todos los términos correctos en lower
        self._soundex_index: dict[str, list[dict]] = {}  # soundex → lista de términos
        self._loaded = False
    
    def load_terms(self, filepath: Optional[str] = None) -> None:
        """Carga los términos desde el archivo JSON."""
        if filepath is None:
            filepath = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "data", "legal_terms.json"
            )
        
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._terms = data.get("terminos", [])
            
            for term in self._terms:
                correcto = term["correcto"]
                correcto_lower = correcto.lower()
                categoria = term.get("categoria", "general")
                contexto = term.get("contexto", "")
                
                # Agregar al set de correctos
                self._correct_set.add(correcto_lower)
                
                # Agregar cada palabra del término multi-palabra
                for word in correcto_lower.split():
                    if len(word) >= 4:  # Solo palabras significativas
                        self._correct_set.add(word)
                
                # Mapear variantes erróneas
                for variante in term.get("variantes_error", []):
                    var_lower = variante.lower()
                    if var_lower != correcto_lower:
                        self._variant_map[var_lower] = {
                            "correcto": correcto,
                            "categoria": categoria,
                            "contexto": contexto,
                        }
                
                # Indexar por Soundex para matching fonético
                soundex = _soundex_es(correcto_lower.split()[0])
                if soundex not in self._soundex_index:
                    self._soundex_index[soundex] = []
                self._soundex_index[soundex].append({
                    "correcto": correcto,
                    "categoria": categoria,
                    "contexto": contexto,
                })
            
            self._loaded = True
            logger.info(f"Legal dictionary loaded: {len(self._terms)} terms, "
                       f"{len(self._variant_map)} error variants")
            
        except FileNotFoundError:
            logger.warning(f"Legal terms file not found: {filepath}")
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing legal terms JSON: {e}")
    
    def check_segment(self, text: str) -> list[Correction]:
        """
        Verifica un segmento de texto y retorna correcciones sugeridas.
        Target: <50ms por segmento.
        """
        if not self._loaded:
            self.load_terms()
        
        corrections: list[Correction] = []
        if not text or not text.strip():
            return corrections
        
        # Tokenizar respetando posiciones
        words_with_positions = self._tokenize(text)
        
        for word, pos_start, pos_end in words_with_positions:
            word_lower = word.lower().rstrip('.,;:!?¿¡')
            
            # Skip palabras cortas (artículos, preposiciones)
            if len(word_lower) < 4:
                continue
            
            # Skip si la palabra ya es correcta
            if word_lower in self._correct_set:
                continue
            
            # 1. Búsqueda directa en variantes conocidas (más rápido)
            if word_lower in self._variant_map:
                match = self._variant_map[word_lower]
                corrections.append(Correction(
                    original=word,
                    suggested=match["correcto"],
                    confidence=0.95,
                    category=match["categoria"],
                    context=match["contexto"],
                    position_start=pos_start,
                    position_end=pos_end,
                ))
                continue
            
            # 2. Búsqueda por Soundex + Levenshtein (fuzzy)
            fuzzy_match = self._fuzzy_find(word_lower)
            if fuzzy_match:
                corrections.append(Correction(
                    original=word,
                    suggested=fuzzy_match["correcto"],
                    confidence=fuzzy_match["confidence"],
                    category=fuzzy_match["categoria"],
                    context=fuzzy_match["contexto"],
                    position_start=pos_start,
                    position_end=pos_end,
                ))
        
        return corrections
    
    def _tokenize(self, text: str) -> list[tuple[str, int, int]]:
        """Tokeniza el texto preservando posiciones."""
        result = []
        for match in re.finditer(r'\S+', text):
            result.append((match.group(), match.start(), match.end()))
        return result
    
    def _fuzzy_find(self, word: str) -> Optional[dict]:
        """
        Encuentra la mejor corrección fuzzy para una palabra.
        Usa Soundex para filtrar candidatos y Levenshtein para ranking.
        """
        soundex = _soundex_es(word)
        candidates = self._soundex_index.get(soundex, [])
        
        # Si no hay candidatos por Soundex, buscar en los 3 Soundex más cercanos
        if not candidates:
            all_keys = list(self._soundex_index.keys())
            close_keys = [k for k in all_keys if _levenshtein(soundex, k) <= 1]
            for key in close_keys:
                candidates.extend(self._soundex_index[key])
        
        if not candidates:
            return None
        
        best_match = None
        best_confidence = 0.0
        
        for candidate in candidates:
            correcto = candidate["correcto"].lower()
            # Para términos multi-palabra, comparar con la primera palabra
            first_word = correcto.split()[0]
            
            dist = _levenshtein(word, first_word)
            max_len = max(len(word), len(first_word))
            
            if max_len == 0:
                continue
            
            confidence = 1.0 - (dist / max_len)
            
            # Solo sugerir si la confianza es > 0.65
            if confidence > 0.65 and confidence > best_confidence:
                best_confidence = confidence
                best_match = {
                    **candidate,
                    "confidence": confidence,
                }
        
        return best_match
    
    def search_term(self, query: str, limit: int = 10) -> list[dict]:
        """Busca en el diccionario por término para el panel de diccionario."""
        if not self._loaded:
            self.load_terms()
        
        query_lower = query.lower().strip()
        results = []
        
        for term in self._terms:
            correcto_lower = term["correcto"].lower()
            if query_lower in correcto_lower or correcto_lower.startswith(query_lower):
                results.append({
                    "termino": term["correcto"],
                    "categoria": term.get("categoria", "general"),
                    "contexto": term.get("contexto", ""),
                    "variantes": term.get("variantes_error", []),
                })
                if len(results) >= limit:
                    break
        
        return results


# Singleton instance
_dictionary: Optional[LegalDictionary] = None


def get_legal_dictionary() -> LegalDictionary:
    """Obtiene la instancia singleton del diccionario."""
    global _dictionary
    if _dictionary is None:
        _dictionary = LegalDictionary()
        _dictionary.load_terms()
    return _dictionary
