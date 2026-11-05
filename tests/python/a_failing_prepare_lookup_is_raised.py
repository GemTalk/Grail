"""Fixture: reading a metaclass's __prepare__ raises what the read raises.

CPython's __build_class__ reads the metaclass's __prepare__ with
PyObject_GetOptionalAttr (Python/bltinmodule.c:183): an AttributeError
means there is none and the body runs in a plain dict, and any other
exception is the class statement's.  Grail read every exception as "none",
so a __prepare__ descriptor that failed was quietly skipped
(test_metaclass's FailDescr).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


class ObscureException(Exception):
    pass


class FailDescr:
    def __get__(self, instance, owner):
        raise ObscureException


class Absent:
    def __get__(self, instance, owner):
        raise AttributeError('__prepare__')


def define(metaclass):
    try:
        class Defined(metaclass=metaclass):
            value = 1
    except Exception as exception:
        return type(exception).__name__
    return (type(Defined).__name__, Defined.value)


class FailingMeta(type):
    __prepare__ = FailDescr()


class AbsentMeta(type):
    __prepare__ = Absent()


class PlainMeta(type):
    pass


class PreparingMeta(type):
    @classmethod
    def __prepare__(metaclass, name, bases):
        return {'seeded': True}


def defined_with_a_seed():
    class Seeded(metaclass=PreparingMeta):
        pass
    return Seeded.seeded


r['a_failing_read_is_raised'] = define(FailingMeta)
r['an_attribute_error_reads_as_none'] = define(AbsentMeta)
r['a_metaclass_without_one'] = define(PlainMeta)
r['a_real_one_still_seeds_the_body'] = defined_with_a_seed()

EXPECTED = {
    'a_failing_read_is_raised': 'ObscureException',
    'an_attribute_error_reads_as_none': ('AbsentMeta', 1),
    'a_metaclass_without_one': ('PlainMeta', 1),
    'a_real_one_still_seeds_the_body': True,
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-34s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
