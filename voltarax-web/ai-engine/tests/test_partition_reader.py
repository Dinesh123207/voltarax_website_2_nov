import sys
import types

import pytest

import config as cfg
from data import ingest


def test_partition_reader_bounds_queries_and_prefers_partition(monkeypatch):
    values = {
        '/readings/solar_site': {'new': {'ts': 2, 'device_id': 'd', 'site_id': 'solar_site', 'power_mw': 3}},
        '/solar_site/history': {'old': {'ts': 2, 'device_id': 'd', 'site_id': 'solar_site', 'power_mw': 1}, 'foreign': {'ts': 3, 'site_id': 'other'}},
    }
    calls = []

    class Ref:
        def __init__(self, path): self.path = path
        def order_by_child(self, field): assert field == 'ts'; return self
        def limit_to_last(self, n): calls.append((self.path, n)); return self
        def get(self): return values.get(self.path)

    monkeypatch.setattr(ingest, '_get_firebase_app', lambda: None)
    monkeypatch.setitem(sys.modules, 'firebase_admin', types.SimpleNamespace(db=types.SimpleNamespace(reference=lambda path, app: Ref(path))))
    raw = ingest._default_reader()
    assert len(raw) == 1
    assert next(iter(raw.values()))['power_mw'] == 3
    assert calls == [('/readings/solar_site', cfg.MAX_HISTORY_ROWS), ('/solar_site/history', cfg.MAX_HISTORY_ROWS + 1)]
    monkeypatch.setattr(cfg, 'MAX_HISTORY_ROWS', 1)
    with pytest.raises(RuntimeError, match='migrate'):
        ingest._default_reader()
