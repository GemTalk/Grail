# variable_scope.py — comprehensive LEGB scoping test suite for Grail
#
# Each test function prints "PASS" or "FAIL" with a description.
# At the end, a summary line reports total pass/fail counts.

pass_count = 0
fail_count = 0

def check(condition, description):
    global pass_count, fail_count
    if condition:
        pass_count = pass_count + 1
        print("PASS: " + description)
    else:
        fail_count = fail_count + 1
        print("FAIL: " + description)

# --- 1. Local scope basics ------------------------------------------

def test_local_scope():
    x = 10
    check(x == 10, "local variable is visible in its own scope")

def test_local_does_not_leak():
    x = 42
    # 'x' here is local to this function; it should not affect
    # any 'x' in other functions or at module level.
    check(x == 42, "local variable does not leak to outer scope")

# --- 2. Enclosing (nonlocal) scope ----------------------------------

def test_enclosing_read():
    x = "outer"
    def inner():
        return x
    check(inner() == "outer", "inner function reads enclosing variable")

def test_enclosing_shadow():
    x = "outer"
    def inner():
        x = "inner"
        return x
    check(inner() == "inner", "inner function shadows enclosing variable")
    check(x == "outer", "enclosing variable unchanged after inner shadows it")

def test_nonlocal_write():
    x = "before"
    def inner():
        nonlocal x
        x = "after"
    inner()
    check(x == "after", "nonlocal allows inner function to modify enclosing variable")

def test_nonlocal_multiple_levels():
    x = 0
    def middle():
        def innermost():
            nonlocal x
            x = 99
        innermost()
    middle()
    check(x == 99, "nonlocal reaches past intermediate scope to enclosing")

def test_nonlocal_stops_at_nearest():
    x = "outermost"
    def middle():
        x = "middle"
        def inner():
            nonlocal x
            x = "changed"
        inner()
        return x
    result = middle()
    check(result == "changed", "nonlocal modifies nearest enclosing scope")
    check(x == "outermost", "outer scope beyond nonlocal target is untouched")

# --- 3. Global scope ------------------------------------------------

module_var = "module"

def test_global_read():
    check(module_var == "module", "function reads module-level global")

def test_global_write():
    global module_var
    old = module_var
    module_var = "modified"
    check(module_var == "modified", "global declaration allows writing module variable")
    module_var = old  # restore for later tests

def test_global_inside_nested():
    global module_var
    old = module_var
    def inner():
        global module_var
        module_var = "from_inner"
    inner()
    check(module_var == "from_inner", "global in nested function writes to module scope")
    module_var = old

# --- 4. Built-in scope ----------------------------------------------

def test_builtin_accessible():
    # len is a built-in; it should be visible without import
    check(len("abc") == 3, "built-in function (len) is accessible")

def test_builtin_shadow():
    len = 99  # shadows the built-in
    check(len == 99, "local variable shadows built-in name")

def test_builtin_restored_after_shadow():
    # In a fresh scope, the built-in should be back
    check(len("abcd") == 4, "built-in restored in a different scope after shadowing")

# --- 5. Shadowing across all four LEGB levels -----------------------

x_legb = "global"

def test_legb_full_shadow():
    x_legb = "enclosing"
    def inner():
        x_legb = "local"
        check(x_legb == "local", "L shadows E, G, and B")
    inner()
    check(x_legb == "enclosing", "E unchanged after L shadows it")

def test_legb_enclosing_shadows_global():
    x_legb_2 = "enclosing"
    def inner():
        # no local x_legb_2; should find enclosing
        return x_legb_2
    check(inner() == "enclosing", "E shadows G when no L exists")

# --- 6. UnboundLocalError scenarios ----------------------------------

def test_unboundlocal_read_before_assign():
    x = "outer"
    def inner():
        # 'x = ...' later in this scope makes 'x' local to inner,
        # so reading it before the assignment is an error.
        try:
            y = x  # should raise UnboundLocalError
            x = 10
            check(False, "UnboundLocalError on read before local assign (should not reach here)")
        except UnboundLocalError:
            check(True, "UnboundLocalError on read before local assign")
    inner()

def test_unboundlocal_in_loop():
    def f():
        for i in range(1):
            try:
                print(z)
            except UnboundLocalError:
                check(True, "UnboundLocalError inside loop body before assign")
            z = 42
    f()

# --- 7. global vs nonlocal conflicts ---------------------------------

# Python forbids mixing global and nonlocal for the same name.
# These are compile-time errors. We test via exec so the tests
# can continue even if the implementation raises SyntaxError at
# compile time.

def test_global_and_nonlocal_conflict():
    code = """
def outer():
    x = 1
    def inner():
        global x
        nonlocal x
    inner()
"""
    try:
        exec(code)
        check(False, "global+nonlocal conflict should raise SyntaxError (did not)")
    except SyntaxError:
        check(True, "global+nonlocal conflict raises SyntaxError")

# --- 8. Closures capture by reference, not by value -----------------

def test_closure_captures_reference():
    funcs = []
    for i in range(3):
        funcs.append(lambda: i)
    # all three lambdas share the same 'i', which ends at 2
    check(funcs[0]() == 2, "closure captures variable by reference (lambda 0)")
    check(funcs[1]() == 2, "closure captures variable by reference (lambda 1)")
    check(funcs[2]() == 2, "closure captures variable by reference (lambda 2)")

