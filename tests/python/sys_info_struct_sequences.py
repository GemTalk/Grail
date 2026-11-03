"""Fixture: sys.flags, float_info, int_info and hash_info are struct sequences.

Each is a struct sequence (Objects/structseq.c, Python/sysmodule.c): its type
derives from tuple directly, it indexes and unpacks as a tuple of its
sequence fields, reports n_fields, reprs as ``sys.name(field=value, ...)``,
and reads its fields by name.  sys.flags also has three named-only fields
past the tuple (gil, thread_inherit_context, context_aware_warnings), keeps
dev_mode and safe_path as bools, and refuses new instances; float_info,
int_info and hash_info can be constructed from a sequence.  And sys.abiflags,
which test_attributes reads with them, is a POSIX release build's empty tag.

Grail made each a native MODULE, so len() and indexing failed, its __mro__
showed Grail's module classes, and dev_mode was an int: test_sys's
test_attributes, test_sys_flags and test_sys_flags_no_instantiation.

Every check here holds under CPython 3.14, however it is started (flag
values change with -I, so only their types are checked).
"""

import sys

r = {}


def outcome(thunk):
    try:
        return thunk()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


infos = (sys.flags, sys.float_info, sys.int_info, sys.hash_info)
r['types_derive_from_tuple'] = [[c.__name__ for c in type(i).__mro__] for i in infos]
r['lengths'] = [len(i) for i in infos] + [type(sys.flags).n_fields, sys.flags.n_fields]
r['indexing'] = [sys.float_info[0] == sys.float_info.max, sys.float_info[-1] == sys.float_info.rounds,
                 tuple(sys.int_info) == (sys.int_info.bits_per_digit, sys.int_info.sizeof_digit,
                                         sys.int_info.default_max_str_digits,
                                         sys.int_info.str_digits_check_threshold),
                 sys.hash_info.width == sys.hash_info[0]]
r['flag_types'] = [type(getattr(sys.flags, n)).__name__ for n in ('debug', 'optimize', 'dev_mode', 'safe_path',
                                                                  'int_max_str_digits', 'gil')]
r['reprs'] = [repr(i).split('(')[0] for i in infos] + [repr(sys.float_info).split('(')[1].split('=')[0]]
r['flags_refuses_instances'] = [outcome(lambda: type(sys.flags)()),
                                outcome(lambda: type(sys.flags)(tuple(sys.flags)))]
r['the_others_construct'] = [type(sys.float_info)(range(11)).max, type(sys.int_info)((1, 2, 3, 4)).sizeof_digit,
                             outcome(lambda: type(sys.float_info)(range(3)))]
r['fields_are_read_only'] = outcome(lambda: setattr(sys.float_info, 'max', 1))
r['no_module_on_an_instance'] = outcome(lambda: sys.flags.__module__).startswith('AttributeError')
r['abiflags_of_a_release_build'] = sys.abiflags

EXPECTED = {
    'types_derive_from_tuple': [['flags', 'tuple', 'object'], ['float_info', 'tuple', 'object'],
                                ['int_info', 'tuple', 'object'], ['hash_info', 'tuple', 'object']],
    'lengths': [18, 11, 4, 9, 21, 21],
    'indexing': [True, True, True, True],
    'flag_types': ['int', 'int', 'bool', 'bool', 'int', 'int'],
    'reprs': ['sys.flags', 'sys.float_info', 'sys.int_info', 'sys.hash_info', 'max'],
    'flags_refuses_instances': ["TypeError: cannot create 'sys.flags' instances"] * 2,
    'the_others_construct': [0, 2, 'TypeError: sys.float_info() takes a 11-sequence (3-sequence given)'],
    'fields_are_read_only': 'AttributeError: readonly attribute',
    'no_module_on_an_instance': True,
    'abiflags_of_a_release_build': '',
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-25s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
