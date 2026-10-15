Class {
	#name : 'EnumConvertExportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumConvertExportTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
EnumConvertExportTestCase >> reprAt: aKey [
	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
EnumConvertExportTestCase >> setUp [
	probe := self ___loadProbe___: 'enum_convert_export'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testConvertedMembersStillBehaveAsInts [
	"IntEnum members ARE ints, so replacing the constants cannot break code
	that was doing arithmetic on them -- which is the only reason it is safe
	to rewrite a module's globals underneath it."

	self assert: (self reprAt: 'members_still_compare_as_ints')
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testFilterIsAcceptedPositionally [
	"socket.py's calling convention, and every other real caller's.  Reading
	filter from kwargs alone left it nil, and a nil filter admits EVERYTHING:
	the enum would have contained the whole module namespace rather than the
	three names asked for."

	self assert: (self reprAt: 'filter_is_positional')
		equals: '[''CV_BLUE'', ''CV_GREEN'', ''CV_RED'']'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testFilterIsStillAcceptedAsAKeyword [
	"The keyword spelling was the one Grail already supported; accepting the
	positional form must not drop it."

	self assert: (self reprAt: 'keyword_filter_still_works') equals: '[''KW_A'', ''KW_B'']'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testGlobalsThatFailTheFilterAreLeftAlone [
	"The other half of the arity bug, stated positively: a module global that
	does not match must still be a plain int afterwards.  This is the check
	that fails loudly if the filter is ever ignored again."

	self assert: (self reprAt: 'unmatched_globals_stay_out') equals: '[''99'', True]'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testLookupByValueAndByName [
	self assert: (self reprAt: 'lookup_by_value_and_name') equals: '[''CV_RED'', 2]'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testMembersMapIsComplete [
	self assert: (self reprAt: 'members_map_is_complete')
		equals: '[''CV_BLUE'', ''CV_GREEN'', ''CV_RED'']'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testTheBuiltEnumHasTheReceiversType [
	"_convert_ is called on IntEnum, IntFlag, StrEnum, ...  The built class
	must be of the RECEIVER's type -- socket.py uses IntEnum for
	AddressFamily/SocketKind and IntFlag for MsgFlag/AddressInfo."

	self assert: (self reprAt: 'flag_type_is_honoured')
		equals: '[True, [''FL_ONE'', ''FL_TWO''], ''<Flags.FL_ONE: 1>'']'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testTheEnumClassIsBoundInTheModule [
	"module_globals[name] = cls.  Without it the name _convert_ was asked to
	create simply does not exist, and the first reference to it is a
	NameError -- with nothing pointing back at _convert_ as the cause."

	self assert: (self reprAt: 'class_is_bound_in_the_module')
		equals: '[True, True, True]'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testTheModulesConstantsBecomeMembers [
	"THE POINT OF _convert_.  After the call the module's plain ints ARE the
	enum's members; that is what ``replaces a collection of global constants''
	means in CPython's own docstring."

	self assert: (self reprAt: 'constants_became_members')
		equals: '[''<Colour.CV_RED: 1>'', ''<Colour.CV_BLUE: 2>'', ''<Colour.CV_GREEN: 3>'']'.

]

{ #category : 'Grail-Tests' }
EnumConvertExportTestCase >> testTheReturnedClassIsTheOneBoundInTheModule [
	"Grail already returned a good enum; the bug was that the module never
	heard about it.  These must be the same object, not two builds."

	self assert: (self reprAt: 'return_value_is_the_class') equals: 'True'.

]
