"""Helpers for introspecting and wrapping annotations.

GRAIL: CPython 3.14's annotationlib, ported onto Grail's annotate functions.

Everything here follows CPython's logic except the one mechanism Grail cannot
host.  CPython's compiler-generated ``__annotate__`` supports only VALUE, and
annotationlib obtains STRING and FORWARDREF by RE-RUNNING that function's code
object against fake globals whose every name lookup answers a ``_Stringifier``
-- ``types.FunctionType(annotate.__code__, fake_globals, closure=...)``,
followed by ``ast.unparse`` of what the stringifiers recorded.  Grail compiles
Python to Smalltalk methods and keeps no bytecode to rebind, and its ``ast``
module is a stub, so neither half exists here.

It does not need to for the common case.  Grail's generated annotate functions
answer all three formats NATIVELY: FunctionDefAst / ClassDefAst / ModuleAst
hand each annotation to ``PyAnnotate >> ___annotationValue___:source:format:``
as a block to evaluate plus its source text, so STRING is the text and
FORWARDREF evaluates per key, marking the keys that raised NameError.
call_annotate_function's FIRST step -- call ``annotate(format)`` directly -- is
therefore the whole story for them, exactly as it is in CPython for an
annotate function that implements the format itself.  Only a HAND-WRITTEN
annotate function that raises NotImplementedError would reach the fake-globals
path; there Grail calls it with VALUE_WITH_FAKE_GLOBALS against its REAL
globals, then falls back to VALUE, as CPython itself does.

The _Stringifier half IS ported, at the source level (see the section that
defines it): ForwardRef.evaluate(format=FORWARDREF) partially evaluates a
reference as CPython's does, and a FORWARDREF annotation that fails to
evaluate is partially evaluated from its source text, so ``set[undefined]``
comes back as ``set[ForwardRef('undefined')]``.  What it cannot see is an
enclosing function's locals, which CPython reads from closure cells; each
generated ForwardRef carries the annotation's own block instead, so a later
evaluate() still finds a variable bound after the def.
"""

import builtins
import enum
import keyword
import sys
import types

__all__ = [
    "Format",
    "ForwardRef",
    "call_annotate_function",
    "call_evaluate_function",
    "get_annotate_from_class_namespace",
    "get_annotations",
    "annotations_to_string",
    "type_repr",
]


class Format(enum.IntEnum):
    VALUE = 1
    VALUE_WITH_FAKE_GLOBALS = 2
    FORWARDREF = 3
    STRING = 4


_sentinel = object()


def _builtins():
    """The SESSION's builtins module, read at call time.

    GRAIL: annotationlib is deployed persistently (the framework deploy imports
    it through inspect), and a module-global ``builtins'' then holds the builtins
    instance of the session that DEPLOYED it.  Reads of real builtins still work
    through that object, but a rebinding in this session -- ``builtins.int =
    dict'', which test_name_lookup_without_eval makes -- is invisible to it.
    sys.modules is the session's own registry even through a deployed ``sys''.
    """
    return sys.modules["builtins"]
# Following `NAME_ERROR_MSG` in `ceval_macros.h`:
_NAME_ERROR_MSG = "name '{name:.200}' is not defined"

# The marker PyAnnotate >> ___annotationValue___:source:format: substitutes, under
# FORWARDREF, for an annotation that raised NameError.  Grail-internal: it
# exists only between a generated annotate function and call_annotate_function,
# which turns each one into a ForwardRef before any of it is visible to Python.
_FORWARDREF_MARKER = '__grail_forwardref__'


def _is_forwardref_marker(value):
    """True for the marker tuple a generated annotate function answers:
    (marker, source) or (marker, source, evaluator).

    Checked by shape rather than isinstance, so a genuine string or tuple
    annotation is never mistaken for one -- the first element has to be the
    private marker string.
    """
    return (isinstance(value, tuple) and len(value) in (2, 3)
            and value[0] == _FORWARDREF_MARKER)


def _forwardref_from_marker(marker, owner):
    """The ForwardRef a marker stands for.

    GRAIL: the marker's third element, when present, is the annotation's own
    zero-argument block, which evaluates the expression in the scope it was
    written in.  It plays the part of CPython's ``__cell__``: CPython keeps the
    closure cells the expression reads, so a variable assigned AFTER the def
    (test_closure's ``x = 1``) resolves on a later evaluate().  A Grail block
    already shares that scope, so it is kept whole instead of per cell.
    """
    return _forwardref_value(
        marker[1], owner, marker[2] if len(marker) == 3 else None)


# CPython's slot names, in CPython's order.  They are read as an API --
# ``"__forward_is_class__" in typing.ForwardRef.__slots__'' is how
# typing_extensions and pydantic_core version-detect this class -- and
# Grail ENFORCES a __slots__ declaration, so every attribute this class
# stores must be listed.
_SLOTS = (
    "__forward_is_argument__",
    "__forward_is_class__",
    "__forward_module__",
    "__weakref__",
    "__arg__",
    "__globals__",
    "__extra_names__",
    "__code__",
    "__ast_node__",
    "__cell__",
    "__owner__",
    "__stringifier_dict__",
    "__resolved_str_cache__",
    # GRAIL: the source annotation's own block -- see _forwardref_from_marker.
    # Not part of equality or hashing, as __cell__ is: two reads of one
    # annotation build two blocks for the same expression.
    "__grail_evaluator__",
)


