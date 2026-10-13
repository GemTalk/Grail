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
    # mode='eval' parses an expression, and CPython answers an Expression
    # holding it; Grail's translation answers the Module it parsed into.
    if (mode == 'eval' and type(tree).__name__ == 'Module'
            and len(getattr(tree, 'body', ())) == 1
            and type(tree.body[0]).__name__ == 'Expr'):
        tree = Expression(body=tree.body[0].value)
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
    _attributes = ()

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


# CPython's abstract node categories, with the location attributes each
# carries.  ``isinstance(node, ast.stmt)'' is how a reader tells statements
# from expressions -- pytest's get_statement_startend2 collects every stmt and
# excepthandler line to find where a failing statement ends -- and without
# these every such test was an AttributeError or matched nothing.
_LOCATION = ('lineno', 'col_offset', 'end_lineno', 'end_col_offset')


def _make_category(name, attributes=()):
    cls = type(name, (AST,), {'_fields': (), '_attributes': attributes})
    globals()[name] = cls
    return cls


for _n in ('mod', 'expr_context', 'boolop', 'operator', 'unaryop', 'cmpop',
           'type_ignore'):
    _make_category(_n)
for _n in ('stmt', 'expr', 'excepthandler', 'pattern', 'type_param'):
    _make_category(_n, _LOCATION)

# Which category each concrete node belongs to, as in CPython.  A node not
# named here derives from AST directly, as CPython's arguments/comprehension/
# withitem/match_case do.
_CATEGORY = {}
for _cat, _names in (
        ('mod', 'Module Interactive Expression FunctionType'),
        ('stmt', 'FunctionDef AsyncFunctionDef ClassDef Return Delete Assign '
                 'TypeAlias AugAssign AnnAssign For AsyncFor While If With '
                 'AsyncWith Match Raise Try TryStar Assert Import ImportFrom '
                 'Global Nonlocal Expr Pass Break Continue'),
        ('expr', 'BoolOp NamedExpr BinOp UnaryOp Lambda IfExp Dict Set ListComp '
                 'SetComp DictComp GeneratorExp Await Yield YieldFrom Compare '
                 'Call FormattedValue Interpolation JoinedStr TemplateStr '
                 'Constant Attribute Subscript Starred Name List Tuple Slice'),
        ('expr_context', 'Load Store Del'),
        ('boolop', 'And Or'),
        ('operator', 'Add Sub Mult MatMult Div Mod Pow LShift RShift BitOr '
                     'BitXor BitAnd FloorDiv'),
        ('unaryop', 'Invert Not UAdd USub'),
        ('cmpop', 'Eq NotEq Lt LtE Gt GtE Is IsNot In NotIn'),
        ('excepthandler', 'ExceptHandler'),
        ('pattern', 'MatchValue MatchSingleton MatchSequence MatchMapping '
                    'MatchClass MatchStar MatchAs MatchOr'),
        ('type_ignore', 'TypeIgnore'),
        ('type_param', 'TypeVar ParamSpec TypeVarTuple')):
    for _n in _names.split():
        _CATEGORY[_n] = _cat
# Leaf nodes outside the categories that still carry a location in CPython.
_LOCATED_LEAVES = ('arg', 'keyword', 'Alias')


def _make_node(name, fields):
    base = globals()[_CATEGORY[name]] if name in _CATEGORY else AST
    attrs = {'_fields': fields}
    if name in _LOCATED_LEAVES:
        attrs['_attributes'] = _LOCATION
    cls = type(name, (base,), attrs)
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


# ---------------------------------------------------------------------------
# HELPERS -- CPython 3.14's, verbatim.  They read nothing but ``_fields'' and
# ``_attributes'', which the classes above declare, so they work on the tree
# AbstractNode>>___asPythonAst___ builds.  walk and iter_child_nodes used to be
# stubs answering nothing and NodeVisitor visited nothing, so every reader that
# walked a parse saw an empty tree.  (dump, unparse and compile() of a tree are
# still missing: #1513.)

def copy_location(new_node, old_node):
    """
    Copy source location (`lineno`, `col_offset`, `end_lineno`, and `end_col_offset`
    attributes) from *old_node* to *new_node* if possible, and return *new_node*.
    """
    for attr in 'lineno', 'col_offset', 'end_lineno', 'end_col_offset':
        if attr in old_node._attributes and attr in new_node._attributes:
            value = getattr(old_node, attr, None)
            # end_lineno and end_col_offset are optional attributes, and they
            # should be copied whether the value is None or not.
            if value is not None or (
                hasattr(old_node, attr) and attr.startswith("end_")
            ):
                setattr(new_node, attr, value)
    return new_node

