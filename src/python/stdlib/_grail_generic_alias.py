"""The rules behind ``types.GenericAlias`` and ``types.UnionType``, in Python.

CPython implements both types in C (Objects/genericaliasobject.c and
Objects/unionobject.c).  Grail's are Smalltalk classes -- PyGenericAlias and
PyUnionType, reported as ``types.GenericAlias`` / ``types.UnionType`` -- and
those classes hold the data and the cheap protocol.  What they delegate here
is the part that is RULES rather than storage: which arguments are type
parameters, how a subscript substitutes them, and how an argument prints.
Written as close to the C as Python allows, so that it can be read against
it; each function names the C function it ports.

Imported lazily by the Smalltalk classes, never at their creation: a
``list[int]`` can be built long before this module could be imported.
"""


def _is_type(obj):
    return isinstance(obj, type)


def _index(params, item):
    # tuple_index: IDENTITY, as in C.
    for i, p in enumerate(params):
        if p is item:
            return i
    return -1


def make_parameters(args):
    """_Py_make_parameters: every argument that is a type parameter (it has
    __typing_subst__), and every parameter of an argument that has its own
    __parameters__ -- in order, without duplicates.  A bare class contributes
    nothing, even if it happens to define __parameters__; a nested tuple or
    list (Callable's argument list) is searched as well."""
    params = []
    for t in args:
        if _is_type(t):
            continue
        if hasattr(t, '__typing_subst__'):
            if _index(params, t) < 0:
                params.append(t)
            continue
        sub = getattr(t, '__parameters__', None)
        if sub is None and isinstance(t, (tuple, list)):
            sub = make_parameters(t)
        if isinstance(sub, tuple):
            for p in sub:
                if _index(params, p) < 0:
                    params.append(p)
    return tuple(params)


def _unpacked_tuple_args(arg):
    """_unpacked_tuple_args: the arguments of ``*tuple[...]``, or None."""
    import types
    if (isinstance(arg, types.GenericAlias) and arg.__unpacked__
            and arg.__origin__ is tuple):
        return arg.__args__
    result = getattr(arg, '__typing_unpacked_tuple_args__', None)
    return result


def unpack_args(item):
    """_unpack_args: the subscript as a tuple, with each ``*tuple[X, Y]``
    spliced in as X, Y -- unless it is the unbounded ``*tuple[X, ...]``,
    which stays whole."""
    items = item if isinstance(item, tuple) else (item,)
    out = []
    for it in items:
        if not _is_type(it):
            sub = _unpacked_tuple_args(it)
            if (isinstance(sub, tuple)
                    and not (sub and sub[-1] is Ellipsis)):
                out.extend(sub)
                continue
        out.append(it)
    return tuple(out)


def _is_unpacked_typevartuple(arg):
    if _is_type(arg):
        return False
    return bool(getattr(arg, '__typing_is_unpacked_typevartuple__', False))


def _subs_tvars(obj, params, argitems):
    """subs_tvars: substitute into an argument that is itself generic."""
    sub = getattr(obj, '__parameters__', None)
    if isinstance(sub, tuple) and sub:
        subargs = []
        for arg in sub:
            i = _index(params, arg)
            if i >= 0:
                param = params[i]
                arg = argitems[i]
                if hasattr(type(param), '__iter__') and isinstance(arg, tuple):
                    # A TypeVarTuple takes its whole run of arguments.
                    subargs.extend(arg)
                    continue
            subargs.append(arg)
        obj = obj[tuple(subargs)]
    return obj


def subs_parameters(alias, args, parameters, item):
    """_Py_subs_parameters: ``alias[item]`` applied to ``args``, with
    ``parameters`` naming what may be replaced."""
    nparams = len(parameters)
    if nparams == 0:
        raise TypeError(f"{alias!r} is not a generic class")
    item = unpack_args(item)
    for param in parameters:
        prepare = getattr(param, '__typing_prepare_subst__', None)
        if prepare is not None:
            item = prepare(alias, item if isinstance(item, tuple) else (item,))
    argitems = item if isinstance(item, tuple) else (item,)
    nitems = len(argitems)
    if nitems != nparams:
        raise TypeError(
            f"Too {'many' if nitems > nparams else 'few'} arguments for "
            f"{alias!r}; actual {nitems}, expected {nparams}")
    newargs = []
    for arg in args:
        if _is_type(arg):
            newargs.append(arg)
            continue
        if isinstance(arg, (tuple, list)):
            sub = subs_parameters(alias, arg, parameters, item)
            newargs.append(sub if isinstance(arg, tuple) else list(sub))
            continue
        unpack = _is_unpacked_typevartuple(arg)
        subst = getattr(arg, '__typing_subst__', None)
        param = arg
        if subst is not None:
            # gh-155752: __parameters__ is cached, so an argument can gain
            # __typing_subst__ after it was computed.  _index answers -1 for
            # it, which argitems[-1] silently took as the LAST argument.
            iparam = _index(parameters, arg)
            if iparam < 0:
                raise TypeError(
                    f"argument {arg!r} with __typing_subst__ was not found "
                    f"in __parameters__")
            arg = subst(argitems[iparam])
        else:
            arg = _subs_tvars(arg, parameters, argitems)
        if unpack:
            # GH-138497: an unpacked parameter's substitution must be a tuple.
            if not isinstance(arg, tuple):
                raise TypeError(
                    f"expected __typing_subst__ of {type(param).__qualname__} "
                    f"objects to return a tuple, not {type(arg).__qualname__}")
            newargs.extend(arg)
        else:
            newargs.append(arg)
    return tuple(newargs)


