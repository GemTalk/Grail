"""A method from exec'd source still reads the exec's globals when it is copied.

exec compiles its source with the exec's globals as the compile SCOPE, and a
method of a class the source defines reads those globals through it.  Grail
copies a compiled method in four places, and each copy recompiled the
method's text WITHOUT that scope, so a global name bound to whatever else
answers to it -- usually the class Grail backs the module of that name with:

  * an instance attribute that shadows a method (pytest's unittest plugin
    sets the test method on the TestCase instance before every test and
    deletes it after) keeps the original under a second selector;
  * so does ``del C.m'', for a bound method captured before it;
  * a varargs method's forward is rewritten to reach that copy;
  * a class with two bases gets copies of the second base's methods.

Under pytest, every unittest-style test in a module whose asserts were
rewritten (so imported through exec) failed that way: ``jmespath.search(...)''
in jmespath's own tests ran ``search'' unbound, with its first argument as
the receiver.

The classes store an instance attribute, as a TestCase's setUp does: that
gives them slot accessors, which Grail compiles with a scope of their own,
and noting THAT scope instead of the exec's was the first version of this
fix's mistake -- it passed every check here until the store was added.

Every expectation was measured against CPython 3.14.
"""

import json

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


SOURCE = '''
import json

class Holder:
    def __init__(self):
        self.value = 1

    def dumped(self):
        return json.dumps([self.value])

    def spread(self, *args, **kwargs):
        return json.dumps(sorted(kwargs)) + json.dumps(list(args))

class Child(Holder):
    pass

class Other:
    def other(self):
        return json.dumps('o')

class Both(Other, Holder):
    pass
'''


def _patched(cls, name, *args, **kwargs):
    # pytest's unittest plugin: set the method on the instance, call it,
    # then delete the attribute and call it again.
    obj = cls()
    setattr(obj, name, getattr(obj, name))
    try:
        during = getattr(obj, name)(*args, **kwargs)
    finally:
        delattr(obj, name)
    return [during, getattr(obj, name)(*args, **kwargs)]


def _run(where):
    try:
        ns = {}
        if where == 'module':
            exec(SOURCE, globals())
            ns = globals()
        else:
            exec(SOURCE, ns)
        holder, child, both = ns['Holder'], ns['Child'], ns['Both']
        out = {
            'override': _patched(holder, 'dumped'),
            'override_varargs': _patched(holder, 'spread', 2, k=1),
            'override_on_a_subclass': _patched(child, 'dumped'),
            'merged_base_methods': [both().other(), both().dumped()],
        }
        captured = holder().dumped
        del holder.dumped
        out['bound_method_after_del'] = captured()
        return out
    except BaseException as exc:
        return '%s: %s' % (type(exc).__name__, str(exc)[:150])


WANT = {
    'override': ['[1]', '[1]'],
    'override_varargs': ['["k"][2]', '["k"][2]'],
    'override_on_a_subclass': ['[1]', '[1]'],
    'merged_base_methods': ['"o"', '[1]'],
    'bound_method_after_del': '[1]',
}

check('exec_into_a_dict', _run('dict'), WANT)
check('exec_into_a_module', _run('module'), WANT)
check('the_global_is_still_the_module', json.dumps(None), 'null')

SUMMARY = '%d checks, %d disagreeing' % (len(RESULTS), sum(1 for v in RESULTS.values() if v is not True))

if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
