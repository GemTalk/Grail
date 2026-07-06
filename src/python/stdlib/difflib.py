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

    def set_seq1(self, a):
        self.a = a

    def set_seq2(self, b):
        self.b = b

    def quick_ratio(self):
        return self.ratio()

    def real_quick_ratio(self):
        return self.ratio()


def get_close_matches(word, possibilities, n=3, cutoff=0.6):
    """Return up to n best "good enough" matches, best first.  Uses
    SequenceMatcher.ratio() like upstream (Django suggests command
    names with this)."""
    if not n > 0:
        raise ValueError("n must be > 0: %r" % (n,))
    if not 0.0 <= cutoff <= 1.0:
        raise ValueError("cutoff must be in [0.0, 1.0]: %r" % (cutoff,))
    result = []
    s = SequenceMatcher()
    s.set_seq2(word)
    for x in possibilities:
        s.set_seq1(x)
        ratio = s.ratio()
        if ratio >= cutoff:
            result.append((ratio, x))
    result.sort(key=lambda pair: pair[0], reverse=True)
    return [x for ratio, x in result[:n]]
