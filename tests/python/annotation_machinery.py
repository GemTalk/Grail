"""Fixture: the machinery test_annotationlib leans on, one check per behaviour.

PEP 750 template strings, PEP 646 starred subscripts and unpacked aliases, the
built-in generic aliases, PEP 695 type-parameter KINDS on every def shape, the
scope a class annotation is evaluated in, and FORWARDREF partial evaluation.
Each was wrong or missing in Grail before test_annotationlib was fixed, and
each is asserted there only indirectly -- a regression in one would surface as
a failure in a module about something else.

Every EXPECTED value was measured by RUNNING CPython 3.14.6 on this file.
"""

import annotationlib
import builtins
import collections
from annotationlib import Format, ForwardRef, get_annotations, type_repr
from string.templatelib import Template, Interpolation
from typing import TypeVar, TypeVarTuple


r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- PEP 750 template strings -------------------------------------------------

x, w = 1, 5
r['tstring_repr'] = outcome(lambda: repr(t'a{ x }b{x!r:>{w}}c{x=}{{z}}'))
r['tstring_parts'] = outcome(lambda: (t'a{x}b'.strings, t'a{x}b'.values))
r['tstring_iter_drops_empty'] = outcome(lambda: list(
    Template('a', Interpolation(1, 'x'), '', Interpolation(2, 'y'))))
r['tstring_concat'] = outcome(lambda: repr(t'{x}' + t'y'))
r['tstring_implicit_concat'] = outcome(lambda: repr(t'{x}' t'y'))
r['tstring_plus_str'] = outcome(lambda: t'a' + 'b')
r['str_plus_tstring'] = outcome(lambda: 'b' + t'a')
r['template_bad_arg'] = outcome(lambda: Template(1))
r['interpolation_readonly'] = outcome(
    lambda: setattr(Interpolation(1, 'x'), 'value', 2))
r['interpolation_bad_conversion'] = outcome(lambda: Interpolation(1, 'x', 'q'))
r['templatelib_module'] = outcome(
    lambda: (Template.__module__, Interpolation.__module__))


def _match_interpolation():
    match Interpolation(1, 'x', 'r', '>3'):
        case Interpolation(value, expression, conversion, format_spec):
            return (value, expression, conversion, format_spec)


r['interpolation_match'] = outcome(_match_interpolation)


def _mixed_literal_error():
    try:
        compile("t'a' 'b'", '<fixture>', 'eval')
    except SyntaxError as e:
        return e.msg


r['tstring_mixed_with_str'] = outcome(_mixed_literal_error)
r['template_type_repr'] = outcome(lambda: [
    type_repr(Template('hi', Interpolation(42, '42'))),
    type_repr(Template('hi', Interpolation(42))),
    type_repr(Template("it's", Interpolation(1, 'a', 'r', '>5'))),
])


def _tstring_annotations(
    a: t"{x}",
    b: t"{x:{1}}",
    c: t"{x | y * z}",
    d: t"{ 0}",
):
    pass


r['tstring_string_format'] = outcome(
    lambda: get_annotations(_tstring_annotations, format=Format.STRING))


# --- PEP 646 starred subscripts, and the built-in generic aliases -------------

Ts = TypeVarTuple('Ts')
T = TypeVar('T')


class _Echo:
    def __class_getitem__(cls, item):
        return item


r['starred_subscript'] = outcome(lambda: (_Echo[*Ts], _Echo[int, *Ts]))
r['tuple_alias'] = outcome(lambda: (repr(tuple[int, ...]), repr(tuple[*Ts])))
r['unpacked_alias'] = outcome(lambda: (
    repr((*tuple[int, ...],)[0]),
    (*tuple[int, ...],)[0].__unpacked__,
    tuple[int].__unpacked__))
r['builtin_aliases'] = outcome(lambda: [
    repr(set[int]), repr(frozenset[str]), repr(dict[str, int])])
r['alias_arg_repr'] = outcome(lambda: [
    repr(list[collections.OrderedDict]), repr(list[T]), repr(list[None])])


class _FromAlias(dict[str, int]):
    pass


r['alias_as_base'] = outcome(lambda: [c.__name__ for c in _FromAlias.__mro__])
r['range_not_subscriptable'] = outcome(lambda: range[1])


