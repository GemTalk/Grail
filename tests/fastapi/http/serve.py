"""Serve app.py with grail_asgi on the given port, until killed.

Under Grail, grail_asgi is in the bundled stdlib.  Under CPython it is loaded
from that same file, so both sides of a comparison run identical server code
(see drive.py)."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
try:
    import grail_asgi
except ImportError:
    import importlib.util
    _path = os.path.join(HERE, '..', '..', '..', 'src', 'python', 'stdlib', 'grail_asgi.py')
    _spec = importlib.util.spec_from_file_location('grail_asgi', _path)
    grail_asgi = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(grail_asgi)

from app import app                                             # noqa: E402

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
print("serving on", port, flush=True)
grail_asgi.run(app, port=port)
