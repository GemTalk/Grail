"""``ArgumentParser`` takes all fifteen of CPython's constructor parameters --
and each one CHANGES something.

Grail's argparse was a 467-line hand-written subset whose constructor took
four: prog, description, epilog, add_help.  The other eleven raised
``TypeError: ArgumentParser.__init__() got an unexpected keyword argument``,
which is how the pip-installed ``kaggle`` CLI failed to start -- kaggle.cli
passes ``formatter_class=RawTextHelpFormatter``.  All three Raw*/Defaults
formatter classes EXISTED in the subset, as empty pass-bodied stubs the
constructor would not accept.

The file is now CPython 3.14.6's argparse.py, vendored verbatim.

WHY THE CHECKS ARE SHAPED THE WAY THEY ARE.  Accepting a parameter is not the
same as implementing it, and a constructor that swallows ``formatter_class``
and does nothing with it would pass any check that only calls the constructor.
So every parameter here is asserted through its EFFECT: the formatter checks
compare a formatter's rendering against the DEFAULT formatter's and require
them to DIFFER, which is exactly the assertion an accept-and-ignore
implementation cannot satisfy.  Run this file under a shimmed argparse whose
__init__ takes **kwargs and drops them and the three formatter_class checks go
FAIL while the arity check still passes -- that is the control this shape buys.

Widths are pinned through $COLUMNS (which CPython's shutil.get_terminal_size
consults before it asks the OS, and which is Grail's only source) so nothing
here depends on the terminal the run happens to have.  Nothing asserts an
exact wrapped column anyway -- the checks are structural: is the newline still
there, is the substring present.
"""

import inspect
import os
import tempfile

os.environ['COLUMNS'] = '80'
os.environ['LINES'] = '24'

import argparse

RESULTS = {}


def check(name, fn, expected=True):
    try:
        got = fn()
    except BaseException as exc:            # noqa: BLE001 - reported, not raised
        got = '%s: %s' % (type(exc).__name__, exc)
    RESULTS[name] = True if got == expected else got


# --- the arity itself ---------------------------------------------------

CPYTHON_PARAMETERS = [
    'self', 'prog', 'usage', 'description', 'epilog', 'parents',
    'formatter_class', 'prefix_chars', 'fromfile_prefix_chars',
    'argument_default', 'conflict_handler', 'add_help', 'allow_abbrev',
    'exit_on_error', 'suggest_on_error', 'color',
]


def _signature():
    sig = inspect.signature(argparse.ArgumentParser.__init__)
    return list(sig.parameters)


check('constructor_takes_cpython_parameters', _signature, CPYTHON_PARAMETERS)


# --- prog / usage / description / epilog --------------------------------

def _prog():
    p = argparse.ArgumentParser(prog='myprog')
    return p.format_usage().startswith('usage: myprog')


check('prog_names_the_program', _prog)


def _usage():
    p = argparse.ArgumentParser(prog='myprog', usage='%(prog)s THE-USAGE')
    return p.format_usage().strip() == 'usage: myprog THE-USAGE'


check('usage_replaces_the_generated_line', _usage)


def _description_and_epilog():
    p = argparse.ArgumentParser(prog='p', description='THE-DESCRIPTION',
                                epilog='THE-EPILOG')
    text = p.format_help()
    return ('THE-DESCRIPTION' in text
            and 'THE-EPILOG' in text
            and text.index('THE-DESCRIPTION') < text.index('THE-EPILOG'))


check('description_precedes_epilog', _description_and_epilog)


# --- parents ------------------------------------------------------------

def _parents():
    base = argparse.ArgumentParser(add_help=False)
    base.add_argument('--inherited', default='from-parent')
    child = argparse.ArgumentParser(prog='child', parents=[base])
    ns = child.parse_args([])
    return (ns.inherited, child.parse_args(['--inherited', 'x']).inherited)


check('parents_contributes_its_arguments', _parents,
      ('from-parent', 'x'))


# --- formatter_class: each one must DIFFER from the default -------------
#
# These three are the accept-and-ignore control.  A constructor that takes
# formatter_class and drops it renders the DEFAULT layout, so each of these
# comparisons collapses to ``x != x`` and answers False.

MULTILINE_DESCRIPTION = 'first line\nsecond line\nthird line'
MULTILINE_HELP = 'help one\nhelp two'


def _built(formatter_class, **kw):
    p = argparse.ArgumentParser(prog='p', description=MULTILINE_DESCRIPTION,
                                formatter_class=formatter_class, **kw)
    p.add_argument('--opt', default='DEF', help=MULTILINE_HELP)
    return p.format_help()


def _raw_description_keeps_description_newlines():
    default = _built(argparse.HelpFormatter)
    raw = _built(argparse.RawDescriptionHelpFormatter)
    return (raw != default
            and MULTILINE_DESCRIPTION in raw
            and MULTILINE_DESCRIPTION not in default
            and 'first line second line third line' in default)


check('raw_description_keeps_description_newlines',
      _raw_description_keeps_description_newlines)


