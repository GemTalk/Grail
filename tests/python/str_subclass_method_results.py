# Regression fixture: a str subclass's methods answer exact str.
#
# CPython's str methods build their results from the characters, never from
# type(self), so S('a').upper() is a str -- even a no-op such as S('a').strip().
# Grail's kernel string primitives keep the receiver's class, and answered S.
# The exceptions are CPython's too: partition/rpartition hand back the original
# object when the separator is missing, and format()/format_map()/% with no
# replacement fields answer self (Grail answers an equal str there).

class S(str):
    pass


s = S('  aBc,d e\tf  ')
u = S('abā ')

RESULTS = {}


def exact(name, value):
    RESULTS[name] = type(value) is str


for name, f in [
        ('upper', lambda: s.upper()), ('lower', lambda: s.lower()),
        ('casefold', lambda: s.casefold()), ('strip', lambda: s.strip()),
        ('lstrip', lambda: s.lstrip()), ('rstrip', lambda: s.rstrip()),
        ('strip_chars', lambda: s.strip(' a')), ('strip_noop', lambda: S('a').strip()),
        ('add', lambda: s + 'x'), ('add_empty', lambda: s + ''),
        ('replace', lambda: s.replace('a', 'b')), ('replace_noop', lambda: s.replace('q', 'r')),
        ('replace_count', lambda: s.replace(' ', '', 1)),
        ('split', lambda: s.split(',')[0]), ('split_ws', lambda: s.split()[0]),
        ('rsplit', lambda: s.rsplit(',', 1)[0]), ('splitlines', lambda: s.splitlines()[0]),
        ('partition_hit', lambda: s.partition(',')[0]), ('rpartition_hit', lambda: s.rpartition(',')[2]),
        ('center_noop', lambda: s.center(1)), ('ljust_noop', lambda: s.ljust(1)),
        ('rjust_noop', lambda: s.rjust(1)), ('zfill_noop', lambda: s.zfill(1)),
        ('expandtabs', lambda: s.expandtabs()), ('removeprefix', lambda: s.removeprefix(' ')),
        ('removesuffix_noop', lambda: s.removesuffix('q')), ('format_empty_spec', lambda: format(s, '')),
        ('fstring', lambda: f'{s}'), ('dunder_str', lambda: s.__str__()),
        ('wide_upper', lambda: u.upper()), ('wide_strip', lambda: u.strip()), ('wide_add', lambda: u + 'x')]:
    exact(name, f())

RESULTS['contents_kept'] = (s.upper() == '  ABC,D E\tF  ' and u.upper() == 'ABĀ '
                            and u.strip() == 'abā' and s.split() == ['aBc,d', 'e', 'f'])
RESULTS['partition_miss_is_self'] = s.partition('#')[0] is s and s.rpartition('#')[2] is s


class T(str):
    def upper(self):
        return 'T:' + super().upper()


RESULTS['override_and_super'] = T('a').upper() == 'T:A' and type(T('a').upper()) is str

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
