# Fixture for NextIterTestCase.  Exercises the bare ``iter()`` and
# ``next()`` builtins — needed by re/__init__.py's
# ``next(iter(_cache))`` LRU-pop idiom.

# 1. iter() on a list returns an iterator that yields items in order.
nums = [10, 20, 30]
it = iter(nums)
first = next(it)
second = next(it)
third = next(it)

# 2. next() with a default catches StopIteration.
exhausted = iter([])
default_result = next(exhausted, 'no_more')

# 3. iter() on a dict yields keys — the actual re/__init__.py
# LRU-pop pattern.  CPython dicts preserve insertion order so the
# yielded key is the oldest; Grail's dict doesn't yet (TODO), so
# we only verify the result is one of the known keys.
cache = {'oldest': 1, 'middle': 2, 'newest': 3}
some_key = next(iter(cache))
some_key_is_valid = some_key in ('oldest', 'middle', 'newest')

# 4. Strings are iterable.
chars = iter('abc')
c1 = next(chars)
c2 = next(chars)
c3 = next(chars)

# 5. next() without default on an empty iterator raises StopIteration.
raised = False
empty = iter([])
try:
    next(empty)
except StopIteration:
    raised = True
