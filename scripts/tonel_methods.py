"""Set methods in a Tonel class or extension file, for the scripts that GENERATE Smalltalk source
(identifier tables, Unicode tables, docstrings, test fixtures, ...).

    from tonel_methods import set_methods
    set_methods('src/Grail-PythonAst/PythonTokenizer.class.st', 'PythonTokenizer', [
        Method(meta=True, category='Grail-Identifiers', source='___xidStartRanges___\n\t^ #(...)\n'),
    ])

A method's `source` is its whole source string, exactly as GemStone keeps it (message pattern,
then the body). It is written so that Rowan's Tonel reader gives back exactly that string: the
declaration is the message pattern, the body is the rest, and one extra line ending goes before
the closing bracket (the reader trims one). Existing methods are replaced in place; new ones are
inserted in canonical order (class side first, then by selector).
"""
import collections
import re

Method = collections.namedtuple('Method', 'meta category source')

_IDENT = re.compile(r'[A-Za-z_][A-Za-z0-9_]*')
_BLOCK_START = re.compile(r"^\{ #category : '(?:[^'\\]|\\.)*' \}\n(\S+)( class)? >> ", re.M)


def pattern_end(src):
    """Index just past the message pattern at the start of a method source."""
    n = len(src)

    def skip_ws(j):
        while j < n and src[j] in ' \t\r\n\f':
            j += 1
        return j

    m = _IDENT.match(src)
    if m and not (m.end() < n and src[m.end()] == ':'):
        return m.end()                                   # unary
    if m:                                                # keyword
        j, end = 0, None
        while True:
            m = _IDENT.match(src, j)
            if not (m and m.end() < n and src[m.end()] == ':'):
                return end
            j = skip_ws(m.end() + 1)
            a = _IDENT.match(src, j)
            if not a:
                raise ValueError('no argument after keyword in: ' + src[:60])
            end = a.end()
            j = skip_ws(end)
    m = re.match(r'[-+*/\\<>=~@%|&?,]+', src)            # binary
    if not m:
        raise ValueError('no message pattern in: ' + src[:60])
    a = _IDENT.match(src, skip_ws(m.end()))
    if not a:
        raise ValueError('no argument after binary selector in: ' + src[:60])
    return a.end()


def selector_of(source):
    decl = source[:pattern_end(source)]
    keywords = re.findall(r'([A-Za-z_][A-Za-z0-9_]*:)', decl)
    return ''.join(keywords) if keywords else decl.split()[0]


def _ston_string(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def render(class_name, method):
    end = pattern_end(method.source)
    decl, body = method.source[:end], method.source[end:]
    side = class_name + (' class' if method.meta else '')
    return ('{ #category : ' + _ston_string(method.category) + ' }\n'
            + side + ' >> ' + decl + ' [' + body + '\n]\n')


def _order_key(meta, selector):
    # Rowan sorts class-side methods first, then in its unicode order: case-insensitive, with
    # '_' before letters and digits. Only new methods are placed by this key.
    return (not meta, re.sub(r'[^a-z0-9\x01]', '', selector.lower().replace('_', '\x01')), selector)


def set_methods(path, class_name, methods):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    starts = [m.start() for m in _BLOCK_START.finditer(text)]
    header = text[:starts[0] - 1] if starts else text.rstrip('\n') + '\n'
    blocks = []
    for i, a in enumerate(starts):
        b = starts[i + 1] - 1 if i + 1 < len(starts) else len(text)
        block = text[a:b]
        m = _BLOCK_START.match(block)
        decl_start = m.end()
        bracket = block.index(' [', decl_start)
        blocks.append([bool(m.group(2)), selector_of(block[decl_start:bracket] + '\n'), block])
    for method in methods:
        sel = selector_of(method.source)
        new = render(class_name, method)
        for blk in blocks:
            if blk[0] == method.meta and blk[1] == sel:
                blk[2] = new
                break
        else:
            key = _order_key(method.meta, sel)
            i = 0
            while i < len(blocks) and _order_key(blocks[i][0], blocks[i][1]) < key:
                i += 1
            blocks.insert(i, [method.meta, sel, new])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(header + ''.join('\n' + blk[2] for blk in blocks))
