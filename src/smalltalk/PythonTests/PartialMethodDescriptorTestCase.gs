! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for PartialMethodDescriptorTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'PartialMethodDescriptorTestCase'
  instVarNames: #( testModule )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
PartialMethodDescriptorTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! PartialMethodDescriptorTestCase
!
! functools.partialmethod as a real descriptor class.
!
! It used to be a module function returning a bare closure, so the receiver was
! never bound: reading the attribute off an instance answered the closure
! itself, and ``a.m()'' called the target with the BOUND args only -- CPython's
! leading ``self'' simply missing, ``((), {})'' where the answer is ``((a,),
! {})''.  A closure also cannot be subclassed, carry a repr, or report
! __isabstractmethod__.
!
! NOT supported, and covered by tests that still fail upstream:
!   * ``partialmethod(staticmethod(f))'' / ``partialmethod(classmethod(f))'' --
!     Grail's staticmethod/classmethod are identity stubs, so neither is
!     distinguishable here from a plain function, and each would have to bind
!     the receiver differently (not at all, and to the class).
!   * ``obj.m.__self__'' -- MethodBinding could answer it, but because the
!     staticmethod stack is indistinguishable that would make __self__ appear
!     on a static one too, trading one upstream failure for another.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
PartialMethodDescriptorTestCase removeAllMethods.
PartialMethodDescriptorTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: PartialMethodDescriptorTestCase
setUp
	"Reload tests/python/partialmethod_descriptor.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'partialmethod_descriptor' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir
			, '/tests/python/partialmethod_descriptor.py')
		name: 'partialmethod_descriptor'.
%

category: 'Grail-Private'
method: PartialMethodDescriptorTestCase
shapesOf: aSelector
	"The fixture answers (args, sorted keyword pairs) per call, with the
	receiver rendered as 'a' so the expectation reads literally."

	^ (testModule @env1:perform: aSelector env: 1) asArray collect: [:each |
		| pair |
		pair := each asArray.
		Array
			with: (pair at: 1) asArray
			with: ((pair at: 2) asArray collect: [:kv | kv asArray])].
%

! --- the receiver is bound ---

