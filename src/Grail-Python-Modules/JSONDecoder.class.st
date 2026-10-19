"Python ``json.JSONDecoder'' -- the documented extension point for decoding
(#1591).  It did not exist, so ``class MyDecoder(json.JSONDecoder)'' failed,
and ``json.loads(s, cls=...)'' had no base class to be given.

The parse is the json module's own (json >> _loadsText:hooks:strict: and
_parseValue:).  The instance carries CPython's six keyword attributes in
dynamic instVars.  __init__ then reads them back through the Python attribute
path and keeps the result in scanHooks / scanStrict, which decode and
raw_decode use: CPython's scanner (scan_once) captures them the same way, so
reassigning ``d.parse_int'' after construction changes nothing there either.
A subclass that never calls JSONDecoder.__init__ has no scanner, and decoding
raises CPython's AttributeError for scan_once.

parse_float / parse_int default to the float and int TYPES, as in CPython
(``JSONDecoder().parse_float is float''); the parser treats those two as
""no hook"" so the default path converts natively.  parse_constant defaults to
json.decoder._CONSTANTS.__getitem__.

Not implemented: the scanner attributes CPython also sets (parse_object,
parse_array, parse_string, memo, scan_once).

"
Class {
	#name : 'JSONDecoder',
	#superclass : 'PythonInstance',
	#instVars : [
		'scanHooks',
		'scanStrict'
	],
	#category : 'Grail-Modules'
}
