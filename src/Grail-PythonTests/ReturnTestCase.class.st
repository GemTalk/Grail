Class {
	#name : 'ReturnTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
ReturnTestCase >> testReturnEarly [
	"Test early return skips remaining statements."

	self assert: (self eval: 'def f(x):
    if x > 0:
        return x
    return -x
f(5)') equals: 5.
	self assert: (self eval: 'def f(x):
    if x > 0:
        return x
    return -x
f(-3)') equals: 3.

]

{ #category : 'Grail-Tests' }
ReturnTestCase >> testReturnExpression [
	"Test return with a computed expression."

	self assert: (self eval: 'def add(a, b):
    return a + b
add(3, 4)') equals: 7.

]

{ #category : 'Grail-Tests' }
ReturnTestCase >> testReturnNone [
	"Test bare return returns None."

	self assert: (self eval: 'def f():
    return
f()') equals: None.

]

{ #category : 'Grail-Tests' }
ReturnTestCase >> testReturnValue [
	"Test return statement in a function."

	self assert: (self eval: 'def double(x):
    return x * 2
double(5)') equals: 10.

]

{ #category : 'Grail-Tests' }
ReturnTestCase >> testUnreachableCodeAfterReturn [
	"Statements after a top-level `return` are legal (dead) Python, but
	Smalltalk rejects statements after ^ inside a block -- codegen must
	drop the unreachable tail (test_fractions.Rat failed to COMPILE).
	Both flavors: dead return and dead assignment (the assignment also
	exercised the lastIsReturn fall-through suppression)."

	self assert: (self eval: 'def f():
    return 1
    return 2
f()') equals: 1.
	self assert: (self eval: 'def g():
    return 1
    x = 5
g()') equals: 1.
	self assert: (self eval: 'def m():
    return "m"
    y = 2
    return "n"
m()') equals: 'm'.
	"Reachable code after a CONDITIONAL return still runs."
	self assert: (self eval: 'def h(flag):
    if flag:
        return "early"
    return "late"
h(False)') equals: 'late'

]
