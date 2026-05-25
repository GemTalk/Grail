# Fixture for AttributeInheritanceTestCase.
#
# Python attribute lookup walks the class chain.  Pre-fix, Grail's
# dynInstVars storage was per-class but the lookup probed only the
# receiver's own dict — so ``C.x = 42; class D(C): pass; D.x'' raised
# AttributeError instead of returning 42, and ``c = C(); c.x'' raised
# instead of finding the class attribute.
#
# This fixture pins down the inheritance semantics:
#   * Subclass reads inherit from parent's dynInstVars
#   * Instance reads fall through to class chain (instance dict miss)
#   * Subclass override doesn't mutate parent
#   * Instance shadow doesn't mutate class; del unshadows
#   * Deep chains (grandparent → parent → child) walk correctly


class A:
    pass


class B(A):
    pass


class C(B):
    pass


# --- Direct child inherits parent's class attribute ---
A.alpha = 'from-A'
b_reads_alpha = B.alpha           # 'from-A' via inheritance


# --- Grandchild walks the full chain ---
c_reads_alpha = C.alpha           # 'from-A' (A.alpha)


# --- Instance reads class attribute (instance dict miss → class chain) ---
a_inst = A()
inst_reads_alpha = a_inst.alpha   # 'from-A'

c_inst = C()
c_inst_reads_alpha = c_inst.alpha # 'from-A' (via B → A walk)


# --- Subclass override doesn't affect parent ---
B.alpha = 'from-B'
b_reads_b_override = B.alpha      # 'from-B' (own dict wins)
a_still_reads_a = A.alpha         # 'from-A' (parent untouched)


# --- Grandchild now sees nearest parent's value (B, not A) ---
c_reads_b_override = C.alpha      # 'from-B' (walk stops at B)


# --- Instance shadow doesn't affect class ---
class Holder:
    pass

Holder.tag = 'class-tag'

h_inst = Holder()
h_inst.tag = 'instance-tag'
inst_tag_after_set = h_inst.tag    # 'instance-tag'
class_tag_after_inst_set = Holder.tag  # 'class-tag' (unchanged)


# --- del on instance attr reveals class attr again ---
del h_inst.tag
inst_tag_after_del = h_inst.tag    # 'class-tag' (back to class)


# --- Missing through the whole chain raises AttributeError ---
class Lonely:
    pass

try:
    _ = Lonely.never_set
    missing_in_chain = 'no_error'
except AttributeError:
    missing_in_chain = 'attribute_error'

l_inst = Lonely()
try:
    _ = l_inst.never_set
    inst_missing_in_chain = 'no_error'
except AttributeError:
    inst_missing_in_chain = 'attribute_error'
