# GRAIL minimal inspect stub.
#
# CPython's inspect is large (~3000 lines) and pokes deep into
# CPython frame internals.  Grail needs a handful of predicate
# functions that downstream packages call at runtime.  Defaults
# err on the side of False so callers fall into their non-special
# paths.  Expand on demand.

# Underscored so ``from inspect import *`` does not re-export them, which is
# what CPython's own inspect does with its imports.
import sys as _sys
import types as _types
from collections import namedtuple as _namedtuple


# CPython's code-object flag bits, exposed here because that is where Python
# code reads them from (``from inspect import CO_COROUTINE``).  The values are
# CPython's and are part of the language surface, not an implementation
# detail -- test.test_builtin imports CO_COROUTINE and masks co_flags with it.
#
# THE FLAGS ARE REAL; THE PREDICATES BELOW STILL ARE NOT.  This comment used to
# claim a Grail PyCode carries no flags word.  It does: FunctionDefAst >>
# emitCoFlags computes one from the AST, so ``async def f()`` reports 131
# (OPTIMIZED|NEWLOCALS|COROUTINE) where a plain def reports 3, with CO_GENERATOR
# and CO_ASYNC_GENERATOR set from whether the body yields.
#
# So iscoroutinefunction / isgeneratorfunction / isasyncgenfunction COULD be
# CPython's real implementation -- a mask against co_flags -- and they are not,
# because making iscoroutinefunction truthful HANGS ``import
# django.http.response`` indefinitely (measured: >6 minutes, where the whole
# of test___all__ takes 22 seconds with the stub).  Something on Django's
# asgiref path loops once it is told the truth.  That is a real latent bug the
# stub is masking rather than a reason to keep the stub, and it is written up
# in docs/Issues.md with the reproduction.
#
# Until it is fixed, code that needs the honest answer keeps a local predicate:
# see unittest/async_case.py, which cannot work without one.
CO_OPTIMIZED = 0x0001
CO_NEWLOCALS = 0x0002
CO_VARARGS = 0x0004
CO_VARKEYWORDS = 0x0008
CO_NESTED = 0x0010
CO_GENERATOR = 0x0020
CO_NOFREE = 0x0040
CO_COROUTINE = 0x0080
CO_ITERABLE_COROUTINE = 0x0100
CO_ASYNC_GENERATOR = 0x0200
CO_HAS_DOCSTRING = 0x4000000
CO_METHOD = 0x8000000


def ismethod(obj):
    """True if obj is a bound method."""
    # Grail's BoundMethod is the closest analogue; treat the
    # Smalltalk class name as a heuristic so we don't have to
    # import the Smalltalk side.
    return type(obj).__name__ == 'BoundMethod'


def isfunction(obj):
    # ``UnboundMethod`` is what a CLASS hands back where CPython hands back a
    # plain function -- ``C.meth`` is an UnboundMethod, ``C().meth`` a
    # BoundMethod, which is exactly CPython's function/method split.  Leaving it
    # out made isroutine() False for every method reached through its class, so
    # classify_class_attrs called them all "data" and getmembers/pydoc agreed.
    return type(obj).__name__ in ('function', 'ExecBlock', 'UnboundMethod')


def isclass(obj):
    return isinstance(obj, type)


def iscoroutinefunction(obj):
    # Grail compiles ``async def`` to a plain function, so there is no
    # intrinsic coroutine flag.  The only way an object tests true is
    # the explicit markcoroutinefunction() marker (asgiref's SyncToAsync
    # marks itself; Django's async adaptation machinery keys off this).
    try:
        return getattr(obj, '_is_coroutine_marker', False) is True
    except Exception:
        return False


def markcoroutinefunction(func):
    """Mark func as a coroutine function for iscoroutinefunction().

    CPython 3.12+ rewrites func.__code__.co_flags; Grail has no code
    objects, so set a plain attribute.  Callables that reject attribute
    stores (BoundMethod et al.) are left unmarked — they then test
    False, which keeps callers on their sync paths.
    """
    try:
        func._is_coroutine_marker = True
    except Exception:
        pass
    return func


def iscoroutine(obj):
    """True for a coroutine OBJECT -- what ``async def f()'' answers.

    Was hardcoded False, which predates coroutine objects existing at all
    (async def used to compile as a plain def).  Now that it answers a real
    PythonCoroutine, the honest test is against types.CoroutineType, which
    types.py derives from a live coroutine.

    This is a dispatch decision, not introspective trivia: asgiref, anyio and
    starlette all ask ``iscoroutine(result)'' to decide whether to await what
    a call returned.  Answering False about a real coroutine means the caller
    treats it as a plain value and the body never runs.
    """
    return isinstance(obj, _types.CoroutineType)


def isasyncgenfunction(obj):
    return False


def isasyncgen(obj):
    """True for an async-generator OBJECT -- what calling an ``async def'' that
    contains ``yield'' answers.  Was hardcoded False because no such object
    existed; PythonAsyncGenerator now does, and types.AsyncGeneratorType names
    it."""
    return isinstance(obj, _types.AsyncGeneratorType)


def isgeneratorfunction(obj):
    return False


def isgenerator(obj):
    """True for a generator OBJECT -- what calling a ``yield''-containing def
    answers.  Hardcoded False for the same historical reason as iscoroutine;
    types.GeneratorType now names the real class.

    THE COROUTINE EXCLUSION IS LOAD-BEARING, and it is a Grail-specific
    hazard rather than a transcription of CPython.  PythonCoroutine IS a
    PythonGenerator here -- that subclassing is deliberate, because "do not run
    the body at the call, run it when driven" is the contract the generator
    machinery already implements -- so a bare isinstance() check answers True
    about a coroutine, where CPython answers False.

    That would matter: code that branches on isgenerator() before
    iscoroutine() would take the generator arm for a coroutine and drive it as
    a plain iterator.  CPython's predicates are mutually exclusive and callers
    rely on it.

    PythonAsyncGenerator is excluded for exactly the same reason -- it is also a
    PythonGenerator subclass -- and it is the more dangerous of the two to get
    wrong, because an async generator DOES answer to send() and so would drive
    without complaint, handing back the internal PyAsyncYield tag as if it were
    an item."""
    return (isinstance(obj, _types.GeneratorType)
            and not isinstance(obj, _types.CoroutineType)
            and not isinstance(obj, _types.AsyncGeneratorType))


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


