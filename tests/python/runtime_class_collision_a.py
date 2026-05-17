# Pattern (e), module A: defines `Shared` returning 'A'.

class Shared:
    def kind(self):
        return 'A'

inst = Shared()
result = inst.kind()