class ForwardRef:
    """Wrapper that holds a forward reference.

    Constructor arguments:
    * arg: a string representing the code to be evaluated.
    * module: the module where the forward reference was created.
      Must be a string, not a module object.
    * owner: The owning object (module, class, or function).
    * is_argument: Does nothing, retained for compatibility.
    * is_class: True if the forward reference was created in class scope.

    """

    __slots__ = _SLOTS

    def __init__(
        self,
        arg,
        *,
        module=None,
        owner=None,
        is_argument=True,
        is_class=False,
    ):
        if not isinstance(arg, str):
            raise TypeError(f"Forward reference must be a string -- got {arg!r}")

        self.__arg__ = arg
        self.__forward_is_argument__ = is_argument
        self.__forward_is_class__ = is_class
        self.__forward_module__ = module
        self.__owner__ = owner
        # These are always set to None here but may be non-None if a ForwardRef
        # is created through __class__ assignment on a _Stringifier object.
        self.__globals__ = None
        # This may be either a cell object (for a ForwardRef referring to a single variable)
        # or a dict mapping cell names to cell objects (for a ForwardRef containing references
        # to multiple variables).
        self.__cell__ = None
        self.__extra_names__ = None
        # These are initially None but serve as a cache and may be set to a non-None
        # value later.
        self.__code__ = None
        self.__ast_node__ = None
        self.__resolved_str_cache__ = None
        self.__grail_evaluator__ = None

    def __init_subclass__(cls, /, *args, **kwds):
        raise TypeError("Cannot subclass ForwardRef")

    def evaluate(
        self,
        *,
        globals=None,
        locals=None,
        type_params=None,
        owner=None,
        format=Format.VALUE,
    ):
        """Evaluate the forward reference and return the value.

        If the forward reference cannot be evaluated, raise an exception.
        """
        match format:
            case Format.STRING:
                return self.__resolved_str__
            case Format.VALUE:
                is_forwardref_format = False
            case Format.FORWARDREF:
                is_forwardref_format = True
            case _:
                raise NotImplementedError(format)
        if isinstance(self.__cell__, types.CellType):
            try:
                return self.__cell__.cell_contents
            except ValueError:
                pass
        # GRAIL: the __cell__ check above, for the evaluator a generated annotate
        # function hands over (_forwardref_from_marker).  A NameError means the
        # name is still unbound where it was written; fall through to the
        # string evaluation, which reports it with CPython's message.
        if self.__grail_evaluator__ is not None:
            try:
                return self.__grail_evaluator__()
            except NameError:
                pass
            except Exception:
                # Resolvable, but failing: what evaluating the string would do.
                if is_forwardref_format:
                    return self
                raise
        if owner is None:
            owner = self.__owner__

        if globals is None and self.__forward_module__ is not None:
            globals = getattr(
                sys.modules.get(self.__forward_module__, None), "__dict__", None
            )
        if globals is None:
            globals = self.__globals__
        if globals is None:
            if isinstance(owner, type):
                module_name = getattr(owner, "__module__", None)
                if module_name:
                    module = sys.modules.get(module_name, None)
                    if module:
                        globals = getattr(module, "__dict__", None)
            elif isinstance(owner, types.ModuleType):
                globals = getattr(owner, "__dict__", None)
            elif callable(owner):
                globals = getattr(owner, "__globals__", None)

        # If we pass None to eval() below, the globals of this module are used.
        if globals is None:
            globals = {}

        if type_params is None and owner is not None:
            type_params = getattr(owner, "__type_params__", None)

        if locals is None:
            locals = {}
            if isinstance(owner, type):
                locals.update(vars(owner))
        elif (
            type_params is not None
            or isinstance(self.__cell__, dict)
            or self.__extra_names__
        ):
            # Create a new locals dict if necessary,
            # to avoid mutating the argument.
            locals = dict(locals)

        # "Inject" type parameters into the local namespace
        # (unless they are shadowed by assignments *in* the local namespace),
        # as a way of emulating annotation scopes when calling `eval()`
        if type_params is not None:
            for param in type_params:
                locals.setdefault(param.__name__, param)

        # Similar logic can be used for nonlocals, which should not
        # override locals.
        if isinstance(self.__cell__, dict):
            for cell_name, cell in self.__cell__.items():
                try:
                    cell_value = cell.cell_contents
                except ValueError:
                    pass
                else:
                    locals.setdefault(cell_name, cell_value)

        if self.__extra_names__:
            locals.update(self.__extra_names__)

        arg = self.__forward_arg__
        if arg.isidentifier() and not keyword.iskeyword(arg):
            if arg in locals:
                return locals[arg]
            elif arg in globals:
                return globals[arg]
            elif hasattr(_builtins(), arg):
                return getattr(_builtins(), arg)
            elif is_forwardref_format:
                return self
            else:
                raise NameError(_NAME_ERROR_MSG.format(name=arg), name=arg)
        else:
            code = self.__forward_code__
            try:
                return eval(code, globals, locals)
            except Exception:
                if not is_forwardref_format:
                    raise
            # All variables, in scoping order, should be checked before
            # triggering __missing__ to create a _Stringifier.
            new_locals = _StringifierDict(
                {**_builtins().__dict__, **globals, **locals},
                globals=globals,
                owner=owner,
                is_class=self.__forward_is_class__,
                format=format,
            )
            try:
                result = eval(code, _stringifier_namespace(
                    self.__forward_arg__, new_locals, new_locals))
            except Exception:
                return self
            else:
                new_locals.transmogrify(self.__cell__)
                return result

    def _evaluate(self, globalns, localns, type_params=_sentinel, *,
                  recursive_guard=frozenset()):
        """The old, private spelling of ``evaluate``.

        GRAIL: kept as Grail's long-standing behaviour, which
        StdlibLongTailTestCase pins -- an unresolvable reference answers its
        own SOURCE TEXT rather than raising.  CPython 3.14 routes this through
        typing.evaluate_forward_ref with a deprecation warning; libraries call
        the private method introspectively, and guessing an object would be
        worse than answering the text.
        """
        if type_params is _sentinel:
            type_params = None
        try:
            return self.evaluate(globals=globalns, locals=localns,
                                 type_params=type_params)
        except NameError:
            return self.__forward_arg__

    @property
    def __forward_arg__(self):
        if self.__arg__ is not None:
            return self.__arg__
        raise AssertionError(
            "Attempted to access '__forward_arg__' on an uninitialized ForwardRef"
        )

    @property
    def __resolved_str__(self):
        # __forward_arg__ with any names from __extra_names__ replaced with the
        # type_repr of the value they represent.  GRAIL: by text rather than by
        # an ast visitor -- each name is a unique ``__annotationlib_name_N__''
        # the stringifier minted, so it cannot collide with anything else.
        if self.__resolved_str_cache__ is None:
            resolved_str = self.__forward_arg__
            names = self.__extra_names__
            if names:
                for name, value in names.items():
                    resolved_str = resolved_str.replace(name, type_repr(value))
            self.__resolved_str_cache__ = resolved_str
        return self.__resolved_str_cache__

    @property
    def __forward_code__(self):
        if self.__code__ is not None:
            return self.__code__
        arg = self.__forward_arg__
        try:
            self.__code__ = compile(_rewrite_star_unpack(arg), "<string>", "eval")
        except SyntaxError:
            raise SyntaxError(f"Forward reference must be an expression -- got {arg!r}")
        return self.__code__

    def __eq__(self, other):
        if not isinstance(other, ForwardRef):
            return NotImplemented
        return (
            self.__forward_arg__ == other.__forward_arg__
            and self.__forward_module__ == other.__forward_module__
            # Use "is" here because we use id() for this in __hash__
            # because dictionaries are not hashable.
            and self.__globals__ is other.__globals__
            and self.__forward_is_class__ == other.__forward_is_class__
            # Two separate cells are always considered unequal in forward refs.
            and (
                {name: id(cell) for name, cell in self.__cell__.items()}
                == {name: id(cell) for name, cell in other.__cell__.items()}
                if isinstance(self.__cell__, dict) and isinstance(other.__cell__, dict)
                else self.__cell__ is other.__cell__
            )
            and self.__owner__ == other.__owner__
            and (
                (tuple(sorted(self.__extra_names__.items())) if self.__extra_names__ else None) ==
                (tuple(sorted(other.__extra_names__.items())) if other.__extra_names__ else None)
            )
        )

    def __hash__(self):
        return hash((
            self.__forward_arg__,
            self.__forward_module__,
            id(self.__globals__),  # dictionaries are not hashable, so hash by identity
            self.__forward_is_class__,
            (  # cells are not hashable as well
                tuple(sorted([(name, id(cell)) for name, cell in self.__cell__.items()]))
                if isinstance(self.__cell__, dict) else id(self.__cell__),
            ),
            self.__owner__,
            tuple(sorted(self.__extra_names__.items())) if self.__extra_names__ else None,
        ))

    def __or__(self, other):
        return types.UnionType[self, other]

    def __ror__(self, other):
        return types.UnionType[other, self]

    def __repr__(self):
        extra = []
        if self.__forward_module__ is not None:
            extra.append(f", module={self.__forward_module__!r}")
        if self.__forward_is_class__:
            extra.append(", is_class=True")
        if self.__owner__ is not None:
            extra.append(f", owner={self.__owner__!r}")
        return f"ForwardRef({self.__resolved_str__!r}{''.join(extra)})"


