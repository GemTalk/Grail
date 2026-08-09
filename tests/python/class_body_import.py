"""Fixture for ClassBodyImportTestCase.

``import x`` inside a CLASS BODY binds x in the class namespace, so it
becomes a class attribute -- and, crucially, later statements in the same
body can use it.  Grail dropped the statement entirely: ClassDefAst's
class-attribute scan recognised only assignments, so the name never bound
and a later reference raised NameError.

It went unnoticed because a bare stdlib module name resolved as a global
anyway, so the class body appeared to work while the import did nothing.
The upstream idiom that exposed it is werkzeug's EnvironBuilder:

    class EnvironBuilder:
        import json
        json_dumps = staticmethod(json.dumps)
        del json
"""


class PlainImport:
    import json


class UsedLaterInBody:
    import json
    encoded = json.dumps({"k": 2})


class DottedAlias:
    import os.path as p
    joined = p.join("a", "b")


class DottedNoAlias:
    # ``import a.b`` binds the TOP-level package, not the leaf.
    import os.path
    sep_via_top = os.path.sep


class WerkzeugIdiom:
    # Verbatim shape of werkzeug.test.EnvironBuilder.
    import json

    json_dumps = staticmethod(json.dumps)
    del json


class MultipleOnOneLine:
    import json, math
    both = (json.dumps([1]), math.floor(2.7))


def probe():
    return {
        "plain_is_module": PlainImport.json.dumps([1]) == "[1]",
        "used_later": UsedLaterInBody.encoded,
        "dotted_alias": DottedAlias.joined,
        "dotted_no_alias": DottedNoAlias.sep_via_top,
        "werkzeug_dumps": WerkzeugIdiom.json_dumps({"a": 1}),
        "multiple_json": MultipleOnOneLine.both[0],
        "multiple_math": MultipleOnOneLine.both[1],
        # ``import json`` must not leak into instances, only the class.
        "on_class": hasattr(PlainImport, "json"),
    }
