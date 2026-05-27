# Probe for Werkzeug Step 7 — werkzeug.routing.
#
# Routing is ~2600 LOC across __init__, converters, exceptions,
# map, matcher, rules.  Module-init runs cleanly after the
# upstream-source patches noted in source comments.  Runtime URL
# matching / building requires ast.parse to actually parse Python
# source — a separate task.


def import_succeeded():
    import werkzeug._internal
    import werkzeug.urls
    import werkzeug.exceptions
    import werkzeug.http
    import werkzeug.datastructures.mixins
    import werkzeug.datastructures.structures
    import werkzeug.datastructures
    import werkzeug.utils
    import werkzeug.routing
    return werkzeug.routing.Map is not None


def rule_constructs():
    """Rule(...) constructs cleanly.  Map() construction hits an
    ImmutableDict.__iter__ gap that's separate — the routing
    module-init bar is the import surface, not full runtime
    instantiation of the Map/Rule graph."""
    import werkzeug.routing as wr
    r = wr.Rule('/hello', endpoint='hello')
    return r.rule