# ---------------------------------------------------------------------------
# The stringifier.
#
# CPython's _Stringifier is a proxy that records every operation applied to an
# undefined name, and _StringifierDict hands one out for each name it cannot
# find.  Evaluated against one, ``set[undefined]`` becomes ``set`` subscripted
# by a proxy -- and turning the proxies into ForwardRefs IN PLACE, by
# assigning ``__class__``, leaves ``set[ForwardRef('undefined')]``: a partial
# evaluation, structure kept, only the unresolvable parts deferred.
#
# GRAIL: ported for SOURCE TEXT rather than bytecode.  CPython builds ast nodes
# and ast.unparse's them; Grail's ast module is a stub, so each proxy carries
# its source as a _Src -- the text plus the precedence ast._Unparser would
# have given the node, which decides the parentheses when it becomes an
# operand.  The algebra is CPython's, operator by operator.  What it is fed
# differs: CPython re-runs the annotate function's code object with the proxy
# dict as its globals, which Grail cannot do; Grail evaluates the annotation's
# source text against it (ForwardRef.evaluate and _forwardref_value), so a
# name local to an ENCLOSING FUNCTION is not in the namespace and is deferred
# where CPython would read its closure cell.
# ---------------------------------------------------------------------------

# ast._Unparser's precedence, in its order.
_P_TUPLE, _P_TEST, _P_OR, _P_AND, _P_NOT, _P_CMP = 2, 4, 5, 6, 7, 8
_P_BOR, _P_BXOR, _P_BAND, _P_SHIFT, _P_ARITH, _P_TERM = 9, 10, 11, 12, 13, 14
_P_FACTOR, _P_POWER, _P_ATOM = 15, 16, 18


class _Src:
    """The source of one stringifier node: text and its precedence."""

    __slots__ = ("text", "prec")

    def __init__(self, text, prec=_P_ATOM):
        self.text = text
        self.prec = prec

    def at(self, prec):
        """The text, parenthesised if this node binds looser than prec."""
        if self.prec < prec:
            return "(" + self.text + ")"
        return self.text


def _const_src(value):
    # ast._Unparser writes a Constant as its repr; a negative number is a
    # unary minus to the precedence rules.
    text = "..." if value is ... else repr(value)
    if isinstance(value, (int, float, complex)) and text.startswith("-"):
        return _Src(text, _P_FACTOR)
    return _Src(text)


def _st_node(st):
    node = st.__ast_node__
    if isinstance(node, str):
        return _Src(node)
    return node


def _st_convert(st, other):
    """_Stringifier.__convert_to_ast: (source, extra_names) for an operand."""
    if isinstance(other, _Stringifier):
        return _st_node(other), other.__extra_names__
    template = _template_type()
    if template is not None and type(other) is template:
        return _Src(_template_repr(other)), None
    if (st.__stringifier_dict__.format == Format.STRING
            or other is None
            or type(other) in (str, int, float, bool, complex)):
        return _const_src(other), None
    if type(other) is dict:
        extra_names = {}
        items = []
        for key, value in other.items():
            k, extra = _st_convert(st, key)
            if extra is not None:
                extra_names.update(extra)
            v, extra = _st_convert(st, value)
            if extra is not None:
                extra_names.update(extra)
            items.append(k.at(_P_TEST) + ": " + v.at(_P_TEST))
        return _Src("{" + ", ".join(items) + "}"), extra_names
    if type(other) in (list, tuple, set):
        extra_names = {}
        elts = []
        for elt in other:
            e, extra = _st_convert(st, elt)
            if extra is not None:
                extra_names.update(extra)
            elts.append(e.at(_P_TEST))
        if type(other) is list:
            text = "[" + ", ".join(elts) + "]"
        elif type(other) is set:
            text = "{" + ", ".join(elts) + "}" if elts else "{*()}"
        elif len(elts) == 1:
            text = "(" + elts[0] + ",)"
        else:
            text = "(" + ", ".join(elts) + ")"
        return _Src(text), extra_names
    name = st.__stringifier_dict__.create_unique_name()
    return _Src(name), {name: other}


