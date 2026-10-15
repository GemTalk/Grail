# Minimal ``click.core'' stub for Grail.
#
# flask.cli imports ``ParameterSource'' for tracking where a CLI
# arg came from (default / commandline / env).  Grail's click stub
# never runs commands, so the enum's values are placeholders.


class ParameterSource:
    """Stub click.core.ParameterSource — placeholder enum-like."""

    DEFAULT = 'DEFAULT'
    DEFAULT_MAP = 'DEFAULT_MAP'
    COMMANDLINE = 'COMMANDLINE'
    ENVIRONMENT = 'ENVIRONMENT'
    PROMPT = 'PROMPT'
