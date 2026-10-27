"""The phases of the namespaced application (upgrade_ns_main.py, its top file),
for tests/scripts/run_grail_upgrade_test.sh. A module of the namespace, like
upgrade_ns_app.py.

write    (Grail n) commits upgrade_ns_app.build() and an instance of the top
         file's own class through gemdb.root -- in a namespace, the top file's
         globals -- and writes what the app observes to <expected.json>
redeploy (Grail m) commits what running the top file rebuilt
verify   (Grail m) checks, one line each, UPGRADE PASS ns.<check> /
         UPGRADE FAIL ns.<check>: <why>, as verify_phase.py does for the
         default app:

  ns.runs.import_writes_nothing  running the top file, and binding its modules,
                                 after the upgrade wrote nothing
  ns.runs.only_by_the_app        nothing but these phases ran the top file's
                                 body -- an install rebuilding it, say
  ns.namespace                   the run is in grail_upgrade_ns
  ns.intact.<name>               the app observes what it did under n
  ns.type.<name>                 the stored value is an instance of the CURRENT
                                 class: the namespace module's, or the top file's
  ns.runs.<what>                 old objects work with the app's code under m

The verify phase binds no persistent global, and aborts at the end, so it
writes nothing and can be run again.
"""
import json
import os

import gemdb
import gemstone

import upgrade_ns_app

NAMESPACE = 'grail_upgrade_ns'
RAN_WITHOUT_PHASE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 'ns_main_ran_without_phase')


def describe_note(note):
    return [note.text, note.shout()]


def write(path, note_class):
    gemdb.root['stored'] = upgrade_ns_app.build()
    gemdb.root['note'] = note_class('kept')
    gemdb.commit()
    observed = upgrade_ns_app.describe(gemdb.root['stored'])
    observed['note'] = describe_note(gemdb.root['note'])
    with open(path, 'w') as f:
        json.dump(observed, f, indent=1, sort_keys=True)
    print('write ns phase: stored %d values in %s' % (len(gemdb.root['stored']), gemdb.namespace()))


def redeploy():
    gemdb.commit()
    print('redeploy ns phase: %s' % gemdb.namespace())


def ran_without_phase():
    with open(RAN_WITHOUT_PHASE, 'a') as f:
        f.write('ran with no phase\n')


def verify(path, note_class, writes_at_import):
    failed = []

    def check(name, fn):
        try:
            ok, why = fn()
        except BaseException as e:      # noqa: B036 -- a check that raises is a failed check
            ok, why = False, 'raised %s: %s' % (type(e).__name__, e)
        if ok:
            print('UPGRADE PASS ns.%s' % name)
        else:
            failed.append(name)
            print('UPGRADE FAIL ns.%s: %s' % (name, why))

    def expect_equal(actual, expected):
        return (actual == expected, 'got %r, expected %r' % (actual, expected))

    with open(path) as f:
        expected = json.load(f)
    stored = gemdb.root['stored']
    note = gemdb.root['note']

    check('runs.import_writes_nothing',
          lambda: (not writes_at_import[0],
                   'running the namespaced app left the session dirty; modules built: %s'
                   % writes_at_import[1]))
    check('runs.only_by_the_app',
          lambda: (not os.path.exists(RAN_WITHOUT_PHASE),
                   'something other than the app ran its top file %s'
                   % (open(RAN_WITHOUT_PHASE).read().count('\n') if os.path.exists(RAN_WITHOUT_PHASE)
                      else 0) + ' time(s)'))
    check('namespace', lambda: expect_equal(gemdb.namespace(), NAMESPACE))

    observed = upgrade_ns_app.describe(stored)
    observed['note'] = describe_note(note)
    for name in sorted(expected):
        check('intact.' + name,
              lambda name=name: expect_equal(json.loads(json.dumps(observed[name])), expected[name]))

    types = dict(upgrade_ns_app.expected_types())
    for name, cls in sorted(types.items()):
        check('type.' + name,
              lambda name=name, cls=cls: (type(stored[name]) is cls,
                                          '%r is not the current %r' % (type(stored[name]), cls)))
    check('type.note',
          lambda: (type(note) is note_class, '%r is not the current %r' % (type(note), note_class)))
    check('type.enum_member_identity',
          lambda: (stored['status'] is upgrade_ns_app.Status.SHUT,
                   'stored Status.SHUT is not the current Status.SHUT'))

    def raise_and_catch():
        try:
            raise stored['error']
        except upgrade_ns_app.LedgerError as e:
            return e is stored['error'], 'caught a different object'
        except BaseException as e:      # noqa: B036
            return False, 'except LedgerError missed it; caught as %s' % type(e).__name__
        return False, 'nothing raised'

    def equal_to_new():
        new = upgrade_ns_app.build()
        bad = [n for n in ('item', 'status', 'by_sku', 'decimal', 'fraction', 'when', 'ordered', 'text')
               if not (stored[n] == new[n] and new[n] == stored[n])]
        return not bad, 'not equal to a value built now: %s' % bad

    def mutate():
        stored['ledger'].entries.append(10)
        stored['bucket']['c'] = 'abc'
        return (stored['ledger'].total() == 22 and stored['bucket'].weight() == 6,
                'a mutation did not take')

    check('runs.raise_and_catch', raise_and_catch)
    check('runs.equal_to_new', equal_to_new)
    check('runs.mutate', mutate)
    check('runs.new_note', lambda: expect_equal(note_class('new').shout(), 'NEW!'))
    gemstone.system.abort()
    print('verify ns phase: %d failed' % len(failed))
    return 1 if failed else 0
