"""Make the synthetic Grail n or m for tests/scripts/run_grail_upgrade_test.sh:

    python3 make_variant.py <grail tree> n|m

Edits the Tonel in <grail tree> (a copy, never the checkout) so that the upgrade
from n to m carries one change of each kind a real release can make:

  changed method  _grail_upgrade_probe answers 'n' in n and 'm' in m, on a Grail
                  class (BaseException, complex) and on kernel classes through
                  Grail's session methods (Object)
  removed method  BaseException>>_grail_upgrade_removed is in n only
  removed class   GrailUpgradeDoomed is in n only
  added class     GrailUpgradeAdded is in m only
  shape change    complex gains an instance variable in m

Both variants are the tree's own Grail plus these edits, so the test needs no
second release to upgrade from.
"""
import os
import re
import sys

tree, variant = sys.argv[1], sys.argv[2]
assert variant in ('n', 'm'), variant
sys.path.insert(0, os.path.join(tree, 'scripts'))
from tonel_methods import Method, set_methods  # noqa: E402

CATEGORY = 'Grail-Upgrade Test'


def path(package, name):
    return os.path.join(tree, 'src', package, name)


def probe():
    return Method(meta=False, category=CATEGORY,
                  source="_grail_upgrade_probe\n\t^ '%s'\n" % variant)


set_methods(path('Grail-Python-PyEnv', 'BaseException.extension.st'), 'BaseException',
            [probe()] + ([Method(meta=False, category=CATEGORY,
                                 source="_grail_upgrade_removed\n\t^ 'removed in m'\n")]
                         if variant == 'n' else []))
set_methods(path('Grail-Python-PyEnv', 'complex.extension.st'), 'complex', [probe()])
set_methods(path('Grail-Kernel-PyEnv', 'Object.extension.st'), 'Object', [probe()])


def add_class(name):
    with open(path('Grail-Python', name + '.class.st'), 'w', encoding='utf-8') as f:
        f.write('"A class the synthetic Grail %s has and the other does not."\n'
                'Class {\n'
                "\t#name : '%s',\n"
                "\t#superclass : 'Object',\n"
                "\t#category : 'Grail-Upgrade Test'\n"
                '}\n' % (variant, name))


if variant == 'n':
    add_class('GrailUpgradeDoomed')
else:
    add_class('GrailUpgradeAdded')
    complex_file = path('Grail-Python', 'complex.class.st')
    with open(complex_file, encoding='utf-8') as f:
        text = f.read()
    text, count = re.subn(r"(\t#superclass : 'object',\n)",
                          r"\1\t#instVars : [\n\t\t'grailUpgradeSlot'\n\t],\n", text, count=1)
    assert count == 1, 'complex.class.st no longer has the shape this script edits'
    with open(complex_file, 'w', encoding='utf-8') as f:
        f.write(text)
print('make_variant: synthetic Grail %s in %s' % (variant, tree))
