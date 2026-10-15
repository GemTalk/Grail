Class {
	#name : 'ClassQualnameStoreTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassQualnameStoreTestCase >> resultAt: key [
	^ (testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key

]

{ #category : 'Grail-Setup' }
ClassQualnameStoreTestCase >> setUp [
	"Reload tests/python/class_qualname_store.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'class_qualname_store' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_qualname_store.py')
		name: 'class_qualname_store'.

]

{ #category : 'Grail-Tests - The store takes effect' }
ClassQualnameStoreTestCase >> testABuildTimeNestedQualnameCanBeOverridden [
	"ClassDefAst writes the nested name into the same slot, so the two agree
	rather than competing.

	``Outer'' is itself built inside a function here, so the build-time default
	is the WHOLE chain -- ``_outer.<locals>.Outer.Inner'', which is what CPython
	answers.  It read ``Outer.Inner'' while Grail truncated to one level."

	self assert: (self resultAt: 'nested_default') asString
		equals: '_outer.<locals>.Outer.Inner'.
	self assert: (self resultAt: 'nested_override') asString equals: 'Somewhere.Else'.

]

{ #category : 'Grail-Tests - What the store is for' }
ClassQualnameStoreTestCase >> testAClassDefinedInAFunctionPicklesOnceItSaysWhereItLives [
	"Attach it, name it, and the dotted lookup finds it -- both the member and
	the class itself."

	self assert: (self resultAt: 'qualname') asString equals: 'Holder.NestedEnum'.
	self assert: (self resultAt: 'roundtrip').
	self assert: (self resultAt: 'roundtrip_class').

]

{ #category : 'Grail-Tests - Known gaps' }
ClassQualnameStoreTestCase >> testAnUnattachedClassRaisesAsInCPython [
	"CPython raises PicklingError for a class that was never attached
	anywhere, because its qualname resolves to nothing.  Unrelated to the store
	above.  This pinned the opposite while Grail's own pickle was more
	permissive; pickle is CPython's pickle.py now."

	self assert: (self resultAt: 'unattached_raises_as_in_cpython') asString equals: 'PicklingError'.

]

{ #category : 'Grail-Tests - The store takes effect' }
ClassQualnameStoreTestCase >> testAssigningQualnameIsVisible [
	"The defect in one line: the assignment used to be dropped silently.

	``before'' is the FUNCTION-nested qualname, not the bare name: every class
	this fixture mutates is built inside a function (a module-level class is
	canonical, so the assignment would leak into the next test), and CPython
	reports ``_plain.<locals>.Plain'' for such a class.  This asserted ``Plain''
	while Grail could not see lexical nesting at all -- pinning Grail's limit
	rather than CPython's answer.  Verified by running the fixture."

	self assert: (self resultAt: 'before') asString equals: '_plain.<locals>.Plain'.
	self assert: (self resultAt: 'after') asString equals: 'Holder.Plain'.

]

{ #category : 'Grail-Tests - The store takes effect' }
ClassQualnameStoreTestCase >> testOnlyTheQualifiedNameMoves [
	"__name__ is a separate slot and is untouched."

	self assert: (self resultAt: 'name_unchanged') asString equals: 'Plain'.

]
