# A builtin str method called with its arguments by KEYWORD.
#
# CPython answers TypeError ("str.replace() takes no keyword arguments").
# Grail reads `old' and `new' straight out of the positional array without
# a bounds check, so a keyword-only call indexes past the end and dies with
# an uncatchable Smalltalk OffsetError -- error 2003, objErrBadOffsetIncomplete
# -- which no `except BaseException' can see and which ends the session.
#
# FIXED.  ``_replace:'' now bounds-checks its positional array and raises the
# TypeError CPython raises, so the three spellings below are ordinary errors
# and this module records them like any other.  Before the fix, importing this
# file ended the session -- which is why they used to sit in uncalled functions
# with a note.  They are still functions, so a reader can see each one alone.
#
# HOW IT WAS REACHED IN REAL CODE, and why that route is now gone.  Grail's
# compile() used to answer SOURCE TEXT rather than a code object, so
# jinja2/debug.py's fake_traceback() found a str where it expected a CodeType,
# `hasattr(code, "replace")' was True because str.replace exists, and
# `code.replace(co_name=location)' became exactly this call.  The bounds check
# turned that from a dead session into a TypeError -- but jinja2 still could
# not name the frame.
#
# compile() now answers a real code object with a `replace' of its own, so the
# call lands where jinja2 meant it to and returns a renamed copy.  The rows
# below record that, and they are deliberately the rows that BROKE when
# compile() changed: they were written to break rather than quietly move
# jinja2 onto a different method, and they did.

RESULTS = {}


def _record(key, fn):
    """Store fn()'s value, or ('raised', ExcName, str(exc)) if it raised."""
    try:
        RESULTS[key] = fn()
    except BaseException as e:
        RESULTS[key] = ("raised", type(e).__name__, str(e))


# --- the positional forms, which must keep working ------------------------
_record("replace_two_positional", lambda: "abcabc".replace("a", "X") == "XbcXbc")
_record("replace_three_positional", lambda: "abcabc".replace("a", "X", 1) == "Xbcabc")

# Grail accepts `count' as a keyword; `_replace: positional kw:' reads it out
# of kwargs by name.  CPython does NOT -- str.replace is positional-only there
# -- so this is a deliberate Grail extension, recorded rather than endorsed.
# It is also the proof that the kwargs dict IS reachable at this call site,
# which is why `old'/`new' failing to consult it is an oversight and not a
# limitation.
_record("replace_count_keyword", lambda: "abcabc".replace("a", "X", count=1) == "Xbcabc")

# --- why jinja2 no longer ends up here -------------------------------------
# compile() answers a code object, so the code-object attributes are present
# and `replace' is the code object's own.  `replace' being in BOTH APIs is
# what made the collision possible; these rows say which one now answers.
_compiled = compile("pass", "<fixture>", "exec")
_record("compile_answers_a_str", lambda: isinstance(_compiled, str))
_record("compiled_has_co_name", lambda: hasattr(_compiled, "co_name"))
_record("compiled_has_replace", lambda: hasattr(_compiled, "replace"))
_record("compiled_co_filename", lambda: _compiled.co_filename)


# --- the spellings that used to be fatal -----------------------------------
def all_keywords():
    """`old' and `new' both by keyword: the positional array is empty.

    Was: `positional at: 1' reporting max:0 actual:1, fatally.
    Now: TypeError, as CPython raises."""
    return "abcabc".replace(old="a", new="X")


def partial_keyword():
    """One positional, one keyword.

    Was: `positional at: 2' reporting max:1 actual:2 -- the offset tracked the
    number of positionals supplied, which is what identified the unguarded
    reads as the fault.
    Now: TypeError."""
    return "abcabc".replace("a", new="X")


def as_jinja2_calls_it():
    """The call jinja2/debug.py:122 makes on a compile() result.

    It used to kill a Flask app rendering a template that named a filter the
    environment did not have: the result was a str, `replace' was str.replace,
    and a keyword-only call on it ended the session.  The bounds check made it
    a TypeError; a real code object makes it WORK, which is what jinja2 wanted
    -- it answers a copy named for the template."""
    return compile("pass", "<fixture>", "exec").replace(co_name="template").co_name


# --- and the results, which is the regression test ------------------------
_record("all_keywords", all_keywords)
_record("partial_keyword", partial_keyword)
_record("as_jinja2_calls_it", as_jinja2_calls_it)
