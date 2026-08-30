"""sys.argv must have CPython's shape -- the script and its own arguments.

Grail populates sys.argv in sys.gs (``initialize_runtime_info''), and it used to
copy the raw topaz command line into it verbatim.  A script launched by

    ./grail app.py one two

therefore saw

    sys.argv[0] == 'topaz'
    sys.argv[1] == '-lq'

because ./grail really runs ``topaz -lq -S scripts/grail.tpz ... -- app.py one
two''.  The damage was not cosmetic: the ordinary ``dest = sys.argv[1]'' idiom
created a directory literally named ``-lq'' in the checkout.

Every check here is CPYTHON-VERIFIED -- there is no grail_only list, because
after the fix there is nothing left for Grail to disagree about.  The gate
(scripts/check_python_fixtures.sh) runs this file with NO arguments, which
exercises everything except the argument tail; run it as

    python3 tests/python/sys_argv_shape.py alpha beta
    ./grail   tests/python/sys_argv_shape.py alpha beta

to exercise that one too.  Both must print the same OK lines.
"""

import os
import sys

SELF = 'sys_argv_shape.py'

# Arguments that belong to topaz / the ./grail wrapper and must never reach a
# Python script.  Seeing ANY of these in sys.argv is the original bug.
LAUNCHER_ARGS = (
    'topaz', '-lq', '-S', '-T', '-C', '--',
    'scripts/grail.tpz', 'GEM_TEMPOBJ_CODE_SIZE=300000;',
)

# What the argument-tail check expects when this file is run WITH arguments.
SAMPLE_ARGS = ['alpha', 'beta']


def argv_is_a_list_of_str():
    """sys.argv is a list of str with at least one element."""
    if not isinstance(sys.argv, list):
        return False
    if len(sys.argv) < 1:
        return False
    return all(isinstance(a, str) for a in sys.argv)


def argv0_names_this_script():
    """argv[0] is the script being run, not the interpreter that runs it."""
    return os.path.basename(sys.argv[0]) == SELF


def argv0_is_the_path_as_given():
    """CPython does not absolutize argv[0]; it is the path as it was typed.

    Checked as a suffix so this holds whether the caller used a relative or an
    absolute path -- what it rules out is argv[0] being rewritten into
    something that no longer ends in the file that is executing.
    """
    return sys.argv[0].endswith(SELF)


def no_launcher_arguments_leak_into_argv():
    """None of topaz's own arguments appear anywhere in sys.argv.

    This is the check that was red under ./grail: it saw the whole
    ['topaz', '-lq', '-S', 'scripts/grail.tpz', ...] prefix.
    """
    leaked = [a for a in sys.argv if a in LAUNCHER_ARGS]
    return leaked == []


def argv_tail_is_the_scripts_own_arguments():
    """argv[1:] is exactly what followed the script name, and nothing else.

    With no arguments the tail must be EMPTY -- which is itself the check that
    catches a launcher prefix, since ./grail used to leave nine extra entries
    here.  With arguments it must be exactly those arguments.
    """
    tail = sys.argv[1:]
    if not tail:
        return True
    return tail == SAMPLE_ARGS


def orig_argv_is_the_real_process_command_line():
    """sys.orig_argv keeps the interpreter's own command line.

    CPython's orig_argv includes the executable and its options, so it is the
    right home for topaz's arguments and deliberately NOT trimmed.  All that is
    checkable portably is its type and that it is at least as long as argv.
    """
    if not isinstance(sys.orig_argv, list):
        return False
    if not all(isinstance(a, str) for a in sys.orig_argv):
        return False
    return len(sys.orig_argv) >= len(sys.argv)


CHECKS = [
    argv_is_a_list_of_str,
    argv0_names_this_script,
    argv0_is_the_path_as_given,
    no_launcher_arguments_leak_into_argv,
    argv_tail_is_the_scripts_own_arguments,
    orig_argv_is_the_real_process_command_line,
]


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
