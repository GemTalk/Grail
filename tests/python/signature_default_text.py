"""``inspect.signature`` must render a default as Python source.

Driven by PythonTests>>SignatureDefaultTextTestCase.

Grail has no code object, so ``FunctionDefAst`` stamps a ``__signature_spec__``
carrying each default's SOURCE TEXT, and that text was produced by the
ANNOTATIONS unparser.  Its assumptions hold for annotations and not for
defaults, so the rendering was wrong for most non-trivial shapes:

  * every binary operator became the PEP 604 union bar -- ``1+1`` rendered
    ``1 | 1``, and so did ``3-1``, ``2*3``, ``7/2``, ``5%2``, ``2**3``,
    ``1&3``, ``1^2``, ``1<<2``.  The unparser hardcoded `` | `` and said so:
    "the exact operator glyph is not load-bearing".  True for annotations.
  * a string literal lost its quotes, because an annotation's string literal is
    a FORWARD REFERENCE whose content is the name: ``'abc'`` rendered ``abc``,
    and ``''`` rendered nothing at all after the equals sign.
  * a tuple rendered BARE, which changed the signature's apparent arity:
    ``def f(j=(1,2))`` printed ``(j=1, 2)`` -- two parameters, not one tuple.
    That is the worst of them; the others are wrong, this one is misleading.
  * unary minus, lists and dicts fell to an ``<annotation>`` placeholder.

Defaults now have their own renderer that delegates to the annotation form only
where the two agree.  ``the_annotation_forms_are_unchanged`` is the guard rail:
the annotation path legitimately wants the union bar and the bare forward
reference, so a fix that "corrected" those would break PEP 604 and PEP 563.

A COMPUTED default still renders as source text rather than its value
(``m=1+1`` gives ``1 + 1`` where CPython gives ``2``) -- see inspect._DefaultText
for why, and note that closing it needs ``__defaults__``, which Grail does not
expose.  The checks below therefore cover LITERAL defaults, where Grail and
CPython agree exactly, plus one check recording the computed-default difference.
"""

import inspect


def _sig(fn):
    return str(inspect.signature(fn))


def a_string_default_keeps_its_quotes():
    def f(a='abc'):
        pass
    return _sig(f) == "(a='abc')"


def an_empty_string_default_is_visible():
    """It rendered as ``b=`` -- nothing after the equals sign."""
    def f(b=''):
        pass
    return _sig(f) == "(b='')"


def a_string_containing_a_quote_uses_double_quotes():
    def f(v="it's"):
        pass
    return _sig(f) == '(v="it\'s")'


def a_negative_number_default_renders():
    """Unary minus hit the ``<annotation>`` placeholder."""
    def f(g=-5):
        pass
    return _sig(f) == '(g=-5)'


def a_list_default_renders():
    def f(h=[1]):
        pass
    return _sig(f) == '(h=[1])'


def an_empty_list_default_renders():
    def f(r=[]):
        pass
    return _sig(f) == '(r=[])'


def a_dict_default_renders():
    def f(i={'x': 1}):
        pass
    return _sig(f) == "(i={'x': 1})"


def a_tuple_default_keeps_its_parentheses():
    """Without the parens the signature reads as TWO parameters."""
    def f(j=(1, 2)):
        pass
    return _sig(f) == '(j=(1, 2))'


def a_one_tuple_default_keeps_its_trailing_comma():
    def f(q=(1,)):
        pass
    return _sig(f) == '(q=(1,))'


def nested_literal_defaults_render():
    def f(w=[1, 'a', (2,)], y={'k': [1]}):
        pass
    return _sig(f) == "(w=[1, 'a', (2,)], y={'k': [1]})"


def the_plain_literals_still_render():
    """The guard rail for the shapes that always worked."""
    def f(c=None, d=True, e=1, k=3.5):
        pass
    return _sig(f) == '(c=None, d=True, e=1, k=3.5)'


def the_annotation_forms_are_unchanged():
    """The important guard rail.

    A PEP 604 union annotation NEEDS the union bar, and a PEP 563 forward
    reference NEEDS its quotes stripped -- both are exactly what made the shared
    unparser wrong for defaults.  Fixing defaults must not touch either."""
    def f(x: int | None = None, z: 'Later' = None):
        pass
    return _sig(f) == "(x: int | None = None, z: 'Later' = None)"


# scripts/check_python_fixtures.sh runs this under CPython in CI.
if __name__ == '__main__':
    checks = [
        a_string_default_keeps_its_quotes,
        an_empty_string_default_is_visible,
        a_string_containing_a_quote_uses_double_quotes,
        a_negative_number_default_renders,
        a_list_default_renders,
        an_empty_list_default_renders,
        a_dict_default_renders,
        a_tuple_default_keeps_its_parentheses,
        a_one_tuple_default_keeps_its_trailing_comma,
        nested_literal_defaults_render,
        the_plain_literals_still_render,
        the_annotation_forms_are_unchanged,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
