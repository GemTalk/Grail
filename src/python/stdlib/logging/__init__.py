# GRAIL minimal logging - covers the surface Flask / Werkzeug /
# itsdangerous touch at import + common code paths.
#
# Provided:
#   getLogger(name)                 - a Logger in a parent chain ending at root
#   basicConfig(level=, format=)    - root handler/level config
#   debug / info / warning / error / critical / log - module helpers
#   exception(msg, *args)           - logs the active exception
#   NullHandler                     - silent handler for library use
#   Handler / StreamHandler         - with filters and handleError
#   Formatter                       - '%', '{' and '$' styles over the record
#   Logger / LogRecord              - CPython's attributes and signatures,
#                                     ``extra'', ``stack_info'', ``stacklevel''
#   level constants: DEBUG INFO WARNING ERROR CRITICAL NOTSET
#
# Not provided: configuration file loaders, multiprocessing-safe handlers,
# the lastResort handler, and thread locks (there is one gem per session).
#
# Deliberately NOT vendored from CPython: its module holds a module-level
# RLock, a WeakValueDictionary of handlers and atexit hooks, and in a DEPLOYED
# module every one of those is committed state.  This module keeps the objects
# a framework actually reads and nothing else.

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


def _start_time():
    import time
    return time.time()


_start_time_box = [_start_time()]


class LogRecord:
    """A logging event, with CPython's attribute set.

    Every attribute a ``%(field)s`` format can name is filled here, because a
    format naming one the record lacks used to END THE PROCESS: Flask's
    default handler formats ``%(module)s``, the record had five fields, and the
    missing-key lookup was an uncatchable LookupError (#1221, #1220).  So any
    Flask view that raised took the whole server down instead of answering 500.
    """

    def __init__(self, name, lvl, pathname, lineno, msg, args, exc_info,
                 func=None, sinfo=None, **kwargs):
        import time
        ct = time.time()
        self.name = name
        self.msg = msg
        # ``log.info('%(a)s', {'a': 1})'': a lone non-empty mapping is the
        # mapping the message is formatted against, as in CPython.
        if (args and len(args) == 1 and isinstance(args[0], dict)
                and args[0]):
            args = args[0]
        self.args = args
        self.levelname = getLevelName(lvl)
        self.levelno = lvl
        self.pathname = pathname
        try:
            base = pathname.replace('\\', '/').rsplit('/', 1)[-1]
            self.filename = base
            self.module = base.rsplit('.', 1)[0] if '.' in base else base
        except (TypeError, ValueError, AttributeError):
            self.filename = pathname
            self.module = 'Unknown module'
        self.exc_info = exc_info
        # CPython leaves exc_text for the Formatter.  Rendering it here is a
        # Grail choice kept from before: the traceback is the reason a caller
        # passed exc_info, and it has to be taken while the exception is live.
        self.exc_text = _format_exc_info(exc_info)
        self.stack_info = sinfo
        self.lineno = lineno
        self.funcName = func
        self.created = ct
        self.msecs = float(int((ct - int(ct)) * 1000))
        self.relativeCreated = (ct - _start_time_box[0]) * 1000
        try:
            import threading
            self.thread = threading.get_ident()
            self.threadName = threading.current_thread().name
        except Exception:
            self.thread = None
            self.threadName = None
        self.processName = 'MainProcess'
        try:
            import os
            self.process = os.getpid()
        except Exception:
            self.process = None
        self.taskName = None

    def __repr__(self):
        return '<LogRecord: %s, %s, %s, %s, "%s">' % (
            self.name, self.levelno, self.pathname, self.lineno, self.msg)

    def getMessage(self):
        msg = str(self.msg)
        if self.args:
            msg = msg % self.args
        return msg


def makeLogRecord(dict):
    """A LogRecord whose attributes are taken from ``dict''."""
    rv = LogRecord(None, None, '', 0, '', (), None, None)
    for key in dict:
        setattr(rv, key, dict[key])
    return rv


