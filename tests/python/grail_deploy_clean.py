# Fixture for the deploy-audit test: a fully commit-clean module.
import re

value = 42
data = {'a': 1, 'b': [2, 3]}

# A compiled pattern holds a C pointer, but keeps its compile arguments and
# rebuilds the pointer in a later session, so it is commit-clean.
pattern = re.compile(r"a+b")

def helper(x):
    return x + 1
