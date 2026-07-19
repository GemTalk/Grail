# Fixture for CPythonHarnessTestCase>>testRequiresResourceDecoratorSkips.
#
# CPython's @support.requires_resource(res) skips a test unless the named
# resource is enabled via regrtest's -u option; a default ``python -m test''
# run enables none of the expensive resources (cpu, network, ...), so the
# decorated test is SKIPPED.  Grail has no -u mechanism and drops method
# decorators, so FunctionDefAst recognises the decorator and ClassDefAst emits
# a self.skipTest(...) body in place of the real one -- matching CPython's
# default.  This regresses both the bare-name (@requires_resource) and the
# attribute (@support.requires_resource) decorator shapes, and confirms an
# UNdecorated test in the same class still runs.
#
# Real importlib module (not an eval: snippet): unittest discovery + skip
# accounting need genuine module scope, and a class instantiates only there.

import unittest


def requires_resource(resource):
    def deco(f):
        return f
    return deco


class _Support:
    def requires_resource(self, resource):
        def deco(f):
            return f
        return deco


support = _Support()


class ResourceFixture(unittest.TestCase):
    # Bare-name form: @requires_resource('cpu')
    @requires_resource('cpu')
    def test_name_form(self):
        self.fail("should have been skipped (name form)")

    # Attribute form: @support.requires_resource('cpu')
    @support.requires_resource('cpu')
    def test_attr_form(self):
        self.fail("should have been skipped (attr form)")

    # Undecorated: still runs normally.
    def test_plain(self):
        self.assertEqual(1 + 1, 2)


def _run():
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(ResourceFixture)
    result = unittest.TestResult()
    suite.run(result)
    return (result.testsRun,
            len(result.failures),
            len(result.errors),
            len(result.skipped))


RESULT = _run()