def _format_exc_info(exc_info):
    """Render ``exc_info`` the way CPython's Formatter would, or None.

    ``True`` means "the exception being handled", which is what
    ``Logger.exception`` and ``logger.error(..., exc_info=True)`` pass. A
    (type, value, traceback) triple or a bare exception instance are both
    accepted, because callers in the wild pass all three.
    """
    if not exc_info:
        return None
    import traceback
    try:
        if exc_info is True:
            text = traceback.format_exc()
            # No active exception: format_exc() answers a "NoneType: None"
            # placeholder, which is noise rather than information.
            if not text or text.startswith('NoneType'):
                return None
            return text.rstrip('\n')
        if isinstance(exc_info, tuple) and len(exc_info) == 3:
            return ''.join(traceback.format_exception(*exc_info)).rstrip('\n')
        if isinstance(exc_info, BaseException):
            return ''.join(traceback.format_exception(
                type(exc_info), exc_info, exc_info.__traceback__)).rstrip('\n')
    except Exception:
        # Logging must not raise. A record with no traceback still carries its
        # message, which is more than an exception here would leave.
        return None
    return None


class PercentStyle:
    default_format = '%(message)s'
    asctime_format = '%(asctime)s'
    asctime_search = '%(asctime)'

    def __init__(self, fmt, *, defaults=None):
        self._fmt = fmt or self.default_format
        self._defaults = defaults

    def usesTime(self):
        return self._fmt.find(self.asctime_search) >= 0

    def validate(self):
        pass

    def _values(self, record):
        values = dict(self._defaults) if self._defaults else {}
        values.update(vars(record))
        return values

    def _format(self, record):
        return self._fmt % self._values(record)

    def format(self, record):
        try:
            return self._format(record)
        except KeyError as e:
            raise ValueError('Formatting field not found in record: %s' % e)


class StrFormatStyle(PercentStyle):
    default_format = '{message}'
    asctime_format = '{asctime}'
    asctime_search = '{asctime'

    def _format(self, record):
        return self._fmt.format(**self._values(record))


class StringTemplateStyle(PercentStyle):
    default_format = '${message}'
    asctime_format = '${asctime}'
    asctime_search = '${asctime}'

    def usesTime(self):
        return ('$asctime' in self._fmt) or (self.asctime_search in self._fmt)

    def _format(self, record):
        # string.Template is CPython's own now (the native string module had
        # it as a None stub, so this used to reimplement the substitution).
        # Imported here so importing logging does not pull in string and re.
        from string import Template
        return Template(self._fmt).substitute(**self._values(record))


BASIC_FORMAT = '%(levelname)s:%(name)s:%(message)s'

_STYLES = {
    '%': (PercentStyle, BASIC_FORMAT),
    '{': (StrFormatStyle, '{levelname}:{name}:{message}'),
    '$': (StringTemplateStyle, '${levelname}:${name}:${message}'),
}


class Formatter:
    """CPython's Formatter: the format is applied to the record's own
    attributes, so every LogRecord field and every ``extra'' key is
    available, in '%', '{' or '$' style."""

    default_time_format = '%Y-%m-%d %H:%M:%S'
    default_msec_format = '%s,%03d'

    def __init__(self, fmt=None, datefmt=None, style='%', validate=True, *,
                 defaults=None):
        if style not in _STYLES:
            raise ValueError('Style must be one of: %s' % ','.join(_STYLES.keys()))
        self._style = _STYLES[style][0](fmt, defaults=defaults)
        self._fmt = self._style._fmt
        self.datefmt = datefmt

    def usesTime(self):
        return self._style.usesTime()

    def formatTime(self, record, datefmt=None):
        import time
        ct = time.localtime(record.created)
        if datefmt:
            return time.strftime(datefmt, ct)
        s = time.strftime(self.default_time_format, ct)
        if self.default_msec_format:
            s = self.default_msec_format % (s, record.msecs)
        return s

    def formatException(self, ei):
        return _format_exc_info(ei) or ''

    def formatStack(self, stack_info):
        return stack_info

    def formatMessage(self, record):
        return self._style.format(record)

    def format(self, record):
        record.message = record.getMessage()
        if self.usesTime():
            record.asctime = self.formatTime(record, self.datefmt)
        s = self.formatMessage(record)
        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            if s[-1:] != '\n':
                s = s + '\n'
            s = s + record.exc_text
        if record.stack_info:
            if s[-1:] != '\n':
                s = s + '\n'
            s = s + self.formatStack(record.stack_info)
        return s


_default_formatter = Formatter()


raiseExceptions = True


class Filterer:
    """The filter list Handler and Logger share."""

    def __init__(self):
        self.filters = []

    def addFilter(self, filter):
        if filter not in self.filters:
            self.filters.append(filter)

    def removeFilter(self, filter):
        if filter in self.filters:
            self.filters.remove(filter)

    def filter(self, record):
        for f in self.filters:
            result = f.filter(record) if hasattr(f, 'filter') else f(record)
            if not result:
                return False
        return True


