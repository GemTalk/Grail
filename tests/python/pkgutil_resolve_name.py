"""pkgutil.resolve_name resolves a name to an object, as CPython's does.

Driven by PythonTests>>StdlibLongTailTestCase>>testPkgutilResolveNameResolvesANameToAnObject.
Each check answers True when the behaviour matches CPython.

Grail's pkgutil had no resolve_name (issue #2297), so jsonschema.cli, which
imports it, failed to import.

Run this file under CPython (``python3 tests/python/pkgutil_resolve_name.py'')
to see what it produces -- that is where the expectations come from.
"""

import collections
import json
import json.decoder
import os.path
import pkgutil
import xml.dom


def _raises(exc, name):
    try:
        pkgutil.resolve_name(name)
    except exc:
        return True
    except Exception:
        return False
    return False


def the_colon_form_imports_once_and_walks_the_rest():
    return (pkgutil.resolve_name('os.path:join') is os.path.join
            and pkgutil.resolve_name('collections:OrderedDict.fromkeys')
                == collections.OrderedDict.fromkeys)


def a_trailing_colon_answers_the_module():
    return pkgutil.resolve_name('json:') is json


def the_dotted_form_finds_the_package_boundary():
    return (pkgutil.resolve_name('json.decoder.JSONDecoder') is json.decoder.JSONDecoder
            and pkgutil.resolve_name('xml.dom') is xml.dom
            and pkgutil.resolve_name('json.decoder.JSONDecoder.decode')
                is json.decoder.JSONDecoder.decode)


def a_malformed_name_raises_value_error():
    return all(_raises(ValueError, n)
               for n in ('', 'a b', '1abc', 'os.path::join', 'os..path', 'os.path:1x', '.os'))


def a_missing_module_raises_import_error():
    return (_raises(ImportError, 'zz_no_such_module_2297:x')
            and _raises(ImportError, 'zz_no_such_module_2297.x'))


def a_missing_attribute_raises_attribute_error():
    return (_raises(AttributeError, 'os.path:zz_no_such_name')
            and _raises(AttributeError, 'json.zz_no_such_name'))


def it_can_be_imported_by_name():
    from pkgutil import resolve_name
    return resolve_name is pkgutil.resolve_name


CHECKS = (
    the_colon_form_imports_once_and_walks_the_rest,
    a_trailing_colon_answers_the_module,
    the_dotted_form_finds_the_package_boundary,
    a_malformed_name_raises_value_error,
    a_missing_module_raises_import_error,
    a_missing_attribute_raises_attribute_error,
    it_can_be_imported_by_name,
)


if __name__ == '__main__':
    for check in CHECKS:
        print('%-4s %s' % ('OK' if check() is True else 'FAIL', check.__name__))
