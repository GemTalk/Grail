Class {
	#name : 'Pep649AnnotationsTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Setup' }
Pep649AnnotationsTestCase >> setUp [
	"Reload tests/python/pep649_annotations.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'pep649_annotations' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/pep649_annotations.py')
		name: 'pep649_annotations'.

]

{ #category : 'Grail-Tests - deferral' }
Pep649AnnotationsTestCase >> testANameBoundAfterTheDefStillResolves [
	"The payoff.  The annotation expression runs at READ time in the scope
	that enclosed the def, so the same attribute raises NameError before the
	name is bound and answers the class after.  Storing source strings gave
	up the value; evaluating at def-time gave up the module load."

	| got |
	got := testModule @env1:a_name_bound_after_the_def_still_resolves asArray.
	self assert: (got at: 1) @env0:asString equals: 'NameError'.
	self assert: (got at: 2) equals: true.

]

{ #category : 'Grail-Tests - annotate' }
Pep649AnnotationsTestCase >> testAnnotateIsIdentityStable [
	"Stamped ONCE at def-time.  update_wrapper copies this attribute and
	check_wrapper asserts identity for every name in WRAPPER_ASSIGNMENTS, so
	a per-read function would fail that even though the dicts matched."

	self assert: testModule @env1:annotate_is_identity_stable asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - values' }
Pep649AnnotationsTestCase >> testAnnotationsAreValues [
	"``def f(a: int, *rest: float, **kw: bool) -> str'' reports the CLASSES.
	``str'' compares by equality rather than identity: referencing a builtin
	whose Grail representation is a method handle mints a fresh one per read."

	self assert: testModule @env1:annotations_are_values asArray
		equals: #( true true true true true ).

]

{ #category : 'Grail-Tests - scoping' }
Pep649AnnotationsTestCase >> testAParameterDoesNotShadowItsOwnAnnotation [
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

]

{ #category : 'Grail-Tests - values' }
Pep649AnnotationsTestCase >> testAStringLiteralAnnotationStaysAString [
	"Evaluating a string literal yields that string, in CPython as here --
	resolving it is annotationlib's job, not the annotate function's."

	self assert: testModule @env1:a_string_literal_annotation_stays_a_string asArray
		equals: #( 'int' 'some.dotted.name' ).

]

{ #category : 'Grail-Tests - formats' }
Pep649AnnotationsTestCase >> testForwardrefResolvesWhatItCan [
	"Per-KEY: ``a'' comes back as int alongside a ForwardRef for the return.
	This is why each annotation is evaluated separately rather than the dict
	being built in one go -- a single call that raised partway could report
	neither."

	| got r prefix |
	got := testModule @env1:forwardref_resolves_what_it_can asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) @env0:asString equals: 'still_not_defined'.
	"CPython's repr names the OWNER -- measured on 3.14.6:
	 ``ForwardRef('still_not_defined', owner=<function f at 0x...>)''.  The
	 address varies, so the stable prefix is what is compared.  The owner used to
	 be omitted, which matched no CPython output at all."
	r := (got at: 3) @env0:asString.
	prefix := 'ForwardRef(''still_not_defined'', owner=<function '.
	self assert: (r size > prefix size).
	self assert: (r copyFrom: 1 to: prefix size) equals: prefix.
	self assert: (r copyFrom: r size - 1 to: r size) equals: '>)'.

]

{ #category : 'Grail-Tests - values' }
Pep649AnnotationsTestCase >> testModuleLevelAndMethodAnnotationsAreValues [
	"All three storage paths -- nested def (on the closure), module-level def
	(on the module instance), class method (class-side table) -- answer
	values.  Converting only one would have made __annotations__ report
	values in some places and strings in others."

	self assert: testModule @env1:module_level_and_method_annotations_are_values asArray
		equals: #( true true true true ).

]

{ #category : 'Grail-Tests - formats' }
Pep649AnnotationsTestCase >> testStringFormatIsStillAvailable [
	"Format.STRING evaluates nothing, so it renders an annotation no other
	format could.  functools.singledispatch.register reads THIS rather than
	__annotations__: it has to tell ``list[int]'' from ``list'', and the
	value cannot -- Grail's __class_getitem__ is an identity stub."

	self assert: testModule @env1:string_format_is_still_available asArray
		equals: #( 'int' 'nowhere_at_all' ).

]

{ #category : 'Grail-Tests - annotate' }
Pep649AnnotationsTestCase >> testUnannotatedHasNoAnnotateFunction [
	"None, not a function that answers nothing -- and __annotations__ is
	still an empty MAPPING, since CPython gives every function one."

	self assert: testModule @env1:unannotated_has_no_annotate asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - deferral' }
Pep649AnnotationsTestCase >> testUpdateWrapperDefersAnUnresolvedAnnotation [
	"A wrapper over a function whose annotation is not yet resolvable stays
	unresolved, then resolves with it -- the behaviour that copying a
	computed dict cannot reproduce."

	| got |
	got := testModule @env1:update_wrapper_defers_an_unresolved_annotation asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) @env0:asString equals: 'NameError'.
	self assert: (got at: 3) equals: true.

]

{ #category : 'Grail-Tests - annotate' }
Pep649AnnotationsTestCase >> testUpdateWrapperSharesTheAnnotateFunction [
	"WRAPPER_ASSIGNMENTS names __annotate__ where Grail used to name
	__annotations__: the wrapper receives the wrapped function's deferred
	computation rather than a dict forced at wrap time."

	self assert: testModule @env1:update_wrapper_shares_the_annotate_function asArray
		equals: #( true true ).

]

{ #category : 'Grail-Tests - formats' }
Pep649AnnotationsTestCase >> testValueFormatRaisesForANameBoundNowhere [
	"CPython reports the NameError from the READ, not from the module load."

	self assert: testModule @env1:value_format_raises_for_a_name_bound_nowhere
		@env0:asString
		equals: 'NameError'.

]
