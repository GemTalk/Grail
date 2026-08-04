! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for Pep649AnnotationsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'Pep649AnnotationsTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
Pep649AnnotationsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! Pep649AnnotationsTestCase
!
! PEP 649 / PEP 749: annotations are COMPUTED, not stored.  An annotated def
! carries an ``__annotate__'' function, built at def-time by FunctionDefAst and
! taking an ``annotationlib.Format''; reading ``__annotations__'' calls it with
! Format.VALUE.
!
! What this replaces.  Grail stored PEP 563 SOURCE STRINGS -- ``{'a': 'int'}''
! where CPython 3.14 gives ``{'a': int}'' -- and the reason was real: 55+
! werkzeug/flask modules annotate parameters with forward references to names
! not yet bound, so evaluating at def-time raised NameError and aborted the
! module load.  Deferring the evaluation to the READ satisfies that constraint
! properly and answers the values, which is what CPython does; PEP 563's
! stringification is the mode CPython is deprecating.
!
! Three things only the substrate can do, and each has a test here:
!   * ``wrapper.__annotate__ is inner.__annotate__'' after update_wrapper --
!     an identity no amount of eager value computation can supply, and the
!     reason __annotate__ (not __annotations__) is in WRAPPER_ASSIGNMENTS.
!   * Format.FORWARDREF resolving the keys it can and reporting only the
!     others as ForwardRefs -- which needs per-ANNOTATION evaluation, not one
!     dict-building call that raises partway.
!   * An annotation naming something bound only AFTER the def: the read raises
!     NameError while it is unbound and succeeds once it is not.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
Pep649AnnotationsTestCase removeAllMethods.
Pep649AnnotationsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: Pep649AnnotationsTestCase
setUp
	"Reload tests/python/pep649_annotations.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pep649_annotations' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/pep649_annotations.py')
		name: 'pep649_annotations'.
%

! --- values rather than source strings ---

category: 'Grail-Tests - values'
method: Pep649AnnotationsTestCase
testAnnotationsAreValues
	"``def f(a: int, *rest: float, **kw: bool) -> str'' reports the CLASSES.
	``str'' compares by equality rather than identity: referencing a builtin
	whose Grail representation is a method handle mints a fresh one per read."

	self assert: testModule @env1:annotations_are_values asArray
		equals: #( true true true true true ).
%

category: 'Grail-Tests - values'
method: Pep649AnnotationsTestCase
testAStringLiteralAnnotationStaysAString
	"Evaluating a string literal yields that string, in CPython as here --
	resolving it is annotationlib's job, not the annotate function's."

	self assert: testModule @env1:a_string_literal_annotation_stays_a_string asArray
		equals: #( 'int' 'some.dotted.name' ).
%

category: 'Grail-Tests - values'
method: Pep649AnnotationsTestCase
testModuleLevelAndMethodAnnotationsAreValues
	"All three storage paths -- nested def (on the closure), module-level def
	(on the module instance), class method (class-side table) -- answer
	values.  Converting only one would have made __annotations__ report
	values in some places and strings in others."

	self assert: testModule @env1:module_level_and_method_annotations_are_values asArray
		equals: #( true true true true ).
%

! --- the annotate function itself ---

category: 'Grail-Tests - annotate'
method: Pep649AnnotationsTestCase
testAnnotateIsIdentityStable
	"Stamped ONCE at def-time.  update_wrapper copies this attribute and
	check_wrapper asserts identity for every name in WRAPPER_ASSIGNMENTS, so
	a per-read function would fail that even though the dicts matched."

	self assert: testModule @env1:annotate_is_identity_stable asArray
		equals: #( true true ).
%

category: 'Grail-Tests - annotate'
method: Pep649AnnotationsTestCase
testUnannotatedHasNoAnnotateFunction
	"None, not a function that answers nothing -- and __annotations__ is
	still an empty MAPPING, since CPython gives every function one."

	self assert: testModule @env1:unannotated_has_no_annotate asArray
		equals: #( true true ).
