# Fixture for ReprlibTestCase.testRecursiveRepr.  A self-referential
# node whose __repr__ would recurse forever without recursive_repr.
# The wrapper is applied explicitly (not with @-syntax) because Grail
# drops non-declarative method decorators on the floor — see TODO.md.

import reprlib


class Node:
    def __init__(self):
        self.child = None

    def __repr__(self):
        return _node_repr(self)


def _plain_node_repr(self):
    return "Node(" + repr(self.child) + ")"


_node_repr = reprlib.recursive_repr()(_plain_node_repr)


def recursive_result():
    n = Node()
    n.child = n
    return repr(n)
