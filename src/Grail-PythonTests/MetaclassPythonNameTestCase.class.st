Class {
	#name : 'MetaclassPythonNameTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MetaclassPythonNameTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
MetaclassPythonNameTestCase >> setUp [
	"Reload tests/python/metaclass_python_name.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'metaclass_python_name' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/metaclass_python_name.py')
		name: 'metaclass_python_name'.

]

{ #category : 'Grail-Tests - Left alone' }
MetaclassPythonNameTestCase >> testAPythonMetaclassAndTypeItselfAreUnchanged [
	"A metaclass written in Python is an ordinary class object and always
	answered, as did ``type'' and every ordinary class.  Asserted so a
	regression says which half broke."

	self assert: (self resultAt: 'python_metaclass_name') asString equals: '''Meta'''.
	self assert: (self resultAt: 'type_name') asString equals: '''type'''.
	self assert: (self resultAt: 'class_name') asString equals: '''Color'''.

]

{ #category : 'Grail-Tests - The enum metaclass' }
MetaclassPythonNameTestCase >> testEveryEnumRootsMetaclassIsNamedEnumType [
	"All five roots, because Grail has three separate metaclasses and inherits
	the other two -- a version of this that checked only Enum would pass while
	IntEnum and StrEnum still answered an UnboundMethod."

	self assert: (self resultAt: 'enum_metaclass_names') asString
		equals: '[''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'']'.
	self assert: (self resultAt: 'enum_metaclass_qualnames') asString
		equals: '[''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'', ''EnumType'']'.

]

{ #category : 'Grail-Tests - The enum metaclass' }
MetaclassPythonNameTestCase >> testTheMetaclassReprsUnderItsPythonName [
	"repr() asks the class for __qualname__ and __module__.  The module half
	already worked, so this printed ``<class 'enum.Enum class'>'' -- a Smalltalk
	name inside a Python repr, which is the form the bug reached users in."

	self assert: (self resultAt: 'enum_metaclass_repr') asString
		equals: '"<class ''enum.EnumType''>"'.
	self assert: (self resultAt: 'enum_metaclass_module') asString equals: '''enum'''.

]

{ #category : 'Grail-Tests - The enum metaclass' }
MetaclassPythonNameTestCase >> testTheNameAnswersTheSameObjectTwice [
	"Interned like an ordinary class name.  inspect.classify_class_attrs homes
	an attribute no __dict__ carries by comparing getattr results with ``is'',
	so a fresh copy per read is not merely wasteful -- see
	InspectClassifyClassAttrsTestCase."

	self assert: (self resultAt: 'metaclass_name_is_stable') asString
		equals: '[True, True]'.

]

{ #category : 'Grail-Tests - The enum metaclass' }
MetaclassPythonNameTestCase >> testTheyAreAllTheSameMetaclassObject [
	"The identity model was already right, and is asserted here so a failure of
	the naming test cannot be mistaken for one: type() of any enum answers the
	one EnumType, as upstream."

	self assert: (self resultAt: 'enum_metaclass_is_enumtype') asString
		equals: '[True, True, True, True, True]'.

]
