# GRAIL minimal locale stub.
#
# Grail gems run with a fixed UTF-8 view of the world; there is no OS
# locale integration.  django.utils.encoding imports this for
# getpreferredencoding (stdout/filesystem fallbacks), and click for
# help-text width heuristics.

CHAR_MAX = 127

LC_ALL = 6
LC_COLLATE = 3
LC_CTYPE = 0
LC_MESSAGES = 5
LC_MONETARY = 4
LC_NUMERIC = 1
LC_TIME = 2


class Error(Exception):
    pass


def getpreferredencoding(do_setlocale=True):
    return "utf-8"


def getencoding():
    return "utf-8"


def getdefaultlocale():
    return ("en_US", "UTF-8")


def getlocale(category=LC_CTYPE):
    return ("en_US", "UTF-8")


def setlocale(category, locale=None):
    if locale and locale not in ("", "C", "C.UTF-8", "en_US.UTF-8", "POSIX"):
        raise Error("unsupported locale setting (Grail has no OS locale)")
    return "C"


def localeconv():
    return {
        "decimal_point": ".",
        "thousands_sep": "",
        "grouping": [],
        "int_curr_symbol": "",
        "currency_symbol": "",
        "mon_decimal_point": "",
        "mon_thousands_sep": "",
        "mon_grouping": [],
        "positive_sign": "",
        "negative_sign": "",
        "int_frac_digits": 127,
        "frac_digits": 127,
        "p_cs_precedes": 127,
        "p_sep_by_space": 127,
        "n_cs_precedes": 127,
        "n_sep_by_space": 127,
        "p_sign_posn": 127,
        "n_sign_posn": 127,
    }


def normalize(localename):
    return localename


def strxfrm(string):
    return string


def strcoll(a, b):
    return (a > b) - (a < b)
