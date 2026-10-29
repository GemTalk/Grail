"""Verify phase of tests/scripts/run_grail_upgrade_test.sh, run under Grail m:

    grail verify_phase.py <expected.json> [--probe m]

Reads back what write_phase.py committed under Grail n and checks, one line per
check (UPGRADE PASS <check> / UPGRADE FAIL <check>: <why>):

  intact.<name>   the app observes the same value as it did under n
  lookup.<kind>   a hashed container finds a FRESH equal key of each kind
  type.<name>     the stored value is an instance of the CURRENT class -- the one
                  the app module and the builtins name now -- not an old copy
  runs.<what>     old objects work with the app's code under m
  probe.<what>    (--probe m) the stored objects run m's Grail code: the probe
                  method m changed answers m's value, the method m removed is
                  gone, the class m removed is gone and the class m added is there

A check listed in KNOWN fails for a reason already understood and not yet fixed;
it prints UPGRADE KNOWN instead of UPGRADE FAIL, and does not fail the run, so the
test stays a gate for everything else while the gap stays visible.

Changes nothing: it aborts at the end, so it can be run again.
"""
# FIRST, before this script's own imports: binding the app -- and everything it
# imports -- after an upgrade must write nothing, or the session is dirty and
# gemdb.transaction() refuses to begin.  (json and pickle come after: the app does
# not use them, so nothing deployed them, and their first import is a build.)
import gemdb
import gemstone
import upgrade_app

WRITES_AT_IMPORT = (gemstone.needs_commit, list(gemstone.uncommitted_imports))

import json  # noqa: E402
import os  # noqa: E402
import pickle  # noqa: E402
import sys  # noqa: E402

FAILED = []

# No check is a known gap today. A gap goes here, with its reason, when one is
# found and not yet fixed.
KNOWN = {}


def check(name, fn):
    try:
        ok, why = fn()
    except BaseException as e:      # noqa: B036 -- a check that raises is a failed check
        ok, why = False, 'raised %s: %s' % (type(e).__name__, e)
    if ok:
        print('UPGRADE PASS %s' % name)
    elif name in KNOWN:
        print('UPGRADE KNOWN %s: %s (%s)' % (name, why, KNOWN[name]))
    else:
        FAILED.append(name)
        print('UPGRADE FAIL %s: %s' % (name, why))


def expect_equal(actual, expected):
    return (actual == expected, 'got %r, expected %r' % (actual, expected))


with open(sys.argv[1]) as f:
    expected = json.load(f)
probe = sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == '--probe' else None

stored = gemdb.root['upgrade']

check('runs.import_writes_nothing',
      lambda: (not WRITES_AT_IMPORT[0],
               'importing the app left the session dirty; modules built: %s' % WRITES_AT_IMPORT[1]))

# intact: one check per value, so one broken type does not hide the rest.
for name in sorted(expected):
    check('intact.' + name,
          lambda name=name: expect_equal(
              json.loads(json.dumps(upgrade_app.describe(stored)[name])), expected[name]))

for key, value in upgrade_app.key_values():
    check('lookup.dict.' + value,
          lambda key=key, value=value: expect_equal(stored['keyed_dict'].get(key, '<missing>'), value))
    check('lookup.set.' + value,
          lambda key=key: (key in stored['keyed_set'], 'not found'))

for name, cls in sorted(upgrade_app.expected_types().items(), key=lambda kv: kv[0]):
    check('type.' + name,
          lambda name=name, cls=cls: (type(stored[name]) is cls,
                                      '%r is not the current %r' % (type(stored[name]), cls)))
check('type.enum_member_identity',
      lambda: (stored['color'] is upgrade_app.Color.GREEN,
               'stored Color.GREEN is not the current Color.GREEN'))
check('type.enum_member_identity.str_mixin',
      lambda: (stored['mode'] is upgrade_app.Mode.WRITE,
               'stored Mode.WRITE is not the current Mode.WRITE'))
check('type.enum_member_identity.strenum',
      lambda: (stored['level'] is upgrade_app.Level.HIGH,
               'stored Level.HIGH is not the current Level.HIGH'))
check('type.enum_member_identity.float_mixin',
      lambda: (stored['size'] is upgrade_app.Size.LARGE,
               'stored Size.LARGE is not the current Size.LARGE'))
check('type.enum_member_identity.int_mixin',
      lambda: (stored['rank'] is upgrade_app.Rank.HIGH,
               'stored Rank.HIGH is not the current Rank.HIGH'))
check('type.enum_member_identity.functional',
      lambda: (stored['shape'] is upgrade_app.Shape.SQUARE,
               'stored Shape.SQUARE is not the current Shape.SQUARE'))
check('type.enum_member_identity.functional_int_mixin',
      lambda: (stored['weight'] is upgrade_app.Weight.HEAVY,
               'stored Weight.HEAVY is not the current Weight.HEAVY'))
