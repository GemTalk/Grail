"""logging with no configuration prints warnings to stderr, as in CPython (#2122).

Grail's logging printed nothing for a record that found no handler.  CPython
has two mechanisms for it, and Grail had neither:

* the module-level ``logging.warning()``/``info()``/... call ``basicConfig()``
  first when the root logger has no handlers, so ``logging.warning('x')``
  prints ``WARNING:root:x``;
* ``Logger.callHandlers`` hands a record that found no handler at all to
  ``logging.lastResort`` -- a WARNING-level ``_StderrHandler`` -- which prints
  the bare message.

``lastResort``'s stream is a property answering ``sys.stderr`` per record, so
the handler holds no session's stream: logging is a deployed module, and a
handler made at install writes to the EMITTING session's stderr.

Every expectation was measured against CPython 3.14.  Each check runs with
``sys.stderr`` swapped for a StringIO and the root logger emptied, and puts
back the root's handlers and level, ``lastResort`` and ``sys.stderr``.
"""

import io
import logging
import sys

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


PREFIX = 'grail_logging_last_resort_fixture'


def _unconfigured(body):
    """Run body() with no root handlers and stderr captured; answer
    (body's result, what reached stderr)."""
    root = logging.root
    saved = (root.handlers[:], root.level, logging.lastResort, sys.stderr,
             root.manager.emittedNoHandlerWarning)
    err = io.StringIO()
    try:
        root.handlers[:] = []
        root.setLevel(logging.WARNING)
        sys.stderr = err
        result = body()
    finally:
        root.handlers[:] = saved[0]
        root.setLevel(saved[1])
        logging.lastResort = saved[2]
        sys.stderr = saved[3]
        root.manager.emittedNoHandlerWarning = saved[4]
    return result, err.getvalue()


def _module_warning():
    logging.warning('x')
    handlers = logging.root.handlers
    return [type(h).__name__ for h in handlers]


check('module_warning_calls_basicconfig', _unconfigured(_module_warning),
      (['StreamHandler'], 'WARNING:root:x\n'))


def _module_info():
    logging.info('x')
    logging.getLogger(PREFIX + '.a').info('y')
    count = len(logging.root.handlers)
    logging.getLogger(PREFIX + '.a').warning('z')
    return count


check('info_prints_nothing_but_still_configures', _unconfigured(_module_info),
      (1, 'WARNING:%s.a:z\n' % PREFIX))


def _every_module_function():
    seen = []
    for fn in (logging.debug, logging.info, logging.warning, logging.error,
               logging.critical, logging.fatal, logging.exception,
               lambda msg: logging.log(logging.ERROR, msg)):
        logging.root.handlers[:] = []
        fn('m')
        seen.append(len(logging.root.handlers))
    return seen


check('every_module_function_calls_basicconfig',
      _unconfigured(_every_module_function)[0], [1] * 8)


def _named_logger():
    lg = logging.getLogger(PREFIX + '.b')
    lg.warning('x %d', 3)
    lg.info('below')
    lg.error('y')
    return logging.root.handlers


check('a_named_logger_falls_back_to_last_resort', _unconfigured(_named_logger),
      ([], 'x 3\ny\n'))


def _last_resort_shape():
    lr = logging.lastResort
    return (type(lr).__name__, isinstance(lr, logging.StreamHandler),
            lr.level, lr is logging._defaultLastResort,
            lr.stream is sys.stderr, lr.formatter)


check('last_resort_is_a_warning_level_stderr_handler',
      _unconfigured(_last_resort_shape)[0],
      ('_StderrHandler', True, logging.WARNING, True, True, None))


def _last_resort_level():
    lg = logging.getLogger(PREFIX + '.c')
    lg.setLevel(logging.DEBUG)
    try:
        lg.info('info is below lastResort')
        lg.warning('w')
    finally:
        lg.setLevel(logging.NOTSET)


check('last_resort_keeps_its_own_level', _unconfigured(_last_resort_level)[1],
      'w\n')


def _no_last_resort():
    logging.lastResort = None
    logging.getLogger(PREFIX + '.d').warning('x')
    logging.getLogger(PREFIX + '.e').warning('y')


check('without_last_resort_one_no_handlers_notice',
      _unconfigured(_no_last_resort)[1],
      'No handlers could be found for logger "%s.d"\n' % PREFIX)


def _explicit_handler():
    out = io.StringIO()
    handler = logging.StreamHandler(out)
    logging.root.addHandler(handler)
    logging.warning('x')
    logging.getLogger(PREFIX + '.f').warning('y')
    return out.getvalue(), len(logging.root.handlers)


check('an_explicit_handler_is_the_only_one', _unconfigured(_explicit_handler),
      (('x\ny\n', 1), ''))


def _named_handler():
    lg = logging.getLogger(PREFIX + '.g')
    out = io.StringIO()
    handler = logging.StreamHandler(out)
    lg.addHandler(handler)
    try:
        lg.warning('x')
    finally:
        lg.removeHandler(handler)
    return out.getvalue()


check('a_named_loggers_handler_is_the_only_one', _unconfigured(_named_handler),
      ('x\n', ''))


def _basicconfig_after_implicit():
    logging.warning('x')
    logging.basicConfig(level=logging.INFO)
    logging.info('y')
    return logging.root.level, len(logging.root.handlers)


check('basicconfig_does_nothing_once_root_has_a_handler',
      _unconfigured(_basicconfig_after_implicit),
      ((logging.WARNING, 1), 'WARNING:root:x\n'))


def _basicconfig_force():
    logging.warning('x')
    logging.basicConfig(level=logging.INFO, force=True, format='%(message)s!')
    logging.info('y')
    return logging.root.level, len(logging.root.handlers)


check('basicconfig_force_replaces_the_handler',
      _unconfigured(_basicconfig_force),
      ((logging.INFO, 1), 'WARNING:root:x\ny!\n'))


def _basicconfig_handlers():
    out = io.StringIO()
    handler = logging.StreamHandler(out)
    logging.basicConfig(handlers=[handler], format='<%(message)s>')
    logging.warning('x')
    return out.getvalue(), logging.root.handlers == [handler]


check('basicconfig_takes_handlers', _unconfigured(_basicconfig_handlers),
      (('<x>\n', True), ''))


def _basicconfig_refuses(**kwargs):
    try:
        logging.basicConfig(**kwargs)
    except ValueError as e:
        return str(e)
    return 'no error'


check('basicconfig_refuses_an_unknown_argument',
      _unconfigured(lambda: _basicconfig_refuses(nosuch=1))[0],
      'Unrecognised argument(s): nosuch')
check('basicconfig_refuses_stream_and_filename',
      _unconfigured(lambda: _basicconfig_refuses(stream=io.StringIO(),
                                                 filename='f'))[0],
      "'stream' and 'filename' should not be specified together")
check('basicconfig_refuses_handlers_and_stream',
      _unconfigured(lambda: _basicconfig_refuses(stream=io.StringIO(),
                                                 handlers=[]))[0],
      "'stream' or 'filename' should not be specified together with 'handlers'")


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
