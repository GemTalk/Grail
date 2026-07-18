# Fixture for CPythonHarnessTestCase>>testBigmemtestDecoratorInjection.
#
# CPython's test.support ships @bigmemtest / @bigaddrspacetest decorators that
# wrap a test method and, in a dry run (no ``-M'' memory limit), call it with
# ``size'' set to a small maxsize (5147).  Grail DROPS the decorator (its
# test.support.bigmemtest is a passthrough), so without help the wrapped body
# would keep ``size'' REQUIRED and unittest — invoking the method with no
# arguments — would error.  FunctionDefAst recognises the decorator and injects
# that dry-run default plus a unary forwarder, so the method is BOTH callable
# with no arguments (size == 5147) AND discoverable by unittest's dir()-based
# getTestCaseNames (which filters on a ``test'' prefix).
#
# This is a real importlib module (not an eval: snippet): a class can only be
# instantiated in a genuine module scope, which is what the harness path uses.


def bigmemtest(size, memuse, dry_run=True):
    def deco(f):
        return f
    return deco


class _Support:
    def bigaddrspacetest(self, size, memuse, dry_run=True):
        def deco(f):
            return f
        return deco


support = _Support()


class BigmemFixture:
    # Name form: @bigmemtest(...)
    @bigmemtest(2**32, memuse=0.85)
    def test_name_form(self, size):
        return size

    # Attribute form: @support.bigaddrspacetest(...)
    @support.bigaddrspacetest(2**31, memuse=0.1)
    def test_attr_form(self, size):
        return size


def _run():
    f = BigmemFixture()
    names = dir(f)
    return (
        f.test_name_form(),                 # dry-run size default -> 5147
        f.test_attr_form(),                 # 5147
        "test_name_form" in names,          # discoverable via dir()
        "test_attr_form" in names,          # discoverable via dir()
    )


RESULT = _run()
