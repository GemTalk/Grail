"""Records the live frame chain from its own module body, via a function.

CHAIN's first entries are the function and this module's ``<module>`` frame;
what follows is the importer.  The fixture asserts the ``<module>`` entry is
present -- the frame Grail's walk used to drop entirely.
"""

import sys

def _capture():
    out = []
    f = sys._getframe()
    while f is not None:
        out.append(f.f_code.co_name)
        f = f.f_back
    return out

CHAIN = _capture()
