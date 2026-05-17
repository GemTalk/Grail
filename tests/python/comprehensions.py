# Fixture for ComprehensionTestCase — exercises every comprehension shape
# that Grail's codegen needs to handle.

xs = [1, 2, 3, 4]
ys = [10, 20]
pairs = [(1, 'a'), (2, 'b'), (3, 'c')]

# --- List comprehensions ---
list_basic    = [x for x in xs]
list_expr     = [x * x for x in xs]
list_filter   = [x for x in xs if x % 2 == 0]
list_nested   = [(x, y) for x in xs for y in ys]
list_filter_n = [x + y for x in xs for y in ys if x < y]
list_unpack   = [a + b for a, b in [(1, 2), (3, 4)]]

# --- Dict comprehensions ---
dict_basic    = {x: x * x for x in xs}
dict_filter   = {x: x * x for x in xs if x % 2 == 0}
dict_unpack   = {k: v for k, v in pairs}

# --- Set comprehensions ---
set_basic     = {x % 3 for x in xs}
set_filter    = {x for x in xs if x > 1}

# --- Generator expressions ---
# Materialized eagerly by Grail (no first-class generator type yet).
gen_total     = sum(x * x for x in xs)
gen_filtered  = sum(x for x in xs if x > 2)

# --- *args binding (codegen for FunctionDefAst) ---
def collect(*items):
    return [x for x in items]

collect_result = collect('a', 'b', 'c')
