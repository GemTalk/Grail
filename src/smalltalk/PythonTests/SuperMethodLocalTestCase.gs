! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'SuperMethodLocalTestCase'
  instVarNames: #( irModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
SuperMethodLocalTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! SuperMethodLocalTestCase - super() and __class__ in a METHOD-LOCAL class
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
SuperMethodLocalTestCase removeAllMethods.
SuperMethodLocalTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: SuperMethodLocalTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'super_method_local_ir' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'super_method_local_ir'.
	irModule := nil.
%

category: 'Grail-Private'
method: SuperMethodLocalTestCase
___keys___
	^ #('zero_arg_super' 'explicit_super_naming_itself' 'dunder_class_read'
	    'inherited_sees_defining_class' 'super_from_base_method'
	    'super_init_chain' 'three_level_chain' 'super_with_arguments'
	    'classmethod_super')
%

category: 'Grail-Private'
method: SuperMethodLocalTestCase
___disagreeingIn___: results
	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		((results @env1:__getitem__: k) = true) ifFalse: [bad add: k]].
	^ bad
%

category: 'Grail-Private'
method: SuperMethodLocalTestCase
___irResults___
	"The fixture with the seam FORCED ON, under a second module name."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'super_method_local_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'super_method_local_ir'.
	irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___.
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/super_method_local.py')
		name: 'super_method_local_ir'.
	^ irModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Tests - super in a method-local class'
method: SuperMethodLocalTestCase
testSuperAndDunderClassUnderIR
	"super() and __class__ inside a class defined in a FUNCTION BODY, with the
	seam forced on.

	Such a class is not a module attribute, so a method needing its own class
	reads the closure cell holding it -- ___classCellForSuper___: for
	super(), ___classCell___: for the explicit form, whose text twin puts the
	supercheck on `Super checkedCls:' instead.  IR emitted neither, so all 79
	`CallAst:super-methodLocalClass' methods of the suite manifest refused.

	THE CASES THAT MATTER are the ones where the defining class and type(self)
	DIFFER, because the cell is keyed by class NAME: `__class__' is the class
	the method was DEFINED in.  An emit that read type(self) instead would
	agree on every flat call and diverge only once a subclass inherits the
	method, so `inherited_sees_defining_class' and `super_from_base_method'
	are the load-bearing assertions here and a flat super() call is not.

	The fixture self-verifies under CPython, so each expectation is CPython's
	behaviour rather than Grail's opinion of it."

	| bad |
	bad := self ___disagreeingIn___: self ___irResults___.
	self assert: bad isEmpty
		description: 'method-local super/__class__ shapes disagreeing with '
			, 'CPython under IR: ' , bad asArray printString
%

category: 'Grail-Tests - super in a method-local class'
method: SuperMethodLocalTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard.  Every assertion above would also pass if the seam
	had quietly fallen back to text -- the methods would simply be compiled the
	old way -- so correct answers are not evidence on their own.

	It matters more than usual here: the emit relies on `addCapturedClassName:'
	having already fired from the text twin, so a build that never ran would
	hide whether the cell is being stored at all."

	| stats |
	self ___irResults___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) > 0
		description: 'the IR arm compiled NOTHING, so it was re-testing the text '
			, 'path; compiled = ' , (stats at: #compiled) printString
%
