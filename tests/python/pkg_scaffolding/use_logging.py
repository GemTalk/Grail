import logging


def root_default_level():
    return logging.getLogger().level


def basic_config_sets_level():
    # Restores root afterwards. Prophylactic, not a bug fix: no .gs test drives
    # this fixture today, so its leak has never reached anything. But
    # root_default_level() reads root.level expecting a pristine WARNING, and
    # this is the other fixture here that sets that level -- wire it up without
    # the restore and the two become order-dependent.
    root = logging.getLogger()
    saved_handlers, saved_level = list(root.handlers), root.level
    try:
        logging.basicConfig(level=logging.DEBUG)
        return root.level
    finally:
        root.handlers = saved_handlers
        root.setLevel(saved_level)


def named_logger_uses_root_level():
    log = logging.getLogger('myapp')
    return log.getEffectiveLevel()


def parent_chain():
    parent = logging.getLogger('myapp')
    child = logging.getLogger('myapp.module')
    return child.parent.name


def is_enabled_for():
    log = logging.getLogger('e')
    log.setLevel(logging.WARNING)
    return log.isEnabledFor(logging.DEBUG), log.isEnabledFor(logging.WARNING), log.isEnabledFor(logging.ERROR)


def null_handler_silences():
    log = logging.getLogger('quiet')
    log.handlers = []
    log.addHandler(logging.NullHandler())
    log.warning('this should not raise')
    return 'ok'


def format_record():
    rec = logging.LogRecord('app', logging.INFO, 'hello %s', ('world',))
    return rec.getMessage()


def formatter_default():
    fmt = logging.Formatter()
    rec = logging.LogRecord('app', logging.INFO, 'msg', ())
    return fmt.format(rec)


def formatter_custom():
    fmt = logging.Formatter('%(name)s|%(levelname)s|%(message)s')
    rec = logging.LogRecord('a.b', logging.ERROR, 'oops', ())
    return fmt.format(rec)


def level_constants():
    return (logging.DEBUG, logging.INFO, logging.WARNING, logging.ERROR, logging.CRITICAL)


def get_level_name():
    return logging.getLevelName(logging.WARNING)


# ---------------------------------------------------------------------------
# End-to-end emit / handler pipeline tests.  The existing tests cover
# the static surface (levels, names, parent chain); these exercise the
# actual record-routes-through-handlers flow.

_CAPTURED = []


def _reset_captured():
    _CAPTURED[:] = []


class CapturingHandler(logging.Handler):
    """Append each emit's formatted message to _CAPTURED."""

    def emit(self, record):
        _CAPTURED.append(self.format(record))


class LevelCapturingHandler(logging.Handler):
    def emit(self, record):
        _CAPTURED.append(record.levelno)


def logger_info_emits():
    log = logging.getLogger('emit.info')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    log.info('hello %s', 'world')
    log.debug('debug-level')
    log.warning('warn')
    return list(_CAPTURED)


def handler_set_formatter_custom():
    log = logging.getLogger('emit.fmt')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    h = CapturingHandler()
    h.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
    log.addHandler(h)
    log.setLevel(logging.INFO)
    log.info('hi')
    return list(_CAPTURED)


def handler_set_level_filters():
    # Handler-level threshold suppresses records below it even when
    # the logger admits them.
    log = logging.getLogger('emit.hlvl')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    h = LevelCapturingHandler()
    h.setLevel(logging.WARNING)
    log.addHandler(h)
    log.setLevel(logging.DEBUG)
    log.debug('drop')
    log.info('drop')
    log.warning('keep')
    log.error('keep')
    return list(_CAPTURED)


def logger_exception_reports_the_traceback():
    """exception() logs at ERROR and now carries the traceback with it.

    Returned as counts and booleans rather than the raw line, because the
    traceback contains absolute paths and line numbers that differ per
    checkout.
    """
    lines = logger_exception_logs_at_error()
    return (len(lines),
            lines[0].startswith('ERROR:emit.exc:caught: failure'),
            'Traceback (most recent call last):' in lines[0])


def logger_exception_logs_at_error():
    log = logging.getLogger('emit.exc')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    try:
        raise ValueError('boom')
    except ValueError:
        log.exception('caught: %s', 'failure')
    return list(_CAPTURED)


def root_propagation_to_root_handler():
    root = logging.getLogger()
    root.handlers = []
    _reset_captured()
    root.addHandler(CapturingHandler())
    child = logging.getLogger('emit.prop.child')
    child.handlers = []
    child.propagate = True
    child.setLevel(logging.DEBUG)
    child.info('from child')
    return list(_CAPTURED)


def remove_handler_stops_emit():
    log = logging.getLogger('emit.rmv')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    h = CapturingHandler()
    log.addHandler(h)
    log.setLevel(logging.DEBUG)
    log.info('before')
    log.removeHandler(h)
    log.info('after')
    return list(_CAPTURED)


