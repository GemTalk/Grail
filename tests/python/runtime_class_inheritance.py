# Pattern (g): inheritance via `bases`.  `Dog` inherits `kind` from
# `Animal` and adds its own `bark`.

class Animal:
    def kind(self):
        return 'animal'

class Dog(Animal):
    def bark(self):
        return 'woof'

a = Animal()
d = Dog()

a_kind = a.kind()
d_kind = d.kind()
d_bark = d.bark()
