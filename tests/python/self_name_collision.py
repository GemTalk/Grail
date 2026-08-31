"""A def with no plain positional parameter must not inherit a self name
that collides with its own keyword-only / *vararg / **kwarg.

Grail compiles a class-body def by stripping its FIRST declared parameter
and binding the Smalltalk receiver to it, so body references to that name
become the receiver.  A def with no plain positional has nothing to strip,
and the CLASS-WIDE name (taken from the class's other methods) was carried
over for its body instead -- so when that name happened to be this def's
own keyword-only, *vararg or **kwarg, every reference to the def's own
parameter compiled to the RECEIVER.

    class C:
        def first(a, b): ...          # class-wide self name becomes 'a'
        def m(*args, a=1): return a   # 'a' compiled to self

``C().m(a=3)`` answered the C instance instead of 3 -- a silently wrong
VALUE, not an error, which is the worst way for this to fail.  Nothing
maps to the receiver now, which is also what CPython has: the def took no
self.

Every expectation was checked against CPython 3.14 first.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or 'got: %r' % (got,)


# Every class below opens with a method whose first parameter is 'a', so
# the class-wide self name is 'a' -- the collision this pins.

class KwOnly:
    def first(a, b):
        return (a, b)

    def collides(*args, a=1):
        return a

    def collides_with_more(*args, a=1, b=2):
        return (args, a, b)


_k = KwOnly()

check('keyword_only_is_not_the_receiver', _k.collides(a=3), 3)
check('keyword_only_default_is_not_the_receiver', _k.collides(), 1)
check('keyword_only_alongside_varargs',
      _k.collides_with_more(7, a=3, b=4), ((_k, 7), 3, 4))


class VarArg:
    def first(a, b):
        return (a, b)

    def collides(*a):
        return a


_v = VarArg()

check('vararg_named_like_the_self_name', _v.collides(1, 2), (_v, 1, 2))


# The **kwarg arm of the guard is not exercised here: a **kwargs-ONLY
# method has no positional slot for the receiver, so CPython refuses the
# call outright ("takes 0 positional arguments but 1 was given") and Grail
# cannot dispatch it at all.  That is a separate gap in the same family --
# see docs/Issues.md -- and pinning it here would test the gap, not this
# fix.


# The ordinary spellings keep working: a named first parameter is still
# the receiver, and a non-colliding keyword-only still binds normally.

class Normal:
    def first(a, b):
        return (a, b)

    def named_self(self, x):
        return (self, x)

    def no_collision(*args, z=9):
        return (args, z)


_n = Normal()

check('named_first_parameter_is_still_the_receiver',
      _n.named_self(5), (_n, 5))
check('a_non_colliding_keyword_only_still_binds',
      _n.no_collision(1, z=2), ((_n, 1), 2))
check('a_non_colliding_keyword_only_default',
      _n.no_collision(), ((_n,), 9))
check('the_first_method_itself_still_binds', _n.first(4), (_n, 4))


# staticmethod and classmethod are unaffected -- different generators.

class Decorated:
    def first(a, b):
        return (a, b)

    @staticmethod
    def stat(*args, a=1):
        return (args, a)

    @classmethod
    def cls_m(cls, *args, a=1):
        return (cls, args, a)


check('staticmethod_unaffected', Decorated.stat(1, a=2), ((1,), 2))
check('classmethod_unaffected',
      Decorated.cls_m(1, a=2), (Decorated, (1,), 2))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v2 = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v2 is True else 'FAIL', _name),
              '' if _v2 is True else _v2)
