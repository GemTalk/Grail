# `warnings.filterwarnings(..., module=PATTERN)` scopes a filter to WHERE the
# warning was raised from.  Grail had only fixed-arity positional forms, so the
# call raised "takes a different number of arguments"; then it accepted the
# keyword but could not evaluate it, because nothing recorded a warning's
# origin.  It now does, via BaseException ___liveFrameChain___ -- the same live
# stack capture sys._getframe stands on.
#
# CPython matches `module` against the raising module's dotted `__name__` --
# NOT its filename -- using a regex applied with .match(), which is ANCHORED AT
# THE START.  The filename reading is a plausible trap: the pure-Python
# warn_explicit fallback does derive a name from the filename, so the two look
# interchangeable until tested.  They are not, and matching the filename scopes
# every filter to something no caller writes.
#
# An empty pattern is the empty regex, which matches everything, so it means
# "no constraint" rather than "matches only the empty string".
#
# Both are pinned below against CPython's own answers.

import warnings

r = {}

def escalates(module_pattern):
    """Does an 'error' filter scoped to module_pattern catch OUR warning?"""
    with warnings.catch_warnings():
        warnings.resetwarnings()
        warnings.filterwarnings("error", module=module_pattern)
        try:
            warnings.warn("boom")
            return False
        except UserWarning:
            return True


r['exact_name'] = escalates(__name__)
r['name_prefix'] = escalates(__name__[:4])
r['unrelated_name'] = escalates("no.such.module")
r['a_path_is_not_a_name'] = escalates(__file__)
r['empty_means_no_constraint'] = escalates("")

# --- the signature itself ---------------------------------------------------

def accepts(*a, **kw):
    with warnings.catch_warnings():
        warnings.resetwarnings()
        try:
            warnings.filterwarnings(*a, **kw)
            return 'ok'
        except TypeError:
            return 'TypeError'


r['keyword_module'] = accepts("error", module="x")
r['all_six_positional'] = accepts("error", "msg", UserWarning, "mod", 0, True)
r['keyword_append'] = accepts("ignore", append=True)
r['missing_action'] = accepts()

# `append=True` puts the filter LAST, so an earlier one still wins.
with warnings.catch_warnings():
    warnings.resetwarnings()
    warnings.filterwarnings("ignore")
    warnings.filterwarnings("error", append=True)
    try:
        warnings.warn("boom")
        r['append_goes_last'] = 'ignored'
    except UserWarning:
        r['append_goes_last'] = 'raised'


EXPECTED = {
    'exact_name': 'True',
    'name_prefix': 'True',
    'unrelated_name': 'False',
    'a_path_is_not_a_name': 'False',
    'empty_means_no_constraint': 'True',
    'keyword_module': "'ok'",
    'all_six_positional': "'ok'",
    'keyword_append': "'ok'",
    'missing_action': "'TypeError'",
    'append_goes_last': "'ignored'",
}


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = repr(r[k])
        print('%-28s %s %s' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
