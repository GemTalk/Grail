"""Fixture: a callable class attribute is a descriptor method, as in CPython.

CPython finds a descriptor's __get__, __set__ and __delete__ on its type
whatever they are (Objects/typeobject.c:10524-10566): ``D.__set__ =
Mock()'' makes every D a data descriptor, which dataclasses' TestDescriptors
relies on.  __set__ and __delete__ are called as methods -- a function is
bound to the descriptor, any other callable gets the target (and the value)
alone -- while __get__ is always called with the descriptor passed
explicitly, so a callable instance receives three arguments.  Grail honoured
only defs and lambdas, so a callable instance was not a descriptor at all.

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

r = {}

calls = []


class Recorder:
    def __init__(self, tag):
        self.tag = tag

    def __call__(self, *args):
        calls.append((self.tag, len(args)))
        return 'from ' + self.tag


class Late:
    pass


Late.__set__ = Recorder('set')
Late.__get__ = Recorder('get')
Late.__delete__ = Recorder('delete')


class InTheBody:
    __set__ = Recorder('body set')
    __get__ = Recorder('body get')


class OnlyGet:
    __get__ = Recorder('only get')


class Owner:
    late = Late()
    body = InTheBody()
    only = OnlyGet()


owner = Owner()
owner.late = 1
read = owner.late
del owner.late
r['assigned_after_the_class'] = [list(calls), read]
calls.clear()
owner.body = 2
r['assigned_in_the_body'] = [list(calls), owner.body]
calls.clear()
r['a_get_only_one_reads_through'] = [owner.only, list(calls)]
calls.clear()
owner.only = 'mine'
r['which_the_instance_shadows'] = [owner.only, list(calls)]


class WithFunctions:
    def __set__(self, obj, value):
        calls.append(('function set', type(self).__name__, value))


class Holder:
    held = WithFunctions()


calls.clear()
Holder().held = 3
r['a_function_is_still_bound'] = list(calls)

EXPECTED = {
    'assigned_after_the_class': [[('set', 2), ('get', 3), ('delete', 1)], 'from get'],
    'assigned_in_the_body': [[('body set', 2)], 'from body get'],
    'a_get_only_one_reads_through': ['from only get', [('only get', 3)]],
    'which_the_instance_shadows': ['mine', []],
    'a_function_is_still_bound': [('function set', 'WithFunctions', 3)],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-30s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
