# Minimal `keyword` stub for Grail.  Used by jinja2.compiler to
# detect when a template variable name collides with a Python
# keyword (so the generated Python code can rename it).  Returning
# an accurate keyword set keeps that detection working.

kwlist = [
    "False", "None", "True", "and", "as", "assert", "async",
    "await", "break", "class", "continue", "def", "del", "elif",
    "else", "except", "finally", "for", "from", "global", "if",
    "import", "in", "is", "lambda", "nonlocal", "not", "or",
    "pass", "raise", "return", "try", "while", "with", "yield",
    "match", "case",
]

softkwlist = ["_", "case", "match", "type"]


def iskeyword(s):
    return s in kwlist


def issoftkeyword(s):
    return s in softkwlist
