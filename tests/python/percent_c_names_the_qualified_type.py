"""Fixture: %c names a refused operand's type as CPython's %T does, and %d converts as int().

``'%c' % x'' with an x that is neither an int nor a one-character str is a
TypeError naming the type with %T (Objects/unicodeobject.c:15008-15011), and
bytes' %c does the same.  %T is _PyType_GetFullyQualifiedName
(Objects/typeobject.c:1589-1619): ``module.qualname'' for a class a Python
statement made, the qualname alone when the module is builtins or __main__,
and a built-in type's own name.

Grail named the type by its bare __name__ for str, and bytes kept __main__
and the bare name too: test_str's test_formatting matches
``not .*\\.PseudoFloat''.  The same test then has %d, %i and %u convert
as int() does, by __int__ before __index__ (PyNumber_Long,
Objects/unicodeobject.c:14909-14914), while %o, %x and %X take __index__
alone; Grail asked __index__ first for d, i and u too.

Every check here holds under CPython 3.14, run as a script or imported --
the module prefix is __name__'s, which is what %T reads.
"""

r = {}


def refusal(thunk):
    try:
        thunk()
        return 'accepted'
    except TypeError as e:
        return str(e)


class AtModuleLevel:
    pass


class Outer:
    class Inner:
        pass


def a_local_class():
    class Local:
        pass
    return Local()


PREFIX = '' if __name__ == '__main__' else __name__ + '.'
STR = '%c requires an int or a unicode character, not '
BYTES = '%c requires an integer in range(256) or a single byte, not '

r['a_module_level_class'] = refusal(lambda: '%c' % AtModuleLevel())
r['a_nested_class'] = refusal(lambda: '%c' % Outer.Inner())
r['a_local_class'] = refusal(lambda: '%c' % a_local_class())
r['built_in_types'] = [refusal(lambda: '%c' % 1.5), refusal(lambda: '%c' % ([],))]
r['bytes_formatting'] = [refusal(lambda: b'%c' % AtModuleLevel()), refusal(lambda: b'%c' % 1.5)]


class RaisingNumber:
    def __int__(self):
        raise RuntimeError('int')

    def __index__(self):
        raise RuntimeError('index')


def converted_by(conversion):
    try:
        return conversion % RaisingNumber()
    except RuntimeError as e:
        return str(e)


r['which_conversion_runs'] = [converted_by(c) for c in ('%d', '%i', '%u', '%o', '%x', '%X')]

EXPECTED = {
    'a_module_level_class': STR + PREFIX + 'AtModuleLevel',
    'a_nested_class': STR + PREFIX + 'Outer.Inner',
    'a_local_class': STR + PREFIX + 'a_local_class.<locals>.Local',
    'built_in_types': [STR + 'float', STR + 'list'],
    'bytes_formatting': [BYTES + PREFIX + 'AtModuleLevel', BYTES + 'float'],
    'which_conversion_runs': ['int', 'int', 'int', 'index', 'index', 'index'],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-22s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
