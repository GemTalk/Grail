from contextlib import closing, suppress, nullcontext, ExitStack, contextmanager


class Tracked:
    def __init__(self):
        self.closed = False
        self.value = None

    def close(self):
        self.closed = True


def closing_works():
    t = Tracked()
    with closing(t) as obj:
        obj.value = 7
    return (t.closed, t.value)


def suppress_catches():
    fired = False
    with suppress(ValueError):
        fired = True
        raise ValueError("bad")
    return fired


def suppress_lets_other_through():
    try:
        with suppress(ValueError):
            raise TypeError("nope")
    except TypeError:
        return "caught"
    return "missed"


def nullcontext_yields():
    with nullcontext(42) as v:
        return v


def exitstack_orders():
    order = []
    with ExitStack() as stack:
        stack.callback(lambda: order.append("a"))
        stack.callback(lambda: order.append("b"))
        stack.callback(lambda: order.append("c"))
    return order


def _my_cm_impl(value):
    yield value


my_cm = contextmanager(_my_cm_impl)


def contextmanager_yields():
    with my_cm(99) as v:
        return v


def _my_cm_cleanup_impl():
    log = []
    log.append("enter")
    try:
        yield log
    finally:
        log.append("exit")


my_cm_cleanup = contextmanager(_my_cm_cleanup_impl)


def contextmanager_runs_cleanup():
    with my_cm_cleanup() as log:
        log.append("body")
    return log
