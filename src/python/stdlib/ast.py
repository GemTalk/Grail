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
    at 1 or above, ``__debug__'' becomes Constant(False), which is the fold
    CPython documents for it.  The rest of CPython's optimiser (docstring stripping,
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
    # CPython folds only when asked to optimise -- level 1 or 2, where
    # ``__debug__'' is False.  Grail folded at 0 as well, to True, which went
    # unnoticed while compile() of a parse ignored the tree and ran its source.
    if optimize is not None and optimize > 0:
        tree = __grail_fold_debug__(tree, False)
    return tree


def __grail_fold_debug__(node, folded_value=True):
    """Replace every ``__debug__'' Name with the Constant CPython folds it to.

    CPython's optimiser resolves __debug__ at compile time -- it cannot change
    while a program runs -- and PyCF_OPTIMIZED_AST is how a caller asks to see
    the tree AFTER that.  test_compile_ast checks exactly this: the raw tree
    has a Name there and the optimised one a Constant.
    """
    if isinstance(node, Name) and getattr(node, 'id', None) == '__debug__':
        folded = Constant(folded_value)
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
                setattr(node, name, __grail_fold_debug__(value, folded_value))
            elif isinstance(value, list):
                setattr(node, name, [__grail_fold_debug__(v, folded_value) for v in value])
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
    _field_types = {}
    _grail_lists = ()

    def __init__(self, *args, **kwargs):
        for name, value in zip(self._fields, args):
            setattr(self, name, value)
        for name, value in kwargs.items():
            setattr(self, name, value)
        # CPython 3.13's defaults for what was left out: an empty list for a
        # list field, Load() for an expression context.  An optional field
        # reads None through its class attribute.
        for name in self._grail_lists:
            if name not in kwargs and not hasattr(self, name):
                setattr(self, name, [])
        if 'ctx' in self._fields and not hasattr(self, 'ctx'):
            self.ctx = Load()

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
_LOCATED_LEAVES = ('arg', 'keyword', 'alias')


def _make_node(name, fields, lists=(), optional=()):
    base = globals()[_CATEGORY[name]] if name in _CATEGORY else AST
    attrs = {'_fields': fields,
             '_field_types': {f: (list[object] if f in lists else object)
                              for f in fields},
             '_grail_lists': tuple(lists)}
    for f in optional:
        attrs[f] = None
    if name in _LOCATED_LEAVES:
        attrs['_attributes'] = _LOCATION
    cls = type(name, (base,), attrs)
    globals()[name] = cls
    return cls