# --- PEP 695 type-parameter kinds on every def shape --------------------------

def generic_def[A, *B, **C](): pass


class Generic[D, *E, **F]:
    def method[G](self): pass


def _nested():
    def inner[H, **I](): pass
    return inner


def _kinds(params):
    return [(type(p).__name__, repr(p)) for p in params]


r['def_type_params'] = outcome(lambda: _kinds(generic_def.__type_params__))
r['class_type_params'] = outcome(lambda: _kinds(Generic.__type_params__))
r['method_type_params'] = outcome(lambda: (
    _kinds(Generic.method.__type_params__),
    _kinds(Generic().method.__type_params__)))
r['nested_def_type_params'] = outcome(lambda: _kinds(_nested().__type_params__))
r['type_params_are_stable'] = outcome(lambda: (
    generic_def.__type_params__[0] is generic_def.__type_params__[0],
    Generic.method.__type_params__[0] is Generic().method.__type_params__[0]))


class _Plain:
    def m(self): pass


def plain_def(): pass


r['plain_defs_have_empty_type_params'] = outcome(lambda: (
    plain_def.__type_params__, _Plain.m.__type_params__,
    _Plain().m.__type_params__))


# --- The scope a class annotation is evaluated in -----------------------------

def _class_attr_shadows_enclosing():
    U = str

    class C:
        U = int
        x: U

    class D:
        z: U
    return C.__annotations__, D.__annotations__


r['class_attr_shadows_enclosing'] = outcome(_class_attr_shadows_enclosing)


class _Holder:
    def nonlocal_in_class(self):
        class Demo:
            nonlocal later
            x: later
        refs = get_annotations(Demo, format=Format.FORWARDREF)
        later = list
        return refs['x'].__forward_arg__, refs['x'].evaluate()


r['method_nested_class_nonlocal'] = outcome(_Holder().nonlocal_in_class)


class _ReadsSibling:
    def one(_) -> int: pass
    early = one.__annotations__


r['class_body_reads_method_annotations'] = outcome(lambda: _ReadsSibling.early)


# --- FORWARDREF partial evaluation --------------------------------------------

r['fwd_evaluate_partial'] = outcome(lambda: [
    repr(ForwardRef('set[undefined]').evaluate(format=Format.FORWARDREF)),
    repr(ForwardRef('alias[int, undef]').evaluate(
        format=Format.FORWARDREF, globals={'alias': dict})),
    repr(ForwardRef('a + b').evaluate(format=Format.FORWARDREF)),
    ForwardRef('a + b').evaluate(format=Format.FORWARDREF,
                                 locals={'a': 1, 'b': 2}),
])


def _describe(annotations):
    return {k: ('ForwardRef', v.__forward_arg__) if isinstance(v, ForwardRef)
            else repr(v) for k, v in annotations.items()}


def _partial(
    x: builtins.undef,
    y: list[int],
    z: 1 + int,
    a: builtins.int,
    b: set[undefined],
):
    pass


r['fwd_per_key'] = outcome(
    lambda: _describe(get_annotations(_partial, format=Format.FORWARDREF)))


def _closure_bound_later():
    def inner(arg: later): pass
    ref = get_annotations(inner, format=Format.FORWARDREF)['arg']
    later = 1
    return ref.__forward_arg__, ref.evaluate()


r['fwd_closure_bound_later'] = outcome(_closure_bound_later)


def _attribute_error_is_deferred():
    obj = object()

    class Raises:
        attr: obj.missing
    ref = get_annotations(Raises, format=Format.FORWARDREF)['attr']
    return type(ref).__name__, ref.__forward_arg__, ref.__forward_is_class__


r['fwd_attribute_error_deferred'] = outcome(_attribute_error_is_deferred)


