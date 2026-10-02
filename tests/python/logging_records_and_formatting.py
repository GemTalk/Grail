"""logging's records, formatting and logger chain behave as CPython's do.

Grail's minimal logging had four gaps that lined up into a crash (#1221):

  * a logger's ``parent'' chain stopped at None instead of reaching root, so
    Flask never found the root handler basicConfig installed;
  * a LogRecord had five fields, so a format naming ``%(module)s'' (Flask's
    default handler does) had nothing to format;
  * ``extra'' and ``stack_info'' were accepted and dropped;
  * a handler that could not format its record raised out of the logging call.

And a missing ``%(key)s'' was an UNCATCHABLE Smalltalk LookupError rather than
KeyError (#1220), so the second gap ended the process -- any Flask view that
raised took the whole server down.

Every expectation here was measured against CPython 3.14; this file is
self-running, so check_python_fixtures.sh checks it there.
"""

import collections
import io
import logging

RESULTS = {}


def check(name, got, want):
    RESULTS[name] = (got == want) or ('got: ' + repr(got)[:200])


def _raises(fn):
    try:
        fn()
        return None
    except BaseException as exc:
        return type(exc).__name__


def _capture(logger, fmt, style='%'):
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter(fmt, style=style))
    logger.addHandler(handler)
    return stream, handler


# ------------------------------------------------------------ #1220

class _Missing(dict):
    def __missing__(self, key):
        return '<' + key + '>'


check('a_missing_mapping_key_raises_a_catchable_KeyError',
      _raises(lambda: '%(x)s' % {}), 'KeyError')
check('__missing___is_honoured', '%(x)s' % _Missing(), '<x>')
check('defaultdict_is_honoured',
      '%(x)s' % collections.defaultdict(int), '0')

# ------------------------------------------------------------ the logger chain

check('every_logger_chain_ends_at_root',
      logging.getLogger('zz_chain').parent is logging.getLogger(), True)
check('a_dotted_logger_hangs_from_its_parent',
      logging.getLogger('zz_chain.child').parent is logging.getLogger('zz_chain'),
      True)
_late_child = logging.getLogger('zz_late.a.b')
logging.getLogger('zz_late')
check('a_logger_made_later_becomes_the_parent_of_earlier_descendants',
      _late_child.parent is logging.getLogger('zz_late'), True)
check('getLogger_root_is_the_root_logger',
      (logging.getLogger() is logging.root, logging.root.name), (True, 'root'))

# ------------------------------------------------------------ record fields

_log = logging.getLogger('zz_fields')
_log.propagate = False
_log.setLevel(logging.DEBUG)
_stream, _handler = _capture(
    _log, '%(name)s|%(levelname)s|%(module)s|%(funcName)s|%(message)s')


def _emit_from_here():
    _log.warning('hello %s', 'world')


_emit_from_here()
check('a_format_names_the_callers_module_and_function',
      _stream.getvalue(),
      'zz_fields|WARNING|logging_records_and_formatting|_emit_from_here|hello world\n')

_records = []


class _Keep(logging.Handler):
    def emit(self, record):
        _records.append(record)


_keep = _Keep()
_log.addHandler(_keep)
_log.info('x', extra={'user': 'u1'})
_rec = _records[-1]
check('a_record_carries_cpythons_fields',
      all(hasattr(_rec, a) for a in (
          'name', 'msg', 'args', 'levelname', 'levelno', 'pathname',
          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
          'thread', 'threadName', 'processName', 'process')), True)
check('extra_lands_on_the_record', _rec.user, 'u1')
check('extra_may_not_overwrite_a_record_field',
      _raises(lambda: _log.info('x', extra={'msg': 'clobbered'})), 'KeyError')
check('a_lone_mapping_argument_formats_the_message',
      (_log.info('%(a)s-%(b)s', {'a': 1, 'b': 2}), _records[-1].getMessage())[1],
      '1-2')
_log.info('with stack', stack_info=True)
check('stack_info_renders_a_stack',
      (_records[-1].stack_info or '').startswith('Stack (most recent call last):'),
      True)
_log.removeHandler(_keep)
_log.removeHandler(_handler)

# ------------------------------------------------------------ formatter styles

_s, _h = _capture(logging.getLogger('zz_brace'), '{levelname}:{message}', '{')
logging.getLogger('zz_brace').error('braced')
check('brace_style', _s.getvalue(), 'ERROR:braced\n')
_s, _h = _capture(logging.getLogger('zz_dollar'), '$levelname:$message', '$')
logging.getLogger('zz_dollar').error('dollared')
check('dollar_style', _s.getvalue(), 'ERROR:dollared\n')
check('an_unknown_style_is_refused',
      _raises(lambda: logging.Formatter('x', style='?')), 'ValueError')
check('the_default_formatter_is_message_only',
      logging.Formatter()._fmt, '%(message)s')

# ------------------------------------------------------------ handleError

_bad = logging.getLogger('zz_bad')
_bad.propagate = False
_bs, _bh = _capture(_bad, '%(no_such_field)s')
_saved_stderr = __import__('sys').stderr
_err = io.StringIO()
__import__('sys').stderr = _err
try:
    _bad.error('cannot be formatted')
    _survived = True
finally:
    __import__('sys').stderr = _saved_stderr
check('a_format_naming_a_missing_field_does_not_raise_out_of_the_call',
      _survived, True)
check('it_is_reported_as_a_logging_error_instead',
      _err.getvalue().startswith('--- Logging error ---'), True)
check('nothing_reached_the_stream', _bs.getvalue(), '')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
