import json


def dumps_simple():
    return json.dumps({"a": 1, "b": "two", "c": None, "d": True})


def dumps_list():
    return json.dumps([1, 2, 3, "x"])


def dumps_nested():
    return json.dumps({"items": [1, 2], "meta": {"ok": True}})


def dumps_sorted():
    return json.dumps({"b": 2, "a": 1, "c": 3}, sort_keys=True)


def dumps_indent():
    return json.dumps({"a": 1, "b": 2}, indent=2, sort_keys=True)


def dumps_unicode_escape():
    return json.dumps("é", ensure_ascii=True)


def dumps_unicode_passthrough():
    return json.dumps("é", ensure_ascii=False)


def loads_simple():
    return json.loads('{"a": 1, "b": "two", "c": null, "d": true}')


def loads_list():
    return json.loads("[1, 2.5, -3, \"x\"]")


def loads_nested():
    return json.loads('{"a": [1, 2, {"b": "c"}]}')


def loads_string_escapes():
    return json.loads(r'"hello\n\tworldé"')


def loads_negative_zero():
    return json.loads("0.5")


def roundtrip(value):
    return json.loads(json.dumps(value))


def loads_with_whitespace():
    return json.loads("  {  \"a\"  :  1  ,  \"b\"  :  [  2  , 3 ] }  ")


def reject_extra():
    try:
        json.loads('{"a":1} extra')
        return "no-error"
    except ValueError:
        return "caught"


def dumps_with_default():
    class Thing:
        def __init__(self, value):
            self.value = value
    def encoder(obj):
        return {"thing": obj.value}
    return json.dumps(Thing(42), default=encoder)
