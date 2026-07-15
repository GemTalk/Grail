# Fixture for GlobalsTestCase — globals() as a LIVE, coherent dict view
# (PyModuleDict; docs/LEGB.md).  Exercises every operation the old
# raw-module-instance globals() got wrong: reads/writes hit the dynamic
# instVar store where codegen keeps user globals (not the empty inherited
# SymbolDictionary slot), and the dict protocol (keys/values/items/iter)
# resolves as methods on the view instead of executing inherited kernel
# selectors.

zz_g = 1
aa_g = 2
mm_g = 3


def top_fn():
    return 'from-top-fn'


g = globals()

# -- reads hit real globals -------------------------------------------------
GETITEM = g['zz_g']                        # 1  (raised KeyError before)
CONTAINS = 'aa_g' in g                     # True (was False)
GET = g.get('mm_g')                        # 3
GET_DEFAULT = g.get('nope', 'dflt')        # 'dflt'
KEYS_HAS = 'zz_g' in list(g.keys())        # True (keys() raised TypeError)
VALUES_HAS = 2 in list(g.values())         # True
ITEMS_HAS = ('mm_g', 3) in list(g.items()) # True
ITER_HAS = 'aa_g' in [k for k in g]        # True (was False)
ORDERED = [k for k in g.keys() if k.endswith('_g')]  # insertion order
LEN_OK = len(g) > 4
IS_DICT = isinstance(g, dict)

# top-level defs are globals (visible before any bare read wraps them)
FN_CONTAINS = 'top_fn' in g
FN_CALL = g['top_fn']()                    # 'from-top-fn'

# -- LIVE view: writes are real globals ------------------------------------
g['injected'] = 42
INJECTED_READ = injected                   # noqa: F821 — bare-name read finds it

made_global = 'not-yet'
g['made_global'] = 'via-view'
WRITE_VISIBLE = made_global                # 'via-view'

MISSING_RAISES = False
try:
    g['no_such_global']
except KeyError:
    MISSING_RAISES = True

POP = g.pop('injected')                    # 42
POP_GONE = 'injected' not in g
POP_DEFAULT = g.pop('injected', 'gone')    # 'gone'

# setdefault: present key returns existing; absent key binds
SETDEF_EXISTING = g.setdefault('zz_g', 99)   # 1
g.setdefault('setdef_new', 'fresh')
SETDEF_NEW = setdef_new                      # noqa: F821

# update() creates real globals readable by bare name (re._constants idiom)
g.update({'upd_a': 10, 'upd_b': 20})
UPDATE_VISIBLE = upd_a + upd_b             # noqa: F821 — 30

# module-scope locals()/vars() are the same live namespace — and the SAME
# OBJECT (CPython: globals() is globals(); locals() is globals() at module
# scope; the view is memoised per module per session)
LOCALS_SEES = 'zz_g' in locals()
VARS_SEES = 'aa_g' in vars()
G_IS_G = globals() is globals()
L_IS_G = locals() is globals()

# exec with an explicit globals() argument round-trips
exec('exec_made = zz_g + 100', g)
EXEC_VISIBLE = exec_made                   # noqa: F821 — 101
