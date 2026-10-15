Class {
	#name : 'SuperValueAttributeTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperValueAttributeTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'RESULTS'

]

{ #category : 'Grail-Private' }
SuperValueAttributeTestCase >> resultAt: aKey [
	"The fixture stores true for a passing check, or a diagnostic STRING for
	one that raised -- so a failure prints what went wrong instead of just
	``expected true''."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
SuperValueAttributeTestCase >> setUp [
	probe := self ___loadProbe___: 'super_value_attribute'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testEveryAdvertisedValueAttributeIsCovered [
	"family/type/proto/timeout -- all four of the names socket.py reads this
	way, including the one whose value is None, since ``None'' and ``a proxy''
	are both non-numbers and a fix that answered nil would pass a laxer test."

	self assert: (self resultAt: 'value_attr_type') equals: 'True'.
	self assert: (self resultAt: 'value_attr_proto') equals: 'True'.
	self assert: (self resultAt: 'value_attr_timeout_is_none') equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testMethodThroughSuperStillAnswersSomethingCallable [
	"The narrow scope of the fix.  Only names in ___pythonValueAttrs___ are
	invoked on read; an ordinary method must still come back as a callable
	proxy and run when called."

	self assert: (self resultAt: 'method_via_super_is_still_callable')
		equals: 'True'.
	self assert: (self resultAt: 'ordinary_method_via_super_still_binds')
		equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testMethodThroughSuperStillReceivesItsArguments [
	"``super().settimeout(1.5)'' -- arity resolution through the proxy is
	unchanged.  Eagerly invoking on read would have called it with none."

	self assert: (self resultAt: 'method_via_super_takes_arguments')
		equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testPurePythonMethodChainingThroughSuperIsUnaffected [
	"The commonest use of super() in the corpus: a subclass method calling its
	parent's.  Nothing here involves value attributes, and it must stay exactly
	as it was."

	self assert: (self resultAt: 'pure_python_method_via_super') equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testPurePythonPropertyThroughSuperIsItsValue [
	"``super().x'' for a plain @property on the parent runs the parent's getter,
	as in CPython.  This was a documented limitation asserted the other way
	round (it answered a proxy), inverted when ssl.py's ``super().verify_flags''
	closed it."

	self assert: (self resultAt: 'pure_python_property_via_super_is_its_value')
		equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testTheValueIsAnIntNotMerelyNotAProxy [
	"Distinguishes ``the proxy is gone'' from ``the right value arrived''."

	self assert: (self resultAt: 'value_attr_is_an_int') equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testTheValueMatchesAnUnsubclassedInstance [
	"The super()-derived value equals what a plain, unsubclassed socket reports
	for the same attribute.  Compares against a real second object rather than
	a literal, so it would catch a fix that answered a plausible constant."

	self assert: (self resultAt: 'value_attr_agrees_with_a_plain_socket')
		equals: 'True'.

]

{ #category : 'Grail-Tests' }
SuperValueAttributeTestCase >> testValueAttributeThroughSuperAnswersItsValue [
	"THE BUG.  ``super().family'' answered a SuperBoundMethod instead of 2.
	Read through the object directly it was always 2, which is what made the
	divergence easy to miss."

	self assert: (self resultAt: 'value_attr_family') equals: 'True'.

]
