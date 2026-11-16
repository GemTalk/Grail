Class {
	#name : 'GrailMethodTableGcTestCase',
	#superclass : 'GrailMethodTableTestCase',
	#category : 'Grail-Weak-Tests'
}

{ #category : 'Grail-Testing' }
GrailMethodTableGcTestCase class >> isAbstract [
	"Keep these out of ``PythonTestCase suite'': each asserts that a collection
	reclaimed something, and a shard's session is no place to ask.  Near its
	temporary-memory cap the VM did not reclaim a method that had just died --
	measured, the shard these landed in ended at 92% of its cap, and two of
	them failed there and passed in a fresh gem.  So they run in a FRESH gem,
	from tests/scripts/run_exec_namespace_test.sh (runMethodTableGcTest.gs),
	which builds each case with ``GrailMethodTableGcTestCase selector: #...''."

	^ true

]

{ #category : 'Grail-Weak-Tests-support' }
GrailMethodTableGcTestCase >> collectGarbage [
	"What gc.collect() does: sweep, mourn what fired, run what was queued.
	 Twice, as support.gc_collect() does -- a mourned entry releases its
	 method, which the second sweep then reclaims."

	WeakReference @env1:_collect.
	WeakReference @env1:_collect

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableGcTestCase >> testABlockOfAnUnownedMethodIsNotKeptAlive [
	"A block's method answers its home method's class as its inClass, so the
	 functions an exec() defines -- blocks of the doit -- are held weakly
	 too."

	| table block ref |
	table := GrailMethodTable new.
	block := '[:a | a]' evaluate.
	self assert: block method inClass isNil.
	table at: block method put: block.
	self assert: (table at: block method otherwise: nil) == block.
	ref := WeakReference on: block method.
	block := nil.
	self collectGarbage.
	self assert: ref value isNil.
	self assert: table size equals: 0

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableGcTestCase >> testALiveFunctionKeepsItsEntriesAndItsDoits [
	"A function exec() defined, held only by itself, keeps its method's entry
	 and its doit's.  Under native code the VM does not trace a block's
	 reference to its method when it mourns ephemerons, so without
	 keepMethodOf: both were mourned while the function lived -- measured on
	 Linux x86_64; with native code off, as on macOS arm64, they never were.

	 Stamped the way a def is (staticSlotAt:attr:put:), so this covers the
	 def-time anchoring and not only keepMethodOf: itself."

	| table block temps saved |
	temps := SessionTemps current.
	saved := temps at: #GrailMethodAnchors ifAbsent: [nil].
	[
		table := GrailMethodTable new.
		block := '[:a | a + 1]' evaluate.
		block value: 1.
		ExecBlockAttrs staticSlotAt: block attr: '__name__' put: 'f'.
		table at: block method put: #function.
		table at: block method homeMethod put: #doit.
		self collectGarbage.
		self assert: (ExecBlockAttrs staticSlotAt: block attr: '__name__') equals: 'f'.
		self assert: (table at: block method otherwise: nil) equals: #function.
		self assert: (table at: block method homeMethod otherwise: nil) equals: #doit
	] ensure: [
		temps removeKey: #GrailMethodAnchors ifAbsent: [nil].
		saved ifNotNil: [:v | temps at: #GrailMethodAnchors put: v]]

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableGcTestCase >> testAnAnchorDoesNotKeepADeadFunctionAlive [
	"The anchor is keyed by the function, so a function that dies takes its
	 anchor with it, and its method goes."

	| block ref |
	block := '[:a | a + 2]' evaluate.
	GrailMethodTable keepMethodOf: block.
	ref := WeakReference on: block method.
	block := nil.
	self collectGarbage.
	self assert: ref value isNil description: 'the anchor kept a dead function''s method alive'

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableGcTestCase >> testAnUnownedMethodIsNotKeptAlive [
	"The point of the table: an entry does not keep its method alive, nor its
	 value -- even when the value leads back to the method, as a doit's scope
	 does through the functions the doit defined."

	| table method value methodRef valueRef |
	table := GrailMethodTable new.
	method := self newUnownedMethod.
	value := Array with: method.
	table at: method put: value.
	methodRef := WeakReference on: method.
	valueRef := WeakReference on: value.
	method := nil.
	value := nil.
	self collectGarbage.
	self assert: methodRef value isNil description: 'the method was kept alive'.
	self assert: valueRef value isNil description: 'the value was kept alive'.
	self assert: table size equals: 0

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableGcTestCase >> testDeadEntriesAreSweptOnceTheTableHasDoubled [
	"A mourned entry stays filed under its oop until the next sweep, which runs
	 when the weak half reaches its sweep size."

	| table unowned |
	table := GrailMethodTable new.
	1 to: GrailMethodTable initialSweepSize do: [:i |
		table at: self newUnownedMethod put: i].
	self collectGarbage.
	unowned := self unownedHalfOf: table.
	self assert: unowned size equals: GrailMethodTable initialSweepSize.
	self assert: table size equals: 0.
	table at: self newUnownedMethod put: 0.
	self assert: unowned size equals: 1

]

{ #category : 'Grail-Weak-Tests' }
GrailMethodTableGcTestCase >> testDoitRegistriesLetADeadDoitGo [
	"The doit scope and filename registries do not keep a doit alive.

	A doit reads and writes its globals through SymbolAssociations it holds as
	literals, so a registry that held the doit held every global its exec()
	bound, for the rest of the session -- a generator bound that way was never
	finalized (test_generators' test_generator_resurrect).  The registries used
	to be a FIFO capped at 256, whose order list held each doit as strongly.
	TracebackTestCase>>testDoitRegistriesAnswerForALiveDoit is the other half."

	| temps savedScopes savedFiles doit ref |
	temps := SessionTemps current.
	savedScopes := temps at: #GrailDoitScopes ifAbsent: [nil].
	savedFiles := temps at: #GrailDoitFiles ifAbsent: [nil].
	[
		temps removeKey: #GrailDoitScopes ifAbsent: [nil].
		temps removeKey: #GrailDoitFiles ifAbsent: [nil].
		doit := self newUnownedMethod.
		ModuleAst whileCompilingWithFilename: 'named.py' do: [
			ModuleAst ___rememberDoitScope: SymbolDictionary new for: doit].
		ref := WeakReference on: doit.
		doit := nil.
		self collectGarbage.
		self assert: ref value isNil description: 'the registries kept the doit alive'.
		self assert: (temps at: #GrailDoitScopes) size equals: 0.
		self assert: (temps at: #GrailDoitFiles) size equals: 0
	] ensure: [
		temps removeKey: #GrailDoitScopes ifAbsent: [nil].
		temps removeKey: #GrailDoitFiles ifAbsent: [nil].
		savedScopes ifNotNil: [:v | temps at: #GrailDoitScopes put: v].
		savedFiles ifNotNil: [:v | temps at: #GrailDoitFiles put: v]]

]
