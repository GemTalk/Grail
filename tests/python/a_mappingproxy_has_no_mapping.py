"""Fixture: a mappingproxy has no ``mapping'' attribute; a dict view does.

CPython's mappingproxy (Objects/descrobject.c) exposes its mapping's
read-only protocol and nothing more, while a dict VIEW's ``mapping'' is a
mappingproxy over the dict.  Grail's mappingproxy answered ``mapping'' too,
and listed it in dir() (test_types MappingProxyTests test_methods).

Every check here holds under CPython 3.14, which is what makes it evidence.
"""

import types

r = {}

proxy = types.MappingProxyType({'a': 1})

try:
    proxy.mapping
    r['reading_mapping_is_refused'] = 'no error'
except AttributeError as e:
    r['reading_mapping_is_refused'] = str(e)
r['hasattr_says_no'] = hasattr(proxy, 'mapping')
r['dir_lists_cpythons_names'] = sorted(set(dir(proxy)) - set(dir(object())))
r['two_proxies_still_compare'] = [proxy == types.MappingProxyType({'a': 1}), proxy == {'a': 1},
                                  proxy == types.MappingProxyType({'a': 2})]
r['a_dict_view_keeps_its_mapping'] = [type({'b': 2}.keys().mapping).__name__, {'b': 2}.items().mapping['b']]

EXPECTED = {
    'reading_mapping_is_refused': "'mappingproxy' object has no attribute 'mapping'",
    'hasattr_says_no': False,
    'dir_lists_cpythons_names': [
        '__class_getitem__', '__contains__', '__getitem__', '__ior__', '__iter__', '__len__',
        '__or__', '__reversed__', '__ror__', 'copy', 'get', 'items', 'keys', 'values'],
    'two_proxies_still_compare': [True, True, False],
    'a_dict_view_keeps_its_mapping': ['mappingproxy', 2],
}

DISAGREEMENTS = sorted(k for k in EXPECTED if r.get(k, '<missing>') != EXPECTED[k])
SUMMARY = '%d checks, %d disagreeing %r, keys match: %s' % (
    len(EXPECTED), len(DISAGREEMENTS), DISAGREEMENTS, sorted(r) == sorted(EXPECTED))


if __name__ == '__main__':
    for key in EXPECTED:
        actual = r.get(key, '<missing>')
        print('%-5s %-32s -> %r' % ('OK' if actual == EXPECTED[key] else 'FAIL', key, actual))
    print(SUMMARY)
