Class {
	#name : 'EnumMetaclassSignatureTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMetaclassSignatureTestCase >> functionalSignatureString [
	^ '(new_class_name, /, names, *, module=None, qualname=None, type=None, start=1, boundary=None)'

]

{ #category : 'Grail-Private' }
EnumMetaclassSignatureTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMetaclassSignatureTestCase >> setUp [
	"Reload tests/python/enum_metaclass_signature.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_metaclass_signature' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/enum_metaclass_signature.py')
		name: 'enum_metaclass_signature'.

]

{ #category : 'Grail-Tests - Member-bearing' }
EnumMetaclassSignatureTestCase >> testADataRootedEnumGetsItToo [
	"IntEnum class and StrEnum class are separate metaclass roots -- a
	data-rooted enum's chain never reaches Enum class -- so each needs the
	property.  This is the same triplication ___pyClassDefined___: has."

	self assert: (self resultAt: 'int_rooted') asString equals: '(*values)'.
	self assert: (self resultAt: 'str_rooted') asString equals: '(*values)'.
	self assert: (self resultAt: 'flag_rooted') asString equals: '(*values)'.

]

{ #category : 'Grail-Tests - Member-less' }
EnumMetaclassSignatureTestCase >> testAMemberLessEnumReportsTheFunctionalAPI [
	"Still open, so calling it is Enum('Color', 'RED GREEN') -- the assertion
	test_enum's test_inspect_signatures makes about Enum itself."

	self assert: (self resultAt: 'enum_base') asString
		equals: self functionalSignatureString.
	self assert: (self resultAt: 'flag_base') asString
		equals: self functionalSignatureString.
	self assert: (self resultAt: 'member_less_subclass') asString
		equals: self functionalSignatureString.

]

{ #category : 'Grail-Tests - Member-bearing' }
EnumMetaclassSignatureTestCase >> testAnEnumWithMembersReportsAValueLookup [
	"Final, so calling it is a lookup -- and VAR_POSITIONAL because a member's
	value may be a tuple supplied as several arguments."

	self assert: (self resultAt: 'member_bearing') asString equals: '(*values)'.
	self assert: (self resultAt: 'stdlib_boundary') asString equals: '(*values)'.

]

{ #category : 'Grail-Tests - Scoping' }
EnumMetaclassSignatureTestCase >> testANonEnumClassIsUnaffected [
	"The value-read is scoped to the enum metaclass property.  A plain class
	still answers from its __init__, and a class whose body defines
	``__signature__'' as an ordinary METHOD must hand back the method rather
	than call it -- which is what CPython's cls.__signature__ answers there."

	self assert: (self resultAt: 'plain_class') asString equals: '(a, b=2)'.
	self assert: (self resultAt: 'own_method_not_called') equals: true.

]

{ #category : 'Grail-Tests - It is a real Signature' }
EnumMetaclassSignatureTestCase >> testTheResultIsASignatureNotARenderedString [
	"The upstream test compares it against a Signature built by hand out of
	Parameters, so a string would not do."

	self assert: (self resultAt: 'is_signature') equals: true.
	self assert: ((self resultAt: 'param_names') @env1:__getitem__: 0) asString
		equals: 'values'.
	self assert: (self resultAt: 'param_kind') asString equals: 'VAR_POSITIONAL'.
	self assert: (self resultAt: 'equals_handmade') equals: true.

]
