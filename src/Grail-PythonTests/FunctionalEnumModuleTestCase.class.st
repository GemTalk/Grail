Class {
	#name : 'FunctionalEnumModuleTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
FunctionalEnumModuleTestCase >> assertMatchesCPythonAt: key [
	| builtinsInstance actual expected |
	builtinsInstance := (Python at: #builtins) @env1:instance.
	actual := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #r) @env1:__getitem__: key).
	expected := builtinsInstance
		@env1:repr: ((testModule @env1:___pyAttrLoad___: #EXPECTED) @env1:__getitem__: key).
	self assert: actual asString equals: expected asString.

]

{ #category : 'Grail-Setup' }
FunctionalEnumModuleTestCase >> setUp [
	"Reload tests/python/functional_enum_module.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'functional_enum_module' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/functional_enum_module.py')
		name: 'functional_enum_module'.

]

{ #category : 'Grail-Tests - Evaluated Code' }
FunctionalEnumModuleTestCase >> testAClassStatementInEvaluatedCodeReadsItsGlobals [
	"GemTalk/Grail#1170.  A class statement in a doit compiled a '__main__'
	literal, so it ignored the globals exec() was handed and disagreed with
	type() in the same exec().  CPython reads ``__name__'' as the class body
	starts: the globals, then builtins -- never exec()'s locals -- and at the
	moment the statement runs, not when the source was compiled.  A class body
	that sets its own ``__module__'' still wins."

	self assertMatchesCPythonAt: 'exec_class_names_its_globals'.
	self assertMatchesCPythonAt: 'exec_class_without_a_name_is_builtins'.
	self assertMatchesCPythonAt: 'exec_class_ignores_the_locals'.
	self assertMatchesCPythonAt: 'exec_class_in_a_function_names_its_globals'.
	self assertMatchesCPythonAt: 'exec_class_reads_the_name_when_it_runs'.
	self assertMatchesCPythonAt: 'exec_class_own_module_is_kept'.

]

{ #category : 'Grail-Tests - The Functional API' }
FunctionalEnumModuleTestCase >> testAFunctionalEnumBuiltAtModuleLevelGetsTheModule [
	"``Enum('F', 'A B')'' is shorthand for a class statement, which always
	knew its module.  The shorthand answered AttributeError."

	self assertMatchesCPythonAt: 'functional_at_module_level'.
	self assertMatchesCPythonAt: 'functional_strenum'.

]

{ #category : 'Grail-Tests - The Functional API' }
FunctionalEnumModuleTestCase >> testAFunctionalEnumBuiltInsideAFunctionGetsTheModule [
	"The frame-walk route, as opposed to the module-body fallback above."

	self assertMatchesCPythonAt: 'functional_in_a_function'.

]

{ #category : 'Grail-Tests - The Functional API' }
FunctionalEnumModuleTestCase >> testAnExplicitModuleIsKept [
	"``module='' was the one spelling that already worked, and the inferred
	answer must not override it."

	self assertMatchesCPythonAt: 'functional_explicit_module_is_kept'.

]

{ #category : 'Grail-Tests - Native Modules' }
FunctionalEnumModuleTestCase >> testEnumsBoundaryClassesBelongToEnum [
	self assertMatchesCPythonAt: 'flag_boundary'.
	self assertMatchesCPythonAt: 'enum_check'.
	self assertMatchesCPythonAt: 'flag_boundary_member'.

]

{ #category : 'Grail-Tests - Evaluated Code' }
FunctionalEnumModuleTestCase >> testEvaluatedCodeTakesTheModuleFromItsGlobals [
	"exec() compiles a doit, whose frames match no file in sys.modules.  The
	answer is the ``__name__'' of the globals it ran in, for type() and the
	functional API alike, and from a def the doit defined as well as from
	its top level."

	self assertMatchesCPythonAt: 'exec_type_names_its_globals'.
	self assertMatchesCPythonAt: 'exec_enum_names_its_globals'.
	self assertMatchesCPythonAt: 'exec_in_a_function_names_its_globals'.

]

{ #category : 'Grail-Tests - Evaluated Code' }
FunctionalEnumModuleTestCase >> testGlobalsWithNoNameStampNothing [
	"CPython stamps nothing when the globals have no ``__name__''.  The trap is
	the module that CALLED exec(): a walk that kept going outward would find
	it, and name a module the class was never built in."

	self assertMatchesCPythonAt: 'exec_without_a_name_stamps_nothing'.

]

{ #category : 'Grail-Tests - Native Modules' }
FunctionalEnumModuleTestCase >> testJSONEncoderBelongsToJsonEncoder [
	self assertMatchesCPythonAt: 'json_encoder'.

]

{ #category : 'Grail-Tests - The Functional API' }
FunctionalEnumModuleTestCase >> testTheEnumItselfIsUnchanged [
	self assertMatchesCPythonAt: 'functional_repr_is_qualified'.
	self assertMatchesCPythonAt: 'functional_member_is_unchanged'.

]
