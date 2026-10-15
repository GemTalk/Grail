Class {
	#name : 'ExecStarImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ExecStarImportTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
ExecStarImportTestCase >> reprAt: aKey [
	"The fixture's entries are Python values; compare their repr so a failure
	prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
ExecStarImportTestCase >> setUp [
	probe := self ___loadProbe___: 'exec_star_import'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testDunderAllDecidesTheExportedSet [
	"Not ``every public name'': a module that declares __all__ exports exactly
	that, which is the rule expandStarImports: already implements for module
	scope and which the doit path now shares."

	self assert: (self reprAt: 'star_from_a_module_with_dunder_all')
		equals: 'True'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testModuleLevelStarImportIsUnchanged [
	"The path that always worked -- regression guard on the emit this change
	also touches (the runtime merge is skipped only in a doit)."

	self assert: (self reprAt: 'module_level_star_is_unchanged') equals: '1'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testNamedImportInExecIsUnchanged [
	"``from X import a, b'' -- the shape the star is rewritten INTO, so it had
	better still work on its own."

	self assert: (self reprAt: 'named_import_in_exec_still_works')
		equals: '[''bisect_left'', ''insort'']'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testPlainImportInExecIsUnchanged [
	"``import X'' in a doit always worked; the expansion pass must not disturb
	the statement it does not rewrite."

	self assert: (self reprAt: 'plain_import_in_exec_still_works')
		equals: '[''bisect'']'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testSeveralStarImportsInOneExec [
	"The rewrite walks every top-level statement, so two stars in one exec'd
	body must both expand -- a fix that handled only the first would pass every
	test above."

	self assert: (self reprAt: 'several_star_imports_in_one_exec')
		equals: '[True, True]'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testStarImportBindsTheModulesNames [
	"The headline: the exec'd namespace ends up holding what the star import
	promised, rather than the exec dying in the compiler."

	self assert: (self reprAt: 'star_into_exec_namespace')
		equals: '[''bisect'', ''bisect_left'', ''bisect_right'', ''insort'', ''insort_left'', ''insort_right'']'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testTheBoundNamesAreCallable [
	"Bound to the real functions, not merely present as keys."

	self assert: (self reprAt: 'the_names_are_usable') equals: '1'.

]

{ #category : 'Grail-Tests' }
ExecStarImportTestCase >> testTheFailureWasNotCatchable [
	"Speaks to the failure MODE.  Before this, the try/except around the exec
	was useless -- a Smalltalk CompileError is not a Python exception, so it
	escaped Python entirely and ended the session's test.  Answering ``ok''
	means the exec both ran and stayed inside Python's control flow."

	self assert: (self reprAt: 'uncatchable_before') equals: '''ok'''.

]
