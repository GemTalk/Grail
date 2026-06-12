# GRAIL tomllib - read-only TOML 1.0 parser (loads / load /
# TOMLDecodeError), hand-rolled recursive descent rather than a port of
# CPython's tomli (which leans on re machinery).  Covers: bare/quoted/
# dotted keys, all four string forms with escapes, integers (dec/hex/
# oct/bin, underscores), floats (exponents, inf/nan), booleans, RFC
# 3339 dates/times/datetimes (incl. offsets), arrays, inline tables,
# [table] / [[array-of-table]] headers, comments, and duplicate-key /
# duplicate-table errors.
#
# Known V1 simplifications vs the full spec:
#   * inline tables are not frozen against later extension;
#   * a dotted key does not close its intermediate tables against
#     later [table] redeclaration;
#   * surrogate-range \u escapes are not rejected.

import datetime

__all__ = ["loads", "load", "TOMLDecodeError"]

_BARE_KEY_CHARS = ("abcdefghijklmnopqrstuvwxyz"
                   "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                   "0123456789-_")
_DIGITS = "0123456789"
_HEX_DIGITS = "0123456789abcdefABCDEF"


class TOMLDecodeError(ValueError):
    pass


def _default_parse_float(text):
    return float(text)


def load(fp, parse_float=None):
    """Parse TOML from a binary file object."""
    data = fp.read()
    if isinstance(data, str):
        raise TypeError("File must be opened in binary mode, "
                        "e.g. use `open('foo.toml', 'rb')`")
    return loads(data.decode("utf-8"), parse_float=parse_float)


def loads(s, parse_float=None):
    """Parse TOML from a string."""
    if not isinstance(s, str):
        raise TypeError("Expected str object, not " + type(s).__name__)
    return _Parser(s, parse_float).parse()


class _Parser:
    def __init__(self, src, parse_float):
        self.src = src.replace("\r\n", "\n")
        self.pos = 0
        self.n = len(self.src)
        if parse_float is None:
            parse_float = _default_parse_float
        self.parse_float = parse_float
        self.root = {}
        self.explicit_tables = []
        self.path_sep = chr(0)

    # ---- error helper -------------------------------------------------

    def error(self, msg):
        line = 1
        i = 0
        while i < self.pos and i < self.n:
            if self.src[i] == "\n":
                line = line + 1
            i = i + 1
        raise TOMLDecodeError(msg + " (at line " + str(line) + ")")

    # ---- lexing helpers -----------------------------------------------

    def peek(self, offset=0):
        i = self.pos + offset
        if i < self.n:
            return self.src[i]
        return ""

    def skip_ws(self):
        while self.pos < self.n:
            ch = self.src[self.pos]
            if ch == " " or ch == "\t":
                self.pos = self.pos + 1
            else:
                break

    def skip_comment(self):
        if self.peek() == "#":
            while self.pos < self.n and self.src[self.pos] != "\n":
                self.pos = self.pos + 1

    def skip_blank(self):
        """Skip whitespace, newlines and comments (between top-level
        constructs and inside multi-line arrays)."""
        while self.pos < self.n:
            ch = self.src[self.pos]
            if ch == " " or ch == "\t" or ch == "\n":
                self.pos = self.pos + 1
            elif ch == "#":
                self.skip_comment()
            else:
                break

    def expect_line_end(self):
        self.skip_ws()
        self.skip_comment()
        if self.pos >= self.n:
            return None
        if self.src[self.pos] != "\n":
            self.error("Expected end of line, found "
                       + repr(self.src[self.pos]))
        self.pos = self.pos + 1
        return None

    # ---- top level ----------------------------------------------------

    def parse(self):
        current = self.root
        while True:
            self.skip_blank()
            if self.pos >= self.n:
                break
            ch = self.src[self.pos]
            if ch == "[":
                if self.peek(1) == "[":
                    current = self.parse_array_table_header()
                else:
                    current = self.parse_table_header()
            else:
                key_path, value = self.parse_key_value()
                self.store(current, key_path, value)
                self.expect_line_end()
        return self.root

    def parse_table_header(self):
        self.pos = self.pos + 1
        self.skip_ws()
        path = self.parse_dotted_key()
        self.skip_ws()
        if self.peek() != "]":
            self.error("Expected ']' in table header")
        self.pos = self.pos + 1
        self.expect_line_end()
        key = self.path_sep.join(path)
        if key in self.explicit_tables:
            self.error("Cannot declare table " + ".".join(path) + " twice")
        self.explicit_tables.append(key)
        return self.descend(path)

    def parse_array_table_header(self):
        self.pos = self.pos + 2
        self.skip_ws()
        path = self.parse_dotted_key()
        self.skip_ws()
        if not (self.peek() == "]" and self.peek(1) == "]"):
            self.error("Expected ']]' in array-of-tables header")
        self.pos = self.pos + 2
        self.expect_line_end()
        key = self.path_sep.join(path)
        if key in self.explicit_tables:
            self.error("Cannot extend table " + ".".join(path)
                       + " as an array of tables")
        if len(path) > 1:
            parent = self.descend(path[:-1])
        else:
            parent = self.root
        last = path[-1]
        if last in parent:
            arr = parent[last]
            if not isinstance(arr, list):
                self.error("Key " + last + " is not an array of tables")
        else:
            arr = []
            parent[last] = arr
        table = {}
        arr.append(table)
        return table

    def descend(self, path):
        cur = self.root
        for part in path:
            if part in cur:
                nxt = cur[part]
                if isinstance(nxt, list):
                    if len(nxt) == 0 or not isinstance(nxt[-1], dict):
                        self.error("Cannot extend array " + part)
                    cur = nxt[-1]
                elif isinstance(nxt, dict):
                    cur = nxt
                else:
                    self.error("Key " + part + " already has a value")
            else:
                created = {}
                cur[part] = created
                cur = created
        return cur

    def store(self, table, key_path, value):
        cur = table
        i = 0
        last_index = len(key_path) - 1
        while i < last_index:
            part = key_path[i]
            if part in cur:
                nxt = cur[part]
                if not isinstance(nxt, dict):
                    self.error("Cannot overwrite key " + part)
                cur = nxt
            else:
                created = {}
                cur[part] = created
                cur = created
            i = i + 1
        last = key_path[last_index]
        if last in cur:
            self.error("Duplicate key: " + last)
        cur[last] = value

    # ---- keys ----------------------------------------------------------

    def parse_dotted_key(self):
        parts = [self.parse_simple_key()]
        while True:
            self.skip_ws()
            if self.peek() == ".":
                self.pos = self.pos + 1
                self.skip_ws()
                parts.append(self.parse_simple_key())
            else:
                break
        return parts

    def parse_simple_key(self):
        ch = self.peek()
        if ch == '"':
            return self.parse_basic_string()
        if ch == "'":
            return self.parse_literal_string()
        key = ""
        while self.pos < self.n and self.src[self.pos] in _BARE_KEY_CHARS:
            key = key + self.src[self.pos]
            self.pos = self.pos + 1
        if key == "":
            self.error("Expected a key")
        return key

    def parse_key_value(self):
        key_path = self.parse_dotted_key()
        self.skip_ws()
        if self.peek() != "=":
            self.error("Expected '=' after key")
        self.pos = self.pos + 1
        self.skip_ws()
        value = self.parse_value()
        return key_path, value

    # ---- values ---------------------------------------------------------

    def parse_value(self):
        ch = self.peek()
        if ch == '"':
            if self.peek(1) == '"' and self.peek(2) == '"':
                return self.parse_multiline_basic_string()
            return self.parse_basic_string()
        if ch == "'":
            if self.peek(1) == "'" and self.peek(2) == "'":
                return self.parse_multiline_literal_string()
            return self.parse_literal_string()
        if ch == "[":
            return self.parse_array()
        if ch == "{":
            return self.parse_inline_table()
        if ch == "t" and self.src[self.pos:self.pos + 4] == "true":
            self.pos = self.pos + 4
            return True
        if ch == "f" and self.src[self.pos:self.pos + 5] == "false":
            self.pos = self.pos + 5
            return False
        if ch == "":
            self.error("Expected a value")
        return self.parse_number_or_date()

    # ---- strings ---------------------------------------------------------

    def parse_basic_string(self):
        self.pos = self.pos + 1
        out = ""
        while True:
            if self.pos >= self.n:
                self.error("Unterminated string")
            ch = self.src[self.pos]
            if ch == '"':
                self.pos = self.pos + 1
                return out
            if ch == "\n":
                self.error("Newline in single-line string")
            if ch == "\\":
                out = out + self.parse_escape(False)
                continue
            out = out + ch
            self.pos = self.pos + 1

    def parse_multiline_basic_string(self):
        self.pos = self.pos + 3
        if self.peek() == "\n":
            self.pos = self.pos + 1
        out = ""
        while True:
            if self.pos >= self.n:
                self.error("Unterminated multi-line string")
            ch = self.src[self.pos]
            if ch == '"' and self.peek(1) == '"' and self.peek(2) == '"':
                # Up to two extra quotes belong to the content.
                extra = 0
                while extra < 2 and self.peek(3 + extra) == '"':
                    extra = extra + 1
                out = out + ('"' * extra)
                self.pos = self.pos + 3 + extra
                return out
            if ch == "\\":
                out = out + self.parse_escape(True)
                continue
            out = out + ch
            self.pos = self.pos + 1

    def parse_escape(self, multiline):
        self.pos = self.pos + 1
        if self.pos >= self.n:
            self.error("Unterminated escape sequence")
        ch = self.src[self.pos]
        if multiline and (ch == "\n" or ch == " " or ch == "\t"):
            # Line-ending backslash: skip whitespace through the newline
            # and any leading whitespace on following lines.
            saw_newline = False
            while self.pos < self.n:
                c = self.src[self.pos]
                if c == "\n":
                    saw_newline = True
                    self.pos = self.pos + 1
                elif c == " " or c == "\t":
                    self.pos = self.pos + 1
                else:
                    break
            if not saw_newline:
                self.error("Backslash escape must be followed by a newline "
                           "in multi-line strings")
            return ""
        self.pos = self.pos + 1
        if ch == "b":
            return "\b"
        if ch == "t":
            return "\t"
        if ch == "n":
            return "\n"
        if ch == "f":
            return "\f"
        if ch == "r":
            return "\r"
        if ch == '"':
            return '"'
        if ch == "\\":
            return "\\"
        if ch == "u":
            return self.parse_unicode_escape(4)
        if ch == "U":
            return self.parse_unicode_escape(8)
        self.error("Invalid escape sequence '\\" + ch + "'")

    def parse_unicode_escape(self, length):
        digits = ""
        i = 0
        while i < length:
            if self.pos >= self.n or self.src[self.pos] not in _HEX_DIGITS:
                self.error("Invalid unicode escape")
            digits = digits + self.src[self.pos]
            self.pos = self.pos + 1
            i = i + 1
        return chr(int(digits, 16))

    def parse_literal_string(self):
        self.pos = self.pos + 1
        out = ""
        while True:
            if self.pos >= self.n:
                self.error("Unterminated string")
            ch = self.src[self.pos]
            if ch == "'":
                self.pos = self.pos + 1
                return out
            if ch == "\n":
                self.error("Newline in single-line string")
            out = out + ch
            self.pos = self.pos + 1

    def parse_multiline_literal_string(self):
        self.pos = self.pos + 3
        if self.peek() == "\n":
            self.pos = self.pos + 1
        out = ""
        while True:
            if self.pos >= self.n:
                self.error("Unterminated multi-line string")
            ch = self.src[self.pos]
            if ch == "'" and self.peek(1) == "'" and self.peek(2) == "'":
                extra = 0
                while extra < 2 and self.peek(3 + extra) == "'":
                    extra = extra + 1
                out = out + ("'" * extra)
                self.pos = self.pos + 3 + extra
                return out
            out = out + ch
            self.pos = self.pos + 1

    # ---- containers -------------------------------------------------------

    def parse_array(self):
        self.pos = self.pos + 1
        out = []
        while True:
            self.skip_blank()
            if self.peek() == "]":
                self.pos = self.pos + 1
                return out
            out.append(self.parse_value())
            self.skip_blank()
            ch = self.peek()
            if ch == ",":
                self.pos = self.pos + 1
            elif ch == "]":
                self.pos = self.pos + 1
                return out
            else:
                self.error("Expected ',' or ']' in array")

    def parse_inline_table(self):
        self.pos = self.pos + 1
        out = {}
        self.skip_ws()
        if self.peek() == "}":
            self.pos = self.pos + 1
            return out
        while True:
            self.skip_ws()
            key_path, value = self.parse_key_value()
            self.store(out, key_path, value)
            self.skip_ws()
            ch = self.peek()
            if ch == ",":
                self.pos = self.pos + 1
            elif ch == "}":
                self.pos = self.pos + 1
                return out
            else:
                self.error("Expected ',' or '}' in inline table")

    # ---- numbers and dates --------------------------------------------------

    def read_token(self):
        """Read a number/date token.  A space is only part of the token
        when it joins a date to a time (RFC 3339 'YYYY-MM-DD hh:mm')."""
        token = ""
        while self.pos < self.n:
            ch = self.src[self.pos]
            if ch in _DIGITS or ch in "+-_.:eExXoObBaAcCdDfFiInNtTzZ":
                token = token + ch
                self.pos = self.pos + 1
            elif (ch == " " and len(token) == 10
                  and self._looks_like_date(token)
                  and self.pos + 2 < self.n
                  and self.src[self.pos + 1] in _DIGITS
                  and self.src[self.pos + 2] in _DIGITS):
                token = token + ch
                self.pos = self.pos + 1
            else:
                break
        if token == "":
            self.error("Expected a value")
        return token

    def _looks_like_date(self, s):
        if len(s) < 10:
            return False
        i = 0
        while i < 10:
            if i == 4 or i == 7:
                if s[i] != "-":
                    return False
            elif s[i] not in _DIGITS:
                return False
            i = i + 1
        return True

    def _looks_like_time(self, s):
        return (len(s) >= 5 and s[0] in _DIGITS and s[1] in _DIGITS
                and s[2] == ":")

    def parse_number_or_date(self):
        token = self.read_token()
        if self._looks_like_date(token):
            return self.parse_datetime_token(token)
        if self._looks_like_time(token):
            return self.parse_time_token(token)
        return self.parse_number_token(token)

    def parse_datetime_token(self, token):
        year = int(token[0:4])
        month = int(token[5:7])
        day = int(token[8:10])
        if len(token) == 10:
            return datetime.date(year, month, day)
        sep = token[10]
        if sep != "T" and sep != "t" and sep != " ":
            self.error("Invalid date/time: " + token)
        timepart = token[11:]
        # Split off a trailing offset: Z / z / +hh:mm / -hh:mm.
        offset_minutes = None
        if timepart.endswith("Z") or timepart.endswith("z"):
            offset_minutes = 0
            timepart = timepart[:-1]
        else:
            i = len(timepart) - 6
            if i > 0 and (timepart[i] == "+" or timepart[i] == "-"):
                sign_ch = timepart[i]
                oh = int(timepart[i + 1:i + 3])
                om = int(timepart[i + 4:i + 6])
                offset_minutes = oh * 60 + om
                if sign_ch == "-":
                    offset_minutes = 0 - offset_minutes
                timepart = timepart[:i]
        hour, minute, second, micro = self._split_time(timepart)
        if offset_minutes is None:
            return datetime.datetime(year, month, day, hour, minute,
                                     second, micro)
        tz = datetime.timezone(datetime.timedelta(minutes=offset_minutes))
        return datetime.datetime(year, month, day, hour, minute, second,
                                 micro, tz)

    def parse_time_token(self, token):
        hour, minute, second, micro = self._split_time(token)
        return datetime.time(hour, minute, second, micro)

    def _split_time(self, s):
        if len(s) < 8 or s[2] != ":" or s[5] != ":":
            self.error("Invalid time: " + s)
        hour = int(s[0:2])
        minute = int(s[3:5])
        second = int(s[6:8])
        micro = 0
        if len(s) > 8:
            if s[8] != ".":
                self.error("Invalid time: " + s)
            frac = s[9:]
            if frac == "":
                self.error("Invalid time: " + s)
            while len(frac) < 6:
                frac = frac + "0"
            micro = int(frac[0:6])
        return hour, minute, second, micro

    def parse_number_token(self, token):
        lowered = token.lower()
        if lowered == "inf" or lowered == "+inf":
            return self.parse_float("inf")
        if lowered == "-inf":
            return self.parse_float("-inf")
        if lowered == "nan" or lowered == "+nan" or lowered == "-nan":
            return self.parse_float("nan")
        body = token
        sign = ""
        if body.startswith("+") or body.startswith("-"):
            sign = body[0]
            body = body[1:]
        if body.startswith("0x") or body.startswith("0X"):
            return self._signed_int(sign, self._strip_underscores(body[2:]), 16)
        if body.startswith("0o") or body.startswith("0O"):
            return self._signed_int(sign, self._strip_underscores(body[2:]), 8)
        if body.startswith("0b") or body.startswith("0B"):
            return self._signed_int(sign, self._strip_underscores(body[2:]), 2)
        cleaned = self._strip_underscores(token)
        is_float = False
        for ch in cleaned:
            if ch == "." or ch == "e" or ch == "E":
                is_float = True
                break
        if is_float:
            return self.parse_float(cleaned)
        try:
            return int(cleaned)
        except ValueError:
            self.error("Invalid number: " + token)

    def _signed_int(self, sign, digits, base):
        if digits == "":
            self.error("Invalid number")
        try:
            value = int(digits, base)
        except ValueError:
            self.error("Invalid number: " + digits)
        if sign == "-":
            return 0 - value
        return value

    def _strip_underscores(self, s):
        if s.startswith("_") or s.endswith("_") or "__" in s:
            self.error("Invalid underscore placement in number: " + s)
        return s.replace("_", "")
