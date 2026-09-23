# Minimal `ast` stub for Grail.  CPython's ast module exposes
# Python's compile-time AST + tree walkers; Grail has its own
# Smalltalk-side parser that produces a different node hierarchy
# and isn't exported through this Python interface.  Only the two
# helpers Jinja2 / Werkzeug reach for at import time are stubbed:
#
#   - ``literal_eval(s)``: safely evaluate a string containing a
#     Python literal.  Implemented as a recursive descent over the
#     common literal forms (string / bytes / number / tuple / list
#     / dict / set / True / False / None); raises ValueError on
#     anything more exotic.
#   - ``parse(s)``: returns a placeholder object.  Jinja2 uses it
#     only in nativetypes to detect parse errors, so an
#     exception-raising stub keeps the import path quiet without
#     pretending to support a real parse.


class _UnsupportedLiteral(ValueError):
    pass


def _skip_ws(s, i):
    n = len(s)
    while i < n and s[i] in ' \t\r\n':
        i += 1
    return i


def _parse_value(s, i):
    n = len(s)
    i = _skip_ws(s, i)
    if i >= n:
        raise _UnsupportedLiteral('empty literal')
    c = s[i]
    # Strings / bytes
    if c in ('"', "'"):
        return _parse_string(s, i)
    if c in 'bB' and i + 1 < n and s[i + 1] in ('"', "'"):
        end, raw = _parse_string(s, i + 1)
        return end, raw.encode('latin-1')
    # Containers
    if c == '(':
        return _parse_tuple(s, i)
    if c == '[':
        return _parse_list(s, i)
    if c == '{':
        return _parse_dict_or_set(s, i)
    # Bare names
    if c.isalpha() or c == '_':
        return _parse_name(s, i)
    # Sign + digits
    if c in '+-' or c.isdigit() or c == '.':
        return _parse_number(s, i)
    raise _UnsupportedLiteral('unexpected char ' + repr(c))


def _parse_string(s, i):
    quote = s[i]
    n = len(s)
    out = []
    i += 1
    while i < n and s[i] != quote:
        if s[i] == '\\' and i + 1 < n:
            esc = s[i + 1]
            mapping = {'n': '\n', 't': '\t', 'r': '\r',
                       '"': '"', "'": "'", '\\': '\\'}
            out.append(mapping.get(esc, esc))
            i += 2
        else:
            out.append(s[i])
            i += 1
    if i >= n:
        raise _UnsupportedLiteral('unterminated string')
    return i + 1, ''.join(out)


def _parse_number(s, i):
    n = len(s)
    start = i
    if s[i] in '+-':
        i += 1
    has_dot = False
    while i < n and (s[i].isdigit() or s[i] == '.'):
        if s[i] == '.':
            has_dot = True
        i += 1
    # Optional exponent
    if i < n and s[i] in 'eE':
        i += 1
        if i < n and s[i] in '+-':
            i += 1
        while i < n and s[i].isdigit():
            i += 1
        has_dot = True
    text = s[start:i]
    if has_dot:
        return i, float(text)
    return i, int(text)


def _parse_name(s, i):
    n = len(s)
    start = i
    while i < n and (s[i].isalnum() or s[i] == '_'):
        i += 1
    name = s[start:i]
    if name == 'True':
        return i, True
    if name == 'False':
        return i, False
    if name == 'None':
        return i, None
    raise _UnsupportedLiteral('unknown name ' + name)


def _parse_tuple(s, i):
    # ``i`` points at ``(``
    i, items = _parse_seq(s, i + 1, ')')
    return i, tuple(items)


def _parse_list(s, i):
    i, items = _parse_seq(s, i + 1, ']')
    return i, list(items)


def _parse_dict_or_set(s, i):
    # ``i`` points at ``{``
    n = len(s)
    i = _skip_ws(s, i + 1)
    if i < n and s[i] == '}':
        return i + 1, {}
    # peek: dict or set?  Look for ``:`` before ``,`` / ``}``.
    j = i
    depth = 0
    is_dict = False
    while j < n:
        cj = s[j]
        if cj == ':' and depth == 0:
            is_dict = True
            break
        if cj in '({[':
            depth += 1
        elif cj in ')}]':
            if depth == 0:
                break
            depth -= 1
        elif cj == ',' and depth == 0:
            break
        j += 1
    if is_dict:
        out = {}
        while True:
            i, key = _parse_value(s, i)
            i = _skip_ws(s, i)
            if i >= n or s[i] != ':':
                raise _UnsupportedLiteral('expected ":" in dict')
            i, value = _parse_value(s, i + 1)
            out[key] = value
            i = _skip_ws(s, i)
            if i < n and s[i] == ',':
                i = _skip_ws(s, i + 1)
                if i < n and s[i] == '}':
                    return i + 1, out
                continue
            if i < n and s[i] == '}':
                return i + 1, out
            raise _UnsupportedLiteral('expected "," or "}" in dict')
    # set
    i, items = _parse_seq(s, i, '}')
    return i, set(items)


