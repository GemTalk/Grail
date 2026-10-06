"""Workflows for tests/scripts/run_durable_test.sh.  Grail-only: they park on
GemStone continuations, so this file is not a tests/python fixture."""
import time

import durable
import gemdb


def log(msg):
    gemdb.root.setdefault('durable_test_log', []).append(msg)


def order_flow(order_id, amount):
    total = amount * 2
    log('A: reserve %s total=%d' % (order_id, total))
    durable.checkpoint()
    log('B: charge %s' % order_id)
    durable.sleep(1.5)                       # the gem that ran A and B exits here
    log('C: woke; awaiting approval (total still %d)' % total)
    approval = durable.recv('approve', timeout=30)
    log('D: approval=%r; shipping %s' % (approval, order_id))
    return {'order': order_id, 'total': total, 'approved': approval}


def crashy_flow(n):
    log('crashy: step1 n=%d' % n)
    recovered = durable.checkpoint()
    log('crashy: after checkpoint recovered=%r' % recovered)
    if not recovered:
        log('crashy: hanging until killed')     # never committed: the gem dies
        time.sleep(3600)
    return n * 10


def loop_flow(n):
    # Parks inside a loop body, so the loop runs on in each resumed stack.
    # Compiled by the text codegen path, the body is a block valued again
    # after every resume, and GemStone then gives that block a stale home
    # context: `total` comes back wrong (0 for n=5, measured 2026-10-04 on
    # 4.0.0-a2 and 4.0.0.a4; reported to GemTalk).  The IR path keeps the
    # body in the method and is unaffected.
    total = 0
    for i in range(n):
        durable.sleep(0)
        total += i
    return total


def generator_flow():
    g = (i for i in range(3))
    next(g)
    durable.checkpoint()                     # a live generator: refused
    return list(g)