def _raw_text_also_keeps_help_newlines():
    raw_desc = _built(argparse.RawDescriptionHelpFormatter)
    raw_text = _built(argparse.RawTextHelpFormatter)
    # Both keep the description; only RawText keeps the newline inside --opt's
    # help, so the two renderings must differ from each other as well.
    return (raw_text != raw_desc
            and 'help one\n' in raw_text
            and 'help one\n' not in raw_desc
            and 'help one help two' in raw_desc)


check('raw_text_also_keeps_help_newlines', _raw_text_also_keeps_help_newlines)


def _defaults_formatter_appends_the_default():
    default = _built(argparse.HelpFormatter)
    withdef = _built(argparse.ArgumentDefaultsHelpFormatter)
    return (withdef != default
            and '(default: DEF)' in withdef
            and '(default: DEF)' not in default)


check('defaults_formatter_appends_the_default',
      _defaults_formatter_appends_the_default)


# --- prefix_chars / fromfile_prefix_chars -------------------------------

def _prefix_chars():
    p = argparse.ArgumentParser(prog='p', prefix_chars='+', add_help=False)
    p.add_argument('++foo')
    return p.parse_args(['++foo', 'v']).foo


check('prefix_chars_changes_the_option_prefix', _prefix_chars, 'v')


def _fromfile_prefix_chars():
    d = tempfile.mkdtemp()
    path = os.path.join(d, 'args.txt')
    with open(path, 'w') as fh:
        fh.write('--foo\nfrom-file\n')
    p = argparse.ArgumentParser(prog='p', fromfile_prefix_chars='@')
    p.add_argument('--foo')
    return p.parse_args(['@' + path]).foo


check('fromfile_prefix_chars_expands_the_file', _fromfile_prefix_chars,
      'from-file')


# --- argument_default / conflict_handler --------------------------------

def _argument_default():
    p = argparse.ArgumentParser(prog='p', argument_default='PARSER-DEFAULT',
                                add_help=False)
    p.add_argument('--foo')
    return p.parse_args([]).foo


check('argument_default_supplies_the_default', _argument_default,
      'PARSER-DEFAULT')


def _conflict_handler_resolve():
    p = argparse.ArgumentParser(prog='p', conflict_handler='resolve')
    p.add_argument('--foo', help='first')
    p.add_argument('--foo', help='second')          # would raise with 'error'
    return p.format_help().count('second'), p.format_help().count('first')


check('conflict_handler_resolve_replaces_the_option',
      _conflict_handler_resolve, (1, 0))


def _conflict_handler_error_is_still_the_default():
    p = argparse.ArgumentParser(prog='p')
    p.add_argument('--foo')
    try:
        p.add_argument('--foo')
    except argparse.ArgumentError:
        return True
    return False


check('conflict_handler_defaults_to_error',
      _conflict_handler_error_is_still_the_default)


# --- add_help / allow_abbrev / exit_on_error / suggest_on_error ---------

def _add_help_false():
    p = argparse.ArgumentParser(prog='p', add_help=False)
    return '-h' not in p.format_help()


check('add_help_false_drops_the_h_option', _add_help_false)


def _allow_abbrev():
    on = argparse.ArgumentParser(prog='p', exit_on_error=False)
    on.add_argument('--verbose')
    off = argparse.ArgumentParser(prog='p', allow_abbrev=False,
                                  exit_on_error=False)
    off.add_argument('--verbose')
    abbreviated = on.parse_args(['--verb', 'x']).verbose
    try:
        off.parse_args(['--verb', 'x'])
    except (argparse.ArgumentError, SystemExit):
        return (abbreviated, 'rejected')
    return (abbreviated, 'accepted')


check('allow_abbrev_false_rejects_a_prefix', _allow_abbrev, ('x', 'rejected'))


def _exit_on_error_false():
    p = argparse.ArgumentParser(prog='p', exit_on_error=False)
    p.add_argument('--n', type=int)
    try:
        p.parse_args(['--n', 'not-an-int'])
    except argparse.ArgumentError as exc:
        return str(exc)
    return 'no exception'


check('exit_on_error_false_raises_argument_error', _exit_on_error_false,
      "argument --n: invalid int value: 'not-an-int'")


def _suggest_on_error():
    p = argparse.ArgumentParser(prog='p', suggest_on_error=True,
                                exit_on_error=False)
    p.add_argument('--kind', choices=['alpha', 'beta'])
    try:
        p.parse_args(['--kind', 'alfa'])
    except argparse.ArgumentError as exc:
        return str(exc)
    return 'no exception'


check('suggest_on_error_suggests_the_near_choice', _suggest_on_error,
      "argument --kind: invalid choice: 'alfa', maybe you meant 'alpha'? "
      "(choose from 'alpha', 'beta')")