# Every concrete node CPython 3.14 declares, generated from its
# ``_field_types'': the fields in order, the ones that hold a LIST, and the
# OPTIONAL ones (``expr?'' in the grammar, a class attribute of None in
# CPython).  dump() reads the first two to leave empty lists out, and a node
# built without them gets CPython's 3.13 defaults -- [] and None -- which is
# what an unparse of a hand-built tree depends on.  The operator and context
# singletons carry no fields and are _MARKERS below.
_NODES = {
    'Pass': ('', '', ''),
    'Break': ('', '', ''),
    'Continue': ('', '', ''),
    'alias': ('name asname', '', 'asname'),
    'AnnAssign': ('target annotation value simple', '', 'value'),
    'arg': ('arg annotation type_comment', '', 'annotation type_comment'),
    'arguments': ('posonlyargs args vararg kwonlyargs kw_defaults kwarg defaults', 'posonlyargs args kwonlyargs kw_defaults defaults', 'vararg kwarg'),
    'Assert': ('test msg', '', 'msg'),
    'Assign': ('targets value type_comment', 'targets', 'type_comment'),
    'AsyncFor': ('target iter body orelse type_comment', 'body orelse', 'type_comment'),
    'AsyncFunctionDef': ('name args body decorator_list returns type_comment type_params', 'body decorator_list type_params', 'returns type_comment'),
    'AsyncWith': ('items body type_comment', 'items body', 'type_comment'),
    'Attribute': ('value attr ctx', '', ''),
    'AugAssign': ('target op value', '', ''),
    'Await': ('value', '', ''),
    'BinOp': ('left op right', '', ''),
    'BoolOp': ('op values', 'values', ''),
    'Call': ('func args keywords', 'args keywords', ''),
    'ClassDef': ('name bases keywords body decorator_list type_params', 'bases keywords body decorator_list type_params', ''),
    'Compare': ('left ops comparators', 'ops comparators', ''),
    'comprehension': ('target iter ifs is_async', 'ifs', ''),
    'Constant': ('value kind', '', 'kind'),
    'Delete': ('targets', 'targets', ''),
    'Dict': ('keys values', 'keys values', ''),
    'DictComp': ('key value generators', 'generators', ''),
    'ExceptHandler': ('type name body', 'body', 'type name'),
    'Expr': ('value', '', ''),
    'Expression': ('body', '', ''),
    'For': ('target iter body orelse type_comment', 'body orelse', 'type_comment'),
    'FormattedValue': ('value conversion format_spec', '', 'format_spec'),
    'FunctionDef': ('name args body decorator_list returns type_comment type_params', 'body decorator_list type_params', 'returns type_comment'),
    'FunctionType': ('argtypes returns', 'argtypes', ''),
    'GeneratorExp': ('elt generators', 'generators', ''),
    'Global': ('names', 'names', ''),
    'If': ('test body orelse', 'body orelse', ''),
    'IfExp': ('test body orelse', '', ''),
    'Import': ('names', 'names', ''),
    'ImportFrom': ('module names level', 'names', 'module level'),
    'Interactive': ('body', 'body', ''),
    'Interpolation': ('value str conversion format_spec', '', 'format_spec'),
    'JoinedStr': ('values', 'values', ''),
    'keyword': ('arg value', '', 'arg'),
    'Lambda': ('args body', '', ''),
    'List': ('elts ctx', 'elts', ''),
    'ListComp': ('elt generators', 'generators', ''),
    'Match': ('subject cases', 'cases', ''),
    'match_case': ('pattern guard body', 'body', 'guard'),
    'MatchAs': ('pattern name', '', 'pattern name'),
    'MatchClass': ('cls patterns kwd_attrs kwd_patterns', 'patterns kwd_attrs kwd_patterns', ''),
    'MatchMapping': ('keys patterns rest', 'keys patterns', 'rest'),
    'MatchOr': ('patterns', 'patterns', ''),
    'MatchSequence': ('patterns', 'patterns', ''),
    'MatchSingleton': ('value', '', ''),
    'MatchStar': ('name', '', 'name'),
    'MatchValue': ('value', '', ''),
    'Module': ('body type_ignores', 'body type_ignores', ''),
    'Name': ('id ctx', '', ''),
    'NamedExpr': ('target value', '', ''),
    'Nonlocal': ('names', 'names', ''),
    'ParamSpec': ('name default_value', '', 'default_value'),
    'Raise': ('exc cause', '', 'exc cause'),
    'Return': ('value', '', 'value'),
    'Set': ('elts', 'elts', ''),
    'SetComp': ('elt generators', 'generators', ''),
    'Slice': ('lower upper step', '', 'lower upper step'),
    'Starred': ('value ctx', '', ''),
    'Subscript': ('value slice ctx', '', ''),
    'TemplateStr': ('values', 'values', ''),
    'Try': ('body handlers orelse finalbody', 'body handlers orelse finalbody', ''),
    'TryStar': ('body handlers orelse finalbody', 'body handlers orelse finalbody', ''),
    'Tuple': ('elts ctx', 'elts', ''),
    'TypeAlias': ('name type_params value', 'type_params', ''),
    'TypeIgnore': ('lineno tag', '', ''),
    'TypeVar': ('name bound default_value', '', 'bound default_value'),
    'TypeVarTuple': ('name default_value', '', 'default_value'),
    'UnaryOp': ('op operand', '', ''),
    'While': ('test body orelse', 'body orelse', ''),
    'With': ('items body type_comment', 'items body', 'type_comment'),
    'withitem': ('context_expr optional_vars', '', 'optional_vars'),
    'Yield': ('value', '', 'value'),
    'YieldFrom': ('value', '', ''),
}