class _ParameterKind:
    """Stands in for inspect._ParameterKind enum members - distinct objects
    that compare by identity, which is all `param.kind ==
    inspect.Parameter.VAR_POSITIONAL`-style checks need.

    CPython's is an IntEnum, so its members carry ``name``, ``value``,
    ``description``, and a ``__str__`` that answers the NAME -- and the last of
    those is the one that shows: ``str(param.kind)`` printed
    ``<_ParameterKind: POSITIONAL_OR_KEYWORD>`` here where CPython prints
    ``POSITIONAL_OR_KEYWORD``, because with no __str__ the repr stood in for
    both.  ``description`` is the human phrase CPython puts in its own error
    messages ("positional or keyword").

    Still not an enum: identity comparison is what the corpus uses, and being a
    real IntEnum would drag in ordering against ints for no reader."""

    def __init__(self, name, value=None, description=None):
        self._name = name
        self._value = value
        self._description = description

    @property
    def name(self):
        return self._name

    @property
    def value(self):
        return self._value

    @property
    def description(self):
        return self._description

    def __str__(self):
        return self._name

    def __int__(self):
        return self._value

    def __repr__(self):
        return '<_ParameterKind.%s: %r>' % (self._name, self._value)


class _empty:
    """CPython's ``Parameter.empty`` / ``Signature.empty`` -- the marker for
    "there is no default" and "there is no annotation".

    A MODULE-level sentinel rather than None, and that distinction is the whole
    point: ``Parameter('module', KEYWORD_ONLY, default=None)`` means the default
    IS None, and rendered as ``module=None``.  Grail used None as the marker, so
    that parameter rendered as a bare ``module`` -- indistinguishable from one
    with no default at all.  Defined before Parameter so it can be the actual
    default expression of __init__ rather than something patched in after."""


class Parameter:
    POSITIONAL_ONLY = _ParameterKind('POSITIONAL_ONLY', 0, 'positional-only')
    POSITIONAL_OR_KEYWORD = _ParameterKind('POSITIONAL_OR_KEYWORD', 1, 'positional or keyword')
    VAR_POSITIONAL = _ParameterKind('VAR_POSITIONAL', 2, 'variadic positional')
    KEYWORD_ONLY = _ParameterKind('KEYWORD_ONLY', 3, 'keyword-only')
    VAR_KEYWORD = _ParameterKind('VAR_KEYWORD', 4, 'variadic keyword')

    empty = _empty

    def __init__(self, name, kind, default=_empty, annotation=_empty):
        self.name = name
        self.kind = kind
        self.default = default
        self.annotation = annotation

    def __repr__(self):
        return '<Parameter "%s">' % (self,)

    def __str__(self):
        text = self.name
        if self.kind is Parameter.VAR_POSITIONAL:
            text = '*' + text
        elif self.kind is Parameter.VAR_KEYWORD:
            text = '**' + text
        annotated = self.annotation is not Parameter.empty
        if annotated:
            text = text + ': ' + formatannotation(self.annotation)
        if self.default is not Parameter.empty:
            text = text + (' = ' if annotated else '=') + repr(self.default)
        return text

    def __eq__(self, other):
        """CPython compares the four fields, which is what makes an expected
        Signature built by hand compare equal to an introspected one -- and
        without it two Parameters compared by IDENTITY, so no such comparison
        could ever succeed (test_enum's test_inspect_signatures builds exactly
        that expectation)."""
        if not isinstance(other, Parameter):
            return NotImplemented
        return (self.name == other.name
                and self.kind is other.kind
                and self.default == other.default
                and self.annotation == other.annotation)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash((self.name, id(self.kind)))


_KINDS = (Parameter.POSITIONAL_ONLY, Parameter.POSITIONAL_OR_KEYWORD,
          Parameter.VAR_POSITIONAL, Parameter.KEYWORD_ONLY,
          Parameter.VAR_KEYWORD)


def formatannotation(annotation, base_module=None):
    """Render an annotation as CPython does in a signature string.

    A class prints as its NAME (``int``, not ``<class 'int'>``); anything else
    prints as its repr -- so a string annotation prints WITH quotes, which is
    also what CPython does for one.

    Grail maps some builtins to a method handle rather than a class, so the
    test is "does it have a __name__" rather than isinstance(x, type): ``str``
    is a BoundMethod here and would otherwise have printed as its repr.
    """
    name = getattr(annotation, '__name__', None)
    if isinstance(name, str):
        return name
    return repr(annotation)


def _annotations_for_render(func):
    """The annotations to print in a signature, never raising.

    VALUE first, since that is what CPython renders.  An annotation naming
    something unbound raises NameError there -- but a signature is usually
    being printed to DIAGNOSE such code, so fall back to the source text
    rather than making the repr itself fail.
    """
    try:
        import annotationlib
        return annotationlib.get_annotations(func)
    except NameError:
        try:
            import annotationlib
            return annotationlib.get_annotations(
                func, format=annotationlib.Format.STRING)
        except BaseException:
            return {}
    except BaseException:
        return {}


def _unwrap(obj):
    """Follow the __wrapped__ chain, as signature(follow_wrapped=True) does.

    functools.wraps sets it, so ``signature(lru_cache(f))`` reports f's
    parameters rather than the wrapper's ``(*args, **kwargs)``.  Bounded in
    case a wrapper ever points at itself.
    """
    seen = 0
    while seen < 32:
        nxt = getattr(obj, '__wrapped__', None)
        if nxt is None or nxt is obj:
            return obj
        obj = nxt
        seen += 1
    return obj


