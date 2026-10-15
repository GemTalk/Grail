"Python json module - JSON encoding and decoding.

Smalltalk-backed: dumps walks Python values recursively, emitting
JSON text; loads runs a recursive-descent parser over the input.
Surface targeted at Flask / Werkzeug / itsdangerous:

  dumps(obj, *, indent=None, separators=None, sort_keys=False,
        ensure_ascii=True, default=None)
  loads(s)

JSONEncoder is an empty class (dumps does not route through encoder
instances); use the `default` callback on dumps() to customize a single
type.  JSONDecoder is real (JSONDecoder.gs): decode / raw_decode over this
module's parser, honouring its keyword hooks.

Supported value types:
  None         -> null
  True / False -> true / false
  int / float  -> JSON number (nan / inf become null per CPython
                  when allow_nan=False; here we emit ""NaN"" / ""Infinity""
                  as CPython does by default)
  str          -> ""..."" with \\ / \"" / \b / \f / \n / \r / \t and
                  \uXXXX escapes for non-ASCII when ensure_ascii=True
  list / tuple -> [...]
  dict         -> {""key"": value, ...}  (keys must be strings)

"
Class {
	#name : 'json',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