# The operator / context singletons carry no fields.
_MARKERS = (
    'Add Sub Mult MatMult Div Mod Pow LShift RShift BitOr BitXor BitAnd FloorDiv '
    'Invert Not UAdd USub '
    'And Or '
    'Eq NotEq Lt LtE Gt GtE Is IsNot In NotIn '
    'Load Store Del'
).split()

for _n, (_f, _lists, _opt) in _NODES.items():
    _make_node(_n, tuple(_f.split()), _lists.split(), _opt.split())

for _n in _MARKERS:
    _make_node(_n, ())
del _n, _f, _lists, _opt

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


# CPython 3.14's dump, get_docstring, get_source_segment, compare and unparse,
# unchanged.  unparse is also what compile() of a tree that was BUILT or
# changed runs on: see _grail_source_for below.

def dump(
    node, annotate_fields=True, include_attributes=False,
    *,
    indent=None, show_empty=False,
):
    """
    Return a formatted dump of the tree in node.  This is mainly useful for
    debugging purposes.  If annotate_fields is true (by default),
    the returned string will show the names and the values for fields.
    If annotate_fields is false, the result string will be more compact by
    omitting unambiguous field names.  Attributes such as line
    numbers and column offsets are not dumped by default.  If this is wanted,
    include_attributes can be set to true.  If indent is a non-negative
    integer or string, then the tree will be pretty-printed with that indent
    level. None (the default) selects the single line representation.
    If show_empty is False, then empty lists and fields that are None
    will be omitted from the output for better readability.
    """
    def _format(node, level=0):
        if indent is not None:
            level += 1
            prefix = '\n' + indent * level
            sep = ',\n' + indent * level
        else:
            prefix = ''
            sep = ', '
        if isinstance(node, AST):
            cls = type(node)
            args = []
            args_buffer = []
            allsimple = True
            keywords = annotate_fields
            for name in node._fields:
                try:
                    value = getattr(node, name)
                except AttributeError:
                    keywords = True
                    continue
                if value is None and getattr(cls, name, ...) is None:
                    keywords = True
                    continue
                if not show_empty:
                    if value == []:
                        field_type = cls._field_types.get(name, object)
                        if getattr(field_type, '__origin__', ...) is list:
                            if not keywords:
                                args_buffer.append(repr(value))
                            continue
                    if not keywords:
                        args.extend(args_buffer)
                        args_buffer = []
                value, simple = _format(value, level)
                allsimple = allsimple and simple
                if keywords:
                    args.append('%s=%s' % (name, value))
                else:
                    args.append(value)
            if include_attributes and node._attributes:
                for name in node._attributes:
                    try:
                        value = getattr(node, name)
                    except AttributeError:
                        continue
                    if value is None and getattr(cls, name, ...) is None:
                        continue
                    value, simple = _format(value, level)
                    allsimple = allsimple and simple
                    args.append('%s=%s' % (name, value))
            if allsimple and len(args) <= 3:
                return '%s(%s)' % (node.__class__.__name__, ', '.join(args)), not args
            return '%s(%s%s)' % (node.__class__.__name__, prefix, sep.join(args)), False
        elif isinstance(node, list):
            if not node:
                return '[]', True
            return '[%s%s]' % (prefix, sep.join(_format(x, level)[0] for x in node)), False
        return repr(node), True

    if not isinstance(node, AST):
        raise TypeError('expected AST, got %r' % node.__class__.__name__)
    if indent is not None and not isinstance(indent, str):
        indent = ' ' * indent
    return _format(node)[0]


def get_docstring(node, clean=True):
    """
    Return the docstring for the given node or None if no docstring can
    be found.  If the node provided does not have docstrings a TypeError
    will be raised.

    If *clean* is `True`, all tabs are expanded to spaces and any whitespace
    that can be uniformly removed from the second line onwards is removed.
    """
    if not isinstance(node, (AsyncFunctionDef, FunctionDef, ClassDef, Module)):
        raise TypeError("%r can't have docstrings" % node.__class__.__name__)
    if not(node.body and isinstance(node.body[0], Expr)):
        return None
    node = node.body[0].value
    if isinstance(node, Constant) and isinstance(node.value, str):
        text = node.value
    else:
        return None
    if clean:
        import inspect
        text = inspect.cleandoc(text)
    return text


