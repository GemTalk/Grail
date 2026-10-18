"""Assigning __defaults__ / __kwdefaults__ in a new SHAPE changes what calls bind.

A same-shape assignment already bound (#1669).  One that changed the shape --
None, a tuple of another length, a keyword-only name added or removed -- read
back but did not bind, because whether a parameter has a default is compiled
into the function's entry point.  It now rebinds the function's calls for the
session (#1714), for module-level functions and methods.  Nested functions
and lambdas keep the old limit (FunctionDefaultsTestCase).

Every expectation was measured against CPython 3.14.
"""

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _try(fn):
    """fn's answer, or the TypeError it raised, as text."""
    try:
        return fn()
    except TypeError as exc:
        return 'TypeError: %s' % exc


# --- module-level functions --------------------------------------------------

def grow(a, b):
    return (a, b)


grow.__defaults__ = (2,)
check('defaults_added_to_a_def_that_had_none_bind',
      [_try(lambda: grow(1)), _try(lambda: grow(1, 3)), _try(lambda: grow(a=1)), grow.__defaults__],
      [(1, 2), (1, 3), (1, 2), (2,)])
grow.__defaults__ = (9, 8)
grow_more = _try(lambda: grow())
grow.__defaults__ = (7,)
check('later_writes_of_any_shape_take_effect',
      [grow_more, _try(lambda: grow(1))], [(9, 8), (1, 7)])


def shrink(a, b=2):
    return (a, b)


shrink.__defaults__ = None
check('defaults_set_to_none_stop_binding',
      [_try(lambda: shrink(1)), _try(lambda: shrink(1, 3))],
      ["TypeError: shrink() missing 1 required positional argument: 'b'", (1, 3)])
shrink.__defaults__ = (1, 5)
check('too_many_positional_names_the_new_range',
      [_try(lambda: shrink()), _try(lambda: shrink(1, 2, 3))],
      [(1, 5), 'TypeError: shrink() takes from 0 to 2 positional arguments but 3 were given'])


def deleted(a, b=2):
    return (a, b)


try:
    del deleted.__defaults__
except AttributeError:      # what Grail answered before #1714; CPython never does
    pass
check('deleting_defaults_stops_binding_and_reads_none',
      [_try(lambda: deleted(1)), deleted.__defaults__],
      ["TypeError: deleted() missing 1 required positional argument: 'b'", None])


def kwonly(a, *, x):
    return (a, x)


kwonly.__kwdefaults__ = {'x': 10}
kw_added = _try(lambda: kwonly(1))
kwonly.__kwdefaults__['x'] = 11
kw_mutated = _try(lambda: kwonly(1))
kwonly.__kwdefaults__ = None
check('keyword_only_defaults_added_mutated_and_removed',
      [kw_added, kw_mutated, _try(lambda: kwonly(1))],
      [(1, 10), (1, 11), "TypeError: kwonly() missing 1 required keyword-only argument: 'x'"])


def posonly(a, b, /, c):
    return (a, b, c)


posonly.__defaults__ = (2, 3)
check('positional_only_parameters_take_their_defaults',
      [_try(lambda: posonly(1)), _try(lambda: posonly(1, c=9)), _try(lambda: posonly())],
      [(1, 2, 3), (1, 2, 9), "TypeError: posonly() missing 1 required positional argument: 'a'"])


def starred(a, b, *rest):
    return (a, b, rest)


starred.__defaults__ = (5,)
check('a_varargs_def_takes_new_defaults',
      [_try(lambda: starred(1)), _try(lambda: starred(1, 2, 3, 4))],
      [(1, 5, ()), (1, 2, (3, 4))])


def longer(a, b):
    return (a, b)


longer.__defaults__ = (7, 8, 9)
check('a_longer_tuple_supplies_the_last_parameters', _try(lambda: longer()), (8, 9))


def mixed(a, b, c):
    return (a, b, c)


mixed.__defaults__ = (20, 30)
mixed_kw = [_try(lambda: mixed(1, c=3)), _try(lambda: mixed(c=3, a=1))]
mixed.__defaults__ = None
check('keywords_mix_with_new_defaults_and_every_missing_one_is_named',
      mixed_kw + [_try(lambda: mixed())],
      [(1, 20, 3), (1, 20, 3),
       "TypeError: mixed() missing 3 required positional arguments: 'a', 'b', and 'c'"])


def called_from_here():
    return target(1)


def target(a, b):
    return (a, b)


target.__defaults__ = (3,)
check('a_call_compiled_in_the_same_module_binds', _try(called_from_here), (1, 3))

_kw = {'a': 1}


def shares(a, b):
    return (a, b)


shares.__defaults__ = (2,)
_try(lambda: shares(**_kw))
check('the_callers_keyword_dict_is_untouched', _kw, {'a': 1})


# --- methods -----------------------------------------------------------------

class C:
    def m(self, a, b):
        return (a, b)

    def n(self, a, b=2):
        return (a, b)

    def via_self(self):
        return self.m(1)


C.m.__defaults__ = (5,)
check('a_methods_new_defaults_bind_however_it_is_called',
      [_try(lambda: C().m(1)), _try(lambda: C().via_self()), _try(lambda: C.m(C(), 1))],
      [(1, 5), (1, 5), (1, 5)])
C.n.__defaults__ = None
check('a_methods_defaults_set_to_none_stop_binding', _try(lambda: C().n(1)),
      "TypeError: C.n() missing 1 required positional argument: 'b'")


class Inherits(C):
    pass


class Overrides(C):
    def m(self, a, b):
        return ('Overrides', a, b)


check('a_subclass_shares_the_function_and_an_override_keeps_its_own',
      [_try(lambda: Inherits().m(1)), _try(lambda: Overrides().m(1))],
      [(1, 5), "TypeError: Overrides.m() missing 1 required positional argument: 'b'"])
check('the_method_is_still_a_bound_method', type(C().m).__name__, 'method')


class K:
    def m(self, a, *, z):
        return (a, z)


K.m.__kwdefaults__ = {'z': 'zz'}
check('a_methods_keyword_only_defaults_bind',
      [_try(lambda: K().m(1)), K.m.__kwdefaults__], [(1, 'zz'), {'z': 'zz'}])

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
