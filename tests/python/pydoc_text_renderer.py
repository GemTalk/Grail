# CPython's pydoc, ported whole.
#
# Grail had a 16-line stub with plain/render_doc/getdoc, because test_enum
# imports pydoc at module scope.  ``pydoc.Helper'' -- which is what help() is --
# did not exist, so test_enum's TestStdLib.test_pydoc failed with
# ``AttributeError: module '?' has no attribute 'Helper'''.
#
# Getting the real module to import surfaced SIX substrate bugs, none of them
# about pydoc.  Each has its own fixture; they are named here because this is
# the file that explains why they were found together:
#
#   * a one-line ``if'' suite could not be followed by elif/else
#     (tests/python/inline_suite_continuation.py)
#   * four separate class-body binding failures around unpacking targets
#     (tests/python/class_body_unpacking.py)
#   * object.__getattribute__ raised a Smalltalk error rather than being
#     implemented, so pydoc's ``try: ... except AttributeError'' around it could
#     not work
#   * ten missing inspect predicates, inspect.getmodule stubbed to None, and no
#     Signature.format -- and because Doc.document wraps its dispatch in
#     ``except AttributeError: pass'', the missing format() made pydoc describe
#     EVERY class as a plain value instead of erroring
#
# Ported alongside it: CPython's real __future__ (the stub bound each feature
# name to None and had no _Feature objects, which pydoc's visiblename() tests
# for), a new sysconfig restricted to what Grail can honestly answer, and
# _pyrepl/pager.py -- which is where the pager functions pydoc re-exports have
# lived since 3.13.
#
# THREE of CPython's imports have no counterpart here and are guarded:
# importlib._bootstrap, importlib._bootstrap_external and importlib.machinery.
# All three are the loader machinery, Grail replaces the import system wholesale,
# and every use of them is in code that documents a FILE ON DISK which has not
# been imported -- synopsis() of a compiled module, importfile(), and the module
# scanner behind apropos().  help() of a live object touches none of it.
#
# test_enum TestStdLib.test_pydoc.

import inspect
import pydoc
from io import StringIO
from enum import Enum

r = {}


class Color(Enum):
    CYAN = 1
    MAGENTA = 2
    YELLOW = 3


def sample(a, b=2, *args, c, **kw):
    """One line summary.

    And a second paragraph.
    """


class Documented:
    """One line summary.

    And a second paragraph.
    """


# --- the module is the real one ----------------------------------------------------------

r['has_public_api'] = repr(
    [hasattr(pydoc, n) for n in ('Helper', 'TextDoc', 'HTMLDoc', 'Doc', 'text',
                                 'plain', 'render_doc', 'describe', 'resolve',
                                 'getdoc', 'splitdoc', 'classname', 'pager',
                                 'ispackage', 'visiblename', 'locate')])
r['helper_is_a_class'] = repr(inspect.isclass(pydoc.Helper))
r['text_is_a_textdoc'] = repr(isinstance(pydoc.text, pydoc.TextDoc))

# --- module-level helpers ----------------------------------------------------------------

r['describe'] = repr(pydoc.describe(Color))
r['splitdoc'] = repr(pydoc.splitdoc('One line.\n\nRest of it.'))
r['classname_same_module'] = repr(pydoc.classname(int, 'builtins'))
r['classname_other_module'] = repr(pydoc.classname(int, 'somewhere'))
r['plain_passes_text_through'] = repr(pydoc.plain('unstyled'))
# Read off a CLASS, not the function above: a module-level def's __doc__ is
# None in Grail -- see the known gap at the end -- so a function here would be
# asserting the bug rather than the port.
r['getdoc_first_line'] = repr(pydoc.getdoc(Documented).splitlines()[0])
# visiblename hides _private and the __dunders__ it keeps a list of.
# Note the 1 and 0: visiblename answers a bool for the general rules and the
# result of a membership test for the dunder list, so the values are genuinely
# mixed.  Asserted as CPython actually returns them rather than normalised --
# normalising would hide a change in which branch answered.
r['visiblename'] = repr([pydoc.visiblename(n) for n in
                         ('public', '_private', '__init__', '__builtins__')])

# --- Helper renders, and its first line is CPython's ------------------------------------
# The BODY is not rendered yet -- see the known gap below -- but the heading is,
# and it is built from inspect.getmodule(), which was a stub answering None.

_s = StringIO()
pydoc.Helper(output=_s)(Color)
_rendered = _s.getvalue().strip()
r['help_first_line'] = repr(_rendered.splitlines()[0])

# --- the inspect functions pydoc needed -------------------------------------------------

r['ismodule'] = repr([inspect.ismodule(pydoc), inspect.ismodule(Color)])
r['getmodule_of_a_class'] = repr(inspect.getmodule(Color).__name__)
r['getmodule_of_a_module'] = repr(inspect.getmodule(pydoc).__name__)
r['predicates_exist'] = repr(
    [hasattr(inspect, n) for n in ('ismodule', 'iscode', 'isframe', 'istraceback',
                                   'isgetsetdescriptor', 'ismemberdescriptor',
                                   'ismethodwrapper', 'getabsfile', 'getclasstree',
                                   'getcomments', 'walktree', 'getsourcefile')])


