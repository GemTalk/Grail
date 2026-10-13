"""Fixture: a class body calling its own helpers, and Cls.f(x) for any x.

A class body may call a plain function it has just defined -- it is an
ordinary function there, not yet a method -- and ``Cls.f(x, ...)'' binds f's
first parameter to x whatever x is.  Grail failed two shapes of the first,
both from pygments (#1426), and one shape of the second:

  * a helper with a DEFAULT, called with a bool -- ``def make(flag,
    extra=3)'' then ``root = make(False)'' (pygments BatchLexer; six lexer
    modules).  A def with a default compiles only to the packed
    ``_make:kw:'' form, which refused a SPECIAL first argument (int, bool,
    None, float, a one-character str) with ``descriptor 'make' for 'K'
    objects doesn't apply to a 'bool' object''.
  * a zero-parameter helper whose NESTED generator takes ``self'' --
    ``def gen(): def cb(self): yield from self'' (pygments RubyLexer; ten
    lexer modules).  The receiverless check took that nested parameter for a
    captured receiver: ``unbound method 'gen' must be called with an
    instance as the first argument''.
  * ``C.m('s', a=1)'' -- keywords, and a first argument that is not an
    instance -- died with an uncatchable MessageNotUnderstood, because the
    keyword companion re-sends the fixed form to its receiver.

A class-body default is evaluated at its def, in the class body, and shared
by every call.  Grail stored it at the END of the body, so a call made by the
body itself found nothing and evaluated the default inline, in the method's
own scope -- a NameError for pygments' ``_core_token=_core_token'' -- and a
call whose first argument was not an instance missed the store too, so a
mutable default was fresh on every call.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def _err(thunk):
    try:
        return thunk()
    except Exception as e:
        return type(e).__name__


class BatchLike:
    def _make_begin_state(compound, extra=3):
        return [compound, extra]
    root = _make_begin_state(False)
    root_none = _make_begin_state(None)
    both = _make_begin_state(5, 6)


r['default_helper_in_body'] = (BatchLike.root, BatchLike.root_none,
                               BatchLike.both)


class BatchExact:
    # pygments' exact shape: the defaults name class-body variables, and the
    # body calls the helper inside a dict display.
    _core_token = 'CORE'
    _nl = 'NL'

    def _make_begin_state(compound, _core_token=_core_token, _nl=_nl):
        return (compound, _core_token, _nl)
    tokens = {
        'root': _make_begin_state(False),
        'root/compound': _make_begin_state(True),
    }


r['default_names_a_class_variable'] = BatchExact.tokens


class Rebinds:
    v = 1

    def f(x, d=v):
        return d
    v = 2
    in_body = f(0)


r['default_is_fixed_at_the_def'] = (Rebinds.in_body, Rebinds.f(0))


class Shares:
    def acc(x, bucket=[]):
        bucket.append(x)
        return list(bucket)
    first = acc(1)

    def counter(*, seen=[]):
        seen.append(1)
        return len(seen)


r['body_call_shares_the_default'] = (Shares.first, Shares.acc(2),
                                     Shares.acc('s'))
r['receiverless_shares_the_default'] = (Shares.counter(), Shares.counter())


class RubyLike:
    def gen_rules():
        def callback(self, items):
            for i in items:
                yield (self, i)

        def delegate(self):
            yield from self
        return {'callback': callback, 'delegate': delegate}
    tokens = gen_rules()


r['nested_generator_takes_self'] = (
    sorted(RubyLike.tokens),
    list(RubyLike.tokens['callback']('s', [1, 2])),
    list(RubyLike.tokens['delegate']([3, 4])))


class C:
    def m(self, a):
        return [self, a]

    def kd(x, *, k=4):
        return (x, k)

    def va(x, *rest, **kw):
        return (x, rest, sorted(kw))

    def h(x, y=2):
        return [x, y]

    def obj_default(x, y=object):
        return (x, y is object)

    def cell(x, y=1):
        return __class__.__name__

    def k(self, *a):
        return len(a)


r['companion_keywords_non_instance'] = (C.m('s', a=1), C.m(5, a=1),
                                         C.m(None, a='z'), C.m(True, a=0))
r['special_first_arguments'] = (C.h(1), C.h(True), C.h(None), C.h(1.5),
                                C.h('c'), C.h(2, 3))
r['keyword_only_default'] = (C.kd(1), C.kd(2, k=9), C.kd('c'), C.kd(None))
r['varargs_and_keywords'] = C.va(True, 1, 2, z=3)
r['packed_varargs_int'] = (C.k(1), C.k(1, 2, 3))
r['object_default'] = C.obj_default(3)
r['class_cell'] = C.cell(1)
r['too_many_positional'] = _err(lambda: C.h(1, 2, 3))
r['unexpected_keyword'] = _err(lambda: C.kd(1, q=2))
r['an_instance_still_works'] = (C.m(C(), a=1)[1], C.h(C())[1])

# A builtin type's method is a descriptor that type-checks: still refused.
r['builtin_descriptor_refuses'] = _err(lambda: bytes.hex(1))


EXPECTED = {
    'default_helper_in_body': ([False, 3], [None, 3], [5, 6]),
    'default_names_a_class_variable': {
        'root': (False, 'CORE', 'NL'),
        'root/compound': (True, 'CORE', 'NL')},
    'body_call_shares_the_default': ([1], [1, 2], [1, 2, 's']),
    'receiverless_shares_the_default': (1, 2),
    'nested_generator_takes_self': (['callback', 'delegate'],
                                    [('s', 1), ('s', 2)], [3, 4]),
    'companion_keywords_non_instance': (['s', 1], [5, 1], [None, 'z'],
                                        [True, 0]),
    'special_first_arguments': ([1, 2], [True, 2], [None, 2], [1.5, 2],
                                ['c', 2], [2, 3]),
    'keyword_only_default': ((1, 4), (2, 9), ('c', 4), (None, 4)),
    'varargs_and_keywords': (True, (1, 2), ['z']),
    'packed_varargs_int': (0, 2),
    'object_default': (3, True),
    'class_cell': 'C',
    'too_many_positional': 'TypeError',
    'unexpected_keyword': 'TypeError',
    'an_instance_still_works': (1, 2),
    'builtin_descriptor_refuses': 'TypeError',
}

# CPython's answers that Grail does not give yet.  A class attribute bound
# twice has all its stores emitted at its LAST assignment, so a default naming
# it is evaluated after the rebinding: Grail reads v == 2 here, where CPython,
# evaluating at the def, reads 1.  It used to raise nothing and answer 2 as
# well; what #1426 changes is only that it still does not raise.
KNOWN_DIVERGENCES = {
    'default_is_fixed_at_the_def': (1, 1),
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS,
    sorted(r) == sorted(list(EXPECTED) + list(KNOWN_DIVERGENCES)))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r[key]
        ok = actual == EXPECTED[key]
        print('%-5s %-34s -> %s' % ('OK' if ok else 'FAIL', key,
                                    'as expected' if ok else repr(actual)))
    for key, expected in KNOWN_DIVERGENCES.items():
        actual = r[key]
        print('%-5s %-34s -> %r' % ('OK' if actual == expected else 'XFAIL',
                                    key, actual))
    print(SUMMARY)
