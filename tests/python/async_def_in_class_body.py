# An ``async def`` inside a CLASS BODY was silently discarded -- the method
# simply did not exist.
#
#     class C:
#         async def m(self): ...
#     hasattr(C, 'm')        # False in Grail; True in CPython
#
# Nothing was reported, at parse time or after.  The parser gives a class-body
# def one of Instance/Static/ClassFunctionDefAst, and both ``async def'' parse
# paths then re-classed the node to AsyncFunctionDefAst UNCONDITIONALLY,
# overwriting that.  ClassDefAst collects a class's methods by selecting
# InstanceFunctionDefAst nodes, so the async def was collected by nothing.
# ``async def'' at MODULE scope was unaffected -- the node is a plain
# FunctionDefAst there and re-classing it costs nothing -- which is why this
# survived.
#
# AsyncFunctionDefAst is a pure MARKER: it adds no methods and overrides no
# codegen, because Grail emits ``async def'' as a regular def.  So declining to
# apply it inside a class body loses nothing that generates code, while applying
# it lost the method entirely.
#
# The visible consequence in test_with: ``with obj:'' on an object that defines
# __aenter__/__aexit__ is supposed to add "but it supports the asynchronous
# context manager protocol. Did you mean to use 'async with'?".  That check was
# already written and correct -- it just could never see the async defs, because
# they were not there.
#
# test_with FailureTestCase.testWithForAsyncManager.

r = {}


class C:
    async def m(self):
        return 'm'

    @staticmethod
    async def s():
        return 's'

    @classmethod
    async def c(cls):
        return 'c'


async def top():
    return 'top'


# --- the methods exist, by every route that should see them -------------------

r['methods_exist'] = repr([hasattr(C, n) for n in ('m', 's', 'c')])
r['methods_in_dir'] = repr([n in dir(C) for n in ('m', 's', 'c')])
r['methods_in_class_dict'] = repr(sorted(n for n in C.__dict__ if n in ('m', 's', 'c')))
# Module scope was never broken; pinned so a future fix cannot regress it.
r['module_level_async_def'] = repr(callable(top))


# --- which is what lets the 'async with' hint fire ----------------------------

class LacksExit:
    def __enter__(self): ...


class LacksEnter:
    def __exit__(self, t, v, tb): ...


class AsyncManager:
    async def __aenter__(self): ...
    async def __aexit__(self, t, v, tb): ...


class Neither:
    pass


def _with_error(cls):
    try:
        with cls():
            pass
    except TypeError as e:
        return str(e)
    return 'no error'


r['lacks_exit_msg'] = _with_error(LacksExit)
r['lacks_enter_msg'] = _with_error(LacksEnter)
r['neither_msg'] = _with_error(Neither)
# The one that changed: the hint had been written and was correct, but the
# __aenter__/__aexit__ it looks for did not exist to be found.
r['async_manager_msg'] = _with_error(AsyncManager)


# --- KNOWN GAPS, recorded rather than endorsed --------------------------------
# Both PRE-DATE this fix and are unchanged by it -- listing the methods is what
# makes them observable at all.  CPython is expected to DISAGREE with both.
#
# 1. Grail runs an async body SYNCHRONOUSLY and returns its value; CPython
#    returns a coroutine object.  There is no event loop, which is why the three
#    sibling test_with cases that actually drive a coroutine still fail.
r['async_call_runs_synchronously_is_a_known_gap'] = repr(
    [C().m(), C.s(), C.c()])

# 2. A staticmethod and a classmethod are both stored as an UnboundMethod, so
#    the class dict cannot tell the three kinds apart.  Same gap the
#    classify_class_attrs work recorded; see tests/python/dir_of_a_class.py.
r['async_kinds_indistinguishable_is_a_known_gap'] = repr(
    [type(C.__dict__[n]).__name__ for n in ('m', 's', 'c')])


EXPECTED = {
    'async_manager_msg': (
        "'AsyncManager' object does not support the context manager protocol "
        "(missed __exit__ method) but it supports the asynchronous context "
        "manager protocol. Did you mean to use 'async with'?"),
    'lacks_enter_msg': (
        "'LacksEnter' object does not support the context manager protocol "
        "(missed __enter__ method)"),
    'lacks_exit_msg': (
        "'LacksExit' object does not support the context manager protocol "
        "(missed __exit__ method)"),
    'methods_exist': '[True, True, True]',
    'methods_in_class_dict': "['c', 'm', 's']",
    'methods_in_dir': '[True, True, True]',
    'module_level_async_def': 'True',
    'neither_msg': (
        "'Neither' object does not support the context manager protocol "
        "(missed __exit__ method)"),
}

GRAIL_ONLY = {
    'async_call_runs_synchronously_is_a_known_gap': "['m', 's', 'c']",
    'async_kinds_indistinguishable_is_a_known_gap':
        "['UnboundMethod', 'UnboundMethod', 'UnboundMethod']",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-46s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
    for k in sorted(GRAIL_ONLY):
        actual = r[k]
        print('%-46s %s %s' % (k, 'XPASS' if actual == GRAIL_ONLY[k] else 'XFAIL', actual))