class Handler(Filterer):
    """Base handler.  Subclasses override emit(record)."""

    def __init__(self, lvl=NOTSET):
        # Param named `lvl` (not `level`): in Grail a parameter and an instVar
        # of the same name share a slot, so `self.level = level` would be a
        # self-assignment.
        Filterer.__init__(self)
        self.level = lvl
        self.formatter = None
        self.name = None

    def setLevel(self, value):
        self.level = value

    def setFormatter(self, fmt):
        self.formatter = fmt

    def format(self, record):
        fmt = self.formatter if self.formatter is not None else _default_formatter
        return fmt.format(record)

    def handle(self, record):
        rv = self.filter(record)
        if rv:
            self.emit(record)
        return rv

    def emit(self, record):
        raise NotImplementedError('emit must be implemented by Handler subclasses')

    def handleError(self, record):
        """CPython's: report a failure INSIDE logging on stderr and carry on.

        A logging call must not take its caller down.  Without this a handler
        that could not format its record propagated the error out of the
        logging call -- out of Flask's own error report, in #1221."""
        import sys
        if not (raiseExceptions and sys.stderr):
            return
        try:
            import traceback
            sys.stderr.write('--- Logging error ---\n')
            sys.stderr.write(traceback.format_exc())
            try:
                sys.stderr.write('Message: %r\nArguments: %s\n'
                                 % (record.msg, record.args))
            except RecursionError:
                raise
            except Exception:
                sys.stderr.write('Unable to print the message and arguments'
                                 ' - possible formatting error.\nUse the'
                                 ' traceback above to help find the error.\n')
        except OSError:
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
    """Writes formatted records to a stream.  With no stream, to print()."""
    __class_getitem__ = classmethod(type(list[int]))  # types.GenericAlias, as CPython's

    terminator = '\n'

    def __init__(self, stream=None):
        super().__init__()
        self.stream = stream

    def flush(self):
        if self.stream is not None and hasattr(self.stream, 'flush'):
            self.stream.flush()

    def emit(self, record):
        try:
            msg = self.format(record)
            if self.stream is None:
                print(msg)
                return
            self.stream.write(msg + self.terminator)
            self.flush()
        except RecursionError:
            raise
        except Exception:
            self.handleError(record)


