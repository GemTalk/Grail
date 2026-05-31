# Fixture for ExitStackUsageTestCase.
#
# contextlib.ExitStack.close() unwinds the registered callbacks outside
# the ``with`` protocol; pop_all() transfers them to a fresh stack.
# flask's test client holds an ExitStack of pushed contexts and calls
# close() between requests.

from contextlib import ExitStack


def close_runs_callbacks():
    log = []
    stack = ExitStack()
    stack.callback(lambda: log.append('a'))
    stack.callback(lambda: log.append('b'))
    stack.close()
    # LIFO unwind order.
    return log


def close_is_idempotent():
    log = []
    stack = ExitStack()
    stack.callback(lambda: log.append('x'))
    stack.close()
    stack.close()      # second close has nothing left to run
    return len(log)


def pop_all_transfers_callbacks():
    log = []
    stack = ExitStack()
    stack.callback(lambda: log.append('kept'))
    moved = stack.pop_all()
    stack.close()              # original is now empty
    ran_after_pop = list(log)
    moved.close()              # the moved stack owns the callback
    return [ran_after_pop, log]