def _signature_from_spec(func):
    """Build a Signature from the def-time parameter spec, or None.

    FunctionDefAst stamps ``__signature_spec__`` -- a tuple of
    ``(name, kind-index, default-source-text-or-None)`` in declaration order --
    on every def.  Grail has no code object to introspect, and the corpus never
    reads ``co_varnames``/``co_argcount`` anyway, so the compiler records what
    it already knows instead.
    """
    spec = getattr(func, '__signature_spec__', None)
    if not spec:
        return None
    ann = _annotations_for_render(func)
    params = []
    for entry in spec:
        name = entry[0]
        kind = _KINDS[entry[1]]
        # Two elements means "no default" -- see emitSignatureEntryFor:.
        default = entry[2] if len(entry) > 2 else None
        params.append(Parameter(
            name, kind,
            default=_DefaultText(default) if default is not None else _empty,
            annotation=ann.get(name, _empty)))
    return Signature(parameters=params,
                     return_annotation=ann.get('return', _empty))


class _DefaultText:
    """A default rendered from its SOURCE TEXT rather than its value.

    CPython prints ``repr(default)``.  Grail prints the text the def wrote,
    because the default is evaluated exactly once -- at def-time, into the
    wrapper block FunctionDefAst already emits -- and re-emitting the
    expression here to get a value would evaluate it a SECOND time, which is
    observable for a mutable or side-effecting default.

    The two now agree for every LITERAL default, which is almost every real
    signature -- ``c=True``, ``n=0``, ``s=''``, ``g=-5``, ``h=[1]``,
    ``i={'x': 1}``, ``j=(1, 2)``, and nested combinations of those.  They
    differ only for a COMPUTED default, where the text is not already its own
    repr: ``x=1+1`` prints ``1 + 1`` where CPython prints ``2``.

    That agreement is newer than this class.  The text came from the
    ANNOTATIONS unparser, whose assumptions do not hold for defaults, and it
    was wrong for most non-trivial shapes: every binary operator rendered as
    the PEP 604 union bar (``1+1`` -> ``1 | 1``), a string literal lost its
    quotes because an annotation's string is a forward reference (``'abc'`` ->
    ``abc``, and ``''`` -> nothing at all), a tuple rendered bare so the
    signature's apparent ARITY changed (``(1,2)`` -> ``1, 2``), and unary
    minus, lists and dicts fell to an ``<annotation>`` placeholder.  Defaults
    now have their own renderer (``___defaultSourceString___``) which delegates
    to the annotation form only where the two genuinely agree.

    Closing the remaining gap needs the EVALUATED defaults --
    ``__defaults__`` / ``__kwdefaults__``, which Grail does not expose at all --
    so that a value can be repr'd without re-evaluating the expression.
    """

    def __init__(self, text):
        self._text = text

    def __repr__(self):
        return self._text

    def __eq__(self, other):
        """Equal to another text, and equal to a VALUE that renders as that
        text.

        The second half is what lets an introspected signature compare equal to
        the same one built by hand: CPython's Parameter.__eq__ compares defaults
        by value, and an expected signature is written with values
        (``default=1``) while an introspected one carries the source text
        (``'1'``).  Comparing by rendered form is the faithful bridge -- and the
        only one available, since re-evaluating the text to get a value is
        exactly what this class exists to avoid.

        So it agrees wherever the text is already its own repr, which is every
        literal, and disagrees where it is not (``x=1+1`` holds '1+1', which no
        value renders as) -- the same boundary __repr__ has."""
        if isinstance(other, _DefaultText):
            return other._text == self._text
        try:
            return repr(other) == self._text
        except BaseException:
            return NotImplemented

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(self._text)


def _signature_from_callable(obj, *, follow_wrapped=True, globals=None,
                             locals=None, eval_str=False,
                             annotation_format=None, sigcls=None):
    """CPython-private constructor behind signature()."""
    return signature(obj, follow_wrapped=follow_wrapped)


def _signature_get_user_defined_method(cls, method_name):
    """``cls``'s ``method_name`` if a USER defined it, else None.

    CPython's test is "not a builtin slot wrapper", which is how it declines to
    read a signature off ``type.__call__`` or ``object.__init__`` -- those exist
    on every class and describe nothing about it.  Grail's equivalent is the
    def-time parameter SPEC: the compiler stamps ``__signature_spec__`` on
    every def and on nothing else, so having one IS being a Python-level
    definition, and ``object.__init__`` has none.

    Deliberately not ``method_name in cls.__dict__``, which is CPython's own
    spelling: Grail compiles a class-body def to a Smalltalk METHOD, so it is
    reachable by getattr but absent from the computed ``__dict__`` snapshot --
    every class answered None and every class reported ``()``.
    """
    meth = getattr(cls, method_name, None)
    if meth is None:
        return None
    for attr in ('__func__', '__wrapped__'):
        inner = getattr(meth, attr, None)
        if inner is not None:
            meth = inner
    if getattr(meth, '__signature_spec__', None) is None:
        return None
    return meth


def _defines_own_method(cls, method_name):
    """Does ``cls`` ITSELF define ``method_name``, rather than inherit it?

    CPython asks ``method_name in cls.__dict__``.  Grail cannot: a class-body
    def is a Smalltalk method and does not appear there.  Nor can it compare
    the attribute by identity the way CPython does -- ``Sub.__init__`` and
    ``Plain.__init__`` are distinct objects in Grail even when Sub inherits it,
    and ``__qualname__`` names the class it was reached THROUGH (``'Sub.__init__'``
    for the inherited one), so neither answers the question.

    The parameter spec does: an inherited method carries the spec of the def
    that made it, so finding that same spec on a base means the definition came
    from there.  The one thing this cannot see is a subclass that redefines a
    method with a byte-identical parameter list, which reads as inherited --
    harmless here, because the two candidates would then agree on the answer.
    """
    spec = getattr(getattr(cls, method_name, None), '__signature_spec__', None)
    if spec is None:
        return False
    for base in (getattr(cls, '__mro__', None) or ())[1:]:
        if base is object or base is type:
            break
        base_spec = getattr(getattr(base, method_name, None),
                            '__signature_spec__', None)
        if base_spec is not None and base_spec == spec:
            return False
    return True


