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


def loads_bytes_input():
    # json.loads accepts bytes or bytearray (UTF-8 decoded) per
    # CPython 3.6+.  itsdangerous _CompactJSON.loads passes
    # bytes payloads through unchanged.
    return json.loads(b'{"x": 1, "y": "hi"}')


def loads_bytearray_input():
    return json.loads(bytearray(b'[1, 2, 3]'))


def dumps_separators_compact():
    # itsdangerous _CompactJSON.dumps sets separators=(',', ':')
    # to strip whitespace.  Verifies the explicit (item, key)
    # separator tuple takes precedence over the default ', ' / ': '.
    return json.dumps({"a": 1, "b": 2}, sort_keys=True,
                      separators=(",", ":"))


def dumps_unicode_passthrough():
    # ensure_ascii=False emits the raw character instead of \\uXXXX.
    return json.dumps("é", ensure_ascii=False)


def dumps_float_inf():
    # CPython emits the literal token ``Infinity'' (not valid JSON
    # but matches the default behavior).  Round-trips via Grail's
    # _isNaN / printString-tagged form for Float infinities.
    return json.dumps(float('inf'))


def dumps_negative_zero():
    return json.dumps(-0.0)


def dumps_large_int():
    return json.dumps(10 ** 50)


def dump_to_stringio():
    # json.dump(obj, fp) writes JSON to fp.write(...) without
    # building the full string in user code.
    import io
    s = io.StringIO()
    json.dump({"x": 1}, s)
    return s.getvalue()


def load_from_stringio():
    # json.load(fp) reads the full content via fp.read() and parses.
    import io
    s = io.StringIO('{"x": 1, "y": [2, 3]}')
    return json.load(s)
