# Fixture for DynamicGlobalsTestCase.  Exercises module-level names
# that aren't statically declared in the source — they're added at
# module-init time via globals().update(...) or similar.  CPython
# resolves bare reads through __globals__ at runtime; Grail's NameAst
# needs to emit a runtime lookup when the name can't be resolved at
# compile time and we're in a module-body/module-method context.

globals().update({'DYN_X': 11, 'DYN_Y': 22})

# Read the dynamic names back at module top level — both bare and in
# expressions.  The store target stays a normal name binding because
# the codegen sees `result_*` declared.
result_x = DYN_X
result_y = DYN_Y
result_sum = DYN_X + DYN_Y

# Bare-name read after `del`: today emits `name := nil` for the static
# instVar, but the read codegen wraps it in `UnboundLocalError
# ___checkLocal:`, which raises on nil.  UnboundLocalError is a NameError
# subclass, so this happens to pass today — accidentally correct.
predeclared = 100
del predeclared
try:
    _ = predeclared
    del_made_name_unbound = False
except NameError:
    del_made_name_unbound = True

# Phase A red light: `hasattr` after `del` should report False, because
# `del` should truly remove the binding from the module's attribute
# namespace.  Today the static instVar slot still exists (just nil),
# so hasattr likely reports True regardless of the del.  After Phase A,
# del emits `removeDynamicInstVar:` and the slot is genuinely gone.
import sys
_self = sys.modules['dynamic_globals']

deletable = 200
deletable_present_before_del = hasattr(_self, 'deletable')
del deletable
deletable_present_after_del = hasattr(_self, 'deletable')
