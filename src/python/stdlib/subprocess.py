"""Child processes for Grail, over GemStone's GsHostProcess.

This module used to be a refusal stub whose docstring said "Grail gems do not
spawn child OS processes".  That was never true of the VM: ``GsHostProcess``
forks with an argv array, hands back the parent ends of the pipes as
non-blocking sockets, reaps with waitpid and kills with a timeout.  The
Smalltalk wrapper is ``_subprocess`` / ``PyHostProcess``
(src/smalltalk/Python/subprocess_module.gs); everything here is ordinary
Python on top of it.

Supported: Popen with args as a list or string, shell=, cwd=, env=,
stdin/stdout/stderr as PIPE/DEVNULL/STDOUT/None, text= (aka
universal_newlines=) and encoding=/errors=, communicate(input=, timeout=),
poll(), wait(timeout=), returncode with CPython's negative-for-signal
convention, send_signal()/terminate()/kill(), the context-manager protocol,
and run/call/check_call/check_output/getoutput/getstatusoutput.

NOT supported, and each raises rather than lying:

  * preexec_fn, pass_fds, start_new_session, process groups, umask -- the fork
    primitive takes an argv array and nothing else.
  * stdin=/stdout=/stderr= as an arbitrary file object or fd.  A path-backed
    stream would map onto GsHostProcess's stdoutPath:, but a Python file object
    has no descriptor the child could inherit.
  * bufsize, close_fds (fds are never inherited), restore_signals.

Two behaviours worth knowing, both inherited from the pipe model rather than
chosen here:

  * ``.stdout``/``.stderr`` are drained, not streamed.  Reading them yields
    what has arrived so far; the complete, deadlock-free read is
    ``communicate()``, exactly as CPython advises.
  * ``wait()`` with live pipes is a documented deadlock in CPython too.  Here
    it does NOT deadlock -- it drains while it waits -- but the drained bytes
    are then only reachable through ``.stdout``/``.stderr`` buffers.
"""

import os

PIPE = -1
STDOUT = -2
DEVNULL = -3

# Mode integers understood by _subprocess.spawn.
_M_INHERIT = 0
_M_PIPE = 1
_M_DEVNULL = 2
_M_STDOUT = 3

_gs = None


def _backend():
    global _gs
    if _gs is None:
        import _subprocess
        _gs = _subprocess
    return _gs


class SubprocessError(Exception):
    pass


class TimeoutExpired(SubprocessError):
    def __init__(self, cmd, timeout, output=None, stderr=None):
        self.cmd = cmd
        self.timeout = timeout
        self.output = output
        self.stderr = stderr

    def __str__(self):
        return "Command %s timed out after %s seconds" % (repr(self.cmd), self.timeout)


class CalledProcessError(SubprocessError):
    def __init__(self, returncode, cmd, output=None, stderr=None):
        self.returncode = returncode
        self.cmd = cmd
        self.output = output
        self.stderr = stderr

    @property
    def stdout(self):
        return self.output

    def __str__(self):
        if self.returncode and self.returncode < 0:
            return "Command %s died with signal %d" % (repr(self.cmd), -self.returncode)
        return "Command %s returned non-zero exit status %d" % (
            repr(self.cmd), self.returncode)


class CompletedProcess:
    def __init__(self, args, returncode, stdout=None, stderr=None):
        self.args = args
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

    def __repr__(self):
        parts = ["args=%s" % repr(self.args), "returncode=%s" % repr(self.returncode)]
        if self.stdout is not None:
            parts.append("stdout=%s" % repr(self.stdout))
        if self.stderr is not None:
            parts.append("stderr=%s" % repr(self.stderr))
        return "CompletedProcess(%s)" % ", ".join(parts)

    def check_returncode(self):
        if self.returncode:
            raise CalledProcessError(self.returncode, self.args,
                                     self.stdout, self.stderr)


def _unsupported(name):
    raise ValueError(
        "%s is not supported in Grail: GsHostProcess forks with an argv array "
        "and no per-child fd or signal control" % name)


def _norm_stream(value, name):
    """Map a stdin/stdout/stderr argument onto a backend mode int."""
    if value is None:
        return _M_DEVNULL
    if value == PIPE:
        return _M_PIPE
    if value == DEVNULL:
        return _M_DEVNULL
    if value == STDOUT:
        if name != "stderr":
            raise ValueError("STDOUT is only valid for stderr")
        return _M_STDOUT
    raise ValueError(
        "%s=%r is not supported in Grail: use PIPE, DEVNULL, STDOUT or None "
        "(a file object or fd cannot be handed to the child)" % (name, value))