def _signature_from_class(cls):
    """The signature of CALLING a class, or None to fall through.

    CPython's rule, in order:

      1. a ``__call__`` the METACLASS defines -- the class is called through
         it, so it is the signature;
      2. otherwise the factory: an OWN ``__new__``, else an OWN ``__init__``,
         else an inherited ``__new__``, else an inherited ``__init__``.  Own
         beats inherited across BOTH names before either name beats the other,
         which is why this is four tests and not two.

    The leading parameter goes: ``self`` for ``__init__`` and ``cls`` for
    ``__new__`` / ``__call__`` are supplied by the call itself, so
    ``Plain(a, b=2)`` reports ``(a, b=2)`` and not ``(self, a, b=2)``.

    None means "nothing to say", leaving signature() on its previous path -- a
    ``__text_signature__`` if the class advertises one, else empty.  Before
    this, EVERY class landed there and reported ``()``, including a plain
    ``class Plain: def __init__(self, a, b=2)``.
    """
    call = _signature_get_user_defined_method(type(cls), '__call__')
    if call is not None:
        return _drop_leading_parameter(signature(call))
    new = _signature_get_user_defined_method(cls, '__new__')
    init = _signature_get_user_defined_method(cls, '__init__')
    if new is not None and _defines_own_method(cls, '__new__'):
        factory = new
    elif init is not None and _defines_own_method(cls, '__init__'):
        factory = init
    elif new is not None:
        factory = new
    else:
        factory = init
    if factory is None:
        return None
    return _drop_leading_parameter(signature(factory))


def _drop_leading_parameter(sig):
    """Drop ``self``/``cls`` from a signature read off an unbound factory, or
    None when there was nothing to read.

    A signature with NO parameters is not a bound-method signature with its
    receiver removed -- it is a def that was never introspectable -- and
    returning an empty Signature on that evidence would CLAIM the class takes
    no arguments.  None instead, so signature() falls through."""
    if sig is None:
        return None
    params = list(sig.parameters.values())
    if not params:
        return None
    return Signature(parameters=params[1:],
                     return_annotation=sig.return_annotation)


def signature(obj, *args, **kwargs):
    """Return a Signature for ``obj``.

    Resolution order, most specific first:

      1. an explicit ``__signature__``;
      2. the def-time parameter SPEC the compiler stamped on the function --
         real parameter names, kinds and defaults (see _signature_from_spec),
         reached through the ``__wrapped__`` chain so a decorated function
         reports the signature of what it wraps rather than
         ``(*args, **kwargs)``;
      3. the CPython ``__text_signature__`` convention, for callables that
         advertise one (operator.attrgetter/itemgetter/methodcaller, and the
         C-implemented functools helpers);
      4. an empty Signature.

    Step 2 is what makes ``.parameters`` non-empty and ``str(sig)`` real;
    before it, every Python-defined callable landed on step 4.
    """
    sig = getattr(obj, '__signature__', None)
    if isinstance(sig, Signature):
        return sig

    target = _unwrap(obj) if kwargs.get('follow_wrapped', True) else obj
    from_spec = _signature_from_spec(target)
    if from_spec is not None:
        return from_spec

    if isinstance(obj, type):
        sig = _signature_from_class(obj)
        if sig is not None:
            return sig
        text = getattr(obj, '__text_signature__', None)
    else:
        text = getattr(obj, '__call_signature__', None)
        if not isinstance(text, str):
            call = getattr(type(obj), '__call__', None)
            text = getattr(call, '__text_signature__', None) if call is not None else None
    if isinstance(text, str):
        return Signature(text=text)
    return Signature()


