import warnings


def warn_default():
    warnings.warn("hello")
    return "ok"


def warn_with_category():
    warnings.warn("old API", DeprecationWarning)
    return "ok"


def warn_ignored():
    warnings.simplefilter("ignore")
    warnings.warn("should be silent")
    warnings.resetwarnings()
    return "ok"


def warn_as_error():
    warnings.simplefilter("error")
    try:
        warnings.warn("boom", UserWarning)
        result = "no-exception"
    except UserWarning:
        result = "caught"
    warnings.resetwarnings()
    return result


def warn_catch_restores():
    # snapshot empty, install ignore filter inside, expect restoration on exit
    warnings.resetwarnings()
    before = len(warnings._filters())
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        inside = len(warnings._filters())
    after = len(warnings._filters())
    return (before, inside, after)


def format_a_warning():
    return warnings.formatwarning("msg", UserWarning, "file.py", 42)
