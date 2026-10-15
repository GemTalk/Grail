Class {
	#name : 'ReservedNameLocalClassTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ReservedNameLocalClassTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
ReservedNameLocalClassTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
ReservedNameLocalClassTestCase >> setUp [
	probe := self ___loadProbe___: 'reserved_name_local_class'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testACapturedSelfIsStillTheReceiver [
	"THE REGRESSION GUARD.  ``self'' is reserved, but a captured ``self'' is the
	enclosing method's RECEIVER -- there is no ``_self'' temp to name.  Mangling
	it in the closure-cell store emitted an undeclared variable and cost the
	whole enclosing method; this is the shape that caught it
	(test_super's test_mixed_staticmethod_hierarchy)."

	self assert: (self at: 'captured_self_still_receiver') @env0:asString
		equals: 'host'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testAClassBodyReadsTheEnclosingTempNotACell [
	"The opposite answer to the method-body read above, for the same name in the
	same function.  A class-body attribute VALUE emits inline in the enclosing
	method, where the transport temp is reachable and no cell was ever stored --
	so standing the rename down here read the module instead and raised
	``module has no attribute 'msg'''."

	self assert: (self at: 'reserved_read_in_class_body') @env0:asString
		equals: 'body read'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testAFunctionLocalClassNamedSelfIsNotTheReceiver [
	"``self'' as a CLASS name.  The receiver parameter is deliberately spelled
	``inner'' in the fixture, so nothing here can pass by reading the receiver
	and calling it a hit."

	self assert: (self at: 'local_self') @env0:asString equals: 'quite self'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testAFunctionLocalClassNamedSuperCompilesAndIsCalled [
	"The headline case, and the one that failed to COMPILE.  A method of a
	sibling class reads the shadowing class through zero-arg ``super()'',
	which resolves it from the class's closure cell."

	self assert: (self at: 'local_super') @env0:asString equals: 'quite super'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testAReservedNameClassNestedInAClassBodyStillWorks [
	"A different emitter: a class nested in a class BODY declares its own block
	temp rather than borrowing the enclosing method's, and stores the class as
	an attribute of the outer one.  The temp and the attribute symbol are the
	two halves that must NOT be spelled the same way."

	self assert: (self at: 'reserved_nested_in_class_body') @env0:asString
		equals: 'nested super'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testAShadowingLocalSuperReceivesTheArgumentsTheSourceWrote [
	"Under the shadow ``super(1, 2)'' is an ordinary two-argument construction
	of an ordinary class -- NOT the builtin's (type, obj) form.  Confirms the
	local shadow reaches CallAst's 2-arg rewrite as well as the zero-arg one."

	self assert: (self at: 'local_super_instantiated') @env0:asString
		equals: '(1, 2)'.

]

{ #category : 'Grail-Tests' }
ReservedNameLocalClassTestCase >> testTheOtherReservedNamesAreCoveredToo [
	"``nil'', ``true'' and ``false'' are ordinary Python identifiers and reach
	the same three emitters.  One check rather than three: they differ only in
	spelling, and a fix that handled one would handle all of them or none."

	self assert: (self at: 'local_nil_true_false') @env0:asString equals: 'ntf'.

]
