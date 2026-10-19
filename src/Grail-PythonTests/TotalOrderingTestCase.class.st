Class {
	#name : 'TotalOrderingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
TotalOrderingTestCase >> assertAllTrue: aCollection [
	"Every element of a Python list of bools is True."

	aCollection asArray doWithIndex: [:each :i |
		self assert: each == true
			description: 'element ' , i printString , ' is ' , each printString].

]

{ #category : 'Grail-Setup' }
TotalOrderingTestCase >> setUp [
	"Reload tests/python/total_ordering.py fresh each test."

	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'total_ordering' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/total_ordering.py')
		name: 'total_ordering'.

]

{ #category : 'Grail-Tests - Synthesis' }
TotalOrderingTestCase >> testAllSixOperatorsFromEveryRoot [
	"Whichever single ordering method the class defines, all six comparisons
	must answer -- that is the decorator's entire contract.  Ten assertions
	per root: the six operators plus the four negative cases that catch a
	derived operator computed with the wrong sign."

	| results |
	results := testModule @env1:all_roots.
	#( 'FromLt' 'FromLe' 'FromGt' 'FromGe' ) do: [:name |
		self assertAllTrue: (results @env1:__getitem__: name)].

]

{ #category : 'Grail-Tests - Class-attribute dunder' }
TotalOrderingTestCase >> testClassAttributeDunderAnswersAgainstAForeignOperand [
	"``a < 5'' -- a plain int carries no mirror operator, so reflection has
	nothing to reach and the forward class-attribute lookup is the only way
	to answer.  This used to raise TypeError."

	self assert: testModule @env1:attr_dunder_against_foreign equals: true.

]

{ #category : 'Grail-Tests - Class-attribute dunder' }
TotalOrderingTestCase >> testClassAttributeDunderAnswersBetweenTwoInstances [
	"``__lt__ = _less'' in the class body.  This direction worked before the
	forward probe existed, by reflecting onto the other operand -- keep it
	green so the new forward path cannot regress it."

	self assert: testModule @env1:attr_dunder_forward equals: true.

]

{ #category : 'Grail-Tests - Synthesis' }
TotalOrderingTestCase >> testDerivedOperatorBindsSelf [
	"A synthesised operator stands in for the plain function CPython puts in
	the class dict, so reading it through an INSTANCE has to bind self.  Left
	unbound, ``a.__le__(b)'' would run with b as the receiver and no operand."

	self assert: testModule @env1:derived_binds_self equals: true.

]

{ #category : 'Grail-Tests - Synthesis' }
TotalOrderingTestCase >> testDerivedOperatorIsNamedForTheOperatorItImplements [
	"CPython sets ``opfunc.__name__ = opname'' before installing it."

	self assert: testModule @env1:derived_name equals: '__ge__'.

]

{ #category : 'Grail-Tests - NotImplemented' }
TotalOrderingTestCase >> testDerivedOperatorPuntsWhenTheRootPunts [
	"``if op_result is NotImplemented: return op_result''.  Without it a root
	that punted on a foreign type would be read as falsy and the derived
	operator would answer a confident, wrong bool."

	self assertAllTrue: testModule @env1:notimplemented_propagates.

]

{ #category : 'Grail-Tests - Synthesis' }
TotalOrderingTestCase >> testExistingOperatorsAreNotOverwritten [
	"``class A(int)'' inherits all four ordering methods, so nothing is
	synthesised and int's own comparisons keep answering."

	self assertAllTrue: testModule @env1:no_overwrite.

]

{ #category : 'Grail-Tests - Total Ordering' }
TotalOrderingTestCase >> testMetaclassOrdering [
	"@total_ordering on a METACLASS, comparing two classes that name it.

	Python looks an operator up on the operand's TYPE, and for
	``class A(metaclass=M)'' that is M, so ``A < B'' runs M.__lt__(A, B).  Grail
	has no metaclass object -- builtins >> type: answers the single canonical
	``type'' for every class -- so it records the keyword and consults the record
	where the comparison would otherwise give up.

	Both directions matter: the forward one reaches M.__lt__, and the reverse
	goes through total_ordering's SYNTHESISED __gt__, whose root probe could not
	see a metaclass attribute for a class operand."

	self assert: testModule @env1:metaclass_ordering asArray
		equals: #( true false false true ).

]

{ #category : 'Grail-Tests - Synthesis' }
TotalOrderingTestCase >> testNoOrderingOperationIsAValueError [
	"CPython raises rather than silently decorating a class it cannot help:
	``must define at least one ordering operation: < > <= >=''."

	self assert: testModule @env1:no_operations_defined equals: 'ValueError'.

]

{ #category : 'Grail-Tests - NotImplemented' }
TotalOrderingTestCase >> testPuntedComparisonRaisesTypeError [
	"As an OPERATOR the punt has to surface as the catchable Python TypeError
	-- CPython bug 10042 is that this pair must not recurse instead."

	self assert: testModule @env1:type_error_when_not_implemented asArray
		equals: #( 'lt:TypeError' 'le:TypeError' 'gt:TypeError' 'ge:TypeError' ).

]