class Logger(Filterer):
    """Logger - the user-facing object, in a parent chain that ends at the
    root logger, as in CPython.  Flask decides whether to install its own
    handler by walking ``.parent'' looking for one, and the chain used to stop
    at None, so it always did -- even after basicConfig."""

    def __init__(self, name, lvl=NOTSET):
        # Param named `lvl`, not `level` -- see Handler.__init__.
        Filterer.__init__(self)
        self.name = name
        self.level = lvl
        self.handlers = []
        self.propagate = True
        self.disabled = False
        self.parent = None

    def setLevel(self, value):
        self.level = value

    def getEffectiveLevel(self):
        logger = self
        while logger is not None:
            if logger.level != NOTSET:
                return logger.level
            logger = logger.parent
        return _get_root_level()

    def isEnabledFor(self, lvl):
        return lvl >= self.getEffectiveLevel() and lvl > _disable_box[0]

    def addHandler(self, handler):
        if handler not in self.handlers:
            self.handlers.append(handler)

    def removeHandler(self, handler):
        if handler in self.handlers:
            # Replace the list rather than mutate it, so a callHandlers()
            # already iterating the old one is undisturbed: a handler that
            # removes itself in emit() no longer makes the next handler
            # miss the record (CPython 3.14.8, gh-79366).
            remaining = self.handlers.copy()
            remaining.remove(handler)
            self.handlers = remaining

    def hasHandlers(self):
        """True if this logger or any propagated ancestor has a handler."""
        logger = self
        while logger is not None:
            if logger.handlers:
                return True
            if not logger.propagate:
                return False
            logger = logger.parent
        return False

    def getChild(self, suffix):
        if self.parent is None:
            return getLogger(suffix)
        return getLogger(self.name + '.' + suffix)

    def findCaller(self, stack_info=False, stacklevel=1):
        """(filename, lineno, funcName, stack text) of the frame that called
        into logging, skipping this module's own frames."""
        import sys
        try:
            f = sys._getframe(0)
            own = f.f_code.co_filename
            while f is not None and f.f_code.co_filename == own:
                f = f.f_back
            while f is not None and stacklevel > 1:
                f = f.f_back
                stacklevel -= 1
            if f is None:
                return '(unknown file)', 0, '(unknown function)', None
            sinfo = None
            if stack_info:
                import traceback
                sinfo = ('Stack (most recent call last):\n'
                         + ''.join(traceback.format_stack(f)).rstrip('\n'))
            return f.f_code.co_filename, f.f_lineno, f.f_code.co_name, sinfo
        except Exception:
            return '(unknown file)', 0, '(unknown function)', None

    def makeRecord(self, name, lvl, fn, lno, msg, args, exc_info,
                   func=None, extra=None, sinfo=None):
        rv = LogRecord(name, lvl, fn, lno, msg, args, exc_info, func, sinfo)
        if extra is not None:
            existing = vars(rv)
            for key in extra:
                if key in ('message', 'asctime') or key in existing:
                    raise KeyError('Attempt to overwrite %r in LogRecord' % key)
                setattr(rv, key, extra[key])
        return rv

    def _log(self, lvl, msg, args, exc_info=None, extra=None,
             stack_info=False, stacklevel=1):
        fn, lno, func, sinfo = self.findCaller(stack_info, stacklevel)
        record = self.makeRecord(self.name, lvl, fn, lno, msg, args,
                                 exc_info, func, extra, sinfo)
        self.handle(record)

    def handle(self, record):
        if self.disabled or not self.filter(record):
            return
        self.callHandlers(record)

    def callHandlers(self, record):
        logger = self
        while logger is not None:
            for h in logger.handlers:
                if record.levelno >= h.level:
                    h.handle(record)
            if not logger.propagate:
                return
            logger = logger.parent

    def debug(self, msg, *args, **kwargs):
        if self.isEnabledFor(DEBUG):
            self._log(DEBUG, msg, args, **kwargs)

    def info(self, msg, *args, **kwargs):
        if self.isEnabledFor(INFO):
            self._log(INFO, msg, args, **kwargs)

    def warning(self, msg, *args, **kwargs):
        if self.isEnabledFor(WARNING):
            self._log(WARNING, msg, args, **kwargs)

    def warn(self, msg, *args, **kwargs):
        self.warning(msg, *args, **kwargs)

    def error(self, msg, *args, **kwargs):
        if self.isEnabledFor(ERROR):
            self._log(ERROR, msg, args, **kwargs)

    def critical(self, msg, *args, **kwargs):
        if self.isEnabledFor(CRITICAL):
            self._log(CRITICAL, msg, args, **kwargs)

    fatal = critical

    def exception(self, msg, *args, exc_info=True, **kwargs):
        self.error(msg, *args, exc_info=exc_info, **kwargs)

    def log(self, lvl, msg, *args, **kwargs):
        if self.isEnabledFor(lvl):
            self._log(lvl, msg, args, **kwargs)


class RootLogger(Logger):
    def __init__(self, lvl):
        Logger.__init__(self, 'root', lvl)


# Registry of named loggers - CPython's Logger.manager.loggerDict in spirit.
_loggers = {}
# Wrap mutable module state in single-element lists so module-level functions
# can change it without the `global` keyword.
_root_level_box = [WARNING]
_disable_box = [NOTSET]


def _get_root_level():
    return _root_level_box[0]


def _set_root_level(level):
    _root_level_box[0] = level


# The root logger EXISTS from import, so every logger's chain ends at it, and
# basicConfig installs into its own handlers.
root = RootLogger(WARNING)
_loggers[''] = root


def _resolve_parent(name):
    """The closest existing ancestor: 'a.b.c' -> 'a.b', else 'a', else root."""
    parts = name.split('.')
    parts.pop()
    while parts:
        candidate = '.'.join(parts)
        if candidate in _loggers:
            return _loggers[candidate]
        parts.pop()
    return root


