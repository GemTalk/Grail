Class {
	#name : 'MetaclassMroHookTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MetaclassMroHookTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
MetaclassMroHookTestCase >> reprAt: aKey [
	"The fixture's entries are nested Python lists; compare their repr so a
	failure prints both sides whole."

	^ (probe @env1:__getitem__: aKey) @env1:__repr__ @env0:asString

]

{ #category : 'Grail-Setup' }
MetaclassMroHookTestCase >> setUp [
	probe := self ___loadProbe___: 'metaclass_mro_hook'.

]

{ #category : 'Grail-Tests' }
MetaclassMroHookTestCase >> testAMetaclassThatDoesNotDefineMroIsUntouched [
	"THE GUARD, and the reason this change costs the corpus nothing.  ``mro''
	lives on Behavior in env 1, so an unguarded probe finds one for every
	metaclass alive; requiring the owner to sit strictly below type restricts it
	to an mro written in Python, which outside test_super is nothing at all.
	Same shape of trap as ___grailMetaclassConstructs___:, where an unguarded
	__new__ probe answered true universally."

	self assert: (self reprAt: 'a_metaclass_without_mro_is_untouched')
		equals: '[[''new''], True]'.

]

{ #category : 'Grail-Tests' }
MetaclassMroHookTestCase >> testEveryClassInTheChainGetsItsOwnCall [
	"Wired into class CREATION, not into one class statement.  A subclass of a
	class whose metaclass overrides mro() gets its own call with its own class,
	and its own linearization -- ``B'' first, not A's recorded answer.  That
	second half is what a chain-walking read of the recorded value would have
	got wrong, which is why the answer lives in an identity registry."

	self assert: (self reprAt: 'called_for_every_class_in_the_chain')
		equals: '[[''A'', ''B''], [''B'', ''A'']]'.

]

{ #category : 'Grail-Tests' }
MetaclassMroHookTestCase >> testTheHookCanReachAZeroParameterMethodAndReadDunderClass [
	"test_super's own shape.  mro() reaches a zero-parameter function through the
	class __dict__ and calls it with nothing -- which Python 3 allows and Grail
	refused until #519 -- and that function reads ``__class__'', which must
	ALREADY be the class under construction by the time the hook runs.  Three
	separate pieces meeting in one call."

	self assert: (self reprAt: 'zero_param_from_dict') equals: '[1, True]'.

]

{ #category : 'Grail-Tests' }
MetaclassMroHookTestCase >> testTheHookIsCalledDuringClassCreation [
	"The headline: Grail never called a metaclass's mro() at all.  The second
	half of the pair is the control -- a hook that ran but whose answer was
	dropped would still leave __mro__ starting with the class, so this test
	alone does not establish that the RETURN VALUE matters."

	self assert: (self reprAt: 'hook_is_called') equals: '[[''A''], True]'.

]

{ #category : 'Grail-Tests' }
MetaclassMroHookTestCase >> testTheReturnedLinearizationIsHonoured [
	"THE TEST THAT SAYS THE HOOK IS REAL.  mro() PRODUCES the linearization
	rather than observing it, so splicing a class into the answer is visible to
	__mro__, to mro(), and to issubclass.  An implementation that called the hook
	and discarded its result would pass every other test in this class and fail
	this one."

	self assert: (self reprAt: 'custom_mro_takes_effect')
		equals: '[True, [''A'', ''Extra''], True]'.

]
