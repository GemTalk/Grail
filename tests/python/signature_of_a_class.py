# ``inspect.signature`` of a CLASS -- the signature of CALLING it.
#
# CPython's rule, in order:
#
#   1. a ``__call__`` the METACLASS defines: the class is called through it, so
#      it is the signature;
#   2. otherwise the factory -- an OWN ``__new__``, else an OWN ``__init__``,
#      else an inherited ``__new__``, else an inherited ``__init__``.  Own beats
#      inherited across BOTH names before either name beats the other, which is
#      why that is four tests and not two.
#
# The leading parameter goes, because the call supplies it: ``Plain(a, b=2)``
# reports ``(a, b=2)``, not ``(self, a, b=2)``.
#
# Grail applied none of this -- it read a class's ``__text_signature__`` and
# otherwise answered an empty Signature, so EVERY class reported ``()``,
# including a plain one with an ordinary ``__init__``.  Functions were already
# right, which is what made the gap easy to miss: ``signature(f)`` was real and
# ``signature(C)`` was empty.
#
# Two of CPython's spellings do not transfer, and the fix uses the def-time
# parameter spec instead of each:
#
#   * ``method_name in cls.__dict__`` (is it user-defined?).  A Grail class-body
#     def compiles to a Smalltalk METHOD, reachable by getattr but absent from
#     the computed ``__dict__``, so this found nothing at all.  Having a
#     ``__signature_spec__`` IS being a Python-level def, and ``object.__init__``
#     has none.
#   * comparing the attribute by identity (is it inherited?).  ``Sub.__init__``
#     and ``Plain.__init__`` are distinct objects in Grail even when Sub inherits
#     it, and ``__qualname__`` names the class it was reached THROUGH.

import inspect

r = {}


class Plain:
    def __init__(self, a, b=2):
        pass


class Sub(Plain):
    pass


class ViaNew:
    def __new__(cls, p, q=7):
        return object.__new__(cls)


class Bare:
    pass


class Meta(type):
    def __call__(cls, x, *, y=1):
        return super().__call__()


class WithMeta(metaclass=Meta):
    def __init__(self, ignored=None):
        pass


class BothOwnNew:
    def __new__(cls, from_new):
        return object.__new__(cls)

    def __init__(self, from_new):
        pass


class OwnInitInheritedNew(ViaNew):
    def __init__(self, from_init=5):
        pass


def free_function(a, /, b, *, c=3):
    pass


r['plain'] = str(inspect.signature(Plain))
r['inherited_init'] = str(inspect.signature(Sub))
r['via_new'] = str(inspect.signature(ViaNew))
r['bare'] = str(inspect.signature(Bare))
r['metaclass_call'] = str(inspect.signature(WithMeta))
r['own_new_beats_own_init'] = str(inspect.signature(BothOwnNew))
r['own_init_beats_inherited_new'] = str(inspect.signature(OwnInitInheritedNew))
r['function_unchanged'] = str(inspect.signature(free_function))

# .parameters is the API most callers actually use, so the result has to be a
# real Signature and not a rendered string.
r['parameter_names'] = [p for p in inspect.signature(Plain).parameters]
r['parameter_kind'] = str(inspect.signature(Plain).parameters['b'].kind)
r['parameter_default'] = repr(inspect.signature(Plain).parameters['b'].default)
# CPython's _ParameterKind is an IntEnum, so a kind carries name/value/
# description and strs as its NAME.  Grail's stand-in had only a __repr__, so
# str(kind) printed '<_ParameterKind: POSITIONAL_OR_KEYWORD>'.
r['kind_name'] = inspect.Parameter.VAR_KEYWORD.name
r['kind_value'] = inspect.Parameter.VAR_KEYWORD.value
r['kind_description'] = inspect.Parameter.KEYWORD_ONLY.description
r['kind_identity'] = (inspect.signature(free_function).parameters['c'].kind
                      is inspect.Parameter.KEYWORD_ONLY)

# Signature.from_callable is the other public entry point and must agree.
r['from_callable'] = str(inspect.Signature.from_callable(Plain))


EXPECTED = {
    'bare': "'()'",
    'from_callable': "'(a, b=2)'",
    'function_unchanged': "'(a, /, b, *, c=3)'",
    'inherited_init': "'(a, b=2)'",
    'metaclass_call': "'(x, *, y=1)'",
    'own_init_beats_inherited_new': "'(from_init=5)'",
    'own_new_beats_own_init': "'(from_new)'",
    'kind_description': "'keyword-only'",
    'kind_identity': 'True',
    'kind_name': "'VAR_KEYWORD'",
    'kind_value': '4',
    'parameter_default': "'2'",
    'parameter_kind': "'POSITIONAL_OR_KEYWORD'",
    'parameter_names': "['a', 'b']",
    'plain': "'(a, b=2)'",
    'via_new': "'(p, q=7)'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-32s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
