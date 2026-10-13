# No __all__, so ``from pkg_star_global.guessed import *`` takes every public
# top-level name -- and Grail guesses those at parse time, a guess that also
# counts names a function only declares ``global``.


class Parser:
    def __init__(self):
        # python-dateutil's tz.tzstr does exactly this.
        global parser
        from json import decoder as parser


def load_rrule():
    global rrule
    rrule = 'rrule'


def make_during_import():
    global made
    made = 'made during import'


make_during_import()     # so ``made`` IS bound when the star import runs

visible = 'visible'
_private = 'private'