def _parse_seq(s, i, close):
    n = len(s)
    out = []
    i = _skip_ws(s, i)
    if i < n and s[i] == close:
        return i + 1, out
    while True:
        i, v = _parse_value(s, i)
        out.append(v)
        i = _skip_ws(s, i)
        if i < n and s[i] == ',':
            i = _skip_ws(s, i + 1)
            if i < n and s[i] == close:
                return i + 1, out
            continue
        if i < n and s[i] == close:
            return i + 1, out
        raise _UnsupportedLiteral('expected "," or "' + close + '"')


def literal_eval(s):
    if not isinstance(s, str):
        raise TypeError('literal_eval requires a string')
    i, value = _parse_value(s, 0)
    i = _skip_ws(s, i)
    if i != len(s):
        raise _UnsupportedLiteral('trailing characters after literal')
    return value


class _ParsedExpr:
    """Placeholder returned by ``parse()``; carries the source text."""

    def __init__(self, source, mode):
        self.source = source
        self.mode = mode


def parse(source, filename='<unknown>', mode='exec', *,
          type_comments=False, feature_version=None, optimize=-1):
    """Parse source and return a real tree of the node classes below.

    It used to answer a placeholder, on the reasoning that Grail's parser
    produces its own Smalltalk-side hierarchy and this module does not export
    it.  It does now: AbstractNode>>___asPythonAst___ maps a Grail node class
    name to the one here and copies the children across, so anything that
    WALKS a parse -- which is what this module is for -- gets a tree instead of
    an AttributeError.

    ``optimize'' is accepted and honoured to the extent Grail folds anything:
    at 0 or above, ``__debug__'' becomes a Constant, which is the fold CPython
    documents for it.  The rest of CPython's optimiser (docstring stripping,
    assert removal) is not modelled; passing a level it does not implement
    changes nothing rather than raising, because refusing would break callers
    that pass it for the part that does work.
    """
    if isinstance(source, AST):
        return source
    if not isinstance(source, (str, bytes, bytearray)):
        raise TypeError('parse() expected a string')
    # ``ast.parse'' IS ``compile(..., PyCF_ONLY_AST)'' in CPython, and going
    # through it here means one place builds the tree rather than two that can
    # drift.
    tree = compile(source, filename, mode, PyCF_ONLY_AST)
    if optimize is not None and optimize >= 0:
        tree = __grail_fold_debug__(tree)
    return tree


def __grail_fold_debug__(node):
    """Replace every ``__debug__'' Name with the Constant CPython folds it to.

    CPython's optimiser resolves __debug__ at compile time -- it cannot change
    while a program runs -- and PyCF_OPTIMIZED_AST is how a caller asks to see
    the tree AFTER that.  test_compile_ast checks exactly this: the raw tree
    has a Name there and the optimised one a Constant.
    """
    if isinstance(node, Name) and getattr(node, 'id', None) == '__debug__':
        folded = Constant(__debug__)
        for attr in ('lineno', 'col_offset', 'end_lineno', 'end_col_offset'):
            if hasattr(node, attr):
                setattr(folded, attr, getattr(node, attr))
        return folded
    if isinstance(node, AST):
        for name in dir(node):
            if name.startswith('_'):
                continue
            try:
                value = getattr(node, name)
            except Exception:
                continue
            if isinstance(value, AST):
                setattr(node, name, __grail_fold_debug__(value))
            elif isinstance(value, list):
                setattr(node, name, [__grail_fold_debug__(v) for v in value])
    return node


# AST node classes — minimal stubs so werkzeug.routing's converter
# parser can reference ast.AST / ast.Expr / ast.Name / etc. as type
# tags.  Actual ast.parse() returns _ParsedExpr (above) which isn't
# one of these; routing's runtime walks will fail until ast.parse
# is implemented.

class AST:
    pass


