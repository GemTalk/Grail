# Fixture for KwargSplatMergeTestCase.
#
# A call that mixes an explicit named keyword with a ``**mapping`` splat
# -- ``f(a, methods=m, **opts)`` -- previously DROPPED the ``**opts`` in
# CallAst>>printKeywordsDictOn: ("multi-source merge isn't modeled yet").
# flask's ``Rule(rule, methods=methods, **options)`` therefore lost its
# ``endpoint`` (it lives in ``**options``), so routing raised KeyError.
# The splat is now merged into the kwargs dict via ``@env1:update:``.
#
# The regression signal is that ``endpoint`` BINDS from the splat and the
# genuinely-extra key reaches ``**extra``.  (A separate, still-open issue
# also leaks the explicitly-bound names into ``**extra``; this fixture
# deliberately does not assert on the full ``extra`` key set so it stays
# green regardless of that.)


class Recorder(dict):
    def __init__(self, a, methods=None, endpoint=None, **extra):
        super().__init__()
        self.a = a
        self.methods = methods
        self.endpoint = endpoint
        self.extra = extra


def class_named_and_splat():
    # The flask ``Rule(...)`` shape: positional + explicit kwarg + **splat,
    # against a class constructor (legacy ``value:value:`` dispatch path).
    opts = {"endpoint": "hello", "x": 1}
    r = Recorder("rule", methods=["GET"], **opts)
    return [r.a, r.methods, r.endpoint, "x" in r.extra]


def func_named_and_splat():
    # Same shape against a plain function (varargs ``_name:kw:`` path).
    def f(a, methods=None, endpoint=None, **extra):
        return [a, methods, endpoint, "x" in extra]

    opts = {"endpoint": "hello", "x": 1}
    return f("rule", methods=["GET"], **opts)


def splat_only():
    # A lone ``**splat`` (no explicit kwargs) must still pass through.
    def f(a, methods=None, endpoint=None, **extra):
        return [a, methods, endpoint, "x" in extra]

    opts = {"methods": ["GET"], "endpoint": "hello", "x": 1}
    return f("rule", **opts)
