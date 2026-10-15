Class {
	#name : 'JsonDecodeErrorTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
JsonDecodeErrorTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
JsonDecodeErrorTestCase >> setUp [
	"Reload tests/python/json_decode_error.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'json_decode_error' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/json_decode_error.py')
		name: 'json_decode_error'.
	probe := testModule @env1:probe.

]

{ #category : 'Grail-Tests - messages' }
JsonDecodeErrorTestCase >> testAllErrorsMatchCPython [
	"All 28 malformed documents at once: message, pos, lineno and colno must
	equal what CPython 3.14 answers.  On failure the diff names the offending
	input rather than reporting a bare false."

	(self at: 'matches_expected') ifFalse: [
		self assert: (self at: 'report') @env0:asString
			equals: 'see tests/python/json_decode_error.py CASES'].
	self assert: (self at: 'matches_expected')

]

{ #category : 'Grail-Tests - attributes' }
JsonDecodeErrorTestCase >> testAttributesAreValuesNotBoundMethods [
	"msg / doc / pos / lineno / colno are registered as Python VALUE
	attributes; without that a read wraps the accessor as a BoundMethod and
	``e.doc'' answers a callable instead of the document."

	self assert: (self at: 'doc') @env0:asString equals: '{"a": }'

]

{ #category : 'Grail-Tests - class' }
JsonDecodeErrorTestCase >> testClassIdentity [
	"CPython defines the class in the json.decoder SUBMODULE and re-exports
	it, so __module__ is 'json.decoder' even though most code names it
	json.JSONDecodeError -- and both spellings must be the SAME class or
	``except'' clauses silently stop matching."

	self assert: (self at: 'name') @env0:asString equals: 'JSONDecodeError'.
	self assert: (self at: 'module') @env0:asString equals: 'json.decoder'.
	self assert: (self at: 'decoder_is_same_class')

]

{ #category : 'Grail-Tests - class' }
JsonDecodeErrorTestCase >> testDoesNotCatchPlainValueErrors [
	"The point of the alias being wrong: ``except json.JSONDecodeError''
	used to swallow every unrelated ValueError."

	self deny: (self at: 'overcaught_plain_valueerror')

]

{ #category : 'Grail-Tests - class' }
JsonDecodeErrorTestCase >> testIsARealValueErrorSubclassNotValueError [
	"The alias made these two indistinguishable."

	self assert: (self at: 'is_not_valueerror').
	self assert: (self at: 'is_valueerror_subclass')

]

{ #category : 'Grail-Tests - class' }
JsonDecodeErrorTestCase >> testStillCaughtAsValueError [
	"...while remaining catchable as ValueError, which is how much existing
	code spells it."

	self assert: (self at: 'caught_as_valueerror') @env0:asString
		equals: 'JSONDecodeError'

]

{ #category : 'Grail-Tests - attributes' }
JsonDecodeErrorTestCase >> testStrAndArgsCarryThePosition [
	"``str(e)'' is ``{msg}: line {lineno} column {colno} (char {pos})'', and
	CPython passes THAT string to ValueError.__init__ -- so args[0] is the
	formatted text, not the bare msg."

	self assert: (self at: 'str') @env0:asString
		equals: 'Expecting value: line 1 column 7 (char 6)'.
	self assert: ((self at: 'args') @env1:__getitem__: 0) @env0:asString
		equals: 'Expecting value: line 1 column 7 (char 6)'

]

{ #category : 'Grail-Tests - messages' }
JsonDecodeErrorTestCase >> testValidJsonStillParses [
	"The error paths were rewritten around the parser, not through it."

	self assert: (self at: 'valid_json_still_parses')

]
