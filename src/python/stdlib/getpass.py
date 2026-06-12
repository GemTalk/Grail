# GRAIL getpass - getuser() from the environment and a getpass() that
# falls back to plain input().  Deviation: there is no termios layer,
# so getpass() does NOT suppress echo (CPython's fallback_getpass
# behavior, minus the GetPassWarning).

import os

__all__ = ["getpass", "getuser", "GetPassWarning"]


class GetPassWarning(UserWarning):
    pass


def getuser():
    """Get the username from the environment."""
    for name in ["LOGNAME", "USER", "LNAME", "USERNAME"]:
        user = os.getenv(name)
        if user is not None and user != "":
            return user
    raise OSError("no username set in the environment")


def getpass(prompt="Password: ", stream=None):
    """Prompt for a password.  Grail has no tty-echo control, so this
    reads a normal line of input (echoed)."""
    return input(prompt)
