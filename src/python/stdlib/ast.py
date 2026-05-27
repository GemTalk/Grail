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


def parse(source, filename='<unknown>', mode='exec'):
    """Real CPython returns an AST.  Grail's stub returns a wrapper
    object so callers that just check for parse-time SyntaxError
    can do so (this helper doesn't actually validate Python
    syntax); anything that walks the tree will hit AttributeError."""
    if not isinstance(source, (str, bytes, bytearray)):
        raise TypeError('parse() expected a string')
    return _ParsedExpr(source, mode)


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
