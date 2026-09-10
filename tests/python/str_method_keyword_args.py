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
# Reached in real code through jinja2: Grail's compile() answers SOURCE TEXT
# rather than a code object, so jinja2/debug.py's fake_traceback() finds a
# str where it expects a CodeType, `hasattr(code, "replace")' is True because
# str.replace exists, and `code.replace(co_name=location)' becomes exactly
# this call.  The facts that make that misrouting possible are pinned here
# too, so a future real compile() breaks these instead of passing silently.

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

# --- why jinja2 ends up here ----------------------------------------------
# compile() answers the source string, so every code-object attribute is
# missing while every str method is present.  `replace' is in both APIs, and
# that collision is the whole accident.
_compiled = compile("pass", "<fixture>", "exec")
_record("compile_answers_a_str", lambda: isinstance(_compiled, str))
_record("compiled_has_no_co_name", lambda: not hasattr(_compiled, "co_name"))
_record("compiled_has_replace", lambda: hasattr(_compiled, "replace"))


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
    """The call jinja2/debug.py:122 makes on a compile() result it believes is
    a CodeType.  This is the line that used to kill a Flask app rendering a
    template that named a filter the environment did not have; it now raises,
    so jinja2's error reporting can report the real error instead."""
    return compile("pass", "<fixture>", "exec").replace(co_name="template")


# --- and the results, which is the regression test ------------------------
_record("all_keywords", all_keywords)
_record("partial_keyword", partial_keyword)
_record("as_jinja2_calls_it", as_jinja2_calls_it)
