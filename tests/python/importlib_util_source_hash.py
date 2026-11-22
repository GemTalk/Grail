"""importlib.util.source_hash answers the bytes CPython's does.

Driven by PythonTests>>StdlibLongTailTestCase>>testImportlibUtilSourceHashMatchesCPython.
Each check answers True when the behaviour matches CPython.

Grail's importlib.util had no source_hash (issue #2299).  pytest 9.2's
assertion rewriting calls it, so with pytest 9.2 Grail could not load
pytest's plugins and ran no tests at all.

Every expected hash was produced by CPython 3.14.  Run this file under
CPython (``python3 tests/python/importlib_util_source_hash.py'') to see that
it agrees.
"""

import importlib.util


# bytes(range(n)) for n = 0..17: an empty source, a partial final block of
# every length, and the block boundaries at 8 and 16.
BLOCK_LENGTHS = {
    0: '61f5b7cb653a6aa4', 1: 'd293aa9f02c45230', 2: '41318c8084bdd73d',
    3: '4eeadb70387c80aa', 4: '76994f9301e06b19', 5: '081839e7718e4399',
    6: 'be935e5b0cd57677', 7: 'e73e9fe23ecd6141', 8: '25278d9820cf1197',
    9: '3b86fa61bd8056d5', 10: 'f4d58955aee47f60', 11: '8908b27e5765e311',
    12: '6f0bb39f9e023e05', 13: 'a5a6834897b09802', 14: '5482ec5b39a4db0b',
    15: '39ac4d5c67e72578', 16: 'd9ab3a39da95ade2', 17: '04e046b715d19741',
}


def the_issues_example_matches():
    return importlib.util.source_hash(b'x = 1') == b'\x0b\xe5-$\xfe\xd3\xbc?'


def every_final_block_length_matches():
    return all(importlib.util.source_hash(bytes(range(n))).hex() == want
               for n, want in BLOCK_LENGTHS.items())


def a_longer_source_matches():
    source = b'def f():\n    return 42\n' * 100
    return importlib.util.source_hash(source).hex() == 'ae6323c6a2070f73'


def it_answers_eight_bytes():
    h = importlib.util.source_hash(b'pass\n')
    return type(h) is bytes and len(h) == 8


def any_bytes_like_object_is_accepted():
    want = importlib.util.source_hash(b'x = 1')
    return (importlib.util.source_hash(bytearray(b'x = 1')) == want
            and importlib.util.source_hash(memoryview(b'x = 1')) == want)


def a_str_raises_type_error():
    try:
        importlib.util.source_hash('x = 1')
    except TypeError as e:
        return str(e) == "a bytes-like object is required, not 'str'"
    return False


def it_can_be_imported_by_name():
    from importlib.util import source_hash
    return callable(source_hash)


CHECKS = (
    the_issues_example_matches,
    every_final_block_length_matches,
    a_longer_source_matches,
    it_answers_eight_bytes,
    any_bytes_like_object_is_accepted,
    a_str_raises_type_error,
    it_can_be_imported_by_name,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