def fix_missing_locations(node):
    """
    When you compile a node tree with compile(), the compiler expects lineno and
    col_offset attributes for every node that supports them.  This is rather
    tedious to fill in for generated nodes, so this helper adds these attributes
    recursively where not already set, by setting them to the values of the
    parent node.  It works recursively starting at *node*.
    """
    def _fix(node, lineno, col_offset, end_lineno, end_col_offset):
        if 'lineno' in node._attributes:
            if not hasattr(node, 'lineno'):
                node.lineno = lineno
            else:
                lineno = node.lineno
        if 'end_lineno' in node._attributes:
            if getattr(node, 'end_lineno', None) is None:
                node.end_lineno = end_lineno
            else:
                end_lineno = node.end_lineno
        if 'col_offset' in node._attributes:
            if not hasattr(node, 'col_offset'):
                node.col_offset = col_offset
            else:
                col_offset = node.col_offset
        if 'end_col_offset' in node._attributes:
            if getattr(node, 'end_col_offset', None) is None:
                node.end_col_offset = end_col_offset
            else:
                end_col_offset = node.end_col_offset
        for child in iter_child_nodes(node):
            _fix(child, lineno, col_offset, end_lineno, end_col_offset)
    _fix(node, 1, 0, 1, 0)
    return node

def increment_lineno(node, n=1):
    """
    Increment the line number and end line number of each node in the tree
    starting at *node* by *n*. This is useful to "move code" to a different
    location in a file.
    """
    for child in walk(node):
        # TypeIgnore is a special case where lineno is not an attribute
        # but rather a field of the node itself.
        if isinstance(child, TypeIgnore):
            child.lineno = getattr(child, 'lineno', 0) + n
            continue

        if 'lineno' in child._attributes:
            child.lineno = getattr(child, 'lineno', 0) + n
        if (
            "end_lineno" in child._attributes
            and (end_lineno := getattr(child, "end_lineno", 0)) is not None
        ):
            child.end_lineno = end_lineno + n
    return node

def iter_fields(node):
    """
    Yield a tuple of ``(fieldname, value)`` for each field in ``node._fields``
    that is present on *node*.
    """
    for field in node._fields:
        try:
            yield field, getattr(node, field)
        except AttributeError:
            pass

def iter_child_nodes(node):
    """
    Yield all direct child nodes of *node*, that is, all fields that are nodes
    and all items of fields that are lists of nodes.
    """
    for name, field in iter_fields(node):
        if isinstance(field, AST):
            yield field
        elif isinstance(field, list):
            for item in field:
                if isinstance(item, AST):
                    yield item

def walk(node):
    """
    Recursively yield all descendant nodes in the tree starting at *node*
    (including *node* itself), in no specified order.  This is useful if you
    only want to modify nodes in place and don't care about the context.
    """
    from collections import deque
    todo = deque([node])
    while todo:
        node = todo.popleft()
        todo.extend(iter_child_nodes(node))
        yield node

class NodeVisitor(object):
    """
    A node visitor base class that walks the abstract syntax tree and calls a
    visitor function for every node found.  This function may return a value
    which is forwarded by the `visit` method.

    This class is meant to be subclassed, with the subclass adding visitor
    methods.

    Per default the visitor functions for the nodes are ``'visit_'`` +
    class name of the node.  So a `TryFinally` node visit function would
    be `visit_TryFinally`.  This behavior can be changed by overriding
    the `visit` method.  If no visitor function exists for a node
    (return value `None`) the `generic_visit` visitor is used instead.

    Don't use the `NodeVisitor` if you want to apply changes to nodes during
    traversing.  For this a special visitor exists (`NodeTransformer`) that
    allows modifications.
    """

    def visit(self, node):
        """Visit a node."""
        method = 'visit_' + node.__class__.__name__
        visitor = getattr(self, method, self.generic_visit)
        return visitor(node)

    def generic_visit(self, node):
        """Called if no explicit visitor function exists for a node."""
        for field, value in iter_fields(node):
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, AST):
                        self.visit(item)
            elif isinstance(value, AST):
                self.visit(value)

class NodeTransformer(NodeVisitor):
    """
    A :class:`NodeVisitor` subclass that walks the abstract syntax tree and
    allows modification of nodes.

    The `NodeTransformer` will walk the AST and use the return value of the
    visitor methods to replace or remove the old node.  If the return value of
    the visitor method is ``None``, the node will be removed from its location,
    otherwise it is replaced with the return value.  The return value may be the
    original node in which case no replacement takes place.

    Here is an example transformer that rewrites all occurrences of name lookups
    (``foo``) to ``data['foo']``::

       class RewriteName(NodeTransformer):

           def visit_Name(self, node):
               return Subscript(
                   value=Name(id='data', ctx=Load()),
                   slice=Constant(value=node.id),
                   ctx=node.ctx
               )

    Keep in mind that if the node you're operating on has child nodes you must
    either transform the child nodes yourself or call the :meth:`generic_visit`
    method for the node first.

    For nodes that were part of a collection of statements (that applies to all
    statement nodes), the visitor may also return a list of nodes rather than
    just a single node.

    Usually you use the transformer like this::

       node = YourTransformer().visit(node)
    """

    def generic_visit(self, node):
        for field, old_value in iter_fields(node):
            if isinstance(old_value, list):
                new_values = []
                for value in old_value:
                    if isinstance(value, AST):
                        value = self.visit(value)
                        if value is None:
                            continue
                        elif not isinstance(value, AST):
                            new_values.extend(value)
                            continue
                    new_values.append(value)
                old_value[:] = new_values
            elif isinstance(old_value, AST):
                new_node = self.visit(old_value)
                if new_node is None:
                    delattr(node, field)
                else:
                    setattr(node, field, new_node)
        return node
