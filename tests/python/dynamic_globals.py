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
