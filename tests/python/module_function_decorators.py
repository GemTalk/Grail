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
