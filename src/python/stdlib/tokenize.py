# GRAIL: a minimal stand-in for CPython's tokenize.
#
# CPython's tokenize is ~1200 lines and exists to TOKENIZE Python source.
# Grail has its own parser (PythonParser) and needs none of that.  What it
# does need is the file-opening pair that other stdlib modules reach for:
#
#   * linecache.updatecache() does `import tokenize` at the top of its body
#     and reads source with `tokenize.open(fullname)`.  With no tokenize
#     module at all that import raised ImportError, which updatecache
#     catches by returning [] -- so EVERY linecache lookup answered nothing,
#     and traceback's FrameSummary.line was always None no matter how good
#     the code object's co_filename was.
#   * django/views/debug.py refers to detect_encoding for the same purpose.
#
# So this provides open() and detect_encoding() and nothing else.  If real
# tokenization is ever needed, this file is the place it goes.

import builtins
import re

__all__ = ["open", "detect_encoding", "TokenError"]


class TokenError(Exception):
    """Raised by a real tokenizer on malformed input.  Defined because
    callers catch it by name; nothing here raises it."""


# PEP 263: a coding declaration must appear on line 1 or 2 and match this.
_CODING_RE = re.compile(rb"^[ \t\f]*#.*?coding[:=][ \t]*([-_.a-zA-Z0-9]+)")
_BOM = b"\xef\xbb\xbf"


def _normalise(name):
    """Fold the handful of spellings PEP 263 allows onto the codec names
    Grail's str.encode/decode understand."""
    lowered = name.lower().replace("_", "-")
    if lowered in ("utf-8", "utf8", "u8", "utf"):
        return "utf-8"
    if lowered in ("latin-1", "latin1", "iso-8859-1", "iso8859-1", "8859"):
        return "latin-1"
    return lowered


def detect_encoding(readline):
    """CPython's tokenize.detect_encoding: given a readline callable over
    BYTES, answer (encoding, list_of_lines_read).

    Honours a UTF-8 BOM and a PEP 263 coding cookie on either of the first
    two lines; defaults to utf-8, which is what Grail uses throughout.  The
    lines consumed while sniffing are returned so the caller can put them
    back -- that is the contract CPython documents, and why this cannot just
    peek."""
    lines = []
    default = "utf-8"
    encoding = None

    def read_one():
        try:
            return readline()
        except StopIteration:
            return b""

    first = read_one()
    if first.startswith(_BOM):
        first = first[len(_BOM):]
        default = "utf-8-sig"
    if not first:
        return default, []
    lines.append(first)

    match = _CODING_RE.match(first)
    if match:
        encoding = _normalise(match.group(1).decode("ascii"))
    else:
        # A cookie on line 2 counts only when line 1 is a comment or blank.
        stripped = first.strip()
        if not stripped or stripped.startswith(b"#"):
            second = read_one()
            if second:
                lines.append(second)
                match = _CODING_RE.match(second)
                if match:
                    encoding = _normalise(match.group(1).decode("ascii"))

    return (encoding or default), lines


def open(filename):
    """CPython's tokenize.open: open a source file in TEXT mode using the
    encoding its coding cookie declares.

    Grail's io does not implement the buffered-binary + seek(0) + rewrap
    dance CPython uses, so this reads the head as bytes to sniff the
    encoding, closes, and reopens in text mode.  The observable result --
    a text file object positioned at the start -- is the same, which is all
    linecache asks for."""
    encoding = "utf-8"
    try:
        with builtins.open(filename, "rb") as sniff:
            head = sniff.read(512)
    except OSError:
        raise
    if head:
        if isinstance(head, str):
            # Grail may answer str for a 'rb' read on some paths; the cookie
            # scan below wants bytes, so put it back into bytes.
            head = head.encode("utf-8", "ignore")
        pieces = head.split(b"\n")
        # Feed detect_encoding one line at a time, newline restored so the
        # cookie regex sees a realistic line.
        pending = [p + b"\n" for p in pieces[:2]]

        def readline():
            return pending.pop(0) if pending else b""

        encoding, _consumed = detect_encoding(readline)
    if encoding == "utf-8-sig":
        encoding = "utf-8"
    return builtins.open(filename, "r", encoding=encoding)
