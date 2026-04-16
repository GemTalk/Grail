# Test module for Phase 5c: Python class → real Smalltalk class.

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def sum(self):
        return self.x + self.y

class Counter:
    def __init__(self):
        self.count = 0

    def inc(self):
        self.count = self.count + 1

    def get(self):
        return self.count

p = Point(3, 4)
p_sum = p.sum()
c = Counter()
c.inc()
c.inc()
c.inc()
c_count = c.get()
