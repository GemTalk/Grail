! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for TypeParamsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'TypeParamsTestCase'
  instVarNames: #( irModule textModule irRegistrySnapshot )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
TypeParamsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! TypeParamsTestCase
!
! PEP 695 TYPE PARAMETERS -- ``def identity[T](obj: T) -> T'' -- ON THE IR PATH.
!
! THREE census rows, one mechanism: `typeParams' (2, module-program),
! `cm:typeParams' (2) and `cm:nestedDef:typeParams' (2).
!
! WHAT DECIDES THE SHAPE is where the names can be RECORDED.
! ``___pyTypeParams___:'' is a method on ExecBlock, so only the CLOSURE form --
! a nested def -- can carry the cascade that holds them.  A def compiling to a
! real method, at module scope or in a class body, emits NOTHING for its type
! parameters; measured on the generated text, which mentions the names nowhere.
!
! SO TWO OF THE THREE ROWS HAD NOTHING TO REPRODUCE.  They were refusing out of
! caution, and dropping the refusal is the whole change for them.  The third
! needed one spec entry beside the qualname.
!
! THE XFAIL IS THE PRICE OF THAT ERASURE and is not this cut's:
! ``__type_params__'' is unreadable on a module-level def on BOTH paths,
! because such a def is reached as a BoundMethod, which has no such attribute.
! CPython answers the tuple of parameter objects.  Pinned so that a later fix
! has to come through the fixture.
!
! THE NESTED SHAPE IS THE ONE WITH SOMETHING TO GET WRONG, which is why the
! fixture includes a nested def that both declares its own parameter and closes
! over an enclosing local: the cascade is added to the same spec list that
! carries the qualname, the code object and the closure cells, and appending to
! the wrong one would drop a capture rather than a type name.
! ===============================================================================

doit
TypeParamsTestCase removeAllMethods.
TypeParamsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: TypeParamsTestCase
tearDown
	importlib ___irCodegenEnabledInvalidate___.
	(importlib @env1:modules) removeKey: #'tps_ir' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'tps_text' ifAbsent: [].
	irRegistrySnapshot ifNotNil: [:snap |
		importlib ___canonicalRegistryRestore___: snap.
		irRegistrySnapshot := nil].
	self ___forgetCanonicalModule___: 'tps_ir'.
	self ___forgetCanonicalModule___: 'tps_text'.
	irModule := nil.
	textModule := nil
%

category: 'Grail-Private'
method: TypeParamsTestCase
___fixturePath___
	^ importlib grailDir , '/tests/python/type_params.py'
%

category: 'Grail-Private'
method: TypeParamsTestCase
___keys___
	"The fixture's XFAIL (``type_params_names'') is deliberately absent and has
	its own test below."

	^ #('identity_runs' 'bounded_runs' 'two_params_runs' 'positional_only_runs'
	    'default_beside_params_runs' 'a_method_runs' 'a_nested_def_runs'
	    'a_nested_def_closing_over_a_local')
%

category: 'Grail-Private'
method: TypeParamsTestCase
___irModule___
	"Forced rather than inherited: what this pins is an ELIGIBILITY widening,
	so a flag-off run exercises none of it and would pass unchanged."

	irModule ifNotNil: [^ irModule].
	(importlib @env1:modules) removeKey: #'tps_ir' ifAbsent: [].
	self ___forgetCanonicalModule___: 'tps_ir'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: true.
	importlib ___irStatsReset___.
	irModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'tps_ir'.
	^ irModule
%

category: 'Grail-Private'
method: TypeParamsTestCase
___textModule___
	textModule ifNotNil: [^ textModule].
	(importlib @env1:modules) removeKey: #'tps_text' ifAbsent: [].
	self ___forgetCanonicalModule___: 'tps_text'.
	irRegistrySnapshot ifNil: [
		irRegistrySnapshot := importlib ___canonicalRegistrySnapshot___].
	importlib ___irCodegenForce___: false.
	textModule := importlib loadModuleFromPath: self ___fixturePath___ name: 'tps_text'.
	^ textModule
