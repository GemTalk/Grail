# Pattern (b): re-definition of a class at module top level.
# Each `class Bar:` statement should create a NEW class object;
# instances built between the definitions should keep their original
# method behavior even after the name is rebound.

class Bar:
    def foo(self):
        return 1

bar1 = Bar()
r1_pre = bar1.foo()

class Bar:
    def foo(self):
        return 2

bar2 = Bar()
r1_post = bar1.foo()
r2 = bar2.foo()
