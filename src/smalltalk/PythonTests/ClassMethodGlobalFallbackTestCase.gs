! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassMethodGlobalFallbackTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassMethodGlobalFallbackTestCase'
  instVarNames: #( consumerModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassMethodGlobalFallbackTestCase category: 'Grail-SUnit'
%

set compile_env: 0

expectvalue /Metaclass3
doit
ClassMethodGlobalFallbackTestCase removeAllMethods.
ClassMethodGlobalFallbackTestCase class removeAllMethods.
%

set compile_env: 0

! ===============================================================================
! ClassMethodGlobalFallbackTestCase
!
! A Python class method that reads a module-level global must resolve
! that read through the module instance, even when the name was
! injected at runtime by `globals().update(...)` (so parse-time AST
! analysis didn't catch it as a declared module variable).
!
! Mirrors the re._parser pattern: `class SubPattern: def dump(...):
!   if op is IN:`  where IN is a dynamically-injected opcode from
! re._constants.  Before the fix, NameAst's class-method
! free-variable path emitted a bare `IN` identifier when the name
! wasn't a declared module instVar, and the Smalltalk compiler
! rejected it as `undefined symbol`.
! ===============================================================================

category: 'Grail-Setup'
method: ClassMethodGlobalFallbackTestCase
setUp

	| mods |
	mods := importlib @env1:modules.
	#( 'pkg_class_global' 'pkg_class_global._source' 'pkg_class_global._consumer' ) do: [:n |
		mods @env0:removeKey: n @env0:asSymbol ifAbsent: []].
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_class_global/__init__.py')
		name: 'pkg_class_global'.
	importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_class_global/_source.py')
		name: 'pkg_class_global._source'.
	consumerModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/pkg_class_global/_consumer.py')
		name: 'pkg_class_global._consumer'.
%

category: 'Grail-Tests'
method: ClassMethodGlobalFallbackTestCase
testStaticGlobalReadable
	"A class method reading a statically-declared module global
	works on both the old codegen and the new — sanity check that
	the fix didn't regress the easy case."

	| classifier |
	classifier := consumerModule @env1:Classifier @env0:new.
	self assert: (classifier @env1:is_static: 99) equals: true.
	self assert: (classifier @env1:is_static: 0) equals: false.
%

category: 'Grail-Tests'
method: ClassMethodGlobalFallbackTestCase
testDynamicGlobalReadable
	"A class method reading a module global that was injected at
	runtime by `globals().update(...)` — the case that previously
	failed to compile because NameAst's class-method codegen
	emitted a bare identifier."

	| classifier |
	classifier := consumerModule @env1:Classifier @env0:new.
	self assert: (classifier @env1:is_dyn_a: 0) equals: true.
	self assert: (classifier @env1:is_dyn_b: 1) equals: true.
	self assert: (classifier @env1:is_dyn_a: 1) equals: false.
%

category: 'Grail-Tests'
method: ClassMethodGlobalFallbackTestCase
testKindDispatch
	"Mirrors the re._parser idiom: chained `if op is X:` against
	multiple dynamic and static globals."

	| classifier |
	classifier := consumerModule @env1:Classifier @env0:new.
	self assert: (classifier @env1:kind: 0) equals: 'a'.
	self assert: (classifier @env1:kind: 1) equals: 'b'.
	self assert: (classifier @env1:kind: 99) equals: 'static'.
	self assert: (classifier @env1:kind: 42) equals: 'unknown'.
%
