# Fixture for ModuleFunctionDecoratorsTestCase.  Module-level function
# decorators must run at module-body time and rebind the function name to
# the decorator's result.  Before the fix, top-level `@deco def f` dropped
# the decorator on the floor (only a 3-name jinja2 whitelist was applied),
# so `f` stayed the undecorated method and any tag/wrapper was lost.


# 1. tag-and-return: decorator mutates the function and returns it.
def tag(fn):
    fn.tagged = True
    return fn


@tag
def greet():
    return "hello"


greet_tagged = greet.tagged
greet_result = greet()


# 2. wrapper-replace: decorator returns a NEW function; bare calls must
#    dispatch to the wrapper.
def shout(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs).upper()
    return wrapper


@shout
def say(msg):
    return msg


say_result = say("hi")


# 3. decorator factory: decorator takes arguments.
def prefix(p):
    def deco(fn):
        def wrapper(*args, **kwargs):
            return p + fn(*args, **kwargs)
        return wrapper
    return deco


@prefix(">> ")
def line(text):
    return text


line_result = line("go")


# 4. stacked decorators apply bottom-up: @A @B def f rebinds f to A(B(f)).
@prefix("A:")
@prefix("B:")
def stacked(text):
    return text


stacked_result = stacked("x")


# 5. the decorator is a callable INSTANCE, not a function.  Grail called the
# decorator through ___pyCallValue___:kw:, which object answers with the
# TypeError "'X' object is not callable"; only PythonInstance>>value:value:
# knew how to reach __call__.  Inside the decorator-application guard that
# TypeError was discarded, so an instance decorator was silently dropped and
# the function kept its undecorated behaviour.
class Tagger:
    def __init__(self, tag):
        self.tag = tag

    def __call__(self, fn):
        def wrapper(*args, **kwargs):
            return self.tag + fn(*args, **kwargs)
        return wrapper


tag_it = Tagger("[t] ")


@tag_it
def tagged(text):
    return text


tagged_result = tagged("go")
