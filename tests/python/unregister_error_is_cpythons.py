"""Fixture: _codecs._unregister_error is CPython's.

CPython 3.14's _codecs has _unregister_error (Modules/_codecsmodule.c:985-1007,
Python/codecs.c:638-650): it removes a custom error handler that
codecs.register_error registered, answers whether there was one, and refuses
the eight built-in handlers.  Grail's _codecs had none, so test_codeccallbacks
could not even be imported: its first line is
``from _codecs import _unregister_error as _codecs_unregister_error''.

Every check holds under CPython 3.14, which is what makes it evidence.
"""

import _codecs
import codecs

r = {}

BUILTINS = ('strict', 'ignore', 'replace', 'xmlcharrefreplace', 'backslashreplace',
            'namereplace', 'surrogatepass', 'surrogateescape')


def outcome(call):
    try:
        return call()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


def custom_handler(exc):
    return ('?', exc.end)


def unregistered_custom():
    name = 'fixture.unregistered_custom'
    codecs.register_error(name, custom_handler)
    registered = codecs.lookup_error(name) is custom_handler
    return [registered, _codecs._unregister_error(name), outcome(lambda: codecs.lookup_error(name))]


def unregistered_twice():
    name = 'fixture.unregistered_twice'
    codecs.register_error(name, custom_handler)
    return [_codecs._unregister_error(name), _codecs._unregister_error(name)]


def registered_again():
    name = 'fixture.registered_again'
    codecs.register_error(name, custom_handler)
    _codecs._unregister_error(name)
    codecs.register_error(name, custom_handler)
    registered = codecs.lookup_error(name) is custom_handler
    _codecs._unregister_error(name)
    return registered


r['a_custom_handler_is_unregistered'] = outcome(unregistered_custom)
r['an_unknown_name_answers_false'] = outcome(lambda: [
    _codecs._unregister_error('fixture.never_registered'),
    outcome(lambda: codecs.lookup_error('fixture.never_registered'))])
r['the_second_unregister_answers_false'] = outcome(unregistered_twice)
r['an_unregistered_name_can_be_registered_again'] = outcome(registered_again)
r['a_builtin_handler_is_refused'] = outcome(lambda: [
    outcome(lambda: _codecs._unregister_error(name)) for name in BUILTINS])
r['a_refused_builtin_stays_registered'] = outcome(lambda: [
    callable(codecs.lookup_error(name)) for name in BUILTINS])
r['the_name_must_be_a_str'] = outcome(lambda: [
    outcome(lambda: _codecs._unregister_error(name)) for name in (1, None, b'x')])
r['the_name_holds_no_nul'] = outcome(lambda: _codecs._unregister_error('a\x00b'))
r['a_name_only_like_a_builtin_is_custom'] = outcome(lambda: [
    _codecs._unregister_error('Strict'), _codecs._unregister_error('strict ')])

EXPECTED = {
    'a_custom_handler_is_unregistered': [
        True, True, "LookupError: unknown error handler name 'fixture.unregistered_custom'"],
    'an_unknown_name_answers_false': [
        False, "LookupError: unknown error handler name 'fixture.never_registered'"],
    'the_second_unregister_answers_false': [True, False],
    'an_unregistered_name_can_be_registered_again': True,
    'a_builtin_handler_is_refused': [
        "ValueError: cannot un-register built-in error handler '%s'" % name for name in BUILTINS],
    'a_refused_builtin_stays_registered': [True] * 8,
    'the_name_must_be_a_str': [
        'TypeError: _unregister_error() argument must be str, not int',
        'TypeError: _unregister_error() argument must be str, not None',
        'TypeError: _unregister_error() argument must be str, not bytes'],
    'the_name_holds_no_nul': 'ValueError: embedded null character',
    'a_name_only_like_a_builtin_is_custom': [False, False],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-44s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
