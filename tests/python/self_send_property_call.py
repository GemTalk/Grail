"""Calling a @property's value through self, as CPython does.

``self.kind(n)'' inside a method means: read the property, then call what it
answers.  Grail fused it into the keyword send ``self kind: n'' -- the class
self-send fast path, which is right for a plain def and wrong here, because
that selector is the property's SETTER.  A read-only property answered it by
raising

    AttributeError: property 'kind' of 'C' object has no setter

and the varargs twin of the fusion sent the getter's own ``_kind: {n} kw: nil''
wrapper, which refused the argument its signature never had.

@property is a STRUCTURAL decorator in Grail -- its getter compiles to a plain
unary method -- so the name never reached the exclusion list that keeps
@contextmanager and other WRAPPING decorators out of the fast path.  That is
right for a READ (``self.kind'' is the getter) and wrong for a CALL; only
calls are excluded now.

CPython's own ipaddress is one caller: _BaseNetwork's ``make'' does
``self._address_class(n)'' where _address_class is a property.

Every expectation here was measured against CPython 3.14.
"""

import functools

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def _error(fn, *args):
    try:
        fn(*args)
    except TypeError as exc:
        return ('TypeError', str(exc))
    return 'no error'


def maker(*args):
    return ('made',) + args


class C:
    def __init__(self):
        self._v = 1

    @property
    def factory(self):
        return maker

    @functools.cached_property
    def cached_factory(self):
        return maker

    @property
    def number(self):
        return 7

    @property
    def value(self):
        return self._v

    @value.setter
    def value(self, v):
        self._v = v

    def plain(self, n):
        return ('plain', n)

    @classmethod
    def cm(cls, n):
        return ('cm', n)

    @staticmethod
    def sm(n):
        return ('sm', n)

    # the calls under test, all spelled through self
    def call_zero(self):
        return self.factory()

    def call_one(self):
        return self.factory(5)

    def call_cached(self):
        return self.cached_factory(6)

    def call_number(self):
        return self.number(1)

    def call_plain(self):
        return self.plain(1)

    def call_cm(self):
        return self.cm(2)

    def call_sm(self):
        return self.sm(3)

    def read_value(self):
        return self.value

    def write_value(self, v):
        self.value = v
        return self.value


# ----------------------------------------------------------- the call

check('calling_a_property_value_through_self',
      (C().call_zero(), C().call_one()), (('made',), ('made', 5)))
check('calling_a_cached_property_value_through_self',
      C().call_cached(), ('made', 6))
check('calling_a_property_from_outside_still_works',
      (C().factory(), C().factory(5)), (('made',), ('made', 5)))
check('calling_a_property_whose_value_is_not_callable',
      _error(C().call_number),
      ('TypeError', "'int' object is not callable"))

# ----------------------------------------------------------- unchanged

check('a_plain_method_self_call_is_unchanged', C().call_plain(), ('plain', 1))
check('a_classmethod_or_staticmethod_self_call_is_unchanged',
      (C().call_cm(), C().call_sm()), (('cm', 2), ('sm', 3)))
check('reading_a_property_through_self_is_unchanged', C().read_value(), 1)
check('writing_a_property_through_self_is_unchanged',
      (lambda obj: (obj.write_value(42), obj.value))(C()), (42, 42))
check('a_property_read_from_outside_is_unchanged',
      (lambda obj: [setattr(obj, 'value', 9), obj.value][1])(C()), 9)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
