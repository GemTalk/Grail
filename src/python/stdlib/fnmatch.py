# Minimal `fnmatch` for Grail.  CPython's fnmatch translates
# glob-style patterns to regex; we match directly so the import path
# doesn't depend on the (heavier) re.compile path.  Supports ``*``,
# ``?`` and ``[seq]`` / ``[!seq]`` character classes incl. ranges
# (``[a-z]``).  An unterminated ``[`` is treated as a literal, like
# CPython.  Case-sensitive (POSIX normcase is the identity).


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
        if c == "[":
            close = _find_close(pattern, j)
            if close < 0:
                # Unterminated class: literal '['.
                if name[i] != "[":
                    return False
                i += 1
                j += 1
                continue
            if not _in_class(name[i], pattern[j + 1:close]):
                return False
            i += 1
            j = close + 1
            continue
        if name[i] != c:
            return False
        i += 1
        j += 1
    return i == n


def _find_close(pattern, j):
    """Index of the ']' closing the class whose '[' is at j, or -1.

    A ']' that is the first body character (or first after '!') is a
    literal member of the class, not the terminator."""
    m = len(pattern)
    k = j + 1
    if k < m and pattern[k] == "!":
        k += 1
    if k < m and pattern[k] == "]":
        k += 1
    while k < m and pattern[k] != "]":
        k += 1
    if k >= m:
        return -1
    return k


def _in_class(ch, body):
    negate = False
    if body.startswith("!"):
        negate = True
        body = body[1:]
    matched = False
    k = 0
    blen = len(body)
    while k < blen:
        if k + 2 < blen and body[k + 1] == "-":
            lo = body[k]
            hi = body[k + 2]
            if ord(lo) <= ord(ch) and ord(ch) <= ord(hi):
                matched = True
            k += 3
        else:
            if body[k] == ch:
                matched = True
            k += 1
    if negate:
        return not matched
    return matched


def fnmatch(name, pattern):
    return _match(name, pattern)


def fnmatchcase(name, pattern):
    return _match(name, pattern)


def filter(names, pattern):
    return [n for n in names if _match(n, pattern)]


def translate(pattern):
    """Returns a regex string that approximates the glob — kept for
    API parity.  Grail callers should prefer fnmatch / filter (which
    match directly)."""
    out = []
    i = 0
    n = len(pattern)
    while i < n:
        c = pattern[i]
        if c == "*":
            out.append(".*")
            i += 1
        elif c == "?":
            out.append(".")
            i += 1
        elif c == "[":
            close = _find_close(pattern, i)
            if close < 0:
                out.append("\\[")
                i += 1
            else:
                body = pattern[i + 1:close]
                if body.startswith("!"):
                    body = "^" + body[1:]
                out.append("[" + body + "]")
                i = close + 1
        elif c in r".^$+(){}|\\":
            out.append("\\" + c)
            i += 1
        else:
            out.append(c)
            i += 1
    return "(?s:" + "".join(out) + ")\\Z"
