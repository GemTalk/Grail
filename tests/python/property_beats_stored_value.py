"""A @property outranks an instance value of the same name (#1660).

CPython's property is a DATA descriptor -- it defines __set__ and __delete__
even without a setter or deleter -- so it wins over the instance dict whether
or not it has a setter.  Grail answered a stored value first: a value written
through __dict__ beat the property, and so did the ``name`` / ``path`` / ``msg``
that ImportError.__init__ stores on every instance.  importlib.metadata's
PackageNotFoundError overrides ``name`` with a property, and its message read
``No package metadata was found for None``.

Also fixed: ``del obj.x`` on a property without a deleter raises CPython's
``property 'x' of 'A' object has no deleter``, and ``prop.__get__(obj)`` takes
the one-argument form.

Not covered: a property assigned in the class body, ``x = property(f)``, still
loses to a same-named value written straight into __dict__ (an ordinary store
reaches the property's __set__ either way).  Neither is ``self.x += ...``.

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import importlib.metadata as md

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


class A:
    @property
    def x(self):
        return 'prop'

    def read_self(self):
        return self.x


class WithSetter:
    @property
    def x(self):
        return 'prop'

    @x.setter
    def x(self, v):
        pass


class Sub(A):
    pass


class PlainOverride(A):
    def x(self):
        return 'method'


class NameProp(ImportError):
    @property
    def name(self):
        return 'prop'

    def describe(self):
        return 'name=%s' % self.name


class MsgProp(ImportError):
    @property
    def msg(self):
        return 'prop'


class NonData:
    def __get__(self, obj, owner=None):
        return 'nondata'


class HasNonData:
    y = NonData()


def stored(cls, name='x'):
    o = cls()
    o.__dict__[name] = 'inst'
    return o


t('getter_only', lambda: stored(A).x)
t('getter_only_self_read', lambda: stored(A).read_self())
t('with_setter', lambda: stored(WithSetter).x)
t('inherited', lambda: stored(Sub).x)
t('subclass_plain_def_is_a_method', lambda: type(stored(PlainOverride).x).__name__)
t('non_data_descriptor_loses', lambda: stored(HasNonData, 'y').y)
t('importerror_name', lambda: NameProp('m').name)
t('importerror_name_keyword', lambda: NameProp('m', name='kw').name)
t('importerror_name_self_read', lambda: NameProp('m').describe())
t('importerror_msg', lambda: MsgProp('m').msg)
t('package_not_found_message', lambda: str(md.PackageNotFoundError('foo')))
t('package_not_found_name', lambda: md.PackageNotFoundError('foo').name)
t('store_refused', lambda: setattr(A(), 'x', 1))
t('delete_refused', lambda: delattr(A(), 'x'))
t('one_arg_get', lambda: A.x.__get__(A()))
t('two_arg_get', lambda: A.x.__get__(A(), A))
t('class_access_is_property', lambda: type(A.x).__name__)
t('plain_attribute_unaffected', lambda: (lambda o: (setattr(o, 'z', 5), o.z)[1])(A()))


EXPECTED = {
    'class_access_is_property': "'property'",
    'delete_refused': "AttributeError: property 'x' of 'A' object has no deleter",
    'getter_only': "'prop'",
    'getter_only_self_read': "'prop'",
    'importerror_msg': "'prop'",
    'importerror_name': "'prop'",
    'importerror_name_keyword': "'prop'",
    'importerror_name_self_read': "'name=prop'",
    'inherited': "'prop'",
    'non_data_descriptor_loses': "'inst'",
    'one_arg_get': "'prop'",
    'package_not_found_message': "'No package metadata was found for foo'",
    'package_not_found_name': "'foo'",
    'plain_attribute_unaffected': '5',
    'store_refused': "AttributeError: property 'x' of 'A' object has no setter",
    'subclass_plain_def_is_a_method': "'str'",
    'two_arg_get': "'prop'",
    'with_setter': "'prop'",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
