# ``async with`` drives __aenter__/__aexit__, not __enter__/__exit__.
#
# AsyncWithAst inherited WithAst's codegen wholesale and overrode nothing, so
# ``async with'' emitted a plain ``with''.  Two consequences, both silent:
#
#   * an object implementing only __aenter__/__aexit__ was reported as
#     ``does not support the CONTEXT MANAGER protocol (missed __exit__ method)''
#     -- the wrong protocol AND the wrong method.
#   * a SYNCHRONOUS manager under ``async with'' quietly SUCCEEDED, running
#     __enter__/__exit__, where CPython raises TypeError.
#
# The two halves are coroutines now, so the shared emit drives them through
# ___grailAwait___: -- CPython's ``await mgr.__aenter__()''.  That helper passes
# a non-coroutine through unchanged, so the synchronous path is untouched.
#
# test_with FailureTestCase testAsyncEnterAttributeError /
# testAsyncExitAttributeError / testAsyncWithForSyncManager.

r = {}
log = []


class AM:
    async def __aenter__(self):
        log.append('enter')
        return 'resource'

    async def __aexit__(self, t, v, tb):
        log.append('exit:%s' % (t.__name__ if t else None))
        return False


class Suppress(AM):
    async def __aexit__(self, t, v, tb):
        log.append('suppress')
        return True


class SyncManager:
    def __enter__(self): ...
    def __exit__(self, t, v, tb): ...


class LacksAEnter:
    async def __aexit__(self, t, v, tb): ...


class LacksAExit:
    async def __aenter__(self): ...


class Neither:
    pass


async def _use(cls):
    async with cls():
        pass


async def _ok():
    async with AM() as res:
        log.append('body:%s' % res)


async def _boom():
    async with AM():
        raise ValueError('x')


async def _swallowed():
    async with Suppress():
        raise ValueError('y')
    return 'continued'


def _drive(c):
    try:
        c.send(None)
        return 'no StopIteration'
    except StopIteration as e:
        return e.value
    except BaseException as e:
        return '%s: %s' % (type(e).__name__, e)


# --- the protocol runs, in order ------------------------------------------------

log.clear()
r['ok_result'] = repr(_drive(_ok()))
r['ok_order'] = repr(list(log))

log.clear()
r['exception_propagates'] = repr(_drive(_boom()))
r['exception_order'] = repr(list(log))

log.clear()
r['aexit_can_suppress'] = repr(_drive(_swallowed()))


# --- and names the ASYNCHRONOUS protocol when it is missing ----------------------

r['sync_manager_msg'] = _drive(_use(SyncManager))
r['lacks_aenter_msg'] = _drive(_use(LacksAEnter))
r['lacks_aexit_msg'] = _drive(_use(LacksAExit))
r['neither_msg'] = _drive(_use(Neither))


EXPECTED = {
    'aexit_can_suppress': "'continued'",
    'exception_order': "['enter', 'exit:ValueError']",
    'exception_propagates': "'ValueError: x'",
    'lacks_aenter_msg': ("TypeError: 'LacksAEnter' object does not support the asynchronous "
                         "context manager protocol (missed __aenter__ method)"),
    'lacks_aexit_msg': ("TypeError: 'LacksAExit' object does not support the asynchronous "
                        "context manager protocol (missed __aexit__ method)"),
    'neither_msg': ("TypeError: 'Neither' object does not support the asynchronous "
                    "context manager protocol (missed __aexit__ method)"),
    'ok_order': "['enter', 'body:resource', 'exit:None']",
    'ok_result': 'None',
    'sync_manager_msg': ("TypeError: 'SyncManager' object does not support the asynchronous "
                         "context manager protocol (missed __aexit__ method) but it supports "
                         "the context manager protocol. Did you mean to use 'with'?"),
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-22s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
