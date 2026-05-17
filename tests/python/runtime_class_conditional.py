# Pattern (c): class defined inside a conditional branch.
# Only one of the two `class Cond:` statements should execute.

flag = True

if flag:
    class Cond:
        def kind(self):
            return 'true_branch'
else:
    class Cond:
        def kind(self):
            return 'false_branch'

c = Cond()
result = c.kind()
