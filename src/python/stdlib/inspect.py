# GRAIL minimal inspect stub.
#
# CPython's inspect is large (~3000 lines) and pokes deep into
# CPython frame internals.  Grail needs a handful of predicate
# functions that downstream packages call at runtime.  Defaults
# err on the side of False so callers fall into their non-special
# paths.  Expand on demand.


def ismethod(obj):
    """True if obj is a bound method."""
    # Grail's BoundMethod is the closest analogue; treat the
    # Smalltalk class name as a heuristic so we don't have to
    # import the Smalltalk side.
    return type(obj).__name__ == 'BoundMethod'


def isfunction(obj):
    return type(obj).__name__ in ('function', 'ExecBlock')


def isclass(obj):
    return isinstance(obj, type)


def iscoroutinefunction(obj):
    return False


def iscoroutine(obj):
    return False


def isasyncgenfunction(obj):
    return False


def isasyncgen(obj):
    return False


def isgeneratorfunction(obj):
    return False


def isgenerator(obj):
    return False


def isbuiltin(obj):
    return False


def isroutine(obj):
    return ismethod(obj) or isfunction(obj)


def getfullargspec(obj):
    """Return a 7-tuple-shaped object describing obj's signature.
    Stub: empty arg lists, no annotations."""
    return _FullArgSpec(args=[], varargs=None, varkw=None, defaults=None,
                        kwonlyargs=[], kwonlydefaults=None, annotations={})


class _FullArgSpec:
    def __init__(self, args, varargs, varkw, defaults, kwonlyargs,
                 kwonlydefaults, annotations):
        self.args = args
        self.varargs = varargs
        self.varkw = varkw
        self.defaults = defaults
        self.kwonlyargs = kwonlyargs
        self.kwonlydefaults = kwonlydefaults
        self.annotations = annotations


def signature(obj):
    """Stub Signature with no parameters."""
    return _Signature()


class _Signature:
    parameters = {}

    def bind(self, *args, **kwargs):
        return _BoundArguments()

    def bind_partial(self, *args, **kwargs):
        return _BoundArguments()


class _BoundArguments:
    args = ()
    kwargs = {}
    arguments = {}

    def apply_defaults(self):
        pass


def getsource(obj):
    return ''


def getfile(obj):
    return '<unknown>'


def stack():
    return []


def currentframe():
    return None
