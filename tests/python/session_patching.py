# Monkey-patching a method-backed name, one check each, all true under CPython.
#
# Grail makes a patch reach plain Smalltalk sends by installing methods -- a
# self-send dispatcher, or a builtins forwarder -- and those are transient
# SESSION methods now (Behavior >> ___compileSessionMethod:category:), so a
# patch writes nothing persistent and ends with the session.  The checks pin
# what that must not change, and the interaction it broke first: once a class
# carries a session method, the kernel's removeSelector:environmentId: fails
# for every selector of that class (it looks in the protected transient
# dictionary first), so ``del C.other'' after patching an instance of C raised
# "Illegal attempt to execute a protected method" (60 SUnit errors, one run).

import builtins


class Greeter:
    def word(self):
        return "hello"

    def greet(self):
        return self.word()

    def other(self):
        return "other"


def instance_patch_reaches_only_its_instance():
    g, sibling = Greeter(), Greeter()
    g.word = lambda: "patched"
    return (g.greet(), sibling.greet()) == ("patched", "hello")


def deleting_a_method_of_a_patched_class_works():
    class Local(Greeter):
        def extra(self):
            return "extra"
    x = Local()
    x.word = lambda: "patched"
    del Local.extra
    return (x.greet() == "patched" and not hasattr(Local, "extra")
            and Local().greet() == "hello")


def a_builtin_patch_reaches_bare_calls_and_restores():
    original = builtins.len
    try:
        builtins.len = lambda obj: 42
        patched = len("abc")
    finally:
        builtins.len = original
    return (patched, len("abc")) == (42, 3)


def deleting_the_instance_patch_restores_the_method():
    g = Greeter()
    g.word = lambda: "patched"
    first = g.greet()
    del g.word
    return (first, g.greet()) == ("patched", "hello")


CHECKS = [
    instance_patch_reaches_only_its_instance,
    deleting_a_method_of_a_patched_class_works,
    a_builtin_patch_reaches_bare_calls_and_restores,
    deleting_the_instance_patch_restores_the_method,
]

if __name__ == '__main__':
    for fn in CHECKS:
        try:
            ok = fn() is True
        except Exception as e:
            ok = False
            print('     %s raised %s: %s' % (fn.__name__, type(e).__name__, e))
        print('%-4s %s' % ('OK' if ok else 'FAIL', fn.__name__))
