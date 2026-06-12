# GRAIL shlex - the three commonly used module functions (split, join,
# quote) with POSIX shell rules: whitespace separation, single/double
# quotes, backslash escapes (outside single quotes), optional comments.
# Deviation: the streaming `shlex` lexer class is not provided.

__all__ = ["split", "join", "quote"]

_SAFE_CHARS = ("abcdefghijklmnopqrstuvwxyz"
               "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
               "0123456789"
               "@%+=:,./-_")


def split(s, comments=False, posix=True):
    """Split the string s using POSIX shell-like rules."""
    tokens = []
    current = ""
    has_token = False
    state = "normal"
    i = 0
    n = len(s)
    while i < n:
        ch = s[i]
        if state == "normal":
            if ch == "'" and posix:
                state = "single"
                has_token = True
            elif ch == '"':
                state = "double"
                has_token = True
            elif ch == "\\" and posix:
                if i + 1 < n:
                    current = current + s[i + 1]
                    has_token = True
                    i = i + 1
            elif ch == "#" and comments:
                # Rest of the line is a comment.
                while i < n and s[i] != "\n":
                    i = i + 1
            elif ch == " " or ch == "\t" or ch == "\n" or ch == "\r":
                if has_token:
                    tokens.append(current)
                    current = ""
                    has_token = False
            else:
                current = current + ch
                has_token = True
        elif state == "single":
            if ch == "'":
                state = "normal"
            else:
                current = current + ch
        elif state == "double":
            if ch == '"':
                state = "normal"
            elif ch == "\\" and posix and i + 1 < n and (s[i + 1] == '"' or s[i + 1] == "\\" or s[i + 1] == "$" or s[i + 1] == "`"):
                current = current + s[i + 1]
                i = i + 1
            else:
                current = current + ch
        i = i + 1
    if state != "normal":
        raise ValueError("No closing quotation")
    if has_token:
        tokens.append(current)
    return tokens


def quote(s):
    """Return a shell-escaped version of the string s."""
    if s == "":
        return "''"
    safe = True
    for ch in s:
        if ch not in _SAFE_CHARS:
            safe = False
            break
    if safe:
        return s
    return "'" + s.replace("'", "'\"'\"'") + "'"


def join(split_command):
    """Return a shell-escaped string from the list split_command."""
    out = []
    for arg in split_command:
        out.append(quote(arg))
    return " ".join(out)