EXPECTED = {
    'alias_arg_repr': "ok -> ['list[collections.OrderedDict]', 'list[~T]', 'list[None]']",
    'alias_as_base': "ok -> ['_FromAlias', 'dict', 'object']",
    'builtin_aliases': "ok -> ['set[int]', 'frozenset[str]', 'dict[str, int]']",
    'class_attr_shadows_enclosing': "ok -> ({'x': <class 'int'>}, {'z': <class 'str'>})",
    'class_body_reads_method_annotations': "ok -> {'return': <class 'int'>}",
    'class_type_params': "ok -> [('TypeVar', 'D'), ('TypeVarTuple', 'E'), ('ParamSpec', 'F')]",
    'def_type_params': "ok -> [('TypeVar', 'A'), ('TypeVarTuple', 'B'), ('ParamSpec', 'C')]",
    'fwd_attribute_error_deferred': "ok -> ('ForwardRef', 'obj.missing', True)",
    'fwd_closure_bound_later': "ok -> ('later', 1)",
    'fwd_evaluate_partial': '''ok -> ["set[ForwardRef('undefined')]", "dict[int, ForwardRef('undef')]", "ForwardRef('a + b')", 3]''',
    'fwd_per_key': "ok -> {'x': ('ForwardRef', 'builtins.undef'), 'y': 'list[int]', 'z': ('ForwardRef', '1 + int'), 'a': \"<class 'int'>\", 'b': \"set[ForwardRef('undefined', owner=<function _partial at 0x0>)]\"}",
    'interpolation_bad_conversion': "ValueError: Interpolation() argument 'conversion' must be one of 's', 'a' or 'r'",
    'interpolation_match': "ok -> (1, 'x', 'r', '>3')",
    'interpolation_readonly': 'AttributeError: readonly attribute',
    'method_nested_class_nonlocal': "ok -> ('later', <class 'list'>)",
    'method_type_params': "ok -> ([('TypeVar', 'G')], [('TypeVar', 'G')])",
    'nested_def_type_params': "ok -> [('TypeVar', 'H'), ('ParamSpec', 'I')]",
    'plain_defs_have_empty_type_params': 'ok -> ((), (), ())',
    'range_not_subscriptable': "TypeError: type 'range' is not subscriptable",
    'starred_subscript': 'ok -> ((typing.Unpack[Ts],), (<class \'int\'>, typing.Unpack[Ts]))',
    'str_plus_tstring': 'TypeError: can only concatenate str (not "string.templatelib.Template") to str',
    'template_bad_arg': "TypeError: Template.__new__ *args need to be of type 'str' or 'Interpolation', got int",
    'template_type_repr': '''ok -> ["t'hi{42}'", "Template('hi', Interpolation(42, '', None, ''))", 't"it\\'s{a!r:>5}"']''',
    'templatelib_module': "ok -> ('string.templatelib', 'string.templatelib')",
    'tstring_concat': "ok -> \"Template(strings=('', 'y'), interpolations=(Interpolation(1, 'x', None, ''),))\"",
    'tstring_implicit_concat': "ok -> \"Template(strings=('', 'y'), interpolations=(Interpolation(1, 'x', None, ''),))\"",
    'tstring_iter_drops_empty': "ok -> ['a', Interpolation(1, 'x', None, ''), Interpolation(2, 'y', None, '')]",
    'tstring_mixed_with_str': "ok -> 'cannot mix t-string literals with string or bytes literals'",
    'tstring_parts': "ok -> (('a', 'b'), (1,))",
    'tstring_plus_str': 'TypeError: can only concatenate string.templatelib.Template (not "str") to string.templatelib.Template',
    'tstring_repr': '''ok -> "Template(strings=('a', 'b', 'cx=', '{z}'), interpolations=(Interpolation(1, ' x', None, ''), Interpolation(1, 'x', 'r', '>5'), Interpolation(1, 'x', 'r', '')))"''',
    'tstring_string_format': '''ok -> {'a': "t'{x}'", 'b': "t'{x:1}'", 'c': "t'{x | y * z}'", 'd': "t'{ 0}'"}''',
    'tuple_alias': "ok -> ('tuple[int, ...]', 'tuple[typing.Unpack[Ts]]')",
    'type_params_are_stable': 'ok -> (True, True)',
    'unpacked_alias': "ok -> ('*tuple[int, ...]', True, False)",
}


def _normalise(text):
    # An owner's repr carries its address, which differs run to run and VM to VM.
    import re
    return re.sub(r' at 0x[0-9a-fA-F]+>', ' at 0x0>', text)


r = {k: _normalise(v) for k, v in r.items()}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-36s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-36s %s is not in EXPECTED' % (extra, 'DIFF'))
