Class {
	#name : 'GrailMethodTableTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-Weak-Tests'
}

{ #category : 'Grail-Weak-Tests-support' }
GrailMethodTableTestCase >> newUnownedMethod [
	"A method no class owns, as exec() compiles one: a doit, compiled and
	 never run."

	^ 'nil' _compileInContext: nil symbolList: GsSession currentSession symbolList

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableTestCase >> testAKeyThatIsNotAMethodIsHeldStrongly [

	| table key |
	table := GrailMethodTable new.
	key := Object new.
	table at: key put: 1.
	self assert: (table at: key otherwise: nil) equals: 1.
	self assert: (table includesKey: key).
	self assert: table size equals: 1.
	self assert: (table removeKey: key ifAbsent: [nil]) equals: 1.
	self deny: (table includesKey: key)

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableTestCase >> testAnEntryLeftUnderARecycledOopDoesNotAnswer [
	"The weak half is keyed by oop.  When a method dies its oop can be reused,
	 and the entry still filed under it -- mourned, or not yet swept -- must
	 not answer for the method that now has it.  Simulated by filing another
	 method's entry under this method's oop."

	| table method other |
	table := GrailMethodTable new.
	method := self newUnownedMethod.
	other := self newUnownedMethod.
	(self unownedHalfOf: table)
		at: method asOop
		put: (GrailMethodTableEntry key: other value: #stale).
	self assert: (table at: method otherwise: #none) equals: #none.
	self deny: (table includesKey: method).
	self assert: (table removeKey: method ifAbsent: [#absent]) equals: #absent.
	table at: method put: #fresh.
	self assert: (table at: method otherwise: #none) equals: #fresh

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableTestCase >> testAnInstalledMethodIsHeldAsBefore [
	"A method some class owns lives as long as its class, and goes in the
	 strong half: lookups for module and class code are what they were."

	| table method |
	table := GrailMethodTable new.
	method := Object compiledMethodAt: #printString.
	table at: method put: #x.
	self assert: (table at: method otherwise: nil) equals: #x.
	self assert: (table at: method ifAbsentPut: [#y]) equals: #x.
	self assert: (self unownedHalfOf: table) isEmpty.
	self assert: (table removeKey: method ifAbsent: [nil]) equals: #x.
	self deny: (table includesKey: method)

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableTestCase >> testAnUnownedMethodAnswersWhileItLives [

	| table method |
	table := GrailMethodTable new.
	method := self newUnownedMethod.
	self assert: (table at: method ifAbsentPut: [3]) equals: 3.
	self assert: (table at: method ifAbsentPut: [4]) equals: 3.
	table at: method put: 5.
	self assert: (table at: method otherwise: nil) equals: 5.
	self assert: (table includesKey: method).
	self assert: table size equals: 1.
	self assert: (self unownedHalfOf: table) size equals: 1.
	self assert: (table removeKey: method ifAbsent: [nil]) equals: 5.
	self assert: (table at: method otherwise: #gone) equals: #gone

]

{ #category : 'Grail-Weak-Tests-support' }
GrailMethodTableTestCase >> unownedHalfOf: aTable [

	^ aTable instVarAt: (GrailMethodTable allInstVarNames indexOf: #unowned)

]
