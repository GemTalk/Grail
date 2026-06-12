# GRAIL textwrap - text wrapping and indentation helpers.
#
# dedent() and indent() follow CPython semantics closely.  wrap() /
# fill() / shorten() use a simple greedy word-wrap rather than porting
# CPython's TextWrapper regex machinery; deviations, kept deliberately
# small for V1:
#   * long words are never broken (break_long_words is accepted but
#     ignored), and hyphens are not treated as break points;
#   * whitespace is always collapsed (replace_whitespace semantics);
#   * the TextWrapper class exposes only the constructor arguments
#     below.

__all__ = ["TextWrapper", "wrap", "fill", "dedent", "indent", "shorten"]


class TextWrapper:
    def __init__(self, width=70, initial_indent="", subsequent_indent="",
                 break_long_words=True, drop_whitespace=True,
                 replace_whitespace=True, expand_tabs=True,
                 max_lines=None, placeholder=" [...]"):
        self.width = width
        self.initial_indent = initial_indent
        self.subsequent_indent = subsequent_indent
        self.break_long_words = break_long_words
        self.drop_whitespace = drop_whitespace
        self.replace_whitespace = replace_whitespace
        self.expand_tabs = expand_tabs
        self.max_lines = max_lines
        self.placeholder = placeholder

    def wrap(self, text):
        words = text.split()
        lines = []
        current = self.initial_indent
        has_word = False
        for word in words:
            if has_word:
                candidate = current + " " + word
            else:
                candidate = current + word
            if len(candidate) <= self.width or not has_word:
                current = candidate
                has_word = True
            else:
                lines.append(current)
                current = self.subsequent_indent + word
        if has_word:
            lines.append(current)
        return lines

    def fill(self, text):
        return "\n".join(self.wrap(text))


def wrap(text, width=70, initial_indent="", subsequent_indent=""):
    w = TextWrapper(width, initial_indent, subsequent_indent)
    return w.wrap(text)


def fill(text, width=70, initial_indent="", subsequent_indent=""):
    w = TextWrapper(width, initial_indent, subsequent_indent)
    return w.fill(text)


def shorten(text, width, placeholder=" [...]"):
    """Collapse and truncate the given text to fit in the given width."""
    words = text.split()
    if not words:
        return ""
    collapsed = " ".join(words)
    if len(collapsed) <= width:
        return collapsed
    out = ""
    for word in words:
        if out:
            candidate = out + " " + word
        else:
            candidate = word
        if len(candidate) + len(placeholder) <= width:
            out = candidate
        else:
            break
    if out:
        return out + placeholder
    return placeholder.strip()


def dedent(text):
    """Remove any common leading whitespace from all lines in text.

    Lines consisting solely of whitespace are ignored when computing
    the margin (and emptied in the output, matching CPython)."""
    lines = text.split("\n")
    margin = None
    for line in lines:
        stripped = line.lstrip()
        if not stripped:
            continue
        indent_part = line[:len(line) - len(stripped)]
        if margin is None:
            margin = indent_part
        else:
            common = ""
            limit = min(len(margin), len(indent_part))
            i = 0
            while i < limit and margin[i] == indent_part[i]:
                common = common + margin[i]
                i = i + 1
            margin = common
    if margin is None or margin == "":
        return text
    out = []
    for line in lines:
        if not line.lstrip():
            out.append("")
        elif line.startswith(margin):
            out.append(line[len(margin):])
        else:
            out.append(line)
    return "\n".join(out)


def indent(text, prefix, predicate=None):
    """Add 'prefix' to the beginning of selected lines in 'text'.

    By default only lines that contain non-whitespace get the prefix."""
    if predicate is None:
        def predicate(line):
            return line.strip()
    lines = text.split("\n")
    out = []
    n = len(lines)
    i = 0
    while i < n:
        line = lines[i]
        # The artificial '' after a trailing \n must stay unprefixed
        # even under an always-true predicate, so test "is this a real
        # line" the same way splitlines() would: the last split piece
        # is only a line if it is non-empty.
        if (i < n - 1 or line) and predicate(line):
            out.append(prefix + line)
        else:
            out.append(line)
        i = i + 1
    return "\n".join(out)
