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


def generator_flow():
    g = (i for i in range(3))
    next(g)
    durable.checkpoint()                     # a live generator: refused
    return list(g)
