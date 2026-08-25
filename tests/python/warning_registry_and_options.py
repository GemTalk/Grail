"""Four small contracts of warn() that each broke differently.

THE CALLER GETS A ``__warningregistry__``.  CPython creates one in the
warning module's globals on first use and stamps it with the filter version
-- even for a warning the filters IGNORE, because the stamp happens before
the filters are consulted.  It is a documented, test-read global:
test.test_warnings reads the bare name and expects exactly ``['version']``
after an ignored warn.  Grail deduped through a session-wide table and never
created the per-module registry at all, so the bare name was a NameError.

A BROKEN ``__str__`` IS THE CALLER'S TO SEE.  A warning that fails to format
itself -- issue 6415's bad %-template -- must let the ValueError out of
warn(), not swallow it into a wrong message.  Only a MISSING __str__ falls
back to a default rendering.

THE CATEGORY IS VALIDATED.  None or a Warning subclass; a string, an
unrelated class, or a Warning INSTANCE in the category slot is a TypeError
naming the offender -- unless the MESSAGE is a Warning instance, in which
case the category is taken from it and the slot is ignored.

``_setoption`` INSTALLS A FILTER THAT WORKS.  The -W option parser is
CPython's own code, delegated to; its filter lands in the live filter list.
Malformed options are _OptionError, and a dotted category is imported and
resolved -- or refused.

Every expectation below was checked against CPython 3.14.
"""

import warnings

RESULTS = {}


def check(name, fn, expected):
    try:
        got = fn()
    except BaseException as exc:
        RESULTS[name] = 'raised %s: %s' % (type(exc).__name__, exc)
        return
    RESULTS[name] = True if got == expected else 'expected %r, got %r' % (
        expected, got)


# ------------------------------------------------- the caller's registry

def _ignored_warn_stamps_the_registry():
    globals().pop('__warningregistry__', None)
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.filterwarnings('ignore', category=UserWarning)
        warnings.warn('registry stamp probe', UserWarning)
    return list(__warningregistry__)  # noqa: F821


check('an_ignored_warn_stamps_the_callers_registry',
      _ignored_warn_stamps_the_registry, ['version'])


def _shown_warns_are_recorded_per_site():
    globals().pop('__warningregistry__', None)
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.filterwarnings('default', category=UserWarning)
        with warnings.catch_warnings(record=True):
            warnings.warn('per-site probe', UserWarning)
    reg = __warningregistry__  # noqa: F821
    return ('version' in reg, len(reg))


check('a_shown_warn_is_recorded_beside_the_stamp',
      _shown_warns_are_recorded_per_site, (True, 2))


# ------------------------------------------------- a broken __str__

class _BadStr(Warning):
    def __str__(self):
        return "A bad formatted string %(err)" % {"err": "nope"}


def _bad_str_propagates():
    try:
        warnings.warn(_BadStr())
        return 'did not raise'
    except ValueError:
        return 'ValueError'


check('a_broken_str_raises_out_of_warn', _bad_str_propagates, 'ValueError')


# ------------------------------------------------- category validation

def _category(msg, cat):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            warnings.warn(msg, cat)
        return 'accepted'
    except TypeError as exc:
        text = str(exc)
        if text.startswith('category must be a Warning subclass, not '):
            return 'TypeError'
        return 'TypeError with wrong text: %s' % text


class _NotAWarning:
    pass


check('a_string_category_is_rejected', lambda: _category('m', ''),
      'TypeError')
check('an_unrelated_class_is_rejected', lambda: _category('m', _NotAWarning),
      'TypeError')
check('a_warning_instance_in_the_category_slot_is_rejected',
      lambda: _category('m', UserWarning('x')), 'TypeError')
check('none_defaults_to_userwarning', lambda: _category('m', None),
      'accepted')


def _a_warning_message_overrides_the_slot():
    """A Warning INSTANCE as the message takes its own class; the slot is
    ignored, nonsense and all."""
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always')
        warnings.warn(UserWarning('by instance'), '')
        return w[0].category.__name__


check('a_warning_message_overrides_the_category_slot',
      _a_warning_message_overrides_the_slot, 'UserWarning')


# ------------------------------------------------- _setoption

def _setoption_takes_effect():
    with warnings.catch_warnings():
        warnings._setoption('error::Warning::0')
        try:
            warnings.warn('convert to error')
            return 'no raise'
        except UserWarning:
            return 'raised'


check('setoption_installs_a_working_filter', _setoption_takes_effect,
      'raised')


def _setoption_rejects(arg):
    try:
        with warnings.catch_warnings():
            warnings._setoption(arg)
        return 'accepted'
    except warnings._OptionError:
        return '_OptionError'


check('too_many_fields_is_an_optionerror',
      lambda: _setoption_rejects('1:2:3:4:5:6'), '_OptionError')
check('a_bogus_action_is_an_optionerror',
      lambda: _setoption_rejects('bogus::Warning'), '_OptionError')
check('a_numeric_category_is_an_optionerror',
      lambda: _setoption_rejects('ignore::123'), '_OptionError')
check('an_unknown_dotted_category_is_an_optionerror',
      lambda: _setoption_rejects('ignore::nosuch.module.Warning'),
      '_OptionError')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-6s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
