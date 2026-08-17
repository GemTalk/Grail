"""``dir()`` must not report Grail's plumbing as Python attributes.

Driven by PythonTests>>DirExcludesInternalsTestCase.

Grail derives ``dir()`` from Smalltalk SELECTORS, so anything reachable on the
chain can leak out under a Python-looking name.  Three separate sources were
found by sweeping dir() against CPython across 42 subjects
(scripts/dir_parity.py), and they needed three different fixes:

  * ``perform``, ``value``, ``with`` were never methods anyone wrote.  They are
    the kernel selectors ``perform:env:``, ``value:value:`` and
    ``with:perform:env:`` -- the dispatch and call protocol Grail is built on --
    TRUNCATED AT THE FIRST COLON.  A Grail method selector is ``name:`` followed
    by zero or more ``_:``, so checking the whole encoding rather than
    truncating tells a Python method from the infrastructure it dispatches
    through.  These three polluted 40 of the 42 subjects.
  * ``dynInstVars`` and ``_replaceFirst`` were genuine Grail-added methods with
    ordinary names, now spelt with the ``___`` prefix that marks internals.

The NEGATIVE checks below are the fix.  The POSITIVE ones are the guard rail,
and they are the more important half: dir() drives unittest's getTestCaseNames,
inspect and pydoc, so a filter that removes too much silently stops tests being
discovered.  Over-filtering is far worse than the leak it fixes.

Every check is ordinary CPython behaviour -- it has no such attributes to leak,
and does have the ones asserted present.  Run it directly to confirm.
"""


class Sample:
    attr = 1
    _private = 2

    def meth(self):
        pass

    def meth_with_default(self, a=1):
        pass

    def meth_with_args(self, a, b):
        pass

    def meth_varargs(self, *a, **kw):
        pass


#: Names Grail's plumbing could leak; CPython has none of them.
INTERNALS = ('perform', 'value', 'with', 'dynInstVars', '_replaceFirst',
             '___dynInstVars___', '___replaceFirst___')


def a_plain_object_reports_no_internals():
    return not any(n in dir(object()) for n in INTERNALS)


def an_instance_reports_no_internals():
    return not any(n in dir(Sample()) for n in INTERNALS)


def a_class_reports_no_internals():
    """``dynInstVars`` was a per-class accessor, so the CLASS is where it showed."""
    return not any(n in dir(Sample) for n in INTERNALS)


def a_string_reports_no_internals():
    """``_replaceFirst`` was a str helper, so strings are where it showed."""
    return not any(n in dir('abc') for n in INTERNALS)


def an_exception_reports_no_internals():
    return not any(n in dir(ValueError('x')) for n in INTERNALS)


def every_method_shape_is_still_listed():
    """The guard rail.  Each of these compiles to a DIFFERENT Grail selector
    encoding -- unary, fixed-arity with one and two parameters, and the varargs
    transport form -- and the encoding check has to keep all four."""
    d = dir(Sample())
    return all(n in d for n in
               ('meth', 'meth_with_default', 'meth_with_args', 'meth_varargs'))


def data_attributes_are_still_listed():
    d = dir(Sample())
    return 'attr' in d and '_private' in d


def inherited_names_are_still_listed():
    class Child(Sample):
        own = 3
    d = dir(Child())
    return 'attr' in d and 'meth' in d and 'own' in d


def the_standard_dunders_are_still_listed():
    d = dir(Sample())
    return all(n in d for n in
               ('__class__', '__init__', '__eq__', '__repr__', '__str__',
                '__doc__', '__dict__'))


def dir_is_sorted_and_unique():
    d = dir(Sample())
    return d == sorted(d) and len(d) == len(set(d))


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_plain_object_reports_no_internals,
        an_instance_reports_no_internals,
        a_class_reports_no_internals,
        a_string_reports_no_internals,
        an_exception_reports_no_internals,
        every_method_shape_is_still_listed,
        data_attributes_are_still_listed,
        inherited_names_are_still_listed,
        the_standard_dunders_are_still_listed,
        dir_is_sorted_and_unique,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
