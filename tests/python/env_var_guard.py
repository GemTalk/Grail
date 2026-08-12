# Regression fixture: test.support.os_helper.EnvironmentVarGuard.
#
# The vendored suite uses it to change the session's zone and put it back
# (time.tzset() reads os.environ['TZ']).  Grail's os_helper omitted it, so
# datetimetester's test_system_transitions died on
# "module has no attribute 'EnvironmentVarGuard'" before running at all.
#
# Ported faithfully rather than stubbed for that one caller: it is the full
# MutableMapping over os.environ, and every change is rolled back on exit --
# including deletions, and including names that did not exist beforehand.

import os
from test.support import os_helper

RESULTS = {}

os.environ['GRAIL_EVG_EXISTING'] = 'before'
os.environ.pop('GRAIL_EVG_NEW', None)

with os_helper.EnvironmentVarGuard() as env:
    RESULTS['reads_through_guard'] = (env['GRAIL_EVG_EXISTING'] == 'before')
    env['GRAIL_EVG_EXISTING'] = 'during'
    RESULTS['sees_own_write'] = (os.environ['GRAIL_EVG_EXISTING'] == 'during')
    env['GRAIL_EVG_NEW'] = 'created'
    RESULTS['sees_new_name'] = (os.environ['GRAIL_EVG_NEW'] == 'created')
    # Writing twice must still restore the ORIGINAL value.
    env['GRAIL_EVG_EXISTING'] = 'during2'
    # set()/unset() are part of the API too.
    env.set('GRAIL_EVG_SET', 'v')
    RESULTS['set_helper'] = (os.environ['GRAIL_EVG_SET'] == 'v')
    env.unset('GRAIL_EVG_SET')
    RESULTS['unset_helper'] = ('GRAIL_EVG_SET' not in os.environ)
    RESULTS['copy_is_dict'] = isinstance(env.copy(), dict)
    RESULTS['len_and_contains'] = (len(env) > 0 and 'GRAIL_EVG_EXISTING' in env)

RESULTS['restores_existing'] = (os.environ.get('GRAIL_EVG_EXISTING') == 'before')
RESULTS['removes_new'] = ('GRAIL_EVG_NEW' not in os.environ)

# A name DELETED inside the guard must come back.
os.environ['GRAIL_EVG_DEL'] = 'keepme'
with os_helper.EnvironmentVarGuard() as env:
    del env['GRAIL_EVG_DEL']
    RESULTS['delete_takes_effect'] = ('GRAIL_EVG_DEL' not in os.environ)
RESULTS['restores_deleted'] = (os.environ.get('GRAIL_EVG_DEL') == 'keepme')

# It must restore even when the body raises.
os.environ['GRAIL_EVG_EXC'] = 'orig'
try:
    with os_helper.EnvironmentVarGuard() as env:
        env['GRAIL_EVG_EXC'] = 'changed'
        raise ValueError('boom')
except ValueError:
    pass
RESULTS['restores_on_exception'] = (os.environ.get('GRAIL_EVG_EXC') == 'orig')

# The concrete use the suite needs: change TZ, tzset, and put it back.
import time
_before = time.tzname
with os_helper.EnvironmentVarGuard() as env:
    env['TZ'] = 'EST+05EDT,M3.2.0,M11.1.0'
    time.tzset()
    RESULTS['tz_change_visible'] = (time.tzname == ('EST', 'EDT'))
time.tzset()
RESULTS['tz_restored'] = (time.tzname == _before)

for _k in ('GRAIL_EVG_EXISTING', 'GRAIL_EVG_DEL', 'GRAIL_EVG_EXC'):
    os.environ.pop(_k, None)