category: 'Grail-Tests - Binding'
method: PartialMethodDescriptorTestCase
testReadingThroughAnInstanceBindsTheReceiver
	"The whole point.  Unbound, the receiver was missing from every call."

	self assert: (self shapesOf: #bound_through_an_instance)
		equals: {
			{ #( 'a' ). #() }.
			{ #( 'a' 5 ). #() }.
			{ #( 'a' ). { #( 'c' 6 ) } }.
			{ #( 'a' 1 ). #() }.
			{ #( 'a' 1 5 ). #() }.
			{ #( 'a' 3 5 ). { #( 'b' 4 ). #( 'c' 6 ) } } }.
%

category: 'Grail-Tests - Binding'
method: PartialMethodDescriptorTestCase
testReadingThroughTheClassTakesTheReceiverExplicitly
	"One call shape serves both paths: the class-side read expects the
	receiver in the same leading slot."

	self assert: (self shapesOf: #unbound_through_the_class)
		equals: {
			{ #( 'a' 3 5 ). { #( 'b' 4 ). #( 'c' 6 ) } }.
			{ #( 'a' ). { #( 'a' 3 ) } } }.
%

category: 'Grail-Tests - Binding'
method: PartialMethodDescriptorTestCase
testCallKeywordsOverrideBoundOnes

	self assert: (self shapesOf: #keywords_override_the_bound_ones)
		equals: {
			{ #( 'a' ). { #( 'a' 2 ) } }.
			{ #( 'a' ). { #( 'a' 3 ) } } }.
%

category: 'Grail-Tests - Binding'
method: PartialMethodDescriptorTestCase
testKeywordsNamedSelfOrFuncAreJustKeywords
	"CPython takes the target POSITIONALLY, so keywords of those names are
	ordinary bound keywords and must not collide with the descriptor's own
	parameters."

	| got |
	got := testModule @env1:keyword_named_self_or_func_is_just_a_keyword asArray.
	self assert: (got at: 1) asArray equals: #( 'a' ).
	self assert: ((got at: 2) asArray collect: [:kv | kv asArray])
		equals: { #( 'func' 2 ). #( 'self' 1 ) }.
%

! --- composition ---

category: 'Grail-Tests - Composition'
method: PartialMethodDescriptorTestCase
testNestedPartialMethodFlattens
	"partialmethod over a partialmethod adopts the inner target, and the
	INNER bound args come first."

	self assert: (self shapesOf: #nested_partialmethod_flattens)
		equals: {
			{ #( 'a' 1 5 ). #() }.
			{ #( 'a' 1 5 6 ). #() }.
			{ #( 'a' 1 5 6 ). { #( 'd' 7 ) } }.
			{ #( 'a' 1 5 6 ). { #( 'd' 7 ) } } }.
%

category: 'Grail-Tests - Composition'
method: PartialMethodDescriptorTestCase
testPartialMethodOverAPartial
	"The target may be a partial, whose own keywords merge in."

	self assert: (self shapesOf: #partialmethod_over_a_partial)
		equals: {
			{ #( 'a' 7 ). { #( 'c' 6 ) } }.
			{ #( 'a' 7 5 ). { #( 'c' 6 ) } }.
			{ #( 'a' 7 5 ). { #( 'c' 6 ). #( 'd' 8 ) } }.
			{ #( 'a' 7 5 ). { #( 'c' 6 ). #( 'd' 8 ) } } }.
%

! --- construction and introspection ---

category: 'Grail-Tests - Protocol'
method: PartialMethodDescriptorTestCase
testInvalidConstructionRaisesTypeError
	"All three at CONSTRUCTION, as CPython does, so the class body raises
	rather than something failing much later at call time."

	self assert: testModule @env1:invalid_construction asArray
		equals: #( 'not-callable:TypeError' 'no-target:TypeError'
			'target-by-keyword:TypeError' ).
%

category: 'Grail-Tests - Protocol'
method: PartialMethodDescriptorTestCase
testRepr
	"A closure had no repr of its own, so this printed as a bare Grail
	object.  The target's own repr is whatever Grail gives a function."

	self assert: testModule @env1:reprs asArray
		equals: #( 'functools.partialmethod(<BoundMethod object>)'
			'functools.partialmethod(<BoundMethod object>, 1)'
			'functools.partialmethod(<BoundMethod object>, a=2)'
			'functools.partialmethod(<BoundMethod object>, 3, b=4)' ).
%

category: 'Grail-Tests - Protocol'
method: PartialMethodDescriptorTestCase
testDocumentedAttributes

	| got |
	got := testModule @env1:attributes asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) asArray equals: #( 3 ).
	self assert: ((got at: 3) asArray collect: [:kv | kv asArray])
		equals: { #( 'b' 4 ) }.
%

category: 'Grail-Tests - Protocol'
method: PartialMethodDescriptorTestCase
testIsAbstractMethodAnswersFalseRatherThanRaising
	"abc reads __isabstractmethod__ with getattr on every class-body entry,
	so it has to answer rather than raise."

	self assert: testModule @env1:not_abstract_by_default asArray
		equals: #( false false ).
%

category: 'Grail-Tests - Protocol'
method: PartialMethodDescriptorTestCase
testSubclassable
	"A closure cannot be subclassed at all.  __get__ is exercised
	explicitly, the way CPython's own test does."

	| got |
	got := testModule @env1:subclassable asArray.
	self assert: (got at: 1) equals: true.
	self assert: (got at: 2) equals: true.
	self assert: (got at: 3) asArray equals: #( 2 1 ).
	self assert: (got at: 4) asArray first asArray equals: #( 'a' 2 1 ).
%