class Signature:
    empty = Parameter.empty

    def __init__(self, parameters=None, *, return_annotation=_empty, text=None):
        """CPython's first positional argument is PARAMETERS, and this took
        ``text'' there -- a Grail-only shortcut for a signature already rendered
        as a string.  So ``Signature([Parameter(...), ...])'', the spelling
        every caller writing an expected signature by hand uses, stashed the
        LIST as the rendered text; __str__ handed it back unrendered and
        __repr__ then concatenated a string with a list:

            TypeError: unsupported operand type(s) for +:
                       'Unicode7' and 'OrderedCollection'

        The text form is still here, now keyword-only, which is how the one
        internal caller passes it."""
        self._text = text
        self._params = list(parameters) if parameters else []
        self.return_annotation = return_annotation

    @classmethod
    def from_callable(cls, obj, **kwargs):
        """CPython's ``Signature.from_callable(obj)`` -- the constructor
        test_functools uses throughout, and the reason this classmethod has to
        exist rather than callers going through ``signature()``."""
        return signature(obj, **kwargs)

    @property
    def parameters(self):
        """Ordered mapping name -> Parameter, as CPython's is.  A plain dict:
        Grail dicts preserve insertion order, which is all the ordering
        guarantee callers rely on."""
        out = {}
        for p in self._params:
            out[p.name] = p
        return out

    def _rendered_parts(self):
        """The parameter list as CPython renders it, ONE ENTRY PER ELEMENT --
        the ``/`` and bare ``*`` separators included as entries of their own.

        Split out of __str__ because format(max_width=...) puts one parameter
        per LINE when the single-line form is too long, and that needs the
        parts rather than the joined string."""

        rendered = []
        prev_kind = None
        for p in self._params:
            if (prev_kind is Parameter.POSITIONAL_ONLY
                    and p.kind is not Parameter.POSITIONAL_ONLY):
                rendered.append('/')
            if (p.kind is Parameter.KEYWORD_ONLY
                    and prev_kind is not Parameter.KEYWORD_ONLY
                    and prev_kind is not Parameter.VAR_POSITIONAL):
                rendered.append('*')

            text = p.name
            if p.kind is Parameter.VAR_POSITIONAL:
                text = '*' + text
            elif p.kind is Parameter.VAR_KEYWORD:
                text = '**' + text

            annotated = p.annotation is not Parameter.empty
            if annotated:
                text = text + ': ' + formatannotation(p.annotation)
            if p.default is not Parameter.empty:
                text = text + (' = ' if annotated else '=') + repr(p.default)
            rendered.append(text)
            prev_kind = p.kind

        if prev_kind is Parameter.POSITIONAL_ONLY:
            rendered.append('/')
        return rendered

    def __str__(self):
        """Render as CPython does: ``(a, /, b, c=True)``, with ``/`` closing
        the positional-only group, a bare ``*`` opening keyword-only
        parameters when there is no ``*args``, ``x: int = 5`` (spaces) when a
        parameter is annotated but ``x=5`` when it is not, and a trailing
        ``-> ann``."""
        if self._text is not None:
            return self._text
        out = '(' + ', '.join(self._rendered_parts()) + ')'
        if self.return_annotation is not Parameter.empty:
            out = out + ' -> ' + formatannotation(self.return_annotation)
        return out

    def format(self, *, max_width=None, quote_annotation_strings=True):
        """CPython 3.13+'s Signature.format -- str(self), except that a
        rendering longer than *max_width* is broken one parameter per line.

        pydoc is the caller that matters: TextDoc.docclass renders a class's
        call signature with ``signature.format(max_width=..., ...)'' and had
        nothing to call, so documenting ANY class raised AttributeError --
        swallowed by Doc.document's ``except AttributeError: pass'', which then
        described the class as though it were a plain value
        (``Color = <enum 'Color'>'').

        *quote_annotation_strings* is accepted and ignored: it asks for a string
        annotation to be rendered WITHOUT its quotes, and Grail's
        formatannotation has no such mode.  Ignoring it renders a string
        annotation quoted, which is what this module already did everywhere
        else -- consistent, and wrong only for a signature built with the
        STRING annotation format, which Grail does not produce.
        """

        if self._text is not None:
            return self._text
        parts = self._rendered_parts()
        rendered = '(' + ', '.join(parts) + ')'
        if max_width is not None and len(rendered) > max_width:
            rendered = '(\n    ' + ',\n    '.join(parts) + '\n)'
        if self.return_annotation is not Parameter.empty:
            rendered = rendered + ' -> ' + formatannotation(self.return_annotation)
        return rendered

    def __repr__(self):
        return '<Signature ' + self.__str__() + '>'

    def __eq__(self, other):
        """Compare by PARAMETERS and return annotation, as CPython does, so a
        signature built by hand compares equal to an introspected one.  Without
        it the comparison was by identity and always False.

        A text-only signature has no parameter list to compare, so it falls
        back to comparing what it renders as -- which is the only thing it
        knows about itself."""
        if not isinstance(other, Signature):
            return NotImplemented
        if self._text is not None or other._text is not None:
            return str(self) == str(other)
        return (self._params == other._params
                and self.return_annotation == other.return_annotation)

    def __ne__(self, other):
        result = self.__eq__(other)
        if result is NotImplemented:
            return result
        return not result

    def __hash__(self):
        return hash(str(self))

    def bind(self, *args, **kwargs):
        return _BoundArguments()

    def bind_partial(self, *args, **kwargs):
        return _BoundArguments()


# The old private name, kept because Grail code and third-party call sites
# both reference it.
_Signature = Signature


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


FrameInfo = _namedtuple(
    'FrameInfo', 'frame filename lineno function code_context index')


def getouterframes(frame, context=1):
    """The frame and all its callers, innermost first, as FrameInfo records.

    GRAIL: ``code_context`` and ``index`` are always None.  Both require
    reading the SOURCE LINE around the frame, and Grail's frames carry a
    filename and a line number but no source loader for arbitrary
    generated code -- getsource() is a stub for the same reason.  A
    caller that only wants to know WHERE it is (the common case, and the
    whole of ``[f[3] for f in inspect.stack()]``) is fully served; one
    that wants to print the line is not, and gets None rather than a
    plausible wrong line.
    """
    out = []
    f = frame
    # A frame chain is finite, but a bug that made it circular would hang
    # the interpreter inside a debugger, which is the worst possible place
    # for it -- so bound the walk the way sys.setrecursionlimit does.
    for _ in range(1000):
        if f is None:
            break
        code = getattr(f, 'f_code', None)
        out.append(FrameInfo(
            f,
            getattr(code, 'co_filename', '<grail>'),
            getattr(f, 'f_lineno', 0),
            getattr(code, 'co_name', '<unknown>'),
            None,
            None))
        f = getattr(f, 'f_back', None)
    return out


def stack(context=1):
    """The caller's stack, innermost first -- CPython's inspect.stack().

    Used as a debugger would: ``[f[3] for f in inspect.stack()]`` names the
    functions in flight.  Grail reconstructs the frames from the VM
    (sys._getframe), including across the process boundary at every
    ``yield from``, so a delegating generator is visible here exactly as it
    is in CPython -- test_yield_from's test_delegator_is_visible_to_debugger.

    GRAIL: a MODULE BODY is not a frame, so the '<module>' entry CPython
    ends its stack with is absent here.  That is the same gap sys._getframe
    has (a module-level _getframe(0) reports the stack is not deep enough)
    and is not specific to this function.
    """
    try:
        frame = _sys._getframe(1)
    except BaseException:
        return []
    return getouterframes(frame, context)


def currentframe():
    """The CALLER's frame, as CPython's inspect.currentframe() answers.

    Was a hardcoded None, which reads as "there is no frame" rather than
    "frames are not supported" -- and callers branch on it silently.
    """
    try:
        return _sys._getframe(1)
    except BaseException:
        return None


