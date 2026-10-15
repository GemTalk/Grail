Class {
	#name : 'MethodClassCellClosureTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'probe'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
MethodClassCellClosureTestCase >> ___loadProbe___: aName [
	| mods testModule |
	mods := importlib @env1:modules.
	mods removeKey: aName asSymbol ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/' , aName , '.py')
		name: aName.
	^ testModule @env1:___pyAttrLoad___: #'r'

]

{ #category : 'Grail-Private' }
MethodClassCellClosureTestCase >> at: aKey [
	^ probe @env1:__getitem__: aKey

]

{ #category : 'Grail-Setup' }
MethodClassCellClosureTestCase >> setUp [
	probe := self ___loadProbe___: 'method_class_cell_closure'.

]

{ #category : 'Grail-Tests - Metaclass' }
MethodClassCellClosureTestCase >> testACellIsInjectedOnlyWhenAMethodAsksForOne [
	"Both halves of CPython's rule, which test_super asserts as firmly as the
	other: a class whose methods never mention ``__class__'' gets NO
	__classcell__ in its namespace."

	self assert: (self at: 'no_ref_gets_no_classcell') equals: true.
	self assert: (self at: 'ref_gets_a_classcell') equals: true.

]

{ #category : 'Grail-Tests - Per method' }
MethodClassCellClosureTestCase >> testANestedFunctionsReadBelongsToTheEnclosingMethod [
	"``__class__'' read inside a def nested in a method: the closure belongs to
	the METHOD, since that is the object __closure__ is asked about.  The record
	is therefore made against the class-body-level def, not the innermost one."

	self assert: (self at: 'nested_read_gives_the_method_a_closure') equals: true.
	self assert: (self at: 'nested_cell_is_the_class') equals: true.

]

{ #category : 'Grail-Tests - Per method' }
MethodClassCellClosureTestCase >> testAnInheritedMethodReportsTheDefiningClassesCell [
	"``Sub.reads'' closes over BASE's cell: a method closes over the class whose
	body it appeared in, not the one it is reached through.  Same rule the
	metadata tables follow, and the reason the lookup walks the MRO to find the
	class that OWNS the record."

	self assert: (self at: 'inherited_cell_is_the_defining_class') equals: true.

]

{ #category : 'Grail-Tests - Per method' }
MethodClassCellClosureTestCase >> testAnOrdinaryClassGetsACellToo [
	"No metaclass anywhere in this half of the fixture.  The cell used to be
	created only at the namespace injection point, which an ordinary class
	never reaches -- so every check below this line failed against the first
	implementation while the metaclass ones above passed."

	self assert: (self at: 'reading_method_has_a_closure') equals: true.
	self assert: (self at: 'nested_read_still_resolves') equals: true.

]

{ #category : 'Grail-Tests - Per method' }
MethodClassCellClosureTestCase >> testASiblingMethodThatAsksForNothingHasNoClosure [
	"THE CHECK A CLASS-WIDE IMPLEMENTATION PASSES ONLY BY ACCIDENT.  Two
	methods of ONE class body: the one reading ``__class__'' has a closure, its
	sibling answers None.  classNeedsClassCell cannot tell them apart, which is
	why the per-method record exists."

	self assert: (self at: 'plain_method_closure_is_none') equals: true.
	self assert: (self at: 'reading_method_has_a_closure') equals: true.

]

{ #category : 'Grail-Tests - Per method' }
MethodClassCellClosureTestCase >> testStaticAndClassMethodsReportTheClosureToo [
	"Reached off the class, these are a BoundMethod in Grail rather than an
	UnboundMethod -- a different handle kind with its own attribute table.  The
	plain-method read answered while both of these still raised."

	self assert: (self at: 'staticmethod_has_the_closure') equals: true.
	self assert: (self at: 'classmethod_has_the_closure') equals: true.

]

{ #category : 'Grail-Tests - Metaclass' }
MethodClassCellClosureTestCase >> testTheCellDoesNotBecomeAClassAttribute [
	"``WithClassRef.__classcell__'' must raise.  The cell is kept on the class
	for __closure__ to find, so this is the check that the key it is kept under
	stays invisible to Python-level attribute access."

	self assert: (self at: 'classcell_is_not_an_attribute') @env0:asString
		equals: 'AttributeError'.

]

{ #category : 'Grail-Tests - Metaclass' }
MethodClassCellClosureTestCase >> testTheClosureHoldsTheVerySameCellTheMetaclassSaw [
	"Identity, not equality.  This is what makes the cell something that has to
	be KEPT on the class rather than built on demand when __closure__ is asked
	-- and it is the assertion test_super makes."

	self assert: (self at: 'closure_holds_the_very_same_cell') equals: true.
	self assert: (self at: 'closure_is_a_one_tuple') equals: true.
	self assert: (self at: 'classcell_is_filled_with_the_class') equals: true.

]

{ #category : 'Grail-Tests - Per method' }
MethodClassCellClosureTestCase >> testZeroArgSuperCountsAsReadingClass [
	"The other spelling of the same read.  In Grail it is a SEPARATE emit path
	-- it builds the Super proxy itself rather than going through
	printDefiningClassOn: -- so it has to make the same record, and did not
	until this change."

	self assert: (self at: 'zero_arg_super_closes_over_the_cell') equals: true.

]