def _st_convert_getitem(st, other):
    if isinstance(other, slice):
        extra_names = {}

        def conv(obj):
            if obj is None:
                return ""
            new, extra = _st_convert(st, obj)
            if extra is not None:
                extra_names.update(extra)
            return new.at(_P_TEST)

        text = conv(other.start) + ":" + conv(other.stop)
        if other.step is not None:
            text += ":" + conv(other.step)
        return _Src(text), extra_names
    return _st_convert(st, other)


def _st_make_new(st, node, extra_names=None):
    new_extra_names = {}
    if st.__extra_names__ is not None:
        new_extra_names.update(st.__extra_names__)
    if extra_names is not None:
        new_extra_names.update(extra_names)
    stringifier = _Stringifier(
        node,
        st.__globals__,
        st.__owner__,
        st.__forward_is_class__,
        stringifier_dict=st.__stringifier_dict__,
        extra_names=new_extra_names or None,
    )
    st.__stringifier_dict__.stringifiers.append(stringifier)
    return stringifier


def _st_binop(st, other, glyph, prec, reflected=False):
    operand, extra_names = _st_convert(st, other)
    left, right = (operand, _st_node(st)) if reflected else (_st_node(st), operand)
    # POWER is right-associative, so its LEFT operand needs the tighter binding.
    if prec == _P_POWER:
        lp, rp = prec + 1, prec
    else:
        lp, rp = prec, prec + 1
    return _st_make_new(
        st, _Src(left.at(lp) + " " + glyph + " " + right.at(rp), prec), extra_names)


def _st_compare(st, other, glyph):
    operand, extra_names = _st_convert(st, other)
    text = _st_node(st).at(_P_BOR) + " " + glyph + " " + operand.at(_P_BOR)
    return _st_make_new(st, _Src(text, _P_CMP), extra_names)


def _st_unary(st, glyph):
    return _st_make_new(st, _Src(glyph + _st_node(st).at(_P_FACTOR), _P_FACTOR))


class _Stringifier:
    # Must match the slots on ForwardRef, so we can turn an instance of one into an
    # instance of the other in place.
    __slots__ = _SLOTS

    def __init__(
        self,
        node,
        globals=None,
        owner=None,
        is_class=False,
        cell=None,
        *,
        stringifier_dict,
        extra_names=None,
    ):
        # Either a _Src or a simple str (for the common case where a ForwardRef
        # represents a single name).
        self.__arg__ = None
        self.__forward_is_argument__ = False
        self.__forward_is_class__ = is_class
        self.__forward_module__ = None
        self.__code__ = None
        self.__ast_node__ = node
        self.__globals__ = globals
        self.__extra_names__ = extra_names
        self.__cell__ = cell
        self.__owner__ = owner
        self.__stringifier_dict__ = stringifier_dict
        self.__resolved_str_cache__ = None  # Needed for ForwardRef
        self.__grail_evaluator__ = None

    # Must implement this since we set __eq__. We hash by identity so that
    # stringifiers in dict keys are kept separate.
    def __hash__(self):
        return id(self)

    def __getitem__(self, other):
        # Special case, to avoid stringifying references to class-scoped variables
        # as '__classdict__["x"]'.
        if self.__ast_node__ == "__classdict__":
            raise KeyError
        if isinstance(other, tuple):
            extra_names = {}
            elts = []
            for elt in other:
                new_elt, new_extra = _st_convert_getitem(self, elt)
                if new_extra is not None:
                    extra_names.update(new_extra)
                elts.append(new_elt.at(_P_TEST))
            index = ", ".join(elts) + ("," if len(elts) == 1 else "")
            if not elts:
                index = "()"
        else:
            new_elt, extra_names = _st_convert_getitem(self, other)
            index = new_elt.text
        return _st_make_new(
            self, _Src(_st_node(self).at(_P_ATOM) + "[" + index + "]"), extra_names)

    def __getattr__(self, attr):
        # GRAIL: a ``___name___'' is Grail's own runtime probing an object, not
        # an operation the annotation applied; recording it would answer a
        # proxy where the runtime expects an absent attribute.
        if attr.startswith("___"):
            raise AttributeError(attr)
        base = _st_node(self)
        text = base.at(_P_ATOM)
        if base.prec == _P_ATOM and text[:1].isdigit() and text.isdigit():
            text += " "
        return _st_make_new(self, _Src(text + "." + attr))

    def __call__(self, *args, **kwargs):
        extra_names = {}
        parts = []
        for arg in args:
            new_arg, new_extra = _st_convert(self, arg)
            if new_extra is not None:
                extra_names.update(new_extra)
            parts.append(new_arg.at(_P_TEST))
        for key, value in kwargs.items():
            new_value, new_extra = _st_convert(self, value)
            if new_extra is not None:
                extra_names.update(new_extra)
            parts.append(key + "=" + new_value.at(_P_TEST))
        return _st_make_new(
            self, _Src(_st_node(self).at(_P_ATOM) + "(" + ", ".join(parts) + ")"),
            extra_names)

    def __iter__(self):
        yield _st_make_new(self, _Src("*" + _st_node(self).at(_P_BOR), _P_TEST))

    def __repr__(self):
        return _st_node(self).text

    def __format__(self, format_spec):
        raise TypeError("Cannot stringify annotation containing string formatting")

    def __add__(self, other): return _st_binop(self, other, "+", _P_ARITH)
    def __sub__(self, other): return _st_binop(self, other, "-", _P_ARITH)
    def __mul__(self, other): return _st_binop(self, other, "*", _P_TERM)
    def __matmul__(self, other): return _st_binop(self, other, "@", _P_TERM)
    def __truediv__(self, other): return _st_binop(self, other, "/", _P_TERM)
    def __mod__(self, other): return _st_binop(self, other, "%", _P_TERM)
    def __lshift__(self, other): return _st_binop(self, other, "<<", _P_SHIFT)
    def __rshift__(self, other): return _st_binop(self, other, ">>", _P_SHIFT)
    def __or__(self, other): return _st_binop(self, other, "|", _P_BOR)
    def __xor__(self, other): return _st_binop(self, other, "^", _P_BXOR)
    def __and__(self, other): return _st_binop(self, other, "&", _P_BAND)
    def __floordiv__(self, other): return _st_binop(self, other, "//", _P_TERM)
    def __pow__(self, other): return _st_binop(self, other, "**", _P_POWER)

    def __radd__(self, other): return _st_binop(self, other, "+", _P_ARITH, True)
    def __rsub__(self, other): return _st_binop(self, other, "-", _P_ARITH, True)
    def __rmul__(self, other): return _st_binop(self, other, "*", _P_TERM, True)
    def __rmatmul__(self, other): return _st_binop(self, other, "@", _P_TERM, True)
    def __rtruediv__(self, other): return _st_binop(self, other, "/", _P_TERM, True)
    def __rmod__(self, other): return _st_binop(self, other, "%", _P_TERM, True)
    def __rlshift__(self, other): return _st_binop(self, other, "<<", _P_SHIFT, True)
    def __rrshift__(self, other): return _st_binop(self, other, ">>", _P_SHIFT, True)
    def __ror__(self, other): return _st_binop(self, other, "|", _P_BOR, True)
    def __rxor__(self, other): return _st_binop(self, other, "^", _P_BXOR, True)
    def __rand__(self, other): return _st_binop(self, other, "&", _P_BAND, True)
    def __rfloordiv__(self, other): return _st_binop(self, other, "//", _P_TERM, True)
    def __rpow__(self, other): return _st_binop(self, other, "**", _P_POWER, True)

    def __lt__(self, other): return _st_compare(self, other, "<")
    def __le__(self, other): return _st_compare(self, other, "<=")
    def __eq__(self, other): return _st_compare(self, other, "==")
    def __ne__(self, other): return _st_compare(self, other, "!=")
    def __gt__(self, other): return _st_compare(self, other, ">")
    def __ge__(self, other): return _st_compare(self, other, ">=")

    def __invert__(self): return _st_unary(self, "~")
    def __pos__(self): return _st_unary(self, "+")
    def __neg__(self): return _st_unary(self, "-")


