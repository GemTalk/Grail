"""Run one of FastAPI's own test modules without pytest, one line per test,
the same way under Grail and under CPython (docs/Support_FastAPI.md, Phase 5).

    python run_fastapi_tests.py <fastapi-sdist>/tests/test_x.py [substring]
        [--resume <earlier output>]

This is tests/pydantic/run_pydantic_tests.py -- the collector, parametrize and
fixture resolution, the minipytest stand-in -- with ./standins first on the
path for inline_snapshot (see standins/inline_snapshot.py).  dirty_equals is
the real package; install it next to fastapi.  The output format is the same,
so tests/pydantic/compare_results.py compares two runs.
"""

import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'standins'))
# Not run as __main__: runpy would then swap sys.modules['__main__'] in and out
# around the whole run, and the tests' own imports are none of its business.
runner = runpy.run_path(os.path.join(HERE, '..', 'pydantic', 'run_pydantic_tests.py'),
                        run_name='run_pydantic_tests')
runner['main']()
