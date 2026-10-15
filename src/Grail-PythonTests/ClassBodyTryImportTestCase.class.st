Class {
	#name : 'ClassBodyTryImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassBodyTryImportTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
ClassBodyTryImportTestCase >> reprAt: aKey [
	"Compare the fixture entry's repr, so a failure prints the whole value
	rather than just ``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
ClassBodyTryImportTestCase >> setUp [
	probe := self ___loadProbe___: 'class_body_try_import'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testForBodyImport [
	"``try'' is not special: all four compound statements ClassDefAst emits
	verbatim take the same path, so all four are pinned."

	self assert: (self reprAt: 'for_body_import') equals: '[6, True]'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testFunctionScopeImportStillWorks [
	"...and a function-scope import still binds a real Smalltalk temp, which
	is the branch a careless fix would have routed into the class store."

	self assert: (self reprAt: 'function_scope_import_still_works') equals: '9'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testImportedNameIsAClassAttribute [
	"Not merely reachable from the class body -- CPython leaves the imported
	module bound as a CLASS ATTRIBUTE, and the definitional store is what
	makes that true here rather than a temp that outlived nothing."

	self assert: (self reprAt: 'imported_name_is_a_class_attribute') equals: 'True'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testModuleScopeImportStillWorks [
	"The branch the fix shares code with: a module-scope import still stores
	into the module's dynamic-instVar storage."

	self assert: (self reprAt: 'module_scope_import_still_works') equals: '8'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testPlainClassBodyImportStillWorks [
	"An import written DIRECTLY in the class body -- handled by ClassDefAst,
	never broken, and the reason this looked like an import bug rather than a
	class-body one."

	self assert: (self reprAt: 'plain_class_body_import') equals: '[5, True]'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testTryFromImportBindsInTheClassBody [
	"The ``from X import name'' form, which had the identical gap in
	ImportFromAst.  Both now route through the one shared helper, so they
	cannot drift apart again."

	self assert: (self reprAt: 'try_from_import') equals: '3'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testTryImportAliasedBindsTheAlias [
	"``import math as _m'' binds the ALIAS, and only the alias."

	self assert: (self reprAt: 'try_import_aliased') equals: '[4, True]'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testTryImportBindsInTheClassBody [
	"``try: import math'' in a class body, then a later class-body statement
	reading it.  Used to raise NameError at class-definition time: the import
	emitted a bare assignment to an undeclared temp, so nothing was bound."

	self assert: (self reprAt: 'try_import_success') equals: '2'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testTryImportOfAMissingModuleTakesTheExceptBranch [
	"The GUARD working as written -- the whole point of the shape.  This is
	the case that produced a CompileError rather than a runtime error, because
	the missing module's name reached GemStone as an undeclared symbol; the
	class could not be built and its module could not be imported."

	self assert: (self reprAt: 'try_import_missing') equals: '2147483647'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testWhileBodyImport [
	self assert: (self reprAt: 'while_body_import') equals: '[7, True]'.

]

{ #category : 'Grail-Tests' }
ClassBodyTryImportTestCase >> testWithBodyImport [
	self assert: (self reprAt: 'with_body_import') equals: '8'.

]