class _StringifierDict(dict):
    def __init__(self, namespace, *, globals=None, owner=None, is_class=False, format):
        super().__init__(namespace)
        self.namespace = namespace
        self.globals = globals
        self.owner = owner
        self.is_class = is_class
        self.stringifiers = []
        self.next_id = 1
        self.format = format

    def __missing__(self, key):
        fwdref = _Stringifier(
            key,
            globals=self.globals,
            owner=self.owner,
            is_class=self.is_class,
            stringifier_dict=self,
        )
        self.stringifiers.append(fwdref)
        return fwdref

    def transmogrify(self, cell_dict):
        for obj in self.stringifiers:
            obj.__class__ = ForwardRef
            obj.__stringifier_dict__ = None  # not needed for ForwardRef
            # GRAIL: the text is known now, so it is stored rather than
            # re-derived from a node on each __forward_arg__ read.
            node = obj.__ast_node__
            obj.__arg__ = node if isinstance(node, str) else node.text
            obj.__ast_node__ = None
            if cell_dict is not None and obj.__cell__ is None:
                obj.__cell__ = cell_dict

    def create_unique_name(self):
        name = f"__annotationlib_name_{self.next_id}__"
        self.next_id += 1
        return name


def _source_identifiers(source):
    """Every name the source could look up: identifiers not after a ``.''."""
    names = []
    i, n = 0, len(source)
    while i < n:
        c = source[i]
        if c == "_" or c.isalpha():
            j = i + 1
            while j < n and (source[j] == "_" or source[j].isalnum()):
                j += 1
            word = source[i:j]
            k = i - 1
            while k >= 0 and source[k] == " ":
                k -= 1
            if not (k >= 0 and source[k] == ".") and not keyword.iskeyword(word):
                names.append(word)
            i = j
        else:
            i += 1
    return names


def _stringifier_namespace(source, stringifiers, namespace):
    """A PLAIN dict: namespace, plus a stringifier for every other name in
    source.

    GRAIL: CPython evaluates against the _StringifierDict itself, whose
    __missing__ answers a stringifier for whatever the namespace lacks.  Grail's
    eval consults a dict SUBCLASS only after its builtins and its own module
    classes (``eval('module', {})'' answers Grail's module class), and ranks a
    plain-dict globals ahead of a subclass locals -- so the missing names are
    minted up front, into a plain dict, where they win.  A name in a string
    literal is minted too and simply never read.

    A BUILTIN name is not minted: it keeps its real value, where CPython's
    second pass would defer it too.  Grail's generated code names some
    builtins directly -- a tuple display compiles to a send to ``tuple'' -- and
    an eval globals entry of that name captures it: ``eval('(1, 2)', {'tuple':
    5})'' dies with an uncatchable ``SmallInteger does not understand
    #withAll:''.
    """
    result = dict(namespace)
    for name in _source_identifiers(source):
        if name not in result and not hasattr(_builtins(), name):
            result[name] = stringifiers[name]
    return result


def _resolved_text(ref):
    """``ref.__resolved_str__'' without filling its cache, which
    test_evaluate_string_format_extra_names asserts stays empty until read."""
    text = ref.__forward_arg__
    for name, value in (ref.__extra_names__ or {}).items():
        text = text.replace(name, type_repr(value))
    return text


