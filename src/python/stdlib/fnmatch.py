# Minimal `fnmatch` stub for Grail.  CPython's fnmatch translates
# glob-style patterns (``*``, ``?``, ``[seq]``) to regex.  Jinja2's
# only use is FileSystemBytecodeCache.clear() against a simple
# "__jinja2_*.cache" pattern; we avoid the regex round-trip and
# implement matching directly so the import path doesn't depend on
# the slower (and sometimes buggy under our regex engine) re.compile
# path.  Only the ``*`` and ``?`` wildcards are supported — extend
# if a caller needs character classes.


def _match(name, pattern, i=0, j=0):
    n = len(name)
    m = len(pattern)
    while j < m:
        c = pattern[j]
        if c == "*":
            # Collapse runs of '*'; '*' matches any (possibly empty) substring.
            while j < m and pattern[j] == "*":
                j += 1
            if j == m:
                return True
            # Try every split point.
            for k in range(i, n + 1):
                if _match(name, pattern, k, j):
                    return True
            return False
        if i >= n:
            return False
        if c == "?":
            i += 1
            j += 1
            continue
        if name[i] != c:
            return False
        i += 1
        j += 1
    return i == n


def fnmatch(name, pattern):
    return _match(name, pattern)


def fnmatchcase(name, pattern):
    return _match(name, pattern)


def filter(names, pattern):
    return [n for n in names if _match(n, pattern)]


def translate(pattern):
    """Returns a regex string that approximates the glob — kept for
    API parity.  Grail's re engine isn't always happy with the result
    so prefer fnmatch / filter (which match directly)."""
    out = []
    for c in pattern:
        if c == "*":
            out.append(".*")
        elif c == "?":
            out.append(".")
        elif c in r".^$+(){}|\\":
            out.append("\\" + c)
        else:
            out.append(c)
    return "(?s:" + "".join(out) + ")\\Z"