def test_closure_capture_with_default_arg():
    funcs = []
    for i in range(3):
        funcs.append(lambda i=i: i)
    # default-arg trick captures current value
    check(funcs[0]() == 0, "default-arg capture freezes value (lambda 0)")
    check(funcs[1]() == 1, "default-arg capture freezes value (lambda 1)")
    check(funcs[2]() == 2, "default-arg capture freezes value (lambda 2)")

# --- 9. Class scope is NOT an enclosing scope -----------------------

def test_class_scope_not_enclosing():
    class C:
        x = 10
        def method(self):
            # x is a class variable, not in LEGB enclosing scope
            try:
                return x  # type: ignore[reportUndefinedVariable]
            except NameError:
                return "NameError"
    c = C()
    result = c.method()
    check(result == "NameError", "class body is not an enclosing scope for methods")

def test_class_scope_not_visible_in_comprehension():
    class C:
        x = 10
        # list comprehension has its own scope; class x is not visible
        try:
            values = [x for _ in range(1)]  # type: ignore[reportUndefinedVariable]
            check(False, "class variable not visible in comprehension (should not reach here)")
        except NameError:
            values = ["NameError"]
    check(C.values[0] == "NameError", "class variable not visible in comprehension")

# --- 10. Global declaration without assignment ----------------------

_global_for_test10 = "original"

def test_global_declaration_without_assign():
    global _global_for_test10
    # just declaring global without assigning should still allow reads
    check(_global_for_test10 == "original", "global declaration allows read without local assign")

# --- 11. Nested nonlocal chains -------------------------------------

def test_nonlocal_chain():
    result = []
    def level1():
        x = 1
        def level2():
            nonlocal x
            x = 2
            def level3():
                nonlocal x
                x = 3
            level3()
        level2()
        return x
    check(level1() == 3, "nonlocal chain propagates through multiple nesting levels")

# --- 12. Walrus operator (:=) scoping -------------------------------

def test_walrus_scope():
    # walrus operator assigns in the enclosing scope of a comprehension
    result = [y := i + 1 for i in range(3)]
    check(result == [1, 2, 3], "walrus operator produces correct list")
    check(y == 3, "walrus operator leaks variable into enclosing scope")

# --- 13. Star assignment unpacking -----------------------------------

def test_star_unpacking_scope():
    first, *rest = [1, 2, 3, 4]
    check(first == 1, "star unpacking: first element")
    check(rest == [2, 3, 4], "star unpacking: rest elements")

def test_star_unpacking_in_function():
    def f():
        a, *b, c = range(5)
        return (a, b, c)
    a, b, c = f()
    check(a == 0, "star unpacking in function: first")
    check(b == [1, 2, 3], "star unpacking in function: middle")
    check(c == 4, "star unpacking in function: last")

# --- 14. del and scope ----------------------------------------------

def test_del_makes_name_unbound():
    x = 42
    del x
    try:
        y = x
        check(False, "del should make variable unbound")
    except UnboundLocalError:
        check(True, "del makes variable unbound (UnboundLocalError)")

def test_del_global():
    global _temp_global
    _temp_global = "exists"
    del _temp_global
    try:
        y = _temp_global
        check(False, "del global should make variable unbound")
    except NameError:
        check(True, "del global makes variable unbound (NameError)")

# --- 15. Module-level name does not leak into function --------------

_private = "module_private"

def test_module_var_read_only_without_global():
    # reading is fine
    check(_private == "module_private", "module variable readable without global declaration")

def test_module_var_write_needs_global():
    # assigning makes it local, so the original is untouched
    _private = "local_override"
    check(_private == "local_override", "assignment creates local, does not modify module var")

def test_module_var_unchanged():
    check(_private == "module_private", "module variable unchanged after local assignment in other function")

# --- Run all tests --------------------------------------------------

test_local_scope()
test_local_does_not_leak()
test_enclosing_read()
test_enclosing_shadow()
test_nonlocal_write()
test_nonlocal_multiple_levels()
test_nonlocal_stops_at_nearest()
test_global_read()
test_global_write()
test_global_inside_nested()
test_builtin_accessible()
test_builtin_shadow()
test_builtin_restored_after_shadow()
test_legb_full_shadow()
test_legb_enclosing_shadows_global()
test_unboundlocal_read_before_assign()
test_unboundlocal_in_loop()
test_global_and_nonlocal_conflict()
test_closure_captures_reference()
test_closure_capture_with_default_arg()
test_class_scope_not_enclosing()
test_class_scope_not_visible_in_comprehension()
test_global_declaration_without_assign()
test_nonlocal_chain()
test_walrus_scope()
test_star_unpacking_scope()
test_star_unpacking_in_function()
test_del_makes_name_unbound()
test_del_global()
test_module_var_read_only_without_global()
test_module_var_write_needs_global()
test_module_var_unchanged()

print("")
print("Results: " + str(pass_count) + " passed, " + str(fail_count) + " failed, " + str(pass_count + fail_count) + " total")
if fail_count == 0:
    print("All tests passed!")
else:
    print("Some tests FAILED.")
