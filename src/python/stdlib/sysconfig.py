"""Access to Python's configuration information.

GRAIL: a SUBSET, and the subset is the part whose answers Grail can actually
know.  CPython's sysconfig reports what the interpreter was BUILT with, read
out of a generated `_sysconfigdata_*` module and the Makefile that produced it.
Grail is not built that way -- it is a Python implemented in GemStone
Smalltalk -- so there is no build configuration to report, and inventing one
would be worse than not having it.

What IS here derives from `sys`, which is Grail's own truth: the installation
path scheme (`get_path`, `get_paths`), the version, and the platform.  Callers
that only want to know "where does the stdlib live" or "what version is this"
-- which is what pydoc, site, and packaging tools mostly want -- are served.

`get_config_var` answers None for anything it has no honest value for, which
is what CPython does for an unknown name too, so a caller that probes for an
optional setting behaves the same.  It does NOT fabricate compiler flags,
`SOABI`, or `LIBDIR`.

Note that `sys.prefix` is empty in Grail -- there is no install prefix in the
CPython sense -- so the posix_prefix paths come back rooted at ''.  That is
reported rather than papered over: a caller comparing a real file path against
`get_path('stdlib')` will simply not match, which is the correct outcome when
the stdlib is not on a filesystem path of that shape.
"""

import os
import sys

__all__ = [
    'get_config_var',
    'get_config_vars',
    'get_path',
    'get_path_names',
    'get_paths',
    'get_platform',
    'get_python_version',
    'get_scheme_names',
]


_INSTALL_SCHEMES = {
    'posix_prefix': {
        'stdlib': '{installed_base}/{platlibdir}/python{py_version_short}',
        'platstdlib': '{platbase}/{platlibdir}/python{py_version_short}',
        'purelib': '{base}/lib/python{py_version_short}/site-packages',
        'platlib': '{platbase}/{platlibdir}/python{py_version_short}/site-packages',
        'include': '{installed_base}/include/python{py_version_short}',
        'platinclude': '{installed_platbase}/include/python{py_version_short}',
        'scripts': '{base}/bin',
        'data': '{base}',
    },
    'nt': {
        'stdlib': '{installed_base}/Lib',
        'platstdlib': '{base}/Lib',
        'purelib': '{base}/Lib/site-packages',
        'platlib': '{base}/Lib/site-packages',
        'include': '{installed_base}/Include',
        'platinclude': '{installed_base}/Include',
        'scripts': '{base}/Scripts',
        'data': '{base}',
    },
}

_PY_VERSION_SHORT = '%d.%d' % sys.version_info[:2]


def _default_scheme():
    return 'nt' if os.name == 'nt' else 'posix_prefix'


def get_scheme_names():
    """Return a tuple containing the schemes names."""
    return tuple(sorted(_INSTALL_SCHEMES))


def get_path_names():
    """Return a tuple containing the paths names."""
    return tuple(_INSTALL_SCHEMES[_default_scheme()])


def _expand(scheme, vars):
    res = {}
    for name, template in _INSTALL_SCHEMES[scheme].items():
        value = template
        for key, val in vars.items():
            value = value.replace('{%s}' % key, str(val))
        res[name] = os.path.normpath(value) if value else value
    return res


def _base_vars():
    prefix = getattr(sys, 'prefix', '')
    exec_prefix = getattr(sys, 'exec_prefix', '') or prefix
    return {
        'base': prefix,
        'platbase': exec_prefix,
        'installed_base': getattr(sys, 'base_prefix', '') or prefix,
        'installed_platbase': getattr(sys, 'base_exec_prefix', '') or exec_prefix,
        'platlibdir': getattr(sys, 'platlibdir', 'lib'),
        'py_version_short': _PY_VERSION_SHORT,
        'py_version': '%d.%d.%d' % sys.version_info[:3],
        'py_version_nodot': '%d%d' % sys.version_info[:2],
    }


def get_paths(scheme=None, vars=None, expand=True):
    """Return a mapping containing an install scheme."""
    if scheme is None:
        scheme = _default_scheme()
    if not expand:
        return dict(_INSTALL_SCHEMES[scheme])
    merged = _base_vars()
    if vars:
        merged.update(vars)
    return _expand(scheme, merged)


def get_path(name, scheme=None, vars=None, expand=True):
    """Return a path corresponding to the scheme."""
    return get_paths(scheme, vars, expand)[name]


def get_python_version():
    """Return 'major.minor' of the running Python, as a string."""
    return _PY_VERSION_SHORT


def get_platform():
    """Return a string identifying the platform.

    Derived from sys.platform rather than from build configuration, so it names
    the operating system without the CPython build's architecture suffix.
    """
    return getattr(sys, 'platform', 'unknown')


def get_config_vars(*args):
    """Return a dictionary of the configuration variables, or the named subset.

    Only the variables Grail can answer honestly are present; see the module
    docstring.  An unknown name answers None, as it does in CPython.
    """
    vars = _base_vars()
    vars['prefix'] = vars['base']
    vars['exec_prefix'] = vars['platbase']
    vars['VERSION'] = _PY_VERSION_SHORT
    vars['EXT_SUFFIX'] = '.so'
    vars['SO'] = '.so'
    if not args:
        return vars
    return [vars.get(name) for name in args]


def get_config_var(name):
    """Return the value of a single variable, or None if it is not known."""
    return get_config_vars().get(name)
