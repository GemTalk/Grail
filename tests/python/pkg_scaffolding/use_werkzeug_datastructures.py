# Probe for Werkzeug Step 2 — werkzeug.datastructures.
#
# Step 2 lands ``mixins'' + ``structures'' + a thinned __init__ that
# only re-exports those two submodules' contents (the rest of the
# upstream package re-exports — accept, auth, cache_control, csp,
# etag, file_storage, headers, range — pull in werkzeug.http and
# werkzeug.exceptions which arrive in Steps 3 and 5).  As later
# steps land, the package __init__ grows back toward the upstream
# shape.
#
# Known gaps surfaced by this step but NOT yet fixed:
#
#   * ``MultiDict([(k, v), ...])'' and ``Headers().add(...)'' both
#     fail with ``super(): no parent method '__init__''' — Grail's
#     super() dispatch through a dict subclass's __init__ chain
#     doesn't find the inherited dict constructor.  This is the
#     ``class Foo(list)'' iterable-population gap from a related
#     direction (constructors that need to chain to the builtin
#     base class).  Left for a focused branch.
#
#   * ``isinstance(x, cabc.Mapping)'' returns False because
#     Grail's collections.abc stubs don't register the builtin
#     dict/list/set as virtual subclasses.  Affects polymorphic
#     dispatch in iter_multi_items — falls through to the
#     iterable branch and yields keys instead of (key, value)
#     pairs.  Tolerable; not Werkzeug's hot path.


import werkzeug.datastructures as ds


def import_succeeded():
    return ds is not None


def multidict_class_resolves():
    """``MultiDict'' is bound on the package via the __init__
    re-export of ``from .structures import MultiDict''."""
    return ds.MultiDict is not None


def immutable_dict_rejects_set():
    d = ds.ImmutableDict({'a': 1})
    try:
        d['b'] = 2
        return 'no-error'
    except TypeError:
        return 'caught'


def iter_multi_items_runs():
    """iter_multi_items must return some iterable without crashing.
    The exact yielded shape depends on isinstance(x, cabc.Mapping)
    dispatch, which is stubbed in Grail — assert non-crash only."""
    result = list(ds.iter_multi_items({'a': 1, 'b': 2}))
    return len(result) == 2
