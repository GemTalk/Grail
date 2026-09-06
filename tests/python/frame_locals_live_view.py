"""Fixture: ``frame.f_locals'' is a LIVE VIEW, and exec'd code has a frame.

Two things this pins, which turned out to be one bug each side of the same
reading of ``sys._getframe()''.

1. EXEC'D CODE HAS A FRAME OF ITS OWN.  exec(), eval() and the REPL compile
   their source with GemStone's ``_compileInContext:'', which answers a method
   with NO SELECTOR -- so Grail's live-stack walk classified the body of every
   exec as a block, held it as pending contents for a home method that never
   arrived, and dropped it.  ``sys._getframe()'' inside exec'd code therefore
   answered the CALLER's frame, with the caller's co_name over the caller's
   variables.  Nothing downstream could tell that apart from the truth.

2. f_locals IS A VIEW, NOT A COPY.  CPython's is a FrameLocalsProxy (PEP 667)
   and the difference shows wherever a name's lifetime ends inside the frame.
   PEP 709 inlines a comprehension into the enclosing scope, so its iteration
   variable is in the frame while the loop runs and gone afterwards:

       'a' in [sys._getframe().f_locals for a in [0]][0]   -> False
       [sys._getframe().f_locals['a'] for a in [0]][0]     -> 0

   Both readings are of the same object.  The membership test runs after the
   comprehension finished; the subscript runs inside it.  A snapshot taken when
   sys._getframe() ran answers True to both and cannot do otherwise.  That pair
   is test_listcomps' test_frame_locals.

Note what ``module_plain'' pins alongside them: a module-level frame has no
fast locals, so CPython's f_locals there IS the namespace -- and inside an
inlined comprehension the same frame reports only the comprehension's target.
Grail lands on both by the same split: temps if there are any, the namespace if
there are not.
"""

import sys

r = {}


def _keys(f):
    try:
        return sorted(f.f_locals)
    except AttributeError:
        return 'NO f_locals'


# --- 1. the frame chain seen from inside exec ------------------------------
def chain_from_exec():
    def names(f):
        out = []
        while f is not None:
            out.append(f.f_code.co_name)
            f = f.f_back
        return out
    ns = {'sys': sys, 'names': names}
    exec("got = names(sys._getframe())\n", ns)
    return ns['got']

r['chain_from_exec'] = chain_from_exec()


# --- 2. the live view, in each scope ---------------------------------------
def in_scope(scope, body):
    src = {
        'module': body,
        'function': 'def _f():\n' + ''.join('    ' + l + '\n'
                                            for l in body.splitlines())
                    + '    return val\nval = _f()\n',
    }[scope]
    ns = {'sys': sys}
    exec(src, ns)
    return ns['val']


AFTER = 'val = "a" in [sys._getframe().f_locals for a in [0]][0]'
INSIDE = 'val = [sys._getframe().f_locals["a"] for a in [0]][0]'

r['after_module'] = in_scope('module', AFTER)
r['after_function'] = in_scope('function', AFTER)
r['inside_module'] = in_scope('module', INSIDE)
r['inside_function'] = in_scope('function', INSIDE)


# --- 3. every read of the view agrees --------------------------------------
def every_read():
    # A TUPLE and not a dict display: Grail compiles ``{...}'' to a block whose
    # ARGUMENT is named ``___d'', and the frame walk merges a one-argument
    # block's temps into its home method -- so building the result here would
    # put ``___d'' in the very locals being reported.  A pre-existing leak
    # (the internal-name filter drops ``___name___'', not a bare leading
    # ``___''), unrelated to the view, and not worth letting this fixture
    # depend on either way.
    q = 1
    d = [sys._getframe().f_locals for a in [0]][0]
    return (sorted(d), 'a' in d, 'q' in d, sorted(d.keys()), len(d),
            d.get('a', 'MISSING'), sorted(k for k, v in d.items()))

r['every_read'] = every_read()


# --- 4. the view is live even within one expression ------------------------
def only_statement():
    # No other local is bound at this point, so the frame has nothing but the
    # comprehension's target while the loop runs -- the case that distinguishes
    # "frame not found, keep what you had" from "frame found, it has nothing".
    return "a" in [sys._getframe().f_locals for a in [0]][0]

r['only_statement'] = only_statement()


# --- 5. a module frame with no temps reports its namespace -----------------
def module_plain():
    ns = {'sys': sys}
    exec("import sys\n[i for i in range(2)]\ni = 20\n"
         "kind = type(sys._getframe().f_locals).__name__\n"
         "here = sorted(k for k in sys._getframe().f_locals if k != '__builtins__')\n",
         ns)
    return ns['kind'], ns['here']

r['module_plain'] = module_plain()


# --- 6. and the view names itself the way CPython does ---------------------
def proxy_type_name():
    def f():
        z = 1
        return type(sys._getframe().f_locals).__name__
    return f()

r['proxy_type_name'] = proxy_type_name()


EXPECTED = {
    'chain_from_exec': ['<module>', 'chain_from_exec', '<module>'],
    'after_module': False,
    'after_function': False,
    'inside_module': 0,
    'inside_function': 0,
    # (iter, 'a' in d, 'q' in d, keys, len, get('a'), items)
    'every_read': (['d', 'q'], False, True, ['d', 'q'], 2, 'MISSING', ['d', 'q']),
    'only_statement': False,
    'module_plain': ('dict', ['i', 'kind', 'sys']),
    'proxy_type_name': 'FrameLocalsProxy',
}


if __name__ == '__main__':
    for key, expected in EXPECTED.items():
        actual = r[key]
        print('%-4s %s -> %r' % ('OK' if actual == expected else 'FAIL',
                                 key, actual))
    for extra in sorted(set(r) - set(EXPECTED)):
        print('%-4s %s is not in EXPECTED' % ('FAIL', extra))
