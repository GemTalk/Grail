"""importlib.metadata finds installed distributions (#1657).

Grail's importlib.metadata was a hand-written stub: version() answered from a
fixed table of Flask-stack names with '+grail' suffixes, metadata() did not
exist, and nothing ever read a dist-info directory.  It is now CPython 3.14's
package, vendored verbatim, and it needed three things from Grail:

  * a discovery hook -- Distribution.discover() asks each sys.meta_path finder
    for find_distributions, and Grail's only finder had none;
  * a classmethod overriding an instance method of an ABCMeta class read as the
    base's function when it took an argument -- MetadataPathFinder's
    find_distributions is exactly that shape;
  * vars(obj) answered a snapshot, so ``vars(self).update(...)`` -- how
    EntryPoint and _adapters.Message initialise themselves -- was lost.

The rows build a throwaway dist-info and put its directory on sys.path, so
they mean the same thing under CPython and Grail.  Not covered here: the text
of PackageNotFoundError, which names None in Grail until a getter-only
property can override ImportError.name (#1660).

EXPECTED is CPython 3.14's output; mismatches() is what the Smalltalk test case
asserts is empty.
"""

import abc
import importlib.metadata as md
import os
import sys
import tempfile

r = {}


def t(label, thunk):
    try:
        r[label] = repr(thunk())
    except Exception as e:
        r[label] = '%s: %s' % (type(e).__name__, e)


# --- a classmethod over an instance method, under a metaclass -------------

class Meta(type):
    pass


class AbcBase(abc.ABC):
    @abc.abstractmethod
    def f(self, context=None):
        pass


class AbcImpl(AbcBase):
    @classmethod
    def f(cls, context=1):
        return (cls.__name__, context)


class MetaBase(metaclass=Meta):
    def g(self, c):
        return 'instance g'


class MetaImpl(MetaBase):
    @classmethod
    def g(cls, c):
        return (cls.__name__, c)

    @staticmethod
    def h(a, b):
        return a + b


t('abc_classmethod_positional', lambda: AbcImpl.f(5))
t('abc_classmethod_default', lambda: AbcImpl.f())
t('abc_classmethod_keyword', lambda: AbcImpl.f(context=7))
t('abc_classmethod_type', lambda: type(AbcImpl.f).__name__)
t('meta_classmethod_one_arg', lambda: MetaImpl.g(3))
t('meta_staticmethod_two_args', lambda: MetaImpl.h(2, 3))
t('meta_instance_still_bound', lambda: MetaImpl().g(4))


# --- vars(obj) is obj.__dict__ ---------------------------------------------

class Frozen:
    def __init__(self, name, group):
        vars(self).update(name=name, group=group)

    def __setattr__(self, k, v):
        raise AttributeError('immutable')


class Source:
    def __init__(self):
        self._headers = [('a', 1)]
        self.x = 2


class Copy(Source):
    def __new__(cls, orig):
        res = super().__new__(cls)
        vars(res).update(vars(orig))
        return res

    def __init__(self, *a):
        pass


def vars_setitem():
    s = Source()
    vars(s)['y'] = 3
    return s.y, vars(s) is not None and sorted(vars(s))


t('vars_update_on_frozen', lambda: (Frozen('n', 'g').name, Frozen('n', 'g').group))
t('vars_copy_state', lambda: (Copy(Source())._headers, Copy(Source()).x))
t('vars_setitem', vars_setitem)


# --- importlib.metadata against a dist-info on sys.path --------------------

DIST = """Metadata-Version: 2.1
Name: grail-demo-dist
Version: 1.2.3
Summary: A throwaway distribution
Requires-Dist: attrs>=20
Requires-Dist: click; extra == "cli"
"""

ENTRY_POINTS = """[console_scripts]
grail-demo = grail_demo.cli:main

[grail_demo.plugins]
first = grail_demo.plugins:first
"""


