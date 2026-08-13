# exec(source, globals, locals) and eval(expr, globals, locals).
#
# ``locals'' used to be ignored outright, with every binding the source
# produced reflected into ``globals''.  That is not an approximation of the
# 3-argument form, it is a silent no-op for it: after
#
#     l = {}
#     exec("def f(): ...", {}, l)
#
# l was still EMPTY, so nothing exec'd into a separate namespace could be read
# back -- defs, classes, assignments and imports alike.  test_call's
# test_function_with_many_args is one line of exactly that (it reads l['f']),
# and it was the only error left in that module once it could import at all.
#
# The 2-argument form is unaffected: CPython defaults locals to globals, so
# ``exec(src, g)'' reflects into g exactly as before.  That matters because
# the load-bearing in-tree caller -- jinja2's Template.from_code -- uses it.

r = {}


# --- what lands in locals -----------------------------------------------------
# Every kind of top-level binding, not just def: each one is a separate store
# path in the codegen and all of them were being dropped.

l = {}
exec("def f(a, b): return a + b", {}, l)
r['def_into_locals'] = sorted(l.keys())
r['def_is_callable'] = l['f'](2, 3)

l2 = {}
exec("x = 5", {}, l2)
r['assign_into_locals'] = sorted(l2.keys())

l3 = {}
exec("y = 1\nclass C: pass\nimport sys", {}, l3)
r['mixed_into_locals'] = sorted(l3.keys())


# --- globals must NOT be copied into locals -----------------------------------
# The reflect-back writes only what the source bound.  Copying the seeded
# globals across as well would "work" for the tests above while quietly making
# every exec'd namespace a merged one.

g = {'seed': 1, 'other': 2}
l4 = {}
exec("z = seed + other", g, l4)
r['locals_only_new'] = sorted(l4.keys())
# Dunders filtered: CPython injects __builtins__ into a globals mapping it is
# handed, Grail does not.  A separate difference, not this one.
r['globals_untouched'] = sorted(k for k in g.keys() if not k.startswith('__'))
r['read_through_globals'] = l4['z']


# --- locals shadows globals for lookups ---------------------------------------

g5 = {'v': 'from_globals'}
l5 = {'v': 'from_locals'}
exec("w = v", g5, l5)
r['locals_shadows_globals'] = l5['w']


# --- the 2-argument form still reflects into globals --------------------------

g6 = {}
exec("def g2(a): return a", g6)
r['two_arg_into_globals'] = sorted(k for k in g6.keys() if not k.startswith('__'))

# ...and so does the form that passes the same mapping twice, which is what
# CPython's default means.
g7 = {}
exec("h = 1", g7, g7)
r['same_mapping_twice'] = sorted(k for k in g7.keys() if not k.startswith('__'))


# --- eval takes locals on the same terms --------------------------------------

r['eval_reads_locals'] = eval("a + b", {'a': 1}, {'b': 2})

l8 = {}
r['eval_walrus_value'] = eval("(n := 7) + 1", {}, l8)
r['eval_walrus_binding'] = sorted(l8.keys())

# --- a ``global'' declaration overrides the locals routing --------------------
# Grail runs an exec'd body in ONE flat scope, so after it has run, deciding
# where a binding belongs is a question about the SOURCE.  A ``global''
# declaration is the whole answer, and the only thing that sends a binding to
# globals when everything else the body bound goes to locals.

ns = {}
exec("""a = 10
def spam():
    global a
    (a := 20)
spam()""", ns, {})
r['global_decl_to_globals'] = ns['a']
# ...and the def itself, which was NOT declared global, is not in globals.
r['global_decl_keeps_rest_local'] = sorted(
    k for k in ns.keys() if not k.startswith('__'))

# NOT covered here: a MODULE-LEVEL ``global gv'' in the exec'd source.  It
# routes correctly, but Grail cannot compile the doit at all -- the declaration
# has no enclosing module class to bind against and the emit dies with
# "undefined symbol gv".  That is a separate codegen gap, in front of this one
# rather than caused by it, so pinning it here would only pin the wrong error.

RESULTS = r
# Flat repr view, so the Smalltalk test compares one table of strings against
# CPython's own repr output instead of walking lists.
RESULTS_REPR = {k: repr(v) for k, v in r.items()}
