# Grail difflib stdlib stub.
#
# CPython's difflib has Ratcliff/Obershelp sequence-matching,
# unified-diff / context-diff generators, and a HtmlDiff renderer
# (~2200 lines).  Werkzeug.routing.exceptions uses only
# ``SequenceMatcher(None, a, b).ratio()'' for suggesting a
# similar endpoint when a URL build fails.  Stub returns a fixed
# similarity hint based on whether the two strings start the same.


class SequenceMatcher:
    """Minimal SequenceMatcher — only ``ratio()'' is exposed."""

    def __init__(self, isjunk=None, a='', b=''):
        self.a = a
        self.b = b

    def ratio(self):
        """Return a float in [0, 1].  Real SequenceMatcher computes
        edit similarity; this stub does common-prefix length over
        max-length.  Sufficient for werkzeug's ``which endpoint
        looks most like the one you asked for'' suggestion."""
        a = str(self.a)
        b = str(self.b)
        la = len(a)
        lb = len(b)
        if la == 0 and lb == 0:
            return 1.0
        m = la if la < lb else lb
        common = 0
        for i in range(m):
            if a[i] == b[i]:
                common += 1
            else:
                break
        denom = la if la > lb else lb
        return (2.0 * common) / (la + lb) if (la + lb) > 0 else 0.0

    def quick_ratio(self):
        return self.ratio()

    def real_quick_ratio(self):
        return self.ratio()
