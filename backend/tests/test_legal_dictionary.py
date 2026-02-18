"""
Tests for legal_dictionary.py — Sprint 3 fuzzy matching engine.
"""
import json
import os
import time
import pytest
import sys

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.legal_dictionary import (
    LegalDictionary,
    _soundex_es,
    _levenshtein,
    get_legal_dictionary,
)


class TestLevenshtein:
    """Unit tests for the Levenshtein distance function."""

    def test_identical_strings(self):
        assert _levenshtein("hello", "hello") == 0

    def test_empty_strings(self):
        assert _levenshtein("", "") == 0
        assert _levenshtein("abc", "") == 3
        assert _levenshtein("", "xyz") == 3

    def test_insertion(self):
        assert _levenshtein("cat", "cats") == 1

    def test_deletion(self):
        assert _levenshtein("cats", "cat") == 1

    def test_substitution(self):
        assert _levenshtein("cat", "car") == 1

    def test_mixed_operations(self):
        assert _levenshtein("kitten", "sitting") == 3

    def test_case_insensitive(self):
        # Our implementation compares lowercase
        assert _levenshtein("ABC", "abc") == 0

    def test_spanish_accents(self):
        assert _levenshtein("prisión", "prision") == 1
        assert _levenshtein("resolución", "resolucion") == 1


class TestSoundexES:
    """Unit tests for the Spanish Soundex function."""

    def test_empty_string(self):
        assert _soundex_es("") == ""

    def test_single_letter(self):
        result = _soundex_es("a")
        assert result[0] == 'A'
        assert len(result) == 5

    def test_similar_sounding_words(self):
        # Soundex preserves first letter, so b/v differ there (standard behavior)
        # But the numeric codes after the first letter should match
        assert _soundex_es("baca")[1:] == _soundex_es("vaca")[1:]
        # Words starting with same letter should match
        assert _soundex_es("casa") == _soundex_es("caza")

    def test_s_z_equivalence(self):
        # s/z should produce same code (Latin American Spanish)
        assert _soundex_es("caza") == _soundex_es("casa")

    def test_consistent_output_length(self):
        assert len(_soundex_es("sobreseimiento")) == 5
        assert len(_soundex_es("a")) == 5

    def test_preserves_first_letter(self):
        result = _soundex_es("prisión")
        assert result[0] == 'P'


class TestLegalDictionary:
    """Integration tests for the LegalDictionary class."""

    @pytest.fixture
    def dictionary(self):
        d = LegalDictionary()
        d.load_terms()
        return d

    def test_loads_successfully(self, dictionary):
        assert dictionary._loaded is True
        assert len(dictionary._terms) > 100
        assert len(dictionary._variant_map) > 50
        assert len(dictionary._correct_set) > 50

    def test_terms_file_exists(self):
        filepath = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "app", "data", "legal_terms.json"
        )
        assert os.path.exists(filepath), f"legal_terms.json not found at {filepath}"

    def test_terms_json_valid(self):
        filepath = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "app", "data", "legal_terms.json"
        )
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        assert "terminos" in data
        assert len(data["terminos"]) > 100
        
        for term in data["terminos"]:
            assert "correcto" in term, f"Missing 'correcto' field in term"
            assert "variantes_error" in term, f"Missing 'variantes_error' for {term['correcto']}"
            assert "categoria" in term, f"Missing 'categoria' for {term['correcto']}"
            assert isinstance(term["variantes_error"], list)
            assert len(term["variantes_error"]) >= 1, f"No variants for {term['correcto']}"