_line_pattern = None
def _splitlines_no_ff(source, maxlines=None):
    """Split a string into lines ignoring form feed and other chars.

    This mimics how the Python parser splits source code.
    """
    global _line_pattern
    if _line_pattern is None:
        # lazily computed to speedup import time of `ast`
        import re
        _line_pattern = re.compile(r"(.*?(?:\r\n|\n|\r|$))")

    lines = []
    for lineno, match in enumerate(_line_pattern.finditer(source), 1):
        if maxlines is not None and lineno > maxlines:
            break
        lines.append(match[0])
    return lines


def _pad_whitespace(source):
    r"""Replace all chars except '\f\t' in a line with spaces."""
    result = ''
    for c in source:
        if c in '\f\t':
            result += c
        else:
            result += ' '
    return result


def get_source_segment(source, node, *, padded=False):
    """Get source code segment of the *source* that generated *node*.

    If some location information (`lineno`, `end_lineno`, `col_offset`,
    or `end_col_offset`) is missing, return None.

    If *padded* is `True`, the first line of a multi-line statement will
    be padded with spaces to match its original position.
    """
    try:
        if node.end_lineno is None or node.end_col_offset is None:
            return None
        lineno = node.lineno - 1
        end_lineno = node.end_lineno - 1
        col_offset = node.col_offset
        end_col_offset = node.end_col_offset
    except AttributeError:
        return None

    lines = _splitlines_no_ff(source, maxlines=end_lineno+1)
    if end_lineno == lineno:
        return lines[lineno].encode()[col_offset:end_col_offset].decode()

    if padded:
        padding = _pad_whitespace(lines[lineno].encode()[:col_offset].decode())
    else:
        padding = ''

    first = padding + lines[lineno].encode()[col_offset:].decode()
    last = lines[end_lineno].encode()[:end_col_offset].decode()
    lines = lines[lineno+1:end_lineno]

    lines.insert(0, first)
    lines.append(last)
    return ''.join(lines)


def compare(
    a,
    b,
    /,
    *,
    compare_attributes=False,
):
    """Recursively compares two ASTs.

    compare_attributes affects whether AST attributes are considered
    in the comparison. If compare_attributes is False (default), then
    attributes are ignored. Otherwise they must all be equal. This
    option is useful to check whether the ASTs are structurally equal but
    might differ in whitespace or similar details.
    """

    sentinel = object()  # handle the possibility of a missing attribute/field

    def _compare(a, b):
        # Compare two fields on an AST object, which may themselves be
        # AST objects, lists of AST objects, or primitive ASDL types
        # like identifiers and constants.
        if isinstance(a, AST):
            return compare(
                a,
                b,
                compare_attributes=compare_attributes,
            )
        elif isinstance(a, list):
            # If a field is repeated, then both objects will represent
            # the value as a list.
            if len(a) != len(b):
                return False
            for a_item, b_item in zip(a, b):
                if not _compare(a_item, b_item):
                    return False
            else:
                return True
        else:
            return type(a) is type(b) and a == b

    def _compare_fields(a, b):
        if a._fields != b._fields:
            return False
        for field in a._fields:
            a_field = getattr(a, field, sentinel)
            b_field = getattr(b, field, sentinel)
            if a_field is sentinel and b_field is sentinel:
                # both nodes are missing a field at runtime
                continue
            if a_field is sentinel or b_field is sentinel:
                # one of the node is missing a field
                return False
            if not _compare(a_field, b_field):
                return False
        else:
            return True

    def _compare_attributes(a, b):
        if a._attributes != b._attributes:
            return False
        # Attributes are always ints.
        for attr in a._attributes:
            a_attr = getattr(a, attr, sentinel)
            b_attr = getattr(b, attr, sentinel)
            if a_attr is sentinel and b_attr is sentinel:
                # both nodes are missing an attribute at runtime
                continue
            if a_attr != b_attr:
                return False
        else:
            return True

    if type(a) is not type(b):
        return False
    if not _compare_fields(a, b):
        return False
    if compare_attributes and not _compare_attributes(a, b):
        return False
    return True


