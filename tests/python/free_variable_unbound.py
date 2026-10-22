"""Reading a free variable whose binding is empty raises NameError (#1712).

A closure, lambda, generator expression or class body that reads a variable of
an enclosing function before the function has assigned it -- or after it has
deleted it -- reads an empty CELL.  CPython raises ``NameError: cannot access
free variable 'x' where it is not associated with a value in enclosing scope``
and sets ``e.name``.  Grail raised UnboundLocalError, the error for an empty
LOCAL, in both code generators; ``except NameError`` still caught it (it is a
subclass), but ``type(e)``, the message and ``except UnboundLocalError`` all
differed.  A method of a class nested in the function took another path, with
Python 3.10's wording and no ``name``.

A read of the scope's OWN local is still UnboundLocalError, and so is a read
in a list comprehension (PEP 709 inlines it) or in a generator's first
iterable (evaluated in the enclosing scope).

Self-running: ``python3 free_variable_unbound.py`` prints one line per check
against what CPython 3.14 answers.
"""


def _outcome(action):
    try:
        return "ok -> %r" % (action(),)
    except NameError as e:
        return "%s: %s | name=%r" % (type(e).__name__, e, getattr(e, "name", "?"))


def closure_before_assignment():
    def g():
        return x
    r = _outcome(g)
    x = 1
    return r


def closure_after_del():
    x = 1
    def g():
        return x
    del x
    return _outcome(g)


def two_levels_down():
    def mid():
        def inner():
            return x
        return _outcome(inner)
    r = mid()
    x = 1
    return r


def lambda_before_assignment():
    f = lambda: x
    r = _outcome(f)
    x = 1
    return r


def generator_expression():
    g = (x for _ in [1])
    r = _outcome(lambda: list(g))
    x = 1
    return r


def dict_comprehension_in_a_closure():
    def g():
        return {k: x for k in [1]}
    r = _outcome(g)
    x = 1
    return r


def class_body_reads_its_own_name():
    def make():
        class L:
            y = L
    return _outcome(make)


def class_body_reads_an_enclosing_local():
    def make():
        class C:
            y = later
        later = 1
    return _outcome(make)


def method_reads_an_enclosing_local():
    def make():
        class C:
            def m(self):
                return later
        r = _outcome(lambda: C().m())
        later = 1
        return r
    return make()


def own_local():
    def g():
        print(z)
        z = 1
    return _outcome(g)


def list_comprehension_is_inlined():
    def g():
        r = [x for _ in [1]]
        x = 1
    return _outcome(g)


def generator_first_iterable():
    def g():
        r = list(_ for _ in x)
        x = 1
    return _outcome(g)


def default_of_a_nested_def():
    def g():
        def h(a=x):
            return a
        x = 1
    return _outcome(g)


def caught_as_unbound_local_error():
    def g():
        return x
    try:
        g()
    except UnboundLocalError:
        return "caught by except UnboundLocalError"
    except NameError:
        return "caught by except NameError only"
    finally:
        x = 1


CASES = (closure_before_assignment, closure_after_del, two_levels_down, lambda_before_assignment,
         generator_expression, dict_comprehension_in_a_closure, class_body_reads_its_own_name,
         class_body_reads_an_enclosing_local, method_reads_an_enclosing_local, own_local,
         list_comprehension_is_inlined, generator_first_iterable, default_of_a_nested_def,
         caught_as_unbound_local_error)

r = {case.__name__: case() for case in CASES}

EXPECTED = {
    'caught_as_unbound_local_error':
        'caught by except NameError only',
    'class_body_reads_an_enclosing_local':
        "NameError: cannot access free variable 'later' where it is not associated with a value in enclosing scope | name='later'",
    'class_body_reads_its_own_name':
        "NameError: cannot access free variable 'L' where it is not associated with a value in enclosing scope | name='L'",
    'closure_after_del':
        "NameError: cannot access free variable 'x' where it is not associated with a value in enclosing scope | name='x'",
    'closure_before_assignment':
        "NameError: cannot access free variable 'x' where it is not associated with a value in enclosing scope | name='x'",
    'default_of_a_nested_def':
        "UnboundLocalError: cannot access local variable 'x' where it is not associated with a value | name=None",
    'dict_comprehension_in_a_closure':
        "NameError: cannot access free variable 'x' where it is not associated with a value in enclosing scope | name='x'",
    'generator_expression':
        "NameError: cannot access free variable 'x' where it is not associated with a value in enclosing scope | name='x'",
    'generator_first_iterable':
        "UnboundLocalError: cannot access local variable 'x' where it is not associated with a value | name=None",
    'lambda_before_assignment':
        "NameError: cannot access free variable 'x' where it is not associated with a value in enclosing scope | name='x'",
    'list_comprehension_is_inlined':
        "UnboundLocalError: cannot access local variable 'x' where it is not associated with a value | name=None",
    'method_reads_an_enclosing_local':
        "NameError: cannot access free variable 'later' where it is not associated with a value in enclosing scope | name='later'",
    'own_local':
        "UnboundLocalError: cannot access local variable 'z' where it is not associated with a value | name=None",
    'two_levels_down':
        "NameError: cannot access free variable 'x' where it is not associated with a value in enclosing scope | name='x'",
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-36s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    print(SUMMARY)
