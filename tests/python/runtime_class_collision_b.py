# Pattern (e), module B: defines `Shared` returning 'B'.
# Same Python class name as runtime_class_collision_a.py, but a
# different definition.  Loading both modules must keep their classes
# independent.

class Shared:
    def kind(self):
        return 'B'

inst = Shared()
result = inst.kind()