def _forwardref_value(source, owner, evaluator):
    """What CPython's FORWARDREF answers for one annotation that failed to
    evaluate: a partial evaluation where one exists, else a ForwardRef.

    GRAIL: call_annotate_function's fake-globals passes, on the annotation's
    source.  CPython's second pass runs the function with EVERY name a
    stringifier, then evaluates each ForwardRef that comes back with
    format=FORWARDREF -- which is how ``list[int]'' beside a failing key
    resolves, and why ``[builtins.undef, builtins.int]'' stays a list of two
    ForwardRefs (test_partial_evaluation).
    """
    is_class = isinstance(owner, type)
    ref = ForwardRef(source, owner=owner, is_class=is_class)
    ref.__grail_evaluator__ = evaluator
    try:
        code = ref.__forward_code__
    except SyntaxError:
        return ref
    names = _StringifierDict({}, owner=owner, is_class=is_class,
                             format=Format.FORWARDREF)
    try:
        result = eval(code, _stringifier_namespace(source, names, {}))
    except Exception:
        return ref
    names.transmogrify(None)
    # A ForwardRef for the WHOLE annotation -- same text once any extra names
    # are substituted back -- is still this annotation, so it keeps the
    # evaluator (the closure cell), including the fresh one evaluate's retry
    # mints for the same text.
    if isinstance(result, ForwardRef):
        if _resolved_text(result) == source:
            result.__grail_evaluator__ = evaluator
        result = result.evaluate(format=Format.FORWARDREF)
        if isinstance(result, ForwardRef) and _resolved_text(result) == source:
            result.__grail_evaluator__ = evaluator
    return result


def _template_type():
    """string.templatelib.Template, or None where it cannot be imported."""
    try:
        from string.templatelib import Template
    except Exception:
        return None
    return Template


_SINGLE_QUOTES = ("'", '"')
_MULTI_QUOTES = ('"""', "'''")
_ALL_QUOTES = (*_SINGLE_QUOTES, *_MULTI_QUOTES)


def _str_literal_helper(string, quote_types):
    """ast._Unparser._str_literal_helper with escape_special_whitespace."""
    def escape_char(c):
        if c == "\\" or not c.isprintable():
            return c.encode("unicode_escape").decode("ascii")
        return c

    escaped_string = "".join(map(escape_char, string))
    possible_quotes = [q for q in quote_types if q not in escaped_string]
    if not possible_quotes:
        string = repr(string)
        quote = next((q for q in quote_types if string[0] in q), string[0])
        return string[1:-1], [quote]
    if escaped_string:
        possible_quotes.sort(key=lambda q: q[0] == escaped_string[-1])
        if possible_quotes[0][0] == escaped_string[-1]:
            escaped_string = escaped_string[:-1] + "\\" + escaped_string[-1]
    return escaped_string, possible_quotes


def _template_literal(template):
    """ast.unparse of _template_to_ast_literal: the t-string that builds it."""
    parts = []
    for part in template:
        if isinstance(part, str):
            parts.append((part.replace("{", "{{").replace("}", "}}"), True))
            continue
        text = "{"
        if part.expression.startswith("{"):
            text += " "
        text += part.expression
        if part.conversion:
            text += "!" + part.conversion
        if part.format_spec:
            spec = part.format_spec.replace("{", "{{").replace("}", "}}")
            spec = spec.replace("\\", "\\\\").replace("'", "\\'")
            spec = spec.replace('"', '\\"').replace("\n", "\\n")
            text += ":" + spec
        parts.append((text + "}", False))

    # ast._Unparser._ftstring_helper
    new_parts = []
    quote_types = list(_ALL_QUOTES)
    fallback_to_repr = False
    for value, is_constant in parts:
        if is_constant:
            value, new_quote_types = _str_literal_helper(value, quote_types)
            if set(new_quote_types).isdisjoint(quote_types):
                fallback_to_repr = True
                break
            quote_types = new_quote_types
        else:
            if "\n" in value:
                quote_types = [q for q in quote_types if q in _MULTI_QUOTES]
            new_quote_types = [q for q in quote_types if q not in value]
            if new_quote_types:
                quote_types = new_quote_types
        new_parts.append(value)
    if fallback_to_repr:
        quote_types = ["'''"]
        new_parts.clear()
        for value, is_constant in parts:
            if is_constant:
                value = repr('"' + value)[2:-1]
            new_parts.append(value)
    return "t" + quote_types[0] + "".join(new_parts) + quote_types[0]


def _template_repr(template):
    """annotationlib._template_to_ast, unparsed.

    GRAIL: CPython builds an ast and unparses it; Grail's ast module is a stub,
    so the two shapes it can build are rendered directly, with ast._Unparser's
    quoting.  A template whose expressions cannot be written as a t-string --
    blank, or not an expression -- is shown as the constructor call instead
    (gh-138558).
    """
    interpolations = template.interpolations
    literal = not any(part.expression.strip() == "" for part in interpolations)
    if literal:
        try:
            for part in interpolations:
                compile(f"({part.expression})", "<string>", "eval")
        except SyntaxError:
            literal = False
    if literal:
        return _template_literal(template)
    args = []
    for part in template:
        if isinstance(part, str):
            args.append(repr(part))
        else:
            args.append(
                f"Interpolation({part.value!r}, {part.expression!r}, "
                f"{part.conversion!r}, {part.format_spec!r})")
    return f"Template({', '.join(args)})"


def call_evaluate_function(evaluate, format, *, owner=None):
    """Call an evaluate function. Evaluate functions are normally generated for
    the value of type aliases and the bounds, constraints, and defaults of
    type parameter objects.
    """
    return call_annotate_function(evaluate, format, owner=owner, _is_evaluate=True)


def _convert_markers(result, owner, is_evaluate):
    """Turn Grail's FORWARDREF markers into ForwardRef objects."""
    if is_evaluate:
        if _is_forwardref_marker(result):
            return _forwardref_from_marker(result, owner)
        return result
    if not isinstance(result, dict):
        return result
    converted = None
    for key, value in result.items():
        if _is_forwardref_marker(value):
            if converted is None:
                converted = dict(result)
            converted[key] = _forwardref_from_marker(value, owner)
    return result if converted is None else converted


