# Regression fixture for #1460: frame and function introspection pytest reads.
#
#  * a module-level function's __dict__ -- pytest's Function.__init__ does
#    ``self.keywords.update(self.obj.__dict__)'' for every collected test, and
#    Grail raised AttributeError (a module function is a BoundMethod on its
#    module, whose __dict__ only bound methods answered);
#  * code.co_varnames and inspect.getargs -- pytest's failure report reads
#    the arguments of every frame it shows through them;
#  * live-frame f_locals and co_firstlineno, which the issue listed and which
#    already worked on main when this was written -- kept here so they stay so.
#
# Expected values are what CPython 3.14 answers.

import functools
import inspect
import sys

RESULTS = {}


def plain(a, b=2, *args, c, **kw):
    pass


def no_attrs():
    pass


plain.mark = 1


def _live_write():
    plain.__dict__['written'] = 2
    return plain.written


def _wraps_copies():
    @functools.wraps(plain)
    def wrapper(*a, **k):
        pass
    return wrapper.mark, wrapper.__wrapped__ is plain


RESULTS['function_dict_empty'] = no_attrs.__dict__ == {}
RESULTS['function_dict'] = plain.__dict__ == {'mark': 1}
RESULTS['function_dict_is_live'] = _live_write() == 2
RESULTS['functools_wraps_copies_it'] = _wraps_copies() == (1, True)
RESULTS['pytest_keywords_update'] = (
    (lambda kw: (kw.update(no_attrs.__dict__), kw)[1])({}) == {})


class K:
    def method(self, q, *, r):
        pass

    @staticmethod
    def static(u):
        pass


RESULTS['co_varnames_parameters'] = plain.__code__.co_varnames == (
    'a', 'b', 'c', 'args', 'kw')
RESULTS['co_varnames_method'] = K.method.__code__.co_varnames == ('self', 'q', 'r')
RESULTS['getargs'] = inspect.getargs(plain.__code__) == (
    ['a', 'b', 'c'], 'args', 'kw')
RESULTS['getargs_method'] = inspect.getargs(K.method.__code__) == (
    ['self', 'q', 'r'], None, None)
RESULTS['getargs_static'] = inspect.getargs(K.static.__code__) == (['u'], None, None)


def _not_code():
    try:
        inspect.getargs(5)
    except TypeError as e:
        return str(e)


RESULTS['getargs_refuses_non_code'] = _not_code() == '5 is not a code object'
RESULTS['compiled_module_code_varnames'] = (
    compile('x = 1', '<s>', 'exec').co_varnames == ())


def _module_frame_code():
    try:
        exec(compile('1 / 0', '<module-level>', 'exec'), {})
    except ZeroDivisionError:
        tb = sys.exc_info()[2]
        while tb.tb_next is not None:
            tb = tb.tb_next
        return tb.tb_frame.f_code


# pytest renders every traceback frame's arguments through getargs, module
# frames included -- a collection error's report crashed on this.
RESULTS['module_frame_varnames_and_getargs'] = (
    _module_frame_code().co_varnames == ()
    and inspect.getargs(_module_frame_code()) == ([], None, None))
RESULTS['replace_keeps_varnames'] = (
    plain.__code__.replace(co_name='renamed').co_varnames
    == plain.__code__.co_varnames)


def _live_frame():
    __tracebackhide__ = True
    x = 5
    return sys._getframe().f_locals


def _caller():
    z = 'outer'
    return _callee()


def _callee():
    return sys._getframe(1).f_locals.get('z')


RESULTS['live_frame_f_locals'] = (
    _live_frame()['__tracebackhide__'] is True and _live_frame()['x'] == 5)
RESULTS['caller_frame_f_locals'] = _caller() == 'outer'
RESULTS['co_firstlineno_is_the_def_line'] = (
    plain.__code__.co_firstlineno == 21 and K.method.__code__.co_firstlineno == 53)


# A KNOWN DIFFERENCE, pinned: CPython continues co_varnames with the body's
# locals in order of first use; Grail records the parameters only, because
# its parser keeps a scope's names unordered (FunctionDefAst >>
# ___coVarnames___).  XFAIL under CPython; the Smalltalk test asserts the
# Grail value, so the day locals are recorded this has to be revisited.
def with_locals(p):
    first = 1
    second = 2
    return first + second


GRAIL_ONLY = {
    'co_varnames_with_locals': repr(('p',)),
}
r_grail_only = {
    'co_varnames_with_locals': repr(with_locals.__code__.co_varnames),
}

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
    for _name in sorted(GRAIL_ONLY):
        _actual = r_grail_only[_name]
        print('%-5s %s %s' % ('XFAIL' if _actual != GRAIL_ONLY[_name] else 'XPASS',
                              _name, _actual))