class Expression(AST):
    pass


class Module(AST):
    pass


class Expr(AST):
    pass


class Call(AST):
    pass


class Name(AST):
    pass


class Constant(AST):
    pass


class Attribute(AST):
    pass


class keyword(AST):
    pass


class Load(AST):
    pass


class Store(AST):
    pass


class If(AST):
    pass


class For(AST):
    pass


class FunctionDef(AST):
    pass


def walk(node):
    """Recursively yield every node descendant.  Empty for the stub."""
    return iter([])


def iter_child_nodes(node):
    return iter([])


class NodeVisitor:
    def visit(self, node):
        return self.generic_visit(node)

    def generic_visit(self, node):
        return None


class NodeTransformer(NodeVisitor):
    pass


# ---------------------------------------------------------------------------
# Compiler flags.
#
# These are the ``flags`` argument of the builtin ``compile()``: bits that
# direct the COMPILE, as distinct from the CO_ bits that describe the code
# object it produces.  compile() validates against them, so an unrecognised
# value is a ValueError rather than being silently ignored.
#
# Only PyCF_ALLOW_TOP_LEVEL_AWAIT changes what Grail does: a module compiled
# with it whose body awaits at module scope gets CO_COROUTINE in co_flags,
# which is how a caller knows to run the result with ``await`` instead of
# exec().  The other three are accepted and recorded; Grail's parser produces
# its own Smalltalk-side node hierarchy, which this module does not export, so
# asking for an AST back cannot yet be honoured.
PyCF_ONLY_AST = 0x400
PyCF_TYPE_COMMENTS = 0x1000
PyCF_ALLOW_TOP_LEVEL_AWAIT = 0x2000
PyCF_OPTIMIZED_AST = 0x8400


# ---------------------------------------------------------------------------
# NODE CLASSES.
#
# Grail's parser builds its own Smalltalk-side node hierarchy, and these are
# the Python-visible shapes it is translated INTO -- by
# AbstractNode>>___asPythonAst___, which maps a class name (``BinOpAst'') to the
# one here (``BinOp'') and copies the child fields across.  The names line up
# almost one-for-one already, which is why a generic translation is possible at
# all rather than 120 hand-written conversions.
#
# ``ast.parse(source)'' and ``compile(source, f, mode, flags=PyCF_ONLY_AST)''
# both answer a tree of these.  Before this they answered a placeholder and the
# source string respectively, so anything that INSPECTED a parse -- and that is
# what the module is for -- saw neither.
#
# Constructed with keyword arguments, as CPython's are, and also buildable
# empty so the translator can fill the fields it finds.  Unknown keywords are
# kept rather than refused: Grail carries a few fields CPython does not, and
# dropping them silently would make the tree quietly lossy.


class AST:
    """Base of every node.  ``_fields'' names the children, in source order."""

    _fields = ()

    def __init__(self, *args, **kwargs):
        for name, value in zip(self._fields, args):
            setattr(self, name, value)
        for name, value in kwargs.items():
            setattr(self, name, value)

    def __repr__(self):
        shown = []
        for name in self._fields:
            if hasattr(self, name):
                shown.append('%s=%r' % (name, getattr(self, name)))
        return '%s(%s)' % (type(self).__name__, ', '.join(shown))


def _make_node(name, fields):
    cls = type(name, (AST,), {'_fields': fields})
    globals()[name] = cls
    return cls


