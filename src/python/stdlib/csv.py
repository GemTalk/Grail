# GRAIL csv - reader/writer/DictReader/DictWriter with RFC-4180-style
# quoting, multi-line quoted fields, and the four QUOTE_* policies.
# Deviations from CPython, kept deliberately small for V1:
#   * dialects are passed as keyword arguments (register_dialect and
#     the Dialect classes are minimal: only `excel` is predefined);
#   * Sniffer is not provided;
#   * escapechar handling covers the common write path only.

__all__ = ["QUOTE_MINIMAL", "QUOTE_ALL", "QUOTE_NONNUMERIC", "QUOTE_NONE",
           "Error", "excel", "reader", "writer", "DictReader", "DictWriter",
           "field_size_limit"]

QUOTE_MINIMAL = 0
QUOTE_ALL = 1
QUOTE_NONNUMERIC = 2
QUOTE_NONE = 3


class Error(Exception):
    pass


class excel:
    delimiter = ","
    quotechar = '"'
    escapechar = None
    doublequote = True
    skipinitialspace = False
    lineterminator = "\r\n"
    quoting = QUOTE_MINIMAL


_field_size_limit = 131072


def field_size_limit(new_limit=None):
    global _field_size_limit
    old = _field_size_limit
    if new_limit is not None:
        _field_size_limit = new_limit
    return old


def _strip_eol(line):
    while line and (line[-1] == "\n" or line[-1] == "\r"):
        line = line[:-1]
    return line


class _Reader:
    def __init__(self, lines, delimiter, quotechar, quoting,
                 skipinitialspace):
        self._it = iter(lines)
        self._delimiter = delimiter
        self._quotechar = quotechar
        self._quoting = quoting
        self._skipinitialspace = skipinitialspace
        self.line_num = 0

    def __iter__(self):
        return self

    def __next__(self):
        line = _strip_eol(next(self._it))
        self.line_num = self.line_num + 1
        fields = []
        field = ""
        was_quoted = False
        in_quotes = False
        i = 0
        while True:
            n = len(line)
            if i >= n:
                if in_quotes:
                    # Quoted field spans physical lines: pull the next one.
                    line = _strip_eol(next(self._it))
                    self.line_num = self.line_num + 1
                    field = field + "\n"
                    i = 0
                    continue
                break
            ch = line[i]
            if in_quotes:
                if ch == self._quotechar:
                    if i + 1 < n and line[i + 1] == self._quotechar:
                        field = field + self._quotechar
                        i = i + 2
                        continue
                    in_quotes = False
                    i = i + 1
                    continue
                field = field + ch
                i = i + 1
                continue
            if ch == self._quotechar and field == "":
                in_quotes = True
                was_quoted = True
                i = i + 1
                continue
            if ch == self._delimiter:
                fields.append(self._convert(field, was_quoted))
                field = ""
                was_quoted = False
                i = i + 1
                if self._skipinitialspace:
                    while i < n and line[i] == " ":
                        i = i + 1
                continue
            field = field + ch
            i = i + 1
        if line != "" or fields or was_quoted:
            fields.append(self._convert(field, was_quoted))
        return fields

    def _convert(self, field, was_quoted):
        if self._quoting == QUOTE_NONNUMERIC and not was_quoted:
            return float(field)
        return field


def reader(csvfile, delimiter=",", quotechar='"', quoting=QUOTE_MINIMAL,
           skipinitialspace=False, lineterminator="\r\n", doublequote=True,
           escapechar=None):
    return _Reader(csvfile, delimiter, quotechar, quoting, skipinitialspace)


class _Writer:
    def __init__(self, f, delimiter, quotechar, quoting, lineterminator,
                 escapechar, doublequote):
        self._f = f
        self._delimiter = delimiter
        self._quotechar = quotechar
        self._quoting = quoting
        self._lineterminator = lineterminator
        self._escapechar = escapechar
        self._doublequote = doublequote

    def _needs_quotes(self, text):
        for ch in text:
            if ch == self._delimiter or ch == self._quotechar or ch == "\n" or ch == "\r":
                return True
        return False

    def _format_field(self, value):
        is_number = isinstance(value, int) or isinstance(value, float)
        if value is None:
            text = ""
        elif is_number:
            text = str(value)
        else:
            text = str(value)
        quote_it = False
        if self._quoting == QUOTE_ALL:
            quote_it = True
        elif self._quoting == QUOTE_NONNUMERIC:
            quote_it = not is_number
        elif self._quoting == QUOTE_MINIMAL:
            quote_it = self._needs_quotes(text)
        elif self._quoting == QUOTE_NONE:
            if self._needs_quotes(text):
                if self._escapechar is None:
                    raise Error("need to escape, but no escapechar set")
                out = ""
                for ch in text:
                    if ch == self._delimiter or ch == self._quotechar:
                        out = out + self._escapechar
                    out = out + ch
                text = out
            return text
        if quote_it:
            text = self._quotechar + text.replace(self._quotechar, self._quotechar + self._quotechar) + self._quotechar
        return text

    def writerow(self, row):
        parts = []
        for value in row:
            parts.append(self._format_field(value))
        self._f.write(self._delimiter.join(parts) + self._lineterminator)
        return None

    def writerows(self, rows):
        for row in rows:
            self.writerow(row)
        return None


def writer(csvfile, delimiter=",", quotechar='"', quoting=QUOTE_MINIMAL,
           lineterminator="\r\n", escapechar=None, doublequote=True,
           skipinitialspace=False):
    return _Writer(csvfile, delimiter, quotechar, quoting, lineterminator,
                   escapechar, doublequote)


class DictReader:
    def __init__(self, f, fieldnames=None, restkey=None, restval=None,
                 delimiter=",", quotechar='"', quoting=QUOTE_MINIMAL,
                 skipinitialspace=False):
        self.reader = reader(f, delimiter, quotechar, quoting,
                             skipinitialspace)
        self.fieldnames = fieldnames
        self.restkey = restkey
        self.restval = restval

    @property
    def line_num(self):
        return self.reader.line_num

    def __iter__(self):
        return self

    def __next__(self):
        if self.fieldnames is None:
            self.fieldnames = next(self.reader)
        row = next(self.reader)
        while row == []:
            row = next(self.reader)
        d = {}
        n = len(self.fieldnames)
        i = 0
        while i < n and i < len(row):
            d[self.fieldnames[i]] = row[i]
            i = i + 1
        while i < n:
            d[self.fieldnames[i]] = self.restval
            i = i + 1
        if len(row) > n and self.restkey is not None:
            d[self.restkey] = row[n:]
        return d


class DictWriter:
    def __init__(self, f, fieldnames, restval="", extrasaction="raise",
                 delimiter=",", quotechar='"', quoting=QUOTE_MINIMAL,
                 lineterminator="\r\n"):
        self.fieldnames = fieldnames
        self.restval = restval
        self.extrasaction = extrasaction
        self.writer = writer(f, delimiter, quotechar, quoting,
                             lineterminator)

    def writeheader(self):
        return self.writer.writerow(self.fieldnames)

    def _dict_to_list(self, rowdict):
        if self.extrasaction == "raise":
            for key in rowdict:
                if key not in self.fieldnames:
                    raise ValueError("dict contains fields not in fieldnames: " + str(key))
        out = []
        for name in self.fieldnames:
            out.append(rowdict.get(name, self.restval))
        return out

    def writerow(self, rowdict):
        return self.writer.writerow(self._dict_to_list(rowdict))

    def writerows(self, rowdicts):
        for rowdict in rowdicts:
            self.writerow(rowdict)
        return None