def has_handlers_walks_chain():
    root = logging.getLogger()
    root.handlers = []
    leaf = logging.getLogger('hh.leaf')
    leaf.handlers = []
    leaf.propagate = True
    before = leaf.hasHandlers()
    root.addHandler(logging.NullHandler())
    after = leaf.hasHandlers()
    return (before, after)


def has_handlers_stops_when_propagation_off():
    root = logging.getLogger()
    root.handlers = []
    root.addHandler(logging.NullHandler())
    leaf = logging.getLogger('hh2.leaf')
    leaf.handlers = []
    leaf.propagate = False
    return leaf.hasHandlers()


def formatter_asctime_shape():
    # asctime is rendered via time.strftime in the default
    # '%Y-%m-%d %H:%M:%S' format.  Match the shape with a regex so
    # the test doesn't depend on the live clock.
    import re
    fmt = logging.Formatter('%(asctime)s|%(name)s|%(message)s')
    rec = logging.LogRecord('app', logging.INFO, 'hi', ())
    line = fmt.format(rec)
    m = re.match(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\|app\|hi$', line)
    return m is not None


def log_record_args_tuple():
    # %-formatting with a multi-element args tuple.
    rec = logging.LogRecord('app', logging.INFO, '%s and %d', ('hi', 7))
    return rec.getMessage()


# ---------------------------------------------------------------------------
# exc_info and the rest of CPython's keyword arguments.
#
# Taking only *args was not merely incomplete: it raised TypeError, and the
# commonest caller is a framework reporting somebody else's exception. Flask's
# error handler calls logger.error(msg, exc_info=...), so an unhandled
# exception in a view surfaced as "Logger.error() got an unexpected keyword
# argument 'exc_info'" with the real traceback nowhere in sight.


def error_accepts_exc_info():
    log = logging.getLogger('exc.kw')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    try:
        raise ValueError('boom')
    except ValueError:
        log.error('view raised', exc_info=True)
    line = _CAPTURED[0]
    return (len(_CAPTURED), line.startswith('ERROR:exc.kw:view raised'),
            'ValueError: boom' in line)


def error_ignores_unsupported_keywords():
    # stack_info/stacklevel/extra are accepted and ignored. Refusing them
    # would reintroduce the same failure for a field nobody would have seen.
    log = logging.getLogger('exc.kw2')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    log.error('plain', stack_info=True, stacklevel=2, extra={'a': 1})
    return list(_CAPTURED)


def exception_defaults_to_exc_info():
    log = logging.getLogger('exc.default')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    try:
        raise KeyError('missing')
    except KeyError:
        log.exception('while handling')
    return 'missing' in _CAPTURED[0]


def exc_info_from_a_triple():
    import sys
    log = logging.getLogger('exc.triple')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    try:
        raise RuntimeError('explicit')
    except RuntimeError:
        log.error('with a triple', exc_info=sys.exc_info())
    return 'RuntimeError: explicit' in _CAPTURED[0]


def exc_info_false_adds_nothing():
    log = logging.getLogger('exc.off')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    try:
        raise ValueError('unseen')
    except ValueError:
        log.error('quiet', exc_info=False)
    return _CAPTURED[0]  # exactly the message, nothing appended


def exc_info_true_outside_an_except_block():
    # No exception is being handled, so there is nothing to append and the
    # message must not gain a "NoneType: None" placeholder.
    log = logging.getLogger('exc.none')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    log.error('nothing to report', exc_info=True)
    return _CAPTURED[0]  # no "NoneType: None" placeholder


def adapter_forwards_keywords():
    # LoggerAdapter forwards **kwargs into these methods, so it was broken
    # by the same gap.
    log = logging.getLogger('exc.adapter')
    log.handlers = []
    log.propagate = False
    _reset_captured()
    log.addHandler(CapturingHandler())
    log.setLevel(logging.DEBUG)
    adapter = logging.LoggerAdapter(log, {'ctx': 1})
    try:
        raise ValueError('through the adapter')
    except ValueError:
        adapter.error('adapted', exc_info=True)
    return 'through the adapter' in _CAPTURED[0]


def module_level_error_accepts_exc_info():
    # The module-level functions log to the root logger, so this has to touch
    # it -- and therefore has to put it back. `root_default_level` reads
    # root.level and expects a pristine WARNING; a fixture that walks away
    # leaving DEBUG makes that test pass or fail on which ran first. No other
    # root-touching fixture here sets the LEVEL, which is why this is the one
    # that broke it.
    root = logging.getLogger()
    saved_handlers, saved_level = list(root.handlers), root.level
    root.handlers = []
    _reset_captured()
    root.addHandler(CapturingHandler())
    root.setLevel(logging.DEBUG)
    try:
        try:
            raise ValueError('module level')
        except ValueError:
            logging.error('at module level', exc_info=True)
        return 'module level' in _CAPTURED[0]
    finally:
        root.handlers = saved_handlers
        root.setLevel(saved_level)
