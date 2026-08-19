"""Fixtures for the suggestions that need the RAISING FRAME'S RECEIVER.

Driven by PythonTests>>FrameReceiverSuggestionTestCase.  Each check answers True
when Grail agrees with CPython.

THE RULE.  CPython's traceback.py consults ``frame.f_locals['self']'' of the
innermost frame twice while composing a "Did you mean":

  * a NameError for an undefined bare name that IS an attribute of the instance
    whose method is running is answered with ``self.<name>'', in preference to
    the nearest-looking local; and
  * a failed attribute access made from INSIDE the object's own method stops
    hiding underscored candidates, because code in the class is entitled to be
    reminded of the class's own private names.

Both are gated on the local literally being spelled ``self'', which is a
statement about the SOURCE: a module-level function has no such local, so
neither behaviour applies there.

WHY GRAIL COULD NOT DO EITHER.  A Python method's ``self'' is not a frame
temporary in Grail -- it is the Smalltalk RECEIVER -- so it never appeared among
the frame's names, and by the time a traceback is rendered the stack has unwound
(the VM's capture records (method, ip, receiver) triples and no temporaries).
The receiver is snapshotted at raise time instead, under the name the source
declared for it, which the codegen already records per method in
``___methodReceiverTable___''.  Consulting that table rather than guessing is
what keeps a module-level function from acquiring a ``self'' it never wrote, and
a nested def from borrowing the receiver of the method that encloses it.

Run this file under CPython (``python3 tests/python/frame_receiver_suggestions.py'')
to see what it produces.
"""

import traceback


def _suggestion(fn):
    """The last line of the formatted exception fn() raises -- the message line,
    which is where a "Did you mean" lands.  Uses format_exc so the traceback is
    carried: CPython offers no NameError suggestion without one."""
    try:
        fn()
    except Exception:
        return traceback.format_exc().splitlines()[-1]
    return '<no exception>'


class Instance:
    def __init__(self):
        self.blech = None

    def undefined_bare_name(self):
        blich = 1
        x = blech            # noqa: F821  -- the point of the fixture

    def nested_undefined_bare_name(self):
        def inner():
            blich = 1
            x = blech        # noqa: F821
        inner()

    def lambda_undefined_bare_name(self):
        f = lambda: blech    # noqa: E731,F821
        f()

    @classmethod
    def undefined_in_classmethod(cls):
        cls.blech = None
        x = blech            # noqa: F821


class Private:
    _bluch = None

    def read_attr(self, name):
        getattr(self, name)


class SideEffect:
    def __getattr__(self, key):
        if key == 'foo':
            raise AttributeError('foo')
        if key == 'spam':
            raise ValueError('spam')

    def bare_foo(self):
        foo                  # noqa: F821

    def bare_spam(self):
        spam                 # noqa: F821


module_level_blech = None


def module_level_undefined_bare_name():
    blich = 1
    x = blech                # noqa: F821


def a_method_gets_the_self_suggestion():
    return 'self.blech' in _suggestion(Instance().undefined_bare_name)


def the_self_suggestion_beats_a_nearer_local():
    """``blich'' is one edit from ``blech'' and IS in scope, so a plain
    nearest-name search would offer it.  CPython checks the instance first."""
    return "'blich'" not in _suggestion(Instance().undefined_bare_name)


def a_module_function_gets_no_self_suggestion():
    """No ``self'' in a module-level function's locals, so no self. suggestion --
    even though a module global of that name exists."""
    return 'self.' not in _suggestion(module_level_undefined_bare_name)


def a_nested_def_does_not_borrow_the_enclosing_self():
    """``inner'' has no ``self'' of its own; the instance around it is not
    something the failing line mentioned."""
    return 'self.' not in _suggestion(Instance().nested_undefined_bare_name)


def a_lambda_does_not_borrow_the_enclosing_self():
    """Same rule as a nested def: a lambda's frame has no ``self'' of its own."""
    return 'self.' not in _suggestion(Instance().lambda_undefined_bare_name)


def a_classmethod_receiver_is_not_self():
    """The receiver is spelled ``cls'', and CPython's check is for ``self''
    literally, so no suggestion names the receiver."""
    return 'self.' not in _suggestion(Instance.undefined_in_classmethod)


def an_underscored_candidate_is_offered_inside_the_class():
    return "'_bluch'" in _suggestion(lambda: Private().read_attr('bluch'))


def an_underscored_candidate_is_hidden_outside_the_class():
    return "'_bluch'" not in _suggestion(lambda: getattr(Private(), 'bluch'))


def an_underscored_typo_is_offered_the_underscored_name_anywhere():
    """Hiding only ever applied to a typo with no leading underscore."""
    return "'_bluch'" in _suggestion(lambda: getattr(Private(), '_blach'))


def a_getattr_raising_attributeerror_declines_quietly():
    """hasattr runs user code.  ``foo'' answers AttributeError, so there is no
    attribute and no self. suggestion -- and no crash (gh-132385)."""
    line = _suggestion(SideEffect().bare_foo)
    return 'self.' not in line and "'foo'" in line


def a_getattr_raising_something_else_declines_quietly():
    """``spam'' answers ValueError, which hasattr does NOT swallow, so the
    suggestion machinery has to."""
    line = _suggestion(SideEffect().bare_spam)
    return 'self.' not in line and "'spam'" in line


def format_exception_only_offers_no_self_suggestion():
    """No traceback means no innermost frame, and CPython gates the whole
    NameError branch on having one."""
    try:
        Instance().undefined_bare_name()
    except NameError as e:
        return 'self.' not in traceback.format_exception_only(e)[-1]
    return False


if __name__ == '__main__':
    checks = [
        a_method_gets_the_self_suggestion,
        the_self_suggestion_beats_a_nearer_local,
        a_module_function_gets_no_self_suggestion,
        a_nested_def_does_not_borrow_the_enclosing_self,
        a_lambda_does_not_borrow_the_enclosing_self,
        a_classmethod_receiver_is_not_self,
        an_underscored_candidate_is_offered_inside_the_class,
        an_underscored_candidate_is_hidden_outside_the_class,
        an_underscored_typo_is_offered_the_underscored_name_anywhere,
        a_getattr_raising_attributeerror_declines_quietly,
        a_getattr_raising_something_else_declines_quietly,
        format_exception_only_offers_no_self_suggestion,
    ]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