def unparse(ast_obj):
    global _Unparser
    try:
        unparser = _Unparser()
    except NameError:
        from _ast_unparse import Unparser as _Unparser
        unparser = _Unparser()
    return unparser.visit(ast_obj)



# ---------------------------------------------------------------------------
# Called by AbstractNode >> ___asPythonAst___ for the fields Grail keeps in a
# different form from CPython.

def _grail_unwrap(node, field):
    """A pattern's capture name as a str, a MatchSingleton's value as the value
    itself -- Grail's parser holds both as nodes."""
    value = getattr(node, field, None)
    if isinstance(value, Name):
        setattr(node, field, value.id)
    elif isinstance(value, Constant):
        setattr(node, field, value.value)


def _grail_type_params(entries):
    """TypeVar / ParamSpec / TypeVarTuple nodes from the parser's strings:
    ``T'', ``*Ts'', ``**P'', and ``T:b<hex>'' / ``T:c<hex>'' for a bound or
    constraints whose source is hex-encoded UTF-8."""
    out = []
    for entry in entries:
        if not isinstance(entry, str):
            out.append(entry)
            continue
        if entry.startswith('**'):
            out.append(ParamSpec(name=entry[2:]))
        elif entry.startswith('*'):
            out.append(TypeVarTuple(name=entry[1:]))
        elif ':' in entry:
            name, rest = entry.split(':', 1)
            bound = parse(bytes.fromhex(rest[1:]).decode('utf-8'), mode='eval').body
            out.append(TypeVar(name=name, bound=bound))
        else:
            out.append(TypeVar(name=entry))
    return out


# ---------------------------------------------------------------------------
# compile() of a tree.  Grail compiles from text, so builtins >> _compile:
# asks for the text of the tree here: (text, line_map), or None for an object
# that is not a tree.

def _grail_source_for(tree, mode):
    if not isinstance(tree, AST):
        return None
    # A tree parsed and left alone is the source it was parsed from, exactly.
    # Checked by parsing that source again, because the tree may have been
    # changed since -- pytest's assertion rewriting does exactly that.
    # compare() stops at the first difference and writes nothing out: two
    # dump()s cost 7.7s of a 9.9s compile() of six's 1,054-line test file,
    # compare() 1.0s on an unchanged tree and nothing on pytest's, which
    # differs in its first statements.
    source = getattr(tree, '___grailSource___', None)
    if isinstance(source, str):
        try:
            if compare(parse(source, mode=mode), tree, compare_attributes=True):
                return (source, None)
        except Exception:
            pass
    return _grail_unparse_with_lines(tree)


