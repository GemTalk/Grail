Class {
	#name : 'ClassBodyRebindingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyRebindingTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassBodyRebindingTestCase >> setUp [
	"Reload tests/python/class_body_rebinding.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_body_rebinding' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_rebinding.py')
		name: 'class_body_rebinding'.

]

{ #category : 'Grail-Tests - Enum duplicate names' }
ClassBodyRebindingTestCase >> testAliasIsNotADuplicate [
	"Two NAMES sharing one value is an alias, not a rebinding -- the check keys
	on the bound name, so ``dupe = 1'' after ``a = 1'' stays legal."

	self assert: (self resultAt: 'alias') asString equals: 'a,b/a'.

]

{ #category : 'Grail-Tests - Enum duplicate names' }
ClassBodyRebindingTestCase >> testEnumRejectsEverySpellingOfADuplicate [
	"CPython _EnumDict.__setitem__ (test_duplicate_name_error).

	All three now name the FIRST binding's value, as CPython does.  This test
	used to record a deviation on the first case -- ``already defined as 4'',
	the surviving binding's value, because the earlier store was already gone by
	the time the metaclass hook ran and noticed the clash.  An enum body is now
	executed against an EnumDict namespace, so the duplicate is refused AT THE
	SECOND ASSIGNMENT, while the first value is still what the mapping holds.
	CPython's own test pins that reading: test_dynamic_members_with_static_methods
	expects ``'FOO_CAT' already defined as 'aloof''' -- the existing value, not
	the incoming one."

	self assert: (self resultAt: 'dup_assign_assign') asString
		equals: '''red'' already defined as 1'.
	self assert: (self resultAt: 'dup_assign_def') asString
		equals: '''red'' already defined as 1'.
	self assert: (self resultAt: 'dup_property_assign') asString
		equals: '''red'' already defined as 1'.

]

{ #category : 'Grail-Tests - Enum duplicate names' }
ClassBodyRebindingTestCase >> testOrdinaryEnumUnaffected [
	"No duplicates, no error."

	self assert: (self resultAt: 'ordinary') asString equals: 'a=1,b=2,c=3'.

]

{ #category : 'Grail-Tests - Ordinary rebinding' }
ClassBodyRebindingTestCase >> testPlainClassMayRebindAName [
	"``x = 1'' then ``x = x + 1'' is ordinary Python.  The duplicate slot
	declaration made the whole class fail to build."

	self assert: (self resultAt: 'plain_x') equals: 2.
	self assert: (self resultAt: 'plain_y') asString equals: 'ab'.
	self assert: (self resultAt: 'rebound') asString equals: '[1, 2, 3]/3'.

]

{ #category : 'Grail-Tests - Ordinary rebinding' }
ClassBodyRebindingTestCase >> testRebindingSubclassKeepsItsOwnValue [
	"Deduplicating the DECLARATION must not collapse the per-class storage
	Python's ``A.attr != B.attr'' depends on -- the stores stay one per
	assignment, in source order."

	self assert: (self resultAt: 'per_class') asString equals: 'base/SUB'.

]