class _A:
    pass


class _B(_A):
    pass


def _tree_names(entries):
    # getclasstree nests: a tuple is (cls, bases); a list is the children of the
    # entry before it.  Flattened to names so the check reads as a shape.
    out = []
    for e in entries:
        out.append(e[0].__name__ if isinstance(e, tuple) else _tree_names(e))
    return out


_tree = _tree_names(inspect.getclasstree([_A, _B]))
# The NESTING is what this port is responsible for.  The ROOT is a third sighting
# of the PythonInstance leak recorded at the end -- _A.__bases__ is
# (PythonInstance,) where CPython's is (object,) -- so it is asserted separately
# rather than baked into the shape.
r['getclasstree_nesting'] = repr(_tree[-1])
r['getclasstree_root'] = repr(_tree[0])

# Signature.format -- the one whose absence made docclass raise, silently.
_sig = inspect.signature(sample)
r['signature_format'] = repr(_sig.format())
r['signature_format_wraps'] = repr('\n' in _sig.format(max_width=10))
r['signature_str_unchanged'] = repr(str(_sig))

# --- object.__getattribute__ ------------------------------------------------------------
# Was ``self error: 'Not yet implemented''' -- a Smalltalk error, so the
# try/except AttributeError pydoc wraps it in could not catch anything.

r['getattribute_reads'] = repr(object.__getattribute__(sample, '__name__'))


def _missing():
    try:
        object.__getattribute__(sample, 'no_such_attribute')
    except AttributeError:
        return 'AttributeError'
    return 'no raise'


r['getattribute_raises_catchably'] = repr(_missing())


# --- KNOWN GAP, recorded rather than endorsed -------------------------------------------
# Grail's PythonInstance -- the internal class that carries the instance
# dictionary -- appears in the Python-visible __mro__, where CPython has only
# (Color, Enum, object), and it answers no __module__ at all.  pydoc's
# TextDoc.docclass walks the mro calling classname(base, ...), which reads
# __module__, so documenting the BODY of any class raises AttributeError --
# swallowed by Doc.document, which then falls back to describing the class as a
# plain value.  That is why the rendering above stops after its heading.
#
# Hiding PythonInstance from __mro__ is the honest fix and is its own piece of
# work: super() and issubclass read that chain.  When it lands, both checks
# below flip and this gate reports XPASS -- which is a failure here, and is
# meant to be: it is the reminder to turn them into real assertions.

# A module-level def's __doc__ is None: the docstring is reachable on a class and
# on a method, so this is specific to functions defined at module scope.  pydoc
# renders every docstring it is given, so the sections it builds for functions
# come out empty -- which is a separate piece of work from the mro one.
r['function_docstring'] = repr(sample.__doc__)
r['class_docstring'] = repr(Documented.__doc__.splitlines()[0])

r['mro_shows_grail_internals'] = repr([c.__name__ for c in Color.__mro__])
r['class_body_is_rendered'] = repr('Method resolution order:' in _rendered)


EXPECTED = {
    'classname_other_module': "'builtins.int'",
    'classname_same_module': "'int'",
    'describe': "'class Color'",
    'getattribute_raises_catchably': "'AttributeError'",
    'getattribute_reads': "'sample'",
    'getclasstree_nesting': "['_A', ['_B']]",
    'getdoc_first_line': "'One line summary.'",
    'class_docstring': "'One line summary.'",
    'getmodule_of_a_class': "'%s'" % __name__,
    'getmodule_of_a_module': "'pydoc'",
    'has_public_api': '[' + ', '.join(['True'] * 16) + ']',
    'help_first_line': "'Help on class Color in module %s:'" % __name__,
    'helper_is_a_class': 'True',
    'ismodule': '[True, False]',
    'predicates_exist': '[' + ', '.join(['True'] * 12) + ']',
    'plain_passes_text_through': "'unstyled'",
    'signature_format': "'(a, b=2, *args, c, **kw)'",
    'signature_format_wraps': 'True',
    'signature_str_unchanged': "'(a, b=2, *args, c, **kw)'",
    'splitdoc': "('One line.', 'Rest of it.')",
    'text_is_a_textdoc': 'True',
    'visiblename': '[True, False, 1, 0]',
}

GRAIL_ONLY = {
    'class_body_is_rendered': 'False',
    'getclasstree_root': "'PythonInstance'",
    'function_docstring': 'None',
    'mro_shows_grail_internals': "['Color', 'Enum', 'PythonInstance', 'object']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-30s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-30s %s %s' % (k, 'XFAIL' if actual != GRAIL_ONLY[k] else 'XPASS', actual))
