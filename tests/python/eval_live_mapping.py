# The globals/locals arguments of exec()/eval() may be MAPPINGS, and CPython
# reads them as the code runs -- ``eval('a', g, m)'' calls ``m['a']''.
#
# Grail COPIED the caller's mappings into the SymbolDictionary the doit is
# compiled against.  For a plain dict a copy and a live read cannot be told
# apart, and for everything else they can:
#
#   * a class with a __getitem__ and no storage behind it -- there is nothing
#     to enumerate, so the copy was empty and every name raised NameError;
#   * a dict subclass overriding __getitem__ -- the copy read the storage
#     underneath and never called the override;
#   * a mapping whose keys() is not its contents -- dir() reported the copy;
#   * a mapping that REFUSES a write -- the copy was written back with an
#     env-0 store that its __setitem__ never saw.
#
# Such a mapping is now left UNSEEDED, which is what makes the read live: every
# name then misses the doit scope, and a miss is what reaches the resolver.
# locals() answers the mapping ITSELF (CPython's contract is identity, not
# contents), dir() asks it for keys(), and the write-back goes through
# __setitem__.
#
# The trigger is an exact-class test against dict, and getting it wrong is not
# subtle: naming KeyValueDictionary -- PyDict's SUPERCLASS, which nothing
# Python instantiates -- put every dict in the corpus on the live path, and
# since an unseeded scope holds nothing, globals() answered empty.
#
# test_builtin's test_general_eval and test_exec_globals_error_on_get.

r = {}


def outcome(fn):
    try:
        return 'ok -> %r' % (fn(),)
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


class M:
    """A mapping with no storage at all -- the case a copy cannot represent."""

    def __getitem__(self, key):
        if key == 'a':
            return 12
        raise KeyError

    def keys(self):
        return list('xyz')


class D(dict):
    """A dict subclass overriding both halves; the storage stays empty."""

    def __getitem__(self, key):
        if key == 'a':
            return 12
        return dict.__getitem__(self, key)

    def keys(self):
        return list('xyz')


class NotAMapping:
    pass


class setonlyerror(Exception):
    pass


class setonlydict(dict):
    def __getitem__(self, key):
        raise setonlyerror


class frozendict_error(Exception):
    pass


class frozendict(dict):
    def __setitem__(self, key, value):
        raise frozendict_error("frozendict is readonly")


_g = globals()
_m = M()
_d = D()

# --- a name is read THROUGH the mapping --------------------------------------

r['name_from_mapping'] = outcome(lambda: eval('a', _g, _m))
r['missing_name'] = outcome(lambda: eval('b', _g, _m))
r['name_from_dict_subclass'] = outcome(lambda: eval('a', _g, _d))
r['missing_in_dict_subclass'] = outcome(lambda: eval('b', _g, _d))

# --- locals() IS the mapping, not a view of it -------------------------------
#
# Identity, not contents: M defines no __eq__, so anything but the object
# itself fails however right its contents are.

r['locals_is_the_mapping'] = outcome(lambda: eval('locals()', _g, _m) is _m)
r['locals_is_the_subclass'] = outcome(lambda: eval('locals()', _g, _d) is _d)

# --- dir() asks the mapping for keys() ---------------------------------------
#
# keys() and __getitem__ need not agree, and here they deliberately do not:
# M knows only 'a' and reports xyz.

r['dir_uses_keys'] = outcome(lambda: eval('dir()', _g, _m))
r['dir_uses_keys_subclass'] = outcome(lambda: eval('dir()', _g, _d))

# --- globals() is unaffected by the locals mapping ---------------------------

r['globals_is_the_caller'] = outcome(lambda: eval('globals()', _g, _m) == _g)

# --- what is refused, and with which message ---------------------------------
#
# A mapping is allowed for LOCALS and not for globals.  The locals check asks
# the TYPE for __getitem__ -- not keys, which SpreadSheet below does not have
# at all.

r['mapping_as_globals'] = outcome(lambda: eval('a', _m))
r['non_mapping_locals'] = outcome(lambda: eval('a', _g, NotAMapping()))

# --- reads and writes reach the mapping's own methods ------------------------

r['globals_getitem_raises'] = outcome(
    lambda: exec('globalname', setonlydict({'globalname': 1})))
r['write_through_setitem'] = outcome(lambda: exec('x = 1', frozendict({})))

# --- a mapping with no keys() is still a usable locals ------------------------
#
# The row that makes __getitem__ the right check: this class has __getitem__
# and __setitem__ and no keys, and CPython evaluates against it happily.  The
# lookups nest, three deep.


class SpreadSheet:
    _cells = {}

    def __setitem__(self, key, formula):
        self._cells[key] = formula

    def __getitem__(self, key):
        return eval(self._cells[key], globals(), self)


def _spreadsheet():
    ss = SpreadSheet()
    ss['a1'] = '5'
    ss['a2'] = 'a1*6'
    ss['a3'] = 'a2*7'
    return ss['a3']


r['nested_lookups'] = outcome(_spreadsheet)

# --- controls: a plain dict takes the path it always took ---------------------
#
# The live path must be reached ONLY by a mapping that needs it.  These are the
# shapes the whole corpus uses.

r['plain_globals'] = outcome(lambda: eval('a', {'a': 5}))
r['plain_locals'] = outcome(lambda: eval('a', {}, {'a': 7}))
r['plain_globals_call'] = outcome(lambda: eval("globals()['a']", {'a': 9}))
r['plain_write_back'] = outcome(
    lambda: (lambda d: (exec('z = 3', {}, d), d.get('z'))[1])({}))
r['no_arguments'] = outcome(lambda: eval('1 + 1'))
r['module_globals'] = outcome(lambda: eval('sorted(_g) == sorted(globals())', _g))


EXPECTED = {
    'dir_uses_keys': "ok -> ['x', 'y', 'z']",
    'dir_uses_keys_subclass': "ok -> ['x', 'y', 'z']",
    'globals_getitem_raises': 'setonlyerror: ',
    'globals_is_the_caller': 'ok -> True',
    'locals_is_the_mapping': 'ok -> True',
    'locals_is_the_subclass': 'ok -> True',
    'mapping_as_globals': 'TypeError: globals must be a real dict; try eval(expr, {}, mapping)',
    'missing_in_dict_subclass': "NameError: name 'b' is not defined",
    'missing_name': "NameError: name 'b' is not defined",
    'module_globals': 'ok -> True',
    'name_from_dict_subclass': 'ok -> 12',
    'name_from_mapping': 'ok -> 12',
    'nested_lookups': 'ok -> 210',
    'no_arguments': 'ok -> 2',
    'non_mapping_locals': 'TypeError: locals must be a mapping',
    'plain_globals': 'ok -> 5',
    'plain_globals_call': 'ok -> 9',
    'plain_locals': 'ok -> 7',
    'plain_write_back': 'ok -> 3',
    'write_through_setitem': 'frozendict_error: frozendict is readonly',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, "<missing>") != EXPECTED[k])
SUMMARY = "%d checks, %d disagreeing %r, keys match: %s" % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for k in sorted(EXPECTED):
        actual = r[k]
        print('%-26s %s %r' % (k, 'OK ' if actual == EXPECTED[k] else 'DIFF', actual))
