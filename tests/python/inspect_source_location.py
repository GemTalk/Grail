"""inspect.getfile / getsourcefile / findsource, and a frame's co_firstlineno.

pytest renders each entry of a failure's traceback from these.  Grail's
inspect.getfile answered '<unknown>' for everything and findsource did not
exist, so every entry printed as ``<unknown>:361'' with ``???'' for its source;
and a frame's f_code carried co_firstlineno 0, which would have put the source
window one line before the start of the file.  pytest then constructs
inspect.BlockFinder to find where a failing statement ends, and that class was
missing too.

Expectations are measured against CPython 3.14.  Every check is phrased so it
holds whether this file runs as __main__ or is imported.
"""

import inspect
import os
import sys

RESULTS = {}
HERE = os.path.basename(__file__)


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:160])


def target(a, b=1):
    return sys._getframe()


class Holder:
    def method(self):
        return sys._getframe()

    @classmethod
    def cmethod(cls):
        return sys._getframe()


def _raise_here():
    raise ValueError('boom')


def _traceback():
    try:
        _raise_here()
    except ValueError as exc:
        tb = exc.__traceback__
        while tb.tb_next is not None:
            tb = tb.tb_next
        return tb


def _base(path):
    return os.path.basename(path)


def _def_line(fn):
    lines, start = inspect.findsource(fn)
    return lines[start].strip()


frame = target(0)
tb = _traceback()
module = sys.modules[__name__]

check('getfile_of_a_function', _base(inspect.getfile(target)), HERE)
check('getfile_of_its_code', _base(inspect.getfile(target.__code__)), HERE)
check('getfile_of_a_frame', _base(inspect.getfile(frame)), HERE)
check('getfile_of_a_traceback', _base(inspect.getfile(tb)), HERE)
check('getfile_of_a_bound_method', _base(inspect.getfile(Holder().method)), HERE)
check('getfile_of_the_module', _base(inspect.getfile(module)), HERE)
check('getsourcefile_of_a_function', _base(inspect.getsourcefile(target)), HERE)


def _type_error(obj):
    try:
        inspect.getfile(obj)
    except TypeError as exc:
        return str(exc)
    return 'no error'


check('getfile_refuses_a_non_code_object', _type_error(5),
      'module, class, method, function, traceback, frame, or code object '
      'was expected, got int')

check('findsource_of_a_function', _def_line(target), 'def target(a, b=1):')
check('findsource_of_a_method', _def_line(Holder.method), 'def method(self):')
check('findsource_of_a_frame', _def_line(frame), 'def target(a, b=1):')
check('findsource_of_a_traceback', _def_line(tb), 'def _raise_here():')
check('findsource_of_the_module', inspect.findsource(module)[1], 0)
check('findsource_lines_are_the_file',
      inspect.findsource(target)[0][0].startswith('"""inspect.getfile'), True)

# A frame's own code object starts where its def does -- a 0 here is what put
# pytest's source window one line before the file.
check('frame_firstlineno_is_the_def_line',
      frame.f_code.co_firstlineno == target.__code__.co_firstlineno, True)
check('method_frame_firstlineno',
      Holder().method().f_code.co_firstlineno == Holder.method.__code__.co_firstlineno,
      True)
check('classmethod_frame_firstlineno',
      Holder.cmethod().f_code.co_firstlineno == Holder.cmethod.__code__.co_firstlineno,
      True)
check('traceback_frame_firstlineno',
      tb.tb_frame.f_code.co_firstlineno == _raise_here.__code__.co_firstlineno, True)

# pytest's getstatementrange_ast builds one before it tokenizes.
finder = inspect.BlockFinder()
check('blockfinder_constructs', (finder.indent, finder.started, finder.last), (0, False, 1))
check('endofblock_is_an_exception', issubclass(inspect.EndOfBlock, Exception), True)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
