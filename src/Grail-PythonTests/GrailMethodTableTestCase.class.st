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

{ #category : 'Grail-Weak-Tests-support' }
GrailMethodTableTestCase >> ownedBlock [
	"A function some class owns: a block of this installed method."

	^ [:a | a]

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableTestCase >> testAFunctionIsHeldAsItsMethodIs [
	"keepMethodOf: files functions as keys, so a function no class owns is held
	 as weakly as its method would be, and one a class owns as strongly."

	| table owned unowned |
	table := GrailMethodTable new.
	owned := self ownedBlock.
	unowned := '[:a | a]' evaluate.
	table at: owned put: 1.
	self assert: (self unownedHalfOf: table) isEmpty.
	table at: unowned put: 2.
	self assert: (self unownedHalfOf: table) size equals: 1.
	self assert: (table at: owned otherwise: nil) equals: 1.
	self assert: (table at: unowned otherwise: nil) equals: 2

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

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableTestCase >> testOnlyAFunctionNoClassOwnsIsAnchored [
	"A function exec() defined anchors its method, once however often it is
	 stamped; one a class owns needs no anchor and gets none."

	| temps saved owned unowned anchors |
	temps := SessionTemps current.
	saved := temps at: #GrailMethodAnchors ifAbsent: [nil].
	[
		temps removeKey: #GrailMethodAnchors ifAbsent: [nil].
		owned := self ownedBlock.
		GrailMethodTable keepMethodOf: owned.
		self deny: (temps includesKey: #GrailMethodAnchors).
		unowned := '[:a | a]' evaluate.
		GrailMethodTable keepMethodOf: unowned.
		GrailMethodTable keepMethodOf: unowned.
		anchors := temps at: #GrailMethodAnchors.
		self assert: (anchors at: unowned otherwise: nil) == unowned method.
		self assert: anchors size equals: 1
	] ensure: [
		temps removeKey: #GrailMethodAnchors ifAbsent: [nil].
		saved ifNotNil: [:v | temps at: #GrailMethodAnchors put: v]]

]

{ #category : 'Grail-Weak-Tests-support' }
GrailMethodTableTestCase >> unownedHalfOf: aTable [

	^ aTable instVarAt: (GrailMethodTable allInstVarNames indexOf: #unowned)

]
