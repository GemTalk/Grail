# Minimal ``click.testing'' stub for Grail.
#
# Flask.testing imports ``CliRunner'' / ``Result'' for
# ``app.test_cli_runner()''.  The test-client demo path uses
# ``app.test_client()'' instead, so these are only needed to
# satisfy the import.  Real invocations would raise
# NotImplementedError.


class Result:
    """Stub click invocation result — output / exit_code / exception."""

    def __init__(self, runner=None, stdout_bytes=b'', stderr_bytes=b'',
                 output_bytes=b'', return_value=None, exit_code=0,
                 exception=None, exc_info=None):
        self.runner = runner
        self.stdout_bytes = stdout_bytes
        self.stderr_bytes = stderr_bytes
        self.output_bytes = output_bytes
        self.return_value = return_value
        self.exit_code = exit_code
        self.exception = exception
        self.exc_info = exc_info

    @property
    def output(self):
        return self.output_bytes.decode('utf-8', 'replace') if isinstance(
            self.output_bytes, bytes) else self.output_bytes

    @property
    def stdout(self):
        return self.stdout_bytes.decode('utf-8', 'replace') if isinstance(
            self.stdout_bytes, bytes) else self.stdout_bytes

    @property
    def stderr(self):
        return self.stderr_bytes.decode('utf-8', 'replace') if isinstance(
            self.stderr_bytes, bytes) else self.stderr_bytes


class CliRunner:
    """Stub click.testing.CliRunner — invocations raise NotImplementedError.
    The test-client demo path uses ``app.test_client()'' instead."""

    def __init__(self, charset='utf-8', env=None, echo_stdin=False,
                 mix_stderr=True):
        self.charset = charset
        self.env = env or {}
        self.echo_stdin = echo_stdin
        self.mix_stderr = mix_stderr

    def invoke(self, cli, args=None, input=None, env=None,
               catch_exceptions=True, color=False, **extra):
        raise NotImplementedError(
            'click.testing.CliRunner.invoke is not implemented in the '
            'Grail click stub.  Use app.test_client() for HTTP-level '
            'testing of Flask apps.'
        )
