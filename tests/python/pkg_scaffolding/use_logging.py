import logging


def root_default_level():
    return logging.getLogger().level


def basic_config_sets_level():
    logging.basicConfig(level=logging.DEBUG)
    return logging.getLogger().level


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
