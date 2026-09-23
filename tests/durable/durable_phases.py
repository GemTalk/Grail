"""One gem per invocation, driven by tests/scripts/run_durable_test.sh:

    grail tests/durable/durable_phases.py <phase> [idle_timeout]

Every phase prints one line the driver greps for; the durable state itself
lives under gemdb.root['durable'] between gems."""
import sys

import durable
import gemdb
import durable_flows as flows


def _run(name):
    return [r for r in durable.runs() if r.name == name][0]


def reset():
    gemdb.root.pop('durable', None)
    gemdb.root.pop('durable_test_log', None)
    gemdb.commit()
    print('reset ok')


def start_order():
    h = durable.start(flows.order_flow, 'o-1', 21)
    n = durable.run_executor(once=True)
    print('order: executed=%d status=%s' % (n, h.status()))


def executor():
    idle = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0
    n = durable.run_executor(once=True, idle_timeout=idle)
    print('executor: executed=%d statuses=%s' % (n, sorted(r.status for r in durable.runs())))


def approve():
    r = _run('order_flow')
    durable.send(r.id, 'approve', {'ok': True})
    print('approve: sent to %s' % r.id)


def order_result():
    r = _run('order_flow')
    print('order result: %r (checkpoints=%d resumes=%d)'
          % (durable.Handle(r.id).result(timeout=1), r.checkpoints, r.resumes))


def start_crashy():
    h = durable.start(flows.crashy_flow, 5)
    print('crashy: started %s' % h.id, flush=True)
    durable.run_executor(once=True, lease=2)     # hangs inside the workflow until killed
    print('crashy: UNEXPECTED return')


def crashy_result():
    r = _run('crashy_flow')
    print('crashy result: %r (resumes=%d)' % (durable.Handle(r.id).result(timeout=1), r.resumes))


def generator():
    h = durable.start(flows.generator_flow)
    durable.run_executor(once=True, idle_timeout=5)
    r = h.run
    print('generator: %s %s' % (r.status, r.error))


def show():
    for r in durable.runs():
        print(r, 'checkpoints=%d resumes=%d result=%r error=%r'
              % (r.checkpoints, r.resumes, r.result, r.error))
        for t, sess, ev in r.history:
            print('   %10.2f  session %-4s %s' % (t, sess, ev))
    print('LOG:')
    for line in gemdb.root.get('durable_test_log', []):
        print('   ', line)


PHASES = {f.__name__: f for f in
          (reset, start_order, executor, approve, order_result,
           start_crashy, crashy_result, generator, show)}
PHASES[sys.argv[1]]()
