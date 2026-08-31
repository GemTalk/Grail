"""Import ONE module in a fresh Grail session and print ONE result line.

Run by scripts/pypi_package_census.py, one `./grail' process per package, and
copied into an empty scratch directory first so that sys.path[0] -- the running
script's directory -- cannot shadow anything the package imports.

The output contract is a single `CENSUS|' line, and that is the point.  An
uncatchable Smalltalk error (CompileError, MessageNotUnderstood, "Attempt to
modify invariant object") kills the session without unwinding through Python,
so no `except BaseException' can see it and no line is printed.  The driver
reads a missing line as CRASH rather than as missing data.

    ./grail scripts/grail_import_probe.py yaml
"""
import sys


def formatted(exc):
    """(traceback text, `file:line' of the deepest frame in it).

    Deliberately NOT tb.tb_frame.f_code.co_filename walked by hand: under Grail
    that reports THIS probe's filename against another file's line number, so
    every failure looked as if it were raised here.  format_exception, not
    print_exception, because Grail leaves sys.stderr as None and that is where
    print_exception writes.

    Expect this to be THIN.  Measured on 3.7.5: an exception raised during an
    import carries no frames at all, so `where' is usually empty and the
    exception MESSAGE is the only evidence a failure leaves behind.  That is a
    finding in itself -- see docs/Package_Census.md -- not a bug in this probe.
    """
    try:
        import traceback
        text = "".join(traceback.format_exception(exc))
    except BaseException as inner:
        return ("TRACEBACK_UNAVAILABLE|%s" % one_line(inner), "")
    where = ""
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith('File "'):
            rest = stripped[len('File "'):]
            path, _, tail = rest.partition('"')
            words = tail.replace(",", " ").split()
            lineno = words[words.index("line") + 1] if "line" in words else ""
            where = "%s:%s" % (path, lineno)
    return (text, where)


def one_line(text):
    return " ".join(str(text).split())[:400]


def main():
    name = sys.argv[1]
    try:
        top = __import__(name)
        # __import__ answers the TOP package for a dotted name, so walk down.
        # sys.modules is not used for this: its keys are Symbols under Grail,
        # and a str lookup can miss.
        mod = top
        for part in name.split(".")[1:]:
            mod = getattr(mod, part, None)
            if mod is None:
                mod = top
                break
    except BaseException as exc:
        try:
            msg = one_line(exc)
        except BaseException:
            msg = "<unprintable exception>"
        text, where = formatted(exc)
        print("CENSUS|%s|FAILS|%s|%s|%s"
              % (name, type(exc).__name__, msg, where))
        # The full traceback goes to the per-package log, not the result line:
        # root-causing a failure needs the frames, ranking the gaps does not.
        print(text)
        return
    # WHERE it imported from is as load-bearing as whether it did: Grail's
    # bundled src/python/stdlib beats sys.path by design, so it ships its own
    # `requests', `click', `jinja2' and `markupsafe'.  Reporting those as the
    # pip package importing cleanly would be a straight falsehood.
    where = getattr(mod, "__file__", "") or ""
    if not where:                     # a namespace package has __path__ only
        path = list(getattr(mod, "__path__", []) or [])
        where = path[0] if path else "<no __file__>"
    print("CENSUS|%s|IMPORTS|||%s" % (name, where))


main()