def call_annotate_function(annotate, format, *, owner=None, _is_evaluate=False):
    """Call an __annotate__ function. __annotate__ functions are normally
    generated by the compiler to defer the evaluation of annotations. They
    can be called with any of the format arguments in the Format enum, but
    compiler-generated __annotate__ functions only support the VALUE format.
    This function provides additional functionality to call __annotate__
    functions with the FORWARDREF and STRING formats.

    *annotate* must be an __annotate__ function, which takes a single argument
    and returns a dict of annotations.

    *format* must be a member of the Format enum or one of the corresponding
    integer values.

    *owner* can be the object that owns the annotations (i.e., the module,
    class, or function that the __annotate__ function derives from). With the
    FORWARDREF format, it is used to provide better evaluation capabilities
    on the generated ForwardRef objects.

    """
    if format == Format.VALUE_WITH_FAKE_GLOBALS:
        raise ValueError("The VALUE_WITH_FAKE_GLOBALS format is for internal use only")
    try:
        return _convert_markers(annotate(format), owner, _is_evaluate)
    except NotImplementedError:
        pass
    # GRAIL: from here CPython re-runs the annotate function's code object
    # under fake globals (see the module docstring).  What remains is what
    # CPython does when that is impossible for the function at hand.
    if format == Format.STRING:
        # Attempt to call with VALUE_WITH_FAKE_GLOBALS to check if it is implemented
        # See: https://github.com/python/cpython/issues/138764
        # Only fail on NotImplementedError
        # GRAIL: CPython stringifies what VALUE_WITH_FAKE_GLOBALS answers under
        # a namespace where every name is a stringifier.  Grail calls it with the
        # function's REAL globals and stringifies the values instead -- the same
        # text for any annotation that names things (``int'' either way), and
        # the function's own choice of answer for that format, which is what
        # test_user_annotate_string_fakeglobals pins.
        try:
            result = annotate(Format.VALUE_WITH_FAKE_GLOBALS)
        except NotImplementedError:
            result = annotate(Format.VALUE)
        except Exception:
            result = annotate(Format.VALUE)
        result = _convert_markers(result, owner, _is_evaluate)
        if _is_evaluate:
            return type_repr(result)
        return annotations_to_string(result)
    elif format == Format.FORWARDREF:
        # CPython's next step builds the fake namespace from the function's own
        # -- ``{**annotate.__builtins__, **annotate.__globals__}'' -- so a
        # callable that is not a function (an instance with __call__) raises
        # AttributeError right here, and test_basic_non_function_annotate
        # asserts exactly that.  The reads are kept for that reason; what CPython
        # would then do with them needs the code object Grail does not have, so
        # the answer is CPython's own last resort, VALUE.
        annotate.__builtins__
        annotate.__globals__
        # CPython's first attempt, with the real names in its namespace: what
        # VALUE_WITH_FAKE_GLOBALS answers, when the function answers it.  Grail
        # makes the same call against the function's own globals.
        try:
            result = annotate(Format.VALUE_WITH_FAKE_GLOBALS)
        except NotImplementedError:
            return _convert_markers(annotate(Format.VALUE), owner, _is_evaluate)
        except Exception:
            pass
        else:
            return _convert_markers(result, owner, _is_evaluate)
        return _convert_markers(annotate(Format.VALUE), owner, _is_evaluate)
    elif format == Format.VALUE:
        # Should be impossible because __annotate__ functions must not raise
        # NotImplementedError for this format.
        raise RuntimeError("annotate function does not support VALUE format")
    else:
        raise ValueError(f"Invalid format: {format!r}")


def get_annotate_from_class_namespace(obj):
    """Retrieve the annotate function from a class namespace dictionary.

    Return None if the namespace does not contain an annotate function.
    This is useful in metaclass ``__new__`` methods to retrieve the annotate function.
    """
    try:
        return obj["__annotate__"]
    except KeyError:
        return obj.get("__annotate_func__", None)