class _PipeBuffer:
    """The object behind ``proc.stdout`` / ``proc.stderr``.

    A drain-on-read buffer over the pipe rather than a real stream: each read
    pulls whatever has arrived and appends it to what was pulled before, so a
    caller that alternates between this and communicate() still sees every
    byte exactly once.
    """

    def __init__(self, proc, which, text, encoding, errors):
        self._proc = proc
        self._which = which
        self._text = text
        self._encoding = encoding
        self._errors = errors
        self._buf = b""
        self._closed = False

    def _pull(self):
        if self._closed or self._proc is None:
            return
        chunk = self._proc._handle.___readAvailable___(self._which)
        if chunk:
            self._buf = self._buf + chunk

    def _take(self, n=-1):
        self._pull()
        if n is None or n < 0:
            out, self._buf = self._buf, b""
        else:
            out, self._buf = self._buf[:n], self._buf[n:]
        return self._decode(out)

    def _decode(self, data):
        if not self._text:
            return data
        return data.decode(self._encoding or "utf-8", self._errors or "strict")

    def read(self, n=-1):
        return self._take(n)

    def readline(self):
        self._pull()
        idx = self._buf.find(b"\n")
        if idx < 0:
            return self._take(-1)
        line, self._buf = self._buf[:idx + 1], self._buf[idx + 1:]
        return self._decode(line)

    def readlines(self):
        data = self._take(-1)
        if not data:
            return []
        sep = "\n" if self._text else b"\n"
        parts = data.split(sep)
        if parts and not parts[-1]:
            parts.pop()
        return [p + sep for p in parts]

    def __iter__(self):
        while True:
            line = self.readline()
            if not line:
                return
            yield line

    def close(self):
        self._closed = True

    @property
    def closed(self):
        return self._closed


class _PipeWriter:
    """The object behind ``proc.stdin``."""

    def __init__(self, proc, text, encoding, errors):
        self._proc = proc
        self._text = text
        self._encoding = encoding
        self._errors = errors
        self._closed = False

    def write(self, data):
        if self._closed:
            raise ValueError("write to a closed stdin")
        if isinstance(data, str):
            data = data.encode(self._encoding or "utf-8", self._errors or "strict")
        return self._proc._handle.___writeStdin___(data)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        return None

    def close(self):
        if not self._closed:
            self._closed = True
            self._proc._handle.___closeStdin___()

    @property
    def closed(self):
        return self._closed


