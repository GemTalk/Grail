"""Fixtures for what happens when an ``except'' handler itself raises.

Driven by PythonTests>>HandlerRaiseTestCase.  Each check answers True when the
behaviour matches CPython, so a failure names the specific rule.

THE RULE: the ``except'' clauses of one ``try'' are ALTERNATIVES for the try
BODY.  An exception raised inside a handler propagates out of the whole ``try''
statement; it is never offered to that statement's other handlers.

Grail offered it to them.  Handlers compiled to NESTED protected blocks --

    [[ body ] on: T1 do: [H1] ] on: T2 do: [H2]

-- so H1's body ran inside H2's protected block and H2 caught whatever H1 raised.
Every handler but the last was exposed to every handler after it.

That silently breaks one of the most common shapes in Python, the one that
narrows a broad failure into a specific one:

    try:
        parse(text)
    except ValueError as e:
        raise ConfigError(str(e)) from None     # must leave the try
    except Exception:
        log_unexpected()                        # must NOT see ConfigError

It is also how test_traceback's import-suggestion tests are written -- they do
``except ImportError as e: raise e from None'' with an ``except Exception'' after
it, and got the re-raise back in the second handler.  Three earlier theories
about those failures were all wrong (the suspicion was ImportError matching, or
exec, or ModuleNotFoundError's class hierarchy); the fault was here all along, in
try/except codegen, with nothing to do with imports.

The exception a handler raises is a RuntimeError throughout, deliberately.  The
obvious choice is KeyError, and it would make most of these fail for an unrelated
reason: CPython's ``str(KeyError('x'))'' is ``"'x'"'' -- the REPR of the argument,
which is KeyError's own quirk -- while Grail's is a plain ``x''.  That is a real
conformance bug and belongs to its own change; a fixture tripping over it would
report a control-flow failure that was nothing of the kind.

Run this file under CPython (``python3 tests/python/handler_raise.py'') to see
what it produces -- that is where the expectations come from.
"""


def _outcome(fn):
    """What fn() did: its return value, or the exception that escaped it."""
    try:
        return ('returned', fn())
    except BaseException as e:
        return ('raised', type(e).__name__, str(e))


# --------------------------------------------------------------- the core rule
def a_raise_in_a_handler_leaves_the_try():
    def go():
        try:
            raise ValueError('original')
        except ValueError:
            raise RuntimeError('from handler')
        except Exception:
            return 'WRONG: sibling handler ran'
        return 'WRONG: fell through'

    return _outcome(go) == ('raised', 'RuntimeError', 'from handler')


def a_reraise_in_a_handler_leaves_the_try():
    """``raise e from None'' is the idiom the import-suggestion tests use."""
    def go():
        try:
            raise ValueError('original')
        except ValueError as e:
            raise e from None
        except Exception:
            return 'WRONG: sibling handler ran'
        return 'WRONG: fell through'

    return _outcome(go) == ('raised', 'ValueError', 'original')


def a_bare_reraise_in_a_handler_leaves_the_try():
    def go():
        try:
            raise ValueError('original')
        except ValueError:
            raise
        except Exception:
            return 'WRONG: sibling handler ran'
        return 'WRONG: fell through'

    return _outcome(go) == ('raised', 'ValueError', 'original')


def the_later_handler_is_skipped_even_when_it_would_match():
    """``except Exception'' matches a RuntimeError perfectly well.  It still must not
    see one raised by an earlier handler of the same try."""
    def go():
        try:
            raise ValueError('original')
        except ValueError:
            raise RuntimeError('k')
        except RuntimeError:
            return 'WRONG: the matching sibling ran'
        return 'WRONG: fell through'

    return _outcome(go) == ('raised', 'RuntimeError', 'k')


def three_handlers_expose_neither_of_the_first_two():
    def go(which):
        try:
            raise ValueError('original')
        except ValueError:
            if which == 1:
                raise RuntimeError('from first')
            return 'no raise'
        except RuntimeError:
            return 'WRONG: second ran'
        except Exception:
            return 'WRONG: third ran'

    return (_outcome(lambda: go(1)) == ('raised', 'RuntimeError', 'from first')
            and _outcome(lambda: go(0)) == ('returned', 'no raise'))


# ------------------------------------------------- what must keep working
def a_matching_handler_still_catches():
    """The fix must not stop handlers working at all."""
    def go():
        try:
            raise ValueError('v')
        except RuntimeError:
            return 'wrong handler'
        except ValueError as e:
            return 'caught %s' % e
        return 'fell through'

    return _outcome(go) == ('returned', 'caught v')