%

category: 'Grail-Private'
method: TypeParamsTestCase
___reprOf___: aModule key: aKey
	^ ((aModule @env1:___pyAttrLoad___: #'r') @env1:__getitem__: aKey)
		@env1:__repr__ @env0:asString
%

category: 'Grail-Tests - PEP 695 type parameters'
method: TypeParamsTestCase
testEveryDefShapeWithTypeParamsAgreesWithCPythonUnderIR
	"Eight shapes: a plain generic def, a bounded parameter, two parameters, a
	positional-only signature, a default beside them, a method, a nested def,
	and a nested def that both declares its own parameter and closes over an
	enclosing local."

	| bad |
	bad := OrderedCollection new.
	self ___keys___ do: [:k |
		| got want |
		got := self ___reprOf___: self ___irModule___ key: k.
		want := ((self ___irModule___ @env1:___pyAttrLoad___: #'EXPECTED')
			@env1:__getitem__: k) @env1:__repr__ @env0:asString.
		got = want ifFalse: [bad add: k , ': ' , got , ' vs ' , want]].
	self assert: bad isEmpty
		description: 'a type-parameterised def disagrees with CPython under IR: '
			, bad asArray printString
%

category: 'Grail-Tests - PEP 695 type parameters'
method: TypeParamsTestCase
testTheNestedClosureStillCapturesItsEnclosingLocal
	"The nested form is the one with something to get wrong: its type-parameter
	cascade joins the SAME spec list that carries the qualname, the code object
	and the CLOSURE CELLS.  Appending to the wrong one would drop a capture
	rather than a type name -- a wrong value, not an error."

	| got |
	got := self ___reprOf___: self ___irModule___
		key: 'a_nested_def_closing_over_a_local'.
	self assert: got = '(''z'', ''outer'')'
		description: 'the nested def''s capture was lost beside its type '
			, 'parameters: ' , got
%

category: 'Grail-Tests - PEP 695 type parameters'
method: TypeParamsTestCase
testDunderTypeParamsIsUnreadableOnBothPaths
	"The fixture's XFAIL, pinned as a MEASUREMENT of both paths rather than a
	remark about one.

	Grail erases the names on a def that compiles to a method, and reaches such
	a def as a BoundMethod, which has no ``__type_params__'' at all; CPython
	answers the tuple of parameter objects.  Older than this cut and unchanged
	by it.  When it is fixed, this fails and the fixture's XFAIL retires."

	| ir text |
	ir := self ___reprOf___: self ___irModule___ key: 'type_params_names'.
	text := self ___reprOf___: self ___textModule___ key: 'type_params_names'.
	self assert: ir = text
		description: 'the two paths now disagree about __type_params__ -- IR: '
			, ir , ' text: ' , text.
	self assert: (ir includesString: 'AttributeError')
		description: '__type_params__ became readable -- retire the fixture''s '
			, 'XFAIL: ' , ir
%

category: 'Grail-Tests - PEP 695 type parameters'
method: TypeParamsTestCase
testTheIRArmActuallyCompiledTheFixture
	"A guard on the guard: three census rows refused these defs, so before the
	cut the seam compiled them the old way and every value above was already
	right."

	| stats |
	self ___irModule___.
	importlib ___irCodegenSupported___ ifFalse: [^ self assert: true].
	stats := importlib ___irStats___.
	self assert: (stats at: #fallbacks) = 0
		description: 'IR fell back to text: ' , (stats at: #fallbacks) printString
			, ' (last error: ' , (stats at: #lastError) printString , ')'.
	self assert: (stats at: #compiled) >= 7
		description: 'fewer defs compiled than the cut measured (7, against 1 '
			, 'with the refusals): compiled = ' , (stats at: #compiled) printString
%