class Popen:
    def __init__(self, args, bufsize=-1, executable=None,
                 stdin=None, stdout=None, stderr=None,
                 preexec_fn=None, close_fds=True, shell=False,
                 cwd=None, env=None, universal_newlines=None,
                 startupinfo=None, creationflags=0, restore_signals=True,
                 start_new_session=False, pass_fds=(), text=None,
                 encoding=None, errors=None, timeout=None, **kwargs):
        if preexec_fn is not None:
            _unsupported("preexec_fn")
        if pass_fds:
            _unsupported("pass_fds")
        if start_new_session:
            _unsupported("start_new_session")

        self.args = args
        self.returncode = None
        self._communicated = False

        if text is None:
            text = bool(universal_newlines)
        self._text = bool(text or encoding or errors)
        self._encoding = encoding
        self._errors = errors

        argv = self._build_argv(args, shell, executable)

        in_mode = _norm_stream(stdin, "stdin")
        out_mode = _norm_stream(stdout, "stdout")
        err_mode = _norm_stream(stderr, "stderr")
        # stderr=STDOUT with a stdout pipe is merged on this side: the kernel's
        # redirectStderrToStdout needs stdout to be a FILE, not a pipe.
        self._merge_err = (err_mode == _M_STDOUT and out_mode == _M_PIPE)
        if self._merge_err:
            err_mode = _M_PIPE

        env_pairs = None
        if env is not None:
            env_pairs = ["%s=%s" % (k, v) for k, v in env.items()]

        self._handle = _backend().spawn(argv, cwd, env_pairs,
                                        [in_mode, out_mode, err_mode])

        self.stdin = _PipeWriter(self, self._text, encoding, errors) \
            if in_mode == _M_PIPE else None
        self.stdout = _PipeBuffer(self, 1, self._text, encoding, errors) \
            if out_mode == _M_PIPE else None
        self.stderr = _PipeBuffer(self, 2, self._text, encoding, errors) \
            if (err_mode == _M_PIPE and not self._merge_err) else None

    def _build_argv(self, args, shell, executable):
        if shell:
            cmd = args if isinstance(args, str) else " ".join(args)
            argv = ["/bin/sh", "-c", cmd]
        elif isinstance(args, str):
            # CPython without shell= treats a string as the program itself.
            argv = [args]
        else:
            argv = [str(a) for a in args]
        if not argv:
            raise ValueError("args must not be empty")
        if executable is not None:
            argv = [executable] + argv[1:]
        return argv

    @property
    def pid(self):
        return self._handle.___pid___()

    def poll(self):
        rc = self._handle.___poll___()
        if rc is not None:
            self.returncode = rc
        return self.returncode

    def wait(self, timeout=None):
        ms = None if timeout is None else int(timeout * 1000)
        rc = self._handle.___waitMs___(ms)
        if rc is None:
            raise TimeoutExpired(self.args, timeout)
        self.returncode = rc
        return rc

    def communicate(self, input=None, timeout=None):
        if self._communicated and input is not None:
            raise ValueError("communicate() with input called twice")
        self._communicated = True

        if input is not None and isinstance(input, str):
            input = input.encode(self._encoding or "utf-8",
                                 self._errors or "strict")

        ms = None if timeout is None else int(timeout * 1000)
        out, err, timed_out = self._handle.___communicate___(input, ms)

        out = self._finish(out, self.stdout)
        err = self._finish(err, self.stderr)

        if timed_out:
            raise TimeoutExpired(self.args, timeout, output=out, stderr=err)

        self.poll()
        if self._merge_err and err:
            out = (out or (b"" if not self._text else "")) + err
            err = None
        return (out, err)

    def _finish(self, data, stream):
        """Prepend anything a caller already drained through .stdout/.stderr."""
        if data is None:
            return None
        if stream is not None and stream._buf:
            data = stream._buf + data
            stream._buf = b""
        if self._text:
            return data.decode(self._encoding or "utf-8",
                               self._errors or "strict")
        return data

    def send_signal(self, sig):
        self._handle.___signal___(int(sig))

    def terminate(self):
        self._handle.___terminate___()

    def kill(self):
        self._handle.___kill___()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, tb):
        if self.stdin is not None:
            self.stdin.close()
        try:
            self.wait()
        except TimeoutExpired:
            pass
        self._handle.___closePipes___()
        return False


def run(args, stdin=None, input=None, stdout=None, stderr=None,
        capture_output=False, shell=False, cwd=None, timeout=None,
        check=False, encoding=None, errors=None, text=None, env=None,
        universal_newlines=None, **kwargs):
    if capture_output:
        if stdout is not None or stderr is not None:
            raise ValueError(
                "stdout and stderr arguments may not be used with capture_output")
        stdout = PIPE
        stderr = PIPE
    if input is not None:
        if stdin is not None:
            raise ValueError("stdin and input arguments may not both be used")
        stdin = PIPE

    proc = Popen(args, stdin=stdin, stdout=stdout, stderr=stderr, shell=shell,
                 cwd=cwd, env=env, encoding=encoding, errors=errors, text=text,
                 universal_newlines=universal_newlines, **kwargs)
    try:
        out, err = proc.communicate(input, timeout=timeout)
    except TimeoutExpired:
        proc.kill()
        proc.wait()
        raise
    rc = proc.poll()
    if rc is None:
        rc = proc.wait()
    result = CompletedProcess(args, rc, out, err)
    if check:
        result.check_returncode()
    return result


def call(args, timeout=None, **kwargs):
    with Popen(args, **kwargs) as proc:
        try:
            return proc.wait(timeout=timeout)
        except TimeoutExpired:
            proc.kill()
            proc.wait()
            raise


def check_call(args, timeout=None, **kwargs):
    rc = call(args, timeout=timeout, **kwargs)
    if rc:
        raise CalledProcessError(rc, args)
    return 0


def check_output(args, timeout=None, input=None, **kwargs):
    if "stdout" in kwargs:
        raise ValueError("stdout argument not allowed, it will be overridden")
    result = run(args, stdout=PIPE, timeout=timeout, input=input,
                 check=True, **kwargs)
    return result.stdout


def getstatusoutput(cmd, encoding=None, errors=None):
    """(status, output) with stderr folded in and one trailing newline removed."""
    try:
        data = check_output(cmd, shell=True, stderr=STDOUT, text=True,
                            encoding=encoding, errors=errors)
        status = 0
    except CalledProcessError as exc:
        data = exc.output
        status = exc.returncode
    if data and data[-1:] == "\n":
        data = data[:-1]
    return (status, data)


def getoutput(cmd, encoding=None, errors=None):
    return getstatusoutput(cmd, encoding=encoding, errors=errors)[1]