def _grail_unparse_with_lines(tree):
    """unparse(tree), and for each line of it the line of the tree's statement
    it was written for: line_map[n] for output line n (line_map[0] unused).
    The unparser starts each statement on a line of its own, so the statement
    being written when a line begins is the one that line belongs to."""
    from _ast_unparse import Unparser

    class _LineUnparser(Unparser):
        # A tree may bind names no source can spell: pytest's assertion
        # rewriting names its temporaries ``@py_assert1'' and imports
        # ``builtins as @py_builtins'' precisely so they cannot collide with
        # the test's own.  CPython compiles the tree and never writes them
        # out; Grail has to, so they get a spelling that is still valid and
        # still cannot collide.
        def visit_Name(self, node):
            self.write(_grail_identifier(node.id))

        def visit_arg(self, node):
            self.write(_grail_identifier(node.arg))
            if node.annotation:
                self.write(": ")
                self.traverse(node.annotation)

        def visit_alias(self, node):
            self.write(node.name)
            if node.asname:
                self.write(" as " + _grail_identifier(node.asname))

        # ``*args'' and ``**kwargs'' are written without visit_arg.
        def visit_arguments(self, node):
            stars = [a for a in (node.vararg, node.kwarg) if a is not None]
            names = [a.arg for a in stars]
            for a in stars:
                a.arg = _grail_identifier(a.arg)
            try:
                super().visit_arguments(node)
            finally:
                for a, n in zip(stars, names):
                    a.arg = n

        # A keyword argument no source can spell reaches the callee under
        # that very name, as CPython passes it: ``**{name: value}''.
        def visit_keyword(self, node):
            if node.arg is None or node.arg.isidentifier():
                return super().visit_keyword(node)
            self.write(f"**{{{node.arg!r}: ")
            self.traverse(node.value)
            self.write("}")

        # A def or class may be named what no source can spell, too:
        # werkzeug's URL builder is ``<builder:'/static/<path:filename>'>``,
        # and it takes the function back out of exec()'s namespace under
        # that name.  So it is written as a valid identifier, then bound
        # under its own name as well, and given that name.
        def visit_FunctionDef(self, node):
            self._grail_def(node, super().visit_FunctionDef)

        def visit_AsyncFunctionDef(self, node):
            self._grail_def(node, super().visit_AsyncFunctionDef)

        def visit_ClassDef(self, node):
            self._grail_def(node, super().visit_ClassDef)

        def _grail_def(self, node, write):
            name = node.name
            spelled = _grail_identifier(name)
            if spelled == name:
                return write(node)
            node.name = spelled
            try:
                write(node)
            finally:
                node.name = name
            self.fill(f"locals()[{name!r}] = {spelled}")
            self.fill(f"{spelled}.__name__ = {name!r}")
            self.fill(f"{spelled}.__qualname__ = "
                      f"{spelled}.__qualname__[:-{len(spelled)}] + {name!r}")

        # A bare expression among an f-string's values -- the same builder
        # puts each converter's ``to_url()'' call straight into a JoinedStr --
        # is written as a field.  CPython's compiler joins it as it is, so it
        # has to be a str there (another type is a TypeError); a str comes
        # out of the field unchanged.
        def _write_ftstring_inner(self, node, is_format_spec=False):
            if isinstance(node, expr) and not isinstance(
                    node, (JoinedStr, Constant, FormattedValue, Interpolation)):
                node = FormattedValue(value=node, conversion=-1, format_spec=None)
            super()._write_ftstring_inner(node, is_format_spec=is_format_spec)

        def __init__(self):
            super().__init__()
            self._grail_line = 1
            self._grail_map = [0]

        def write(self, *text):
            for chunk in text:
                if chunk and len(self._grail_map) == 1:
                    self._grail_map.append(self._grail_line)
                for _ in range(chunk.count('\n')):
                    self._grail_map.append(self._grail_line)
            super().write(*text)

        def traverse(self, node):
            line = None
            if isinstance(node, (stmt, excepthandler, match_case)):
                line = getattr(node, 'lineno', None)
            if not isinstance(line, int):
                return super().traverse(node)
            saved = self._grail_line
            self._grail_line = line
            try:
                return super().traverse(node)
            finally:
                self._grail_line = saved

    unparser = _LineUnparser()
    text = unparser.visit(tree)
    return (text, unparser._grail_map)


def _grail_identifier(name):
    """name, or a valid identifier standing for it when it is not one.

    Reversible, because the original can still be asked for by NAME: pytest's
    -k compiles ``$pass'' and evaluates it against a mapping that strips the
    ``$'' -- builtins >> ___lookUpInLiveLocals___:ifAbsent: decodes it before
    asking.  ``_'' is written ``__'' and any other character that cannot
    appear ``_x<hex>_'', after a ``__grail_'' prefix."""
    if not isinstance(name, str) or name.isidentifier():
        return name
    out = []
    for c in name:
        if c == '_':
            out.append('__')
        elif c.isalnum() and c.isascii():
            out.append(c)
        else:
            out.append('_x%x_' % ord(c))
    return '__grail_' + ''.join(out)