def get_annotations(
    obj, *, globals=None, locals=None, eval_str=False, format=Format.VALUE
):
    """Compute the annotations dict for an object.

    obj may be a callable, class, module, or other object with
    __annotate__ or __annotations__ attributes.
    Passing any other object raises TypeError.

    The *format* parameter controls the format in which annotations are returned,
    and must be a member of the Format enum or its integer equivalent.
    For the VALUE format, the __annotations__ is tried first; if it
    does not exist, the __annotate__ function is called. The
    FORWARDREF format uses __annotations__ if it exists and can be
    evaluated, and otherwise falls back to calling the __annotate__ function.
    The STRING format tries __annotate__ first, and falls back to
    using __annotations__, stringified using annotations_to_string().

    This function handles several details for you:

      * If eval_str is true, values of type str will
        be un-stringized using eval().  This is intended
        for use with stringized annotations
        ("from __future__ import annotations").
      * If obj doesn't have an annotations dict, returns an
        empty dict.  (Functions and methods always have an
        annotations dict; classes, modules, and other types of
        callables may not.)
      * Ignores inherited annotations on classes.  If a class
        doesn't have its own annotations dict, returns an empty dict.
      * All accesses to object members and dict values are done
        using getattr() and dict.get() for safety.
      * Always, always, always returns a freshly-created dict.

    eval_str controls whether or not values of type str are replaced
    with the result of calling eval() on those values:

      * If eval_str is true, eval() is called on values of type str.
      * If eval_str is false (the default), values of type str are unchanged.

    globals and locals are passed in to eval(); see the documentation
    for eval() for more information.  If either globals or locals is
    None, this function may replace that value with a context-specific
    default, contingent on type(obj):

      * If obj is a module, globals defaults to obj.__dict__.
      * If obj is a class, globals defaults to
        sys.modules[obj.__module__].__dict__ and locals
        defaults to the obj class namespace.
      * If obj is a callable, globals defaults to obj.__globals__,
        although if obj is a wrapped function (using
        functools.update_wrapper()) it is first unwrapped.
    """
    if eval_str and format != Format.VALUE:
        raise ValueError("eval_str=True is only supported with format=Format.VALUE")

    match format:
        case Format.VALUE:
            # For VALUE, we first look at __annotations__
            ann = _get_dunder_annotations(obj)

            # If it's not there, try __annotate__ instead
            if ann is None:
                ann = _get_and_call_annotate(obj, format)
        case Format.FORWARDREF:
            # For FORWARDREF, we use __annotations__ if it exists
            try:
                ann = _get_dunder_annotations(obj)
            except Exception:
                pass
            else:
                if ann is not None:
                    return dict(ann)

            # But if __annotations__ threw a NameError, we try calling __annotate__
            ann = _get_and_call_annotate(obj, format)
            if ann is None:
                # If that didn't work either, we have a very weird object: evaluating
                # __annotations__ threw NameError and there is no __annotate__. In that case,
                # we fall back to trying __annotations__ again.
                ann = _get_dunder_annotations(obj)
        case Format.STRING:
            # For STRING, we try to call __annotate__
            ann = _get_and_call_annotate(obj, format)
            if ann is not None:
                return dict(ann)
            # But if we didn't get it, we use __annotations__ instead.
            ann = _get_dunder_annotations(obj)
            if ann is not None:
                return annotations_to_string(ann)
        case Format.VALUE_WITH_FAKE_GLOBALS:
            raise ValueError("The VALUE_WITH_FAKE_GLOBALS format is for internal use only")
        case _:
            raise ValueError(f"Unsupported format {format!r}")

    if ann is None:
        if isinstance(obj, type) or callable(obj):
            return {}
        raise TypeError(f"{obj!r} does not have annotations")

    if not ann:
        return {}

    if not eval_str:
        return dict(ann)

    if globals is None or locals is None:
        if isinstance(obj, type):
            # class
            obj_globals = None
            module_name = getattr(obj, "__module__", None)
            if module_name:
                module = sys.modules.get(module_name, None)
                if module:
                    obj_globals = getattr(module, "__dict__", None)
            obj_locals = dict(vars(obj))
            unwrap = obj
        elif isinstance(obj, types.ModuleType):
            # module
            obj_globals = getattr(obj, "__dict__")
            obj_locals = None
            unwrap = None
        elif callable(obj):
            # this includes types.Function, types.BuiltinFunctionType,
            # types.BuiltinMethodType, functools.partial, functools.singledispatch,
            # "class funclike" from Lib/test/test_inspect... on and on it goes.
            obj_globals = getattr(obj, "__globals__", None)
            obj_locals = None
            unwrap = obj
        else:
            obj_globals = obj_locals = unwrap = None

        if unwrap is not None:
            # Use an id-based visited set to detect cycles in the __wrapped__
            # and functools.partial.func chain (e.g. f.__wrapped__ = f).
            # On cycle detection we stop and use whatever __globals__ we have
            # found so far, mirroring the approach of inspect.unwrap().
            _seen_ids = {id(unwrap)}
            while True:
                if hasattr(unwrap, "__wrapped__"):
                    candidate = unwrap.__wrapped__
                    if id(candidate) in _seen_ids:
                        break
                    _seen_ids.add(id(candidate))
                    unwrap = candidate
                    continue
                if functools := sys.modules.get("functools"):
                    if isinstance(unwrap, functools.partial):
                        candidate = unwrap.func
                        if id(candidate) in _seen_ids:
                            break
                        _seen_ids.add(id(candidate))
                        unwrap = candidate
                        continue
                break
            if hasattr(unwrap, "__globals__"):
                obj_globals = unwrap.__globals__

        if globals is None:
            globals = obj_globals
        if locals is None:
            locals = obj_locals

    # "Inject" type parameters into the local namespace
    # (unless they are shadowed by assignments *in* the local namespace),
    # as a way of emulating annotation scopes when calling `eval()`
    if type_params := getattr(obj, "__type_params__", ()):
        if locals is None:
            locals = {}
        locals = {param.__name__: param for param in type_params} | locals

    return_value = {
        key: value if not isinstance(value, str)
        else eval(_rewrite_star_unpack(value), globals, locals)
        for key, value in ann.items()
    }
    return return_value


def type_repr(value):
    """Convert a Python value to a format suitable for use with the STRING format.

    This is intended as a helper for tools that support the STRING format but do
    not have access to the code that originally produced the annotations. It uses
    repr() for most objects.

    """
    if isinstance(value, (type, types.FunctionType, types.BuiltinFunctionType)):
        if value.__module__ == "builtins":
            return value.__qualname__
        return f"{value.__module__}.{value.__qualname__}"
    template = _template_type()
    if template is not None and isinstance(value, template):
        return _template_repr(value)
    if value is ...:
        return "..."
    return repr(value)


def annotations_to_string(annotations):
    """Convert an annotation dict containing values to approximately the STRING format.

    Always returns a fresh a dictionary.
    """
    return {
        n: t if isinstance(t, str) else type_repr(t)
        for n, t in annotations.items()
    }


def _rewrite_star_unpack(arg):
    """If the given argument annotation expression is a star unpack e.g. `'*Ts'`
       rewrite it to a valid expression.
       """
    if arg.lstrip().startswith("*"):
        return f"({arg},)[0]"  # E.g. (*Ts,)[0] or (*tuple[int, int],)[0]
    else:
        return arg


def _get_and_call_annotate(obj, format):
    """Get the __annotate__ function and call it.

    May not return a fresh dictionary.
    """
    annotate = getattr(obj, "__annotate__", None)
    if annotate is not None:
        ann = call_annotate_function(annotate, format, owner=obj)
        if not isinstance(ann, dict):
            raise ValueError(f"{obj!r}.__annotate__ returned a non-dict")
        return ann
    return None


def _get_dunder_annotations(obj):
    """Return the annotations for an object, checking that it is a dictionary.

    Does not return a fresh dictionary.
    """
    # CPython reads a class's OWN annotations through the base descriptor,
    # ``type.__dict__["__annotations__"].__get__'', so an attribute a metaclass
    # defines cannot shadow them.  GRAIL: a class's own annotations are its
    # class-side ``__annotations__'' accessor, which already reads only the
    # class's own holder (a subclass never sees its parent's), so a plain
    # getattr is the equivalent read.
    ann = getattr(obj, "__annotations__", None)
    if ann is None:
        return None

    if not isinstance(ann, dict):
        raise ValueError(f"{obj!r}.__annotations__ is neither a dict nor None")
    return ann
