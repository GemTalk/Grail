"""`threading` knows which threads are alive.

Grail's `threading` had no registry of live threads at all -- no `_active`, no
`_limbo` -- so `active_count()` and `enumerate()` did not exist, and
`current_thread()` answered the main thread unconditionally, even when the
caller was demonstrably somewhere else.

Three things in the tree already depended on what was missing:

  * `test.support.threading_helper.threading_setup()` is
    `return (threading.active_count(),)`, so every module whose `setUpModule`
    calls it failed its fixture outright;
  * `asgiref.current_thread_executor` guards on
    `current_thread() != self._work_thread`, which could only ever be false;
  * django's postgresql backend reads `current_thread().ident`, and the main
    thread object had no `ident` to read.

`active_count()` is defined by CPython as the length of `enumerate()`, so the
registry -- not the counter -- is the actual subject here, and the checks below
are written against it.

Every expectation was measured against CPython 3.14.
"""

import threading

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:120])


# --------------------------------------------- the main thread is a thread

check('a_quiet_program_has_one_live_thread', threading.active_count(), 1)

check('active_count_is_the_length_of_enumerate',
      threading.active_count(), len(threading.enumerate()))

check('the_main_thread_is_in_the_registry',
      threading.main_thread() in threading.enumerate(), True)

check('the_main_thread_has_an_ident',
      isinstance(threading.main_thread().ident, int), True)

check('current_thread_is_the_main_thread_here',
      threading.current_thread() is threading.main_thread(), True)


# ------------------------------------ a running thread is in the registry

_seen = {}


def _record():
    _seen['count'] = threading.active_count()
    _seen['current'] = threading.current_thread() is _worker
    _seen['enumerated'] = _worker in threading.enumerate()
    _seen['not_main'] = threading.current_thread() is not threading.main_thread()


_worker = threading.Thread(target=_record)
_worker.start()
_worker.join()

check('a_running_thread_is_counted', _seen.get('count'), 2)

check('a_running_thread_is_enumerated', _seen.get('enumerated'), True)

check('current_thread_inside_a_thread_is_that_thread',
      _seen.get('current'), True)

check('current_thread_inside_a_thread_is_not_the_main_thread',
      _seen.get('not_main'), True)


# --------------------------------------- and is gone once it has finished

check('a_finished_thread_is_no_longer_counted', threading.active_count(), 1)

check('a_finished_thread_is_no_longer_enumerated',
      _worker in threading.enumerate(), False)

check('a_finished_thread_is_not_alive', _worker.is_alive(), False)


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
