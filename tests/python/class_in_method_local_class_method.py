"""A class statement inside a method of a METHOD-LOCAL class.

Where this broke: test.datetimetester's test_strftime_with_bad_tzname_replace
builds ``class MyTzInfo(tzinfo)'' inside a test method, and MyTzInfo's own
``tzname'' defines ``class MyStr(str)''.  A method of a method-local class is
built ONCE and regenerated per class (the class is rebuilt on every call of
the enclosing method), and the inner class travels as a compiled-text helper
whose selector comes from its source offset -- so it is the same selector on
every regeneration.  Filing that helper once, against the stand-in a shared
build carries instead of a class, leaves every regenerated copy sending a
selector nothing implements.

THE BASE OF THE MIDDLE CLASS IS WHAT MATTERS, and it is the reason a first
version of this fixture was vacuous: with ``object'' or a plain module-level
class as the base the misfiled helper is still reachable, and only a BUILTIN
base puts the class somewhere the stand-in is not.  So each base gets a case.
"""

from datetime import tzinfo


class Plain:
    pass


class Host:
    """Each method builds a middle class per call, whose method defines a leaf."""

    def mid_object(self):
        class Mid:
            def leaf(self):
                class Leaf(str):
                    def replace(self, *args):
                        return None
                return Leaf('v')
        return Mid().leaf()

    def mid_plain(self):
        class Mid(Plain):
            def leaf(self):
                class Leaf(str):
                    def replace(self, *args):
                        return None
                return Leaf('v')
        return Mid().leaf()

    def mid_str(self):
        class Mid(str):
            def leaf(self):
                class Leaf(str):
                    def replace(self, *args):
                        return None
                return Leaf('v')
        return Mid('x').leaf()

    def mid_dict(self):
        class Mid(dict):
            def leaf(self):
                class Leaf(str):
                    def replace(self, *args):
                        return None
                return Leaf('v')
        return Mid().leaf()

    def mid_exception(self):
        class Mid(Exception):
            def leaf(self):
                class Leaf(str):
                    def replace(self, *args):
                        return None
                return Leaf('v')
        return Mid().leaf()

    def mid_tzinfo(self):
        """Upstream's own shape: a tzinfo subclass whose method defines a str subclass."""
        class Mid(tzinfo):
            def tzname(self, dt):
                class MyStr(str):
                    def replace(self, *args):
                        return None
                return MyStr('name')
        return Mid().tzname(None)

    def mid_str_leaf_class(self):
        class Mid(str):
            def leaf(self):
                class Leaf(str):
                    def replace(self, *args):
                        return None
                return Leaf
        return Mid('x').leaf()


class SubHost(Host):
    """The methods are INHERITED, as datetimetester runs its test from three subclasses."""


BASES = ['mid_object', 'mid_plain', 'mid_str', 'mid_dict', 'mid_exception', 'mid_tzinfo']


EXPECTED = {
    'mid_object': 'v',
    'mid_plain': 'v',
    'mid_str': 'v',
    'mid_dict': 'v',
    'mid_exception': 'v',
    'mid_tzinfo': 'name',
    'mid_object_is_str': True,
    'mid_plain_is_str': True,
    'mid_str_is_str': True,
    'mid_dict_is_str': True,
    'mid_exception_is_str': True,
    'mid_tzinfo_is_str': True,
    'mid_object_replace': None,
    'mid_plain_replace': None,
    'mid_str_replace': None,
    'mid_dict_replace': None,
    'mid_exception_replace': None,
    'mid_tzinfo_replace': None,
    'sub_mid_object': 'v',
    'sub_mid_plain': 'v',
    'sub_mid_str': 'v',
    'sub_mid_dict': 'v',
    'sub_mid_exception': 'v',
    'sub_mid_tzinfo': 'name',
    'fresh_leaf_per_call': True,
    'leaf_named_Leaf': True,
    'leaf_is_str_subclass': True,
}


def report():
    out = {}
    host = Host()
    for name in BASES:
        value = getattr(host, name)()
        out[name] = str(value)
        out[name + '_is_str'] = isinstance(value, str)
        out[name + '_replace'] = value.replace('a', 'b')

    # Inherited, so the enclosing method is built for a different class.
    sub = SubHost()
    for name in BASES:
        out['sub_' + name] = str(getattr(sub, name)())

    # A fresh leaf class per call: the middle class is rebuilt each time, so the
    # leaf must be too.  Identity, not contents -- two equal-looking classes is
    # exactly what a hoisted helper produces.
    a = host.mid_str_leaf_class()
    b = host.mid_str_leaf_class()
    out['fresh_leaf_per_call'] = a is not b
    out['leaf_named_Leaf'] = a.__name__ == b.__name__ == 'Leaf'
    out['leaf_is_str_subclass'] = issubclass(a, str) and issubclass(b, str)
    return out


# Computed at IMPORT too: the SUnit case loads this module with the seam forced
# on and compares ``r'' against ``EXPECTED'' key by key, while the fixture gate
# runs the file as a script and diffs the printed lines against CPython's.
r = report()


def main():
    for key in sorted(EXPECTED):
        got = r[key]
        want = EXPECTED[key]
        # The gate reads the status word from the first or second field; this is
        # the second of the two conventions its header names.
        print('%-28s %s %r' % (key, 'OK  ' if got == want else 'DIFF', got))


if __name__ == '__main__':
    main()