def ga_getitem(alias, item):
    """ga_getitem: ``list[T][int]`` is ``list[int]``."""
    import types
    newargs = subs_parameters(alias, alias.__args__, alias.__parameters__, item)
    result = types.GenericAlias(alias.__origin__, newargs)
    if alias.__unpacked__:
        result = next(iter(result))
    return result


def repr_item(p):
    """ga_repr_item: one argument as it prints inside ``X[...]``."""
    if p is Ellipsis:
        return '...'
    if isinstance(p, list):
        return '[' + ', '.join(repr_item(x) for x in p) + ']'
    try:
        if hasattr(p, '__origin__') and hasattr(p, '__args__'):
            return repr(p)
        qualname = getattr(p, '__qualname__', None)
        module = getattr(p, '__module__', None)
    except Exception:
        return repr(p)
    if isinstance(qualname, str) and isinstance(module, str):
        if module == 'builtins':
            return qualname
        return f'{module}.{qualname}'
    return repr(p)


def ga_repr(alias):
    """ga_repr: ``list[int]``, ``*tuple[int, ...]``, ``tuple[()]``."""
    args = alias.__args__
    head = ('*' if alias.__unpacked__ else '') + repr_item(alias.__origin__)
    if not args:
        return head + '[()]'
    return head + '[' + ', '.join(repr_item(a) for a in args) + ']'


def union_parameters(union):
    """unionobject.c's union_parameters: the same collection as an alias's."""
    return make_parameters(union.__args__)


def dedup(members):
    """unionobject.c's builder: flatten nested unions and drop repeats --
    ``int | int`` is ``int``, ``int | str | int`` is ``int | str``.  Repeats
    are found by ==, as CPython falls back to for an unhashable member."""
    import types
    out = []
    for m in members:
        subs = m.__args__ if isinstance(m, types.UnionType) else (m,)
        for s in subs:
            if s is None:
                s = type(None)
            if not any(s is o or s == o for o in out):
                out.append(s)
    return out


def union_getitem(union, item):
    """union_getitem: substitute, then build the union again -- which may
    collapse it (``(T | int)[int]`` is ``int``)."""
    import types
    newargs = subs_parameters(union, union.__args__, union.__parameters__, item)
    return types.UnionType.___grailUnionFrom___(dedup(newargs))


def union_repr(union):
    """union_repr: members joined by `` | ``, NoneType spelled ``None``."""
    parts = []
    for a in union.__args__:
        if a is type(None):
            parts.append('None')
        else:
            parts.append(repr_item(a))
    return ' | '.join(parts)


def ga_reduce(alias):
    """ga_reduce: rebuild through the type; a starred alias through next()."""
    import types
    if alias.__unpacked__:
        return (next, (iter(types.GenericAlias(alias.__origin__, alias.__args__)),))
    return (type(alias), (alias.__origin__, alias.__args__))


def union_hash(union):
    """union_hash: the hash of the member SET, so equal unions hash alike
    whatever their order -- and an unhashable member raises, as it does in
    CPython (``unhashable type: 'UnhashableMeta'``)."""
    # Each member through hash() first: a frozenset of classes hashes them
    # with the Smalltalk hash, which does not consult a metaclass __hash__.
    for arg in union.__args__:
        hash(arg)
    return hash(frozenset(union.__args__))


def union_reduce(union):
    """``(operator.getitem, (Union, args))`` -- how CPython 3.14 pickles a
    union: the type subscripted with its members."""
    import operator, typing
    return (operator.getitem, (typing.Union, union.__args__))
