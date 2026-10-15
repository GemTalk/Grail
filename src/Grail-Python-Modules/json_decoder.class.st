"Python json.decoder module.

CPython defines JSONDecodeError here, and json/__init__.py re-exports it, so
``json.decoder.JSONDecodeError is json.JSONDecodeError' -- and the class's
own __module__ is 'json.decoder', not 'json'.  JSONDecoder likewise.
Both spellings appear in
real code, so both must resolve to the SAME class or ``except' clauses
silently stop matching.

See https://docs.python.org/3/library/json.html

"
Class {
	#name : 'json_decoder',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}
