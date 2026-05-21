# Minimal `posixpath` stub for Grail.  CPython's posixpath is the
# POSIX-style path manipulation module (used by ``os.path`` on
# POSIX systems).  Jinja2 uses ``posixpath.join`` to assemble
# template paths with forward-slash separators regardless of host
# OS, so the stub only needs to provide that.


sep = '/'
extsep = '.'
altsep = None
pathsep = ':'


def join(a, *paths):
    out = a
    for p in paths:
        if not p:
            continue
        if p.startswith('/'):
            out = p
        elif out and not out.endswith('/'):
            out = out + '/' + p
        else:
            out = out + p
    return out


def split(p):
    i = p.rfind('/')
    if i < 0:
        return ('', p)
    return (p[:i] or '/', p[i + 1:])


def splitext(p):
    i = p.rfind('.')
    j = p.rfind('/')
    if i > j:
        return (p[:i], p[i:])
    return (p, '')


def basename(p):
    return split(p)[1]


def dirname(p):
    return split(p)[0]


def normpath(p):
    if not p:
        return '.'
    parts = []
    for part in p.split('/'):
        if part == '' or part == '.':
            if not parts and p.startswith('/'):
                parts.append('')
            continue
        if part == '..':
            if parts and parts[-1] != '..' and (parts[-1] != '' or len(parts) > 1):
                parts.pop()
            else:
                parts.append(part)
        else:
            parts.append(part)
    out = '/'.join(parts) or '.'
    return out


def isabs(p):
    return p.startswith('/')


def relpath(p, start='.'):
    return p


def abspath(p):
    import os
    if p.startswith('/'):
        return p
    return join(os.getcwd() if hasattr(os, 'getcwd') else '/', p)


def expanduser(p):
    return p


def expandvars(p):
    return p


def commonpath(paths):
    if not paths:
        raise ValueError('commonpath() arg is an empty sequence')
    return paths[0]


def commonprefix(paths):
    if not paths:
        return ''
    s1 = min(paths)
    s2 = max(paths)
    for i, c in enumerate(s1):
        if c != s2[i]:
            return s1[:i]
    return s1