def _suggest_on_error_off_by_default():
    p = argparse.ArgumentParser(prog='p', exit_on_error=False)
    p.add_argument('--kind', choices=['alpha', 'beta'])
    try:
        p.parse_args(['--kind', 'alfa'])
    except argparse.ArgumentError as exc:
        return str(exc)
    return 'no exception'


check('suggest_on_error_is_off_by_default', _suggest_on_error_off_by_default,
      "argument --kind: invalid choice: 'alfa' (choose from 'alpha', 'beta')")


# --- color --------------------------------------------------------------
#
# color=True asks for ANSI *when the stream is a terminal*.  Neither a piped
# CPython run nor a Grail gem is one, so the rendering is plain in both -- the
# assertion is that the parameter is stored and that asking for colour off a
# terminal changes nothing, which is CPython's own behaviour and not a Grail
# shortcut.  (Grail's _colorize.can_colorize() is unconditionally False; the
# argparse theme section it now carries is what keeps the coloured path from
# being an AttributeError rather than a colour.)

def _color():
    coloured = argparse.ArgumentParser(prog='p', color=True)
    plain = argparse.ArgumentParser(prog='p', color=False)
    coloured.add_argument('--opt', help='h')
    plain.add_argument('--opt', help='h')
    return (coloured.color, plain.color,
            coloured.format_help() == plain.format_help(),
            '\x1b[' not in coloured.format_help())


check('color_is_stored_and_is_plain_off_a_terminal', _color,
      (True, False, True, True))


# --- the other half of the kaggle blocker: subparsers -------------------

def _subparsers():
    p = argparse.ArgumentParser(prog='tool')
    sub = p.add_subparsers(dest='cmd')
    listing = sub.add_parser('list', help='list things')
    listing.add_argument('--limit', type=int, default=10)
    getter = sub.add_parser('get', help='get a thing')
    getter.add_argument('name')
    a = p.parse_args(['list', '--limit', '3'])
    b = p.parse_args(['get', 'thing'])
    return (a.cmd, a.limit, b.cmd, b.name)


check('subparsers_dispatch_to_the_named_parser', _subparsers,
      ('list', 3, 'get', 'thing'))


# --- what HelpFormatter.__init__ reaches for ----------------------------
#
# Two dependencies the vendored file has that Grail's subset never did, both
# hit on the FIRST ``_get_formatter()``.  They are checked here because a
# regression in either is an argparse failure long before it is a shutil or a
# _colorize one.

def _terminal_size():
    import shutil
    size = shutil.get_terminal_size()
    return (size.columns, size.lines, size[0], size[1])


check('shutil_get_terminal_size_reads_COLUMNS', _terminal_size,
      (80, 24, 80, 24))


def _decolor():
    from _colorize import decolor, get_theme
    theme = get_theme(force_color=True).argparse
    painted = '%sheading%s' % (theme.heading, theme.reset)
    return decolor(painted)


check('colorize_decolor_strips_the_argparse_theme', _decolor, 'heading')


# --- str.splitlines(keepends=...) as a KEYWORD --------------------------
#
# RawDescriptionHelpFormatter._fill_text is written
# ``text.splitlines(keepends=True)``.  str had the 0- and 1-argument forms but
# no varargs entry, so the keyword spelling raised TypeError and every --help
# through a Raw* formatter died on it.

def _splitlines_keyword():
    return "a\nb\n".splitlines(keepends=True)


check('splitlines_accepts_keepends_as_a_keyword', _splitlines_keyword,
      ['a\n', 'b\n'])


def _splitlines_rejects_an_unknown_keyword():
    try:
        "a\nb".splitlines(nosuch=1)
    except TypeError as exc:
        return str(exc)
    return 'no exception'


check('splitlines_rejects_an_unknown_keyword',
      _splitlines_rejects_an_unknown_keyword,
      "splitlines() got an unexpected keyword argument 'nosuch'")


# --- a class nested in another class body compiles its methods ---------
#
# The codegen defect the vendored file uncovered, reduced.  ``vars()`` anywhere
# in the OUTER class body turned on the class-body dynamic-name probe, and the
# nested class's METHODS were generated under it -- emitting a probe whose
# receiver was the nested class's Smalltalk block temp, which the runtime
# method compile cannot see.  Every such method became a raising stub.
# argparse's HelpFormatter._Section is this shape exactly.

class _Outer:
    def uses_vars(self):
        return sorted(vars(self))

    class _Nested:
        def __init__(self, owner, parent, label=None):
            self.owner = owner
            self.parent = parent
            self.label = label
            self.items = []

        def describe(self):
            return '%s/%s/%d' % (self.parent, self.label, len(self.items))


def _nested_class_methods_compile():
    n = _Outer._Nested('owner', 'root', label='L')
    n.items.append(1)
    return n.describe()


check('nested_class_in_a_vars_using_body_compiles', _nested_class_methods_compile,
      'root/L/1')


if __name__ == '__main__':
    for _name in sorted(RESULTS):
        _v = RESULTS[_name]
        print('%-4s %s' % ('OK' if _v is True else 'FAIL', _name),
              '' if _v is True else _v)
