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
