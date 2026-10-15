Class {
	#name : 'StrDecodeArgsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
StrDecodeArgsTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
StrDecodeArgsTestCase >> setUp [
	"Reload tests/python/str_decode_args.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'str_decode_args' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/str_decode_args.py')
		name: 'str_decode_args'.

]

{ #category : 'Grail-Tests - The constructor' }
StrDecodeArgsTestCase >> testABadEncodingOrErrorsArgumentIsATypeError [
	"Both were MessageNotUnderstood before -- an internal Smalltalk error
	escaping as the answer to ordinary Python."

	self assert: (self resultAt: 'bad_encoding') asString
		equals: 'str() argument ''encoding'' must be str'.
	self assert: (self resultAt: 'bad_errors') asString
		equals: 'str() argument ''errors'' must be str'.

]

{ #category : 'Grail-Tests - The constructor' }
StrDecodeArgsTestCase >> testABytesValueDecodesUnderItsEncoding [
	self assert: (self resultAt: 'decode_2') asString equals: '3'.
	self assert: (self resultAt: 'decode_3') asString equals: '4'.

]

{ #category : 'Grail-Tests - As an enum member value' }
StrDecodeArgsTestCase >> testAMemberValueMayBeBytesAndAnEncoding [
	"``three = b'3', 'ascii''' could not be constructed at all -- the str handle
	takes one argument -- and the best-effort guard turned that into a member
	whose value was the raw tuple."

	self assert: (self resultAt: 'member_values') asString equals: '1,3,4'.
	self assert: (self resultAt: 'member_repr') asString
		equals: '<GoodStrEnum.three: ''3''>'.

]

{ #category : 'Grail-Tests - The constructor' }
StrDecodeArgsTestCase >> testAStrFirstArgumentIsStillRefused [
	"str(str, encoding) is not a decode, and the existing complaint stands."

	self assert: (self resultAt: 'decoding_str') asString
		equals: 'decoding str is not supported'.

]

{ #category : 'Grail-Tests - Not every tuple is a decode' }
StrDecodeArgsTestCase >> testATupleForTheClassOwnNewIsNotHandedToStr [
	"""The line the fix is drawn on.  ``key_type = 'An$(Bn)', 0'' is the argument
	list to the class's own __new__, and routing it to str() answered ``decoding
	str is not supported'' -- displacing the complaint CPython actually makes,
	which is that the __new__ never set _value_.

	Keying the decode route on a BYTES first element is what separates the two;
	argument count alone does not."""

	self assert: (self resultAt: 'own_new_complaint') asString
		equals: '_value_ not set in __new__'.

]

{ #category : 'Grail-Tests - Not every tuple is a decode' }
StrDecodeArgsTestCase >> testAWorkingOwnNewStillReceivesItsArgumentsUntouched [
	self assert: (self resultAt: 'own_new_ok') asString
		equals: 'An$(Bn)/0/An$(Cn)/1'.

]

{ #category : 'Grail-Tests - As an enum member value' }
StrDecodeArgsTestCase >> testTheConstructorComplaintReachesTheClassStatement [
	"CPython raises out of the class body.  Grail swallowed it and kept the raw
	tuple, so a broken member definition looked like a working one."

	self assert: (self resultAt: 'member_bad_encoding') asString
		equals: 'str() argument ''encoding'' must be str'.
	self assert: (self resultAt: 'member_bad_errors') asString
		equals: 'str() argument ''errors'' must be str'.

]

{ #category : 'Grail-Tests - The constructor' }
StrDecodeArgsTestCase >> testTheEncodingIsCheckedFirst [
	"With both wrong, CPython names the encoding.  Ordering matters because the
	three-argument form delegates to the two-argument one, which would otherwise
	report whichever it reached first."

	self assert: (self resultAt: 'both_bad') asString
		equals: 'str() argument ''encoding'' must be str'.

]