for _cls, _name, _tag in (('Color', 'GREEN', 'color'), ('Mode', 'WRITE', 'mode'),
                          ('Level', 'HIGH', 'level'), ('Size', 'LARGE', 'size'),
                          ('Rank', 'HIGH', 'rank'), ('Shape', 'SQUARE', 'shape'),
                          ('Weight', 'HEAVY', 'weight')):
    check('lookup.enum_member.dict.' + _tag,
          lambda c=_cls, n=_name, t=_tag: expect_equal(
              stored['enum_keyed_dict'].get(getattr(getattr(upgrade_app, c), n), '<missing>'), t))
    check('lookup.enum_member.set.' + _tag,
          lambda c=_cls, n=_name: (getattr(getattr(upgrade_app, c), n) in stored['enum_keyed_set'],
                                   'not found'))
    check('lookup.enum_member.stored_key_is_member.' + _tag,
          lambda c=_cls, n=_name: (
              any(k is getattr(getattr(upgrade_app, c), n) for k in stored['enum_keyed_dict']),
              'no stored key is the current member'))
check('type.error_is_exception',
      lambda: (isinstance(stored['error'], Exception), 'not an instance of the current Exception'))


def raise_and_catch():
    try:
        raise stored['error']
    except upgrade_app.AppError as e:
        return e is stored['error'], 'caught a different object'
    except BaseException as e:      # noqa: B036
        return False, 'except upgrade_app.AppError missed it; caught as %s' % type(e).__name__
    return False, 'nothing raised'


def pickle_round_trip():
    bad = [n for n in ('tuple', 'dict', 'set', 'date', 'datetime', 'decimal', 'fraction',
                       'point', 'color', 'span', 'typed_pair_obj')
           if pickle.loads(pickle.dumps(stored[n])) != stored[n]]
    return not bad, 'not equal after a round trip: %s' % bad


def equal_to_new():
    new = upgrade_app.build()
    bad = [n for n in ('tuple', 'dict', 'set', 'frozenset', 'date', 'datetime', 'timedelta',
                       'decimal', 'fraction', 'point', 'pair', 'color', 'complex', 'int_big',
                       'str_unicode', 'ordereddict', 'counter')
           if not (stored[n] == new[n] and new[n] == stored[n])]
    return not bad, 'not equal to a value built now: %s' % bad


def mutate():
    stored['list'].append('more')
    stored['dict']['c'] = 3
    stored['account'].balance += 1
    stored['set'].add(4)
    return (stored['list'][-1] == 'more' and stored['dict']['c'] == 3
            and stored['account'].describe() == 'alice:101' and 4 in stored['set'],
            'a mutation did not take')


check('runs.raise_and_catch', raise_and_catch)
check('runs.pickle_round_trip', pickle_round_trip)
def email_message():
    import email.message
    m = email.message.EmailMessage()
    m['Subject'] = 'upgraded'
    m.set_content('body')
    text = m.as_string()
    return ('Subject: upgraded' in text and 'body' in text
            and email.message.MIMEPart in type(m).__mro__, text[:200])


check('runs.email_message', email_message)
check('runs.pickle_namedtuple',
      lambda: expect_equal(pickle.loads(pickle.dumps(stored['pair'])), stored['pair']))
check('runs.equal_to_new', equal_to_new)
check('runs.mutate', mutate)

_chosen = os.environ.get('GRAIL_UPGRADE_CHANGES', 'all').strip()
CHANGES = ({'env1_removal', 'session_removal', 'classes', 'shape'}
           if _chosen in ('', 'all') else set(_chosen.split(',')))

if probe:
    for name in ('error', 'complex', 'dict', 'list', 'account'):
        check('probe.changed_method.' + name,
              lambda name=name: expect_equal(stored[name]._grail_upgrade_probe(), probe))
    if 'env1_removal' in CHANGES:
        check('probe.removed_method',
              lambda: (not hasattr(stored['error'], '_grail_upgrade_removed'),
                       'the method m removed still answers'))
    if 'session_removal' in CHANGES:
        check('probe.removed_session_method',
              lambda: (not hasattr(stored['dict'], '_grail_upgrade_removed_session'),
                       'the session method m removed from Object still answers'))

    def present(name):
        try:
            gemstone[name]
            return True
        except KeyError:
            return False
    if 'classes' in CHANGES:
        check('probe.removed_class', lambda: (not present('GrailUpgradeDoomed'),
                                              'GrailUpgradeDoomed is still visible'))
        check('probe.added_class', lambda: (present('GrailUpgradeAdded'),
                                            'GrailUpgradeAdded is not visible'))

gemstone.system.abort()
print('verify phase: %d failed' % len(FAILED))
sys.exit(1 if FAILED else 0)
