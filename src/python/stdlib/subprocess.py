# GRAIL minimal subprocess stub.
#
# Grail gems do not spawn child OS processes.  This module exists so
# `import subprocess` succeeds (django.utils.version, click, etc. import
# it at module level but only exercise it on paths Grail never takes,
# e.g. stamping a dev build with its git hash).  Every entry point
# raises OSError at call time so a caller that *does* reach it gets a
# clear signal rather than a wrong answer.

PIPE = -1
STDOUT = -2
DEVNULL = -3


class SubprocessError(Exception):
    pass


class TimeoutExpired(SubprocessError):
    def __init__(self, cmd, timeout, output=None, stderr=None):
        self.cmd = cmd
        self.timeout = timeout
        self.output = output
        self.stderr = stderr


class CalledProcessError(SubprocessError):
    def __init__(self, returncode, cmd, output=None, stderr=None):
        self.returncode = returncode
        self.cmd = cmd
        self.output = output
        self.stderr = stderr


class CompletedProcess:
    def __init__(self, args, returncode, stdout=None, stderr=None):
        self.args = args
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

    def check_returncode(self):
        if self.returncode:
            raise CalledProcessError(self.returncode, self.args,
                                     self.stdout, self.stderr)


def _unsupported(*args, **kwargs):
    raise OSError("subprocess is not supported in Grail (no child processes)")


run = _unsupported
call = _unsupported
check_call = _unsupported
check_output = _unsupported
getoutput = _unsupported
getstatusoutput = _unsupported


class Popen:
    def __init__(self, *args, **kwargs):
        _unsupported()
