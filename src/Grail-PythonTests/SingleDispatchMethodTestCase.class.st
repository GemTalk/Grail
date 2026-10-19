Class {
	#name : 'SingleDispatchMethodTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SingleDispatchMethodTestCase >> assertDispatches: aSelector [
	"The fixture's three-way probe: an int, a str, and a float with no
	registration of its own, which must fall through to the base method."

	self assert: (testModule @env1:perform: aSelector env: 1) asArray
		equals: #( 'int' 'str' 'base' ).

]

{ #category : 'Grail-Setup' }
SingleDispatchMethodTestCase >> setUp [
	"Reload tests/python/singledispatchmethod.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'singledispatchmethod' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/singledispatchmethod.py')
		name: 'singledispatchmethod'.

]

{ #category : 'Grail-Tests - Dispatch' }
SingleDispatchMethodTestCase >> testAnnotationRegistrationAtModuleScope [
	"``@t.register'' with the type taken from the first parameter's
	annotation.  The implementation reaches register() as an UnboundMethod, so
	this is also the test that that handle reports __annotations__."

	self assertDispatches: #module_scope_annotation.

]

{ #category : 'Grail-Tests - Protocol' }
SingleDispatchMethodTestCase >> testBoundReadRepr [
	"Reading it off an instance answers a BOUND wrapper, naming the method and
	the receiver.  The receiver's own repr is cut in the fixture, so this
	asserts the stable head."

	self assert: testModule @env1:bound_repr_head
		equals: '<bound single dispatch method ModuleScope.t>'.

]

{ #category : 'Grail-Tests - Protocol' }
SingleDispatchMethodTestCase >> testCallWithNoDispatchArgumentRaisesTypeError [
	"``A().t()'' -- the receiver does not count towards the one required
	positional argument, and CPython names the FUNCTION in the message."

	self assert: testModule @env1:arity_error asArray
		equals: #( 't requires at least 1 positional argument'
			't requires at least 1 positional argument' ).

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testClassMethodDispatchViaAnInstance [
	"``cls'' is supplied by the class-side handle either way, so the dispatch
	argument is the first one the caller passes."

	self assertDispatches: #classmethod_via_instance.

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testClassMethodDispatchViaTheClass [

	self assertDispatches: #classmethod_via_class.

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testClassMethodOnASlottedClass [
	"CPython's test_classmethod_slotted_class shape: the annotation form over
	a @classmethod, reached both ways, on a class with __slots__."

	self assert: testModule @env1:classmethod_annotation_on_slots asArray
		equals: #( 2 2 ).

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testClassSideDescriptorReprIsQualified [

	self assert: testModule @env1:classmethod_descriptor_repr
		equals: '<single dispatch method descriptor ClassScope.t>'.

]

{ #category : 'Grail-Tests - Protocol' }
SingleDispatchMethodTestCase >> testDescriptorReportsTheWrappedMethodName [

	self assert: testModule @env1:descriptor_name equals: 't'.

]

{ #category : 'Grail-Tests - Protocol' }
SingleDispatchMethodTestCase >> testDescriptorRepr [
	"The DESCRIPTOR, reached through __dict__."

	self assert: testModule @env1:descriptor_repr
		equals: '<single dispatch method descriptor ModuleScope.t>'.

]

{ #category : 'Grail-Tests - Repr' }
SingleDispatchMethodTestCase >> testDescriptorReprNamesTheWrappedCallable [
	"CPython names the wrapped callable by __qualname__, then __name__, then
	``?''.  The __name__ fallback has to go through the Python ATTRIBUTE
	PROTOCOL, not a message send: a send only finds a compiled method, which
	is what an ExecBlock has, so an ordinary def worked while every other
	callable fell through to ``?'' -- including the one the fallback exists
	for, an instance whose class assigns __name__ in its body.

	The @classmethod / @staticmethod cases come from singledispatchmethod's
	own __qualname__, which qualifies a class-side BoundMethod from the
	receiver it is bound to; reading the wrapped callable's __qualname__
	directly instead would answer the bare selector."

	self assert: testModule @env1:descriptor_reprs asArray equals: #(
		'<single dispatch method descriptor _ReprHost.func>'
		'<single dispatch method descriptor _ReprHost.cls_func>'
		'<single dispatch method descriptor _ReprHost.static_func>'
		'<single dispatch method descriptor NOQUALNAME>'
		'<single dispatch method descriptor ?>' ).

]

{ #category : 'Grail-Tests - Dispatch' }
SingleDispatchMethodTestCase >> testExplicitTypeRegistrationAtModuleScope [
	"``@t.register(int)'' on a class defined at module scope."

	self assertDispatches: #module_scope_explicit.

]

{ #category : 'Grail-Tests - Protocol' }
SingleDispatchMethodTestCase >> testReadsAreDistinctObjectsInFunctools [
	"Three access paths, three objects -- and the read is built fresh each
	time rather than cached, which is what lets the metadata snapshot it takes
	stay correct.  type(read).__module__ must be functools: a generic
	MethodBinding used to serve a bound plain method and reported builtins."

	self assert: testModule @env1:read_identities asArray equals: #(
		'read is descriptor: False'
		'read is cached: False'
		'functools' ).

]

{ #category : 'Grail-Tests - Dispatch' }
SingleDispatchMethodTestCase >> testRegistrationInsideAFunction [
	"Same class body, compiled inside a plain function."

	self assertDispatches: #in_function.

]

{ #category : 'Grail-Tests - Dispatch' }
SingleDispatchMethodTestCase >> testRegistrationInsideAMethod [
	"Same class body, compiled inside a method -- a third emission path, and
	the one CPython's own test suite uses (each test builds its class in the
	test method).  Resolving the sibling name only in the earlier two paths
	left this one dispatching to the base method with no error."

	self assertDispatches: #in_method.

]

{ #category : 'Grail-Tests - Underscore defs' }
SingleDispatchMethodTestCase >> testRepeatedUnderscoreDefsStayDistinct [
	"Two ``def _'' in one class body are two functions.  Collapsed to one
	name, the first was discarded and both captures answered ''second''."

	self assert: testModule @env1:two_underscore_defs_are_distinct asArray
		equals: #( 'first' 'second' ).

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testStaticMethodAnnotationRegistration [
	"``@t.register'' over a @staticmethod: the annotation lives on a
	class-side def, which the class's annotation table used to omit."

	self assertDispatches: #static_annotation_registration.

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testStaticMethodDispatchViaAnInstance [
	"Nothing is prepended for a staticmethod reached through an instance, so
	it sees exactly the arguments the class-side call does."

	self assertDispatches: #static_via_instance.

]

{ #category : 'Grail-Tests - Class-side methods' }
SingleDispatchMethodTestCase >> testStaticMethodDispatchViaTheClass [

	self assertDispatches: #static_via_class.

]

{ #category : 'Grail-Tests - Protocol' }
SingleDispatchMethodTestCase >> testUnboundReadRepr [
	"Reading the attribute off the class answers a DIFFERENT object from the
	descriptor -- CPython's unbound wrapper, whose repr drops ``descriptor''.
	Grail used to answer the descriptor itself for this read."

	self assert: testModule @env1:unbound_repr
		equals: '<single dispatch method ModuleScope.t>'.

]

{ #category : 'Grail-Tests - Underscore defs' }
SingleDispatchMethodTestCase >> testUnderscoreAssignmentRebindsTheName [
	"A plain ``_ = ...'' after a ``def _'' rebinds the name.  The def names
	are numbered, so the read has to follow the latest binding of either kind
	rather than staying pinned to the numbered def."

	self assert: testModule @env1:underscore_assignment_rebinds_the_name
		equals: 'assigned'.

]

{ #category : 'Grail-Tests - Underscore defs' }
SingleDispatchMethodTestCase >> testUnderscoreNameReadsTheLastBinding [
	"Making the definitions distinct must not change what the NAME means: a
	read of ``_'' is still the most recent binding, as in CPython."

	self assert: testModule @env1:underscore_name_reads_the_last_binding
		equals: 'second'.

]