# The fields CPython gives each node, for the ones a reader actually walks.
# A node not listed here still gets a class, with no declared fields -- the
# translator sets whatever it finds, so the tree is complete either way; only
# ``_fields'' (and therefore repr and iter_fields) is thinner.
_FIELDS = {
    'Module': ('body', 'type_ignores'),
    'Expression': ('body',),
    'Expr': ('value',),
    'Assign': ('targets', 'value', 'type_comment'),
    'AnnAssign': ('target', 'annotation', 'value', 'simple'),
    'AugAssign': ('target', 'op', 'value'),
    'Return': ('value',),
    'Delete': ('targets',),
    'Pass': (),
    'Break': (),
    'Continue': (),
    'Global': ('names',),
    'Nonlocal': ('names',),
    'If': ('test', 'body', 'orelse'),
    'While': ('test', 'body', 'orelse'),
    'For': ('target', 'iter', 'body', 'orelse', 'type_comment'),
    'AsyncFor': ('target', 'iter', 'body', 'orelse', 'type_comment'),
    'With': ('items', 'body', 'type_comment'),
    'AsyncWith': ('items', 'body', 'type_comment'),
    'withitem': ('context_expr', 'optional_vars'),
    'Raise': ('exc', 'cause'),
    'Try': ('body', 'handlers', 'orelse', 'finalbody'),
    'TryStar': ('body', 'handlers', 'orelse', 'finalbody'),
    'ExceptHandler': ('type', 'name', 'body'),
    'Assert': ('test', 'msg'),
    'Import': ('names',),
    'ImportFrom': ('module', 'names', 'level'),
    'Alias': ('name', 'asname'),
    'FunctionDef': ('name', 'args', 'body', 'decorator_list', 'returns',
                    'type_comment', 'type_params'),
    'AsyncFunctionDef': ('name', 'args', 'body', 'decorator_list', 'returns',
                         'type_comment', 'type_params'),
    'ClassDef': ('name', 'bases', 'keywords', 'body', 'decorator_list',
                 'type_params'),
    'Lambda': ('args', 'body'),
    'arguments': ('posonlyargs', 'args', 'vararg', 'kwonlyargs', 'kw_defaults',
                  'kwarg', 'defaults'),
    'arg': ('arg', 'annotation', 'type_comment'),
    'keyword': ('arg', 'value'),
    'BoolOp': ('op', 'values'),
    'BinOp': ('left', 'op', 'right'),
    'UnaryOp': ('op', 'operand'),
    'Compare': ('left', 'ops', 'comparators'),
    'Call': ('func', 'args', 'keywords'),
    'IfExp': ('test', 'body', 'orelse'),
    'NamedExpr': ('target', 'value'),
    'Attribute': ('value', 'attr', 'ctx'),
    'Subscript': ('value', 'slice', 'ctx'),
    'Slice': ('lower', 'upper', 'step'),
    'Starred': ('value', 'ctx'),
    'Name': ('id', 'ctx'),
    'Constant': ('value', 'kind'),
    'List': ('elts', 'ctx'),
    'Tuple': ('elts', 'ctx'),
    'Set': ('elts',),
    'Dict': ('keys', 'values'),
    'ListComp': ('elt', 'generators'),
    'SetComp': ('elt', 'generators'),
    'GeneratorExp': ('elt', 'generators'),
    'DictComp': ('key', 'value', 'generators'),
    'comprehension': ('target', 'iter', 'ifs', 'is_async'),
    'Yield': ('value',),
    'YieldFrom': ('value',),
    'Await': ('value',),
    'JoinedStr': ('values',),
    'FormattedValue': ('value', 'conversion', 'format_spec'),
    'TypeAlias': ('name', 'type_params', 'value'),
    'Match': ('subject', 'cases'),
    'MatchCase': ('pattern', 'guard', 'body'),
    'MatchValue': ('value',),
    'MatchSingleton': ('value',),
    'MatchSequence': ('patterns',),
    'MatchMapping': ('keys', 'patterns', 'rest'),
    'MatchClass': ('cls', 'patterns', 'kwd_attrs', 'kwd_patterns'),
    'MatchStar': ('name',),
    'MatchAs': ('pattern', 'name'),
    'MatchOr': ('patterns',),
    'TypeIgnore': ('lineno', 'tag'),
}

# The operator / context singletons carry no fields.
_MARKERS = (
    'Add Sub Mult MatMult Div Mod Pow LShift RShift BitOr BitXor BitAnd FloorDiv '
    'Invert Not UAdd USub '
    'And Or '
    'Eq NotEq Lt LtE Gt GtE Is IsNot In NotIn '
    'Load Store Del'
).split()

for _n, _f in _FIELDS.items():
    _make_node(_n, _f)
for _n in _MARKERS:
    _make_node(_n, ())
del _n, _f

# Grail-only node kinds still need SOMETHING to land in, so the translation of
# an unfamiliar node is not an error.  They subclass AST like the rest and
# declare no fields.
for _n in ('Block', 'Suite', 'RawSmalltalk', 'Keywords', 'TypeAliasValue',
           'ExpressionContext', 'Operator', 'CmpOp', 'Statement', 'Pattern',
           'Param', 'TypeParam', 'Arg', 'Arguments', 'Comprehension',
           'Keyword', 'Expr_', 'ClassFunctionDef', 'InstanceFunctionDef',
           'StaticFunctionDef'):
    if _n not in globals():
        _make_node(_n, ())
del _n
