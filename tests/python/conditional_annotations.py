"""Fixture: an annotation inside an if, a loop, a try, a with or a match is in
its module's or class's annotations exactly when it ran.

PEP 649 evaluates annotations lazily, so CPython 3.14 records which of them
executed -- every module-level one, and a class's conditional ones -- in a
set named ``__conditional_annotations__``, and the annotate function lists
only those.  Grail listed only the annotations at the top of the body, so
one inside a compound statement was never there, executed or not.  Two more
pieces of the same machinery:

  * a module read mid-import (an import cycle) has the annotations that ran
    so far, and does not cache them, since the rest of its body adds more;
  * ``x: int = 1`` inside a class-body loop failed to compile at all
    ("undefined symbol x").

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
r = {}

SCOPED = {
    'if_elif_else': '''
if not len:
    in_if: "if"
elif len:
    in_elif: "elif"
else:
    in_else: "else"
''',
    'for_else': '''
for _ in range(1):
    in_for: "for"
else:
    in_else: "else"
''',
    'while_break': '''
while True:
    in_while: "while"
    break
else:
    in_else: "else"
''',
    'try_except_finally': '''
try:
    raise ValueError
    in_try: "try"
except ValueError:
    in_except: "except"
else:
    in_else: "else"
finally:
    in_finally: "finally"
''',
    'try_star': '''
try:
    raise ValueError
except* ValueError:
    in_except_star: "except*"
''',
    'with_swallowed': '''
class Swallower:
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return True
with Swallower():
    about_to_raise: "with"
    raise ValueError
    after_raise: "after"
''',
    'match': '''
match 2:
    case 1:
        one: "one"
    case 2:
        two: "two"
''',
    'never_run_is_not_evaluated': '''
if not len:
    never: undefined_name
ran: int
''',
    'value_in_loop': '''
for _ in range(1):
    counted: int = 7
''',
}


def module_annotations(code):
    ns = {}
    exec(code, ns)
    return ns['__annotate__'](1)


def class_annotations(code):
    ns = {}
    exec('class Cls:\n' + ''.join('    ' + line + '\n' for line in code.strip().splitlines()), ns)
    return ns['Cls'].__annotations__


for name, code in SCOPED.items():
    r['module_' + name] = module_annotations(code)
    r['class_' + name] = class_annotations(code)

value_in_loop = {}
exec('class Counted:\n    for _ in range(1):\n        counted: int = 7\n', value_in_loop)
r['class_value_in_loop_binds'] = value_in_loop['Counted'].counted

record = {}
exec('a: int\nif not len:\n    b: int\nc: int\n', record)
r['module_record'] = [type(record['__conditional_annotations__']).__name__,
                      sorted(record['__conditional_annotations__'])]
klass = {}
exec('class K:\n    if len:\n        x: int\n', klass)
r['class_record_not_in_dict'] = '__conditional_annotations__' in vars(klass['K'])

sys.modules.pop('pkg_partial_annotations', None)
sys.modules.pop('pkg_partial_annotations.first', None)
sys.modules.pop('pkg_partial_annotations.second', None)
partial = importlib.import_module('pkg_partial_annotations')
r['mid_import'] = [partial.second.seen_mid_import, partial.second.cached_mid_import]
r['after_import'] = [partial.first.__annotations__, '__annotations__' in vars(partial.first)]

EXPECTED = {
    'module_if_elif_else': {'in_elif': 'elif'},
    'class_if_elif_else': {'in_elif': 'elif'},
    'module_for_else': {'in_for': 'for', 'in_else': 'else'},
    'class_for_else': {'in_for': 'for', 'in_else': 'else'},
    'module_while_break': {'in_while': 'while'},
    'class_while_break': {'in_while': 'while'},
    'module_try_except_finally': {'in_except': 'except', 'in_finally': 'finally'},
    'class_try_except_finally': {'in_except': 'except', 'in_finally': 'finally'},
    'module_try_star': {'in_except_star': 'except*'},
    'class_try_star': {'in_except_star': 'except*'},
    'module_with_swallowed': {'about_to_raise': 'with'},
    'class_with_swallowed': {'about_to_raise': 'with'},
    'module_match': {'two': 'two'},
    'class_match': {'two': 'two'},
    'module_never_run_is_not_evaluated': {'ran': int},
    'class_never_run_is_not_evaluated': {'ran': int},
    'module_value_in_loop': {'counted': int},
    'class_value_in_loop': {'counted': int},
    'class_value_in_loop_binds': 7,
    'module_record': ['set', [0, 2]],
    'class_record_not_in_dict': False,
    'mid_import': [{'before': int}, False],
    'after_import': [{'before': int, 'after': int}, True],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        ok = r.get(key, '<missing>') == EXPECTED[key]
        print('%-37s %s' % (key, 'OK' if ok else 'FAIL'))
        if not ok:
            print('    got  %r' % (r.get(key, '<missing>'),))
            print('    want %r' % (EXPECTED[key],))
    print(SUMMARY)
