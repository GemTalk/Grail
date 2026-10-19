Class {
	#name : 'BuiltinNamespaceNarrowingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
BuiltinNamespaceNarrowingTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
BuiltinNamespaceNarrowingTestCase >> setUp [
	"Reload tests/python/builtin_namespace.py fresh each test."

	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: #'builtin_namespace' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/builtin_namespace.py')
		name: 'builtin_namespace'.
	probe := testModule @env1:probe.

]

{ #category : 'Grail-Tests - narrowing' }
BuiltinNamespaceNarrowingTestCase >> testFlattenedModuleAttributeNamesDoNotResolve [
	"Grail stores some module attributes flattened as ``module_attr''
	(``sys_flags'' for sys.flags).  That spelling is an implementation
	detail and must not be nameable from Python."

	self assert: (self at: 'flattened_attr_missing').
	self assert: (self at: 'flattened_ospath_missing')

]

{ #category : 'Grail-Tests - narrowing' }
BuiltinNamespaceNarrowingTestCase >> testGemStoneKernelNamesDoNotResolve [
	"The symbol list reaches the whole kernel; Python's namespace does not."

	self assert: (self at: 'kernel_array_missing').
	self assert: (self at: 'kernel_collection_missing')

]

{ #category : 'Grail-Tests - narrowing' }
BuiltinNamespaceNarrowingTestCase >> testImplementationClassesDoNotResolve [
	"Grail's own classes live in the same dictionary as the builtins, but
	they are not part of Python's namespace."

	self assert: (self at: 'impl_class_missing').
	self assert: (self at: 'impl_boundmethod_missing')

]

{ #category : 'Grail-Tests - contract' }
BuiltinNamespaceNarrowingTestCase >> testImportsStillResolve [
	"The narrowed names are still reachable the way Python reaches them."

	self assert: (self at: 'import_works') @env0:asString equals: '[1]'.
	self assert: (self at: 'from_import_works') equals: 2

]

{ #category : 'Grail-Tests - manifest' }
BuiltinNamespaceNarrowingTestCase >> testIsResolvableSymbolGatesOnTheManifest [
	"The gate itself: a name must be BOTH in the builtins namespace and
	resolvable on the symbol list.  ``Array'' resolves on the symbol list
	but is not a builtin; ``int'' is both."

	self assert: (NameAst isResolvableSymbol: #'int').
	self deny: (NameAst isResolvableSymbol: #'Array').
	self deny: (NameAst isResolvableSymbol: #'json').
	self deny: (NameAst isResolvableSymbol: #'PyDict')

]

{ #category : 'Grail-Tests - manifest' }
BuiltinNamespaceNarrowingTestCase >> testManifestExcludesModuleLevelDunders [
	"These five are in dir(builtins) but belong to the module at runtime."

	| names |
	names := builtins ___builtinNamespaceNames___.
	#( #'__name__' #'__doc__' #'__package__' #'__loader__' #'__spec__' )
		do: [:sym | self deny: (names includes: sym)]

]

{ #category : 'Grail-Tests - manifest' }
BuiltinNamespaceNarrowingTestCase >> testManifestIsCPythonBuiltinsNamespace [
	"A spec, not an inventory of what Grail implements: the names Python
	itself lets an unqualified reference resolve to."

	| names |
	names := builtins ___builtinNamespaceNames___.
	self assert: (names includes: #'int').
	self assert: (names includes: #'ValueError').
	self assert: (names includes: #'len').
	self assert: (names includes: #'NotImplemented').
	self assert: (names includes: #'__debug__').
	"Not builtins in any Python."
	self deny: (names includes: #'json').
	self deny: (names includes: #'Decimal').
	self deny: (names includes: #'PyDict').
	self deny: (names includes: #'Array')

]

{ #category : 'Grail-Tests - contract' }
BuiltinNamespaceNarrowingTestCase >> testModuleDundersStillResolve [
	"dir(builtins) lists __name__, __doc__, __package__, __loader__ and
	__spec__, but in real code they are the enclosing MODULE's attributes.
	They are excluded from the manifest so they keep taking the
	module-attribute path rather than binding as builtins."

	self assert: (self at: 'module_dunder_works') @env0:asString
		equals: 'builtin_namespace'

]

{ #category : 'Grail-Tests - contract' }
BuiltinNamespaceNarrowingTestCase >> testModuleGlobalsStillResolve [

	self assert: (self at: 'module_global_works') @env0:asString
		equals: 'module-global'

]

{ #category : 'Grail-Tests - narrowing' }
BuiltinNamespaceNarrowingTestCase >> testModuleNamesDoNotResolveWithoutImport [
	"``json'' used to work with no import statement at all, because the
	module class was reachable as a bare Smalltalk global."

	self assert: (self at: 'module_class_missing').
	self assert: (self at: 'module_math_missing')

]

{ #category : 'Grail-Tests - narrowing' }
BuiltinNamespaceNarrowingTestCase >> testNameCollidingWithAKernelClassDoesNotBindTheWrongObject [
	"The sharpest case.  ``Decimal'' is not a builtin in CPython -- it is
	decimal.Decimal, and a bare reference is a NameError.  In Grail it
	resolved to GemStone's ScaledDecimal, so code received a plausible but
	WRONG object instead of an error."

	self assert: (self at: 'wrong_object_missing')

]

{ #category : 'Grail-Tests - contract' }
BuiltinNamespaceNarrowingTestCase >> testRealBuiltinsStillResolve [
	"Types, exceptions, functions and constants from the real builtins
	namespace are exactly what should still bind bare."

	self assert: (self at: 'builtin_type_works') equals: 7.
	self assert: (self at: 'builtin_exception_works') @env0:asString equals: 'boom'.
	self assert: (self at: 'builtin_func_works') equals: 3.
	self assert: (self at: 'builtin_constant_works')

]
