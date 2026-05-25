# GRAIL minimal logging - covers the surface Flask / Werkzeug /
# itsdangerous touch at import + common code paths.
#
# Provided:
#   getLogger(name)                 - returns a Logger
#   basicConfig(level=, format=)    - root handler/level config
#   debug / info / warning / error / critical / log - module helpers
#   exception(msg, *args)           - logs the active exception
#   NullHandler                     - silent handler for library use
#   Handler / StreamHandler         - minimal subset
#   Formatter                       - %-style formatting
#   Logger / LogRecord              - core types
#   level constants: DEBUG INFO WARNING ERROR CRITICAL NOTSET
#
# Not provided: configuration file loaders, filter machinery,
# multiprocessing-safe handlers, anything around `logger.handlers`
# semantics beyond append/remove.

import sys

NOTSET = 0
DEBUG = 10
INFO = 20
WARNING = 30
WARN = 30
ERROR = 40
CRITICAL = 50
FATAL = 50

_levelToName = {
    NOTSET: 'NOTSET',
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    CRITICAL: 'CRITICAL',
}


def getLevelName(level):
    return _levelToName.get(level, 'Level ' + str(level))


class LogRecord:
    """Plain record of a logging event - what Formatter formats."""

    def __init__(self, name, lvl, msg, args):
        import time
        self.name = name
        self.levelno = lvl
        self.levelname = getLevelName(lvl)
        self.msg = msg
        self.args = args
        self.created = time.time()

    def getMessage(self):
        if not self.args:
            return str(self.msg)
        # %-formatting if args present.  Tuple-of-one is a CPython
        # convention - allow either bare or 1-tuple.
        if isinstance(self.args, tuple) and len(self.args) == 1:
            return str(self.msg) % self.args[0]
        return str(self.msg) % self.args


class Formatter:
    """Minimal %-style Formatter.  Supported fields: %(name)s,
    %(levelname)s, %(levelno)d, %(message)s, %(asctime)s (rendered
    via ``time.strftime'' from the record's ``created'' field when
    present).  ``datefmt'' controls asctime formatting; default is
    ISO-like ``%Y-%m-%d %H:%M:%S,SSS''."""

    _default_datefmt = '%Y-%m-%d %H:%M:%S'

    def __init__(self, fmt=None, datefmt=None):
        self._fmt = fmt if fmt is not None else '%(levelname)s:%(name)s:%(message)s'
        self.datefmt = datefmt

    def formatTime(self, record, datefmt=None):
        import time
        ct = getattr(record, 'created', None)
        if ct is None:
            ct = time.time()
        local = time.localtime(ct)
        if datefmt is None:
            datefmt = self.datefmt if self.datefmt is not None else self._default_datefmt
        return time.strftime(datefmt, local)

    def format(self, record):
        fields = {
            'name': record.name,
            'levelname': record.levelname,
            'levelno': record.levelno,
            'message': record.getMessage(),
            'asctime': self.formatTime(record),
        }
        return self._fmt % fields


_default_formatter = Formatter()


class Handler:
    """Base handler.  Subclasses override emit(record).  Filters /
    formatters tracked but only the formatter is consulted by emit."""

    def __init__(self, lvl=NOTSET):
        self.level = lvl
        self.formatter = None

    def setLevel(self, value):
        # Param named `value` (not `level`) so it doesn't shadow the
        # `level` instVar - Grail's class-method codegen treats
        # `self.level = level` as a local self-assignment when the
        # parameter shadows the instVar name.
        self.level = value

    def setFormatter(self, fmt):
        self.formatter = fmt

    def format(self, record):
        fmt = self.formatter if self.formatter is not None else _default_formatter
        return fmt.format(record)

    def handle(self, record):
        if record.levelno >= self.level:
            self.emit(record)

    def emit(self, record):
        # Override in subclasses.
        pass

    def close(self):
        pass

    def flush(self):
        pass


class NullHandler(Handler):
    """Silent handler - what libraries install on their root logger
    so messages with no application-side config don't error out."""

    def emit(self, record):
        pass

    def handle(self, record):
        pass


class StreamHandler(Handler):
    """Writes formatted records to a stream (default: print to the
    Grail Transcript via builtin print).  CPython's StreamHandler
    defaults to sys.stderr; Grail's sys doesn't surface a writable
    stderr yet, so we fall back to print()."""

    def __init__(self, stream=None):
        super().__init__()
        self.stream = stream

    def emit(self, record):
        msg = self.format(record)
        if self.stream is None:
            print(msg)
            return
        try:
            self.stream.write(msg)
            self.stream.write('\n')
        except Exception:
            # CPython swallows handler errors so logging never breaks
            # the calling code.
            pass


# Registry of named loggers - same as CPython's `logging.Logger.manager.loggerDict`
# in spirit, simpler in shape.
_loggers = {}
_root_handlers = []
# Wrap the root level in a single-element list so module-level
# functions can mutate it without the `global` keyword (Grail's
# codegen doesn't honor `global` yet).
_root_level_box = [WARNING]


def _get_root_level():
    return _root_level_box[0]


def _set_root_level(level):
    _root_level_box[0] = level


