# Fixture for KeywordOnlyParamsTestCase.
#
# Keyword-only parameters — the names after ``*args`` in a def — bind
# from keyword arguments and must NOT leak into a following ``**kwargs``.
# werkzeug's ``Client.open(self, *args, buffered=False,
# follow_redirects=False, **kwargs)`` relies on this: it branches on
# ``if not kwargs``, which was wrongly false because the kw-only names
# leaked into kwargs.


class C:
    def call(self, *args, buffered=False, follow_redirects=False, **kwargs):
        return {
            "nargs": len(args),
            "buffered": buffered,
            "follow_redirects": follow_redirects,
            "extra_keys": sorted(kwargs.keys()),
            "kwargs_empty": not kwargs,
        }

    def with_opt(self, *args, opt=0, **kwargs):
        return [opt, sorted(kwargs.keys())]


def kwonly_bound_and_not_leaked():
    # The exact werkzeug shape: kw-only values bind, **kwargs stays empty.
    return C().call("a", buffered=True, follow_redirects=False)


def kwonly_defaults_when_absent():
    return C().call("a", "b")


def extras_land_in_kwargs():
    # Genuine extra keyword args remain in **kwargs; kw-only names don't.
    return C().call(buffered=True, spam="eggs", ham=1)


def caller_dict_not_mutated():
    # Binding kw-only ``opt`` drops it from the **kwargs copy; the
    # caller's splatted dict must NOT be mutated by that drop.
    shared = {"opt": 5, "x": 1}
    bound_opt, kwargs_keys = C().with_opt(**shared)
    return [bound_opt, kwargs_keys, sorted(shared.keys())]