def getLogger(name=None):
    """The Logger for `name`, created on first request; None / '' is root.

    A logger made after its descendants becomes their parent, as CPython's
    placeholder fix-up does: getLogger('a.b') then getLogger('a') leaves 'a.b'
    under 'a', not under root."""
    if name is None or name == '' or name == 'root':
        return root
    if name in _loggers:
        return _loggers[name]
    logger = Logger(name)
    logger.parent = _resolve_parent(name)
    # A descendant made earlier hung from a shorter ancestor (or root); this
    # logger now sits between them.
    prefix = name + '.'
    for other in list(_loggers.values()):
        parent = other.parent
        if (parent is not None and other.name.startswith(prefix)
                and (parent is root or not parent.name.startswith(prefix))):
            other.parent = logger
    _loggers[name] = logger
    return logger


def basicConfig(**kwargs):
    """basicConfig(level=, format=, datefmt=, style=, stream=, force=) -
    install a StreamHandler on the root logger if it has none yet."""
    if kwargs.get('force'):
        del root.handlers[:]
    if 'level' in kwargs:
        _set_root_level(kwargs['level'])
        root.level = kwargs['level']
    if not root.handlers:
        handler = StreamHandler(kwargs.get('stream'))
        style = kwargs.get('style', '%')
        fmt = kwargs.get('format', _STYLES.get(style, _STYLES['%'])[1])
        handler.setFormatter(Formatter(fmt, kwargs.get('datefmt'), style))
        root.addHandler(handler)


# Module-level convenience wrappers (CPython parity).

def debug(msg, *args, **kwargs):
    root.debug(msg, *args, **kwargs)


def info(msg, *args, **kwargs):
    root.info(msg, *args, **kwargs)


def warning(msg, *args, **kwargs):
    root.warning(msg, *args, **kwargs)


def warn(msg, *args, **kwargs):
    root.warning(msg, *args, **kwargs)


def error(msg, *args, **kwargs):
    root.error(msg, *args, **kwargs)


def critical(msg, *args, **kwargs):
    root.critical(msg, *args, **kwargs)


def fatal(msg, *args, **kwargs):
    root.critical(msg, *args, **kwargs)


def exception(msg, *args, exc_info=True, **kwargs):
    root.error(msg, *args, exc_info=exc_info, **kwargs)


def log(level, msg, *args, **kwargs):
    root.log(level, msg, *args, **kwargs)


def disable(level=CRITICAL):
    """Suppress every record at or below ``level'', on every logger."""
    _disable_box[0] = level


__all__ = [
    'NOTSET', 'DEBUG', 'INFO', 'WARNING', 'WARN', 'ERROR', 'CRITICAL', 'FATAL',
    'LogRecord', 'Logger', 'Handler', 'NullHandler', 'StreamHandler',
    'Formatter', 'Filter', 'Filterer', 'FileHandler', 'LoggerAdapter',
    'BASIC_FORMAT', 'PercentStyle', 'StrFormatStyle', 'StringTemplateStyle',
    'makeLogRecord', 'root', 'raiseExceptions',
    'getLogger', 'getLevelName', 'basicConfig', 'disable',
    'debug', 'info', 'warning', 'warn', 'error', 'critical', 'fatal',
    'exception', 'log',
]


class Filter:
    """Base filter — subclassed by django.utils.log's RequireDebugTrue/
    RequireDebugFalse.  Default passes every record."""

    def __init__(self, name=""):
        self.name = name
        self.nlen = len(name)

    def filter(self, record):
        if self.nlen == 0 or self.name == record.name:
            return True
        return record.name.startswith(self.name) and record.name[self.nlen] == '.'


class FileHandler(StreamHandler):
    def __init__(self, filename, mode="a", encoding=None, delay=False,
                 errors=None):
        StreamHandler.__init__(self)
        self.baseFilename = filename


class LoggerAdapter:
    __class_getitem__ = classmethod(type(list[int]))  # types.GenericAlias, as CPython's

    def __init__(self, logger, extra=None):
        self.logger = logger
        self.extra = extra

    def debug(self, msg, *args, **kwargs):
        self.logger.debug(msg, *args, **kwargs)

    def info(self, msg, *args, **kwargs):
        self.logger.info(msg, *args, **kwargs)

    def warning(self, msg, *args, **kwargs):
        self.logger.warning(msg, *args, **kwargs)

    def error(self, msg, *args, **kwargs):
        self.logger.error(msg, *args, **kwargs)

    def exception(self, msg, *args, exc_info=True, **kwargs):
        self.logger.error(msg, *args, exc_info=exc_info, **kwargs)

    def critical(self, msg, *args, **kwargs):
        self.logger.critical(msg, *args, **kwargs)


def captureWarnings(capture=True):
    pass
