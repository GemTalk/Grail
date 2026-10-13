"""logging's Manager, setLoggerClass, and the level-name maps, as in CPython.

Grail's logging kept its loggers in a module dict and offered no
``Logger.manager``, so pytest's own logging plugin -- which walks
``logging.root.manager.loggerDict`` when every session starts -- raised
AttributeError and ended the run with an INTERNALERROR.  pip installs its
own Logger subclass with ``logging.setLoggerClass`` at import, in nearly
every one of its modules, and that did not exist either.

The manager is a view over the registry and the disable level getLogger()
and disable() already use, so both ways of reaching them agree.  Every
expectation was measured against CPython 3.14; global state this file
changes (the logger class, the disable level) is put back.
"""

import io
import logging
import weakref

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


PREFIX = 'grail_logging_manager_fixture'
child = logging.getLogger(PREFIX + '.child')
manager = logging.root.manager

check('every_logger_shares_one_manager',
      (manager is logging.Logger.manager, child.manager is manager,
       logging.getLogger().manager is manager, manager.root is logging.root),
      (True, True, True, True))
check('the_registry_holds_named_loggers_and_not_root',
      (manager.loggerDict.get(PREFIX + '.child') is child,
       '' in manager.loggerDict, 'root' in manager.loggerDict,
       manager.getLogger(PREFIX + '.child') is child),
      (True, False, False, True))


def _disable_round_trip():
    saved = manager.disable
    try:
        logging.disable(logging.INFO)
        seen = [manager.disable, child.isEnabledFor(logging.INFO),
                child.isEnabledFor(logging.WARNING)]
        manager.disable = logging.NOTSET
        seen.append(child.isEnabledFor(logging.WARNING))
        return seen
    finally:
        manager.disable = saved


check('disable_is_one_setting_read_two_ways', _disable_round_trip(),
      [logging.INFO, False, True, True])


class Recording(logging.Logger):
    pass


def _custom_class():
    saved = logging.getLoggerClass()
    try:
        logging.setLoggerClass(Recording)
        made = logging.getLogger(PREFIX + '.custom')
        return (logging.getLoggerClass() is Recording, type(made) is Recording)
    finally:
        logging.setLoggerClass(saved)


check('set_logger_class_decides_what_getlogger_makes', _custom_class(), (True, True))
check('the_default_logger_class_is_logger', logging.getLoggerClass() is logging.Logger, True)


def _refused(klass):
    try:
        logging.setLoggerClass(klass)
    except TypeError as exc:
        return str(exc)
    return 'accepted'


check('a_class_not_derived_from_logger_is_refused', _refused(dict),
      'logger not derived from logging.Logger: dict')


def _name_not_a_string():
    try:
        logging.getLogger(5)
    except TypeError as exc:
        return str(exc)
    return 'accepted'


check('a_logger_name_must_be_a_string', _name_not_a_string(),
      'A logger name must be a string')

check('level_names_answer_both_ways',
      (logging.getLevelName(logging.INFO), logging.getLevelName('INFO'),
       logging.getLevelName('WARN'), logging.getLevelName(35),
       logging.getLevelName('NOPE')),
      ('INFO', 20, 30, 'Level 35', 'Level NOPE'))
check('the_name_to_level_map', (logging._nameToLevel['ERROR'],
                                 logging.getLevelNamesMapping()['FATAL'],
                                 logging.getLevelNamesMapping() is logging._nameToLevel),
      (40, 50, False))


class _Closing(io.StringIO):
    def __init__(self):
        super().__init__()
        self.flushed = False

    def flush(self):
        self.flushed = True


def _shutdown_flushes():
    stream = _Closing()
    handler = logging.StreamHandler(stream)
    closed = []
    handler.close = lambda: closed.append(True)
    logging.shutdown([weakref.ref(handler)])
    return (stream.flushed, closed)


check('shutdown_flushes_and_closes_the_handlers_given', _shutdown_flushes(),
      (True, [True]))


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
