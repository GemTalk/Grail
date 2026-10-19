Class {
	#name : 'SuperForeignReceiverTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
SuperForeignReceiverTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
SuperForeignReceiverTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
SuperForeignReceiverTestCase >> setUp [
	probe := self ___loadProbe___: 'super_foreign_receiver'.

]

{ #category : 'Grail-Tests' }
SuperForeignReceiverTestCase >> testABareDunderClassReadStillAnswersTheClass [
	"THE HALF THAT MUST NOT RAISE.  ``__class__'' is closed over by the
	function, so a foreign receiver changes nothing -- CPython answers X.  Only
	``super()'' checks the object.  An implementation that turned the recovered
	class into an error would pass the test above and fail this one."

	self assert: (self at: 'dunder_class_with_foreign_receiver') equals: true.

]

{ #category : 'Grail-Tests' }
SuperForeignReceiverTestCase >> testACooperativeMixinChainStillWorks [
	"GUARD.  A mixin is reached through the C3 linearization, not as a Smalltalk
	superclass, so an MRO-only supercheck rejects it.  That is exactly what cost
	four Django failures and kept this check off the compiled path; it is why
	the check consults the MRO *and* the chain."

	self assert: (self at: 'cooperative_chain') @env0:asString
		equals: 'Derived+Mixin+Base'.

]

{ #category : 'Grail-Tests' }
SuperForeignReceiverTestCase >> testAForeignReceiverRaisesTheSuperCheckTypeError [
	"The headline case, with CPython's exact wording -- the message is the part
	that says WHICH reading failed, and Grail used to answer a NameError about
	an unbound free variable instead."

	self assert: (self at: 'cell_as_self') @env0:asString
		equals: 'TypeError: super(type, obj): obj (instance of cell) is not an '
			, 'instance or subtype of type (X).'.

]

{ #category : 'Grail-Tests' }
SuperForeignReceiverTestCase >> testZeroArgSuperInsideAMetaclassMethodIsAccepted [
	"GUARD, and the one the CPython corpus could not reach.  Grail RECORDS a
	class's metaclass rather than making the class an instance of it, so a
	metaclass method invoked with the using class as receiver has a receiver
	that is on neither the metaclass's MRO nor its chain -- while CPython's
	``isinstance(A, M)'' is plainly true.  This call exercises BOTH halves of the
	change at once -- the receiver cannot see M's cell, so the class comes off
	the stack, and the check then has to accept A against M.  Removing the
	metaclass disjunct fails four tests in this class, this one included."

	self assert: (self at: 'metaclass_super') @env0:asString equals: 'M:A'.

]