def getattr_static(obj, name, default=None):
    """``inspect.getattr_static(obj, name)`` — CPython's
    descriptor-bypassing attribute lookup.  Grail has no descriptor
    machinery and getattr() already returns the underlying value
    rather than running descriptors, so the stub just delegates to
    builtin ``getattr`` with the same default-fallback semantics."""
    try:
        return getattr(obj, name)
    except AttributeError:
        return default


def cleandoc(doc):
    """``inspect.cleandoc(doc)'' — strip common leading whitespace
    from a multi-line docstring.  CPython's implementation walks
    each line, finds the minimum indent (excluding the first line),
    and removes that prefix from every subsequent line.  Empty
    docs pass through as ''."""
    if not doc:
        return ''
    # textwrap.dedent-style normalization, simplified for the
    # werkzeug docstring path.
    lines = doc.expandtabs().split('\n')
    # First line: only strip leading whitespace if it's all blank.
    if lines:
        lines[0] = lines[0].lstrip()
    # Find minimum indent of non-blank subsequent lines.
    min_indent = None
    for line in lines[1:]:
        stripped = line.lstrip()
        if stripped:
            indent = len(line) - len(stripped)
            if min_indent is None or indent < min_indent:
                min_indent = indent
    if min_indent:
        for i in range(1, len(lines)):
            if lines[i].strip():
                lines[i] = lines[i][min_indent:]
            else:
                lines[i] = ''
    # Strip leading/trailing blank lines.
    while lines and not lines[0].strip():
        lines = lines[1:]
    while lines and not lines[-1].strip():
        lines = lines[:-1]
    return '\n'.join(lines)


def unwrap(func, *, stop=None):
    """Follow the __wrapped__ chain (functools.wraps leaves it);
    Grail's wraps stub doesn't set __wrapped__, so this is usually
    the identity."""
    seen = set()
    while True:
        wrapped = getattr(func, "__wrapped__", None)
        if wrapped is None:
            return func
        if stop is not None and stop(func):
            return func
        marker = id(wrapped)
        if marker in seen:
            raise ValueError("wrapper loop when unwrapping {!r}".format(func))
        seen.add(marker)
        func = wrapped


def getmodule(object, _filename=None):
    """Return the module an object was defined in, or None if not found.

    Was a stub answering None, which is a defensible answer for the parts of
    CPython's version that walk source files -- Grail has no source-line cache
    to consult -- but not for the part that simply reads __module__ and looks
    it up in sys.modules.  pydoc's first line of output is built from this:
    ``Help on class Color in module test.test_enum'' loses everything after
    ``Color'' when it answers None.

    CPython also falls back to matching the object's FILE against every loaded
    module's file, for objects whose __module__ is wrong or missing.  That path
    needs getabsfile of a real source file and is not reproduced -- Grail's
    getfile is itself a stub -- so an object with no usable __module__ answers
    None here, as it did before.
    """

    if ismodule(object):
        return object
    modname = getattr(object, '__module__', None)
    if modname is not None:
        try:
            return _sys.modules.get(modname)
        except (TypeError, AttributeError):
            return None
    return None


def getdoc(obj):
    doc = getattr(obj, "__doc__", None)
    if isinstance(doc, str):
        return cleandoc(doc)
    return None


def getmro(cls):
    """The class's __mro__ as a tuple -- CPython's inspect.getmro."""
    try:
        return tuple(cls.__mro__)
    except AttributeError:
        return (cls,)


def getmembers(obj, predicate=None):
    """Return (name, value) pairs from dir(obj), optionally filtered.

    CPython's version does two things beyond walking ``dir()``, and both exist
    for attributes ``dir()`` alone cannot reach:

    * a name that ``dir()`` offers but ``getattr()`` refuses is looked up in the
      MRO's ``__dict__``s rather than dropped.  A descriptor may decline to
      produce a value while still being a real member -- CPython's comment is
      "some descriptors don't return meaningful values and are only implemented
      for the sake of __dir__".

    * every ``DynamicClassAttribute`` in a base's ``__dict__`` is ADDED to the
      candidate names.  Such a descriptor deliberately hides itself from the
      class (it routes class access to the metaclass) so ``dir()`` never offers
      it -- ``Enum.name`` and ``Enum.value`` are the canonical pair, which is
      why ``inspect.getmembers(SomeEnum)`` reports them in CPython.

    Grail did neither, so a class attribute reachable only through those two
    paths was simply absent.
    """
    # Imported here, not at module scope: types reaches enum for
    # DynamicClassAttribute, and inspect is imported early enough that the
    # module-level cycle bites.
    import types

    is_class = isinstance(obj, type)
    mro = ((obj,) + tuple(getmro(obj))) if is_class else ()
    names = list(dir(obj))
    # DynamicClassAttributes hide from dir(), so collect them off the bases.
    try:
        for base in obj.__bases__:
            for k, v in base.__dict__.items():
                if isinstance(v, types.DynamicClassAttribute):
                    names.append(k)
    except AttributeError:
        pass
    results = []
    processed = set()
    for name in names:
        try:
            value = getattr(obj, name)
            # A name reached twice (dir() and the sweep above) takes the
            # __dict__ route, so the descriptor itself is reported.
            if name in processed:
                raise AttributeError(name)
        except AttributeError:
            for base in mro:
                try:
                    d = base.__dict__
                except AttributeError:
                    continue
                if name in d:
                    value = d[name]
                    break
            else:
                # A missing slot, or a __dir__ offering a name nothing backs.
                continue
        if predicate is None or predicate(value):
            results.append((name, value))
        processed.add(name)
    results.sort(key=lambda pair: pair[0])
    return results


# Imported HERE rather than at module scope, and the reason is the same one
# getmembers records for ``types'': inspect is imported early, and a
# module-level import of collections makes the cycle bite.  A module-level
# ``Attribute = namedtuple(...)'' would need collections at import time, so the
# class is built on first use and cached.
_Attribute = None


def _attribute_class():
    global _Attribute
    if _Attribute is None:
        from collections import namedtuple
        _Attribute = namedtuple(
            'Attribute', 'name kind defining_class object')
    return _Attribute


