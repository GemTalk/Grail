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


# ---------------------------------------------------------------------------
# MRO ORDER between the two class-attribute stores.
#
# CPython walks the MRO once and takes the first class whose __dict__ holds the
# name -- and a class's __dict__ holds its attributes and its functions
# together, so whichever class is NEARER wins regardless of which kind supplies
# it.  Grail keeps those in separate stores and consulted the attribute store
# for the WHOLE chain before falling back to methods, so an ancestor's
# attribute beat a nearer class's compiled method.
# ---------------------------------------------------------------------------

class MroAttrBase:
    pass


def _mro_attr_on_base(self):
    return 'attr-on-base'


MroAttrBase.m = _mro_attr_on_base


class MroMethodSub(MroAttrBase):
    def m(self):
        return 'method-on-sub'


class MroPlainSub(MroAttrBase):
    """No method of its own -- must still inherit the ancestor's attribute."""
    pass


class MroStrBase:
    pass


MroStrBase.v = 'a-plain-string'


class MroStrSub(MroStrBase):
    def v(self):
        return 'method-on-sub'


class MroSameClass:
    def m(self):
        return 'compiled'


nearer_method_beats_ancestor_attribute = MroMethodSub().m()
nearer_method_read_off_the_class = type(MroMethodSub.m).__name__
ancestor_attribute_still_inherited = MroPlainSub().m()
base_attribute_unaffected = MroAttrBase().m()

# The ancestor attribute is not even callable here: before the fix it shadowed
# the subclass method and the call died with "'Unicode7' object is not
# callable".
non_callable_ancestor_attr_does_not_shadow = MroStrSub().v()
non_callable_attr_still_reads_on_its_own_class = MroStrBase.v

# Last-write-wins on the SAME class must keep working: assigning over a class's
# own method replaces it, which is the ordinary monkey-patch.
MroSameClass.m = lambda self: 'patched'
same_class_assignment_still_wins = MroSameClass().m()
