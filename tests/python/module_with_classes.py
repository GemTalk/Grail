# Test module for Phase 5c: Python class → real Smalltalk class.

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def sum(self):
        return self.x + self.y

    def move(self, x, y):
        self.x = x
        self.y = y

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


# --- __init__ keyword / super binding (blocker A) -------------------
# __init__ is compiled to the varargs ___init__:kw: form so it binds
# positional, keyword, and mixed arguments by name, including through
# super().__init__(...).

class Point3D(Point):
    def __init__(self, x, y, z):
        super().__init__(x, y)
        self.z = z


def init_by_keyword():
    q = Point(x=10, y=20)
    return q.x == 10 and q.y == 20


def init_mixed_positional_keyword():
    q = Point(3, y=4)
    return q.x == 3 and q.y == 4


def init_missing_arg_raises():
    try:
        Point(1)
    except TypeError:
        return True
    return False


def super_init_positional():
    a = Point3D(1, 2, 3)
    return a.x == 1 and a.y == 2 and a.z == 3


def super_init_keyword():
    b = Point3D(x=4, y=5, z=6)
    return b.x == 4 and b.y == 5 and b.z == 6
