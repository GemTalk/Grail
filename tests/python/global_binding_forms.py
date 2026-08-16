# ``global NAME'' must be honoured by EVERY binding form, not just assignment.
#
# Grail implemented the global-aware store in exactly one place -- the plain
# assignment path -- so `global x; x = 1` worked and every other way of binding
# a name did not:
#
#   * class / def / walrus / match capture emitted a bare Smalltalk `x := ...`.
#     A global-declared name has NO Smalltalk temp (the parser correctly does
#     not declare one), so that named an UNDEFINED SYMBOL and the ENTIRE
#     enclosing method failed to compile.  It surfaced as "Grail could not
#     compile this method (codegen gap)" -- a message pointing nowhere near
#     `global`.
#
#   * import / augmented assign / annotated assign / unpacking DID take the
#     module route, but hardcoded `self` as the receiver.  Inside a class
#     METHOD `self` is the Python instance, not the module, so the value was
#     hung off the instance and `globals()` never saw it.  That one is the
#     quieter half: no error, the name simply is not there.
#
# Both halves are exercised at module level AND inside a method, because the
# receiver bug is invisible at module level (where `self` IS the module).

r = {}


class Holder:
    """Every binding form, run from inside a method."""

    def m_class(self):
        global mg_class
        class mg_class: pass
        return globals().get('mg_class') is not None

    def m_def(self):
        global mg_def
        def mg_def(): return 42
        return globals().get('mg_def') is not None

    def m_walrus(self):
        global mg_walrus
        (mg_walrus := 7)
        return globals().get('mg_walrus')

    def m_match(self):
        global mg_match
        match [1, 2]:
            case [_, mg_match]: pass
        return globals().get('mg_match')

    def m_match_star(self):
        global mg_star
        match [1, 2, 3]:
            case [_, *mg_star]: pass
        return globals().get('mg_star')

    def m_match_as(self):
        global mg_as
        match 5:
            case int() as mg_as: pass
        return globals().get('mg_as')

    def m_import(self):
        global mg_import
        import contextlib as mg_import
        return globals().get('mg_import') is not None

    def m_unpack(self):
        global mg_unpack
        _, mg_unpack = [None, 'v']
        return globals().get('mg_unpack')

    def m_augassign(self):
        global mg_aug
        mg_aug = 1
        mg_aug += 41
        return globals().get('mg_aug')

    def m_plain(self):
        global mg_plain
        mg_plain = 'ok'
        return globals().get('mg_plain')


_h = Holder()
for _label, _fn in [
    ('class', _h.m_class), ('def', _h.m_def), ('walrus', _h.m_walrus),
    ('match', _h.m_match), ('match_star', _h.m_match_star),
    ('match_as', _h.m_match_as), ('import', _h.m_import),
    ('unpack', _h.m_unpack), ('augassign', _h.m_augassign),
    ('plain', _h.m_plain),
]:
    try:
        r['method_' + _label] = repr(_fn())
    except BaseException as e:
        r['method_' + _label] = type(e).__name__ + ': ' + str(e)[:60]


# The same forms from a plain function, where the receiver is genuinely the
# module -- these must keep working.
def f_class():
    global fg_class
    class fg_class: pass
    return globals().get('fg_class') is not None


def f_def():
    global fg_def
    def fg_def(): pass
    return globals().get('fg_def') is not None


def f_walrus():
    global fg_walrus
    (fg_walrus := 3)
    return globals().get('fg_walrus')


def f_match():
    global fg_match
    match {'k': 9}:
        case {'k': fg_match}: pass
    return globals().get('fg_match')


for _label, _fn in [('class', f_class), ('def', f_def),
                    ('walrus', f_walrus), ('match', f_match)]:
    try:
        r['func_' + _label] = repr(_fn())
    except BaseException as e:
        r['func_' + _label] = type(e).__name__ + ': ' + str(e)[:60]


# A global-declared binding must REBIND the module's name, and a nested class
# body counts as the declaring scope.
shadowed = 'module'


def f_rebinds():
    global shadowed
    shadowed = 'rebound'


f_rebinds()
r['rebinds_module_name'] = repr(shadowed)


# Without ``global'', the same forms stay LOCAL -- the fix must not widen them.
def f_local_class():
    class local_only: pass
    return 'local_only' in globals()


r['no_global_stays_local'] = repr(f_local_class())


EXPECTED = {
    'func_class': 'True',
    'func_def': 'True',
    'func_match': '9',
    'func_walrus': '3',
    'method_augassign': '42',
    'method_class': 'True',
    'method_def': 'True',
    'method_import': 'True',
    'method_match': '2',
    'method_match_as': '5',
    'method_match_star': '[2, 3]',
    'method_plain': "'ok'",
    'method_unpack': "'v'",
    'method_walrus': '7',
    'no_global_stays_local': 'False',
    'rebinds_module_name': "'rebound'",
}


if __name__ == '__main__':
    import sys
    if '--emit' in sys.argv:
        print('EXPECTED = {')
        for k in sorted(r):
            print('    %r: %r,' % (k, r[k]))
        print('}')
    else:
        bad = 0
        for k in sorted(EXPECTED):
            ok = r[k] == EXPECTED[k]
            bad += 0 if ok else 1
            print('%-24s %s %s' % (k, 'OK ' if ok else 'DIFF', r[k]))
        print('%d difference(s)' % bad)
