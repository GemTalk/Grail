"""Decorators on class-body defs apply in every nesting, whatever names them.

The probe matrix that diagnosed a silent drop: an ATTRIBUTE decorator whose
base was an enclosing def's LOCAL (``import types`` in the method,
``@types.coroutine`` on the nested class's def) never applied -- the class
kept the raw function, no error, because the emitted base read was a
closure-cell form that could not work at that position and the application
handler swallows failing decorators by design.  Five neighbouring shapes
worked, which made the sixth look impossible; all six are pinned here so a
regression names its row.  docs/Issues.md ('FIXED: an attribute decorator
with a method-local base...') keeps the full story.

Every expectation was checked against CPython 3.14 first.
"""

import types

RESULTS = {}


def check(name, fn, expected):
    try:
        RESULTS[name] = (fn() == expected) or repr(fn())
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)


def _tag(fn):
    def wrapped(*a, **k):
        return ('TAGGED', fn(*a, **k))
    return wrapped


class _NS:
    pass


_ns = _NS()
_ns.tag = _tag


# ---- the six rows ----------------------------------------------------------

class _ModuleLevel:
    @_tag
    def m(self):
        return 'module'


check('bare_global_on_module_class',
      lambda: _ModuleLevel().m(), ('TAGGED', 'module'))


def _function_nested_bare():
    def local_tag(fn):
        return _tag(fn)

    class C:
        @local_tag
        def m(self):
            return 'fn-bare'
    return C().m()


check('bare_local_in_function', _function_nested_bare, ('TAGGED', 'fn-bare'))


class _Host:
    def attr_global(self):
        class C:
            @_ns.tag
            def m(self):
                return 'attr-global'
        return C().m()

    def attr_local(self):
        ns = _NS()
        ns.tag = _tag

        class C:
            @ns.tag
            def m(self):
                return 'attr-local'
        return C().m()

    def module_attr_local_import(self):
        import types as t

        class C:
            @t.coroutine
            def m(self):
                yield 7
        g = C().m()
        return getattr(g, '_grail_iterable_coroutine', True) is True

    def local_reads_still_work(self):
        lv = 'captured'

        class C:
            attr = lv
        return C.attr


check('attr_instance_global_in_method',
      lambda: _Host().attr_global(), ('TAGGED', 'attr-global'))
check('attr_local_in_method',
      lambda: _Host().attr_local(), ('TAGGED', 'attr-local'))
check('module_attr_off_local_import_in_method',
      lambda: _Host().module_attr_local_import(), True)
check('class_body_reads_of_locals_unaffected',
      lambda: _Host().local_reads_still_work(), 'captured')


# ---- the consequence that found it ----------------------------------------

class _AnextHost:
    def build(self):
        import types as t

        class MyAsyncIter:
            def __init__(self):
                self.yielded = 0

            def __aiter__(self):
                return self

            @t.coroutine
            def __anext__(self):
                if False:
                    yield 'x'
                if self.yielded >= 1:
                    raise StopAsyncIteration()
                self.yielded += 1
                return 'item'
        return MyAsyncIter


def _decorated_anext_method_nested():
    ait = _AnextHost().build()()

    async def use():
        return await anext(ait, 'default')
    try:
        use().send(None)
        return '<suspended>'
    except StopIteration as exc:
        return exc.value


check('decorated_anext_in_method_nested_class_is_accepted',
      _decorated_anext_method_nested, 'item')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
