"Tests that the enum metaclass methods and the name/value/__members__
descriptors carry CPython's docstrings and signatures, and that Flag's
same-named instance methods override them without losing the fallthrough.
Drives tests/python/enum_method_docs.py."
Class {
	#name : 'EnumMethodDocsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
EnumMethodDocsTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
EnumMethodDocsTestCase >> setUp [
	"Reload tests/python/enum_method_docs.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'enum_method_docs' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/enum_method_docs.py')
		name: 'enum_method_docs'.

]

{ #category : 'Grail-Tests - Name collisions' }
EnumMethodDocsTestCase >> testFlagOverridesTheSameNamesWithoutLosingTheFallthrough [
	"The table is keyed by NAME ONLY, so a single Enum-level entry gave a Flag
	member the metaclass's text for a method that means something else entirely.
	Flag's own table fixes both readings -- CPython answers Flag's for the class
	reading too -- and __len__ proves the fallthrough still works for a name
	Flag's table omits, which is what makes two partial tables safe."

	self assert: (self resultAt: 'flag_member_contains') asString
		equals: '''Returns True if self has at least the same flags set as other.'''.
	self assert: (self resultAt: 'flag_member_iter') asString
		equals: '''Returns flags in definition order.'''.
	self assert: (self resultAt: 'flag_class_contains') asString
		equals: '''Returns True if self has at least the same flags set as other.'''.
	self assert: (self resultAt: 'flag_class_len') asString
		equals: '''Return the number of members (no aliases)'''.

]

{ #category : 'Grail-Tests - Name collisions' }
EnumMethodDocsTestCase >> testIntEnumNamesTheSameTablesFromItsOwnRoot [
	"IntEnum's Smalltalk chain is rooted at AbstractPyInt and never passes Enum,
	so it cannot inherit the tables and has to name them."

	self assert: (self resultAt: 'intenum_len') asString
		equals: '''Return the number of members (no aliases)'''.
	self assert: (self resultAt: 'intenum_contains_sig') asString equals: '''(value)'''.

]

{ #category : 'Grail-Tests - Known gaps' }
EnumMethodDocsTestCase >> testStrEnumHasNoneOfThemWhichIsAKnownGap [
	"Recorded, NOT endorsed, and deliberately not delegated.  ``str'' defines all
	four of these names, so CPython's lookup finds them on StrEnum's mro and
	never reaches the metatype -- ``StrEnum.__len__.__doc__'' is str's 'Return
	len(self).', not the metaclass's.  Handing StrEnum the enum tables would
	replace one wrong answer with a different wrong answer; the right fix is
	docstrings for the str methods, which is its own piece of work."

	self assert: (self resultAt: 'strenum_len') asString equals: 'None'.

]

{ #category : 'Grail-Tests - Docstrings' }
EnumMethodDocsTestCase >> testTheFourMetaclassMethodsCarryCPythonsDocstrings [
	"The full text, not a prefix: test_pydoc compares byte for byte, so a
	docstring that merely starts the same is a different answer."

	self assert: (self resultAt: 'doc___contains__') asString
		equals: '"Return True if `value` is in `cls`.\n\n`value` is in `cls` if:\n1) `value` is a member of `cls`, or\n2) `value` is the value of one of the `cls`''s members.\n3) `value` is a pseudo-member (flags)"'.
	self assert: (self resultAt: 'doc___getitem__') asString
		equals: '''Return the member matching `name`.'''.
	self assert: (self resultAt: 'doc___iter__') asString
		equals: '''Return members in definition order.'''.
	self assert: (self resultAt: 'doc___len__') asString
		equals: '''Return the number of members (no aliases)'''.

]

{ #category : 'Grail-Tests - Signatures' }
EnumMethodDocsTestCase >> testTheFourMetaclassMethodsReportTheirParameters [
	"All four rendered as ``()'' before the signature table existed.  The
	receiver is dropped for the BOUND reading, which is the one pydoc renders."

	self assert: (self resultAt: 'sig___contains__') asString equals: '''(value)'''.
	self assert: (self resultAt: 'sig___getitem__') asString equals: '''(name)'''.
	self assert: (self resultAt: 'sig___iter__') asString equals: '''()'''.
	self assert: (self resultAt: 'sig___len__') asString equals: '''()'''.

]

{ #category : 'Grail-Tests - Docstrings' }
EnumMethodDocsTestCase >> testTheMemberDescriptorsAndMembersPropertyAreDocumented [
	"name and value are built from a Smalltalk getter, so there is no def-time
	docstring for the descriptor to pick up -- it has to be supplied when the
	descriptor is constructed.  __members__ is the readonly property on the
	metaclass, reached through the interned PropertyDescriptor."

	self assert: (self resultAt: 'doc_name') asString
		equals: '''The name of the Enum member.'''.
	self assert: (self resultAt: 'doc_value') asString
		equals: '''The value of the Enum member.'''.
	self assert: (self resultAt: 'doc_members') asString
		equals: '''Returns a mapping of member name->value.\n\nThis mapping lists all enum members, including aliases.  Note that\nthis is a read-only view of the internal mapping.'''.

]
