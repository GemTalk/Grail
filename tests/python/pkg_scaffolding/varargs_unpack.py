# Exercises Grail's varargs method-prologue codegen.  Methods compiled to
# the ``_name:kw:`` varargs form (any signature with defaults, *args,
# **kwargs, or keyword-only args) must:
#   * bind each named parameter from positional first, kwargs second,
#     default third (TypeError otherwise);
#   * collect leftover positional into *args as a tuple;
#   * bind keyword-only args from kwargs (default if absent);
#   * collect the remaining kwargs into **kwargs.


class Sigs:
    def by_default(self, a, b=2, c=3):
        """Named params with defaults — kwargs fallback exercised by
        passing some via keyword."""
        return (a, b, c)

    def collect_extra(self, head, *tail, **kw):
        """*args + **kwargs collection."""
        return (head, tail, kw)

    def kwonly(self, *, x, y=20):
        """Keyword-only args with and without defaults."""
        return (x, y)


def make():
    return Sigs()