%

category: 'Grail-Tests - annotate'
method: Pep649AnnotationsTestCase
testUpdateWrapperSharesTheAnnotateFunction
	"WRAPPER_ASSIGNMENTS names __annotate__ where Grail used to name
	__annotations__: the wrapper receives the wrapped function's deferred
	computation rather than a dict forced at wrap time."

	self assert: testModule @env1:update_wrapper_shares_the_annotate_function asArray
		equals: #( true true ).
%

! --- formats ---

category: 'Grail-Tests - formats'
method: Pep649AnnotationsTestCase
testStringFormatIsStillAvailable
	"Format.STRING evaluates nothing, so it renders an annotation no other
	format could.  functools.singledispatch.register reads THIS rather than
	__annotations__: it has to tell ``list[int]'' from ``list'', and the
	value cannot -- Grail's __class_getitem__ is an identity stub."

	self assert: testModule @env1:string_format_is_still_available asArray
		equals: #( 'int' 'nowhere_at_all' ).
%

category: 'Grail-Tests - formats'
method: Pep649AnnotationsTestCase
testValueFormatRaisesForANameBoundNowhere
	"CPython reports the NameError from the READ, not from the module load."

	self assert: testModule @env1:value_format_raises_for_a_name_bound_nowhere
		@env0:asString
		equals: 'NameError'.
%

category: 'Grail-Tests - formats'
method: Pep649AnnotationsTestCase
testForwardrefResolvesWhatItCan
	"Per-KEY: ``a'' comes back as int alongside a ForwardRef for the return.
	This is why each annotation is evaluated separately rather than the dict
	being built in one go -- a single call that raised partway could report
	neither."

	| got |
	got := testModule @env1:forwardref_resolves_what_it_can asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) @env0:asString equals: 'still_not_defined'.
	self assert: (got at: 3) @env0:asString
		equals: 'ForwardRef(''still_not_defined'')'.
%

! --- deferral ---

category: 'Grail-Tests - deferral'
method: Pep649AnnotationsTestCase
testANameBoundAfterTheDefStillResolves
	"The payoff.  The annotation expression runs at READ time in the scope
	that enclosed the def, so the same attribute raises NameError before the
	name is bound and answers the class after.  Storing source strings gave
	up the value; evaluating at def-time gave up the module load."

	| got |
	got := testModule @env1:a_name_bound_after_the_def_still_resolves asArray.
	self assert: (got at: 1) @env0:asString equals: 'NameError'.
	self assert: (got at: 2) equals: true.
%

category: 'Grail-Tests - deferral'
method: Pep649AnnotationsTestCase
testUpdateWrapperDefersAnUnresolvedAnnotation
	"A wrapper over a function whose annotation is not yet resolvable stays
	unresolved, then resolves with it -- the behaviour that copying a
	computed dict cannot reproduce."

	| got |
	got := testModule @env1:update_wrapper_defers_an_unresolved_annotation asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) @env0:asString equals: 'NameError'.
	self assert: (got at: 3) equals: true.
%

! --- scoping ---

category: 'Grail-Tests - scoping'
method: Pep649AnnotationsTestCase
testAParameterDoesNotShadowItsOwnAnnotation
	"Python evaluates parameter annotations in the ENCLOSING scope, so
	``def f(type: type, int: int = 3) -> type'' annotates with the builtins,
	not with its own parameters.

	Regression guard with real reach: werkzeug's
	``cache_control_property(key, empty, type, ...)'' does exactly this, and
	emitting the annotation as a read of the parameter referenced a temp that
	does not exist in the enclosing scope where the annotate function is
	built -- CompileError 1001, which failed the whole module load and took
	the framework deploy with it."

	self assert: testModule @env1:a_parameter_does_not_shadow_its_own_annotation asArray
		equals: #( true true true ).
%
