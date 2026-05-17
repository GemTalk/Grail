# Pattern (f): instance method reads a module-level global.

greeting = 'hello'

class Greeter:
    def say(self):
        return greeting

g = Greeter()
result = g.say()
