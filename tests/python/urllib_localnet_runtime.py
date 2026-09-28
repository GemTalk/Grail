# Fixture for StdlibLongTailTestCase's urllib-localnet runtime tests.
#
# Vendoring CPython's urllib.request / urllib.parse / urllib.error (for
# test.test_urllib2_localnet) ran into runtime gaps that have nothing to do
# with urllib itself, so they are pinned here in isolation, one check each:
#
#   * an exception's __dict__ and vars() -- HTTPError reads through a
#     tempfile wrapper whose __getattr__ recursed without one;
#   * a class-body alias of a BASE class's function (``__super_init =
#     URLError.__init__'') called on an instance whose class overrides that
#     name -- it re-sent the selector and ran the override instead;
#   * a class attribute stored at module load on a builtin-type subclass
#     (urllib.parse's _fix_result_transcoding) -- invisible on instances;
#   * hashlib constructors' keyword forms (data=, usedforsecurity=);
#   * os.urandom;
#   * http.client.HTTPConnection._get_content_length;
#   * urllib.parse's six-field urlparse and its encode()/decode() pair.
#
# SELF-VERIFYING: run it under CPython and every check must print OK.
# scripts/check_python_fixtures.sh does exactly that.

import hashlib
import http.client
import os
from urllib.parse import urlparse, urlsplit


# ---------------------------------------------------- exception __dict__

def exception_dict_holds_set_attributes():
    e = ValueError('x')
    e.code = 404
    return e.__dict__ == {'code': 404}


def exception_vars_is_its_dict():
    e = KeyError('k')
    e.fp = None
    return vars(e) == {'fp': None} and vars(ValueError()) == {}


def exception_dict_is_live():
    e = OSError()
    e.__dict__['late'] = 1
    return e.late == 1


# ------------------------------------------ alias of a base-class function

class _Base(Exception):
    def __init__(self, reason):
        self.args = (reason,)
        self.reason = reason


class _Derived(_Base):
    # The urllib.error.HTTPError shape: keep the base __init__ under another
    # name, override __init__, and call the kept one from the override.
    __super_init = _Base.__init__

    def __init__(self, url, code):
        self.__super_init('reason:%s' % code)
        self.url = url
        self.code = code


def alias_of_base_init_runs_the_base():
    d = _Derived('http://h/', 404)
    return (d.reason, d.url, d.code) == ('reason:404', 'http://h/', 404)


# ------------------------ runtime class attribute on a builtin subclass

class _Tagged(tuple):
    pass


class _TaggedStr(str):
    pass


# Stored after the class statement, at module load -- as
# urllib.parse._fix_result_transcoding does for its result classes.
_Tagged.counterpart = 'set-at-load'
_TaggedStr.counterpart = _Tagged


def class_attr_set_at_load_seen_on_tuple_subclass_instance():
    return _Tagged((1, 2)).counterpart == 'set-at-load'


def class_attr_set_at_load_seen_on_str_subclass_instance():
    return _TaggedStr('s').counterpart is _Tagged


# ------------------------------------------------------------- hashlib

def hashlib_named_constructor_accepts_keywords():
    return (hashlib.md5(b'abc', usedforsecurity=True).hexdigest()
            == '900150983cd24fb0d6963f7d28e17f72'
            and hashlib.sha256(data=b'abc').hexdigest()
            == 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')


def hashlib_new_accepts_keywords():
    return (hashlib.new('sha1', data=b'abc', usedforsecurity=False).hexdigest()
            == 'a9993e364706816aba3e25717850c26c9cd0d89d')


# ----------------------------------------------------------- os.urandom

def urandom_answers_bytes_of_the_length_asked():
    a = os.urandom(16)
    return type(a) is bytes and len(a) == 16 and os.urandom(0) == b''


def urandom_rejects_a_negative_size():
    try:
        os.urandom(-1)
    except ValueError as e:
        return str(e) == 'negative argument not allowed'
    return False


def urandom_rejects_a_non_integer():
    try:
        os.urandom(1.5)
    except TypeError as e:
        return str(e) == "'float' object cannot be interpreted as an integer"
    return False


# ------------------------------------------------ http.client lengths

def content_length_by_body_and_method():
    f = http.client.HTTPConnection._get_content_length
    return (f(b'abcd', 'POST') == 4
            and f(None, 'GET') is None
            and f(None, 'POST') == 0
            and f(iter([b'a']), 'PUT') is None)


# ------------------------------------------------------ urllib.parse

def urlparse_has_six_fields():
    r = urlparse('http://u:p@h:8/a;x?q=1#f')
    return (len(r) == 6 and r.params == 'x' and r.port == 8
            and r.username == 'u' and r.fragment == 'f')


def urlsplit_encode_decode_round_trip():
    s = urlsplit('http://h/p?q#f')
    b = s.encode()
    return (b.netloc == b'h' and type(b).__name__ == 'SplitResultBytes'
            and b.decode() == s)


checks = [
    exception_dict_holds_set_attributes,
    exception_vars_is_its_dict,
    exception_dict_is_live,
    alias_of_base_init_runs_the_base,
    class_attr_set_at_load_seen_on_tuple_subclass_instance,
    class_attr_set_at_load_seen_on_str_subclass_instance,
    hashlib_named_constructor_accepts_keywords,
    hashlib_new_accepts_keywords,
    urandom_answers_bytes_of_the_length_asked,
    urandom_rejects_a_negative_size,
    urandom_rejects_a_non_integer,
    content_length_by_body_and_method,
    urlparse_has_six_fields,
    urlsplit_encode_decode_round_trip,
]


if __name__ == '__main__':
    for check in checks:
        print('%-6s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