def the_first_matching_handler_wins():
    def go():
        try:
            raise ValueError('v')
        except ValueError:
            return 'first'
        except Exception:
            return 'second'

    return _outcome(go) == ('returned', 'first')


def an_unmatched_exception_still_propagates():
    def go():
        try:
            raise TypeError('t')
        except RuntimeError:
            return 'wrong'
        return 'fell through'

    return _outcome(go) == ('raised', 'TypeError', 't')


def the_body_result_is_unaffected():
    def go():
        try:
            return 'body ran'
        except Exception:
            return 'handler ran'

    return _outcome(go) == ('returned', 'body ran')


def an_else_clause_still_runs_when_nothing_raised():
    def go():
        marks = []
        try:
            marks.append('body')
        except Exception:
            marks.append('handler')
        else:
            marks.append('else')
        return marks

    return _outcome(go) == ('returned', ['body', 'else'])


def a_finally_still_runs_when_a_handler_raises():
    """The finally belongs to the whole statement, so it runs on the way out
    even though the handler's exception is leaving."""
    marks = []

    def go():
        try:
            raise ValueError('v')
        except ValueError:
            raise RuntimeError('k')
        except Exception:
            marks.append('WRONG: sibling')
        finally:
            marks.append('finally')

    outcome = _outcome(go)
    return outcome == ('raised', 'RuntimeError', 'k') and marks == ['finally']


def a_return_from_a_handler_still_returns():
    """A return inside a handler is a control-flow signal in Grail, and it must
    not be mistaken for an exception a sibling handler can catch."""
    def go():
        try:
            raise ValueError('v')
        except ValueError:
            return 'returned from handler'
        except Exception:
            return 'WRONG: sibling ran'

    return _outcome(go) == ('returned', 'returned from handler')


def a_break_from_a_handler_still_breaks():
    def go():
        seen = []
        for i in range(3):
            try:
                raise ValueError('v')
            except ValueError:
                seen.append(i)
                break
            except Exception:
                seen.append('WRONG')
        return seen

    return _outcome(go) == ('returned', [0])


def a_continue_from_a_handler_still_continues():
    def go():
        seen = []
        for i in range(3):
            try:
                raise ValueError('v')
            except ValueError:
                continue
            except Exception:
                seen.append('WRONG')
        return seen

    return _outcome(go) == ('returned', [])


def a_nested_try_inside_a_handler_still_works():
    """The handler's own try/except is a separate statement and catches
    normally."""
    def go():
        try:
            raise ValueError('outer')
        except ValueError:
            try:
                raise RuntimeError('inner')
            except RuntimeError as e:
                return 'inner caught %s' % e
        except Exception:
            return 'WRONG: sibling ran'

    return _outcome(go) == ('returned', 'inner caught inner')


def a_handler_raise_is_catchable_further_out():
    """It leaves the try -- it does not vanish."""
    def go():
        try:
            try:
                raise ValueError('v')
            except ValueError:
                raise RuntimeError('k')
            except Exception:
                return 'WRONG: sibling ran'
        except RuntimeError as e:
            return 'outer caught %s' % e

    return _outcome(go) == ('returned', 'outer caught k')


def the_context_of_a_handler_raise_is_the_original():
    """PEP 3134: raising inside a handler chains the new exception to the one
    being handled."""
    def go():
        try:
            raise ValueError('original')
        except ValueError:
            raise RuntimeError('from handler')

    try:
        go()
    except RuntimeError as e:
        ctx = e.__context__
        return ctx is not None and type(ctx).__name__ == 'ValueError'
    return False


def from_none_suppresses_the_context():
    def go():
        try:
            raise ValueError('original')
        except ValueError as e:
            raise RuntimeError('k') from None

    try:
        go()
    except RuntimeError as e:
        return e.__cause__ is None and e.__suppress_context__ is True
    return False


if __name__ == '__main__':
    checks = [
        a_raise_in_a_handler_leaves_the_try,
        a_reraise_in_a_handler_leaves_the_try,
        a_bare_reraise_in_a_handler_leaves_the_try,
        the_later_handler_is_skipped_even_when_it_would_match,
        three_handlers_expose_neither_of_the_first_two,
        a_matching_handler_still_catches,
        the_first_matching_handler_wins,
        an_unmatched_exception_still_propagates,
        the_body_result_is_unaffected,
        an_else_clause_still_runs_when_nothing_raised,
        a_finally_still_runs_when_a_handler_raises,
        a_return_from_a_handler_still_returns,
        a_break_from_a_handler_still_breaks,
        a_continue_from_a_handler_still_continues,
        a_nested_try_inside_a_handler_still_works,
        a_handler_raise_is_catchable_further_out,
        the_context_of_a_handler_raise_is_the_original,
        from_none_suppresses_the_context,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