class _AttributeFactory:
    """``inspect.Attribute`` -- a namedtuple, built on first use.

    ``from inspect import Attribute`` has to give something importable at
    module-import time, and isinstance/equality have to behave as the real
    namedtuple's, so this forwards both construction and instance checks to it.
    """

    def __call__(self, *args, **kwargs):
        return _attribute_class()(*args, **kwargs)

    def __instancecheck__(self, obj):
        return isinstance(obj, _attribute_class())


Attribute = _AttributeFactory()


def classify_class_attrs(cls):
    """Return a list of Attribute(name, kind, defining_class, object) tuples.

    Ported from CPython rather than approximated, because every part of it is
    load-bearing for the one question it answers -- WHERE did this attribute
    come from, and what KIND is it:

    * the search covers the metaclass MRO as well as the class MRO, so an
      attribute stored on the metaclass reports that metaclass as its home
      rather than None.  ``EnumType.__members__`` is the example that matters:
      it is a property on the metaclass, not on the enum.
    * ``kind`` is read off the __dict__ entry, not off the getattr result,
      because the two differ exactly where the answer is interesting -- a
      staticmethod reached through getattr is a plain function, and a
      classmethod is a bound method.  CPython's comment: "Static and class
      methods are dramatic examples."
    * DynamicClassAttributes are appended to the candidate names, for the same
      reason getmembers does it: they hide from dir(), so nothing else offers
      them.  Enum.name and Enum.value are the pair this exists for.

    Grail did not have this at all, so ``from inspect import Attribute`` was an
    ImportError and test_enum's TestStdLib.test_inspect_classify_class_attrs
    never ran a line of its body.

    Two CPython types are consulted through getattr rather than named directly:
    BuiltinMethodType and ClassMethodDescriptorType are how CPython recognises
    a C-level static or class method, and Grail's types module may not define
    either.  Absent, the isinstance test simply never matches those, which is
    right -- Grail has no C-level descriptors to find.
    """

    import types

    mro = getmro(cls)
    # CPython takes ``getmro(type(cls))`` and drops type and object, leaving the
    # metaclasses that actually define things -- for an enum, exactly
    # (EnumType,).  Taken literally here that walks into GemStone's own
    # metaclass chain (Class, Metaclass3, Module, Behavior), whose __dict__s and
    # __getattr__ are not Python objects at all and blow up on contact.
    #
    # The metaclasses of the classes in the MRO are the same set for everything
    # Grail can model, and are reachable without leaving Python: type(Color) and
    # type(Enum) are both EnumType, type(object) is type, and type is dropped --
    # so this yields (EnumType,) exactly as upstream.  It does NOT reproduce a
    # metaclass HIERARCHY (``class MetaB(MetaA)`` would contribute only MetaB),
    # which is fair here because Grail does not model one: see
    # object >> ___pyMetaclass___.
    metamro = []
    for _c in (cls,) + tuple(mro):
        _m = type(_c)
        if _m is not type and _m is not object and _m not in metamro:
            metamro.append(_m)
    metamro = tuple(metamro)
    class_bases = (cls,) + mro
    all_bases = class_bases + metamro
    names = list(dir(cls))
    for base in mro:
        try:
            items = base.__dict__.items()
        except AttributeError:
            continue
        for k, v in items:
            if isinstance(v, types.DynamicClassAttribute) and v.fget is not None:
                names.append(k)

    _builtin_method = getattr(types, 'BuiltinMethodType', None)
    _classmethod_descr = getattr(types, 'ClassMethodDescriptorType', None)
    static_kinds = tuple(
        k for k in (staticmethod, _builtin_method) if k is not None)
    class_kinds = tuple(
        k for k in (classmethod, _classmethod_descr) if k is not None)

    result = []
    processed = set()

    for name in names:
        homecls = None
        get_obj = None
        dict_obj = None
        if name not in processed:
            try:
                if name == '__dict__':
                    raise Exception("__dict__ is special, don't want the proxy")
                get_obj = getattr(cls, name)
            except Exception:
                pass
            else:
                homecls = getattr(get_obj, "__objclass__", homecls)
                if homecls not in class_bases:
                    homecls = None
                    last_cls = None
                    for srch_cls in class_bases:
                        srch_obj = getattr(srch_cls, name, None)
                        if srch_obj is get_obj:
                            last_cls = srch_cls
                    for srch_cls in metamro:
                        # CPython asks the metaclass's __getattr__ SLOT here,
                        # unbound, as ``srch_cls.__getattr__(cls, name)''.
                        # That call is not available in Grail: a metaclass is
                        # an ordinary class object, so ``__getattr__'' comes
                        # back BOUND and the two arguments arrive one too many
                        # -- the name parameter binds to the class, and the
                        # mismatch dies inside the attribute path as a
                        # MessageNotUnderstood that Python cannot catch.
                        #
                        # A plain getattr on the metaclass asks the same
                        # question -- does the attribute live here? -- and is
                        # what a metaclass attribute looks like from Python.
                        # It is narrower than CPython's, which deliberately
                        # uses the __getattr__ HOOK to catch attributes a
                        # metaclass computes rather than stores; Grail has no
                        # such metaclass to ask.
                        srch_obj = getattr(srch_cls, name, None)
                        if srch_obj is get_obj:
                            last_cls = srch_cls
                    if last_cls is not None:
                        homecls = last_cls
        for base in all_bases:
            try:
                d = base.__dict__
            except AttributeError:
                continue
            if name in d:
                dict_obj = d[name]
                if homecls not in metamro:
                    homecls = base
                break
        if homecls is None:
            continue
        obj = get_obj if get_obj is not None else dict_obj
        if static_kinds and isinstance(dict_obj, static_kinds):
            kind = "static method"
            obj = dict_obj
        elif class_kinds and isinstance(dict_obj, class_kinds):
            kind = "class method"
            obj = dict_obj
        elif isinstance(dict_obj, property):
            kind = "property"
            obj = dict_obj
        elif isroutine(obj):
            kind = "method"
        else:
            kind = "data"
        result.append(_attribute_class()(name, kind, homecls, obj))
        processed.add(name)
    return result


