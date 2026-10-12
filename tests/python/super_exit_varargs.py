# Regression fixture for #1457: super().__exit__(a, b, c) into a base whose
# __exit__ takes *exc_info.
#
# Grail compiled the base's ``def __exit__(self, *exc_info)'' as a varargs
# body plus a fixed-arity ``__exit__:_:_:'' forwarder (object has a default
# __exit__:_:_:, so one is emitted), and the subclass's ``def __exit__(self,
# a, b, c)'' as ``__exit__:_:_:'' plus a keyword companion ``___exit__:kw:''.
# super() reached the base's FORWARDER, whose send into the varargs body
# dispatched through the receiver -- the subclass -- and landed in its
# companion, which forwarded straight back into the override: RecursionError,
# and inside a ``with'' an uncatchable stack overflow.
#
# This is the shape of pytest.warns (WarningsChecker -> WarningsRecorder ->
# warnings.catch_warnings, whose __exit__ is ``def __exit__(self,
# *exc_info)'').  Expected values are what CPython 3.14 answers.

RESULTS = {}


def attempt(f):
    try:
        return f()
    except RecursionError:
        return 'RecursionError'


class Base:
    def __exit__(self, *exc_info):
        return 'Base%d' % len(exc_info)


class Sub(Base):
    def __exit__(self, a, b, c):
        return 'Sub>' + super().__exit__(a, b, c)


class SubSub(Sub):
    def __exit__(self, a, b, c):
        return 'SubSub>' + super().__exit__(a, b, c)


class BoundFirst(Base):
    def __exit__(self, a, b, c):
        parent = super().__exit__
        return 'BoundFirst>' + parent(a, b, c)


class Splat(Base):
    def __exit__(self, a, b, c):
        return 'Splat>' + super().__exit__(*(a, b, c))


class Unbound(Base):
    def __exit__(self, a, b, c):
        return 'Unbound>' + Base.__exit__(self, a, b, c)


RESULTS['super_call'] = attempt(lambda: Sub().__exit__(1, 2, 3)) == 'Sub>Base3'
RESULTS['two_levels'] = (
    attempt(lambda: SubSub().__exit__(1, 2, 3)) == 'SubSub>Sub>Base3')
RESULTS['bound_then_called'] = (
    attempt(lambda: BoundFirst().__exit__(1, 2, 3)) == 'BoundFirst>Base3')
RESULTS['splat_call'] = attempt(lambda: Splat().__exit__(1, 2, 3)) == 'Splat>Base3'
RESULTS['unbound_call'] = (
    attempt(lambda: Unbound().__exit__(1, 2, 3)) == 'Unbound>Base3')


# The mirror image was never broken -- a fixed-arity base under a varargs
# override -- and must stay that way.
class FixedBase:
    def __exit__(self, a, b, c):
        return 'FixedBase'


class VarargsSub(FixedBase):
    def __exit__(self, *exc_info):
        return 'VarargsSub>' + super().__exit__(*exc_info)


RESULTS['mirror_varargs_over_fixed'] = (
    attempt(lambda: VarargsSub().__exit__(1, 2, 3)) == 'VarargsSub>FixedBase')

# Direct calls on the base and on a subclass that does not override still
# reach the base's body through the forwarder.
class Inherits(Base):
    pass


RESULTS['direct_base'] = Base().__exit__(1, 2, 3) == 'Base3'
RESULTS['direct_inherited'] = Inherits().__exit__(None, None, None) == 'Base3'


# The pytest.warns shape: a context manager chaining __exit__ through a
# varargs base, driven by a ``with'' statement, clean and with an exception.
class Recorder(Base):
    def __enter__(self):
        self.seen = []
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.seen.append(super().__exit__(exc_type, exc_val, exc_tb))
        return False


rec = Recorder()
with rec:
    pass
RESULTS['with_clean'] = rec.seen == ['Base3']

rec = Recorder()
try:
    with rec:
        raise KeyError('k')
except KeyError:
    RESULTS['with_exception'] = rec.seen == ['Base3']

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