class Logger:
    """Logger - the user-facing object.  Each call resolves an
    effective level walking up the parent chain; messages at or above
    that level fan out to the logger's handlers (and the root's if
    `propagate=True`)."""

    def __init__(self, name, lvl=NOTSET):
        # Param renamed (not `level`) so it doesn't collide with the
        # `level` instVar - in Grail, instVars and method parameters
        # share the same slot when they have the same name, so
        # `self.level = level` would corrupt the instVar.
        self.name = name
        self.level = lvl
        self.handlers = []
        self.propagate = True
        # Parent resolution is name-based ('a.b' -> 'a' -> root).
        self.parent = None

    def setLevel(self, value):
        self.level = value

    def getEffectiveLevel(self):
        if self.level != NOTSET:
            return self.level
        if self.parent is not None:
            return self.parent.getEffectiveLevel()
        return _get_root_level()

    def isEnabledFor(self, lvl):
        return lvl >= self.getEffectiveLevel()

    def addHandler(self, handler):
        if handler not in self.handlers:
            self.handlers.append(handler)

    def removeHandler(self, handler):
        if handler in self.handlers:
            self.handlers.remove(handler)

    def hasHandlers(self):
        """True if this logger or any propagated ancestor has at least
        one handler.  CPython framework code consults this before
        falling back to the lastResort handler."""
        logger = self
        while logger is not None:
            if logger.handlers:
                return True
            if not logger.propagate:
                return False
            logger = logger.parent
        return False

    def _log(self, lvl, msg, args):
        if not self.isEnabledFor(lvl):
            return
        record = LogRecord(self.name, lvl, msg, args)
        # Walk own handlers, then propagate up the chain.
        logger = self
        while logger is not None:
            for h in logger.handlers:
                h.handle(record)
            if not logger.propagate:
                return
            logger = logger.parent
        # Reached root - fall back to root handlers.
        for h in _root_handlers:
            h.handle(record)

    def debug(self, msg, *args):
        self._log(DEBUG, msg, args)

    def info(self, msg, *args):
        self._log(INFO, msg, args)

    def warning(self, msg, *args):
        self._log(WARNING, msg, args)

    def warn(self, msg, *args):
        self._log(WARNING, msg, args)

    def error(self, msg, *args):
        self._log(ERROR, msg, args)

    def critical(self, msg, *args):
        self._log(CRITICAL, msg, args)

    def fatal(self, msg, *args):
        self._log(CRITICAL, msg, args)

    def exception(self, msg, *args):
        # CPython attaches exc_info; here we just emit the message at
        # ERROR.  Callers that need the traceback should format it
        # themselves via traceback.format_exc().
        self._log(ERROR, msg, args)

    def log(self, lvl, msg, *args):
        self._log(lvl, msg, args)


def _resolve_parent(name):
    """Find the closest existing ancestor logger by name.  'a.b.c' ->
    'a.b' if present, else 'a', else root."""

    if '.' not in name:
        return _loggers.get('') if '' in _loggers else None
    parts = name.split('.')
    parts.pop()
    while parts:
        candidate = '.'.join(parts)
        if candidate in _loggers:
            return _loggers[candidate]
        parts.pop()
    return _loggers.get('') if '' in _loggers else None


def getLogger(name=None):
    """Return the Logger for `name`, creating it on first request.
    name=None / '' returns the root logger."""

    if name is None or name == '':
        if '' not in _loggers:
            _loggers[''] = Logger('root', _get_root_level())
        return _loggers['']
    if name in _loggers:
        return _loggers[name]
    logger = Logger(name)
    logger.parent = _resolve_parent(name)
    _loggers[name] = logger
    return logger


def basicConfig(**kwargs):
    """basicConfig(level=, format=) - install a StreamHandler on the
    root logger if it has no handlers yet."""

    if 'level' in kwargs:
        _set_root_level(kwargs['level'])
        root = getLogger()
        root.level = kwargs['level']
    if not _root_handlers:
        handler = StreamHandler()
        if 'format' in kwargs:
            handler.setFormatter(Formatter(kwargs['format']))
        _root_handlers.append(handler)


# Module-level convenience wrappers (CPython parity).

def debug(msg, *args):
    getLogger()._log(DEBUG, msg, args)


def info(msg, *args):
    getLogger()._log(INFO, msg, args)


def warning(msg, *args):
    getLogger()._log(WARNING, msg, args)


def warn(msg, *args):
    getLogger()._log(WARNING, msg, args)


def error(msg, *args):
    getLogger()._log(ERROR, msg, args)


def critical(msg, *args):
    getLogger()._log(CRITICAL, msg, args)


def fatal(msg, *args):
    getLogger()._log(CRITICAL, msg, args)


def exception(msg, *args):
    getLogger()._log(ERROR, msg, args)


def log(level, msg, *args):
    getLogger()._log(level, msg, args)


def disable(level=CRITICAL):
    # Disable all logging up to the given level (CPython sets a
    # module-level threshold).  Simplified: bump the root level.
    if level > _get_root_level():
        _set_root_level(level)


__all__ = [
    'NOTSET', 'DEBUG', 'INFO', 'WARNING', 'WARN', 'ERROR', 'CRITICAL', 'FATAL',
    'LogRecord', 'Logger', 'Handler', 'NullHandler', 'StreamHandler',
    'Formatter',
    'getLogger', 'getLevelName', 'basicConfig', 'disable',
    'debug', 'info', 'warning', 'warn', 'error', 'critical', 'fatal',
    'exception', 'log',
]
