"""Fixture: a ``metaclass=`` that is no class -- a function, a generic alias, a
callable instance.

CPython's __build_class__ calculates no metaclass for one (Python/bltinmodule.c,
builtin___build_class__): it asks it for __prepare__ when it has one, starts
the body in a plain dict otherwise, calls it with the name, the bases, the
finished namespace and every class keyword, and binds the name to whatever the
call answers.  A parent's __init_subclass__ runs only if the call reaches
type.__new__, with what the call forwards there.

Grail ignored such a metaclass: the class was built as if it had none, and its
keywords went to __init_subclass__, so ``class C(metaclass=f, flag=True)``
raised there and ``class C[A](metaclass=Meta[A])`` was of type ``type``.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class PlainMeta(type):
    pass


calls = []


def factory(name, bases, ns, **kw):
    calls.append((name, bases, sorted(k for k in ns if not k.startswith('__')
                                      or k in ('__module__', '__qualname__')), kw))
    return PlainMeta(name, bases, ns)


class Built(metaclass=factory, flag=True):
    x = 1

    def method(self): return 'method'


r['function_builds'] = [type(Built) is PlainMeta, Built.x, Built().method(), calls[-1]]


def answer_42(name, bases, ns): return 42


class Answered(metaclass=answer_42):
    pass


r['any_answer'] = Answered

hooks = []


class Parent:
    def __init_subclass__(cls, **kw):
        hooks.append((cls.__name__, kw))


def through_type(name, bases, ns, **kw):
    return type(name, bases, ns, tag='forwarded')


class Forwarded(Parent, metaclass=through_type, consumed=True):
    def who(self): return __class__


def never_builds(name, bases, ns, **kw): return 'nothing'


class NotBuilt(Parent, metaclass=never_builds, consumed=True):
    pass


r['init_subclass'] = [hooks, Forwarded().who() is Forwarded]
r['subclasses'] = [c.__name__ for c in Parent.__subclasses__()]


def refuses(name, bases, ns): raise ValueError('refused')


class Base:
    pass


r['raising'] = [outcome(lambda: exec('class Refused(Base, metaclass=refuses): pass', {
    'Base': Base, 'refuses': refuses})), [c.__name__ for c in Base.__subclasses__()]]


class MyMeta[A, B](type):
    pass


class GenericAliasMeta[A, B](metaclass=MyMeta[A, B]):
    pass


r['generic_alias'] = [type(GenericAliasMeta) is MyMeta,
                      GenericAliasMeta.__type_params__ != MyMeta.__type_params__]


class CallableInstance:
    def __prepare__(self, name, bases, **kw):
        return {'prepared': True}

    def __call__(self, name, bases, ns, **kw):
        return dict(ns, called=name, keywords=kw)


class Instance(metaclass=CallableInstance(), extra=1):
    value = 3


r['callable_instance'] = [Instance['prepared'], Instance['value'], Instance['called'],
                          Instance['keywords']]

EXPECTED = {
    'function_builds': [True, 1, 'method', ('Built', (), ['__module__', '__qualname__', 'method', 'x'],
                                            {'flag': True})],
    'any_answer': 42,
    'init_subclass': [[('Forwarded', {'tag': 'forwarded'})], True],
    'subclasses': ['Forwarded'],
    'raising': ['ValueError: refused', []],
    'generic_alias': [True, True],
    'callable_instance': [True, 3, 'Instance', {'extra': 1}],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-18s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