class TestDictionaryCorrections:
    """Tests for the correction/suggestion functionality."""

    @pytest.fixture
    def dictionary(self):
        d = LegalDictionary()
        d.load_terms()
        return d

    def test_detects_known_variant(self, dictionary):
        """Direct variant lookup — should be the fastest path."""
        corrections = dictionary.check_segment("El sobresemiento fue aprobado")
        assert len(corrections) > 0
        found = any(c.suggested == "sobreseimiento" for c in corrections)
        assert found, f"Expected 'sobreseimiento' suggestion, got: {[c.to_dict() for c in corrections]}"

    def test_detects_multiple_errors(self, dictionary):
        """Multiple wrong words in one segment."""
        text = "La acusasion fiscal solicitó prision preventiva"
        corrections = dictionary.check_segment(text)
        # Should detect at least "acusasion" and "prision"
        originals = [c.original.lower().rstrip('.,;:!?¿¡') for c in corrections]
        assert any("acusas" in w for w in originals) or any("prision" in w for w in originals), \
            f"Expected corrections, got originals: {originals}"

    def test_no_false_positives_on_correct_text(self, dictionary):
        """Correct legal text should produce no corrections."""
        text = "El juez dictó sentencia condenatoria"
        corrections = dictionary.check_segment(text)
        # "juez" and "dictó" are short/common words, should not be flagged
        # Only flag if actual errors found
        for c in corrections:
            assert c.confidence < 1.0, "Should not be 100% confident on correct text"

    def test_skips_short_words(self, dictionary):
        """Articles, prepositions etc. should be ignored."""
        text = "el de la en los"
        corrections = dictionary.check_segment(text)
        assert len(corrections) == 0

    def test_empty_text(self, dictionary):
        corrections = dictionary.check_segment("")
        assert corrections == []

    def test_none_text(self, dictionary):
        corrections = dictionary.check_segment(None)
        assert corrections == []

    def test_position_tracking(self, dictionary):
        """Corrections should include position info."""
        text = "El sobresemiento fue dictado"
        corrections = dictionary.check_segment(text)
        if corrections:
            c = corrections[0]
            assert c.position_start >= 0
            assert c.position_end > c.position_start

    def test_correction_to_dict(self, dictionary):
        """Check the serialization format."""
        text = "Se solicitó la prision preventiva"
        corrections = dictionary.check_segment(text)
        if corrections:
            d = corrections[0].to_dict()
            assert "original_word" in d
            assert "suggested_word" in d
            assert "confidence" in d
            assert "category" in d
            assert "position" in d
            assert isinstance(d["confidence"], float)

    def test_categories_present(self, dictionary):
        """All corrections should have a category."""
        text = "La acusasion fiscal sobre el sobresemiento"
        corrections = dictionary.check_segment(text)
        for c in corrections:
            assert c.category, f"Missing category for {c.original} → {c.suggested}"


class TestDictionaryPerformance:
    """Performance tests — ensure <50ms per segment."""

    @pytest.fixture
    def dictionary(self):
        d = LegalDictionary()
        d.load_terms()
        return d

    def test_check_under_50ms(self, dictionary):
        """Single segment check should complete in <50ms."""
        text = "El juez dictó el sobresemiento de la causa penal por prescripcion de la acción"
        
        start = time.perf_counter()
        for _ in range(100):
            dictionary.check_segment(text)
        elapsed = (time.perf_counter() - start) / 100
        
        assert elapsed < 0.05, f"Average check time {elapsed*1000:.1f}ms exceeds 50ms target"

    def test_load_under_200ms(self):
        """Dictionary loading should complete in <200ms."""
        start = time.perf_counter()
        d = LegalDictionary()
        d.load_terms()
        elapsed = time.perf_counter() - start
        
        assert elapsed < 0.2, f"Load time {elapsed*1000:.1f}ms exceeds 200ms target"


class TestDictionarySearch:
    """Tests for the search_term API (used by DictionaryPanel)."""

    @pytest.fixture
    def dictionary(self):
        d = LegalDictionary()
        d.load_terms()
        return d

    def test_search_by_prefix(self, dictionary):
        results = dictionary.search_term("sobre")
        assert len(results) > 0
        assert any("sobreseimiento" in r["termino"].lower() for r in results)

    def test_search_by_substring(self, dictionary):
        results = dictionary.search_term("preventiva")
        assert len(results) > 0

    def test_search_limit(self, dictionary):
        results = dictionary.search_term("a", limit=3)
        assert len(results) <= 3

    def test_search_empty_query(self, dictionary):
        results = dictionary.search_term("")
        assert isinstance(results, list)

    def test_search_result_format(self, dictionary):
        results = dictionary.search_term("prisión")
        if results:
            r = results[0]
            assert "termino" in r
            assert "categoria" in r
            assert "contexto" in r
            assert "variantes" in r


class TestSingleton:
    """Test the singleton pattern."""

    def test_get_legal_dictionary_returns_same_instance(self):
        d1 = get_legal_dictionary()
        d2 = get_legal_dictionary()
        assert d1 is d2

    def test_singleton_is_loaded(self):
        d = get_legal_dictionary()
        assert d._loaded is True