def isdatadescriptor(object):
    """Return true if the object is a data descriptor.

    CPython's own two-line test, verbatim: a data descriptor is anything whose
    TYPE implements __set__ or __delete__, with classes / methods / functions
    excluded up front so the categories stay mutually exclusive.

    This was ``return False'' -- a stub, and one that read as harmless because
    the honest answer for most objects IS False.  It is not harmless where the
    caller uses it to CLASSIFY rather than to guard.  pydoc.classify_class_attrs
    turns a data descriptor into kind 'data descriptor', and a property with no
    setter into 'readonly property'; with the stub, every property kept the kind
    'property', which pydoc's docclass has no section for.  The attribute was
    then left unconsumed by all six spill passes and docclass died on its own
    ``assert attrs == []'' -- for any class with a property, which for enums is
    every one of them (EnumType.__members__).

    Grail's property and enum.property both implement __set__ and __delete__
    (they share an abstract base), so the real test answers correctly for either
    without a special case.
    """
    if isclass(object) or ismethod(object) or isfunction(object):
        # mutual exclusion
        return False
    tp = type(object)
    return hasattr(tp, "__set__") or hasattr(tp, "__delete__")


def ismethoddescriptor(obj):
    # STILL A STUB, deliberately, unlike isdatadescriptor above.  CPython's test
    # is ``hasattr(type(obj), "__get__") and not hasattr(type(obj), "__set__")'',
    # which in Grail would answer True for every UnboundMethod and BoundMethod --
    # both are reached through a __get__ -- and so would reroute pydoc.docroutine
    # and pydoc.render_doc for every ordinary method in the corpus.  Nothing
    # measured needs it, so it keeps the conservative answer until something does.
    return False


def isabstract(obj):
    return False


# Public name: `from inspect import Signature` (test_functools) -- the
# stub class doubles as the public type.
Signature = _Signature


# --- Object-kind predicates ------------------------------------------------------------
#
# Ported because pydoc asks all of them.  Each is CPython's one-line isinstance
# test against the corresponding types.* entry, and Grail's types module already
# defines every one -- so these were missing rather than unimplementable, and
# ``inspect.ismodule'' being absent is what stopped pydoc.Helper on its first
# call.
#
# The types module is imported inside each function, as the rest of this module
# does: inspect is imported early enough in the bootstrap that a module-level
# import of it makes the cycle bite.


def ismodule(object):
    """Return true if the object is a module."""
    import types
    return isinstance(object, types.ModuleType)


def iscode(object):
    """Return true if the object is a code object."""
    import types
    return isinstance(object, types.CodeType)


def isframe(object):
    """Return true if the object is a frame object."""
    import types
    return isinstance(object, types.FrameType)


def istraceback(object):
    """Return true if the object is a traceback."""
    import types
    return isinstance(object, types.TracebackType)


def isgetsetdescriptor(object):
    """Return true if the object is a getset descriptor."""
    import types
    return isinstance(object, types.GetSetDescriptorType)


def ismemberdescriptor(object):
    """Return true if the object is a member descriptor."""
    import types
    return isinstance(object, types.MemberDescriptorType)


def ismethodwrapper(object):
    """Return true if the object is a method wrapper."""
    import types
    return isinstance(object, types.MethodWrapperType)


# --- Source location -------------------------------------------------------------------


def getsourcefile(object):
    """Return the filename of the source file the object was defined in.

    Grail's getfile is a stub, so this answers None for everything rather than
    inventing a path.  Present because getabsfile and CPython's getmodule both
    reach for it, and a caller asking "is there source for this?" deserves a
    truthful no.
    """

    filename = getfile(object)
    if not filename or filename.startswith('<') and filename.endswith('>'):
        return None
    return filename


def getabsfile(object, _filename=None):
    """Return an absolute, normalised path to the object's source file."""

    import os
    if _filename is None:
        _filename = getsourcefile(object) or getfile(object)
    if not _filename:
        return _filename
    return os.path.normcase(os.path.abspath(_filename))


def getcomments(object):
    """Return the comments immediately preceding an object's source, or None.

    Reading them needs the source, which Grail's getsource does not provide, so
    this answers None -- which is exactly what CPython answers for an object
    whose source cannot be found, and what pydoc is written to handle.
    """

    return None


# --- Class hierarchies -----------------------------------------------------------------


def walktree(classes, children, parent):
    """Recursive helper for getclasstree()."""

    results = []
    classes = sorted(classes, key=lambda c: (getattr(c, '__module__', ''),
                                             getattr(c, '__name__', '')))
    for c in classes:
        results.append((c, c.__bases__))
        if c in children:
            results.append(walktree(children[c], children, c))
    return results


def getclasstree(classes, unique=False):
    """Arrange the given list of classes into a hierarchy of nested lists.

    Where a nested list appears, it contains classes derived from the class
    whose entry immediately precedes the list.  Each entry is a 2-tuple
    containing a class and a tuple of its base classes.  If the `unique'
    argument is true, exactly one entry appears in the returned structure
    for each class in the given list.  Otherwise, classes using multiple
    inheritance and their descendants will appear multiple times.

    A faithful port; ``sorted'' replaces CPython's in-place
    ``classes.sort(key=attrgetter(...))'' so the caller's list is not
    reordered as a side effect and no operator import is needed.
    """

    children = {}
    roots = []
    for c in classes:
        if c.__bases__:
            for parent in c.__bases__:
                if parent not in children:
                    children[parent] = []
                if c not in children[parent]:
                    children[parent].append(c)
                if unique and parent in classes:
                    break
        elif c not in roots:
            roots.append(c)
    for parent in children:
        if parent not in classes:
            roots.append(parent)
    return walktree(roots, children, None)