def with_dist(thunk):
    d = tempfile.mkdtemp()
    info = os.path.join(d, 'grail_demo_dist-1.2.3.dist-info')
    os.mkdir(info)
    with open(os.path.join(info, 'METADATA'), 'w') as fh:
        fh.write(DIST)
    with open(os.path.join(info, 'entry_points.txt'), 'w') as fh:
        fh.write(ENTRY_POINTS)
    with open(os.path.join(info, 'top_level.txt'), 'w') as fh:
        fh.write('grail_demo\n')
    sys.path.insert(0, d)
    try:
        return thunk()
    finally:
        sys.path.remove(d)


t('version', lambda: with_dist(lambda: md.version('grail-demo-dist')))
t('version_normalised_name', lambda: with_dist(lambda: md.version('Grail_Demo.Dist')))
t('metadata_fields', lambda: with_dist(lambda: (
    md.metadata('grail-demo-dist')['Name'],
    md.metadata('grail-demo-dist')['Summary'])))
t('requires', lambda: with_dist(lambda: md.requires('grail-demo-dist')))
t('distribution_name', lambda: with_dist(lambda: md.distribution('grail-demo-dist').name))
t('entry_point', lambda: with_dist(lambda: [
    (ep.name, ep.value, ep.group, ep.module, ep.attr)
    for ep in md.entry_points(group='grail_demo.plugins')]))
t('entry_point_select_by_name', lambda: with_dist(lambda: [
    ep.value for ep in md.entry_points(group='console_scripts', name='grail-demo')]))
t('packages_distributions', lambda: with_dist(lambda: md.packages_distributions().get('grail_demo')))
t('explicit_path', lambda: with_dist(lambda: sorted(
    dist.metadata['Name'] for dist in md.distributions(path=[sys.path[0]]))))
def missing_raises():
    # The TYPE only: the message names None in Grail until #1660.
    try:
        md.version('no-such-dist-xyz-grail')
    except md.PackageNotFoundError as e:
        return type(e).__name__, e.args


t('missing_raises', missing_raises)
t('missing_is_module_not_found', lambda: issubclass(md.PackageNotFoundError, ModuleNotFoundError))
t('finder_has_hook', lambda: any(hasattr(f, 'find_distributions') for f in sys.meta_path))


EXPECTED = {
    'abc_classmethod_default': "('AbcImpl', 1)",
    'abc_classmethod_keyword': "('AbcImpl', 7)",
    'abc_classmethod_positional': "('AbcImpl', 5)",
    'abc_classmethod_type': "'method'",
    'distribution_name': "'grail-demo-dist'",
    'entry_point': "[('first', 'grail_demo.plugins:first', 'grail_demo.plugins', 'grail_demo.plugins', 'first')]",
    'entry_point_select_by_name': "['grail_demo.cli:main']",
    'explicit_path': "['grail-demo-dist']",
    'finder_has_hook': 'True',
    'meta_classmethod_one_arg': "('MetaImpl', 3)",
    'meta_instance_still_bound': "('MetaImpl', 4)",
    'meta_staticmethod_two_args': '5',
    'metadata_fields': "('grail-demo-dist', 'A throwaway distribution')",
    'missing_is_module_not_found': 'True',
    'missing_raises': "('PackageNotFoundError', ('no-such-dist-xyz-grail',))",
    'packages_distributions': "['grail-demo-dist']",
    'requires': '[\'attrs>=20\', \'click; extra == "cli"\']',
    'vars_copy_state': "([('a', 1)], 2)",
    'vars_setitem': "(3, ['_headers', 'x', 'y'])",
    'vars_update_on_frozen': "('n', 'g')",
    'version': "'1.2.3'",
    'version_normalised_name': "'1.2.3'",
}


def mismatches():
    return sorted(k for k in EXPECTED if r.get(k) != EXPECTED[k])


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-4s %s: %r' % ('OK' if actual == EXPECTED[k] else 'DIFF', k, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('DIFF', extra))
