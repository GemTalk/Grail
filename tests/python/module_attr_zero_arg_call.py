"""`m.f()` and `m.f` are the same Smalltalk send when there are no arguments.

A module attribute read compiles to a unary Smalltalk send, and so does a
zero-argument call: `m.f` and `m.f()` both emit `(m) f`. Whether that collapse
is right depends entirely on what the method DOES.

  * a FUNCTION -- `os.getcwd`, `hashlib.md5`, `random.random` -- performs the
    work and answers the result, so performing it IS calling it. Harmless.
  * a VALUE ACCESSOR answers something the caller then means to call, and the
    collapse silently DROPS the call:

        io.BufferedIOBase()            ->  the CLASS        (wrong)
        C = io.BufferedIOBase; C()     ->  an instance      (right)

    The same expression, two spellings, two answers.

WHY THE RULE IS OPT-IN, and this is the part worth keeping: the first fix used
the category allowlist the READ path uses -- function categories call,
everything else is a value -- and it is UNSOUND. Real functions live in ad-hoc
categories (`os.getcwd` in 'Grail-File and Directory Operations', `hashlib.md5`
in 'Grail-Constructors'), so declining the collapse for everything unlisted
broke them. Measured, not guessed: `hashlib.md5()` started failing with
"Hash class does not understand #'__call__'".

So a module DECLARES the accessors that answer a value, and only those decline.
Everything else compiles exactly as before. The regression half of this file is
therefore as important as the fix half -- it pins the functions that must keep
working.

Cost of the collapse: 65 tests in test_sax, where saxutils builds an
`io.BufferedIOBase()` by hand and the class it got back reported a truthy
`closed`, so XMLGenerator over a BytesIO died with "write to closed file" about
a stream that was open.
"""

import io

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# ------------------- a value accessor: all three spellings must agree

def _spellings():
    direct = type(io.BufferedIOBase()).__name__
    C = io.BufferedIOBase
    via_local = type(C()).__name__
    via_getattr = type(getattr(io, 'BufferedIOBase')()).__name__
    return (direct, via_local, via_getattr)


check('every_spelling_gives_an_instance', _spellings(),
      ('BufferedIOBase', 'BufferedIOBase', 'BufferedIOBase'))


# the whole io type hierarchy, since they are declared together
def _io_types():
    out = {}
    for name in ('IOBase', 'RawIOBase', 'BufferedIOBase', 'TextIOBase'):
        cls = getattr(io, name)
        try:
            got = type(cls()).__name__
        except BaseException as exc:
            got = 'RAISED %s' % type(exc).__name__
        out[name] = (got == name) or got
    return {k: v for k, v in out.items() if v is not True}


check('each_io_base_instantiates', _io_types(), {})


# ------------- THE REGRESSION HALF: functions must keep working

# These live in ad-hoc categories and are NOT declared value accessors, so
# they still take the collapsed path -- performing them IS the call. The first
# attempt at this fix broke every one of them.

def _functions_still_work():
    import os
    import hashlib
    out = {}
    out['os.getcwd'] = isinstance(os.getcwd(), str) or os.getcwd()
    out['os.getpid'] = isinstance(os.getpid(), int) or os.getpid()
    out['os.cpu_count'] = isinstance(os.cpu_count(), int) or os.cpu_count()
    out['hashlib.md5'] = (hasattr(hashlib.md5(), 'hexdigest')) or hashlib.md5()
    out['hashlib.sha256'] = (hasattr(hashlib.sha256(), 'hexdigest')) or hashlib.sha256()
    return {k: v for k, v in out.items() if v is not True}


check('zero_arg_module_functions_still_work', _functions_still_work(), {})


def _one_arg_is_untouched():
    """Calls WITH arguments never collapsed, and must not change."""
    return (type(io.StringIO('x')).__name__, io.StringIO('abc').getvalue())


check('a_call_with_arguments_is_untouched', _one_arg_is_untouched(),
      ('StringIO', 'abc'))


# --------------------- what the collapse actually cost

def _xmlgen_over_bytesio():
    from xml.sax.saxutils import XMLGenerator
    out = io.BytesIO()
    g = XMLGenerator(out, encoding='utf-8')
    g.startDocument()
    g.startElement('t', {'a': '1'})
    g.characters('x')
    g.endElement('t')
    g.endDocument()
    return out.getvalue()


check('xmlgenerator_over_a_bytesio', _xmlgen_over_bytesio(),
      b'<?xml version="1.0" encoding="utf-8"?>\n<t a="1">x</t>')


def _xmlgen_over_stringio():
    """The StringIO path took a different branch and already worked -- pinned
    so a change to the value-accessor rule cannot quietly break it."""
    from xml.sax.saxutils import XMLGenerator
    out = io.StringIO()
    g = XMLGenerator(out)
    g.startDocument()
    g.startElement('t', {})
    g.endElement('t')
    g.endDocument()
    return out.getvalue()


check('xmlgenerator_over_a_stringio', _xmlgen_over_stringio(),
      '<?xml version="1.0" encoding="iso-8859-1"?>\n<t></t>')
