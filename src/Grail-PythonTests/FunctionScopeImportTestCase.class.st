Class {
	#name : 'FunctionScopeImportTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionScopeImportTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
FunctionScopeImportTestCase >> setUp [
	"Reload tests/python/function_scope_import.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'function_scope_import' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/function_scope_import.py')
		name: 'function_scope_import'.
	probe := testModule @env1:probe.

]

{ #category : 'Grail-Tests - shadowing' }
FunctionScopeImportTestCase >> testAliasedImportShadowingAModuleName [
	"The ALIAS is the bound name, so ``import os.path as json'' collides
	with the module-level ``json'' even though the imported module differs."

	self assert: (self at: 'aliased_shadow') @env0:asString equals: '/'

]

{ #category : 'Grail-Tests - shadowing' }
FunctionScopeImportTestCase >> testDottedImportShadowingAModuleImport [
	"``import os.path'' in a function whose module also imports os.path."

	self assert: (self at: 'dotted_shadow') @env0:asString equals: '/'

]

{ #category : 'Grail-Tests - shadowing' }
FunctionScopeImportTestCase >> testFromImportShadowingAModuleImport [
	"``from math import floor'' -- the third form, via ImportFromAst."

	self assert: (self at: 'from_shadow') equals: 2

]

{ #category : 'Grail-Tests - unaffected' }
FunctionScopeImportTestCase >> testGlobalDeclarationStillForcesTheModuleBinding [
	"``global json'' then ``import json'' must bind the MODULE global, not a
	local -- the one case where a function-scope import still stores on the
	module.  Checked before the shadow rule, exactly as assignment does it."

	self assert: (self at: 'global_declared_import') @env0:asString
		equals: '[4]'

]

{ #category : 'Grail-Tests - unaffected' }
FunctionScopeImportTestCase >> testImportInAClassMethod [
	"A method body is compiled with classBeingCompiled set, and the OLD
	condition already bailed out on that, so this case worked before the fix
	and passes either way.  Kept as a guard: the new rule checks
	classBeingCompiled after the ``global'' test rather than before it, so
	this is the assertion that the reordering did not disturb methods."

	self assert: (self at: 'method_shadow') @env0:asString equals: '[3]'

]

{ #category : 'Grail-Tests - shadowing' }
FunctionScopeImportTestCase >> testImportInANestedFunction [
	"The shadow rule walks every enclosing function, not just the innermost."

	self assert: (self at: 'nested_shadow') @env0:asString equals: '[2]'

]

{ #category : 'Grail-Tests - unaffected' }
FunctionScopeImportTestCase >> testImportsThatDoNotShadowStillWork [
	"A function importing something the module does NOT import always
	worked; the local-shadow check must leave it alone."

	self assert: (self at: 'no_shadow_dotted') @env0:asString
		equals: 'html.entities'.
	self assert: (self at: 'no_shadow_plain') equals: 1.
	self assert: (self at: 'no_shadow_from') equals: 3

]

{ #category : 'Grail-Tests - unaffected' }
FunctionScopeImportTestCase >> testModuleScopeImportsStillResolveFromFunctions [
	"The module-level imports must still be readable from a function that
	does not re-import them -- that is the path the old code got right."

	self assert: (self at: 'module_scope_still_works')

]

{ #category : 'Grail-Tests - shadowing' }
FunctionScopeImportTestCase >> testPlainImportShadowingAModuleImport [
	"``import json'' -- the undotted form failed the same way, so this is
	not specific to dotted paths."

	self assert: (self at: 'plain_shadow') @env0:asString equals: '[1]'

]
